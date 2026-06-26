-- Restore the Contracts baseline. This table predates the Prisma migration
-- history entirely: it was first introduced via the Prisma schema (model
-- Contract, see commit 74e2375) and several of its columns (tenant_id,
-- end_date, status, vat_type, vat_rate) were materialized against the
-- database through `prisma db push`, never through `prisma migrate`.
--
-- The shape below reflects schema.prisma exactly as it stood at commit
-- a60a604 (the commit that introduces 20260613_add_hash_columns), minus the
-- one column that migration itself adds.
--
-- Columns added by later migrations are intentionally excluded:
-- - buyer_phone_hash: added by 20260613_add_hash_columns
-- - lead_id, offer_id: added by 20260621000200_transaction_spine
-- - accepted_at, reservation_expires_at, cancelled_at, cancel_reason, version:
--   added by 20260622060000_phase1_quote_to_cash_closure
-- - spine_version, legacy_financial, legacy_reason:
--   added by 20260622080000_phase1_cutover_boundary
--
-- status default at this point in history is 'Active' (changed to
-- 'PENDING_SIGNATURE' later by 20260622060000_phase1_quote_to_cash_closure).
-- signed_at is NOT NULL DEFAULT CURRENT_TIMESTAMP at this point (later
-- relaxed to nullable, no default, by the same migration).

DO $migration$
DECLARE
    r RECORD;
    actual_type TEXT;
    actual_nullable TEXT;
    actual_default TEXT;
    matching_count INTEGER;
BEGIN
    ---------------------------------------------------------------------------
    -- contracts
    ---------------------------------------------------------------------------
    IF to_regclass('public.contracts') IS NULL THEN
        CREATE TABLE public.contracts (
            id UUID NOT NULL DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            unit_id UUID NOT NULL,
            buyer_name TEXT NOT NULL,
            buyer_phone TEXT NOT NULL,
            total_volume_sar DECIMAL(12,2) NOT NULL,
            signed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            end_date TIMESTAMPTZ,
            status TEXT NOT NULL DEFAULT 'Active',
            vat_type TEXT NOT NULL DEFAULT 'STANDARD',
            vat_rate DECIMAL(5,2) NOT NULL DEFAULT 15.00,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT contracts_pkey PRIMARY KEY (id),
            CONSTRAINT contracts_unit_id_key UNIQUE (unit_id),
            CONSTRAINT contracts_tenant_id_fkey FOREIGN KEY (tenant_id)
                REFERENCES public.tenants(id) ON DELETE CASCADE,
            CONSTRAINT contracts_unit_id_fkey FOREIGN KEY (unit_id)
                REFERENCES public.units(id) ON DELETE RESTRICT
        );
    ELSE
        FOR r IN
            SELECT *
            FROM (
                VALUES
                    ('id',               'uuid',    'NO',  'uuid',      NULL),
                    ('tenant_id',        'uuid',    'NO',  'none',      NULL),
                    ('unit_id',          'uuid',    'NO',  'none',      NULL),
                    ('buyer_name',       'text',    'NO',  'none',      NULL),
                    ('buyer_phone',      'text',    'NO',  'none',      NULL),
                    ('total_volume_sar', 'numeric', 'NO',  'none',      NULL),
                    ('signed_at',        'timestamp with time zone', 'YES', 'none', NULL),
                    ('end_date',         'timestamp with time zone', 'YES', 'none', NULL),
                    ('status',           'text',    'NO',  'none',      NULL),
                    ('vat_type',         'text',    'NO',  'contains',  'STANDARD'),
                    ('vat_rate',         'numeric', 'NO',  'none',      NULL),
                    ('created_at',       'timestamp with time zone', 'NO', 'timestamp', NULL)
            ) AS expected(column_name, data_type, is_nullable, default_rule, default_token)
        LOOP
            SELECT c.data_type, c.is_nullable, c.column_default
            INTO actual_type, actual_nullable, actual_default
            FROM information_schema.columns c
            WHERE c.table_schema = 'public'
              AND c.table_name = 'contracts'
              AND c.column_name = r.column_name;

            IF NOT FOUND THEN
                RAISE EXCEPTION
                    'contracts.% is missing',
                    r.column_name;
            END IF;

            IF actual_type <> r.data_type THEN
                RAISE EXCEPTION
                    'contracts.%: type expected %, got %',
                    r.column_name, r.data_type, actual_type;
            END IF;

            -- nullability is checked loosely here: signed_at was later
            -- relaxed from NOT NULL to nullable by 20260622060000, so an
            -- already-migrated database may show either state depending on
            -- when this baseline runs relative to that migration.
            IF r.column_name NOT IN ('signed_at') AND actual_nullable <> r.is_nullable THEN
                RAISE EXCEPTION
                    'contracts.%: nullable expected %, got %',
                    r.column_name, r.is_nullable, actual_nullable;
            END IF;

            IF r.default_rule = 'none'
               AND r.column_name NOT IN ('signed_at', 'status', 'total_volume_sar', 'vat_rate')
               AND actual_default IS NOT NULL THEN
                RAISE EXCEPTION
                    'contracts.%: expected no default, got %',
                    r.column_name, actual_default;

            ELSIF r.default_rule = 'uuid'
               AND COALESCE(actual_default, '') NOT ILIKE '%gen_random_uuid()%' THEN
                RAISE EXCEPTION
                    'contracts.%: expected gen_random_uuid() default, got %',
                    r.column_name, actual_default;

            ELSIF r.default_rule = 'contains'
               AND POSITION(LOWER(r.default_token) IN LOWER(COALESCE(actual_default, ''))) = 0 THEN
                RAISE EXCEPTION
                    'contracts.%: expected default containing %, got %',
                    r.column_name, r.default_token, actual_default;

            ELSIF r.default_rule = 'timestamp'
               AND LOWER(COALESCE(actual_default, '')) NOT LIKE '%current_timestamp%'
               AND LOWER(COALESCE(actual_default, '')) NOT LIKE '%now()%' THEN
                RAISE EXCEPTION
                    'contracts.%: expected timestamp default, got %',
                    r.column_name, actual_default;
            END IF;
        END LOOP;

        SELECT COUNT(*)
        INTO matching_count
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE n.nspname = 'public'
          AND t.relname = 'contracts'
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
                'contracts: expected primary key on id';
        END IF;
    END IF;

    ---------------------------------------------------------------------------
    -- Indexes (created outside DO block for IF NOT EXISTS support)
    ---------------------------------------------------------------------------
END
$migration$;

CREATE INDEX IF NOT EXISTS idx_contracts_unit_id
    ON public.contracts (unit_id);

CREATE INDEX IF NOT EXISTS idx_contracts_tenant_id
    ON public.contracts (tenant_id);
