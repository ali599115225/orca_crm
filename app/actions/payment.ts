// app/actions/payment.ts — unified multi-provider payment initiation
"use server";

import { getActiveTenant } from "@/lib/tenant";
import { getDeploymentLicenseMode } from "@/lib/deployment-license";
import { canPurchaseAgentSubscriptions } from "@/lib/agents/entitlements";
import { getEnabledProviderCodes, isProviderEnabled } from "@/lib/payments/registry";
import { initiatePayment, getPlanPriceMinor } from "@/lib/payments/service";

export async function initiateSubscriptionPaymentAction(
  plan: "basic" | "silver" | "gold" | "pro" | "professional" | "diamond",
  providerCode?: string
) {
  try {
    const tenant = await getActiveTenant();

    const effectiveProvider = providerCode || process.env.DEFAULT_PAYMENT_PROVIDER || 'MOYASAR';

    if (!isProviderEnabled(effectiveProvider)) {
      return { success: false, error: `مزود الدفع ${effectiveProvider} غير مفعل حالياً.` };
    }

    const description = `ترقية باقة ${plan} — ${tenant.companyName || 'ORCA'}`;

    const result = await initiatePayment({
      tenantId: tenant.id,
      planCode: plan,
      providerCode: effectiveProvider,
      description,
    });

    return result;
  } catch (error: any) {
    console.error('[Payment] Subscription initiation error:', error.message);
    return { success: false, error: error.message };
  }
}

export async function initiateAddonPaymentAction(agentCount: number, providerCode?: string) {
  try {
    const tenant = await getActiveTenant();

    if (!agentCount || agentCount <= 0 || agentCount > 100) {
      return { success: false, error: "يجب اختيار ما بين 1 إلى 100 وكيل للشراء." };
    }

    const effectiveProvider = providerCode || process.env.DEFAULT_PAYMENT_PROVIDER || 'MOYASAR';

    if (!isProviderEnabled(effectiveProvider)) {
      return { success: false, error: `مزود الدفع ${effectiveProvider} غير مفعل حالياً.` };
    }

    const pricePerAgentMinor = 250_00; // SAR minor units per agent
    const totalMinor = pricePerAgentMinor * agentCount;

    const result = await initiatePayment({
      tenantId: tenant.id,
      planCode: 'addon',
      providerCode: effectiveProvider,
      description: `شراء عدد ${agentCount} وكيل إضافي — ${tenant.companyName || 'ORCA'}`,
      metadata: { type: 'addon', agentCount: String(agentCount) },
    });

    // Override the default plan price with addon price
    if (result.internalTxId && process.env.NODE_ENV !== 'production') {
      const { prisma } = await import('@/lib/prisma');
      await prisma.paymentTransaction.update({
        where: { id: result.internalTxId },
        data: {
          amount: totalMinor / 100,
          netAmount: totalMinor / 100,
          expectedAmountMinor: totalMinor,
        },
      });
    }

    return result;
  } catch (error: any) {
    console.error('[Payment] Addon initiation error:', error.message);
    return { success: false, error: error.message };
  }
}

export async function getAvailableProvidersAction() {
  return {
    success: true,
    providers: getEnabledProviderCodes(),
    default: process.env.DEFAULT_PAYMENT_PROVIDER || 'MOYASAR',
  };
}
