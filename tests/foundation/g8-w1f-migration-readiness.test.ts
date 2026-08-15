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
  join(
    ROOT,
    "prisma",
    "migrations",
    "20260721020000_g3_rbac_constraints_indexes",
    "migration.sql",
  ),
  "utf8",
);
const W1A_MIGRATION = readFileSync(
  join(
    ROOT,
    "prisma",
    "migrations",
    "20260815001500_w1_contract_finance_foundation",
    "migration.sql",
  ),
  "utf8",
);
const W1D_MIGRATION = readFileSync(
  join(
    ROOT,
    "prisma",
    "migrations",
    "20260815004500_w1d_snapshot_offer_integrity",
    "migration.sql",
  ),
  "utf8",
);

const stripSqlComments = (value: string) => value.replace(/--.*$/gm, "");
const sqlStatements = (value: string) =>
  stripSqlComments(value)
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);

describe("W1F isolated migration readiness", () => {
  it("pins exact PR head, pre-W1A ref, and W1 migration identities", () => {
    expect(WORKFLOW).toContain(
      "ref: ${{ github.event.pull_request.head.sha || github.sha }}",
    );
    expect(WORKFLOW).toContain(
      "PRE_W1A_SHA: 50266d2122c966d0fa48f0d1b789e6ed5916b68c",
    );
    expect(WORKFLOW).toContain(
      'event_head="${{ github.event.pull_request.head.sha || github.sha }}"',
    );
    expect(WORKFLOW).toContain('test "$candidate" = "$event_head"');
    expect(WORKFLOW).toContain(
      "20260815001500_w1_contract_finance_foundation/migration.sql",
    );
    expect(WORKFLOW).toContain(
      "20260815004500_w1d_snapshot_offer_integrity/migration.sql",
    );
    expect(GATE).toContain("Base: `dc51a4ce0ef2f6b8f47535cbe511dc82101c5dcc`");
  });

  it("keeps W1A and W1D additive by statement class without rejecting ON UPDATE clauses", () => {
    const w1aStatements = sqlStatements(W1A_MIGRATION);
    const w1dStatements = sqlStatements(W1D_MIGRATION);

    expect(w1aStatements.length).toBeGreaterThan(10);
    expect(
      w1aStatements.every((statement) =>
        /^CREATE\s+(?:TABLE|INDEX)\b/i.test(statement),
      ),
    ).toBe(true);
    expect(
      w1dStatements.every((statement) =>
        /^CREATE\s+UNIQUE\s+INDEX\b/i.test(statement),
      ),
    ).toBe(true);
    expect(
      w1aStatements.filter((statement) => /^CREATE\s+TABLE\b/i.test(statement)),
    ).toHaveLength(10);
    expect(w1dStatements).toHaveLength(2);
    expect(W1A_MIGRATION).toContain("ON UPDATE CASCADE");
  });

  it("classifies the exact historical non-transactional G3 migration instead of rewriting it", () => {
    expect(HISTORICAL_MIGRATION).toContain("REVIEW-ONLY");
    expect(HISTORICAL_MIGRATION).toContain(
      "CREATE INDEX CONCURRENTLY cannot run inside a transaction block",
    );
    expect(HISTORICAL_MIGRATION).toContain(
      "release runner must execute this file without wrapping it in BEGIN/COMMIT",
    );
    expect(SUMMARY_SCRIPT).toContain(
      '"20260721020000_g3_rbac_constraints_indexes"',
    );
    expect(SUMMARY_SCRIPT).toContain('"P3018"');
    expect(SUMMARY_SCRIPT).toContain(
      '"CREATE INDEX CONCURRENTLY cannot run inside a transaction block"',
    );
    expect(SUMMARY_SCRIPT).toContain("W1F_UNEXPECTED_FULL_REPLAY_FAILURE");
    expect(GATE).toContain("pre-existing historical replay constraint");
  });

  it("uses only isolated localhost PostgreSQL 16 databases and rejects non-local URLs in code", () => {
    expect(WORKFLOW).toContain("image: postgres:16");
    expect(WORKFLOW).toContain("127.0.0.1:5432/orca_w1f_admin");
    expect(WORKFLOW).toContain("orca_w1f_replay");
    expect(WORKFLOW).toContain("orca_w1f_upgrade");
    expect(WORKFLOW).not.toMatch(/\$\{\{\s*secrets\./);
    expect(WORKFLOW).not.toContain("neon.tech");
    expect(WORKFLOW).not.toContain("supabase.co");
    expect(WORKFLOW).not.toContain("vercel.com");

    expect(SUMMARY_SCRIPT).toContain("assertIsolatedDatabaseUrl");
    expect(SUMMARY_SCRIPT).toContain("W1F_NON_LOCAL_DATABASE_FORBIDDEN");
    expect(SUMMARY_SCRIPT).toContain("W1F_NON_REHEARSAL_DATABASE_FORBIDDEN");
    expect(SUMMARY_SCRIPT).toContain("database.startsWith('orca_w1f_')");
  });

  it("keeps migration execution out of the workflow and inside the localhost-guarded verifier", () => {
    expect(WORKFLOW).not.toMatch(/\bprisma\s+migrate\s+(?:deploy|status|resolve|diff)\b/);
    expect(WORKFLOW).toContain(
      "node head/scripts/w1f-migration-readiness-summary.mjs full-replay",
    );
    expect(WORKFLOW).toContain(
      "node head/scripts/w1f-migration-readiness-summary.mjs materialize-prew1a",
    );
    expect(WORKFLOW).toContain(
      "node head/scripts/w1f-migration-readiness-summary.mjs targeted-drift",
    );

    expect(SUMMARY_SCRIPT).toContain('["prisma", "migrate", "deploy"]');
    expect(SUMMARY_SCRIPT).toContain('["prisma", "migrate", "status"]');
    expect(SUMMARY_SCRIPT).toContain('"resolve",\n        "--applied"');
    expect(SUMMARY_SCRIPT).toContain('"--from-config-datasource"');
    expect(SUMMARY_SCRIPT).toContain('"--exit-code"');

    expect(WORKFLOW).not.toMatch(/prisma\s+migrate\s+dev\b/);
    expect(WORKFLOW).not.toMatch(/prisma\s+migrate\s+reset\b/);
    expect(WORKFLOW).not.toMatch(/prisma\s+db\s+push\b/);
    expect(WORKFLOW).not.toMatch(/prisma\s+db\s+seed\b/);
    expect(WORKFLOW).not.toMatch(/\bnpx\s+vercel\b/);
  });

  it("permits only the exact historical replay recovery and then resumes migration verification", () => {
    expect(SUMMARY_SCRIPT).toContain("HISTORICAL_FAILURE_MARKERS.every");
    expect(SUMMARY_SCRIPT).toContain("exactHistoricalFailure");
    expect(SUMMARY_SCRIPT).toContain('"psql"');
    expect(SUMMARY_SCRIPT).toContain('"ON_ERROR_STOP=1"');
    expect(SUMMARY_SCRIPT).toContain("historicalException.resolvedApplied = true");
    expect(SUMMARY_SCRIPT).toContain("full-replay-deploy-resumed.txt");
    expect(SUMMARY_SCRIPT).toContain("full-replay-status.txt");
    expect(SUMMARY_SCRIPT).toContain("full-replay-drift.txt");
  });

  it("materializes the exact pre-W1A schema before targeted W1 SQL application", () => {
    const materializeStart = WORKFLOW.indexOf("name: Materialize exact pre-W1A supported schema");
    const applyStart = WORKFLOW.indexOf("name: Apply W1A and W1D to isolated upgrade database");
    expect(materializeStart).toBeGreaterThanOrEqual(0);
    expect(applyStart).toBeGreaterThan(materializeStart);

    const materialize = WORKFLOW.slice(materializeStart, applyStart);
    expect(materialize).toContain("W1F_PRE_W1A_SCHEMA=prew1a/prisma/schema.prisma");
    expect(materialize).toContain("capture-legacy");

    expect(SUMMARY_SCRIPT).toContain('"--from-empty"');
    expect(SUMMARY_SCRIPT).toContain('"--to-schema"');
    expect(SUMMARY_SCRIPT).toContain("preW1aSchema");

    const apply = WORKFLOW.slice(applyStart);
    expect(apply).toContain('psql "$UPGRADE_URL" -v ON_ERROR_STOP=1 -f "head/$W1A_MIGRATION"');
    expect(apply).toContain('psql "$UPGRADE_URL" -v ON_ERROR_STOP=1 -f "head/$W1D_MIGRATION"');
  });

  it("verifies legacy preservation, ten W1 tables, two unique indexes, and replay history", () => {
    expect(SUMMARY_SCRIPT).toContain("legacyPreserved");
    expect(SUMMARY_SCRIPT).toContain("before.columnsSha256 === afterLegacy.columnsSha256");
    expect(SUMMARY_SCRIPT).toContain("before.constraintsSha256 === afterLegacy.constraintsSha256");
    expect(SUMMARY_SCRIPT).toContain("W1_TABLES.length");
    expect(SUMMARY_SCRIPT).toContain("W1_UNIQUE_INDEXES.length");
    expect(SUMMARY_SCRIPT).toContain("_prisma_migrations");
    expect(SUMMARY_SCRIPT).toContain("finished_at IS NOT NULL AS finished");
    expect(SUMMARY_SCRIPT).toContain("rolled_back_at IS NULL AS not_rolled_back");
    expect(SUMMARY_SCRIPT).toContain('verdict:\n      legacyPreserved && tablesComplete && indexesComplete && replayComplete');
  });

  it("uploads durable evidence and always removes rehearsal databases", () => {
    expect(WORKFLOW).toContain("name: Cleanup isolated databases");
    expect(WORKFLOW).toContain("if: always()");
    expect(WORKFLOW).toContain("dropdb -h 127.0.0.1 -U postgres --if-exists");
    expect(WORKFLOW).toContain("name: w1f-migration-readiness-evidence");
    expect(WORKFLOW).toContain("retention-days: 14");
  });

  it("keeps W1F verification-only with no application or deployment surface", () => {
    expect(GATE).toContain("no production/customer database access");
    expect(GATE).toContain("no route/server action/UI");
    expect(GATE).toContain("no deploy");
    expect(GATE).toContain("G3 production-workflow protection is not changed or bypassed");
    expect(WORKFLOW).not.toContain("api/health");
    expect(WORKFLOW).not.toContain("deployment");
    expect(WORKFLOW).not.toContain("provider activation");
  });
});
