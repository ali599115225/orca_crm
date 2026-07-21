import { describe, expect, it } from 'vitest'
import {
  ACCESS_ROLE_BLUEPRINTS,
  LEGACY_ROLE_TO_ACCESS_ROLE,
  type LegacyRoleKey,
} from '../../lib/authz/backfill-plan'
import type { PermissionKey } from '../../lib/authz/permission-registry'

const LEGACY_ROLES = Object.keys(LEGACY_ROLE_TO_ACCESS_ROLE) as LegacyRoleKey[]

const LEGACY_POLICY = [
  {
    permissionKey: 'settings.read',
    allowedRoles: ['ADMIN', 'SALES_MANAGER', 'SALES_EMPLOYEE'],
  },
  {
    permissionKey: 'settings.manage',
    allowedRoles: ['ADMIN'],
  },
  {
    permissionKey: 'email.read',
    allowedRoles: ['ADMIN', 'SALES_MANAGER', 'SALES_EMPLOYEE'],
  },
  {
    permissionKey: 'email.send',
    allowedRoles: ['ADMIN', 'SALES_MANAGER', 'SALES_EMPLOYEE'],
  },
  {
    permissionKey: 'whatsapp.read',
    allowedRoles: [
      'ADMIN',
      'SALES_MANAGER',
      'SALES_EMPLOYEE',
      'MARKETING',
      'READ_ONLY',
    ],
  },
  {
    permissionKey: 'whatsapp.send',
    allowedRoles: ['ADMIN', 'SALES_MANAGER', 'SALES_EMPLOYEE'],
  },
] as const satisfies readonly {
  permissionKey: PermissionKey
  allowedRoles: readonly LegacyRoleKey[]
}[]

const rolePermissions = new Map(
  ACCESS_ROLE_BLUEPRINTS.map((role) => [role.key, new Set(role.permissionKeys)]),
)

function rbacAllows(role: LegacyRoleKey, permissionKey: PermissionKey): boolean {
  const accessRoleKey = LEGACY_ROLE_TO_ACCESS_ROLE[role]
  return rolePermissions.get(accessRoleKey)?.has(permissionKey) ?? false
}

describe('G3-06 current policy difference inventory', () => {
  it('records every selected legacy/RBAC mismatch before enforcement', () => {
    const differences = LEGACY_POLICY.flatMap((policy) =>
      LEGACY_ROLES.flatMap((role) => {
        const legacyAllowed = policy.allowedRoles.includes(role)
        const newAllowed = rbacAllows(role, policy.permissionKey)
        return legacyAllowed === newAllowed
          ? []
          : [
              `${policy.permissionKey}:${role}:${legacyAllowed ? 'legacy-allow' : 'legacy-deny'}:${newAllowed ? 'rbac-allow' : 'rbac-deny'}`,
            ]
      }),
    ).sort()

    expect(differences).toEqual([
      'email.read:MARKETING:legacy-deny:rbac-allow',
      'email.read:READ_ONLY:legacy-deny:rbac-allow',
      'email.read:SALES_EMPLOYEE:legacy-allow:rbac-deny',
      'email.read:SALES_MANAGER:legacy-allow:rbac-deny',
      'email.send:MARKETING:legacy-deny:rbac-allow',
      'email.send:SALES_EMPLOYEE:legacy-allow:rbac-deny',
      'email.send:SALES_MANAGER:legacy-allow:rbac-deny',
      'settings.read:READ_ONLY:legacy-deny:rbac-allow',
      'settings.read:SALES_EMPLOYEE:legacy-allow:rbac-deny',
      'settings.read:SALES_MANAGER:legacy-allow:rbac-deny',
      'whatsapp.read:SALES_EMPLOYEE:legacy-allow:rbac-deny',
      'whatsapp.read:SALES_MANAGER:legacy-allow:rbac-deny',
      'whatsapp.send:MARKETING:legacy-deny:rbac-allow',
      'whatsapp.send:SALES_EMPLOYEE:legacy-allow:rbac-deny',
      'whatsapp.send:SALES_MANAGER:legacy-allow:rbac-deny',
    ])
  })

  it('keeps settings management aligned and administrator authority intact', () => {
    for (const policy of LEGACY_POLICY) {
      expect(rbacAllows('ADMIN', policy.permissionKey)).toBe(true)
    }
    expect(rbacAllows('SALES_MANAGER', 'settings.manage')).toBe(false)
    expect(rbacAllows('SALES_EMPLOYEE', 'settings.manage')).toBe(false)
    expect(rbacAllows('MARKETING', 'settings.manage')).toBe(false)
    expect(rbacAllows('READ_ONLY', 'settings.manage')).toBe(false)
  })
})
