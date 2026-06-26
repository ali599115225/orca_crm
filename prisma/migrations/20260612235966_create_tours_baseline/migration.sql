-- Restore the Tours baseline. This table was never created through a
-- tracked Prisma migration; it was first introduced via the Prisma schema
-- (model Tour, see commit be80185) and materialized against the database
-- through `prisma db push`, never through `prisma migrate`.
--
-- Body verified stable across its entire pre-transaction_spine history (no
-- intermediate evolution -- see TOURS_TEMPORAL_BASELINE_BLUEPRINT.md).
--
-- FK scope: TENANT_ONLY. lead_id and assigned_to are present as raw UUID
-- columns at this point with NO foreign key constraint -- confirmed by
-- direct reading of 20260621000200_transaction_spine, which adds
-- "ADD CONSTRAINT tours_lead_id_fkey"/"tours_assigned_to_fkey" as new
-- constraints on already-existing columns (no ADD COLUMN for either).
-- Adding those FKs here, ahead of schedule, would be historically incorrect
-- and is deliberately not done.
--
-- Columns added by later migrations are intentionally excluded:
-- - opportunity_id, unit_id: added by 20260621000200_transaction_spine
-- - offer_id: added by 20260621000500_add_tour_offer_relation
-- - status enum conversion (TEXT -> TourStatus): done by transaction_spine;
--   baseline keeps status as plain TEXT DEFAULT 'SCHEDULED'

DO $migration$
DECLARE
    r RECORD;
    actual_type TEXT;
    actual_nullable TEXT;
    actual_default TEXT;
    matching_count INTEGER;
BEGIN
    ---------------------------------------------------------------------------
    -- tours
    ---------------------------------------------------------------------------
    IF to_regclass('public.tours') IS NULL THEN
        CREATE TABLE public.tours (
            id UUID NOT NULL DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            lead_id UUID NOT NULL,
            assigned_to UUID NOT NULL,
            start_at TIMESTAMPTZ NOT NULL,
            end_at TIMESTAMPTZ NOT NULL,
            location TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'SCHEDULED',
            attendees INTEGER NOT NULL DEFAULT 1,
            notes TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_by UUID,
            updated_by UUID,
            audit_log TEXT,
            CONSTRAINT tours_pkey PRIMARY KEY (id),
            CONSTRAINT tours_tenant_id_fkey FOREIGN KEY (tenant_id)
                REFERENCES public.tenants(id) ON DELETE CASCADE
        );
    ELSE
        FOR r IN
            SELECT *
            FROM (
                VALUES
                    ('id',          'uuid',                     'NO',  'uuid',      NULL),
                    ('tenant_id',   'uuid',                     'NO',  'none',      NULL),
                    ('lead_id',     'uuid',                     'NO',  'none',      NULL),
                    ('assigned_to', 'uuid',                     'NO',  'none',      NULL),
                    ('start_at',    'timestamp with time zone', 'NO',  'none',      NULL),
                    ('end_at',      'timestamp with time zone', 'NO',  'none',      NULL),
                    ('location',    'text',                     'NO',  'none',      NULL),
                    ('attendees',   'integer',                  'NO',  'contains',  '1'),
                    ('notes',       'text',                     'YES', 'none',      NULL),
                    ('created_at',  'timestamp with time zone', 'NO',  'timestamp', NULL),
                    ('updated_at',  'timestamp with time zone', 'NO',  'timestamp', NULL),
                    ('created_by',  'uuid',                     'YES', 'none',      NULL),
                    ('updated_by',  'uuid',                     'YES', 'none',      NULL),
                    ('audit_log',   'text',                     'YES', 'none',      NULL)
            ) AS expected(column_name, data_type, is_nullable, default_rule, default_token)
        LOOP
            SELECT c.data_type, c.is_nullable, c.column_default
            INTO actual_type, actual_nullable, actual_default
            FROM information_schema.columns c
            WHERE c.table_schema = 'public'
              AND c.table_name = 'tours'
              AND c.column_name = r.column_name;

            IF NOT FOUND THEN
                RAISE EXCEPTION
                    'tours.% is missing',
                    r.column_name;
            END IF;

            IF actual_type <> r.data_type THEN
                RAISE EXCEPTION
                    'tours.%: type expected %, got %',
                    r.column_name, r.data_type, actual_type;
            END IF;

            IF actual_nullable <> r.is_nullable THEN
                RAISE EXCEPTION
                    'tours.%: nullable expected %, got %',
                    r.column_name, r.is_nullable, actual_nullable;
            END IF;

            IF r.default_rule = 'none'
               AND actual_default IS NOT NULL THEN
                RAISE EXCEPTION
                    'tours.%: expected no default, got %',
                    r.column_name, actual_default;

            ELSIF r.default_rule = 'uuid'
               AND COALESCE(actual_default, '') NOT ILIKE '%gen_random_uuid()%' THEN
                RAISE EXCEPTION
                    'tours.%: expected gen_random_uuid() default, got %',
                    r.column_name, actual_default;

            ELSIF r.default_rule = 'contains'
               AND POSITION(LOWER(r.default_token) IN LOWER(COALESCE(actual_default, ''))) = 0 THEN
                RAISE EXCEPTION
                    'tours.%: expected default containing %, got %',
                    r.column_name, r.default_token, actual_default;

            ELSIF r.default_rule = 'timestamp'
               AND LOWER(COALESCE(actual_default, '')) NOT LIKE '%current_timestamp%'
               AND LOWER(COALESCE(actual_default, '')) NOT LIKE '%now()%' THEN
                RAISE EXCEPTION
                    'tours.%: expected timestamp default, got %',
                    r.column_name, actual_default;
            END IF;
        END LOOP;

        -- status is checked for existence/type only: by the time this
        -- baseline runs against a partially-evolved real database, status
        -- may already have been converted to the TourStatus enum by
        -- transaction_spine, so asserting a fixed TEXT default here would
        -- be unsafe.
        PERFORM 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'tours' AND column_name = 'status';
        IF NOT FOUND THEN
            RAISE EXCEPTION 'tours.status is missing';
        END IF;

        SELECT COUNT(*)
        INTO matching_count
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE n.nspname = 'public'
          AND t.relname = 'tours'
          AND c.contype = 'p'
          AND (
              SELECT ARRAY_AGG(a.attname::text ORDER BY key_column.ordinality)
              FROM UNNEST(c.conkey) WITH ORDINALITY
                   AS key_column(attnum, ordinality)
              JOIN pg_attribute a
                ON a.attrelid = c.conrelid
               AND a.attnum = key_column.attnum
          ) = ARRAY['id']::TEXT[];

        IF matching_count <> 1 THEN
            RAISE EXCEPTION
                'tours: expected primary key on id';
        END IF;
    END IF;
END
$migration$;
