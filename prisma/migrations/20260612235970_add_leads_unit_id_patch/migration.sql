-- Patch: add the missing `leads.unit_id` column. The `leads` table itself
-- is created correctly by 20260524004442_init_database and is not rebuilt
-- here. This single column was introduced via the Prisma schema (model
-- Lead, field unitId, see commit be80185) and materialized only through
-- `prisma db push`, never through a tracked `prisma migrate` migration --
-- confirmed by a full search across every migration.sql file for any
-- ALTER TABLE leads ADD COLUMN unit_id, which returns zero hits.
--
-- Verified byte-identical declaration ("unitId String? @map(\"unit_id\")
-- @db.Uuid") at its introduction (be80185), at the cutoff point immediately
-- before 20260621000300_offer_unit_integrity (358cd40^), and in the current
-- schema.prisma -- see LEADS_UNIT_ID_TEMPORAL_PATCH_BLUEPRINT.md.
--
-- No @relation was ever declared for this field (no FK), and no
-- @@index([unitId]) was ever declared (no index). Plain nullable UUID
-- column, no default.

DO $migration$
DECLARE
    actual_type TEXT;
    actual_nullable TEXT;
    actual_default TEXT;
BEGIN
    IF to_regclass('public.leads') IS NULL THEN
        RAISE EXCEPTION
            'leads_unit_id_patch: table "leads" does not exist -- expected it to already be created by 20260524004442_init_database before this patch runs';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'unit_id'
    ) THEN
        -- Column already present (partially evolved database) -- verify shape only.
        SELECT data_type, is_nullable, column_default
        INTO actual_type, actual_nullable, actual_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'unit_id';

        IF actual_type <> 'uuid' THEN
            RAISE EXCEPTION 'leads.unit_id: type expected uuid, got %', actual_type;
        END IF;

        IF actual_nullable <> 'YES' THEN
            RAISE EXCEPTION 'leads.unit_id: expected nullable, got %', actual_nullable;
        END IF;

        IF actual_default IS NOT NULL THEN
            RAISE EXCEPTION 'leads.unit_id: expected no default, got %', actual_default;
        END IF;
    ELSE
        -- Column missing (the state proven on a fresh database) -- add it
        -- in its historically correct, original shape.
        ALTER TABLE public.leads ADD COLUMN unit_id UUID;
    END IF;
END
$migration$;
