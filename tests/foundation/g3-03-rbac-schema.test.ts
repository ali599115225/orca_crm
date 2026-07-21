import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const root = process.cwd()
const rbacSchema = readFileSync(join(root, 'prisma/rbac.prisma'), 'utf8')
const legacySchema = readFileSync(join(root, 'prisma/schema.prisma'), 'utf8')
const prismaConfig = readFileSync(join(root, 'prisma.config.ts'), 'utf8')
const migration = readFileSync(
  join(
    root,
    'prisma/migrations/20260721010000_g3_rbac_expand/migration.sql',
  ),
  'utf8',
)

describe('G3-03 additive organization and RBAC schema', () => {
  it('enables the generally available multi-file Prisma schema layout', () => {
    expect(prismaConfig).toContain("schema: 'prisma'")
    expect(prismaConfig).toContain("path: 'prisma/migrations'")
  })

  it('defines separate organization, role, permission, assignment, and audit models', () => {
    for (const model of [
      'OrgUnit',
      'OrgAssignment',
      'AccessPermission',
      'AccessRole',
      'AccessRolePermission',
      'RoleAssignment',
      'AuthorizationAudit',
    ]) {
      expect(rbacSchema).toContain(`model ${model} {`)
    }

    for (const enumName of [
      'OrgUnitType',
      'OrgAssignmentStatus',
      'AccessScopeType',
      'RoleAssignmentStatus',
      'AuthorizationMode',
      'AuthorizationDecision',
    ]) {
      expect(rbacSchema).toContain(`enum ${enumName} {`)
    }
  })

  it('keeps organization placement separate from authorization authority', () => {
    const orgAssignment = rbacSchema.slice(
      rbacSchema.indexOf('model OrgAssignment {'),
      rbacSchema.indexOf('model AccessPermission {'),
    )
    const roleAssignment = rbacSchema.slice(
      rbacSchema.indexOf('model RoleAssignment {'),
      rbacSchema.indexOf('model AuthorizationAudit {'),
    )

    expect(orgAssignment).toContain('orgUnitId')
    expect(orgAssignment).not.toContain('accessRoleId')
    expect(roleAssignment).toContain('accessRoleId')
    expect(roleAssignment).toContain('scopeType')
  })

  it('preserves the legacy compatibility anchors during expansion', () => {
    expect(legacySchema).toContain('enum Role {')
    expect(legacySchema).toContain('department                String?')
    expect(legacySchema).toContain('tenantId')
    expect(rbacSchema).not.toContain('companyId')
  })

  it('provides a reviewable additive migration with no destructive statement', () => {
    for (const table of [
      'org_units',
      'org_assignments',
      'access_permissions',
      'access_roles',
      'access_role_permissions',
      'role_assignments',
      'authorization_audits',
    ]) {
      expect(migration).toContain(`CREATE TABLE "${table}"`)
    }

    expect(migration).not.toMatch(/\bDROP\b/i)
    expect(migration).not.toMatch(/\bDELETE\s+FROM\b/i)
    expect(migration).not.toMatch(/\bTRUNCATE\b/i)
    expect(migration).not.toMatch(/\bALTER\s+TABLE\b/i)
    expect(migration).not.toContain('prisma db push')
  })

  it('indexes tenant and assignment lookup paths', () => {
    expect(rbacSchema).toContain('idx_org_assignments_tenant_user_status')
    expect(rbacSchema).toContain('idx_role_assignments_tenant_user_status')
    expect(rbacSchema).toContain('idx_authorization_audits_tenant_permission_created')
    expect(migration).toContain('uq_access_role_permissions_tenant_role_permission')
  })
})
