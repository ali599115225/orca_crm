import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function source(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

const NEW_MIGRATION_PATH =
  "prisma/migrations/20260924194914_feature3_amendment_snapshot_identity/migration.sql";
const F3_1_MIGRATION_PATH =
  "prisma/migrations/20260924190000_feature3_amendment_persistence/migration.sql";

// The exact pre-F3-2A definition, byte-identical to what Postgres itself
// returns from pg_get_constraintdef for the constraint added in
// 20260923_final_architecture_persistence_readiness/migration.sql — verified
// against a real disposable PostgreSQL 16 instance in this batch.
const OLD_TWO_BRANCH_DEFINITION =
  "CHECK ((((snapshot_type = 'SIGNED_OPERATIONAL'::text) AND (contract_id IS NOT NULL) AND (contract_version IS NOT NULL) AND (signed_at IS NOT NULL) AND (signature_evidence_hash IS NOT NULL) AND ((signature_evidence_hash)::text ~ '^[0-9a-f]{64}$'::text)) OR ((snapshot_type <> 'SIGNED_OPERATIONAL'::text) AND (draft_id IS NOT NULL) AND (template_version_id IS NOT NULL))))";

describe("F3-2A — amendment snapshot identity remediation", () => {
  it("the new migration file exists at the expected path", () => {
    expect(fs.existsSync(path.join(process.cwd(), NEW_MIGRATION_PATH))).toBe(true);
  });

  it("does not modify the already-preserved F3-1 migration", () => {
    const migration = source(F3_1_MIGRATION_PATH);
    // Structural fingerprints of the untouched F3-1 file — if any of these
    // drift, the preserved migration was edited, which this batch forbids.
    expect(migration).toContain('ADD COLUMN "source_contract_version" INTEGER NOT NULL');
    expect(migration).toContain('ADD CONSTRAINT "contract_amendments_tenant_id_contract_id_fkey"');
    expect(migration).toContain('DROP INDEX "uq_contract_snapshots_tenant_draft_type"');
    expect(migration).toContain('DROP INDEX "uq_contract_snapshots_tenant_contract_type_version"');
    expect(migration).toContain("FEATURE3_AMENDMENT_PERSISTENCE_BLOCKED");
  });

  it("touches only the contract_snapshots_signed_operational_identity_ck constraint (no table/column/index change)", () => {
    const migration = source(NEW_MIGRATION_PATH);

    expect(migration).toContain(
      'DROP CONSTRAINT "contract_snapshots_signed_operational_identity_ck"',
    );
    expect(migration).toContain(
      'ADD CONSTRAINT "contract_snapshots_signed_operational_identity_ck"',
    );

    expect(migration).not.toMatch(/\bCREATE\s+TABLE\b/i);
    expect(migration).not.toMatch(/\bDROP\s+TABLE\b/i);
    expect(migration).not.toMatch(/\bADD\s+COLUMN\b/i);
    expect(migration).not.toMatch(/\bDROP\s+COLUMN\b/i);
    expect(migration).not.toMatch(/\bCREATE\s+(UNIQUE\s+)?INDEX\b/i);
    expect(migration).not.toMatch(/\bDROP\s+INDEX\b/i);
    expect(migration).not.toMatch(/\bINSERT\s+INTO\b/i);
    expect(migration).not.toMatch(/\bUPDATE\s+"/i);
    expect(migration).not.toMatch(/\bDELETE\s+FROM\b/i);
  });

  it("includes AMENDMENT_SOURCE and AMENDMENT_RESULT in the new branch, requiring only contract_id + contract_version", () => {
    const migration = source(NEW_MIGRATION_PATH);

    expect(migration).toMatch(
      /"snapshot_type"\s+IN\s+\('AMENDMENT_SOURCE',\s*'AMENDMENT_RESULT'\)/,
    );

    // The amendment branch must not smuggle in draft/template/signed
    // requirements — extract just that branch's clause and assert it stays
    // narrow (contract_id + contract_version only).
    const amendmentBranchMatch = migration.match(
      /"snapshot_type"\s+IN\s+\('AMENDMENT_SOURCE',\s*'AMENDMENT_RESULT'\)[\s\S]*?\)\s*\n\s*OR/,
    );
    expect(amendmentBranchMatch).toBeTruthy();
    const amendmentBranch = amendmentBranchMatch![0];
    expect(amendmentBranch).toContain('"contract_id" IS NOT NULL');
    expect(amendmentBranch).toContain('"contract_version" IS NOT NULL');
    expect(amendmentBranch).not.toContain("draft_id");
    expect(amendmentBranch).not.toContain("template_version_id");
    expect(amendmentBranch).not.toContain("signed_at");
    expect(amendmentBranch).not.toContain("signature_evidence_hash");
  });

  it("preserves the SIGNED_OPERATIONAL branch requirements unchanged", () => {
    const migration = source(NEW_MIGRATION_PATH);

    expect(migration).toContain("\"snapshot_type\" = 'SIGNED_OPERATIONAL'");
    expect(migration).toContain('"contract_id" IS NOT NULL');
    expect(migration).toContain('"contract_version" IS NOT NULL');
    expect(migration).toContain('"signed_at" IS NOT NULL');
    expect(migration).toContain('"signature_evidence_hash" IS NOT NULL');
    expect(migration).toContain("\"signature_evidence_hash\" ~ '^[0-9a-f]{64}$'");
  });

  it("keeps a closed fallback branch requiring draft_id + template_version_id for every other snapshot type", () => {
    const migration = source(NEW_MIGRATION_PATH);

    const fallbackBranchMatch = migration.match(
      /"snapshot_type"\s+<>\s+'SIGNED_OPERATIONAL'\s+AND\s+"snapshot_type"\s+NOT IN[\s\S]*?\)\s*\n\s*\);/,
    );
    expect(fallbackBranchMatch).toBeTruthy();
    const fallbackBranch = fallbackBranchMatch![0];
    expect(fallbackBranch).toContain('"draft_id" IS NOT NULL');
    expect(fallbackBranch).toContain('"template_version_id" IS NOT NULL');
    expect(fallbackBranch).toMatch(
      /NOT IN\s*\('AMENDMENT_SOURCE',\s*'AMENDMENT_RESULT'\)/,
    );
  });

  it("wraps the migration in one explicit PostgreSQL transaction", () => {
    const migration = source(NEW_MIGRATION_PATH);

    expect(migration).toMatch(/(^|\r?\n)BEGIN;\r?\n/);
    expect(migration.trimEnd()).toMatch(/COMMIT;$/);
  });

  it("fails closed with a preflight guard rather than blindly dropping an unverified constraint", () => {
    const migration = source(NEW_MIGRATION_PATH);

    expect(migration).toMatch(/DO\s+\$f3_2a_amendment_snapshot_identity\$/);
    expect(migration).toContain("pg_get_constraintdef");
    expect(migration).toContain("F3_2A_AMENDMENT_SNAPSHOT_IDENTITY_BLOCKED");
    expect(migration).toContain("RAISE EXCEPTION");
    // The preflight compares against the exact catalog-normalized text of
    // the pre-F3-2A two-branch constraint, proven live against PostgreSQL 16
    // in this batch (see OLD_TWO_BRANCH_DEFINITION above).
    expect(migration).toContain(OLD_TWO_BRANCH_DEFINITION.replace(/'/g, "''"));
  });

  it("does not touch invoices, payments, rentals, RF12, or unrelated tables", () => {
    const migration = source(NEW_MIGRATION_PATH);

    expect(migration).not.toMatch(/ALTER TABLE "invoices"/);
    expect(migration).not.toMatch(/ALTER TABLE "installments"/);
    expect(migration).not.toMatch(/ALTER TABLE "payment_transactions"/);
    expect(migration).not.toMatch(/ALTER TABLE "contract_amendments"/);
    expect(migration).not.toMatch(/rental_/i);
    expect(migration).not.toMatch(/rf12/i);

    // The only table this migration's ALTER statements may touch.
    const alterTableMatches = [...migration.matchAll(/ALTER TABLE "([a-z_]+)"/g)].map(
      (match) => match[1],
    );
    expect(new Set(alterTableMatches)).toEqual(new Set(["contract_snapshots"]));
  });
});
