// lib/payments/types.ts — SERVER-ONLY
import "server-only";

export type PaymentProviderCode = 'MOYASAR' | 'PAYLINK';

export type PaymentStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface PaymentCreateInput {
  tenantId: string;
  planCode: string;
  amountMinorUnits: number;
  currency: string;
  description: string;
  callbackUrl: string;
  metadata?: Record<string, string>;
}

export interface PaymentProviderResult {
  providerReference: string;
  redirectUrl: string;
  providerStatus: string;
  rawPayload?: unknown;
}

export interface PaymentVerificationResult {
  paid: boolean;
  providerReference: string;
  amountMinorUnits: number;
  currency: string;
  providerStatus: string;
  rawPayload?: unknown;
}

export interface PaymentProviderAdapter {
  readonly code: PaymentProviderCode;
  createPayment(input: PaymentCreateInput): Promise<PaymentProviderResult>;
  verifyPayment(providerReference: string): Promise<PaymentVerificationResult>;
}
