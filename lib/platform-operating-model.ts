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

export const LEGACY_SAAS_CAPABILITIES = [
  "PUBLIC_TENANT_REGISTRATION",
  "SELF_SERVICE_TRIAL",
  "SUBSCRIPTION_CHECKOUT",
  "SUBSCRIPTION_CHANGE",
  "ADDON_CHECKOUT",
  "AGENT_LEASING",
  "AUTOMATIC_RENEWAL",
  "BILLING_CRON",
  "PACKAGE_LIMIT_ENFORCEMENT",
  "UPGRADE_NAVIGATION",
] as const;

export type LegacySaasCapability =
  (typeof LEGACY_SAAS_CAPABILITIES)[number];

export type LegacySaasBlock = Readonly<{
  enabled: false;
  code: typeof LEGACY_SAAS_OUT_OF_SCOPE;
  capability: LegacySaasCapability;
  platformModel: typeof ORCA_PLATFORM_MODEL.platformModel;
  reason: "SINGLE_COMPANY_OPERATIONAL_MODE";
}>;

const LEGACY_SAAS_BLOCKS = Object.freeze(
  Object.fromEntries(
    LEGACY_SAAS_CAPABILITIES.map((capability) => [
      capability,
      Object.freeze({
        enabled: false as const,
        code: LEGACY_SAAS_OUT_OF_SCOPE,
        capability,
        platformModel: ORCA_PLATFORM_MODEL.platformModel,
        reason: "SINGLE_COMPANY_OPERATIONAL_MODE" as const,
      }),
    ]),
  ),
) as Readonly<Record<LegacySaasCapability, LegacySaasBlock>>;

export function isLegacySaasEnabled(): false {
  return false;
}

export function getLegacySaasCapability(
  capability: LegacySaasCapability,
): LegacySaasBlock {
  return LEGACY_SAAS_BLOCKS[capability];
}

export function legacySaasBlockedResult(
  capability: LegacySaasCapability,
  error: string,
) {
  return Object.freeze({
    success: false as const,
    error,
    ...getLegacySaasCapability(capability),
  });
}
