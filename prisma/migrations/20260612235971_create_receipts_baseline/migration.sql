-- Restore the Receipts baseline. This table was never created through a
-- tracked Prisma migration; it was first introduced via the Prisma schema
-- (model Receipt, see commit 533853a, initially 6 columns with no
-- tenant_id) and evolved through `prisma db push` (tenant_id + its index
-- added later), never through `prisma migrate`. See
-- RECEIPTS_TEMPORAL_BASELINE_BLUEPRINT.md for the full provenance.
--
-- This model is written differently from every other baseline in this
-- gate: most fields carry no @map directive and no explicit native-type
-- attribute.
-- - id: `@default(uuid())`, NOT `dbgenerated("gen_random_uuid()")` -- the
--   value is supplied by the Prisma Client at insert time, so there is
--   deliberately NO database-level default here, unlike every other
--   baseline's PK in this project.
-- - "invoiceId", "paymentMethod", "receivedDate": no @map -- Prisma uses
--   the literal camelCase field name as the column name (same precedent as
--   payment_transactions."netAmount"). These columns must be double-quoted
--   to preserve case.
-- - amount: `Decimal` with no `@db.Decimal(p,s)` -- Prisma's documented
--   PostgreSQL default native type for an unmapped Decimal is
--   DECIMAL(65,30).
-- - "receivedDate": `DateTime` with no `@db.Timestamptz`/`@db.Date` --
--   Prisma's documented PostgreSQL default native type for an unmapped
--   DateTime is TIMESTAMP(3), WITHOUT time zone (unlike every other
--   DateTime field in this project, which explicitly uses @db.Timestamptz).
--
-- No real information_schema export was available for this specific table
-- to cross-check these inferred native types (unlike contracts/units/
-- installments/payment_transactions); confidence is medium-high, based on
-- documented Prisma default behavior, not direct empirical verification.
--
-- Columns/constraints added by the later (and only) dependent migration are
-- intentionally excluded:
-- - payment_transaction_id, its FK, and its unique partial index:
--   added by 20260622060000_phase1_quote_to_cash_closure

DO $migration$
DECLARE
    r RECORD;
    actual_type TEXT;
    actual_nullable TEXT;
    actual_default TEXT;
    matching_count INTEGER;
BEGIN
    ---------------------------------------------------------------------------
    -- receipts
    ---------------------------------------------------------------------------
    IF to_regclass('public.receipts') IS NULL THEN
        CREATE TABLE public.receipts (
            id TEXT NOT NULL,
            tenant_id UUID NOT NULL,
            "invoiceId" TEXT NOT NULL,
            amount DECIMAL(65,30) NOT NULL,
            "paymentMethod" TEXT NOT NULL,
            "receivedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            status TEXT NOT NULL DEFAULT 'COMPLETED',
            CONSTRAINT receipts_pkey PRIMARY KEY (id),
            CONSTRAINT receipts_tenant_id_fkey FOREIGN KEY (tenant_id)
                REFERENCES public.tenants(id) ON DELETE CASCADE
        );
    ELSE
        FOR r IN
            SELECT *
            FROM (
                VALUES
                    ('id',             'text',                'NO',  'none',      NULL),
                    ('tenant_id',      'uuid',                'NO',  'none',      NULL),
                    ('invoiceId',      'text',                'NO',  'none',      NULL),
                    ('amount',         'numeric',             'NO',  'none',      NULL),
                    ('paymentMethod',  'text',                'NO',  'none',      NULL),
                    ('receivedDate',   'timestamp without time zone', 'NO', 'timestamp', NULL),
                    ('status',         'text',                'NO',  'contains',  'COMPLETED')
            ) AS expected(column_name, data_type, is_nullable, default_rule, default_token)
        LOOP
            SELECT c.data_type, c.is_nullable, c.column_default
            INTO actual_type, actual_nullable, actual_default
            FROM information_schema.columns c
            WHERE c.table_schema = 'public'
              AND c.table_name = 'receipts'
              AND c.column_name = r.column_name;

            IF NOT FOUND THEN
                RAISE EXCEPTION
                    'receipts.% is missing',
                    r.column_name;
            END IF;

            IF actual_type <> r.data_type THEN
                RAISE EXCEPTION
                    'receipts.%: type expected %, got %',
                    r.column_name, r.data_type, actual_type;
            END IF;

            IF actual_nullable <> r.is_nullable THEN
                RAISE EXCEPTION
                    'receipts.%: nullable expected %, got %',
                    r.column_name, r.is_nullable, actual_nullable;
            END IF;

            IF r.default_rule = 'none'
               AND actual_default IS NOT NULL THEN
                RAISE EXCEPTION
                    'receipts.%: expected no default, got %',
                    r.column_name, actual_default;

            ELSIF r.default_rule = 'contains'
               AND POSITION(LOWER(r.default_token) IN LOWER(COALESCE(actual_default, ''))) = 0 THEN
                RAISE EXCEPTION
                    'receipts.%: expected default containing %, got %',
                    r.column_name, r.default_token, actual_default;

            ELSIF r.default_rule = 'timestamp'
               AND LOWER(COALESCE(actual_default, '')) NOT LIKE '%current_timestamp%'
               AND LOWER(COALESCE(actual_default, '')) NOT LIKE '%now()%' THEN
                RAISE EXCEPTION
                    'receipts.%: expected timestamp default, got %',
                    r.column_name, actual_default;
            END IF;
        END LOOP;

        SELECT COUNT(*)
        INTO matching_count
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE n.nspname = 'public'
          AND t.relname = 'receipts'
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
                'receipts: expected primary key on id';
        END IF;
    END IF;

    ---------------------------------------------------------------------------
    -- Indexes (created outside DO block for IF NOT EXISTS support)
    ---------------------------------------------------------------------------
END
$migration$;

CREATE INDEX IF NOT EXISTS idx_receipts_tenant_id
    ON public.receipts (tenant_id);
