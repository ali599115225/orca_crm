import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const migrationPath =
  'prisma/migrations/20260721020000_g3_rbac_constraints_indexes/migration.sql'
const preflightPath = 'scripts/g3-rbac-constraint-preflight.sql'
const validatePath = 'scripts/g3-rbac-constraint-validate.sql'
const rollbackPath = 'scripts/g3-rbac-constraint-rollback.sql'

const migration = readFileSync(migrationPath, 'utf8')
const preflight = readFileSync(preflightPath, 'utf8')
const validate = readFileSync(validatePath, 'utf8')
const rollback = readFileSync(rollbackPath, 'utf8')

const CONSTRAINTS = [
  'fk_org_units_tenant',
  'fk_org_assignments_tenant',
  'fk_access_roles_tenant',
  'fk_access_role_permissions_tenant',
  'fk_role_assignments_tenant',
  'fk_authorization_audits_tenant',
  'fk_org_units_parent_same_tenant',
  'fk_org_assignments_user_same_tenant',
  'fk_org_assignments_unit_same_tenant',
  'fk_org_assignments_creator_same_tenant',
  'fk_access_role_permissions_role_same_tenant',
  'fk_access_role_permissions_permission',
  'fk_role_assignments_user_same_tenant',
  'fk_role_assignments_role_same_tenant',
  'fk_role_assignments_scope_unit_same_tenant',
  'fk_role_assignments_creator_same_tenant',
  'fk_authorization_audits_user_same_tenant',
  'fk_authorization_audits_permission_key',
  'ck_org_units_parent_not_self',
  'ck_org_assignments_valid_window',
  'ck_role_assignments_valid_window',
  'ck_role_assignments_scope_shape',
  'ck_access_permissions_key_format',
  'ck_access_permissions_risk',
  'ck_authorization_audits_reason_source',
] as const

const INDEXES = [
  'uq_users_tenant_id_id',
  'uq_org_units_tenant_id_id',
  'uq_access_roles_tenant_id_id',
  'idx_users_tenant_active_role',
  'idx_org_assignments_active_window',
  'idx_role_assignments_active_window',
  'idx_role_assignments_active_role_scope',
  'idx_authorization_audits_request',
  'idx_authorization_audits_created_brin',
] as const

describe('G3-09 RBAC constraints and indexes', () => {
  it('is a review-only migration ordered after the additive G3-03 expansion', () => {
    expect(migrationPath).toContain('20260721020000')
    expect(migration).toContain('REVIEW-ONLY')
    expect(migration).toContain('not applied to Production')
    expect(migration).toContain('G3-03 expand migration')
    expect(migration).toContain('G3-04 idempotent backfill')
    expect(migration).toContain('g3-rbac-constraint-preflight.sql')
    expect(migration).toContain('g3-rbac-constraint-validate.sql')
  })

  it('creates retry-safe concurrent indexes for identity and active resolution paths', () => {
    for (const indexName of INDEXES) {
      expect(migration).toContain(`"${indexName}"`)
    }
    expect(migration.match(/CREATE (?:UNIQUE )?INDEX CONCURRENTLY IF NOT EXISTS/g))
      .toHaveLength(INDEXES.length)
    expect(migration).toContain('WHERE "status" = \'ACTIVE\'')
    expect(migration).toContain('USING BRIN ("created_at")')
  })

  it('adds same-tenant and shape constraints without validating existing rows inline', () => {
    for (const constraintName of CONSTRAINTS) {
      expect(migration).toContain(`ADD CONSTRAINT "${constraintName}"`)
    }

    const addConstraintStatements =
      migration.match(/ALTER TABLE[\s\S]*?ADD CONSTRAINT[\s\S]*?;/g) ?? []
    expect(addConstraintStatements).toHaveLength(CONSTRAINTS.length)
    for (const statement of addConstraintStatements) {
      expect(statement).toContain('NOT VALID')
    }

    expect(migration).toContain('FOREIGN KEY ("tenant_id", "user_id")')
    expect(migration).toContain('FOREIGN KEY ("tenant_id", "access_role_id")')
    expect(migration).toContain('FOREIGN KEY ("tenant_id", "scope_org_unit_id")')
    expect(migration).toContain('ck_role_assignments_scope_shape')
    expect(migration).toContain('ck_access_permissions_key_format')
  })

  it('contains no data mutation, destructive contraction, inline validation, or explicit table lock', () => {
    expect(migration).not.toMatch(/^\s*UPDATE\s/mi)
    expect(migration).not.toMatch(/^\s*DELETE\s+FROM\s/mi)
    expect(migration).not.toMatch(/^\s*TRUNCATE\s/mi)
    expect(migration).not.toMatch(/^\s*DROP\s+TABLE\s/mi)
    expect(migration).not.toMatch(/DROP\s+COLUMN/i)
    expect(migration).not.toMatch(/ALTER\s+COLUMN[\s\S]*SET\s+NOT\s+NULL/i)
    expect(migration).not.toContain('VALIDATE CONSTRAINT')
    expect(migration).not.toContain('LOCK TABLE')
  })

  it('provides a read-only zero-violation preflight with tenant and scope coverage', () => {
    expect(preflight).toContain('READ ONLY')
    expect(preflight).toContain('total_integrity_violations')
    for (const checkName of [
      'cross_tenant_org_parent',
      'orphan_or_cross_tenant_org_assignment_user',
      'orphan_or_cross_tenant_role_assignment_role',
      'invalid_role_assignment_scope_shape',
      'invalid_permission_key_format',
      'orphan_or_cross_tenant_authorization_audit_user',
    ]) {
      expect(preflight).toContain(checkName)
    }
    expect(preflight).not.toMatch(/^\s*(INSERT|UPDATE|DELETE|TRUNCATE|ALTER|DROP|CREATE)\s/mi)
  })

  it('validates every constraint only in the separate controlled script', () => {
    expect(validate).toContain('zero violations')
    expect(validate).toContain('one constraint per controlled')
    for (const constraintName of CONSTRAINTS) {
      expect(validate).toContain(`VALIDATE CONSTRAINT "${constraintName}"`)
    }
    expect(validate.match(/VALIDATE CONSTRAINT/g)).toHaveLength(CONSTRAINTS.length)
    expect(validate).not.toMatch(/^\s*(INSERT|UPDATE|DELETE|TRUNCATE|DROP|CREATE)\s/mi)
  })

  it('provides a non-destructive rollback for exactly the G3-09 objects', () => {
    for (const constraintName of CONSTRAINTS) {
      expect(rollback).toContain(`DROP CONSTRAINT IF EXISTS "${constraintName}"`)
    }
    for (const indexName of INDEXES) {
      expect(rollback).toContain(`DROP INDEX CONCURRENTLY IF EXISTS "${indexName}"`)
    }
    expect(rollback).not.toMatch(/^\s*(DELETE|UPDATE|TRUNCATE|DROP\s+TABLE)\s/mi)
    expect(rollback).not.toContain('DROP COLUMN')
    expect(rollback).not.toContain('DROP TYPE')
  })
})
