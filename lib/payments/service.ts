// lib/payments/service.ts — SERVER-ONLY
import "server-only";
import { prisma } from "@/lib/prisma";
import type { PaymentStatus } from './types';
import { getPaymentProvider, isProviderEnabled } from './registry';

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
): Promise<any | null> {
  const tx = await prisma.paymentTransaction.findFirst({
    where: { provider: provider.toUpperCase(), providerReference },
  });
  if (!tx) return null;

  if (tx.status === 'COMPLETED' || tx.status === 'PROCESSING') return tx;

  // Atomic claim — only update if still PENDING or FAILED
  const updated = await prisma.paymentTransaction.updateMany({
    where: {
      id: tx.id,
      status: { in: ['PENDING', 'FAILED'] },
    },
    data: { status: 'PROCESSING', webhookReceivedAt: new Date() },
  });

  if (updated.count === 0) {
    // Someone else claimed it — return the current state
    return prisma.paymentTransaction.findUnique({ where: { id: tx.id } });
  }

  return prisma.paymentTransaction.findUnique({ where: { id: tx.id } });
}

export async function markPaymentCompleted(txId: string): Promise<void> {
  await prisma.paymentTransaction.update({
    where: { id: txId },
    data: { status: 'COMPLETED', processedAt: new Date() },
  });
}

export async function markPaymentFailed(txId: string, reason: string): Promise<void> {
  await prisma.paymentTransaction.update({
    where: { id: txId },
    data: { status: 'FAILED', failureReason: reason.slice(0, 2000) },
  });
}

export async function initiatePayment(input: {
  tenantId: string;
  planCode: string;
  providerCode?: string;
  metadata?: Record<string, string>;
  description?: string;
  callbackUrl?: string;
}): Promise<{ success: boolean; paymentUrl?: string; internalTxId?: string; error?: string }> {
  try {
    const providerCode = input.providerCode || 'MOYASAR';

    if (!isProviderEnabled(providerCode)) {
      return { success: false, error: `Payment provider ${providerCode} is not enabled` };
    }

    const provider = getPaymentProvider(providerCode);
    if (!provider) {
      return { success: false, error: `Payment provider ${providerCode} not found` };
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
      callbackUrl: input.callbackUrl || `${appUrl}/api/payment/callback`,
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
