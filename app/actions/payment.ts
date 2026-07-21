// app/actions/payment.ts — retired platform subscription payment boundary
"use server";

import {
  LEGACY_SAAS_OUT_OF_SCOPE,
  ORCA_PLATFORM_MODEL,
  legacySaasBlockedResult,
} from "@/lib/platform-operating-model";

const LEGACY_PAYMENT_ERROR =
  "مدفوعات اشتراك المنصة وإضافات SaaS غير متاحة في نموذج الشركة الواحدة.";

export async function initiateSubscriptionPaymentAction(
  plan: "basic" | "silver" | "gold" | "pro" | "professional" | "diamond",
  providerCode?: string
) {
  void plan;
  void providerCode;
  return legacySaasBlockedResult("SUBSCRIPTION_CHECKOUT", LEGACY_PAYMENT_ERROR);
}

export async function initiateAddonPaymentAction(
  agentCount: number,
  providerCode?: string
) {
  void agentCount;
  void providerCode;
  return legacySaasBlockedResult("ADDON_CHECKOUT", LEGACY_PAYMENT_ERROR);
}

export async function getAvailableProvidersAction() {
  return {
    success: true,
    enabled: false as const,
    providers: [] as string[],
    default: null,
    state: ORCA_PLATFORM_MODEL.externalIntegrationsDefaultState,
    code: LEGACY_SAAS_OUT_OF_SCOPE,
    capability: "SUBSCRIPTION_CHECKOUT" as const,
    reason: "SINGLE_COMPANY_OPERATIONAL_MODE" as const,
  };
}
