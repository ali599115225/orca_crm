// lib/payments/service.ts — SERVER-ONLY
import "server-only";
import { prisma } from "@/lib/prisma";
import type { PaymentProviderAdapter, PaymentVerificationResult } from './types';
import { getPaymentProvider, isProviderEnabled } from './registry';
import { handleSuccessfulPaymentInternal } from "@/lib/server/internal";
import { isDedicatedCopyDeployment } from "@/lib/deployment-license";
import {
  LEGACY_SAAS_OUT_OF_SCOPE,
  isLegacySaasEnabled,
} from "@/lib/platform-operating-model";

function providerSearchCondition(providerCode: string) {
  const upper = providerCode.toUpperCase();
  if (upper === 'PAYLINK') {
    return { in: ['PAYLINK', 'paylink'] };
  }
  return upper;
}

const PLAN_PRICE_MINOR: Record<string, number> = {
  basic: 99_00,
  silver: 199_00,
  pro: 299_00,
  professional: 299_00,
  gold: 499_00,
  diamond: 999_00,
};

export function getPlanPriceMinor(plan: string): number {
  return PLAN_PRICE_MINOR[plan] || 99_00;
}

export function getPlanPriceHalalas(plan: string): number {
  // Paylink uses halalas (= minor units * 100)
  return getPlanPriceMinor(plan) * 100;
}

export async function createPaymentTransaction(input: {
  tenantId: string;
  provider: string;
  providerReference?: string;
  planCode: string;
  amountMinor: number;
  currency?: string;
  metadata?: Record<string, string>;
  paymentUrl?: string;
}): Promise<string> {
  const tx = await prisma.paymentTransaction.create({
    data: {
      tenantId: input.tenantId,
      amount: input.amountMinor / 100, // Decimal(12,2) = SAR amount
      currency: input.currency || 'SAR',
      netAmount: input.amountMinor / 100,
      method: input.provider.toLowerCase(),
      provider: input.provider.toUpperCase(),
      providerReference: input.providerReference || null,
      planCode: input.planCode,
      expectedAmountMinor: input.amountMinor,
      expectedCurrency: (input.currency || 'SAR').toUpperCase(),
      status: 'PENDING',
      paymentUrl: input.paymentUrl || null,
      rawPayload: input.metadata ? input.metadata as any : null,
    },
  });
  return tx.id;
}

export async function claimPaymentTransaction(
  provider: string,
  providerReference: string,
): Promise<{ transaction: any; claimed: boolean; alreadyCompleted: boolean } | null> {
  const tx = await prisma.paymentTransaction.findFirst({
    where: { provider: providerSearchCondition(provider), providerReference },
  });
  if (!tx) return null;

  if (tx.status === 'COMPLETED') {
    return { transaction: tx, claimed: false, alreadyCompleted: true };
  }

  // Atomic claim — only update if still PENDING or FAILED
  const updated = await prisma.paymentTransaction.updateMany({
    where: {
      id: tx.id,
      status: { in: ['PENDING', 'FAILED'] },
    },
    data: { status: 'PROCESSING', webhookReceivedAt: new Date() },
  });

  if (updated.count === 0) {
    const current = await prisma.paymentTransaction.findUnique({ where: { id: tx.id } });
    return current ? { transaction: current, claimed: false, alreadyCompleted: current.status === 'COMPLETED' } : null;
  }

  const claimed = await prisma.paymentTransaction.findUnique({ where: { id: tx.id } });
  return claimed ? { transaction: claimed, claimed: true, alreadyCompleted: false } : null;
}

export async function markPaymentCompleted(txId: string): Promise<void> {
  await prisma.paymentTransaction.update({
    where: { id: txId },
    data: { status: 'COMPLETED', processedAt: new Date(), lastError: null, failureReason: null },
  });
}

export async function markPaymentFailed(txId: string, reason: string): Promise<void> {
  await prisma.paymentTransaction.update({
    where: { id: txId },
    data: { status: 'FAILED', lastError: reason.slice(0, 2000), failureReason: reason.slice(0, 2000) },
  });
}

function callbackUrlWithProvider(callbackUrl: string, providerCode: string): string {
  const url = new URL(callbackUrl);
  url.searchParams.set('provider', providerCode.toUpperCase());
  return url.toString();
}

export async function initiatePayment(input: {
  tenantId: string;
  planCode: string;
  providerCode?: string;
  adapter?: PaymentProviderAdapter;
  metadata?: Record<string, string>;
  description?: string;
  callbackUrl?: string;
}): Promise<{
  success: boolean;
  paymentUrl?: string;
  internalTxId?: string;
  error?: string;
  code?: typeof LEGACY_SAAS_OUT_OF_SCOPE;
}> {
  if (!isLegacySaasEnabled()) {
    return {
      success: false,
      code: LEGACY_SAAS_OUT_OF_SCOPE,
      error: "SaaS platform payments are outside the single-company model.",
    };
  }

  try {
    const providerCode = (input.providerCode || 'MOYASAR').toUpperCase();

    if (!isProviderEnabled(providerCode)) {
      return { success: false, error: `Payment provider ${providerCode} is not enabled` };
    }

    const provider = input.adapter || getPaymentProvider(providerCode);
    if (!provider) {
      return { success: false, error: `Payment provider ${providerCode} not found` };
    }
    if (provider.code !== providerCode) {
      return { success: false, error: `Payment provider ${providerCode} adapter mismatch` };
    }

    const amountMinor = getPlanPriceMinor(input.planCode);
    const currency = 'SAR';
    const description = input.description || `Subscription — ${input.planCode}`;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://orca.az-ez.pro';

    // 1. Create internal payment transaction FIRST
    const internalTxId = await createPaymentTransaction({
      tenantId: input.tenantId,
      provider: providerCode,
      planCode: input.planCode,
      amountMinor,
      currency,
      metadata: input.metadata,
    });

    // 2. Call provider to create payment
    const result = await provider.createPayment({
      tenantId: input.tenantId,
      planCode: input.planCode,
      amountMinorUnits: amountMinor,
      currency,
      description,
      callbackUrl: callbackUrlWithProvider(input.callbackUrl || `${appUrl}/api/payment/callback`, providerCode),
      metadata: input.metadata,
    });

    // 3. Update with provider reference
    await prisma.paymentTransaction.update({
      where: { id: internalTxId },
      data: {
        providerReference: result.providerReference,
        paymentUrl: result.redirectUrl,
        providerTransactionId: result.providerReference,
        gatewayStatus: result.providerStatus,
        rawPayload: result.rawPayload ? result.rawPayload as any : undefined,
      },
    });

    return { success: true, paymentUrl: result.redirectUrl, internalTxId };
  } catch (error: any) {
    console.error('[PaymentService] initiatePayment error:', error.message);
    return { success: false, error: error.message };
  }
}

export type PaymentCallbackResult =
  | { ok: true; status: 'COMPLETED' | 'ALREADY_COMPLETED' | 'BUSINESS_PAYMENT_PENDING' }
  | { ok: false; status: 'REJECTED' | 'PROCESSING' | 'FAILED' | 'DEDICATED_BLOCKED'; error: string };

export async function processPaymentCallback(input: {
  provider: string;
  providerReference: string;
  adapter?: PaymentProviderAdapter;
  handleSuccessfulPayment?: typeof handleSuccessfulPaymentInternal;
}): Promise<PaymentCallbackResult> {
  const providerCode = input.provider.toUpperCase();
  const providerReference = input.providerReference;

  if (!providerReference) {
    return { ok: false, status: 'REJECTED', error: 'Missing provider reference' };
  }

  if (!isProviderEnabled(providerCode)) {
    return { ok: false, status: 'REJECTED', error: 'Payment provider is disabled' };
  }

  const adapter = input.adapter || getPaymentProvider(providerCode);
  if (!adapter || adapter.code !== providerCode) {
    return { ok: false, status: 'REJECTED', error: 'Payment provider is unsupported' };
  }

  const tx = await prisma.paymentTransaction.findFirst({
    where: { provider: providerSearchCondition(providerCode), providerReference },
  });

  if (!tx) {
    return { ok: false, status: 'REJECTED', error: 'Payment transaction not found' };
  }

  const isBusinessPayment =
    Boolean(tx.invoiceId) || Boolean(tx.installmentId);

  if (isBusinessPayment) {
    return { ok: true, status: 'BUSINESS_PAYMENT_PENDING' };
  }

  if (!isLegacySaasEnabled() || isDedicatedCopyDeployment()) {
    return {
      ok: false,
      status: 'DEDICATED_BLOCKED',
      error: 'اشتراكات أوركا غير متاحة في النسخة المستقلة.',
    };
  }

  let verification: PaymentVerificationResult;
  try {
    verification = await adapter.verifyPayment(providerReference);
  } catch (error: any) {
    return { ok: false, status: 'REJECTED', error: error.message || 'Payment verification failed' };
  }

  if (verification.providerReference && verification.providerReference !== providerReference) {
    return { ok: false, status: 'REJECTED', error: 'Provider reference mismatch' };
  }

  if (!verification.paid) {
    return { ok: false, status: 'REJECTED', error: 'Payment is not paid' };
  }

  if (verification.amountMinorUnits !== tx.expectedAmountMinor) {
    return { ok: false, status: 'REJECTED', error: 'Payment amount mismatch' };
  }

  if (verification.currency.toUpperCase() !== tx.expectedCurrency.toUpperCase()) {
    return { ok: false, status: 'REJECTED', error: 'Payment currency mismatch' };
  }

  const claim = await claimPaymentTransaction(providerCode, providerReference);
  if (!claim) {
    return { ok: false, status: 'REJECTED', error: 'Payment transaction not found' };
  }

  if (claim.alreadyCompleted) {
    return { ok: true, status: 'ALREADY_COMPLETED' };
  }

  if (!claim.claimed) {
    return { ok: false, status: 'PROCESSING', error: 'Payment is already being processed' };
  }

  const claimedTx = claim.transaction;
  const planCode = claimedTx.planCode;
  if (!planCode) {
    await markPaymentFailed(claimedTx.id, 'Payment transaction is missing plan code');
    return { ok: false, status: 'FAILED', error: 'Payment transaction is missing plan code' };
  }

  try {
    if (planCode === 'addon') {
      const metadata = (claimedTx.rawPayload as any) || {};
      const agentCount = parseInt(metadata?.agentCount || '0', 10);
      if (agentCount > 0 && agentCount <= 100) {
        await prisma.tenant.update({
          where: { id: claimedTx.tenantId },
          data: { extraAgents: { increment: agentCount } },
        });
      }
    } else {
      const handler = input.handleSuccessfulPayment || handleSuccessfulPaymentInternal;
      const result = await handler(claimedTx.tenantId, planCode, 'MONTHLY');
      if (!result?.success) {
        throw new Error(result?.error || 'Internal payment processing failed');
      }
    }

    await markPaymentCompleted(claimedTx.id);
    return { ok: true, status: 'COMPLETED' };
  } catch (error: any) {
    await markPaymentFailed(claimedTx.id, error.message || 'Internal payment processing failed');
    return { ok: false, status: 'FAILED', error: error.message || 'Internal payment processing failed' };
  }
}
