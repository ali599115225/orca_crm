import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = fs.readFileSync(path.join(process.cwd(), "prisma/migrations/20260727090000_exec_007_exact_scope_foundation/migration.sql"), "utf8");

describe("EXEC-007 additive migration contract", () => {
  it("T-MIG-01 creates all frozen EXEC-007 tables without backfill", () => {
    const tables = migration.match(/CREATE TABLE "exec007_[^"]+"/g) ?? [];
    expect(new Set(tables).size).toBe(29);
    expect(migration).not.toMatch(/\bINSERT\s+INTO\s+"?(offers|customer_parties|customer_accounts_v2|customer_opportunities_v2)"?/i);
  });

  it("T-MIG-02 uses canonical EXEC-005/006 physical FK targets", () => {
    expect(migration).toContain('REFERENCES "customer_parties"("tenant_id", "id")');
    expect(migration).toContain('REFERENCES "customer_accounts_v2"("tenant_id", "id")');
    expect(migration).toContain('REFERENCES "customer_opportunities_v2"("tenant_id", "id")');
    expect(migration).toContain('REFERENCES "unit_commitments"("tenant_id", "id")');
    expect(migration).not.toContain('REFERENCES "unit_commitment_reservations"');
  });
});
