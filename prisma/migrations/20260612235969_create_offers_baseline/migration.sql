-- Restore the Offers baseline. This table was never created through a
-- tracked Prisma migration; it was first introduced via the Prisma schema
-- (model Offer, see commit be80185) and materialized against the database
-- through `prisma db push`, never through `prisma migrate`.
--
-- Body verified identical across three independent checkpoints spanning
-- the entire migration-relevant window (ef38b60, a60a604, 9be2984^) -- see
-- OFFERS_TEMPORAL_BASELINE_BLUEPRINT.md.
--
-- FK scope: TENANT + OPPORTUNITY. linked_opportunity_id carries a real
-- Prisma @relation (onDelete: Cascade) from its earliest tracked
-- appearance, and no migration ever adds this FK via ALTER TABLE -- a full
-- search for any ADD CONSTRAINT touching linked_opportunity_id across all
-- migration files returns zero hits, confirming it was already part of the
-- original db-pushed shape (same pattern as installments.contract_id, not
-- the tours/opportunities "FK added later" pattern).
--
-- 20260621000200_transaction_spine never ALTERs this table directly; it
-- only adds a foreign key FROM contracts TO offers
-- ("contracts_offer_id_fkey"), which is exactly why a fresh deploy fails
-- with "relation \"offers\" does not exist" if this baseline is missing.
--
-- Columns/constraints added by later migrations are intentionally excluded:
-- - unit_id + offers_unit_id_fkey: added by 20260621000300_offer_unit_integrity
-- - offers_accepted_requires_unit_ck (CHECK): added by 20260622060000_phase1_quote_to_cash_closure

DO $migration$
DECLARE
    r RECORD;
    actual_type TEXT;
    actual_nullable TEXT;
    actual_default TEXT;
    matching_count INTEGER;
BEGIN
    ---------------------------------------------------------------------------
    -- offers
    ---------------------------------------------------------------------------
    IF to_regclass('public.offers') IS NULL THEN
        CREATE TABLE public.offers (
            id UUID NOT NULL DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            linked_opportunity_id UUID NOT NULL,
            price DECIMAL(12,2) NOT NULL,
            valid_until TIMESTAMPTZ NOT NULL,
            status TEXT NOT NULL DEFAULT 'PENDING',
            document_url TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_by UUID,
            updated_by UUID,
            audit_log TEXT,
            CONSTRAINT offers_pkey PRIMARY KEY (id),
            CONSTRAINT offers_tenant_id_fkey FOREIGN KEY (tenant_id)
                REFERENCES public.tenants(id) ON DELETE CASCADE,
            CONSTRAINT offers_linked_opportunity_id_fkey FOREIGN KEY (linked_opportunity_id)
                REFERENCES public.opportunities(id) ON DELETE CASCADE
        );
    ELSE
        FOR r IN
            SELECT *
            FROM (
                VALUES
                    ('id',                    'uuid',                     'NO',  'uuid',      NULL),
                    ('tenant_id',              'uuid',                     'NO',  'none',      NULL),
                    ('linked_opportunity_id',  'uuid',                     'NO',  'none',      NULL),
                    ('price',                  'numeric',                  'NO',  'none',      NULL),
                    ('valid_until',            'timestamp with time zone', 'NO',  'none',      NULL),
                    ('status',                 'text',                     'NO',  'contains',  'PENDING'),
                    ('document_url',           'text',                     'YES', 'none',      NULL),
                    ('created_at',             'timestamp with time zone', 'NO',  'timestamp', NULL),
                    ('updated_at',             'timestamp with time zone', 'NO',  'timestamp', NULL),
                    ('created_by',             'uuid',                     'YES', 'none',      NULL),
                    ('updated_by',             'uuid',                     'YES', 'none',      NULL),
                    ('audit_log',              'text',                     'YES', 'none',      NULL)
            ) AS expected(column_name, data_type, is_nullable, default_rule, default_token)
        LOOP
            SELECT c.data_type, c.is_nullable, c.column_default
            INTO actual_type, actual_nullable, actual_default
            FROM information_schema.columns c
            WHERE c.table_schema = 'public'
              AND c.table_name = 'offers'
              AND c.column_name = r.column_name;

            IF NOT FOUND THEN
                RAISE EXCEPTION
                    'offers.% is missing',
                    r.column_name;
            END IF;

            IF actual_type <> r.data_type THEN
                RAISE EXCEPTION
                    'offers.%: type expected %, got %',
                    r.column_name, r.data_type, actual_type;
            END IF;

            IF actual_nullable <> r.is_nullable THEN
                RAISE EXCEPTION
                    'offers.%: nullable expected %, got %',
                    r.column_name, r.is_nullable, actual_nullable;
            END IF;

            IF r.default_rule = 'none'
               AND actual_default IS NOT NULL THEN
                RAISE EXCEPTION
                    'offers.%: expected no default, got %',
                    r.column_name, actual_default;

            ELSIF r.default_rule = 'uuid'
               AND COALESCE(actual_default, '') NOT ILIKE '%gen_random_uuid()%' THEN
                RAISE EXCEPTION
                    'offers.%: expected gen_random_uuid() default, got %',
                    r.column_name, actual_default;

            ELSIF r.default_rule = 'contains'
               AND POSITION(LOWER(r.default_token) IN LOWER(COALESCE(actual_default, ''))) = 0 THEN
                RAISE EXCEPTION
                    'offers.%: expected default containing %, got %',
                    r.column_name, r.default_token, actual_default;

            ELSIF r.default_rule = 'timestamp'
               AND LOWER(COALESCE(actual_default, '')) NOT LIKE '%current_timestamp%'
               AND LOWER(COALESCE(actual_default, '')) NOT LIKE '%now()%' THEN
                RAISE EXCEPTION
                    'offers.%: expected timestamp default, got %',
                    r.column_name, actual_default;
            END IF;
        END LOOP;

        SELECT COUNT(*)
        INTO matching_count
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE n.nspname = 'public'
          AND t.relname = 'offers'
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
                'offers: expected primary key on id';
        END IF;
    END IF;
END
$migration$;
