import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();
const hardening = readFileSync(
  path.join(
    root,
    "prisma/migration-evidence/non-production/20260726124500_exec_005_customer_identity_integrity_hardening/migration.sql",
  ),
  "utf8",
);
const workflow = readFileSync(
  path.join(root, ".github/workflows/exec-005-migration-validation.yml"),
  "utf8",
);

describe("EXEC-005 database integrity hardening", () => {
  it("guards Party, Account, Lead and Opportunity tenant links", () => {
    for (const guard of [
      "exec005_validate_alias_tenant",
      "exec005_validate_party_field_tenant",
      "exec005_validate_account_tenant",
      "exec005_validate_account_contact_tenant",
      "exec005_validate_lead_tenant",
      "exec005_validate_opportunity_tenant",
      "exec005_validate_opportunity_history_tenant",
    ]) {
      expect(hardening).toContain(`CREATE FUNCTION \"${guard}\"`);
    }
    expect(hardening).toContain("account tenant or subject mismatch");
    expect(hardening).toContain("source lead mismatch");
  });

  it("guards consent, duplicate, merge, deletion and audit tenant links", () => {
    for (const guard of [
      "exec005_validate_preference_tenant",
      "exec005_validate_preference_history_tenant",
      "exec005_validate_duplicate_review_tenant",
      "exec005_validate_merge_tenant",
      "exec005_validate_merge_dependency_tenant",
      "exec005_validate_deletion_request_tenant",
      "exec005_validate_audit_tenant",
    ]) {
      expect(hardening).toContain(`CREATE FUNCTION \"${guard}\"`);
    }
  });

  it("makes aliases and idempotency evidence immutable", () => {
    expect(hardening).toContain("customer_party_aliases_no_mutation");
    expect(hardening).toContain("customer_idempotency_keys_no_mutation");
    expect(hardening).toContain("customer party aliases are permanent");
    expect(hardening).toContain("customer idempotency evidence is immutable");
  });

  it("protects field and merge evidence while allowing one audited reversal", () => {
    expect(hardening).toContain("customer_party_fields_history_guard");
    expect(hardening).toContain("customer_party_merges_evidence_guard");
    expect(hardening).toContain("immutable except one reversal");
  });

  it("validates migrations only in disposable PostgreSQL", () => {
    expect(workflow).toContain("name: EXEC-005 Migration Validation");
    expect(workflow).toContain("permissions:\n  contents: read");
    expect(workflow).toContain("postgres:16");
    expect(workflow).toContain("npx prisma migrate diff");
    expect(workflow).toContain("--from-empty");
    expect(workflow).toContain("--to-schema prisma/schema.prisma");
    expect(workflow).toContain("--script");
    expect(workflow).not.toContain("prisma db push");
    expect(workflow).not.toContain("prisma migrate deploy");
    expect(workflow).toContain(
      "20260726043000_exec_004_organization_authority/migration.sql",
    );
    expect(workflow).toContain(
      "20260726123000_exec_005_customer_identity_lifecycle/migration.sql",
    );
    expect(workflow).toContain(
      "20260726124500_exec_005_customer_identity_integrity_hardening/migration.sql",
    );
    expect(workflow).toContain("production=false");
    expect(workflow).toContain("customer_data=false");
    expect(workflow).toContain("deployment=false");
  });

  it("contains no destructive data statement", () => {
    expect(hardening).not.toMatch(/DROP\s+(TABLE|COLUMN|TYPE)/i);
    expect(hardening).not.toMatch(/TRUNCATE|DELETE\s+FROM|UPDATE\s+\"?(leads|contacts|opportunities)\"?/i);
  });
});
