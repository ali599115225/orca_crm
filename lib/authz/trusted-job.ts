import {
  PERMISSION_BY_KEY,
  isPermissionKey,
} from './permission-registry'
import {
  isEnforcementDomainEnabled,
  type EnforcementDomain,
} from './enforcement'

export type TrustedJobAuthorizationResult = Readonly<{
  domain: 'jobs'
  enforced: boolean
  legacyAuthorized: boolean
  systemPermissionValid: boolean
  effectiveAllowed: boolean
  reason:
    | 'LEGACY_MODE'
    | 'LEGACY_DENY'
    | 'TRUSTED_SYSTEM_ALLOW'
    | 'UNKNOWN_PERMISSION'
    | 'NOT_SYSTEM_PERMISSION'
}>

/**
 * Explicit platform boundary for authenticated background work.
 * It never accepts tenant/company scope from a browser or request payload.
 */
export function authorizeTrustedJob(
  legacyAuthorized: boolean,
  permissionKey: string,
  options: {
    enforcedDomains?: ReadonlySet<EnforcementDomain>
  } = {},
): TrustedJobAuthorizationResult {
  const enforced = isEnforcementDomainEnabled('jobs', options)
  if (!enforced) {
    return Object.freeze({
      domain: 'jobs' as const,
      enforced: false,
      legacyAuthorized,
      systemPermissionValid: false,
      effectiveAllowed: legacyAuthorized,
      reason: 'LEGACY_MODE' as const,
    })
  }

  if (!legacyAuthorized) {
    return Object.freeze({
      domain: 'jobs' as const,
      enforced: true,
      legacyAuthorized: false,
      systemPermissionValid: false,
      effectiveAllowed: false,
      reason: 'LEGACY_DENY' as const,
    })
  }

  if (!isPermissionKey(permissionKey)) {
    return Object.freeze({
      domain: 'jobs' as const,
      enforced: true,
      legacyAuthorized: true,
      systemPermissionValid: false,
      effectiveAllowed: false,
      reason: 'UNKNOWN_PERMISSION' as const,
    })
  }

  const permission = PERMISSION_BY_KEY[permissionKey]
  if (permission.risk !== 'SYSTEM') {
    return Object.freeze({
      domain: 'jobs' as const,
      enforced: true,
      legacyAuthorized: true,
      systemPermissionValid: false,
      effectiveAllowed: false,
      reason: 'NOT_SYSTEM_PERMISSION' as const,
    })
  }

  return Object.freeze({
    domain: 'jobs' as const,
    enforced: true,
    legacyAuthorized: true,
    systemPermissionValid: true,
    effectiveAllowed: true,
    reason: 'TRUSTED_SYSTEM_ALLOW' as const,
  })
}
