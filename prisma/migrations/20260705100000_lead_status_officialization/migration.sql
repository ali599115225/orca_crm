-- Lead page closure — STRUCTURE ONLY (no data backfill).
-- `status` is the single source of truth; the legacy `stage` column is kept
-- temporarily for compatibility and is NOT dropped or rewritten here.
-- Do NOT run against production automatically; apply through the normal
-- release process only.

-- 1) Official status values (additive, idempotent, no enum recreation).
ALTER TYPE "LeadStatus" ADD VALUE IF NOT EXISTS 'QUALIFIED';
ALTER TYPE "LeadStatus" ADD VALUE IF NOT EXISTS 'NEGOTIATION';

-- 2) Archive support (archiving is not deletion).
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "is_archived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "archived_at" TIMESTAMPTZ;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "archive_reason" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "archived_by_id" UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'leads_archived_by_id_fkey'
  ) THEN
    ALTER TABLE "leads"
      ADD CONSTRAINT "leads_archived_by_id_fkey"
      FOREIGN KEY ("archived_by_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- 3) Listing index for tenant-scoped, archive-aware, status-filtered queries.
CREATE INDEX IF NOT EXISTS "idx_leads_tenant_archived_status"
  ON "leads" ("tenant_id", "is_archived", "status");
