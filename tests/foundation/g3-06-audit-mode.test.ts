import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  observeLegacyAuthorization,
  type AuthorizationAuditSink,
  type SafeAuthorizationAuditEvent,
} from '../../lib/authz/audit-mode'
import type {
  AccessContext,
  ResolvedRoleAssignment,
} from '../../lib/authz/authorization'
import type { PermissionKey } from '../../lib/authz/permission-registry'

const TENANT_ID = '10000000-0000-0000-0000-000000000001'
const USER_ID = '20000000-0000-0000-0000-000000000001'
const NOW = new Date('2026-07-21T02:00:00.000Z')

function context(permissionKeys: readonly PermissionKey[]): AccessContext {
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

function collectingSink(events: SafeAuthorizationAuditEvent[]): AuthorizationAuditSink {
  return {
    async write(event) {
      events.push(event)
    },
  }
}

const identity = { tenantId: TENANT_ID, userId: USER_ID, role: 'ADMIN' }

describe('G3-06 RBAC audit-only mode', () => {
  it('does not evaluate when audit mode is disabled', async () => {
    const events: SafeAuthorizationAuditEvent[] = []
    const result = await observeLegacyAuthorization(identity, true, {
      permissionKey: 'settings.manage',
      source: 'test:disabled',
      enabled: false,
      sink: collectingSink(events),
      resolver: async () => context(['settings.manage']),
    })

    expect(result).toEqual({ evaluated: false, effectiveAllowed: true, event: null })
    expect(events).toEqual([])
  })

  it('records matching allow decisions without changing the legacy result', async () => {
    const events: SafeAuthorizationAuditEvent[] = []
    const result = await observeLegacyAuthorization(identity, true, {
      permissionKey: 'settings.manage',
      source: 'test:match-allow',
      enabled: true,
      now: NOW,
      sink: collectingSink(events),
      resolver: async () => context(['settings.manage']),
    })

    expect(result.effectiveAllowed).toBe(true)
    expect(result.event).toMatchObject({
      legacyDecision: 'ALLOW',
      newDecision: 'ALLOW',
      wouldAllow: true,
      wouldDeny: false,
      reasonCode: 'ALLOW',
      difference: 'MATCH_ALLOW',
    })
    expect(events).toHaveLength(1)
  })

  it('surfaces legacy-allow versus RBAC-deny without enforcing the shadow denial', async () => {
    const events: SafeAuthorizationAuditEvent[] = []
    const result = await observeLegacyAuthorization(identity, true, {
      permissionKey: 'settings.manage',
      source: 'test:legacy-allow-rbac-deny',
      enabled: true,
      now: NOW,
      sink: collectingSink(events),
      resolver: async () => context([]),
    })

    expect(result.effectiveAllowed).toBe(true)
    expect(result.event).toMatchObject({
      legacyDecision: 'ALLOW',
      newDecision: 'DENY',
      wouldAllow: false,
      wouldDeny: true,
      reasonCode: 'MISSING_PERMISSION',
      difference: 'LEGACY_ALLOW_RBAC_DENY',
    })
  })

  it('surfaces legacy-deny versus RBAC-allow without overriding the legacy denial', async () => {
    const result = await observeLegacyAuthorization(identity, false, {
      permissionKey: 'settings.manage',
      source: 'test:legacy-deny-rbac-allow',
      enabled: true,
      now: NOW,
      sink: collectingSink([]),
      resolver: async () => context(['settings.manage']),
    })

    expect(result.effectiveAllowed).toBe(false)
    expect(result.event).toMatchObject({
      legacyDecision: 'DENY',
      newDecision: 'ALLOW',
      difference: 'LEGACY_DENY_RBAC_ALLOW',
    })
  })

  it('records evaluation errors and still preserves the legacy decision', async () => {
    const events: SafeAuthorizationAuditEvent[] = []
    const result = await observeLegacyAuthorization(identity, true, {
      permissionKey: 'email.send',
      source: 'test:evaluation-error',
      enabled: true,
      now: NOW,
      sink: collectingSink(events),
      resolver: async () => {
        throw new Error('database detail that must not be logged')
      },
    })

    expect(result.effectiveAllowed).toBe(true)
    expect(result.event).toMatchObject({
      newDecision: 'ERROR',
      reasonCode: 'AUDIT_EVALUATION_ERROR',
      difference: 'EVALUATION_ERROR',
    })
    expect(JSON.stringify(result.event)).not.toContain('database detail')
  })

  it('does not let audit sink failure affect the legacy decision', async () => {
    const result = await observeLegacyAuthorization(identity, false, {
      permissionKey: 'whatsapp.send',
      source: 'test:sink-failure',
      enabled: true,
      now: NOW,
      sink: {
        async write() {
          throw new Error('sink unavailable')
        },
      },
      resolver: async () => context(['whatsapp.send']),
    })

    expect(result.evaluated).toBe(true)
    expect(result.effectiveAllowed).toBe(false)
  })

  it('emits only the approved non-sensitive evidence fields', async () => {
    const result = await observeLegacyAuthorization(identity, true, {
      permissionKey: 'email.send',
      source: 'test:safe-fields',
      requestId: 'request-123',
      enabled: true,
      now: NOW,
      sink: collectingSink([]),
      resolver: async () => context(['email.send']),
    })

    expect(Object.keys(result.event ?? {}).sort()).toEqual([
      'difference',
      'evaluatedAt',
      'legacyAllowed',
      'legacyDecision',
      'mode',
      'newDecision',
      'permissionKey',
      'rbacAllowed',
      'reasonCode',
      'requestId',
      'resourceId',
      'resourceType',
      'scopeId',
      'scopeType',
      'source',
      'tenantId',
      'userId',
      'wouldAllow',
      'wouldDeny',
    ])
    expect(result.event).not.toHaveProperty('email')
    expect(result.event).not.toHaveProperty('phone')
    expect(result.event).not.toHaveProperty('token')
    expect(result.event).not.toHaveProperty('payload')
    expect(result.event).not.toHaveProperty('body')
  })

  it('connects audit mode to selected sensitive server boundaries', () => {
    const settings = readFileSync('app/api/v1/settings/route.ts', 'utf8')
    const email = readFileSync('app/actions/email.ts', 'utf8')
    const whatsapp = readFileSync('lib/whatsapp/access.ts', 'utf8')

    expect(settings).toContain('hasDatabaseRoleWithAudit')
    expect(settings).toContain("permissionKey: 'settings.manage'")
    expect(email).toContain('assertServerActionRoleWithAudit')
    expect(email).toContain('permissionKey: "email.send"')
    expect(whatsapp).toContain('observeLegacyAuthorization')
    expect(whatsapp).toContain('permissionKey: "whatsapp.send"')
  })
})
