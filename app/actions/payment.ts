// app/actions/payment.ts — unified multi-provider payment initiation
// Hardened: session + DB role check (ADMIN / owner) before any payment.
"use server";

import { getSession } from "@/lib/session";
import { getActiveTenant } from "@/lib/tenant";
import { assertServerActionRole } from "@/lib/api-auth-guard";
import { writeAuditLog } from "@/lib/audit";
import { getEnabledProviderCodes, isProviderEnabled } from "@/lib/payments/registry";
import { initiatePayment } from "@/lib/payments/service";

export async function initiateSubscriptionPaymentAction(
  plan: "basic" | "silver" | "gold" | "pro" | "professional" | "diamond",
  providerCode?: string
) {
  try {
    // ── Auth: DB-backed role — only ADMIN or owner may upgrade subscription ──
    const session = await getSession();
    if (!session) return { success: false, error: "يجب تسجيل الدخول أولاً." };
    const verified = await assertServerActionRole(session, ["ADMIN", "owner"]);

    const tenant = await getActiveTenant();

    const effectiveProvider =
      providerCode || process.env.DEFAULT_PAYMENT_PROVIDER || "MOYASAR";

    if (!isProviderEnabled(effectiveProvider)) {
      return {
        success: false,
        error: `مزود الدفع ${effectiveProvider} غير مفعل حالياً.`,
      };
    }

    const description = `ترقية باقة ${plan} — ${tenant.companyName || "ORCA"}`;

    const result = await initiatePayment({
      tenantId: tenant.id,
      planCode: plan,
      providerCode: effectiveProvider,
      description,
    });

    // ── Audit: every subscription initiation is recorded ──────────────────
    await writeAuditLog({
      tenantId: tenant.id,
      userId: verified.userId,
      action: "SUBSCRIPTION_PAYMENT_INITIATED",
      tableName: "payment_transactions",
      recordId: result.internalTxId || tenant.id,
      details: JSON.stringify({ plan, provider: effectiveProvider }),
    });

    return result;
  } catch (error: any) {
    console.error("[Payment] Subscription initiation error:", error.message);
    return { success: false, error: error.message };
  }
}

export async function initiateAddonPaymentAction(
  agentCount: number,
  providerCode?: string
) {
  try {
    // ── Auth: DB-backed role — only ADMIN or owner may purchase addons ─────
    const session = await getSession();
    if (!session) return { success: false, error: "يجب تسجيل الدخول أولاً." };
    const verified = await assertServerActionRole(session, ["ADMIN", "owner"]);

    const tenant = await getActiveTenant();

    if (!agentCount || agentCount <= 0 || agentCount > 100) {
      return {
        success: false,
        error: "يجب اختيار ما بين 1 إلى 100 وكيل للشراء.",
      };
    }

    const effectiveProvider =
      providerCode || process.env.DEFAULT_PAYMENT_PROVIDER || "MOYASAR";

    if (!isProviderEnabled(effectiveProvider)) {
      return {
        success: false,
        error: `مزود الدفع ${effectiveProvider} غير مفعل حالياً.`,
      };
    }

    const pricePerAgentMinor = 250_00; // SAR minor units per agent
    const totalMinor = pricePerAgentMinor * agentCount;

    const result = await initiatePayment({
      tenantId: tenant.id,
      planCode: "addon",
      providerCode: effectiveProvider,
      description: `شراء عدد ${agentCount} وكيل إضافي — ${tenant.companyName || "ORCA"}`,
      metadata: { type: "addon", agentCount: String(agentCount) },
    });

    // Override the default plan price with addon price (dev only)
    if (result.internalTxId && process.env.NODE_ENV !== "production") {
      const { prisma } = await import("@/lib/prisma");
      await prisma.paymentTransaction.update({
        where: { id: result.internalTxId },
        data: {
          amount: totalMinor / 100,
          netAmount: totalMinor / 100,
          expectedAmountMinor: totalMinor,
        },
      });
    }

    // ── Audit ──────────────────────────────────────────────────────────────
    await writeAuditLog({
      tenantId: tenant.id,
      userId: verified.userId,
      action: "ADDON_PAYMENT_INITIATED",
      tableName: "payment_transactions",
      recordId: result.internalTxId || tenant.id,
      details: JSON.stringify({ agentCount, provider: effectiveProvider }),
    });

    return result;
  } catch (error: any) {
    console.error("[Payment] Addon initiation error:", error.message);
    return { success: false, error: error.message };
  }
}

export async function getAvailableProvidersAction() {
  return {
    success: true,
    providers: getEnabledProviderCodes(),
    default: process.env.DEFAULT_PAYMENT_PROVIDER || "MOYASAR",
  };
}
