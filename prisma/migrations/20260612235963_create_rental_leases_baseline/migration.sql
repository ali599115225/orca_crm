-- Restore the Rental Leases baseline. This table was never created through
-- a tracked Prisma migration; it was first introduced via the Prisma schema
-- (model RentalLease, see commit 1136cfb) and materialized against the
-- database through `prisma db push`, never through `prisma migrate`.
--
-- Confirmed Tier 0: zero tracked migrations ever ALTER this table (grep
-- over all migration.sql files for "rental_leases" returns nothing). The
-- historical body at commit 48a600d^ (the same cutoff point used for
-- payment_transactions and rental_invoices, immediately before
-- 20260614_add_paylink_gateway_fields) is byte-identical, column-for-column,
-- to the current schema.prisma shape -- there is no later column to exclude.
--
-- Legacy drift convergence (PRISMA_HISTORICAL_BASELINE_GATE): live legacy
-- databases carry vat_type as VARCHAR(20) NULL and vat_rate as NULL DEFAULT
-- 15.00, instead of schema.prisma's TEXT NOT NULL DEFAULT 'STANDARD' and
-- NUMERIC(5,2) NOT NULL DEFAULT 15.00 -- confirmed by direct
-- information_schema introspection of a Neon clone (28 existing rows, zero
-- NULLs in either column, vat_rate already NUMERIC(5,2) so no value is out
-- of range or scale). The existing-table branch below converges both
-- columns to the canonical schema.prisma shape: any NULL is backfilled to
-- the column's own already-effective default (no value invented), then the
-- column is widened/typed, defaulted, and constrained NOT NULL. No row is
-- altered beyond filling a NULL with the default it already implied.

DO $migration$
DECLARE
    r RECORD;
    actual_type TEXT;
    actual_nullable TEXT;
    actual_default TEXT;
    matching_count INTEGER;
BEGIN
    ---------------------------------------------------------------------------
    -- rental_leases
    ---------------------------------------------------------------------------
    IF to_regclass('public.rental_leases') IS NULL THEN
        CREATE TABLE public.rental_leases (
            id UUID NOT NULL DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            unit_id UUID,
            unit_name TEXT NOT NULL,
            tenant_name TEXT NOT NULL,
            start_date DATE NOT NULL,
            end_date DATE NOT NULL,
            rent_amount DECIMAL(12,2) NOT NULL,
            deposit DECIMAL(12,2) NOT NULL DEFAULT 0,
            currency TEXT NOT NULL DEFAULT 'SAR',
            status TEXT NOT NULL DEFAULT 'active',
            financial_ref TEXT,
            vat_type TEXT NOT NULL DEFAULT 'STANDARD',
            vat_rate DECIMAL(5,2) NOT NULL DEFAULT 15.00,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT rental_leases_pkey PRIMARY KEY (id),
            CONSTRAINT rental_leases_tenant_id_fkey FOREIGN KEY (tenant_id)
                REFERENCES public.tenants(id) ON DELETE CASCADE
        );
    ELSE
        -- Converge vat_type / vat_rate to the canonical schema.prisma shape
        -- (TEXT NOT NULL DEFAULT 'STANDARD' / NUMERIC(5,2) NOT NULL DEFAULT
        -- 15.00). Backfill any NULL with the column's own pre-existing
        -- default value first -- this fills a gap, it never overwrites or
        -- discards a non-NULL value -- so no data is lost.
        UPDATE public.rental_leases SET vat_type = 'STANDARD' WHERE vat_type IS NULL;
        ALTER TABLE public.rental_leases ALTER COLUMN vat_type TYPE TEXT;
        ALTER TABLE public.rental_leases ALTER COLUMN vat_type SET DEFAULT 'STANDARD';
        ALTER TABLE public.rental_leases ALTER COLUMN vat_type SET NOT NULL;

        UPDATE public.rental_leases SET vat_rate = 15.00 WHERE vat_rate IS NULL;
        ALTER TABLE public.rental_leases ALTER COLUMN vat_rate TYPE NUMERIC(5,2);
        ALTER TABLE public.rental_leases ALTER COLUMN vat_rate SET DEFAULT 15.00;
        ALTER TABLE public.rental_leases ALTER COLUMN vat_rate SET NOT NULL;

        FOR r IN
            SELECT *
            FROM (
                VALUES
                    ('id',            'uuid',                     'NO',  'uuid',      NULL),
                    ('tenant_id',     'uuid',                     'NO',  'none',      NULL),
                    ('unit_id',       'uuid',                     'YES', 'none',      NULL),
                    ('unit_name',     'text',                     'NO',  'none',      NULL),
                    ('tenant_name',   'text',                     'NO',  'none',      NULL),
                    ('start_date',    'date',                     'NO',  'none',      NULL),
                    ('end_date',      'date',                     'NO',  'none',      NULL),
                    ('rent_amount',   'numeric',                  'NO',  'none',      NULL),
                    ('deposit',       'numeric',                  'NO',  'contains',  '0'),
                    ('currency',      'text',                     'NO',  'contains',  'SAR'),
                    ('status',        'text',                     'NO',  'contains',  'active'),
                    ('financial_ref', 'text',                     'YES', 'none',      NULL),
                    ('vat_type',      'text',                     'NO',  'contains',  'STANDARD'),
                    ('vat_rate',      'numeric',                  'NO',  'contains',  '15.00'),
                    ('created_at',    'timestamp with time zone', 'NO',  'timestamp', NULL)
            ) AS expected(column_name, data_type, is_nullable, default_rule, default_token)
        LOOP
            SELECT c.data_type, c.is_nullable, c.column_default
            INTO actual_type, actual_nullable, actual_default
            FROM information_schema.columns c
            WHERE c.table_schema = 'public'
              AND c.table_name = 'rental_leases'
              AND c.column_name = r.column_name;

            IF NOT FOUND THEN
                RAISE EXCEPTION
                    'rental_leases.% is missing',
                    r.column_name;
            END IF;

            IF actual_type <> r.data_type THEN
                RAISE EXCEPTION
                    'rental_leases.%: type expected %, got %',
                    r.column_name, r.data_type, actual_type;
            END IF;

            IF actual_nullable <> r.is_nullable THEN
                RAISE EXCEPTION
                    'rental_leases.%: nullable expected %, got %',
                    r.column_name, r.is_nullable, actual_nullable;
            END IF;

            IF r.default_rule = 'none'
               AND actual_default IS NOT NULL THEN
                RAISE EXCEPTION
                    'rental_leases.%: expected no default, got %',
                    r.column_name, actual_default;

            ELSIF r.default_rule = 'uuid'
               AND COALESCE(actual_default, '') NOT ILIKE '%gen_random_uuid()%' THEN
                RAISE EXCEPTION
                    'rental_leases.%: expected gen_random_uuid() default, got %',
                    r.column_name, actual_default;

            ELSIF r.default_rule = 'contains'
               AND POSITION(LOWER(r.default_token) IN LOWER(COALESCE(actual_default, ''))) = 0 THEN
                RAISE EXCEPTION
                    'rental_leases.%: expected default containing %, got %',
                    r.column_name, r.default_token, actual_default;

            ELSIF r.default_rule = 'timestamp'
               AND LOWER(COALESCE(actual_default, '')) NOT LIKE '%current_timestamp%'
               AND LOWER(COALESCE(actual_default, '')) NOT LIKE '%now()%' THEN
                RAISE EXCEPTION
                    'rental_leases.%: expected timestamp default, got %',
                    r.column_name, actual_default;
            END IF;
        END LOOP;

        SELECT COUNT(*)
        INTO matching_count
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE n.nspname = 'public'
          AND t.relname = 'rental_leases'
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
                'rental_leases: expected primary key on id';
        END IF;
    END IF;

    ---------------------------------------------------------------------------
    -- Indexes (created outside DO block for IF NOT EXISTS support)
    ---------------------------------------------------------------------------
END
$migration$;

CREATE INDEX IF NOT EXISTS idx_rental_leases_tenant_id
    ON public.rental_leases (tenant_id);
