import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { canTransitionVersion } from "@/lib/offer-management/state-machine";

const migration = fs.readFileSync(
  path.join(process.cwd(), "prisma/migrations/20260727090000_exec_007_exact_scope_foundation/migration.sql"),
  "utf8",
);

describe("EXEC-007 version freeze", () => {
  it("T-FREEZE-01 rejects returning an issued version to an editable state", () => {
    expect(canTransitionVersion("ISSUED", "DRAFT")).toBe(false);
    expect(canTransitionVersion("ISSUED", "PENDING_APPROVAL")).toBe(false);
  });

  it("T-FREEZE-02 protects payload, subject, scope, hashes, validity and identity", () => {
    for (const field of [
      'NEW."content_payload"',
      'NEW."scope_snapshot"',
      'NEW."subject_snapshot"',
      'NEW."content_hash"',
      'NEW."pricing_hash"',
      'NEW."terms_hash"',
      'NEW."valid_until_utc"',
      'NEW."unit_id"',
      'NEW."opportunity_id"',
    ]) {
      expect(migration).toContain(field);
    }
  });
});
