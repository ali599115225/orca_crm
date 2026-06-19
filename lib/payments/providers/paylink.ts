// lib/payments/providers/paylink.ts — SERVER-ONLY
import "server-only";
import type { PaymentCreateInput, PaymentProviderAdapter, PaymentProviderResult, PaymentVerificationResult } from '../types';

function getPaylinkSecret(): string {
  return process.env.PAYLINK_SECRET_KEY || '';
}

function getPaylinkBaseUrl(): string {
  return process.env.PAYLINK_BASE_URL || 'https://restpilot.paylink.sa';
}

function generateIdempotencyKey(): string {
  return `orca-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

export const paylinkProvider: PaymentProviderAdapter = {
  code: 'PAYLINK',

  async createPayment(input: PaymentCreateInput): Promise<PaymentProviderResult> {
    const secret = getPaylinkSecret();
    if (!secret) throw new Error('PAYLINK_SECRET_KEY not configured');

    const body = {
      amount: input.amountMinorUnits, // Paylink uses halalas
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
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': generateIdempotencyKey(),
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Paylink create invoice failed: ${text}`);
    }

    const invoice = await res.json();
    return {
      providerReference: invoice.transactionNo || invoice.id || '',
      redirectUrl: invoice.url || invoice.payment_url || '',
      providerStatus: 'initiated',
      rawPayload: invoice,
    };
  },

  async verifyPayment(providerReference: string): Promise<PaymentVerificationResult> {
    const secret = getPaylinkSecret();
    if (!secret) throw new Error('PAYLINK_SECRET_KEY not configured');

    const res = await fetch(`${getPaylinkBaseUrl()}/api/v1/invoice/${providerReference}`, {
      headers: { Authorization: `Bearer ${secret}` },
    });

    if (!res.ok) {
      throw new Error(`Paylink verify failed: ${res.status}`);
    }

    const invoice = await res.json();
    const paid = invoice.orderStatus === 'PAID' || invoice.status === 'paid';
    return {
      paid,
      providerReference: invoice.transactionNo || invoice.id || '',
      amountMinorUnits: invoice.amount || 0,
      currency: 'SAR',
      providerStatus: invoice.orderStatus || invoice.status || 'unknown',
      rawPayload: invoice,
    };
  },
};
