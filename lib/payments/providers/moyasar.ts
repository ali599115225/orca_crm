// lib/payments/providers/moyasar.ts — SERVER-ONLY
import "server-only";
import type { PaymentCreateInput, PaymentProviderAdapter, PaymentProviderResult, PaymentVerificationResult } from '../types';

const MOYASAR_API = 'https://api.moyasar.com/v1';

function getMoyasarSecret(): string {
  return process.env.MOYASAR_SECRET_KEY || '';
}

function authHeader(secret: string): Record<string, string> {
  return {
    Authorization: `Basic ${Buffer.from(secret + ':').toString('base64')}`,
    'Content-Type': 'application/json',
  };
}

export const moyasarProvider: PaymentProviderAdapter = {
  code: 'MOYASAR',

  async createPayment(input: PaymentCreateInput): Promise<PaymentProviderResult> {
    const secret = getMoyasarSecret();
    if (!secret) throw new Error('MOYASAR_SECRET_KEY not configured');

    const body = {
      amount: Math.round(input.amountMinorUnits / 100), // Moyasar uses SAR (not halalas)
      currency: input.currency,
      description: input.description,
      callback_url: input.callbackUrl,
      metadata: {
        planCode: input.planCode,
        tenantId: input.tenantId,
        ...input.metadata,
      },
    };

    const res = await fetch(`${MOYASAR_API}/invoices`, {
      method: 'POST',
      headers: authHeader(secret),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Moyasar create invoice failed: ${text}`);
    }

    const invoice = await res.json();
    return {
      providerReference: invoice.id,
      redirectUrl: invoice.url || `https://pay.moyasar.com/${invoice.id}`,
      providerStatus: invoice.status || 'initiated',
      rawPayload: invoice,
    };
  },

  async verifyPayment(providerReference: string): Promise<PaymentVerificationResult> {
    const secret = getMoyasarSecret();
    if (!secret) throw new Error('MOYASAR_SECRET_KEY not configured');

    const res = await fetch(`${MOYASAR_API}/invoices/${providerReference}`, {
      headers: authHeader(secret),
    });

    if (!res.ok) {
      throw new Error(`Moyasar verify failed: ${res.status}`);
    }

    const invoice = await res.json();
    return {
      paid: invoice.status === 'paid',
      providerReference: invoice.id,
      amountMinorUnits: (invoice.amount || 0) * 100,
      currency: (invoice.currency || 'SAR').toUpperCase(),
      providerStatus: invoice.status || 'unknown',
      rawPayload: invoice,
    };
  },
};
