-- ORCA Batch 05 — rollback ARTIFACT for
-- prisma/migrations/20260923_final_architecture_persistence_readiness/migration.sql
-- NOT EXECUTED by this change. Reverses only the objects that migration added.
-- It never drops contracts, documents, contract_snapshots or any other W1
-- foundation table, and deletes no rows.
--
-- WARNING: draft_id / template_version_id NOT NULL is only restored after
-- SIGNED_OPERATIONAL rows have been removed and verified by an operator.
-- If any snapshot row still lacks draft_id or template_version_id, this
-- script aborts before changing anything (the whole transaction rolls back).
--
-- WARNING: G3 provenance. Production may already have had a complete G3
-- installation before this migration ever ran (in which case the migration
-- skipped G3 creation entirely). This script must never drop G3 objects it
-- did not create. It drops G3 only when it finds the ORCA_G3_PROVENANCE
-- marker this migration writes on org_units at the moment it creates G3
-- from a zero state. If that marker is absent, every G3 object is left
-- untouched — fail safe toward preservation, never toward deletion.

BEGIN;

DO $$
DECLARE
  blocking BIGINT;
BEGIN
  SELECT count(*) INTO blocking
  FROM contract_snapshots
  WHERE snapshot_type = 'SIGNED_OPERATIONAL'
     OR draft_id IS NULL
     OR template_version_id IS NULL;
  IF blocking > 0 THEN
    RAISE EXCEPTION 'ROLLBACK_BLOCKED % contract_snapshots rows are SIGNED_OPERATIONAL or lack draft/template; remove and verify them first', blocking;
  END IF;
END
$$;

-- ContractDelivery
DROP TABLE IF EXISTS "contract_deliveries";

-- ContractSnapshot extension
ALTER TABLE "contract_snapshots" DROP CONSTRAINT IF EXISTS "contract_snapshots_tenant_id_contract_id_fkey";
DROP INDEX IF EXISTS "uq_contract_snapshots_tenant_contract_type_version";
ALTER TABLE "contract_snapshots" DROP CONSTRAINT IF EXISTS "contract_snapshots_signed_operational_identity_ck";
ALTER TABLE "contract_snapshots"
  DROP COLUMN IF EXISTS "signature_evidence_hash",
  DROP COLUMN IF EXISTS "contract_version";
ALTER TABLE "contract_snapshots"
  ALTER COLUMN "draft_id" SET NOT NULL,
  ALTER COLUMN "template_version_id" SET NOT NULL;

-- Document <-> Contract association
ALTER TABLE "documents" DROP CONSTRAINT IF EXISTS "documents_tenant_id_contract_id_fkey";
DROP INDEX IF EXISTS "idx_documents_tenant_contract";
DROP INDEX IF EXISTS "uq_documents_tenant_id";
ALTER TABLE "documents" DROP COLUMN IF EXISTS "contract_id";

-- Contract composite tenant identity
DROP INDEX IF EXISTS "uq_contracts_tenant_id";

-- G3 persistence — provenance-guarded. Only drop G3 objects if the
-- ORCA_G3_PROVENANCE marker (written on org_units when this migration
-- created G3 from a zero state) is present. If the marker is absent, G3
-- predates this migration (or was already fully installed when it ran and
-- was left untouched by the reconciliation skip branch) and must be
-- preserved in full.
DO $g3_rollback$
DECLARE
  g3_created_by_this_migration BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM pg_description d
    JOIN pg_class c ON c.oid = d.objoid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'org_units'
      AND d.description = 'ORCA_G3_PROVENANCE:20260923_final_architecture_persistence_readiness'
  ) INTO g3_created_by_this_migration;

  IF g3_created_by_this_migration THEN
    RAISE NOTICE 'ROLLBACK: ORCA_G3_PROVENANCE marker found on org_units — this migration created G3 from a zero state; dropping G3 objects.';
    EXECUTE $ddl$
DROP TABLE IF EXISTS "authorization_audits";
DROP TABLE IF EXISTS "role_assignments";
DROP TABLE IF EXISTS "access_role_permissions";
DROP TABLE IF EXISTS "access_roles";
DROP TABLE IF EXISTS "access_permissions";
DROP TABLE IF EXISTS "org_assignments";
DROP TABLE IF EXISTS "org_units";
DROP TYPE IF EXISTS "authorization_decision";
DROP TYPE IF EXISTS "authorization_mode";
DROP TYPE IF EXISTS "role_assignment_status";
DROP TYPE IF EXISTS "access_scope_type";
DROP TYPE IF EXISTS "org_assignment_status";
DROP TYPE IF EXISTS "org_unit_type";
    $ddl$;
  ELSE
    RAISE NOTICE 'ROLLBACK: no ORCA_G3_PROVENANCE marker on org_units — G3 predates this migration or was left untouched by the reconciliation skip; preserving all G3 objects.';
  END IF;
END
$g3_rollback$;

COMMIT;
