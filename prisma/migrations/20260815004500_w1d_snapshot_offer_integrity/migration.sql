-- ORCA W1D — snapshot issuance + provider offer identity idempotency.
-- Additive only. No backfill, no row mutation, no production/customer-data action.

CREATE UNIQUE INDEX "uq_contract_snapshots_tenant_draft_type"
  ON "contract_snapshots" ("tenant_id", "draft_id", "snapshot_type");

CREATE UNIQUE INDEX "uq_finance_provider_offers_case_provider_reference"
  ON "finance_provider_offers" ("tenant_id", "finance_case_id", "provider", "provider_reference");
