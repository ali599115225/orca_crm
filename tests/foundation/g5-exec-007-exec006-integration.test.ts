import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const exec007 = fs.readFileSync(
  path.join(process.cwd(), "prisma/migrations/20260727090000_exec_007_exact_scope_foundation/migration.sql"),
  "utf8",
);
const exec006 = fs.readFileSync(
  path.join(process.cwd(), "prisma/migrations/20260726160000_exec_006_unit_commitment_reservation_tours/migration.sql"),
  "utf8",
);

describe("EXEC-007 to EXEC-006 atomic integration", () => {
  it("T-HOLD-01 binds completion to the existing Hold and expected versions", () => {
    expect(exec007).toContain('"hold_id" UUID NOT NULL');
    expect(exec007).toContain('"expected_offer_version" INTEGER NOT NULL');
    expect(exec007).toContain('"expected_hold_version" INTEGER NOT NULL');
    expect(exec007).toContain('CONSTRAINT "fk_exec007_completion_hold"');
  });

  it("T-HOLD-02 accepts only an active EXEC-006 RESERVATION reference", () => {
    expect(exec007).toContain('REFERENCES "unit_commitments"("tenant_id", "id")');
    expect(exec007).toContain("v_type IS DISTINCT FROM 'RESERVATION'");
    expect(exec007).toContain("v_status IS DISTINCT FROM 'ACTIVE'");
    expect(exec007).toContain('CREATE TRIGGER "trg_exec007_completion_reservation_guard"');
  });

  it("T-HOLD-03 relies on the atomic EXEC-006 conversion function and records no partial success", () => {
    expect(exec006).toContain('CREATE FUNCTION "exec006_convert_hold_to_reservation"');
    expect(exec006).toContain("UPDATE \"unit_commitments\" SET");
    expect(exec006).toContain("INSERT INTO \"unit_commitments\"");
    expect(exec007).toContain('CONSTRAINT "ck_exec007_completion_shape"');
  });
});
