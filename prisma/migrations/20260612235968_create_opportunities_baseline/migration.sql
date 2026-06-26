-- Restore the Opportunities baseline. This table was never created through
-- a tracked Prisma migration; it was first introduced via the Prisma
-- schema (model Opportunity, see commit be80185) and materialized against
-- the database through `prisma db push`, never through `prisma migrate`.
--
-- Body verified identical across three independent checkpoints spanning
-- the entire migration-relevant window (ef38b60, a60a604, 9be2984^) -- see
-- OPPORTUNITIES_TEMPORAL_BASELINE_BLUEPRINT.md.
--
-- FK scope: TENANT_ONLY. lead_id is a raw, unconstrained UUID column at
-- this point. 20260622130000_phase02_full_closure later adds
-- "opportunities_lead_id_fkey" with its own comment confirming this:
-- "Make the existing Opportunity.leadId column an explicit Prisma/DB
-- relation" -- i.e. it had none before. Adding that FK here would be
-- historically incorrect and is deliberately not done.
--
-- 20260621000200_transaction_spine itself never ALTERs this table; it only
-- adds a foreign key FROM tours TO opportunities, which is exactly why a
-- fresh deploy fails with "relation \"opportunities\" does not exist" if
-- this baseline is missing.
--
-- Columns added by later migrations are intentionally excluded:
-- - unit_id: added by 20260621000300_offer_unit_integrity

DO $migration$
DECLARE
    r RECORD;
    actual_type TEXT;
    actual_nullable TEXT;
    actual_default TEXT;
    matching_count INTEGER;
BEGIN
    ---------------------------------------------------------------------------
    -- opportunities
    ---------------------------------------------------------------------------
    IF to_regclass('public.opportunities') IS NULL THEN
        CREATE TABLE public.opportunities (
            id UUID NOT NULL DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            lead_id UUID NOT NULL,
            value DECIMAL(12,2) NOT NULL,
            probability INTEGER NOT NULL,
            close_date TIMESTAMPTZ NOT NULL,
            status TEXT NOT NULL DEFAULT 'OPEN',
            linked_unit_ids TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_by UUID,
            updated_by UUID,
            audit_log TEXT,
            CONSTRAINT opportunities_pkey PRIMARY KEY (id),
            CONSTRAINT opportunities_tenant_id_fkey FOREIGN KEY (tenant_id)
                REFERENCES public.tenants(id) ON DELETE CASCADE
        );
    ELSE
        FOR r IN
            SELECT *
            FROM (
                VALUES
                    ('id',              'uuid',                     'NO',  'uuid',      NULL),
                    ('tenant_id',       'uuid',                     'NO',  'none',      NULL),
                    ('lead_id',         'uuid',                     'NO',  'none',      NULL),
                    ('value',           'numeric',                  'NO',  'none',      NULL),
                    ('probability',     'integer',                  'NO',  'none',      NULL),
                    ('close_date',      'timestamp with time zone', 'NO',  'none',      NULL),
                    ('status',          'text',                     'NO',  'contains',  'OPEN'),
                    ('linked_unit_ids', 'text',                     'YES', 'none',      NULL),
                    ('created_at',      'timestamp with time zone', 'NO',  'timestamp', NULL),
                    ('updated_at',      'timestamp with time zone', 'NO',  'timestamp', NULL),
                    ('created_by',      'uuid',                     'YES', 'none',      NULL),
                    ('updated_by',      'uuid',                     'YES', 'none',      NULL),
                    ('audit_log',       'text',                     'YES', 'none',      NULL)
            ) AS expected(column_name, data_type, is_nullable, default_rule, default_token)
        LOOP
            SELECT c.data_type, c.is_nullable, c.column_default
            INTO actual_type, actual_nullable, actual_default
            FROM information_schema.columns c
            WHERE c.table_schema = 'public'
              AND c.table_name = 'opportunities'
              AND c.column_name = r.column_name;

            IF NOT FOUND THEN
                RAISE EXCEPTION
                    'opportunities.% is missing',
                    r.column_name;
            END IF;

            IF actual_type <> r.data_type THEN
                RAISE EXCEPTION
                    'opportunities.%: type expected %, got %',
                    r.column_name, r.data_type, actual_type;
            END IF;

            IF actual_nullable <> r.is_nullable THEN
                RAISE EXCEPTION
                    'opportunities.%: nullable expected %, got %',
                    r.column_name, r.is_nullable, actual_nullable;
            END IF;

            IF r.default_rule = 'none'
               AND actual_default IS NOT NULL THEN
                RAISE EXCEPTION
                    'opportunities.%: expected no default, got %',
                    r.column_name, actual_default;

            ELSIF r.default_rule = 'uuid'
               AND COALESCE(actual_default, '') NOT ILIKE '%gen_random_uuid()%' THEN
                RAISE EXCEPTION
                    'opportunities.%: expected gen_random_uuid() default, got %',
                    r.column_name, actual_default;

            ELSIF r.default_rule = 'contains'
               AND POSITION(LOWER(r.default_token) IN LOWER(COALESCE(actual_default, ''))) = 0 THEN
                RAISE EXCEPTION
                    'opportunities.%: expected default containing %, got %',
                    r.column_name, r.default_token, actual_default;

            ELSIF r.default_rule = 'timestamp'
               AND LOWER(COALESCE(actual_default, '')) NOT LIKE '%current_timestamp%'
               AND LOWER(COALESCE(actual_default, '')) NOT LIKE '%now()%' THEN
                RAISE EXCEPTION
                    'opportunities.%: expected timestamp default, got %',
                    r.column_name, actual_default;
            END IF;
        END LOOP;

        SELECT COUNT(*)
        INTO matching_count
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE n.nspname = 'public'
          AND t.relname = 'opportunities'
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
                'opportunities: expected primary key on id';
        END IF;
    END IF;
END
$migration$;
