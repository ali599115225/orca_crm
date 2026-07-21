import { describe, expect, it } from 'vitest'
import {
  AuthorizationError,
  authorize,
  getAccessContext,
  requirePermission,
  resolveAccessContext,
  runWithResolvedAccessContext,
  scopeMatch,
  type AccessContext,
  type AccessStateLoader,
  type AccessStateSnapshot,
  type ResolvedRoleAssignment,
} from '../../lib/authz/authorization'
import { getTenantContext } from '../../lib/tenant-context'
import type { PermissionKey, PermissionScope } from '../../lib/authz/permission-registry'

const NOW = new Date('2026-07-21T01:00:00.000Z')
const TENANT_ID = '10000000-0000-0000-0000-000000000001'
const USER_ID = '20000000-0000-0000-0000-000000000001'
const ROLE_ID = '30000000-0000-0000-0000-000000000001'
const PERMISSION_ID = '40000000-0000-0000-0000-000000000001'

function snapshot(
  overrides: Partial<AccessStateSnapshot> = {},
): AccessStateSnapshot {
  return {
    user: { id: USER_ID, tenantId: TENANT_ID, isActive: true, role: 'SALES_EMPLOYEE' },
    tenant: { id: TENANT_ID, isActive: true },
    orgAssignments: [
      {
        id: 'org-assignment-1',
        tenantId: TENANT_ID,
        userId: USER_ID,
        orgUnitId: 'department-1',
        status: 'ACTIVE',
        isPrimary: true,
        validFrom: new Date('2026-01-01T00:00:00.000Z'),
        validUntil: null,
      },
    ],
    roleAssignments: [
      {
        id: 'role-assignment-1',
        tenantId: TENANT_ID,
        userId: USER_ID,
        accessRoleId: ROLE_ID,
        scopeType: 'TENANT',
        scopeOrgUnitId: null,
        resourceType: null,
        resourceId: null,
        status: 'ACTIVE',
        validFrom: new Date('2026-01-01T00:00:00.000Z'),
        validUntil: null,
      },
    ],
    roles: [{ id: ROLE_ID, tenantId: TENANT_ID, key: 'sales-employee', isActive: true }],
    rolePermissionLinks: [
      { tenantId: TENANT_ID, accessRoleId: ROLE_ID, permissionId: PERMISSION_ID },
    ],
    permissions: [{ id: PERMISSION_ID, key: 'leads.read', isActive: true }],
    ...overrides,
  }
}

const loader = (value: AccessStateSnapshot): AccessStateLoader => ({
  async load() {
    return value
  },
})

function assignment(
  scopeType: PermissionScope,
  permissionKey: PermissionKey = 'leads.read',
  overrides: Partial<ResolvedRoleAssignment> = {},
): ResolvedRoleAssignment {
  return {
    id: `assignment-${scopeType}`,
    accessRoleId: ROLE_ID,
    roleKey: 'test-role',
    scopeType,
    scopeOrgUnitId: null,
    resourceType: null,
    resourceId: null,
    validFrom: new Date('2026-01-01T00:00:00.000Z'),
    validUntil: null,
    permissionKeys: new Set([permissionKey]),
    ...overrides,
  }
}

function contextWith(
  roleAssignments: readonly ResolvedRoleAssignment[],
): AccessContext {
  return {
    tenantId: TENANT_ID,
    userId: USER_ID,
    tenantActive: true,
    userActive: true,
    legacyRole: 'SALES_EMPLOYEE',
    orgAssignments: [],
    roleAssignments,
    permissionKeys: new Set(
      roleAssignments.flatMap((item) => [...item.permissionKeys]),
    ),
    resolvedAt: NOW,
  }
}

describe('G3-05 centralized authorization layer', () => {
  it('rejects missing or malformed verified session identity', async () => {
    await expect(resolveAccessContext(null, { loader: loader(snapshot()), now: NOW }))
      .rejects.toMatchObject({ reasonCode: 'SESSION_REQUIRED', status: 401 })
    await expect(
      resolveAccessContext({ userId: USER_ID }, { loader: loader(snapshot()), now: NOW }),
    ).rejects.toMatchObject({ reasonCode: 'SESSION_INVALID', status: 401 })
  })

  it('revalidates active user and tenant from current database state', async () => {
    await expect(
      resolveAccessContext(
        { userId: USER_ID, tenantId: TENANT_ID, role: 'ADMIN' },
        { loader: loader(snapshot({ user: { ...snapshot().user!, isActive: false } })), now: NOW },
      ),
    ).rejects.toMatchObject({ reasonCode: 'USER_INACTIVE' })

    await expect(
      resolveAccessContext(
        { userId: USER_ID, tenantId: TENANT_ID, role: 'ADMIN' },
        { loader: loader(snapshot({ tenant: { id: TENANT_ID, isActive: false } })), now: NOW },
      ),
    ).rejects.toMatchObject({ reasonCode: 'TENANT_INACTIVE' })
  })

  it('derives permission authority only from active non-expired assignments and permissions', async () => {
    const expiredRoleId = '30000000-0000-0000-0000-000000000002'
    const resolved = await resolveAccessContext(
      { userId: USER_ID, tenantId: TENANT_ID, role: 'ADMIN' },
      {
        now: NOW,
        loader: loader(
          snapshot({
            roleAssignments: [
              ...snapshot().roleAssignments,
              {
                id: 'expired-assignment',
                tenantId: TENANT_ID,
                userId: USER_ID,
                accessRoleId: expiredRoleId,
                scopeType: 'TENANT',
                scopeOrgUnitId: null,
                resourceType: null,
                resourceId: null,
                status: 'ACTIVE',
                validFrom: new Date('2026-01-01T00:00:00.000Z'),
                validUntil: new Date('2026-07-20T00:00:00.000Z'),
              },
            ],
            roles: [
              ...snapshot().roles,
              { id: expiredRoleId, tenantId: TENANT_ID, key: 'expired', isActive: true },
            ],
            rolePermissionLinks: [
              ...snapshot().rolePermissionLinks,
              {
                tenantId: TENANT_ID,
                accessRoleId: expiredRoleId,
                permissionId: 'permission-expired',
              },
            ],
            permissions: [
              ...snapshot().permissions,
              { id: 'permission-expired', key: 'payments.collect', isActive: true },
            ],
          }),
        ),
      },
    )

    expect(resolved.legacyRole).toBe('SALES_EMPLOYEE')
    expect([...resolved.permissionKeys]).toEqual(['leads.read'])
    expect(resolved.roleAssignments).toHaveLength(1)
    expect(resolved.orgAssignments).toHaveLength(1)
  })

  it('matches tenant, organization, self, and explicit resource scopes without weakening tenant isolation', () => {
    const tenant = assignment('TENANT')
    const branch = assignment('BRANCH', 'leads.read', { scopeOrgUnitId: 'branch-1' })
    const department = assignment('DEPARTMENT', 'leads.read', { scopeOrgUnitId: 'department-1' })
    const team = assignment('TEAM', 'leads.read', { scopeOrgUnitId: 'team-1' })
    const self = assignment('SELF')
    const resource = assignment('RESOURCE', 'leads.read', {
      resourceType: 'Lead',
      resourceId: 'lead-1',
    })
    const context = contextWith([tenant, branch, department, team, self, resource])

    expect(scopeMatch(context, tenant, { tenantId: TENANT_ID })).toBe(true)
    expect(scopeMatch(context, branch, { tenantId: TENANT_ID, branchId: 'branch-1' })).toBe(true)
    expect(scopeMatch(context, department, { tenantId: TENANT_ID, departmentId: 'department-1' })).toBe(true)
    expect(scopeMatch(context, team, { tenantId: TENANT_ID, teamId: 'team-1' })).toBe(true)
    expect(scopeMatch(context, self, { tenantId: TENANT_ID, assignedUserId: USER_ID })).toBe(true)
    expect(scopeMatch(context, resource, { tenantId: TENANT_ID, resourceType: 'Lead', resourceId: 'lead-1' })).toBe(true)
    expect(scopeMatch(context, tenant, { tenantId: 'other-tenant' })).toBe(false)
    expect(scopeMatch(context, branch, { tenantId: TENANT_ID, branchId: 'branch-2' })).toBe(false)
  })

  it('uses default deny for unknown, missing, cross-tenant, invalid-scope, and mismatched-scope decisions', () => {
    const tenantContext = contextWith([assignment('TENANT')])
    expect(authorize(tenantContext, 'unknown.permission')).toMatchObject({
      allowed: false,
      reasonCode: 'UNKNOWN_PERMISSION',
    })
    expect(authorize(tenantContext, 'payments.collect')).toMatchObject({
      allowed: false,
      reasonCode: 'MISSING_PERMISSION',
    })
    expect(
      authorize(tenantContext, 'leads.read', { tenantId: 'other-tenant' }),
    ).toMatchObject({ allowed: false, reasonCode: 'CROSS_TENANT' })

    const companyOnlyOnBranch = contextWith([
      assignment('BRANCH', 'settings.manage', { scopeOrgUnitId: 'branch-1' }),
    ])
    expect(authorize(companyOnlyOnBranch, 'settings.manage')).toMatchObject({
      allowed: false,
      reasonCode: 'SCOPE_NOT_ALLOWED',
    })

    const branchContext = contextWith([
      assignment('BRANCH', 'leads.read', { scopeOrgUnitId: 'branch-1' }),
    ])
    expect(
      authorize(branchContext, 'leads.read', { tenantId: TENANT_ID, branchId: 'branch-2' }),
    ).toMatchObject({ allowed: false, reasonCode: 'SCOPE_MISMATCH' })
  })

  it('throws a non-sensitive AuthorizationError and returns evidence on allow', () => {
    const context = contextWith([assignment('TENANT')])
    expect(requirePermission(context, 'leads.read')).toMatchObject({
      allowed: true,
      reasonCode: 'ALLOW',
    })
    expect(() => requirePermission(context, 'payments.collect')).toThrow(AuthorizationError)
    try {
      requirePermission(context, 'payments.collect')
    } catch (error) {
      expect(error).toMatchObject({
        message: 'Authorization denied',
        reasonCode: 'MISSING_PERMISSION',
        status: 403,
      })
    }
  })

  it('propagates AccessContext and the verified tenant context together', async () => {
    const result = await runWithResolvedAccessContext(
      { userId: USER_ID, tenantId: TENANT_ID, role: 'READ_ONLY' },
      (context) => ({
        context,
        storedAccess: getAccessContext(),
        storedTenant: getTenantContext(),
      }),
      { loader: loader(snapshot()), now: NOW },
    )

    expect(result.context).toBe(result.storedAccess)
    expect(result.storedTenant).toEqual({ tenantId: TENANT_ID, userId: USER_ID })
  })
})
