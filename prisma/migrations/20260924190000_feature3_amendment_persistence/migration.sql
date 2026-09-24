-- ORCA FINANCE-4 / Feature 3 — Contract Amendment persistence foundation.
-- Artifact only. This migration is NOT applied by this batch.
--
-- Scope:
--   1) required source_contract_version
--   2) tenant-scoped ContractAmendment -> Contract FK
--   3) narrow snapshot uniqueness to the lifecycle types that own it
--
-- Fail closed:
-- existing amendment rows are not guessed or backfilled. If any exist when
-- this migration is eventually applied, explicit reconciliation is required.

BEGIN;

DO $feature3_amendment_persistence$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "contract_amendments"
    LIMIT 1
  ) THEN
    RAISE EXCEPTION
      'FEATURE3_AMENDMENT_PERSISTENCE_BLOCKED: existing contract_amendments rows require explicit reconciliation before source_contract_version becomes required';
  END IF;
END
$feature3_amendment_persistence$;

-- AddColumn
ALTER TABLE "contract_amendments"
  ADD COLUMN "source_contract_version" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "contract_amendments"
  ADD CONSTRAINT "contract_amendments_tenant_id_contract_id_fkey"
  FOREIGN KEY ("tenant_id", "contract_id")
  REFERENCES "contracts"("tenant_id", "id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

-- The historical W1 uniqueness belongs to ISSUED snapshots only.
DROP INDEX "uq_contract_snapshots_tenant_draft_type";

CREATE UNIQUE INDEX "uq_contract_snapshots_tenant_draft_type"
  ON "contract_snapshots" ("tenant_id", "draft_id", "snapshot_type")
  WHERE "snapshot_type" = 'ISSUED';

-- Contract/version uniqueness belongs to SIGNED_OPERATIONAL snapshots only.
-- AMENDMENT_SOURCE / AMENDMENT_RESULT must be able to capture more than one
-- immutable snapshot over the lifetime of the same contract/version identity.
DROP INDEX "uq_contract_snapshots_tenant_contract_type_version";

CREATE UNIQUE INDEX "uq_contract_snapshots_tenant_contract_type_version"
  ON "contract_snapshots" (
    "tenant_id",
    "contract_id",
    "snapshot_type",
    "contract_version"
  )
  WHERE "snapshot_type" = 'SIGNED_OPERATIONAL';

COMMIT;
