import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATION_PATH = join(
  process.cwd(),
  "prisma",
  "migrations",
  "20260726043000_exec_004_organization_authority",
  "migration.sql",
);
const migration = readFileSync(MIGRATION_PATH, "utf8");
const executableSql = migration
  .replace(/--.*$/gm, "")
  .replace(/\/\*[\s\S]*?\*\//g, "");

const REQUIRED_TABLES = [
  "organization_branches",
  "organization_departments",
  "organization_teams",
  "branch_services",
  "user_scope_assignments",
  "organization_authority_audit",
] as const;

const TENANT_SCOPE_TRIGGERS = [
  "organization_departments_tenant_scope",
  "organization_teams_tenant_scope",
  "branch_services_tenant_scope",
  "user_scope_assignments_tenant_scope",
  "organization_authority_audit_tenant_scope",
] as const;

describe("EXEC-004 additive organization schema contract", () => {
  it.each(REQUIRED_TABLES)("creates %s", (table) => {
    expect(migration).toContain(`CREATE TABLE \"${table}\"`);
  });

  it("retains Tenant as the singleton security partition", () => {
    for (const table of REQUIRED_TABLES) {
      expect(migration).toMatch(
        new RegExp(
          `CREATE TABLE \\\"${table}\\\"[\\s\\S]*?\\\"tenant_id\\\" UUID NOT NULL`,
        ),
      );
    }
    expect(migration).toContain('REFERENCES "tenants"("id")');
  });

  it("binds branch, department and team hierarchy with restrictive foreign keys", () => {
    expect(migration).toContain(
      'REFERENCES "organization_branches"("id")\n    ON DELETE RESTRICT',
    );
    expect(migration).toContain(
      'REFERENCES "organization_departments"("id")\n    ON DELETE RESTRICT',
    );
    expect(migration).toContain(
      'REFERENCES "organization_teams"("id")\n    ON DELETE RESTRICT',
    );
  });

  it("requires central departments to have no branch and branch departments to have one", () => {
    expect(migration).toContain(
      '("is_central" = TRUE AND "branch_id" IS NULL) OR\n    ("is_central" = FALSE AND "branch_id" IS NOT NULL)',
    );
  });

  it("enforces one central branch per tenant", () => {
    expect(migration).toContain(
      'CREATE UNIQUE INDEX "organization_branches_one_central_per_tenant"',
    );
    expect(migration).toContain('WHERE "is_central" = TRUE');
  });

  it("enforces the approved security roles and scope types", () => {
    expect(migration).toContain("'PLATFORM_OWNER'");
    expect(migration).toContain("'SYSTEM_ADMINISTRATOR'");
    expect(migration).toContain("'FINANCE_MANAGER'");
    expect(migration).toContain("'ASSIGNED_RESOURCE'");
    expect(migration).toContain(
      'CONSTRAINT "user_scope_assignments_scope_shape_check"',
    );
    expect(migration).toContain(
      'CONSTRAINT "user_scope_assignments_no_self_grant"',
    );
    expect(migration).toContain("security role scope mismatch");
  });

  it("supports all approved modular service lines", () => {
    for (const service of [
      "BROKERAGE",
      "MARKETING",
      "SALES",
      "LEASING",
      "PROPERTY_MANAGEMENT",
      "FACILITY_MANAGEMENT",
      "MAINTENANCE",
      "CUSTOMER_SERVICE",
      "FINANCE_AND_COLLECTION",
      "DOCUMENTS",
      "REPORTING",
    ]) {
      expect(migration).toContain(`'${service}'`);
    }
  });

  it.each(TENANT_SCOPE_TRIGGERS)("creates tenant-scope trigger %s", (trigger) => {
    expect(migration).toContain(`CREATE TRIGGER \"${trigger}\"`);
  });

  it("rejects cross-tenant users, managers, branches, departments and teams", () => {
    for (const message of [
      "organization department branch tenant mismatch",
      "organization team department tenant mismatch",
      "branch service manager tenant mismatch",
      "assignment user tenant mismatch",
      "assignment actor tenant mismatch",
      "assignment department hierarchy mismatch",
      "assignment team hierarchy mismatch",
      "authority audit actor tenant mismatch",
    ]) {
      expect(migration).toContain(message);
    }
  });

  it("makes organization authority audit append-only", () => {
    expect(migration).toContain(
      'CREATE TRIGGER "organization_authority_audit_append_only"',
    );
    expect(migration).toContain(
      'BEFORE UPDATE OR DELETE ON "organization_authority_audit"',
    );
    expect(migration).toContain(
      "RAISE EXCEPTION 'organization_authority_audit is append-only'",
    );
  });

  it("contains no data backfill or mutation of existing business records", () => {
    expect(executableSql).not.toMatch(
      /\bINSERT\s+INTO\s+"?(users|tenants|leads|projects|units|contracts)"?/i,
    );
    expect(executableSql).not.toMatch(
      /\bUPDATE\s+"?(users|tenants|leads|projects|units|contracts)"?/i,
    );
    expect(executableSql).not.toMatch(
      /\bDELETE\s+FROM\s+"?(users|tenants|leads|projects|units|contracts)"?/i,
    );
    expect(executableSql).not.toMatch(
      /\bALTER\s+TABLE\s+"?(users|tenants|leads|projects|units|contracts)"?/i,
    );
  });

  it("does not execute or reference live database credentials", () => {
    expect(executableSql).not.toMatch(
      /DATABASE_URL|DIRECT_URL|ORCA_LICENSE|neon\.tech/i,
    );
  });
});
