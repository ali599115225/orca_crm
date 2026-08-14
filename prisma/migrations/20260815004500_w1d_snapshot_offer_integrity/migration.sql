-- ORCA W1D — snapshot issuance idempotency.
-- Additive only. No backfill, no row mutation, no production/customer-data action.

CREATE UNIQUE INDEX "uq_contract_snapshots_tenant_draft_type"
  ON "contract_snapshots" ("tenant_id", "draft_id", "snapshot_type");
