import {
  assertServerActionRole,
  hasDatabaseRole,
  type SessionPayload,
} from '../api-auth-guard'
import {
  observeLegacyAuthorization,
  type LegacyAuthorizationAuditOptions,
} from './audit-mode'
import {
  enforceProgressiveAuthorization,
  type EnforcementDomain,
} from './enforcement'

function domainForPermission(permissionKey: string): EnforcementDomain | null {
  const resource = permissionKey.split('.')[0]
  if (resource === 'users' || resource === 'settings' || resource === 'organization' || resource === 'access') {
    return 'users-settings'
  }
  if (
    resource === 'accounting' ||
    resource === 'payments' ||
    resource === 'installments' ||
    resource === 'invoices' ||
    resource === 'contracts' ||
    resource === 'rentals' ||
    resource === 'zatca'
  ) {
    return 'finance'
  }
  if (resource === 'email' || resource === 'whatsapp' || resource === 'notifications') {
    return 'messaging'
  }
  if (
    resource === 'leads' ||
    resource === 'contacts' ||
    resource === 'opportunities' ||
    resource === 'projects' ||
    resource === 'properties' ||
    resource === 'tasks' ||
    resource === 'tours' ||
    resource === 'offers'
  ) {
    return 'sales'
  }
  if (resource === 'sentinel' || resource === 'realtime' || resource === 'automations') {
    return 'jobs'
  }
  return null
}

export async function hasDatabaseRoleWithAudit(
  session: SessionPayload,
  allowedRoles: readonly string[],
  audit: LegacyAuthorizationAuditOptions,
): Promise<boolean> {
  const legacyAllowed = await hasDatabaseRole(session, allowedRoles)
  const domain = domainForPermission(audit.permissionKey)
  if (!domain) {
    await observeLegacyAuthorization(session, legacyAllowed, audit)
    return legacyAllowed
  }

  const result = await enforceProgressiveAuthorization(session, legacyAllowed, {
    domain,
    ...audit,
    auditSink: audit.sink,
  })
  return result.effectiveAllowed
}

function auditIdentity(value: unknown): SessionPayload | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as Record<string, unknown>
  if (
    typeof candidate.userId !== 'string' ||
    candidate.userId.trim() === '' ||
    typeof candidate.tenantId !== 'string' ||
    candidate.tenantId.trim() === ''
  ) {
    return null
  }

  return {
    userId: candidate.userId,
    tenantId: candidate.tenantId,
    role: typeof candidate.role === 'string' ? candidate.role : '',
    tenantSubdomain:
      typeof candidate.tenantSubdomain === 'string'
        ? candidate.tenantSubdomain
        : undefined,
    name: typeof candidate.name === 'string' ? candidate.name : undefined,
  }
}

export async function assertServerActionRoleWithAudit(
  value: unknown,
  allowedRoles: readonly string[],
  audit: LegacyAuthorizationAuditOptions,
): Promise<SessionPayload> {
  const identity = auditIdentity(value)
  let verified: SessionPayload | null = null
  let legacyAllowed = false
  let legacyError: unknown = null

  try {
    verified = await assertServerActionRole(value, allowedRoles)
    legacyAllowed = true
  } catch (error) {
    legacyError = error
  }

  const effectiveIdentity = verified ?? identity
  if (!effectiveIdentity) {
    throw legacyError ?? new Error('UNAUTHORIZED')
  }

  const domain = domainForPermission(audit.permissionKey)
  if (!domain) {
    await observeLegacyAuthorization(effectiveIdentity, legacyAllowed, audit)
  } else {
    const result = await enforceProgressiveAuthorization(
      effectiveIdentity,
      legacyAllowed,
      {
        domain,
        ...audit,
        auditSink: audit.sink,
      },
    )
    if (!result.effectiveAllowed) {
      if (!legacyAllowed && legacyError) throw legacyError
      throw new Error('FORBIDDEN')
    }
  }

  if (!legacyAllowed || !verified) {
    throw legacyError ?? new Error('FORBIDDEN')
  }
  return verified
}
