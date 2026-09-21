import "server-only";
import {
  publicHttpsJsonRequest,
  requirePublicProviderUrl as requireSharedPublicProviderUrl,
} from "@/lib/net/public-https";
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

async function requirePublicHttpsUrl(input: string): Promise<URL> {
  try {
    return await requireSharedPublicProviderUrl(input);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "PROVIDER_PRIVATE_HOST_BLOCKED") {
      throw new Error("CUSTOM_PAYMENT_PRIVATE_HOST_BLOCKED");
    }
    throw new Error("CUSTOM_PAYMENT_PUBLIC_HTTPS_URL_REQUIRED");
  }
}

export async function requirePublicProviderUrl(
  input: string,
  allowedHosts?: readonly string[],
): Promise<URL> {
  return requireSharedPublicProviderUrl(input, allowedHosts);
}

async function safeJsonRequest(input: {
  url: URL;
  method: "GET" | "POST";
  headers: Record<string, string>;
  body?: string;
  timeoutMs: number;
}): Promise<SafeJsonResponse> {
  try {
    const response = await publicHttpsJsonRequest({
      url: input.url,
      method: input.method,
      headers: input.headers,
      body: input.body,
      timeoutMs: input.timeoutMs,
      maxResponseBytes: 1_000_000,
    });
    return {
      ok: response.ok,
      status: response.status,
      payload: response.payload,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "PROVIDER_REQUEST_TIMEOUT") {
      throw new Error("CUSTOM_PAYMENT_TIMEOUT");
    }
    if (message === "PROVIDER_RESPONSE_TOO_LARGE") {
      throw new Error("CUSTOM_PAYMENT_RESPONSE_TOO_LARGE");
    }
    if (message === "PROVIDER_RESPONSE_ABORTED") {
      throw new Error("CUSTOM_PAYMENT_RESPONSE_ABORTED");
    }
    if (message.startsWith("PROVIDER_NON_JSON_RESPONSE:")) {
      throw new Error(
        message.replace(
          "PROVIDER_NON_JSON_RESPONSE:",
          "CUSTOM_PAYMENT_NON_JSON_RESPONSE:",
        ),
      );
    }
    if (message === "PROVIDER_PRIVATE_HOST_BLOCKED") {
      throw new Error("CUSTOM_PAYMENT_PRIVATE_HOST_BLOCKED");
    }
    if (message === "PROVIDER_PUBLIC_HTTPS_URL_REQUIRED") {
      throw new Error("CUSTOM_PAYMENT_PUBLIC_HTTPS_URL_REQUIRED");
    }
    throw error;
  }
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
