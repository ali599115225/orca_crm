-- Restore the Units baseline. This table was never created through a
-- tracked Prisma migration; it was first introduced via the Prisma schema
-- (model Unit, see commit 74e2375) and materialized against the database
-- through `prisma db push`, never through `prisma migrate`.
--
-- Unlike contracts/rental_invoices, no later tracked migration ever runs
-- ALTER TABLE on units itself (confirmed: only FOREIGN KEY constraints FROM
-- other tables, e.g. tours/contracts, reference units -- nothing adds or
-- removes a column on units). Therefore this baseline targets the CURRENT
-- schema.prisma shape directly, since there is no tracked migration point
-- to exclude later columns from, and the project's db-push workflow is the
-- only thing keeping real-database columns in sync with schema.prisma for
-- this table.
--
-- This migration's folder name (`20260612235961a_...`) is deliberately
-- between `20260612235961_create_mansour_chats_baseline` and
-- `20260612235962_create_contracts_baseline` (lexicographic sort), because
-- `contracts` has a NOT NULL foreign key on unit_id and must run after this.

DO $migration$
DECLARE
    r RECORD;
    actual_type TEXT;
    actual_nullable TEXT;
    actual_default TEXT;
    matching_count INTEGER;
BEGIN
    ---------------------------------------------------------------------------
    -- units
    ---------------------------------------------------------------------------
    IF to_regclass('public.units') IS NULL THEN
        CREATE TABLE public.units (
            id UUID NOT NULL DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            project_id UUID NOT NULL,
            unit_number TEXT NOT NULL,
            floor_position INTEGER NOT NULL,
            price_sar DECIMAL(12,2) NOT NULL,
            type TEXT DEFAULT 'شقة سكنية',
            area TEXT DEFAULT '120 م²',
            beds INTEGER,
            city TEXT,
            district TEXT,
            lat DOUBLE PRECISION,
            lng DOUBLE PRECISION,
            agent_name TEXT,
            description TEXT,
            media JSONB DEFAULT '[]',
            docs JSONB DEFAULT '[]',
            events JSONB DEFAULT '[]',
            handovers JSONB DEFAULT '[]',
            tour_type TEXT,
            tour_url TEXT,
            status TEXT NOT NULL DEFAULT 'Available',
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT units_pkey PRIMARY KEY (id),
            CONSTRAINT uq_project_unit_number UNIQUE (project_id, unit_number),
            CONSTRAINT units_tenant_id_fkey FOREIGN KEY (tenant_id)
                REFERENCES public.tenants(id) ON DELETE CASCADE,
            CONSTRAINT units_project_id_fkey FOREIGN KEY (project_id)
                REFERENCES public.projects(id) ON DELETE CASCADE
        );
    ELSE
        FOR r IN
            SELECT *
            FROM (
                VALUES
                    ('id',             'uuid',                     'NO',  'uuid',      NULL),
                    ('tenant_id',      'uuid',                     'NO',  'none',      NULL),
                    ('project_id',     'uuid',                     'NO',  'none',      NULL),
                    ('unit_number',    'text',                     'NO',  'none',      NULL),
                    ('floor_position', 'integer',                  'NO',  'none',      NULL),
                    ('price_sar',      'numeric',                  'NO',  'none',      NULL),
                    ('status',         'text',                     'NO',  'contains',  'Available'),
                    ('created_at',     'timestamp with time zone', 'NO',  'timestamp', NULL),
                    ('updated_at',     'timestamp with time zone', 'NO',  'timestamp', NULL)
            ) AS expected(column_name, data_type, is_nullable, default_rule, default_token)
        LOOP
            SELECT c.data_type, c.is_nullable, c.column_default
            INTO actual_type, actual_nullable, actual_default
            FROM information_schema.columns c
            WHERE c.table_schema = 'public'
              AND c.table_name = 'units'
              AND c.column_name = r.column_name;

            IF NOT FOUND THEN
                RAISE EXCEPTION
                    'units.% is missing',
                    r.column_name;
            END IF;

            IF actual_type <> r.data_type THEN
                RAISE EXCEPTION
                    'units.%: type expected %, got %',
                    r.column_name, r.data_type, actual_type;
            END IF;

            IF actual_nullable <> r.is_nullable THEN
                RAISE EXCEPTION
                    'units.%: nullable expected %, got %',
                    r.column_name, r.is_nullable, actual_nullable;
            END IF;

            IF r.default_rule = 'none'
               AND actual_default IS NOT NULL THEN
                RAISE EXCEPTION
                    'units.%: expected no default, got %',
                    r.column_name, actual_default;

            ELSIF r.default_rule = 'uuid'
               AND COALESCE(actual_default, '') NOT ILIKE '%gen_random_uuid()%' THEN
                RAISE EXCEPTION
                    'units.%: expected gen_random_uuid() default, got %',
                    r.column_name, actual_default;

            ELSIF r.default_rule = 'contains'
               AND POSITION(LOWER(r.default_token) IN LOWER(COALESCE(actual_default, ''))) = 0 THEN
                RAISE EXCEPTION
                    'units.%: expected default containing %, got %',
                    r.column_name, r.default_token, actual_default;

            ELSIF r.default_rule = 'timestamp'
               AND LOWER(COALESCE(actual_default, '')) NOT LIKE '%current_timestamp%'
               AND LOWER(COALESCE(actual_default, '')) NOT LIKE '%now()%' THEN
                RAISE EXCEPTION
                    'units.%: expected timestamp default, got %',
                    r.column_name, actual_default;
            END IF;
        END LOOP;

        -- Remaining nullable/free-form columns (type, area, beds, city,
        -- district, lat, lng, agent_name, description, media, docs, events,
        -- handovers, tour_type, tour_url) are only checked for EXISTENCE,
        -- since they carry no constraint any later migration depends on.
        FOR r IN
            SELECT unnest(ARRAY[
                'type', 'area', 'beds', 'city', 'district', 'lat', 'lng',
                'agent_name', 'description', 'media', 'docs', 'events',
                'handovers', 'tour_type', 'tour_url'
            ]) AS column_name
        LOOP
            PERFORM 1
            FROM information_schema.columns c
            WHERE c.table_schema = 'public'
              AND c.table_name = 'units'
              AND c.column_name = r.column_name;

            IF NOT FOUND THEN
                RAISE EXCEPTION
                    'units.% is missing',
                    r.column_name;
            END IF;
        END LOOP;

        SELECT COUNT(*)
        INTO matching_count
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE n.nspname = 'public'
          AND t.relname = 'units'
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
                'units: expected primary key on id';
        END IF;
    END IF;

    ---------------------------------------------------------------------------
    -- Indexes (created outside DO block for IF NOT EXISTS support)
    ---------------------------------------------------------------------------
END
$migration$;

CREATE INDEX IF NOT EXISTS idx_units_project_id
    ON public.units (project_id);

CREATE INDEX IF NOT EXISTS idx_units_tenant_id
    ON public.units (tenant_id);
