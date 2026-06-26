-- Restore the Payment Transactions baseline. This table was never created
-- through a tracked Prisma migration; it was first introduced via the
-- Prisma schema (model PaymentTransaction, see commit ef38b60) and
-- materialized against the database through `prisma db push`, never
-- through `prisma migrate`.
--
-- Columns added by later tracked migrations are intentionally excluded:
-- - provider, provider_transaction_id, provider_invoice_id,
--   provider_reference, payment_url, gateway_status, raw_payload,
--   webhook_received_at, failure_reason, idempotency_key:
--   added by 20260614_add_paylink_gateway_fields
-- - plan_code, processed_at, expected_amount_minor, expected_currency,
--   last_error: added by 20260619000100_payment_transaction_provider_neutral_security
-- - invoice_id/installment_id are plain nullable TEXT here (no UUID type, no
--   FK constraint): they are only converted to UUID and given a foreign key
--   by 20260621000200_transaction_spine, via
--   "ALTER COLUMN ... TYPE UUID USING ...::uuid". Before that migration runs,
--   these columns carry no relationship to invoices/installments at all.
-- - status default here is 'COMPLETED', verified literally in the Prisma
--   model body at commit 48a600d^ (the immediate parent of the commit that
--   introduces 20260614_add_paylink_gateway_fields) -- it is changed to
--   'PENDING' only by a later, untracked db-push step.
-- - paid_at is NOT NULL DEFAULT now() here; it is relaxed to nullable with
--   no default only later, by 20260622060000_phase1_quote_to_cash_closure.
--
-- IMPORTANT: the column storing the net transaction amount is the literal,
-- case-sensitive identifier "netAmount" (camelCase) on the real database --
-- NOT "net_amount" (snake_case). schema.prisma never carried a @map(...)
-- directive for this field at any point in tracked history (confirmed via
-- `git log -S '@map("net_amount")'` over the full history of
-- prisma/schema.prisma, zero hits), so `prisma db push` used the literal
-- Prisma field name as the column name. A separate, never-updated manual
-- script (docs/reports/archive/sql/sprint3_migration.sql, unchanged since
-- the same introducing commit) independently defines a snake_case
-- "net_amount" column in the same ordinal position as a gap found in the
-- real database's current column ordinals -- evidence that a column named
-- "net_amount" likely existed at some point and was superseded by the
-- unmapped "netAmount" column that exists today. This baseline matches
-- what is actually live now: "netAmount".
--
-- Legacy drift correction (PRISMA_HISTORICAL_BASELINE_GATE): invoice_id and
-- installment_id are already UUID on live legacy databases where
-- 20260621000200_transaction_spine has applied ahead of this baseline (its
-- "ALTER COLUMN ... TYPE UUID" already ran), not TEXT as historically
-- declared at this table's original introduction. The verification rule is
-- updated to match the real legacy shape; no ALTER is performed here.

DO $migration$
DECLARE
    r RECORD;
    actual_type TEXT;
    actual_nullable TEXT;
    actual_default TEXT;
    matching_count INTEGER;
BEGIN
    ---------------------------------------------------------------------------
    -- payment_transactions
    ---------------------------------------------------------------------------
    IF to_regclass('public.payment_transactions') IS NULL THEN
        CREATE TABLE public.payment_transactions (
            id UUID NOT NULL DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            invoice_id TEXT,
            installment_id TEXT,
            amount DECIMAL(12,2) NOT NULL,
            fee DECIMAL(12,2) NOT NULL DEFAULT 0,
            "netAmount" DECIMAL(12,2) NOT NULL,
            currency TEXT NOT NULL DEFAULT 'SAR',
            method TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'COMPLETED',
            gateway_ref TEXT,
            gateway_response TEXT,
            paid_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT payment_transactions_pkey PRIMARY KEY (id),
            CONSTRAINT payment_transactions_tenant_id_fkey FOREIGN KEY (tenant_id)
                REFERENCES public.tenants(id) ON DELETE CASCADE
        );
    ELSE
        FOR r IN
            SELECT *
            FROM (
                VALUES
                    ('id',               'uuid',                     'NO',  'uuid',      NULL),
                    ('tenant_id',        'uuid',                     'NO',  'none',      NULL),
                    ('invoice_id',       'uuid',                     'YES', 'none',      NULL),
                    ('installment_id',   'uuid',                     'YES', 'none',      NULL),
                    ('amount',           'numeric',                  'NO',  'none',      NULL),
                    ('fee',              'numeric',                  'NO',  'contains',  '0'),
                    ('netAmount',        'numeric',                  'NO',  'none',      NULL),
                    ('currency',         'text',                     'NO',  'contains',  'SAR'),
                    ('method',           'text',                     'NO',  'none',      NULL),
                    ('gateway_ref',      'text',                     'YES', 'none',      NULL),
                    ('gateway_response', 'text',                     'YES', 'none',      NULL),
                    ('created_at',       'timestamp with time zone', 'NO',  'timestamp', NULL)
            ) AS expected(column_name, data_type, is_nullable, default_rule, default_token)
        LOOP
            SELECT c.data_type, c.is_nullable, c.column_default
            INTO actual_type, actual_nullable, actual_default
            FROM information_schema.columns c
            WHERE c.table_schema = 'public'
              AND c.table_name = 'payment_transactions'
              AND c.column_name = r.column_name;

            IF NOT FOUND THEN
                RAISE EXCEPTION
                    'payment_transactions.% is missing',
                    r.column_name;
            END IF;

            IF actual_type <> r.data_type THEN
                RAISE EXCEPTION
                    'payment_transactions.%: type expected %, got %',
                    r.column_name, r.data_type, actual_type;
            END IF;

            IF actual_nullable <> r.is_nullable THEN
                RAISE EXCEPTION
                    'payment_transactions.%: nullable expected %, got %',
                    r.column_name, r.is_nullable, actual_nullable;
            END IF;

            IF r.default_rule = 'none'
               AND actual_default IS NOT NULL THEN
                RAISE EXCEPTION
                    'payment_transactions.%: expected no default, got %',
                    r.column_name, actual_default;

            ELSIF r.default_rule = 'uuid'
               AND COALESCE(actual_default, '') NOT ILIKE '%gen_random_uuid()%' THEN
                RAISE EXCEPTION
                    'payment_transactions.%: expected gen_random_uuid() default, got %',
                    r.column_name, actual_default;

            ELSIF r.default_rule = 'contains'
               AND POSITION(LOWER(r.default_token) IN LOWER(COALESCE(actual_default, ''))) = 0 THEN
                RAISE EXCEPTION
                    'payment_transactions.%: expected default containing %, got %',
                    r.column_name, r.default_token, actual_default;

            ELSIF r.default_rule = 'timestamp'
               AND LOWER(COALESCE(actual_default, '')) NOT LIKE '%current_timestamp%'
               AND LOWER(COALESCE(actual_default, '')) NOT LIKE '%now()%' THEN
                RAISE EXCEPTION
                    'payment_transactions.%: expected timestamp default, got %',
                    r.column_name, actual_default;
            END IF;
        END LOOP;

        -- status and paid_at are checked for existence/type only: both are
        -- known to have been altered (default value, nullability) by later
        -- untracked db-push steps and tracked migrations respectively, so
        -- their exact value at any given moment depends on which later
        -- migrations have already applied -- not meaningful to assert here.
        PERFORM 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'payment_transactions' AND column_name = 'status';
        IF NOT FOUND THEN
            RAISE EXCEPTION 'payment_transactions.status is missing';
        END IF;

        PERFORM 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'payment_transactions' AND column_name = 'paid_at';
        IF NOT FOUND THEN
            RAISE EXCEPTION 'payment_transactions.paid_at is missing';
        END IF;

        SELECT COUNT(*)
        INTO matching_count
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE n.nspname = 'public'
          AND t.relname = 'payment_transactions'
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
                'payment_transactions: expected primary key on id';
        END IF;
    END IF;

    ---------------------------------------------------------------------------
    -- Indexes (created outside DO block for IF NOT EXISTS support)
    ---------------------------------------------------------------------------
END
$migration$;

CREATE INDEX IF NOT EXISTS idx_payment_transactions_tenant_id
    ON public.payment_transactions (tenant_id);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_invoice_id
    ON public.payment_transactions (invoice_id);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_installment_id
    ON public.payment_transactions (installment_id);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_status
    ON public.payment_transactions (status);
