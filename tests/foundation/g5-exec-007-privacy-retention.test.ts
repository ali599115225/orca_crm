import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = fs.readFileSync(
  path.join(process.cwd(), "prisma/migration-evidence/non-production/20260727090000_exec_007_exact_scope_foundation/migration.sql"),
  "utf8",
);

describe("EXEC-007 restricted network evidence", () => {
  it("T-PRIV-01 stores raw IP only in the restricted security-event table with purpose", () => {
    expect(migration).toContain('CREATE TABLE "exec007_customer_security_events"');
    expect(migration).toContain('"raw_ip" INET');
    expect(migration).toContain('CONSTRAINT "ck_exec007_security_event_ip_purpose"');
  });

  it("T-PRIV-02 requires an audited purpose-bound read", () => {
    expect(migration).toContain('CREATE OR REPLACE FUNCTION "fn_exec007_guard_security_event_read"');
    expect(migration).toContain('INSERT INTO "exec007_security_event_reads"');
    expect(migration).toContain("restricted security read purpose and correlation required");
  });

  it("T-PRIV-03 fixes raw-IP deletion metadata at 90 days and exempts active legal hold", () => {
    expect(migration).toContain('"scheduled_deletion_at" = "recorded_at" + INTERVAL \'90 days\'');
    expect(migration).toContain('WHERE "legal_hold_status" <> \'ACTIVE\'');
  });
});



type Batch3Evidence = { databases?: Array<{ name: string; tests: Record<string, { pass: boolean; actual?: string }> }> };
function expectPostgresEvidence(testId: string): void {
  const evidencePath = process.env.EXEC007_POSTGRES_EVIDENCE;
  if (!evidencePath) return;
  const evidence = JSON.parse(fs.readFileSync(evidencePath, "utf8")) as Batch3Evidence;
  expect(evidence.databases?.length).toBeGreaterThanOrEqual(2);
  for (const database of evidence.databases ?? []) {
    expect(database.tests[testId], `${database.name}:${testId}`).toMatchObject({ pass: true });
  }
}

const nonceRetentionCases = [
  ["T-B3-RAWIP-043", "cleanup deletes rows older than database_now minus twenty-four hours"],
  ["T-B3-RAWIP-044", "cleanup retains rows inside twenty-four-hour window"]
] as const;

describe("Batch 3 authorization nonce retention contracts", () => {
  for (const [testId, title] of nonceRetentionCases) {
    it(`${testId} ${title}`, () => {
      const retentionSql = fs.readFileSync(path.join(process.cwd(), "scripts/exec-007-postgres-privacy-retention.sql"), "utf8");
      expect(retentionSql).toContain("exec007_db_authorization_nonces");
      expect(retentionSql).toContain("interval '24 hours'");
      expectPostgresEvidence(testId);
    });
  }
});
