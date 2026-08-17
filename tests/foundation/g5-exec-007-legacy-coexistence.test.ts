import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { assertCommercialWriteMode } from "@/lib/exec-007-cutover/legacy-guard";
import { canTransitionCutover } from "@/lib/offer-management/state-machine";

const migration = fs.readFileSync(
  path.join(process.cwd(), "prisma/migration-evidence/non-production/20260727090000_exec_007_exact_scope_foundation/migration.sql"),
  "utf8",
);

describe("EXEC-007 legacy coexistence and recovery", () => {
  it("T-LEG-02 keeps initial mode LEGACY_ONLY and adds no legacy backfill", () => {
    expect(migration).toContain("VALUES (1, 'LEGACY_ONLY', 1)");
    expect(migration).not.toMatch(/INSERT\s+INTO\s+"exec007_[^"]+"[\s\S]{0,200}SELECT[\s\S]{0,200}FROM\s+"?(offers|opportunities)"?/i);
    expect(() => assertCommercialWriteMode("LEGACY_ONLY", "LEGACY")).not.toThrow();
  });

  it("T-CUT-03 makes post-activation recovery forward-fix only and preserves first-write latch", () => {
    expect(canTransitionCutover("EXEC007_ACTIVE", "LEGACY_ONLY")).toBe(false);
    expect(canTransitionCutover("EXEC007_ACTIVE", "RECOVERY_STOP")).toBe(true);
    expect(migration).toContain("EXEC-007 first-write latch is immutable");
    expect(migration).toContain('CREATE TRIGGER "trg_exec007_mark_first_write_offer"');
  });
});
