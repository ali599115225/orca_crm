import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = fs.readFileSync(
  path.join(process.cwd(), "prisma/migrations/20260727090000_exec_007_exact_scope_foundation/migration.sql"),
  "utf8",
);

describe("EXEC-007 frozen schema contract", () => {
  it("T-FREEZE-01 freezes governed version payload and hashes after issue", () => {
    expect(migration).toContain('CREATE OR REPLACE FUNCTION "fn_exec007_guard_offer_version_immutable"');
    expect(migration).toContain("EXEC-007 governed version fields are frozen");
    expect(migration).toContain('CREATE TRIGGER "trg_exec007_offer_version_immutable"');
  });

  it("T-FREEZE-02 permits exactly one current ISSUED version per offer", () => {
    expect(migration).toContain('CREATE UNIQUE INDEX "uq_exec007_offer_versions_one_current_issued"');
    expect(migration).toContain("WHERE \"state\"='ISSUED' AND \"is_current\"=TRUE");
  });

  it("T-ISSUE-01 requires approved issuance inputs and preserves a current-version pointer", () => {
    expect(migration).toContain('"current_issued_version_id" UUID');
    expect(migration).toContain('CONSTRAINT "fk_exec007_offers_current_version"');
    expect(migration).toContain('"state" "Exec007OfferVersionState" NOT NULL DEFAULT \'DRAFT\'');
    expect(migration).toContain('CREATE TABLE "exec007_offer_approval_requirements"');
    expect(migration).toContain('CREATE TABLE "exec007_offer_approval_decisions"');
  });

  it("freezes the Batch 3 split-custody and challenge-binding schema inventory", () => {
    for (const objectName of [
      "orca_exec007_secure.exec007_db_authorization_keys",
      "public.exec007_db_authorization_nonces",
      "public.fn_exec007_get_security_event_authority_metadata",
      "public.fn_exec007_verify_db_authorization_context",
      "public.fn_exec007_consume_db_authorization_nonce",
      "public.fn_exec007_guard_security_event_read",
      "fk_exec007_challenge_session_binding",
      "fk_exec007_challenge_grant_binding",
      "fk_exec007_challenge_offer_version_binding",
      "trg_exec007_security_event_read_audit_append_only",
    ]) {
      expect(migration).toContain(objectName);
    }
  });

  it("keeps the Batch 3 security-event migration fail-closed and backfill-free", () => {
    expect(migration).toContain("EXEC007_SECURITY_EVENT_EXISTING_DATA_REQUIRES_SEPARATE_AUTHORITY");
    expect(migration).toContain("v_row_count<>0");
    expect(migration).not.toMatch(/UPDATE\s+public\.exec007_customer_security_events\s+SET/i);
    expect(migration).not.toMatch(/INSERT\s+INTO\s+public\.exec007_customer_security_events\s*\([^)]*SELECT/i);
  });

});
