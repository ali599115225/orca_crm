// lib/payments/providers/paylink.ts — SERVER-ONLY
import "server-only";
import { randomUUID } from "node:crypto";
import type {
  PaymentCreateInput,
  PaymentProviderAdapter,
  PaymentProviderResult,
  PaymentVerificationResult,
} from "../types";

function getPaylinkSecret(): string {
  return process.env.PAYLINK_SECRET_KEY || "";
}

export const PAYLINK_ALLOWED_HOSTS = new Set(["restpilot.paylink.sa", "restapi.paylink.sa"]);
export function safePaylinkBaseUrl(value: string): string {
  const url = new URL(value);
  if (url.protocol !== "https:" || !PAYLINK_ALLOWED_HOSTS.has(url.hostname.toLowerCase()) || url.username || url.password || url.port || (url.pathname && url.pathname !== "/") || url.search || url.hash) throw new Error("PAYLINK_BASE_URL_NOT_ALLOWED");
  return url.origin;
}

function getPaylinkBaseUrl(): string {
  return safePaylinkBaseUrl(process.env.PAYLINK_BASE_URL || "https://restpilot.paylink.sa");
}

function generateIdempotencyKey(): string {
  return `orca-${randomUUID()}`;
}

function responseObject(value: unknown, errorCode: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(errorCode);
  }
  return value as Record<string, unknown>;
}

function requireHttpsRedirect(value: unknown): string {
  const redirectUrl = String(value || "").trim();
  if (!redirectUrl) throw new Error("PAYLINK_CREATE_RESPONSE_INVALID");
  try {
    const parsed = new URL(redirectUrl);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password) {
      throw new Error("PAYLINK_CREATE_RESPONSE_INVALID");
    }
  } catch {
    throw new Error("PAYLINK_CREATE_RESPONSE_INVALID");
  }
  return redirectUrl;
}

export function mapPaylinkVerification(
  value: unknown,
  fallbackProviderReference: string,
): PaymentVerificationResult {
  const invoice = responseObject(value, "PAYLINK_VERIFY_RESPONSE_INVALID");
  const status = String(invoice.orderStatus || invoice.status || "");
  const paid = status.toUpperCase() === "PAID";
  const rawAmount = invoice.amount;
  const amountSar = Number(rawAmount);

  if (
    rawAmount == null ||
    rawAmount === "" ||
    !Number.isFinite(amountSar) ||
    amountSar < 0 ||
    (paid && amountSar <= 0)
  ) {
    throw new Error("PAYLINK_VERIFY_RESPONSE_INVALID");
  }

  return {
    paid,
    providerReference: String(
      invoice.transactionNo || invoice.id || fallbackProviderReference,
    ),
    amountMinorUnits: Math.round(amountSar * 100),
    currency: "SAR",
    providerStatus: status || "unknown",
    rawPayload: invoice,
  };
}

export const paylinkProvider: PaymentProviderAdapter = {
  code: "PAYLINK",

  async createPayment(input: PaymentCreateInput): Promise<PaymentProviderResult> {
    const secret = getPaylinkSecret();
    if (!secret) throw new Error("PAYLINK_SECRET_KEY not configured");
    if (input.currency.toUpperCase() !== "SAR") {
      throw new Error("PAYLINK_CURRENCY_NOT_SUPPORTED");
    }

    const amountSar = input.amountMinorUnits / 100;
    const body = {
      amount: amountSar,
      currency: "SAR",
      description: input.description,
      callback_url: input.callbackUrl,
      metadata: {
        planCode: input.planCode,
        tenantId: input.tenantId,
        ...input.metadata,
      },
    };

    const res = await fetch(`${getPaylinkBaseUrl()}/api/v1/invoice`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
        "Idempotency-Key": generateIdempotencyKey(),
      },
      body: JSON.stringify(body),
      redirect: "error",
      signal: AbortSignal.timeout(20_000),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Paylink create invoice failed: ${text}`);
    }

    const invoice = responseObject(await res.json(), "PAYLINK_CREATE_RESPONSE_INVALID");
    const providerReference = String(invoice.transactionNo || invoice.id || "").trim();
    const redirectUrl = requireHttpsRedirect(invoice.url || invoice.payment_url);
    if (!providerReference) {
      throw new Error("PAYLINK_CREATE_RESPONSE_INVALID");
    }

    return {
      providerReference,
      redirectUrl,
      providerStatus: "initiated",
      rawPayload: invoice,
    };
  },

  async verifyPayment(providerReference: string): Promise<PaymentVerificationResult> {
    const secret = getPaylinkSecret();
    if (!secret) throw new Error("PAYLINK_SECRET_KEY not configured");

    const res = await fetch(`${getPaylinkBaseUrl()}/api/v1/invoice/${encodeURIComponent(providerReference)}`, {
      headers: { Authorization: `Bearer ${secret}` },
      redirect: "error",
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      throw new Error(`Paylink verify failed: ${res.status}`);
    }

    return mapPaylinkVerification(await res.json(), providerReference);
  },
};
