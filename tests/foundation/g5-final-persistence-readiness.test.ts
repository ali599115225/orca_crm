import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8").replace(/\r\n/g, "\n");

const MIGRATION_DIR = "prisma/migrations/20260923_final_architecture_persistence_readiness";
const MIGRATION = `${MIGRATION_DIR}/migration.sql`;
const PREFLIGHT = "prisma/migration-readiness/ORCA_FINAL_ARCHITECTURE/preflight.sql";
const ROLLBACK = "prisma/migration-readiness/ORCA_FINAL_ARCHITECTURE/rollback.sql";

const prismaFiles = readdirSync(resolve(root, "prisma"))
  .filter((name) => name.endsWith(".prisma"))
  .map((name) => read(`prisma/${name}`));
const allSchema = prismaFiles.join("\n");
const schema = read("prisma/schema.prisma");
const w1 = read("prisma/w1-contract-finance.prisma");
const rbac = read("prisma/rbac.prisma");
const migration = read(MIGRATION);

function modelBlock(source: string, model: string): string {
  const match = source.match(new RegExp(`model ${model} \\{[\\s\\S]*?\\n\\}`));
  if (!match) throw new Error(`model ${model} not found`);
  return match[0];
}

describe("Batch 05 — final persistence readiness", () => {
  it("has exactly one snapshot model (no competing signed snapshot model)", () => {
    const snapshotModels = allSchema.match(/^model \w*(Contract|Signed)\w*Snapshot\w* \{/gm) || [];
    expect(snapshotModels).toEqual(["model ContractSnapshot {"]);
    expect(allSchema).not.toMatch(/OperationalSignedContractSnapshot/);
  });

  it("extends ContractSnapshot with a tenant-bound contract relation and signed identity", () => {
    const block = modelBlock(w1, "ContractSnapshot");
    expect(block).toMatch(/draftId\s+String\?/);
    expect(block).toMatch(/templateVersionId\s+String\?/);
    expect(block).toMatch(/contractVersion\s+Int\?/);
    expect(block).toMatch(/signatureEvidenceHash\s+String\?.*@db\.VarChar\(64\)/);
    expect(block).toMatch(/contract\s+Contract\?\s+@relation\(fields: \[tenantId, contractId\], references: \[tenantId, id\]/);
    expect(block).toContain("@@unique([tenantId, contractId, snapshotType, contractVersion]");
  });

  it("enforces SIGNED_OPERATIONAL identity and legacy draft/template requirement by CHECK", () => {
    expect(migration).toContain('"contract_snapshots_signed_operational_identity_ck"');
    expect(migration).toMatch(/"snapshot_type" = 'SIGNED_OPERATIONAL'\s+AND "contract_id" IS NOT NULL\s+AND "contract_version" IS NOT NULL\s+AND "signed_at" IS NOT NULL\s+AND "signature_evidence_hash" IS NOT NULL/);
    expect(migration).toMatch(/"snapshot_type" <> 'SIGNED_OPERATIONAL'\s+AND "draft_id" IS NOT NULL\s+AND "template_version_id" IS NOT NULL/);
  });

  it("associates Document with Contract through a tenant-bound relation", () => {
    const document = modelBlock(schema, "Document");
    expect(document).toMatch(/contractId\s+String\?\s+@map\("contract_id"\)/);
    expect(document).toMatch(/contract\s+Contract\?\s+@relation\(fields: \[tenantId, contractId\], references: \[tenantId, id\]/);
    expect(modelBlock(schema, "Contract")).toContain('@@unique([tenantId, id], map: "uq_contracts_tenant_id")');
    expect(migration).toContain('ALTER TABLE "documents" ADD COLUMN "contract_id" UUID;');
    expect(migration).toContain('FOREIGN KEY ("tenant_id", "contract_id") REFERENCES "contracts"("tenant_id", "id")');
  });

  it("defines ContractDelivery with tenant-bound relations and no provider/outbox coupling", () => {
    const delivery = modelBlock(w1, "ContractDelivery");
    for (const field of [
      "id", "tenantId", "contractId", "documentId", "snapshotId", "recipient", "channel",
      "provider", "providerReference", "status", "errorMessage", "sentAt", "failedAt",
      "createdAt", "updatedAt",
    ]) {
      expect(delivery).toMatch(new RegExp(`\\n  ${field}\\s`));
    }
    expect(delivery).toMatch(/contract\s+Contract\s+@relation\(fields: \[tenantId, contractId\]/);
    expect(delivery).toMatch(/document\s+Document\?\s+@relation\(fields: \[tenantId, documentId\]/);
    expect(delivery).toMatch(/snapshot\s+ContractSnapshot\?\s+@relation\(fields: \[tenantId, snapshotId\]/);
    expect(delivery).not.toMatch(/GovernmentOutbox|EmailMessage|WhatsApp|AuditLog/);
    expect(migration).toContain('CREATE TABLE "contract_deliveries"');
  });

  it("does not use GovernmentOutbox or AuditLog as a delivery ledger", () => {
    expect(migration).not.toMatch(/government_outbox|GovernmentOutbox/i);
    expect(migration).not.toMatch(/audit_logs/);
    const sources = [
      "lib/domain/transaction-spine/sign-contract.ts",
      "lib/domain/transaction-spine/signed-contract-snapshot.ts",
      "app/api/v1/contracts/[id]/pdf/route.ts",
    ].map(read).join("\n");
    expect(sources).not.toMatch(/governmentOutbox|GovernmentOutbox/);
    expect(sources).not.toMatch(/auditLog[\s\S]{0,80}DELIVER/i);
    expect(read("app/api/v1/contracts/[id]/pdf/route.ts")).not.toMatch(/auditLog/);
  });

  it("creates every G3 table from rbac.prisma with its enums and mapped indexes", () => {
    const tables = [...rbac.matchAll(/@@map\("(\w+)"\)/g)].map((m) => m[1]);
    for (const table of [
      "org_units", "org_assignments", "access_permissions", "access_roles",
      "access_role_permissions", "role_assignments", "authorization_audits",
    ]) {
      expect(tables).toContain(table);
      expect(migration).toContain(`CREATE TABLE "${table}"`);
    }
    for (const enumName of [
      "org_unit_type", "org_assignment_status", "access_scope_type",
      "role_assignment_status", "authorization_mode", "authorization_decision",
    ]) {
      expect(migration).toContain(`CREATE TYPE "${enumName}" AS ENUM`);
    }
    const indexNames = [...rbac.matchAll(/map: "((?:uq|idx)_\w+)"/g)].map((m) => m[1]);
    expect(indexNames.length).toBeGreaterThan(0);
    for (const name of indexNames) {
      expect(migration).toContain(`"${name}"`);
    }
  });

  it("is a single migration artifact that does not apply to a database", () => {
    const dirs = readdirSync(resolve(root, "prisma/migrations")).filter((name) =>
      name.startsWith("20260923"),
    );
    expect(dirs).toEqual(["20260923_final_architecture_persistence_readiness"]);
    expect(migration).not.toMatch(/\b(INSERT INTO|UPDATE\s+"\w+"\s+SET|DELETE FROM)\b/);
    expect(migration).not.toMatch(/GovernmentOutbox|government_outbox/i);
  });

  it("ships a read-only preflight and a scoped rollback artifact", () => {
    expect(existsSync(resolve(root, PREFLIGHT))).toBe(true);
    expect(existsSync(resolve(root, ROLLBACK))).toBe(true);
    const preflight = read(PREFLIGHT);
    expect(preflight).toContain("BEGIN TRANSACTION READ ONLY;");
    expect(preflight).not.toMatch(/\b(INSERT|UPDATE|DELETE|ALTER|CREATE|DROP)\s+(INTO|TABLE|INDEX|TYPE|FROM|"\w+")/);
    const rollback = read(ROLLBACK);
    expect(rollback).not.toMatch(/DROP TABLE (IF EXISTS )?"(contracts|documents|contract_snapshots|contract_drafts|contract_template_versions)"/);
    expect(rollback).toContain("ROLLBACK_BLOCKED");
    expect(rollback).toMatch(/WARNING: draft_id \/ template_version_id NOT NULL/);
  });
});

const G3_TABLES = [
  "org_units", "org_assignments", "access_permissions", "access_roles",
  "access_role_permissions", "role_assignments", "authorization_audits",
];
const G3_ENUMS = [
  "org_unit_type", "org_assignment_status", "access_scope_type",
  "role_assignment_status", "authorization_mode", "authorization_decision",
];
const PROVENANCE_MARKER = "ORCA_G3_PROVENANCE:20260923_final_architecture_persistence_readiness";

describe("G3 reconciliation v2 — structural compatibility + rollback provenance", () => {
  it("1. G3 absent -> creation path is preserved, unconditionally executing the canonical DDL", () => {
    const zeroBranchAt = migration.indexOf("g3_existing_count = 0 THEN");
    expect(zeroBranchAt).toBeGreaterThan(-1);
    const elseAt = migration.indexOf("G3_RECONCILIATION_BLOCKED: partial G3 installation");
    expect(elseAt).toBeGreaterThan(zeroBranchAt);
    for (const table of G3_TABLES) {
      const at = migration.indexOf(`CREATE TABLE "${table}"`);
      expect(at).toBeGreaterThan(zeroBranchAt);
      expect(at).toBeLessThan(elseAt);
    }
    for (const enumName of G3_ENUMS) {
      const at = migration.indexOf(`CREATE TYPE "${enumName}" AS ENUM`);
      expect(at).toBeGreaterThan(zeroBranchAt);
      expect(at).toBeLessThan(elseAt);
    }
  });

  it("2. G3 full + structurally compatible -> skip (no CREATE/ALTER/DROP on any G3 object)", () => {
    expect(migration).toContain("column_mismatch_count");
    expect(migration).toContain("enum_mismatch_count");
    expect(migration).toContain("index_mismatch_count");
    expect(migration).toContain("default_mismatch_count");
    expect(migration).toMatch(
      /IF column_mismatch_count = 0 AND enum_mismatch_count = 0 AND index_mismatch_count = 0 AND default_mismatch_count = 0 THEN\s+RAISE NOTICE 'G3_RECONCILIATION: all % canonical G3 objects present and structurally compatible/,
    );
  });

  it("3. G3 partial -> blocked with G3_RECONCILIATION_BLOCKED (migration) and PREFLIGHT_FAIL (preflight)", () => {
    expect(migration).toMatch(
      /RAISE EXCEPTION 'G3_RECONCILIATION_BLOCKED: partial G3 installation detected/,
    );
    const preflight = read(PREFLIGHT);
    expect(preflight).toMatch(/PREFLIGHT_FAIL partial G3 table installation/);
    expect(preflight).toMatch(/PREFLIGHT_FAIL partial G3 enum installation/);
  });

  it("4. G3 full but structurally incompatible -> blocked in both migration and preflight", () => {
    expect(migration).toMatch(
      /RAISE EXCEPTION 'G3_RECONCILIATION_BLOCKED: G3 fully present but structurally incompatible with prisma\/rbac\.prisma/,
    );
    const preflight = read(PREFLIGHT);
    expect(preflight).toMatch(
      /RAISE EXCEPTION 'PREFLIGHT_FAIL G3 fully present but structurally incompatible with prisma\/rbac\.prisma/,
    );
    // The skip-vs-block decision must be gated by the same four mismatch
    // counters preflight and migration each compute independently.
    expect(preflight).toContain("column_mismatch_count");
    expect(preflight).toContain("enum_mismatch_count");
    expect(preflight).toContain("index_mismatch_count");
    expect(preflight).toContain("default_mismatch_count");
  });

  it("writes a deterministic provenance marker only when G3 is created from a zero state, never in the skip branch", () => {
    const zeroBranchAt = migration.indexOf("g3_existing_count = 0 THEN");
    const skipBranchAt = migration.indexOf("g3_existing_count = g3_total_count THEN");
    const elseAt = migration.indexOf("G3_RECONCILIATION_BLOCKED: partial G3 installation");
    const markerAt = migration.indexOf(`COMMENT ON TABLE "org_units" IS '${PROVENANCE_MARKER}'`);
    expect(markerAt).toBeGreaterThan(zeroBranchAt);
    expect(markerAt).toBeLessThan(elseAt);
    // Exactly one COMMENT ON in the whole migration — never written in the skip branch.
    const commentCount = (migration.match(/COMMENT ON TABLE "org_units"/g) || []).length;
    expect(commentCount).toBe(1);
    expect(markerAt).toBeGreaterThan(skipBranchAt); // skip branch text appears before the whole ELSIF
  });

  it("5. rollback preserves preexisting G3 when the provenance marker is absent", () => {
    const rollback = read(ROLLBACK);
    expect(rollback).toContain(PROVENANCE_MARKER);
    expect(rollback).toContain("g3_created_by_this_migration");
    expect(rollback).toMatch(
      /ELSE\s+RAISE NOTICE 'ROLLBACK: no ORCA_G3_PROVENANCE marker on org_units[\s\S]*?preserving all G3 objects/,
    );
    // The G3 drops must live inside the conditional EXECUTE, not as bare
    // top-level statements any more.
    const ifTrueAt = rollback.indexOf("IF g3_created_by_this_migration THEN");
    const dropOrgUnitsAt = rollback.indexOf('DROP TABLE IF EXISTS "org_units"');
    expect(ifTrueAt).toBeGreaterThan(-1);
    expect(dropOrgUnitsAt).toBeGreaterThan(ifTrueAt);
  });

  it("6. rollback removes migration-created G3 (all 7 tables + 6 enum types) when the provenance marker exists", () => {
    const rollback = read(ROLLBACK);
    const ifTrueAt = rollback.indexOf("IF g3_created_by_this_migration THEN");
    const elseAt = rollback.indexOf("ELSE", ifTrueAt);
    expect(ifTrueAt).toBeGreaterThan(-1);
    expect(elseAt).toBeGreaterThan(ifTrueAt);
    for (const table of G3_TABLES) {
      const at = rollback.indexOf(`DROP TABLE IF EXISTS "${table}"`);
      expect(at).toBeGreaterThan(ifTrueAt);
      expect(at).toBeLessThan(elseAt);
    }
    for (const enumName of G3_ENUMS) {
      const at = rollback.indexOf(`DROP TYPE IF EXISTS "${enumName}"`);
      expect(at).toBeGreaterThan(ifTrueAt);
      expect(at).toBeLessThan(elseAt);
    }
  });

  it("7. contract persistence DDL is unchanged and remains unconditional (outside the G3 reconciliation gate)", () => {
    const g3BlockEndAt = migration.indexOf("$g3_reconcile$;");
    expect(g3BlockEndAt).toBeGreaterThan(-1);
    for (const needle of [
      'CREATE UNIQUE INDEX "uq_contracts_tenant_id" ON "contracts" ("tenant_id", "id");',
      'ALTER TABLE "documents" ADD COLUMN "contract_id" UUID;',
      '"contract_snapshots_signed_operational_identity_ck"',
      'CREATE TABLE "contract_deliveries" (',
    ]) {
      const at = migration.indexOf(needle);
      expect(at).toBeGreaterThan(g3BlockEndAt);
    }

    const rollback = read(ROLLBACK);
    const g3RollbackStartAt = rollback.indexOf("DO $g3_rollback$");
    expect(g3RollbackStartAt).toBeGreaterThan(-1);
    for (const needle of [
      'DROP TABLE IF EXISTS "contract_deliveries";',
      'ALTER TABLE "contract_snapshots" DROP CONSTRAINT IF EXISTS "contract_snapshots_tenant_id_contract_id_fkey";',
      'ALTER TABLE "documents" DROP CONSTRAINT IF EXISTS "documents_tenant_id_contract_id_fkey";',
      'DROP INDEX IF EXISTS "uq_contracts_tenant_id";',
    ]) {
      const at = rollback.indexOf(needle);
      expect(at).toBeGreaterThan(-1);
      expect(at).toBeLessThan(g3RollbackStartAt);
    }
  });
});

describe("G3 reconciliation v3 — catalog-backed semantic defaults + structural index/constraint gate", () => {
  const DEFAULT_CTE =
    "expected_defaults(table_name, column_name, semantic_kind, expected_value, expected_type)";
  const INDEX_CTE =
    "expected_indexes(index_name, table_name, expected_unique, expected_primary, expected_columns, expected_contype)";

  const defaultRows = (source: string) => {
    const match = source.match(
      /WITH expected_defaults\(table_name, column_name, semantic_kind, expected_value, expected_type\) AS \(\s*VALUES([\s\S]*?)\n\s*\),\s*actual_defaults AS/,
    );
    expect(match).not.toBeNull();
    return match![1].match(/^\s*\('[^\n]+\),?$/gm) ?? [];
  };

  it("1. the canonical default ledger is complete: 28 defaults = 7 UUID + 5 boolean + 2 enum + 14 transaction timestamps", () => {
    for (const source of [migration, read(PREFLIGHT)]) {
      expect(source).toContain(DEFAULT_CTE);
      const rows = defaultRows(source);
      expect(rows).toHaveLength(28);
      expect(rows.filter((row) => row.includes("'uuid_generator'"))).toHaveLength(7);
      expect(rows.filter((row) => row.includes("'boolean_constant'"))).toHaveLength(5);
      expect(rows.filter((row) => row.includes("'enum_constant'"))).toHaveLength(2);
      expect(rows.filter((row) => row.includes("'transaction_timestamp'"))).toHaveLength(14);

      expect(source).toContain("('org_assignments','status','enum_constant','ACTIVE','org_assignment_status')");
      expect(source).toContain("('role_assignments','status','enum_constant','ACTIVE','role_assignment_status')");
      expect(source).toContain("('authorization_audits','created_at','transaction_timestamp',NULL,'timestamp with time zone')");
    }
  });

  it("2. UUID defaults resolve the reconstructed zero-argument function to the canonical pg_proc OID, without pg_depend", () => {
    for (const source of [migration, read(PREFLIGHT)]) {
      expect(source).toContain("to_regprocedure('pg_catalog.gen_random_uuid()')::oid");
      expect(source).toContain("AS resolved_zero_arg_proc_oid");
      expect(source).toMatch(
        /WHEN 'uuid_generator' THEN NOT \(\s*a\.resolved_zero_arg_proc_oid = to_regprocedure\('pg_catalog\.gen_random_uuid\(\)'\)::oid\s*\)/,
      );
      expect(source).not.toContain("'pg_depend'::regclass");
      expect(source).not.toContain("AS depends_gen_random_uuid");
      expect(source).not.toContain("expected_exact_defaults");
      expect(source).not.toMatch(/actual_default IS DISTINCT FROM regexp_replace\(trim\(both from e\.expected_default\)/);
    }
  });

  it("3. boolean and enum constants use only canonical simple literal/specialized-cast forms", () => {
    for (const source of [migration, read(PREFLIGHT)]) {
      expect(source).toMatch(
        /WHEN 'boolean_constant' THEN NOT \(\s*lower\(regexp_replace\(a\.actual_default, '\\s\+', '', 'g'\)\) = e\.expected_value/,
      );
      expect(source).toMatch(
        /WHEN 'enum_constant' THEN NOT \([\s\S]*?format\('%L::%I', e\.expected_value, e\.expected_type\)[\s\S]*?format\('%L::public\.%I', e\.expected_value, e\.expected_type\)/,
      );
      expect(source).toContain("('org_units','is_active','boolean_constant','true','boolean')");
      expect(source).toContain("('org_assignments','is_primary','boolean_constant','false','boolean')");
      expect(source).not.toContain("operator_dependency_count");
      expect(source).not.toContain("proc_dependency_count");
    }
  });

  it("4. transaction-start defaults resolve now()/transaction_timestamp() by OID and also accept CURRENT_TIMESTAMP", () => {
    for (const source of [migration, read(PREFLIGHT)]) {
      expect(source).toContain("to_regprocedure('pg_catalog.now()')::oid");
      expect(source).toContain("to_regprocedure('pg_catalog.transaction_timestamp()')::oid");
      expect(source).toContain("a.resolved_zero_arg_proc_oid IN (");
      expect(source).toMatch(
        /WHEN 'transaction_timestamp' THEN NOT \([\s\S]*?a\.resolved_zero_arg_proc_oid IN \([\s\S]*?to_regprocedure\('pg_catalog\.now\(\)'\)::oid,[\s\S]*?to_regprocedure\('pg_catalog\.transaction_timestamp\(\)'\)::oid[\s\S]*?OR upper\(regexp_replace\(a\.actual_default, '\\s\+', '', 'g'\)\) = 'CURRENT_TIMESTAMP'/,
      );
      expect(source).not.toContain("clock_timestamp()");
      expect(source).not.toContain("statement_timestamp()");
      expect(source).not.toContain("'pg_depend'::regclass");
    }

    const w1Foundation = read(
      "prisma/migrations/20260815001500_w1_contract_finance_foundation/migration.sql",
    );
    expect(w1Foundation).toContain("transaction_timestamp()");
  });

  it("5. correctly named index with wrong columns/order, predicate, or expression is blocked", () => {
    for (const source of [migration, read(PREFLIGHT)]) {
      expect(source).toContain(INDEX_CTE);
      expect(source).toContain("unnest(i.indkey::int2[]) WITH ORDINALITY AS k(attnum, ord)");
      expect(source).toContain("string_agg(att.attname, ',' ORDER BY k.ord)");
      expect(source).toContain("('uq_org_units_tenant_code','org_units',true,false,'tenant_id,code',NULL)");
      expect(source).toContain(
        "('idx_authorization_audits_tenant_permission_created','authorization_audits',false,false,'tenant_id,permission_key,created_at',NULL)",
      );
      expect(source).toMatch(/OR a\.actual_columns IS DISTINCT FROM e\.expected_columns/);
      expect(source).toMatch(/OR a\.has_predicate IS TRUE\s+OR a\.has_expression IS TRUE/);
    }
  });

  it("6. pg_constraint.conindid/contype distinguishes PK constraints from canonical bare unique indexes", () => {
    for (const source of [migration, read(PREFLIGHT)]) {
      expect(source).toContain(
        "(SELECT con.contype FROM pg_constraint con WHERE con.conindid = ic.oid) AS actual_contype",
      );
      expect(source).toMatch(/OR a\.actual_contype IS DISTINCT FROM e\.expected_contype/);
      expect(source).toContain("('org_units_pkey','org_units',true,true,'id','p')");
      expect(source).toContain("('authorization_audits_pkey','authorization_audits',true,true,'id','p')");
      expect(source).toContain("('uq_org_units_tenant_code','org_units',true,false,'tenant_id,code',NULL)");
      expect(source).toContain("('access_permissions_key_key','access_permissions',true,false,'key',NULL)");
    }

    expect(migration).toMatch(/CREATE UNIQUE INDEX "uq_org_units_tenant_code" ON "org_units"/);
    expect(migration).toMatch(/CONSTRAINT "org_units_pkey" PRIMARY KEY \("id"\)/);
    const ddlOnly = migration
      .split(/EXECUTE \$ddl\$/)
      .slice(1)
      .map((chunk) => chunk.split("$ddl$;")[0])
      .join("\n");
    expect(ddlOnly).not.toMatch(/ADD CONSTRAINT[^;]*\bUNIQUE\b/);
  });

  it("7. PARTIAL_G3_BLOCK — neither zero nor the full 13 canonical objects can continue", () => {
    expect(migration).toMatch(/g3_existing_count = g3_total_count THEN/);
    expect(migration).toMatch(/ELSIF g3_existing_count = 0 THEN/);
    expect(migration).toMatch(
      /ELSE\s+RAISE EXCEPTION 'G3_RECONCILIATION_BLOCKED: partial G3 installation detected \(% of % canonical objects present\)/,
    );
    const preflight = read(PREFLIGHT);
    expect(preflight).toMatch(/IF g3_table_count NOT IN \(0, 7\) THEN\s+RAISE EXCEPTION 'PREFLIGHT_FAIL partial G3 table installation/);
    expect(preflight).toMatch(/IF g3_enum_count NOT IN \(0, 6\) THEN\s+RAISE EXCEPTION 'PREFLIGHT_FAIL partial G3 enum installation/);
    expect(preflight).toMatch(/IF g3_table_count = 7 AND g3_enum_count <> 6 THEN/);
    expect(preflight).toMatch(/IF g3_enum_count = 6 AND g3_table_count <> 7 THEN/);
  });

  it("8. FULL_COMPATIBLE_G3_SKIP — all four mismatch counters must be zero", () => {
    expect(migration).toMatch(
      /column_mismatch_count = 0 AND enum_mismatch_count = 0 AND index_mismatch_count = 0 AND default_mismatch_count = 0/,
    );
    const preflight = read(PREFLIGHT);
    expect(preflight).toMatch(
      /column_mismatch_count = 0 AND enum_mismatch_count = 0 AND index_mismatch_count = 0 AND default_mismatch_count = 0/,
    );
  });

  it("9. provenance/rollback behavior and contract persistence DDL remain unchanged", () => {
    const zeroBranchAt = migration.indexOf("g3_existing_count = 0 THEN");
    const elseAt = migration.indexOf("G3_RECONCILIATION_BLOCKED: partial G3 installation");
    const markerAt = migration.indexOf(`COMMENT ON TABLE "org_units" IS '${PROVENANCE_MARKER}'`);
    expect(markerAt).toBeGreaterThan(zeroBranchAt);
    expect(markerAt).toBeLessThan(elseAt);

    const rollback = read(ROLLBACK);
    expect(rollback).toContain(PROVENANCE_MARKER);
    expect(rollback).toContain("g3_created_by_this_migration");
    const ifTrueAt = rollback.indexOf("IF g3_created_by_this_migration THEN");
    const elseNoticeAt = rollback.indexOf("preserving all G3 objects");
    const dropOrgUnitsAt = rollback.indexOf('DROP TABLE IF EXISTS "org_units"');
    expect(ifTrueAt).toBeGreaterThan(-1);
    expect(elseNoticeAt).toBeGreaterThan(ifTrueAt);
    expect(dropOrgUnitsAt).toBeGreaterThan(ifTrueAt);
    expect(rollback).not.toContain("expected_defaults");
    expect(rollback).not.toContain("expected_indexes");
    expect(rollback).not.toContain("pg_constraint");
    expect(rollback).not.toContain("pg_depend");

    const g3BlockEndAt = migration.indexOf("$g3_reconcile$;");
    for (const needle of [
      'CREATE UNIQUE INDEX "uq_contracts_tenant_id" ON "contracts" ("tenant_id", "id");',
      'ALTER TABLE "documents" ADD COLUMN "contract_id" UUID;',
      '"contract_snapshots_signed_operational_identity_ck"',
      'CREATE TABLE "contract_deliveries" (',
    ]) {
      expect(migration.indexOf(needle)).toBeGreaterThan(g3BlockEndAt);
    }
  });
});
