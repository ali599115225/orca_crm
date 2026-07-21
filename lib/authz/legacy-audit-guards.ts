import {
  assertServerActionRole,
  hasDatabaseRole,
  type SessionPayload,
} from '../api-auth-guard'
import {
  observeLegacyAuthorization,
  type LegacyAuthorizationAuditOptions,
} from './audit-mode'

export async function hasDatabaseRoleWithAudit(
  session: SessionPayload,
  allowedRoles: readonly string[],
  audit: LegacyAuthorizationAuditOptions,
): Promise<boolean> {
  const legacyAllowed = await hasDatabaseRole(session, allowedRoles)
  await observeLegacyAuthorization(session, legacyAllowed, audit)
  return legacyAllowed
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

  try {
    const verified = await assertServerActionRole(value, allowedRoles)
    await observeLegacyAuthorization(verified, true, audit)
    return verified
  } catch (error) {
    if (identity) {
      await observeLegacyAuthorization(identity, false, audit)
    }
    throw error
  }
}
