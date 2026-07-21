import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  PERMISSION_BY_KEY,
  PERMISSION_REGISTRY,
} from '../../lib/authz/permission-registry'
import {
  ACCESS_ROLE_BLUEPRINTS,
  ACCESS_ROLE_KEYS,
  DEFAULT_BRANCH_CODE,
  DEFAULT_DEPARTMENT_CODE,
  LEGACY_ROLE_TO_ACCESS_ROLE,
  accessRoleKeyForLegacyRole,
} from '../../lib/authz/backfill-plan'

const script = readFileSync('scripts/g3-rbac-backfill.ts', 'utf8')

describe('G3-04 seed and backfill contract', () => {
  it('defines stable default organization anchors and one role for every legacy role', () => {
    expect(DEFAULT_BRANCH_CODE).toBe('default-branch')
    expect(DEFAULT_DEPARTMENT_CODE).toBe('default-department')
    expect(Object.keys(LEGACY_ROLE_TO_ACCESS_ROLE).sort()).toEqual([
      'ADMIN',
      'MARKETING',
      'READ_ONLY',
      'SALES_EMPLOYEE',
      'SALES_MANAGER',
    ])
    expect(new Set(Object.values(LEGACY_ROLE_TO_ACCESS_ROLE))).toEqual(
      new Set(ACCESS_ROLE_KEYS),
    )
    expect(accessRoleKeyForLegacyRole('ADMIN')).toBe('admin')
    expect(() => accessRoleKeyForLegacyRole('UNKNOWN')).toThrow(/Unsupported legacy role/)
  })

  it('defines unique roles and only registered permission mappings', () => {
    expect(ACCESS_ROLE_BLUEPRINTS.map(({ key }) => key)).toEqual(ACCESS_ROLE_KEYS)
    expect(new Set(ACCESS_ROLE_BLUEPRINTS.map(({ key }) => key)).size).toBe(
      ACCESS_ROLE_BLUEPRINTS.length,
    )

    for (const role of ACCESS_ROLE_BLUEPRINTS) {
      expect(role.permissionKeys.length).toBeGreaterThan(0)
      expect(new Set(role.permissionKeys).size).toBe(role.permissionKeys.length)
      for (const key of role.permissionKeys) {
        expect(PERMISSION_BY_KEY[key]).toBeDefined()
      }
    }
  })

  it('keeps administrator complete and lower roles least-privileged', () => {
    const byKey = Object.fromEntries(
      ACCESS_ROLE_BLUEPRINTS.map((role) => [role.key, role]),
    )

    expect(new Set(byKey.admin.permissionKeys)).toEqual(
      new Set(PERMISSION_REGISTRY.map(({ key }) => key)),
    )

    for (const key of byKey['read-only'].permissionKeys) {
      expect(PERMISSION_BY_KEY[key].risk).toBe('READ')
    }

    for (const key of byKey['sales-employee'].permissionKeys) {
      expect(['READ', 'WRITE']).toContain(PERMISSION_BY_KEY[key].risk)
    }
    expect(byKey['sales-employee'].permissionKeys).not.toContain('access.manage')
    expect(byKey['sales-employee'].permissionKeys).not.toContain('payments.refund')
    expect(byKey.marketing.permissionKeys).not.toContain('integrations.manage')
  })

  it('defaults to dry-run and requires an isolated double opt-in for writes', () => {
    expect(script).toContain("const apply = args.includes('--apply')")
    expect(script).toContain("mode: apply ? 'APPLY_ISOLATED_TEST' : 'DRY_RUN'")
    expect(script).toContain("process.env.G3_BACKFILL_TARGET !== 'isolated-test'")
    expect(script).toContain("process.env.ALLOW_G3_BACKFILL_WRITE !== 'true'")
    expect(script).toContain("process.env.VERCEL_ENV === 'production'")
    expect(script).toContain('G3 backfill writes are forbidden in Production')
  })

  it('is idempotent, batch-safe, and records count evidence without sensitive payloads', () => {
    expect(script).toContain('accessPermission.upsert')
    expect(script).toContain('orgUnit.upsert')
    expect(script).toContain('accessRole.upsert')
    expect(script).toContain('skipDuplicates: true')
    expect(script).toContain("startsWith('--batch-size=')")
    expect(script).toContain('snapshotTenant')
    expect(script).toContain('permissionSummary')
    expect(script).toContain('containsSensitivePayloads: false')
    expect(script).not.toMatch(/deleteMany|truncate|DROP TABLE/i)
  })
})
