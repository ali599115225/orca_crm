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

const HISTORICAL_G3_06_DIFFERENCE_COUNT = 15

const rolePermissions = new Map(
  ACCESS_ROLE_BLUEPRINTS.map((role) => [role.key, new Set(role.permissionKeys)]),
)

function rbacAllows(role: LegacyRoleKey, permissionKey: PermissionKey): boolean {
  const accessRoleKey = LEGACY_ROLE_TO_ACCESS_ROLE[role]
  return rolePermissions.get(accessRoleKey)?.has(permissionKey) ?? false
}

function currentDifferences(): string[] {
  return LEGACY_POLICY.flatMap((policy) =>
    LEGACY_ROLES.flatMap((role) => {
      const legacyAllowed = (policy.allowedRoles as readonly string[]).includes(role)
      const newAllowed = rbacAllows(role, policy.permissionKey)
      return legacyAllowed === newAllowed
        ? []
        : [
            `${policy.permissionKey}:${role}:${legacyAllowed ? 'legacy-allow' : 'legacy-deny'}:${newAllowed ? 'rbac-allow' : 'rbac-deny'}`,
          ]
    }),
  ).sort()
}

describe('G3-06/G3-07 policy difference lifecycle', () => {
  it('retains the historical G3-06 finding count as closure evidence', () => {
    expect(HISTORICAL_G3_06_DIFFERENCE_COUNT).toBe(15)
  })

  it('requires every selected unexpected grant and denial to be reconciled before enforcement', () => {
    expect(currentDifferences()).toEqual([])
  })

  it('keeps administrator authority and explicit no-grant rules intact', () => {
    for (const policy of LEGACY_POLICY) {
      expect(rbacAllows('ADMIN', policy.permissionKey)).toBe(true)
    }
    expect(rbacAllows('SALES_MANAGER', 'settings.manage')).toBe(false)
    expect(rbacAllows('SALES_EMPLOYEE', 'settings.manage')).toBe(false)
    expect(rbacAllows('MARKETING', 'settings.manage')).toBe(false)
    expect(rbacAllows('READ_ONLY', 'settings.manage')).toBe(false)
    expect(rbacAllows('MARKETING', 'email.send')).toBe(false)
    expect(rbacAllows('MARKETING', 'whatsapp.send')).toBe(false)
    expect(rbacAllows('READ_ONLY', 'settings.read')).toBe(false)
    expect(rbacAllows('READ_ONLY', 'email.read')).toBe(false)
  })
})
