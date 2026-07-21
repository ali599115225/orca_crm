import {
  AuthorizationError,
  authorize,
  resolveAccessContext,
  type AccessContext,
  type AccessStateLoader,
  type ResourceAccessScope,
} from './authorization'
import {
  observeLegacyAuthorization,
  type AuthorizationAuditSink,
} from './audit-mode'

export const ENFORCEMENT_DOMAINS = [
  'users-settings',
  'finance',
  'messaging',
  'sales',
  'jobs',
] as const

export type EnforcementDomain = (typeof ENFORCEMENT_DOMAINS)[number]

export type ProgressiveEnforcementReason =
  | 'LEGACY_MODE'
  | 'LEGACY_DENY'
  | 'DUAL_ALLOW'
  | 'RBAC_DENY'
  | 'RBAC_ERROR'

export type ProgressiveEnforcementResult = Readonly<{
  domain: EnforcementDomain
  enforced: boolean
  legacyAllowed: boolean
  rbacAllowed: boolean | null
  effectiveAllowed: boolean
  reason: ProgressiveEnforcementReason
  authorizationReasonCode: string | null
}>

export type ProgressiveEnforcementOptions = Readonly<{
  domain: EnforcementDomain
  permissionKey: string
  source: string
  resource?: ResourceAccessScope
  requestId?: string | null
  now?: Date
  loader?: AccessStateLoader
  resolver?: (
    verifiedSession: unknown,
    options: { loader?: AccessStateLoader; now?: Date },
  ) => Promise<AccessContext>
  auditSink?: AuthorizationAuditSink
  enforcedDomains?: ReadonlySet<EnforcementDomain>
}>

function parseDomains(value: string | undefined): ReadonlySet<EnforcementDomain> {
  const requested = new Set(
    String(value || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  )
  return new Set(
    ENFORCEMENT_DOMAINS.filter((domain) => requested.has(domain)),
  )
}

export function configuredEnforcementDomains(
  env: NodeJS.ProcessEnv = process.env,
): ReadonlySet<EnforcementDomain> {
  if (env.G3_RBAC_ENFORCEMENT_ACK !== 'G3-07-DUAL-ALLOW') {
    return new Set()
  }

  if (
    (env.NODE_ENV === 'production' || env.VERCEL_ENV === 'production') &&
    env.G3_RBAC_PRODUCTION_APPROVAL !== 'approved'
  ) {
    return new Set()
  }

  return parseDomains(env.G3_RBAC_ENFORCE_DOMAINS)
}

export function isEnforcementDomainEnabled(
  domain: EnforcementDomain,
  options: { enforcedDomains?: ReadonlySet<EnforcementDomain> } = {},
): boolean {
  return (options.enforcedDomains ?? configuredEnforcementDomains()).has(domain)
}

/**
 * Progressive enforcement uses an intersection contract:
 *
 * - legacy deny always remains deny;
 * - RBAC can add a denial only inside an explicitly enabled domain;
 * - RBAC can never turn a legacy denial into an allow;
 * - missing/invalid RBAC context fails closed only for enabled domains.
 */
export async function enforceProgressiveAuthorization(
  verifiedSession: Readonly<{ userId: string; tenantId: string; role?: string }>,
  legacyAllowed: boolean,
  options: ProgressiveEnforcementOptions,
): Promise<ProgressiveEnforcementResult> {
  const enforced = isEnforcementDomainEnabled(options.domain, options)

  if (!enforced) {
    await observeLegacyAuthorization(verifiedSession, legacyAllowed, {
      permissionKey: options.permissionKey,
      source: options.source,
      resource: options.resource,
      requestId: options.requestId,
      now: options.now,
      loader: options.loader,
      resolver: options.resolver,
      sink: options.auditSink,
    })

    return Object.freeze({
      domain: options.domain,
      enforced: false,
      legacyAllowed,
      rbacAllowed: null,
      effectiveAllowed: legacyAllowed,
      reason: 'LEGACY_MODE' as const,
      authorizationReasonCode: null,
    })
  }

  if (!legacyAllowed) {
    return Object.freeze({
      domain: options.domain,
      enforced: true,
      legacyAllowed: false,
      rbacAllowed: null,
      effectiveAllowed: false,
      reason: 'LEGACY_DENY' as const,
      authorizationReasonCode: null,
    })
  }

  try {
    const resolver = options.resolver ?? resolveAccessContext
    const context = await resolver(verifiedSession, {
      loader: options.loader,
      now: options.now,
    })
    const decision = authorize(
      context,
      options.permissionKey,
      options.resource ?? { tenantId: verifiedSession.tenantId },
    )

    return Object.freeze({
      domain: options.domain,
      enforced: true,
      legacyAllowed: true,
      rbacAllowed: decision.allowed,
      effectiveAllowed: decision.allowed,
      reason: decision.allowed ? ('DUAL_ALLOW' as const) : ('RBAC_DENY' as const),
      authorizationReasonCode: decision.reasonCode,
    })
  } catch (error: unknown) {
    return Object.freeze({
      domain: options.domain,
      enforced: true,
      legacyAllowed: true,
      rbacAllowed: false,
      effectiveAllowed: false,
      reason: 'RBAC_ERROR' as const,
      authorizationReasonCode:
        error instanceof AuthorizationError
          ? error.reasonCode
          : 'ENFORCEMENT_EVALUATION_ERROR',
    })
  }
}
