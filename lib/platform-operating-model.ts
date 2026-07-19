/**
 * Canonical operating-model boundary for the current ORCA product.
 *
 * ORCA is an internal operating platform for one independent company.
 * Legacy multi-company SaaS onboarding, subscriptions, add-ons, and billing
 * remain in the repository only for backward-compatibility analysis and must
 * not be executable in the current product.
 */
export const ORCA_PLATFORM_MODEL = {
  businessModel: "SINGLE_INDEPENDENT_COMPANY",
  platformModel: "INTERNAL_COMPANY_OPERATING_PLATFORM",
  legacySaasEnabled: false,
  externalIntegrationsDefaultState: "NOT_CONFIGURED",
} as const;

export const LEGACY_SAAS_OUT_OF_SCOPE = "LEGACY_SAAS_OUT_OF_SCOPE" as const;

export function isLegacySaasEnabled(): boolean {
  return ORCA_PLATFORM_MODEL.legacySaasEnabled;
}