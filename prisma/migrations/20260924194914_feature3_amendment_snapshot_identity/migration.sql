-- ORCA FINANCE-4 / Feature 3 — F3-2A Amendment Snapshot Identity Remediation.
--
-- Scope: widen contract_snapshots_signed_operational_identity_ck from two
-- branches to three, so AMENDMENT_SOURCE / AMENDMENT_RESULT snapshots can be
-- identified by (contract_id, contract_version) instead of being forced
-- through the draft_id/template_version_id branch that only ever fit the
-- pre-signing W1 ISSUED workflow.
--
-- No table/column/index change. No data UPDATE/INSERT/DELETE/backfill.
-- Does not touch the already-preserved F3-1 migration
-- (20260924190000_feature3_amendment_persistence) or its two partial
-- unique indexes.

BEGIN;

-- Preflight: fail closed unless the live constraint is exactly the known
-- pre-F3-2A two-branch definition. Uses pg_get_constraintdef, which returns
-- PostgreSQL's own normalized/parenthesized text for the parsed expression
-- tree (stable regardless of the original migration's source formatting),
-- so this is a catalog-level structural check rather than a brittle
-- whitespace-sensitive string comparison against migration source text.
DO $f3_2a_amendment_snapshot_identity$
DECLARE
  current_def text;
BEGIN
  SELECT pg_get_constraintdef(oid) INTO current_def
  FROM pg_constraint
  WHERE conname = 'contract_snapshots_signed_operational_identity_ck'
    AND conrelid = 'public.contract_snapshots'::regclass;

  IF current_def IS NULL THEN
    RAISE EXCEPTION
      'F3_2A_AMENDMENT_SNAPSHOT_IDENTITY_BLOCKED: contract_snapshots_signed_operational_identity_ck not found; refusing to guess a replacement.';
  END IF;

  IF current_def <> 'CHECK ((((snapshot_type = ''SIGNED_OPERATIONAL''::text) AND (contract_id IS NOT NULL) AND (contract_version IS NOT NULL) AND (signed_at IS NOT NULL) AND (signature_evidence_hash IS NOT NULL) AND ((signature_evidence_hash)::text ~ ''^[0-9a-f]{64}$''::text)) OR ((snapshot_type <> ''SIGNED_OPERATIONAL''::text) AND (draft_id IS NOT NULL) AND (template_version_id IS NOT NULL))))' THEN
    RAISE EXCEPTION
      'F3_2A_AMENDMENT_SNAPSHOT_IDENTITY_BLOCKED: contract_snapshots_signed_operational_identity_ck definition does not match the expected pre-F3-2A two-branch predicate (found: %); refusing to replace an unknown constraint.',
      current_def;
  END IF;
END
$f3_2a_amendment_snapshot_identity$;

ALTER TABLE "contract_snapshots"
  DROP CONSTRAINT "contract_snapshots_signed_operational_identity_ck";

-- Three semantic branches:
--   1) SIGNED_OPERATIONAL — unchanged: signed contract identity required.
--   2) AMENDMENT_SOURCE / AMENDMENT_RESULT — contract/version identity only.
--   3) everything else (W1 ISSUED and any future unknown type) — unchanged:
--      draft/template identity required, closing the branch so unknown
--      types never silently gain amendment-style privileges.
ALTER TABLE "contract_snapshots"
  ADD CONSTRAINT "contract_snapshots_signed_operational_identity_ck"
  CHECK (
    (
      "snapshot_type" = 'SIGNED_OPERATIONAL'
      AND "contract_id" IS NOT NULL
      AND "contract_version" IS NOT NULL
      AND "signed_at" IS NOT NULL
      AND "signature_evidence_hash" IS NOT NULL
      AND "signature_evidence_hash" ~ '^[0-9a-f]{64}$'
    )
    OR (
      "snapshot_type" IN ('AMENDMENT_SOURCE', 'AMENDMENT_RESULT')
      AND "contract_id" IS NOT NULL
      AND "contract_version" IS NOT NULL
    )
    OR (
      "snapshot_type" <> 'SIGNED_OPERATIONAL'
      AND "snapshot_type" NOT IN ('AMENDMENT_SOURCE', 'AMENDMENT_RESULT')
      AND "draft_id" IS NOT NULL
      AND "template_version_id" IS NOT NULL
    )
  );

COMMIT;
