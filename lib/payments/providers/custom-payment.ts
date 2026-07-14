import "server-only";
import { lookup } from "node:dns/promises";
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
    if (isPrivateAddress(hostname)) {
      throw new Error("CUSTOM_PAYMENT_PRIVATE_HOST_BLOCKED");
    }
  } else {
    const addresses = await lookup(hostname, {
      all: true,
      verbatim: true,
    });
    if (
      addresses.length === 0 ||
      addresses.some((entry) => isPrivateAddress(entry.address))
    ) {
      throw new Error("CUSTOM_PAYMENT_PRIVATE_HOST_BLOCKED");
    }
  }

  return url;
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

async function jsonResponse(response: Response): Promise<any> {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      `CUSTOM_PAYMENT_NON_JSON_RESPONSE:${response.status}:${text.slice(0, 300)}`,
    );
  }
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

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          ...authHeaders(credentials),
          ...(transactionId
            ? { "Idempotency-Key": transactionId }
            : {}),
        },
        body: JSON.stringify(body),
        redirect: "error",
        signal: AbortSignal.timeout(20_000),
      });

      const payload = await jsonResponse(response);
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
        getPath(
          payload,
          value(credentials, "responseRedirectUrlPath"),
        ) || "",
      );
      const status = String(
        getPath(payload, value(credentials, "responseStatusPath")) ||
          "CREATED",
      ).toUpperCase();

      if (!reference || !redirectValue) {
        throw new Error("CUSTOM_PAYMENT_RESPONSE_MAPPING_FAILED");
      }

      const redirectUrl =
        await requirePublicHttpsUrl(redirectValue);

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

      const response = await fetch(endpoint, {
        method: "GET",
        headers: authHeaders(credentials),
        redirect: "error",
        signal: AbortSignal.timeout(15_000),
      });

      const payload = await jsonResponse(response);
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
          getPath(
            payload,
            value(credentials, "responseAmountPath"),
          ) || 0,
        ),
        currency: String(
          getPath(
            payload,
            value(credentials, "responseCurrencyPath"),
          ) || "SAR",
        ).toUpperCase(),
        providerStatus: status,
        rawPayload: payload,
      };
    },
  };
}
