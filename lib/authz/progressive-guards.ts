import {
  assertServerActionRole,
  hasDatabaseRole,
  type SessionPayload,
} from '../api-auth-guard'
import {
  enforceProgressiveAuthorization,
  type ProgressiveEnforcementOptions,
  type ProgressiveEnforcementResult,
} from './enforcement'

export type ProgressiveGuardOptions = Omit<
  ProgressiveEnforcementOptions,
  'resource'
> & {
  resource?: ProgressiveEnforcementOptions['resource']
}

function normalizeIdentity(value: unknown): SessionPayload | null {
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

export async function hasDatabaseRoleWithProgressiveAuthorization(
  session: SessionPayload,
  allowedRoles: readonly string[],
  options: ProgressiveGuardOptions,
): Promise<ProgressiveEnforcementResult> {
  const legacyAllowed = await hasDatabaseRole(session, allowedRoles)
  return enforceProgressiveAuthorization(session, legacyAllowed, options)
}

export async function assertServerActionRoleWithProgressiveAuthorization(
  value: unknown,
  allowedRoles: readonly string[],
  options: ProgressiveGuardOptions,
): Promise<SessionPayload> {
  const identity = normalizeIdentity(value)
  if (!identity) {
    return assertServerActionRole(value, allowedRoles)
  }

  let verified: SessionPayload | null = null
  let legacyAllowed = false
  let legacyError: unknown = null
  try {
    verified = await assertServerActionRole(value, allowedRoles)
    legacyAllowed = true
  } catch (error) {
    legacyError = error
  }

  const result = await enforceProgressiveAuthorization(
    verified ?? identity,
    legacyAllowed,
    options,
  )

  if (!result.effectiveAllowed) {
    if (!legacyAllowed && legacyError) throw legacyError
    throw new Error('FORBIDDEN')
  }

  if (!verified) {
    throw legacyError ?? new Error('FORBIDDEN')
  }
  return verified
}
