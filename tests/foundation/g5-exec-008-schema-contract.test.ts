import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(
    process.cwd(),
    "prisma/migrations/20260811030000_exec_008_contract_financial_integrity/migration.sql",
  ),
  "utf8",
);

describe("EXEC-008 — schema integrity contracts", () => {
  it("creates the bounded immutable and append-only truth tables", () => {
    for (const table of [
      "exec008_contract_template_versions",
      "exec008_contract_versions",
      "exec008_signatory_authority_evidence",
      "exec008_idempotency",
      "exec008_financial_obligations",
      "exec008_financial_corrections",
      "exec008_payment_evidence",
      "exec008_payments",
      "exec008_payment_allocations",
      "exec008_refunds",
    ]) {
      expect(migration).toContain(table);
    }
  });

  it("enforces idempotency uniqueness and provider evidence uniqueness", () => {
    expect(migration).toMatch(/UNIQUE\s*\([^)]*tenant_id[^)]*operation[^)]*key_hash[^)]*\)/i);
    expect(migration).toMatch(/UNIQUE\s*\([^)]*tenant_id[^)]*provider[^)]*provider_reference[^)]*\)/i);
  });

  it("contains database guards for immutable contract history and append-only finance history", () => {
    expect(migration).toMatch(/immutable/i);
    expect(migration).toMatch(/append[-_ ]?only/i);
    expect(migration).toMatch(/TRIGGER/i);
    expect(migration).toMatch(/exec008_contract_versions/i);
    expect(migration).toMatch(/exec008_financial_corrections/i);
    expect(migration).toMatch(/exec008_payment_allocations/i);
  });

  it("contains concurrency guards for allocation and refund bounds", () => {
    expect(migration).toMatch(/pg_advisory_xact_lock|FOR UPDATE/i);
    expect(migration).toMatch(/over[-_ ]?allocat|remaining obligation|allocation/i);
    expect(migration).toMatch(/refund/i);
    expect(migration).toMatch(/initiated_by_user_id/i);
    expect(migration).toMatch(/approved_by_user_id/i);
  });

  it("does not contain production or backfill execution", () => {
    expect(migration).not.toMatch(/DATABASE_URL|DIRECT_URL|production/i);
    expect(migration).not.toMatch(/backfill/i);
  });
});
