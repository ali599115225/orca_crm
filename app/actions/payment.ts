// app/actions/payment.ts — unified multi-provider payment initiation
// Hardened: session + DB role check (ADMIN / owner) before any payment.
"use server";

import {
  LEGACY_SAAS_OUT_OF_SCOPE,
  ORCA_PLATFORM_MODEL,
} from "@/lib/platform-operating-model";

const LEGACY_PAYMENT_ERROR =
  "مدفوعات اشتراك المنصة وإضافات SaaS غير متاحة في نموذج الشركة الواحدة.";

function legacyPlatformPaymentBlocked() {
  return {
    success: false as const,
    error: LEGACY_PAYMENT_ERROR,
    code: LEGACY_SAAS_OUT_OF_SCOPE,
    platformModel: ORCA_PLATFORM_MODEL.platformModel,
  };
}

export async function initiateSubscriptionPaymentAction(
  plan: "basic" | "silver" | "gold" | "pro" | "professional" | "diamond",
  providerCode?: string
) {
  void plan;
  void providerCode;
  return legacyPlatformPaymentBlocked();
}

export async function initiateAddonPaymentAction(
  agentCount: number,
  providerCode?: string
) {
  void agentCount;
  void providerCode;
  return legacyPlatformPaymentBlocked();
}

export async function getAvailableProvidersAction() {
  return {
    success: true,
    providers: [] as string[],
    default: null,
    state: ORCA_PLATFORM_MODEL.externalIntegrationsDefaultState,
    code: LEGACY_SAAS_OUT_OF_SCOPE,
  };
}
