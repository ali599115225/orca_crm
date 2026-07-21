"use server";

import {
  LEGACY_SAAS_OUT_OF_SCOPE,
  ORCA_PLATFORM_MODEL,
  legacySaasBlockedResult,
} from "@/lib/platform-operating-model";

export interface TenantRegistrationResult {
  success: false;
  enabled: false;
  code: typeof LEGACY_SAAS_OUT_OF_SCOPE;
  capability: "PUBLIC_TENANT_REGISTRATION";
  error: string;
  platformModel: typeof ORCA_PLATFORM_MODEL.platformModel;
  reason: "SINGLE_COMPANY_OPERATIONAL_MODE";
}

/**
 * Legacy public tenant onboarding is deliberately non-executable.
 *
 * Keep this action as a compatibility boundary while old clients or links may
 * still reference it. It must never read registration data, access Prisma,
 * create demo records, set a session cookie, or invoke an external provider.
 */
export async function registerTenantAction(
  _formData: FormData,
): Promise<TenantRegistrationResult> {
  return legacySaasBlockedResult(
    "PUBLIC_TENANT_REGISTRATION",
    "تسجيل شركات جديدة غير متاح. ORCA منصة تشغيل داخلية لشركة واحدة.",
  );
}
