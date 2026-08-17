import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = fs.readFileSync(
  path.join(process.cwd(), "prisma/migration-evidence/non-production/20260727090000_exec_007_exact_scope_foundation/migration.sql"),
  "utf8",
);

describe("EXEC-007 retention and legal hold", () => {
  it("T-RET-01 assigns one versioned retention record per governed record", () => {
    expect(migration).toContain('CREATE TABLE "exec007_retention_assignments"');
    expect(migration).toContain('"policy_version" TEXT NOT NULL');
    expect(migration).toContain('CONSTRAINT "uq_exec007_retention_record" UNIQUE ("tenant_id","record_type","record_id")');
  });

  it("T-RET-02 blocks update/delete disposition while legal hold is active", () => {
    expect(migration).toContain('CREATE TRIGGER "trg_exec007_retention_legal_hold"');
    expect(migration).toContain("EXEC-007 active legal hold blocks disposition");
  });

  it("T-RET-03 blocks disposal until downstream relationship end is resolved", () => {
    expect(migration).toContain('"downstream_relationship_ended_at" TIMESTAMPTZ');
    expect(migration).toContain("EXEC-007 downstream relationship end is unresolved");
  });
});
