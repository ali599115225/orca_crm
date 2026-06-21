-- ORCA CRM Security Final Core

ALTER TABLE "tenants"
  ADD COLUMN IF NOT EXISTS "next_journal_number" INTEGER,
  ADD COLUMN IF NOT EXISTS "leads_webhook_key_id" TEXT,
  ADD COLUMN IF NOT EXISTS "encrypted_leads_webhook_secret" TEXT,
  ADD COLUMN IF NOT EXISTS "leads_webhook_secret_updated_at" TIMESTAMPTZ;

UPDATE "tenants"
SET "next_journal_number" = COALESCE("next_journal_number", 1);

DO $$
DECLARE
  entry_column TEXT;
  tenant_column TEXT;
BEGIN
  IF to_regclass('public.journal_entries') IS NOT NULL THEN
    SELECT column_name
    INTO entry_column
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'journal_entries'
      AND column_name IN ('entryNumber', 'entry_number')
    ORDER BY CASE WHEN column_name = 'entryNumber' THEN 0 ELSE 1 END
    LIMIT 1;

    SELECT column_name
    INTO tenant_column
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'journal_entries'
      AND column_name IN ('tenant_id', 'tenantId')
    ORDER BY CASE WHEN column_name = 'tenant_id' THEN 0 ELSE 1 END
    LIMIT 1;

    IF entry_column IS NOT NULL AND tenant_column IS NOT NULL THEN
      EXECUTE format(
        'UPDATE public.tenants AS t
         SET next_journal_number = GREATEST(
           COALESCE(t.next_journal_number, 1),
           COALESCE(
             (SELECT MAX(j.%I) + 1
              FROM public.journal_entries AS j
              WHERE j.%I = t.id),
             1
           )
         )',
        entry_column,
        tenant_column
      );

      EXECUTE format(
        'CREATE UNIQUE INDEX IF NOT EXISTS journal_entries_tenant_entry_number_uq
         ON public.journal_entries (%I, %I)',
        tenant_column,
        entry_column
      );
    END IF;
  END IF;
END $$;

ALTER TABLE "tenants"
  ALTER COLUMN "next_journal_number" SET DEFAULT 1,
  ALTER COLUMN "next_journal_number" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "tenants_leads_webhook_key_id_key"
  ON "tenants" ("leads_webhook_key_id");