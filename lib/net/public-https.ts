import { lookup as dnsLookup } from "node:dns";
import { lookup } from "node:dns/promises";
import https from "node:https";
import { isIP } from "node:net";

type PublicHttpsJsonResponse = {
  ok: boolean;
  status: number;
  payload: unknown;
};

function isPrivateIpv4(address: string): boolean {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some(Number.isNaN)) return true;
  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    a >= 224
  );
}

function normalizeMappedAddress(address: string): string {
  const normalized = address.toLowerCase();
  const dotted = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (dotted?.[1]) return dotted[1];

  const hex = normalized.match(
    /^(?:::ffff:|0:0:0:0:0:ffff:)([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i,
  );
  if (!hex) return address;

  const high = Number.parseInt(hex[1], 16);
  const low = Number.parseInt(hex[2], 16);
  return [high >> 8, high & 0xff, low >> 8, low & 0xff].join(".");
}

function isPrivateAddress(address: string): boolean {
  const candidate = normalizeMappedAddress(address);
  if (isIP(candidate) === 4) return isPrivateIpv4(candidate);
  const normalized = candidate.toLowerCase();
  return (
    normalized === "::1" ||
    normalized === "::" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    /^fe[89ab]/.test(normalized)
  );
}

function assertPublicAddress(address: string): void {
  const candidate = normalizeMappedAddress(address);
  if (!isIP(candidate) || isPrivateAddress(candidate)) {
    throw new Error("PROVIDER_PRIVATE_HOST_BLOCKED");
  }
}

export async function requirePublicProviderUrl(
  input: string,
  allowedHosts?: readonly string[],
): Promise<URL> {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error("PROVIDER_PUBLIC_HTTPS_URL_REQUIRED");
  }

  if (url.protocol !== "https:" || url.username || url.password) {
    throw new Error("PROVIDER_PUBLIC_HTTPS_URL_REQUIRED");
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local")
  ) {
    throw new Error("PROVIDER_PRIVATE_HOST_BLOCKED");
  }

  if (allowedHosts?.length) {
    const allowed = new Set(allowedHosts.map((host) => host.toLowerCase()));
    if (!allowed.has(hostname)) {
      throw new Error("PROVIDER_HOST_NOT_ALLOWED");
    }
  }

  if (isIP(hostname)) {
    assertPublicAddress(hostname);
  } else {
    const addresses = await lookup(hostname, { all: true, verbatim: true });
    if (addresses.length === 0) {
      throw new Error("PROVIDER_PRIVATE_HOST_BLOCKED");
    }
    for (const entry of addresses) assertPublicAddress(entry.address);
  }

  return url;
}

function safeSocketLookup(
  hostname: string,
  options: unknown,
  callback: (
    error: NodeJS.ErrnoException | null,
    address: string,
    family: number,
  ) => void,
) {
  const requested = (options || {}) as { family?: number; hints?: number };
  dnsLookup(
    hostname,
    {
      family: requested.family,
      hints: requested.hints,
      all: false,
      verbatim: true,
    },
    (error, address, family) => {
      if (error) {
        callback(error, "", 0);
        return;
      }
      try {
        assertPublicAddress(address);
        callback(null, address, family);
      } catch {
        const blocked = new Error(
          "PROVIDER_PRIVATE_HOST_BLOCKED",
        ) as NodeJS.ErrnoException;
        blocked.code = "PROVIDER_PRIVATE_HOST_BLOCKED";
        callback(blocked, "", 0);
      }
    },
  );
}

export async function publicHttpsJsonRequest(input: {
  url: string | URL;
  method: "GET" | "POST";
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
  maxResponseBytes?: number;
}): Promise<PublicHttpsJsonResponse> {
  const timeoutMs = input.timeoutMs ?? 15_000;
  const maxResponseBytes = input.maxResponseBytes ?? 1_000_000;
  const url = await requirePublicProviderUrl(String(input.url));

  return await new Promise<PublicHttpsJsonResponse>((resolve, reject) => {
    let settled = false;
    const settle = <T>(fn: (value: T) => void, value: T) => {
      if (settled) return;
      settled = true;
      clearTimeout(deadline);
      fn(value);
    };
    const deadline = setTimeout(() => {
      request.destroy(new Error("PROVIDER_REQUEST_TIMEOUT"));
    }, timeoutMs);

    const request = https.request(
      url,
      {
        method: input.method,
        headers: input.headers,
        lookup: safeSocketLookup,
        rejectUnauthorized: true,
      },
      (response) => {
        const chunks: Buffer[] = [];
        let size = 0;
        response.on("data", (chunk: Buffer | string) => {
          const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          size += buffer.length;
          if (size > maxResponseBytes) {
            request.destroy(new Error("PROVIDER_RESPONSE_TOO_LARGE"));
            return;
          }
          chunks.push(buffer);
        });
        response.once("error", (error) => settle(reject, error));
        response.once("close", () => {
          if (!response.readableEnded) {
            settle(reject, new Error("PROVIDER_RESPONSE_ABORTED"));
          }
        });
        response.on("end", () => {
          const status = response.statusCode || 0;
          const text = Buffer.concat(chunks).toString("utf8");
          let payload: unknown = {};
          if (text) {
            try {
              payload = JSON.parse(text);
            } catch {
              settle(
                reject,
                new Error(`PROVIDER_NON_JSON_RESPONSE:${status}`),
              );
              return;
            }
          }
          settle(resolve, {
            ok: status >= 200 && status < 300,
            status,
            payload,
          });
        });
      },
    );

    request.setTimeout(timeoutMs, () => {
      request.destroy(new Error("PROVIDER_REQUEST_TIMEOUT"));
    });
    request.once("error", (error) => settle(reject, error));
    request.once("close", () => clearTimeout(deadline));
    if (input.body) request.write(input.body);
    request.end();
  });
}
