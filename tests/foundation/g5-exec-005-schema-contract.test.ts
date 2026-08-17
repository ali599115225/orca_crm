import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const MIGRATION = path.join(
  process.cwd(),
  "prisma/migration-evidence/non-production/20260726123000_exec_005_customer_identity_lifecycle/migration.sql",
);

const sql = readFileSync(MIGRATION, "utf8");

const requiredTables = [
  "customer_parties",
  "customer_party_aliases",
  "customer_party_fields",
  "customer_accounts_v2",
  "customer_account_contacts",
  "customer_leads_v2",
  "customer_opportunities_v2",
  "customer_opportunity_history",
  "customer_communication_preferences",
  "customer_communication_preference_history",
  "customer_duplicate_reviews",
  "customer_party_merges",
  "customer_party_merge_dependencies",
  "customer_retention_policies",
  "customer_deletion_requests",
  "customer_idempotency_keys",
  "customer_identity_audit",
] as const;

describe("EXEC-005 additive schema contract", () => {
  it("creates every frozen identity and lifecycle table additively", () => {
    for (const table of requiredTables) {
      expect(sql).toContain(`CREATE TABLE "${table}"`);
    }
    expect(sql).not.toMatch(/DROP\s+(TABLE|COLUMN|TYPE)/i);
    expect(sql).not.toMatch(/TRUNCATE|DELETE\s+FROM|UPDATE\s+"?(leads|contacts|opportunities)"?/i);
  });

  it("keeps legacy compatibility references without backfill", () => {
    expect(sql).toContain('"legacy_lead_id" UUID');
    expect(sql).toContain('REFERENCES "leads"("id")');
    expect(sql).toContain('"legacy_opportunity_id" UUID');
    expect(sql).toContain('REFERENCES "opportunities"("id")');
    expect(sql).toContain("No backfill is performed by this migration");
  });

  it("enforces deterministic lifecycle, idempotency and merge constraints", () => {
    expect(sql).toContain("customer_leads_v2_conversion_idempotency_key");
    expect(sql).toContain("customer_party_merges_idempotency_key");
    expect(sql).toContain("customer_party_merges_sod_check");
    expect(sql).toContain("customer_party_merges_no_self_check");
    expect(sql).toContain("customer_opportunities_v2_stage_check");
    expect(sql).toContain("customer_opportunities_v2_lost_reason_check");
  });

  it("enforces organization scope and append-only history", () => {
    expect(sql).toContain("exec005_validate_customer_scope");
    expect(sql).toContain("customer_parties_scope_guard");
    expect(sql).toContain("customer_opportunities_v2_scope_guard");
    expect(sql).toContain("exec005_deny_audit_mutation");
    expect(sql).toContain("customer_identity_audit_no_update");
    expect(sql).toContain("customer_opportunity_history_no_update");
    expect(sql).toContain("customer_communication_history_no_update");
  });

  it("documents that migration execution and customer data are unauthorized", () => {
    expect(sql).toContain("DO NOT execute against Production or customer data");
    expect(sql).toContain("separate migration/data authorization");
  });
});
