import "server-only";
import { lookup as dnsLookup } from "node:dns";
import { lookup } from "node:dns/promises";
import https from "node:https";
import { isIP } from "node:net";
import type {
  PaymentCreateInput,
  PaymentProviderAdapter,
  PaymentProviderResult,
  PaymentVerificationResult,
} from "../types";

type Credentials = Record<string, unknown>;

type CustomPaymentConfig = {
  baseUrl: string | null;
  credentials: Credentials;
};

type SafeJsonResponse = {
  ok: boolean;
  status: number;
  payload: any;
};

function value(credentials: Credentials, key: string): string {
  return String(credentials[key] ?? "").trim();
}

function isPrivateIpv4(address: string): boolean {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some(Number.isNaN)) return true;
  const [a, b] = parts;
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    a >= 224
  );
}

function isPrivateAddress(address: string): boolean {
  if (isIP(address) === 4) return isPrivateIpv4(address);
  const normalized = address.toLowerCase();
  return (
    normalized === "::1" ||
    normalized === "::" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    /^fe[89ab]/.test(normalized) ||
    normalized.startsWith("::ffff:127.") ||
    normalized.startsWith("::ffff:10.") ||
    normalized.startsWith("::ffff:192.168.")
  );
}

function assertPublicAddress(address: string): void {
  if (!isIP(address) || isPrivateAddress(address)) {
    throw new Error("CUSTOM_PAYMENT_PRIVATE_HOST_BLOCKED");
  }
}

async function requirePublicHttpsUrl(input: string): Promise<URL> {
  const url = new URL(input);
  if (url.protocol !== "https:" || url.username || url.password) {
    throw new Error("CUSTOM_PAYMENT_PUBLIC_HTTPS_URL_REQUIRED");
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local")
  ) {
    throw new Error("CUSTOM_PAYMENT_PRIVATE_HOST_BLOCKED");
  }

  if (isIP(hostname)) {
    assertPublicAddress(hostname);
  } else {
    const addresses = await lookup(hostname, {
      all: true,
      verbatim: true,
    });
    if (addresses.length === 0) {
      throw new Error("CUSTOM_PAYMENT_PRIVATE_HOST_BLOCKED");
    }
    for (const entry of addresses) {
      assertPublicAddress(entry.address);
    }
  }

  return url;
}

export async function requirePublicProviderUrl(
  input: string,
  allowedHosts?: readonly string[],
): Promise<URL> {
  let url: URL;
  try {
    url = await requirePublicHttpsUrl(input);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "CUSTOM_PAYMENT_PRIVATE_HOST_BLOCKED") {
      throw new Error("PROVIDER_PRIVATE_HOST_BLOCKED");
    }
    throw new Error("PROVIDER_PUBLIC_HTTPS_URL_REQUIRED");
  }

  if (allowedHosts?.length) {
    const hostname = url.hostname.toLowerCase();
    const allowed = new Set(allowedHosts.map((host) => host.toLowerCase()));
    if (!allowed.has(hostname)) {
      throw new Error("PROVIDER_HOST_NOT_ALLOWED");
    }
  }

  return url;
}

function safeSocketLookup(
  hostname: string,
  options: unknown,
  callback: (error: NodeJS.ErrnoException | null, address: string, family: number) => void,
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
          "CUSTOM_PAYMENT_PRIVATE_HOST_BLOCKED",
        ) as NodeJS.ErrnoException;
        blocked.code = "CUSTOM_PAYMENT_PRIVATE_HOST_BLOCKED";
        callback(blocked, "", 0);
      }
    },
  );
}

async function safeJsonRequest(input: {
  url: URL;
  method: "GET" | "POST";
  headers: Record<string, string>;
  body?: string;
  timeoutMs: number;
}): Promise<SafeJsonResponse> {
  return await new Promise<SafeJsonResponse>((resolve, reject) => {
    const request = https.request(
      input.url,
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
          if (size > 1_000_000) {
            request.destroy(new Error("CUSTOM_PAYMENT_RESPONSE_TOO_LARGE"));
            return;
          }
          chunks.push(buffer);
        });
        response.on("end", () => {
          const status = response.statusCode || 0;
          const text = Buffer.concat(chunks).toString("utf8");
          let payload: any;
          try {
            payload = JSON.parse(text);
          } catch {
            reject(
              new Error(
                `CUSTOM_PAYMENT_NON_JSON_RESPONSE:${status}:${text.slice(0, 300)}`,
              ),
            );
            return;
          }
          resolve({
            ok: status >= 200 && status < 300,
            status,
            payload,
          });
        });
      },
    );

    request.setTimeout(input.timeoutMs, () => {
      request.destroy(new Error("CUSTOM_PAYMENT_TIMEOUT"));
    });
    request.once("error", reject);
    if (input.body) request.write(input.body);
    request.end();
  });
}

function getPath(payload: unknown, path: string): unknown {
  return path
    .split(".")
    .filter(Boolean)
    .reduce<unknown>((current, key) => {
      if (
        current &&
        typeof current === "object" &&
        key in (current as Record<string, unknown>)
      ) {
        return (current as Record<string, unknown>)[key];
      }
      return undefined;
    }, payload);
}

function renderTemplateValue(
  input: unknown,
  variables: Record<string, unknown>,
): unknown {
  if (Array.isArray(input)) {
    return input.map((item) => renderTemplateValue(item, variables));
  }
  if (input && typeof input === "object") {
    return Object.fromEntries(
      Object.entries(input).map(([key, item]) => [
        key,
        renderTemplateValue(item, variables),
      ]),
    );
  }
  if (typeof input !== "string") return input;

  const exact = input.match(/^\{\{([A-Za-z0-9_]+)\}\}$/);
  if (exact) return variables[exact[1]] ?? "";

  return input.replace(
    /\{\{([A-Za-z0-9_]+)\}\}/g,
    (_, key: string) => String(variables[key] ?? ""),
  );
}

function authHeaders(credentials: Credentials): Record<string, string> {
  const headerName = value(credentials, "authHeaderName");
  const scheme = value(credentials, "authScheme").toUpperCase();
  const credential = value(credentials, "credential");

  if (!/^[A-Za-z0-9-]{1,64}$/.test(headerName)) {
    throw new Error("CUSTOM_PAYMENT_AUTH_HEADER_INVALID");
  }

  const authorization =
    scheme === "BEARER"
      ? `Bearer ${credential}`
      : scheme === "BASIC"
        ? `Basic ${credential}`
        : credential;

  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    [headerName]: authorization,
  };
}

export function createCustomPaymentProvider(
  config: CustomPaymentConfig,
): PaymentProviderAdapter {
  const credentials = config.credentials;
  const mode = value(credentials, "integrationMode").toUpperCase();

  return {
    code: "CUSTOM_PAYMENT",

    async createPayment(
      input: PaymentCreateInput,
    ): Promise<PaymentProviderResult> {
      if (mode === "PAYMENT_LINK") {
        const link = await requirePublicHttpsUrl(
          value(credentials, "paymentLinkUrl"),
        );
        const reference = String(
          input.metadata?.internalTransactionId || input.planCode,
        );

        return {
          providerReference: reference,
          redirectUrl: link.toString(),
          providerStatus: "LINK_READY",
          rawPayload: {
            mode: "PAYMENT_LINK",
            providerName: value(credentials, "providerName"),
          },
        };
      }

      if (mode !== "API") {
        throw new Error("CUSTOM_PAYMENT_INTEGRATION_MODE_INVALID");
      }

      const baseUrl = await requirePublicHttpsUrl(
        String(config.baseUrl || ""),
      );
      const createPath = value(credentials, "createPaymentPath");
      const endpoint = await requirePublicHttpsUrl(
        new URL(createPath, baseUrl).toString(),
      );

      const template = JSON.parse(
        value(credentials, "requestTemplate"),
      );
      const transactionId = String(
        input.metadata?.internalTransactionId || "",
      );
      const metadata = {
        tenantId: input.tenantId,
        planCode: input.planCode,
        ...(input.metadata || {}),
      };

      const body = renderTemplateValue(template, {
        amountMinor: input.amountMinorUnits,
        currency: (input.currency || "SAR").toUpperCase(),
        callbackUrl: input.callbackUrl,
        description: input.description || "",
        tenantId: input.tenantId,
        planCode: input.planCode,
        transactionId,
        metadata,
      });

      const response = await safeJsonRequest({
        url: endpoint,
        method: "POST",
        headers: {
          ...authHeaders(credentials),
          ...(transactionId
            ? { "Idempotency-Key": transactionId }
            : {}),
        },
        body: JSON.stringify(body),
        timeoutMs: 20_000,
      });

      const payload = response.payload;
      if (!response.ok) {
        throw new Error(
          `CUSTOM_PAYMENT_CREATE_FAILED:${response.status}:${JSON.stringify(payload).slice(0, 800)}`,
        );
      }

      const reference = String(
        getPath(
          payload,
          value(credentials, "responseReferencePath"),
        ) || "",
      );
      const redirectValue = String(
        getPath(payload, value(credentials, "responseRedirectUrlPath")) || "",
      );
      const status = String(
        getPath(payload, value(credentials, "responseStatusPath")) ||
          "CREATED",
      ).toUpperCase();

      if (!reference || !redirectValue) {
        throw new Error("CUSTOM_PAYMENT_RESPONSE_MAPPING_FAILED");
      }

      const redirectUrl = await requirePublicHttpsUrl(redirectValue);

      return {
        providerReference: reference,
        redirectUrl: redirectUrl.toString(),
        providerStatus: status,
        rawPayload: payload,
      };
    },

    async verifyPayment(
      providerReference: string,
    ): Promise<PaymentVerificationResult> {
      if (mode !== "API") {
        throw new Error("CUSTOM_PAYMENT_VERIFICATION_NOT_AVAILABLE");
      }

      const baseUrl = await requirePublicHttpsUrl(
        String(config.baseUrl || ""),
      );
      const verifyPath = value(
        credentials,
        "verifyPaymentPath",
      ).replace(
        "{reference}",
        encodeURIComponent(providerReference),
      );
      const endpoint = await requirePublicHttpsUrl(
        new URL(verifyPath, baseUrl).toString(),
      );

      const response = await safeJsonRequest({
        url: endpoint,
        method: "GET",
        headers: authHeaders(credentials),
        timeoutMs: 15_000,
      });

      const payload = response.payload;
      if (!response.ok) {
        throw new Error(
          `CUSTOM_PAYMENT_VERIFY_FAILED:${response.status}:${JSON.stringify(payload).slice(0, 800)}`,
        );
      }

      const status = String(
        getPath(payload, value(credentials, "responseStatusPath")) ||
          "UNKNOWN",
      ).toUpperCase();
      const paidStatuses = value(credentials, "paidStatuses")
        .split(",")
        .map((item) => item.trim().toUpperCase())
        .filter(Boolean);

      return {
        paid: paidStatuses.includes(status),
        providerReference:
          String(
            getPath(
              payload,
              value(credentials, "responseReferencePath"),
            ) || "",
          ) || providerReference,
        amountMinorUnits: Number(
          getPath(payload, value(credentials, "responseAmountPath")) || 0,
        ),
        currency: String(
          getPath(payload, value(credentials, "responseCurrencyPath")) || "SAR",
        ).toUpperCase(),
        providerStatus: status,
        rawPayload: payload,
      };
    },
  };
}
