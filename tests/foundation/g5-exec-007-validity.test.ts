import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { isPolicyEffective } from "@/lib/offer-management/pricing-snapshot";

const migration = fs.readFileSync(
  path.join(process.cwd(), "prisma/migrations/20260727090000_exec_007_exact_scope_foundation/migration.sql"),
  "utf8",
);

const policy = {
  id: "p",
  tenantId: "t",
  sourceType: "SALE_PROJECT_PRICE_BOOK" as const,
  sourceRecordId: "r",
  sourceVersion: "v1",
  offerKind: "SALE" as const,
  standardValidityDays: 15,
  normalMaxValidityDays: 30 as const,
  effectiveFrom: new Date("2026-07-01T00:00:00Z"),
  effectiveTo: new Date("2026-08-01T00:00:00Z"),
};

describe("EXEC-007 date and validity contract", () => {
  it("T-DATE-01 resolves policy effectiveness using trusted instants and an exclusive end", () => {
    expect(isPolicyEffective(policy, new Date("2026-07-01T00:00:00Z"))).toBe(true);
    expect(isPolicyEffective(policy, new Date("2026-08-01T00:00:00Z"))).toBe(false);
  });

  it("T-DATE-02 persists local validity date, Asia/Riyadh zone and derived UTC instant", () => {
    expect(migration).toContain('"valid_until_local_date" DATE');
    expect(migration).toContain('"validity_time_zone" TEXT NOT NULL DEFAULT \'Asia/Riyadh\'');
    expect(migration).toContain('"valid_until_utc" TIMESTAMPTZ');
  });

  it("T-DATE-03 rejects issued or terminal versions without a future trusted expiry", () => {
    expect(migration).toContain('CONSTRAINT "ck_exec007_offer_versions_validity_order"');
    expect(migration).toContain('"valid_until_utc" > "issued_at_utc"');
  });
});
