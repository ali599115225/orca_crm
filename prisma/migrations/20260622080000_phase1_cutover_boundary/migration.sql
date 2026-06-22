-- ORCA Phase 1 cutover boundary.
-- Existing contracts and completed payments remain immutable legacy history.
-- New contracts use spine version 2 and the strict quote-to-cash lifecycle.

ALTER TABLE "contracts"
  ADD COLUMN IF NOT EXISTS "spine_version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "legacy_financial" BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS "legacy_reason" TEXT;

UPDATE "contracts"
SET
  "spine_version" = 1,
  "legacy_financial" = TRUE,
  "legacy_reason" = COALESCE("legacy_reason", 'PRE_PHASE1_CUTOVER_HISTORY');

ALTER TABLE "contracts" ALTER COLUMN "spine_version" SET DEFAULT 2;
ALTER TABLE "contracts" ALTER COLUMN "legacy_financial" SET DEFAULT FALSE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'contracts_spine_version_ck'
  ) THEN
    ALTER TABLE "contracts"
      ADD CONSTRAINT "contracts_spine_version_ck"
      CHECK ("spine_version" >= 1);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_contracts_tenant_spine_legacy"
  ON "contracts"("tenant_id", "spine_version", "legacy_financial");

-- Repair the known Prisma/SQL naming drift without changing journal data.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'journal_entries'
      AND column_name = 'entryNumber'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'journal_entries'
      AND column_name = 'entry_number'
  ) THEN
    ALTER TABLE "journal_entries" RENAME COLUMN "entryNumber" TO "entry_number";
  END IF;
END $$;
