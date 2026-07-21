import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  configuredEnforcementDomains,
  enforceProgressiveAuthorization,
  type EnforcementDomain,
} from '../../lib/authz/enforcement'
import {
  AuthorizationError,
  type AccessContext,
  type ResolvedRoleAssignment,
} from '../../lib/authz/authorization'
import type { PermissionKey } from '../../lib/authz/permission-registry'

const TENANT_ID = '10000000-0000-0000-0000-000000000001'
const USER_ID = '20000000-0000-0000-0000-000000000001'
const NOW = new Date('2026-07-21T03:00:00.000Z')
const identity = { tenantId: TENANT_ID, userId: USER_ID, role: 'ADMIN' }

function context(
  permissionKeys: readonly PermissionKey[],
  scope: Partial<ResolvedRoleAssignment> = {},
): AccessContext {
  const assignment: ResolvedRoleAssignment = {
    id: 'assignment-1',
    accessRoleId: 'role-1',
    roleKey: 'test-role',
    scopeType: 'TENANT',
    scopeOrgUnitId: null,
    resourceType: null,
    resourceId: null,
    validFrom: new Date('2026-01-01T00:00:00.000Z'),
    validUntil: null,
    permissionKeys: new Set(permissionKeys),
    ...scope,
  }

  return {
    tenantId: TENANT_ID,
    userId: USER_ID,
    tenantActive: true,
    userActive: true,
    legacyRole: 'ADMIN',
    orgAssignments: [],
    roleAssignments: [assignment],
    permissionKeys: assignment.permissionKeys,
    resolvedAt: NOW,
  }
}

function domains(...values: EnforcementDomain[]): ReadonlySet<EnforcementDomain> {
  return new Set(values)
}

describe('G3-07 progressive RBAC enforcement', () => {
  it('requires explicit domain acknowledgement and a separate production approval', () => {
    expect(
      configuredEnforcementDomains({
        G3_RBAC_ENFORCE_DOMAINS: 'finance,messaging',
      } as NodeJS.ProcessEnv),
    ).toEqual(new Set())

    expect(
      configuredEnforcementDomains({
        G3_RBAC_ENFORCEMENT_ACK: 'G3-07-DUAL-ALLOW',
        G3_RBAC_ENFORCE_DOMAINS: 'finance,messaging,unknown',
        NODE_ENV: 'test',
      } as NodeJS.ProcessEnv),
    ).toEqual(new Set(['finance', 'messaging']))

    expect(
      configuredEnforcementDomains({
        G3_RBAC_ENFORCEMENT_ACK: 'G3-07-DUAL-ALLOW',
        G3_RBAC_ENFORCE_DOMAINS: 'finance',
        NODE_ENV: 'production',
      } as NodeJS.ProcessEnv),
    ).toEqual(new Set())

    expect(
      configuredEnforcementDomains({
        G3_RBAC_ENFORCEMENT_ACK: 'G3-07-DUAL-ALLOW',
        G3_RBAC_ENFORCE_DOMAINS: 'finance',
        NODE_ENV: 'production',
        G3_RBAC_PRODUCTION_APPROVAL: 'approved',
      } as NodeJS.ProcessEnv),
    ).toEqual(new Set(['finance']))
  })

  it('preserves the legacy decision when a domain is not enabled', async () => {
    const result = await enforceProgressiveAuthorization(identity, true, {
      domain: 'finance',
      permissionKey: 'accounting.read',
      source: 'test:legacy-mode',
      enforcedDomains: domains(),
      resolver: async () => context([]),
    })

    expect(result).toMatchObject({
      enforced: false,
      legacyAllowed: true,
      rbacAllowed: null,
      effectiveAllowed: true,
      reason: 'LEGACY_MODE',
    })
  })

  it('never converts a legacy denial into an RBAC grant', async () => {
    const result = await enforceProgressiveAuthorization(identity, false, {
      domain: 'messaging',
      permissionKey: 'whatsapp.send',
      source: 'test:legacy-deny',
      enforcedDomains: domains('messaging'),
      resolver: async () => context(['whatsapp.send']),
    })

    expect(result).toMatchObject({
      enforced: true,
      legacyAllowed: false,
      rbacAllowed: null,
      effectiveAllowed: false,
      reason: 'LEGACY_DENY',
    })
  })

  it('allows only when both legacy and RBAC decisions allow', async () => {
    const result = await enforceProgressiveAuthorization(identity, true, {
      domain: 'users-settings',
      permissionKey: 'settings.manage',
      source: 'test:dual-allow',
      enforcedDomains: domains('users-settings'),
      resolver: async () => context(['settings.manage']),
    })

    expect(result).toMatchObject({
      enforced: true,
      legacyAllowed: true,
      rbacAllowed: true,
      effectiveAllowed: true,
      reason: 'DUAL_ALLOW',
      authorizationReasonCode: 'ALLOW',
    })
  })

  it('denies missing permission, cross-tenant resource, and scope mismatch', async () => {
    const missing = await enforceProgressiveAuthorization(identity, true, {
      domain: 'finance',
      permissionKey: 'accounting.read',
      source: 'test:missing-permission',
      enforcedDomains: domains('finance'),
      resolver: async () => context([]),
    })
    expect(missing).toMatchObject({
      effectiveAllowed: false,
      reason: 'RBAC_DENY',
      authorizationReasonCode: 'MISSING_PERMISSION',
    })

    const crossTenant = await enforceProgressiveAuthorization(identity, true, {
      domain: 'sales',
      permissionKey: 'properties.schedule-visit',
      source: 'test:cross-tenant',
      resource: { tenantId: 'other-tenant' },
      enforcedDomains: domains('sales'),
      resolver: async () => context(['properties.schedule-visit']),
    })
    expect(crossTenant).toMatchObject({
      effectiveAllowed: false,
      authorizationReasonCode: 'CROSS_TENANT',
    })

    const wrongBranch = await enforceProgressiveAuthorization(identity, true, {
      domain: 'sales',
      permissionKey: 'properties.schedule-visit',
      source: 'test:wrong-branch',
      resource: { tenantId: TENANT_ID, branchId: 'branch-2' },
      enforcedDomains: domains('sales'),
      resolver: async () =>
        context(['properties.schedule-visit'], {
          scopeType: 'BRANCH',
          scopeOrgUnitId: 'branch-1',
        }),
    })
    expect(wrongBranch).toMatchObject({
      effectiveAllowed: false,
      authorizationReasonCode: 'SCOPE_MISMATCH',
    })
  })

  it.each([
    'USER_INACTIVE',
    'TENANT_INACTIVE',
    'SESSION_INVALID',
    'TENANT_CONTEXT_MISMATCH',
  ] as const)('fails closed on %s while an enforcement domain is enabled', async (reasonCode) => {
    const result = await enforceProgressiveAuthorization(identity, true, {
      domain: 'users-settings',
      permissionKey: 'users.read',
      source: `test:${reasonCode}`,
      enforcedDomains: domains('users-settings'),
      resolver: async () => {
        throw new AuthorizationError(reasonCode)
      },
    })

    expect(result).toMatchObject({
      effectiveAllowed: false,
      reason: 'RBAC_ERROR',
      authorizationReasonCode: reasonCode,
    })
  })

  it('fails closed for an expired assignment represented by an empty resolved authority set', async () => {
    const result = await enforceProgressiveAuthorization(identity, true, {
      domain: 'messaging',
      permissionKey: 'whatsapp.send',
      source: 'test:expired-assignment',
      enforcedDomains: domains('messaging'),
      resolver: async () => context([]),
    })

    expect(result).toMatchObject({
      effectiveAllowed: false,
      reason: 'RBAC_DENY',
      authorizationReasonCode: 'MISSING_PERMISSION',
    })
  })

  it('connects progressive enforcement to every priority domain boundary', () => {
    const users = readFileSync('app/actions/users.ts', 'utf8')
    const settings = readFileSync('app/api/v1/settings/route.ts', 'utf8')
    const finance = readFileSync('app/api/v1/accounting/general-ledger/route.ts', 'utf8')
    const whatsapp = readFileSync('lib/whatsapp/access.ts', 'utf8')
    const propertyVisit = readFileSync(
      'app/api/properties/[id]/schedule-visit/route.ts',
      'utf8',
    )

    expect(users).toContain('domain: "users-settings"')
    expect(settings).toContain("domain: 'users-settings'")
    expect(finance).toContain("domain: 'finance'")
    expect(whatsapp).toContain('domain: "messaging"')
    expect(propertyVisit).toContain("domain: 'sales'")

    for (const source of [finance, propertyVisit]) {
      expect(source).toContain('status: 403')
      expect(source).toContain('isEnforcementDomainEnabled')
    }
  })
})
