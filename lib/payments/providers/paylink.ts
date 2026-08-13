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

export const paylinkProvider: PaymentProviderAdapter = {
  code: "PAYLINK",

  async createPayment(input: PaymentCreateInput): Promise<PaymentProviderResult> {
    const secret = getPaylinkSecret();
    if (!secret) throw new Error("PAYLINK_SECRET_KEY not configured");

    const amountSar = input.amountMinorUnits / 100;
    const body = {
      amount: amountSar,
      currency: input.currency,
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
      signal: AbortSignal.timeout(20_000),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Paylink create invoice failed: ${text}`);
    }

    const invoice = await res.json();
    const providerReference = String(invoice.transactionNo || invoice.id || "").trim();
    const redirectUrl = String(invoice.url || invoice.payment_url || "").trim();
    if (!providerReference || !redirectUrl) {
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

    const res = await fetch(`${getPaylinkBaseUrl()}/api/v1/invoice/${providerReference}`, {
      headers: { Authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      throw new Error(`Paylink verify failed: ${res.status}`);
    }

    const invoice = await res.json();
    const paid = invoice.orderStatus === "PAID" || invoice.status === "paid";
    return {
      paid,
      providerReference: invoice.transactionNo || invoice.id || providerReference,
      amountMinorUnits: Math.round(Number(invoice.amount || 0) * 100),
      currency: "SAR",
      providerStatus: invoice.orderStatus || invoice.status || "unknown",
      rawPayload: invoice,
    };
  },
};
