import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const WORKFLOW = readFileSync(
  join(ROOT, ".github", "workflows", "w1f-migration-readiness.yml"),
  "utf8",
);
const SUMMARY_SCRIPT = readFileSync(
  join(ROOT, "scripts", "w1f-migration-readiness-summary.mjs"),
  "utf8",
);
const GATE = readFileSync(
  join(ROOT, "docs", "product-extension", "W1F_MIGRATION_READINESS_GATE.md"),
  "utf8",
);
const HISTORICAL_MIGRATION = readFileSync(
  join(ROOT, "prisma", "migrations", "20260721020000_g3_rbac_constraints_indexes", "migration.sql"),
  "utf8",
);
const W1A_MIGRATION = readFileSync(
  join(ROOT, "prisma", "migrations", "20260815001500_w1_contract_finance_foundation", "migration.sql"),
  "utf8",
);
const W1D_MIGRATION = readFileSync(
  join(ROOT, "prisma", "migrations", "20260815004500_w1d_snapshot_offer_integrity", "migration.sql"),
  "utf8",
);
const ALIGNMENT_MIGRATION = readFileSync(
  join(ROOT, "prisma", "migrations", "20260815010000_w1_schema_alignment", "migration.sql"),
  "utf8",
);

const W1_TABLES = new Set([
  "contract_amendments",
  "contract_approvals",
  "contract_clause_definitions",
  "contract_drafts",
  "contract_snapshots",
  "contract_template_versions",
  "contract_templates",
  "finance_case_events",
  "finance_cases",
  "finance_provider_offers",
]);

const stripSqlComments = (value: string) => value.replace(/--.*$/gm, "");
const sqlStatements = (value: string) =>
  stripSqlComments(value)
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);

describe("W1F isolated migration readiness", () => {
  it("pins the exact candidate, pre-W1A reference, and all W1 migration identities", () => {
    expect(WORKFLOW).toContain("ref: ${{ github.event.pull_request.head.sha || github.sha }}");
    expect(WORKFLOW).toContain("PRE_W1A_SHA: 50266d2122c966d0fa48f0d1b789e6ed5916b68c");
    expect(WORKFLOW).toContain('test "$candidate" = "$event_head"');
    expect(WORKFLOW).toContain("20260815001500_w1_contract_finance_foundation/migration.sql");
    expect(WORKFLOW).toContain("20260815004500_w1d_snapshot_offer_integrity/migration.sql");
    expect(WORKFLOW).toContain("20260815010000_w1_schema_alignment/migration.sql");
    expect(SUMMARY_SCRIPT).toContain('"20260815010000_w1_schema_alignment"');
    expect(GATE).toContain("Base: `dc51a4ce0ef2f6b8f47535cbe511dc82101c5dcc`");
  });

  it("keeps W1A/W1D frozen and scopes alignment to W1 metadata only", () => {
    const w1aStatements = sqlStatements(W1A_MIGRATION);
    const w1dStatements = sqlStatements(W1D_MIGRATION);
    const alignmentStatements = sqlStatements(ALIGNMENT_MIGRATION);

    expect(w1aStatements.every((s) => /^CREATE\s+(?:TABLE|INDEX)\b/i.test(s))).toBe(true);
    expect(w1dStatements.every((s) => /^CREATE\s+UNIQUE\s+INDEX\b/i.test(s))).toBe(true);
    expect(w1aStatements.filter((s) => /^CREATE\s+TABLE\b/i.test(s))).toHaveLength(10);
    expect(w1dStatements).toHaveLength(2);
    expect(alignmentStatements).toHaveLength(21);

    for (const statement of alignmentStatements) {
      const table = statement.match(/^ALTER\s+TABLE\s+"([^"]+)"\s+/i)?.[1];
      expect(table).toBeTruthy();
      expect(W1_TABLES.has(table!)).toBe(true);
      expect(statement).toMatch(/\b(?:ALTER\s+COLUMN|RENAME\s+CONSTRAINT)\b/i);
      expect(statement).not.toMatch(/\b(?:INSERT|UPDATE|DELETE|TRUNCATE|DROP)\b/i);
    }

    expect(ALIGNMENT_MIGRATION.match(/SET DEFAULT CURRENT_TIMESTAMP/g) ?? []).toHaveLength(17);
    expect(ALIGNMENT_MIGRATION.match(/RENAME CONSTRAINT/g) ?? []).toHaveLength(11);
  });

  it("classifies only the frozen historical non-transactional G3 replay exception", () => {
    expect(HISTORICAL_MIGRATION).toContain("REVIEW-ONLY");
    expect(HISTORICAL_MIGRATION).toContain("CREATE INDEX CONCURRENTLY cannot run inside a transaction block");
    expect(SUMMARY_SCRIPT).toContain('"20260721020000_g3_rbac_constraints_indexes"');
    expect(SUMMARY_SCRIPT).toContain('"P3018"');
    expect(SUMMARY_SCRIPT).toContain("HISTORICAL_FAILURE_MARKERS.every");
    expect(SUMMARY_SCRIPT).toContain("W1F_UNEXPECTED_FULL_REPLAY_FAILURE");
  });

  it("uses only isolated localhost PostgreSQL 16 databases", () => {
    expect(WORKFLOW).toContain("image: postgres:16");
    expect(WORKFLOW).toContain("127.0.0.1:5432/orca_w1f_admin");
    expect(WORKFLOW).not.toMatch(/\$\{\{\s*secrets\./);
    expect(WORKFLOW).not.toContain("neon.tech");
    expect(WORKFLOW).not.toContain("supabase.co");
    expect(WORKFLOW).not.toContain("vercel.com");
    expect(SUMMARY_SCRIPT).toContain("assertIsolatedDatabaseUrl");
    expect(SUMMARY_SCRIPT).toContain("W1F_NON_LOCAL_DATABASE_FORBIDDEN");
    expect(SUMMARY_SCRIPT).toContain("W1F_NON_REHEARSAL_DATABASE_FORBIDDEN");
  });

  it("keeps database migration commands inside the localhost-guarded verifier", () => {
    expect(WORKFLOW).not.toMatch(/\bprisma\s+migrate\s+(?:deploy|status|resolve|diff)\b/);
    expect(WORKFLOW).toContain("w1f-migration-readiness-summary.mjs full-replay");
    expect(WORKFLOW).toContain("w1f-migration-readiness-summary.mjs materialize-prew1a");
    expect(WORKFLOW).toContain("w1f-migration-readiness-summary.mjs targeted-drift");
    expect(SUMMARY_SCRIPT).toMatch(/\["prisma", "migrate", "deploy"\]/);
    expect(SUMMARY_SCRIPT).toMatch(/\["prisma", "migrate", "status"\]/);
    expect(SUMMARY_SCRIPT).toContain('"--from-config-datasource"');
    expect(SUMMARY_SCRIPT).toContain('"--exit-code"');
  });

  it("allows historical legacy-only full-replay drift but fails closed on any W1 drift", () => {
    expect(SUMMARY_SCRIPT).toContain("function classifyFullReplayDrift");
    expect(SUMMARY_SCRIPT).toContain('classification: "ZERO_DRIFT"');
    expect(SUMMARY_SCRIPT).toContain('classification: "HISTORICAL_LEGACY_DRIFT_ONLY"');
    expect(SUMMARY_SCRIPT).toContain("W1F_W1_DRIFT_DETECTED");
    expect(SUMMARY_SCRIPT).toContain("[...W1_TABLES, ...W1_UNIQUE_INDEXES]");
    expect(SUMMARY_SCRIPT).toContain("full-replay-drift-classification.json");
    expect(GATE).toContain("any full-replay drift mentioning a W1 table or W1 unique index is a hard failure");
  });

  it("materializes pre-W1A with a bounded retry only for the confirmed Prisma schema-engine flake", () => {
    const materializeStart = WORKFLOW.indexOf("name: Materialize exact pre-W1A supported schema");
    const applyStart = WORKFLOW.indexOf("name: Apply W1A, W1D, and W1 schema alignment to isolated upgrade database");
    expect(materializeStart).toBeGreaterThanOrEqual(0);
    expect(applyStart).toBeGreaterThan(materializeStart);

    const materialize = WORKFLOW.slice(materializeStart, applyStart);
    expect(materialize).toContain("DATABASE_URL=\"$UPGRADE_URL\"");
    expect(materialize).toContain("DIRECT_URL=\"$UPGRADE_URL\"");
    expect(materialize).toContain("W1F_PRE_W1A_SCHEMA=prew1a/prisma/schema.prisma");
    expect(materialize).toContain('attempt=1');
    expect(materialize).toContain('while [ "$attempt" -le 5 ]');
    expect(materialize).toContain("grep -Fq 'Error in Schema engine'");
    expect(materialize).toContain('if [ "$attempt" -eq 5 ]');
    expect(materialize).toContain("pre-w1a-materialize-retry-summary.json");
    expect(SUMMARY_SCRIPT).toContain("W1F_PRE_W1A_SQL_OUTPUT_MISSING");
    expect(SUMMARY_SCRIPT).toContain("writeText(output, result.stdout)");
  });

  it("applies W1A, W1D, and alignment in the targeted rehearsal and requires zero drift", () => {
    const applyStart = WORKFLOW.indexOf("name: Apply W1A, W1D, and W1 schema alignment to isolated upgrade database");
    expect(applyStart).toBeGreaterThanOrEqual(0);
    const apply = WORKFLOW.slice(applyStart);
    expect(apply).toContain('head/$W1A_MIGRATION');
    expect(apply).toContain('head/$W1D_MIGRATION');
    expect(apply).toContain('head/$W1_ALIGNMENT_MIGRATION');
    expect(apply).toContain("w1f-migration-readiness-summary.mjs targeted-drift");
    expect(SUMMARY_SCRIPT).toContain("targetedDrift");
    expect(SUMMARY_SCRIPT).toContain("zeroDriftRequired: true");
  });

  it("proves legacy preservation and all expected W1 objects", () => {
    expect(SUMMARY_SCRIPT).toContain("before.columnsSha256 === afterLegacy.columnsSha256");
    expect(SUMMARY_SCRIPT).toContain("before.constraintsSha256 === afterLegacy.constraintsSha256");
    expect(SUMMARY_SCRIPT).toContain("W1_TABLES.length");
    expect(SUMMARY_SCRIPT).toContain("W1_UNIQUE_INDEXES.length");
    expect(SUMMARY_SCRIPT).toContain("_prisma_migrations");
    expect(SUMMARY_SCRIPT).toContain("replayDriftAccepted");
    expect(WORKFLOW).toContain("W1F_REPLAY_DRIFT_CLASSIFICATION_PATH=evidence/full-replay-drift-classification.json");
  });

  it("always cleans up and uploads durable evidence", () => {
    expect(WORKFLOW).toContain("name: Cleanup isolated databases");
    expect(WORKFLOW).toContain("if: always()");
    expect(WORKFLOW).toContain("dropdb -h 127.0.0.1 -U postgres --if-exists");
    expect(WORKFLOW).toContain("name: w1f-migration-readiness-evidence");
    expect(WORKFLOW).toContain("retention-days: 14");
  });

  it("remains verification-only with a five-file W1F allowlist", () => {
    expect(GATE).toContain("five-file W1F allowlist");
    expect(GATE).toContain("no production/customer database access");
    expect(GATE).toContain("no route/server action/UI");
    expect(GATE).toContain("no deploy");
    expect(GATE).toContain("G3 production-workflow protection is not changed or bypassed");
    expect(WORKFLOW).not.toContain("api/health");
    expect(WORKFLOW).not.toContain("provider activation");
  });
});
