import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = fs.readFileSync(
  path.join(process.cwd(), "prisma/migrations/20260727090000_exec_007_exact_scope_foundation/migration.sql"),
  "utf8",
);

describe("EXEC-007 preparation request boundary", () => {
  it("T-PREP-01 creates exactly one immutable preparation request per completed acceptance", () => {
    expect(migration).toContain('CREATE TABLE "exec007_preparation_requests"');
    expect(migration).toContain('CONSTRAINT "uq_exec007_preparation_request_completion" UNIQUE ("tenant_id", "completion_attempt_id")');
    expect(migration).toContain('CREATE TRIGGER "trg_exec007_preparation_request_immutable"');
  });

  it("T-PREP-02 selects a type-specific request and stops before contract or finance creation", () => {
    expect(migration).toContain('CONSTRAINT "ck_exec007_preparation_kind"');
    expect(migration).toContain("SALE_CONTRACT_PREPARATION_REQUEST");
    expect(migration).toContain("LEASE_PREPARATION_REQUEST");
    expect(migration).not.toMatch(/INSERT\s+INTO\s+"?(contracts|rental_leases|invoices|payment_plans|installments|payments)"?/i);
  });
});
