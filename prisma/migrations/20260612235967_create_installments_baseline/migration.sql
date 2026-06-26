-- Restore the Installments baseline. This table was never created through
-- a tracked Prisma migration; it was first introduced via the Prisma
-- schema (model Installment, see commit 74e2375, initially 8 columns with
-- no tenant_id) and evolved early (tenant_id and vat_amount added before
-- commit ef38b60) through `prisma db push`, never through `prisma migrate`.
-- Verified stable across three independent checkpoints spanning the entire
-- migration-relevant window (ef38b60, a60a604, 9be2984^) -- see
-- INSTALLMENTS_TEMPORAL_BASELINE_BLUEPRINT.md.
--
-- FK scope: TENANT + CONTRACT. Unlike tours, contract_id carries a real
-- Prisma @relation from its earliest tracked appearance, and neither
-- dependent migration below adds this FK -- it was already part of the
-- original db-pushed shape. Both tenants and contracts already exist.
--
-- Constraint naming note: the Prisma source uses
-- `@@unique([contractId, installmentNumber], name: "uq_contract_installment_number")`.
-- The `name:` argument only affects the Prisma Client query field name, NOT
-- the database constraint name (that requires `map:`, which is absent
-- here). No historical migration or manual SQL script ever defines this
-- constraint under any custom name. The correct database-level name is
-- therefore Prisma's default convention, confirmed against another
-- unmapped constraint in this same codebase
-- (`contracts.offerId @unique` with no map -> literal DB name
-- "contracts_offer_id_key"): "installments_contract_id_installment_number_key".
--
-- Columns added by later migrations are intentionally excluded:
-- - invoice_id: added by 20260621000200_transaction_spine (ADD COLUMN + FK
--   to invoices, which does not exist yet at this point)
-- - payment_plan_id: added by 20260622060000_phase1_quote_to_cash_closure

DO $migration$
DECLARE
    r RECORD;
    actual_type TEXT;
    actual_nullable TEXT;
    actual_default TEXT;
    matching_count INTEGER;
BEGIN
    ---------------------------------------------------------------------------
    -- installments
    ---------------------------------------------------------------------------
    IF to_regclass('public.installments') IS NULL THEN
        CREATE TABLE public.installments (
            id UUID NOT NULL DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            contract_id UUID NOT NULL,
            installment_number INTEGER NOT NULL,
            amount_sar DECIMAL(12,2) NOT NULL,
            vat_amount DECIMAL(12,2),
            due_date DATE NOT NULL,
            payment_status TEXT NOT NULL DEFAULT 'Pending',
            secure_payment_token UUID NOT NULL DEFAULT gen_random_uuid(),
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT installments_pkey PRIMARY KEY (id),
            CONSTRAINT installments_secure_payment_token_key UNIQUE (secure_payment_token),
            CONSTRAINT installments_contract_id_installment_number_key
                UNIQUE (contract_id, installment_number),
            CONSTRAINT installments_tenant_id_fkey FOREIGN KEY (tenant_id)
                REFERENCES public.tenants(id) ON DELETE CASCADE,
            CONSTRAINT installments_contract_id_fkey FOREIGN KEY (contract_id)
                REFERENCES public.contracts(id) ON DELETE CASCADE
        );
    ELSE
        FOR r IN
            SELECT *
            FROM (
                VALUES
                    ('id',                   'uuid',    'NO',  'uuid',      NULL),
                    ('tenant_id',             'uuid',    'NO',  'none',      NULL),
                    ('contract_id',           'uuid',    'NO',  'none',      NULL),
                    ('installment_number',    'integer', 'NO',  'none',      NULL),
                    ('amount_sar',            'numeric', 'NO',  'none',      NULL),
                    ('vat_amount',            'numeric', 'YES', 'none',      NULL),
                    ('due_date',              'date',    'NO',  'none',      NULL),
                    ('payment_status',        'text',    'NO',  'contains',  'Pending'),
                    ('secure_payment_token',  'uuid',    'NO',  'uuid',      NULL),
                    ('created_at',            'timestamp with time zone', 'NO', 'timestamp', NULL)
            ) AS expected(column_name, data_type, is_nullable, default_rule, default_token)
        LOOP
            SELECT c.data_type, c.is_nullable, c.column_default
            INTO actual_type, actual_nullable, actual_default
            FROM information_schema.columns c
            WHERE c.table_schema = 'public'
              AND c.table_name = 'installments'
              AND c.column_name = r.column_name;

            IF NOT FOUND THEN
                RAISE EXCEPTION
                    'installments.% is missing',
                    r.column_name;
            END IF;

            IF actual_type <> r.data_type THEN
                RAISE EXCEPTION
                    'installments.%: type expected %, got %',
                    r.column_name, r.data_type, actual_type;
            END IF;

            IF actual_nullable <> r.is_nullable THEN
                RAISE EXCEPTION
                    'installments.%: nullable expected %, got %',
                    r.column_name, r.is_nullable, actual_nullable;
            END IF;

            IF r.default_rule = 'none'
               AND actual_default IS NOT NULL THEN
                RAISE EXCEPTION
                    'installments.%: expected no default, got %',
                    r.column_name, actual_default;

            ELSIF r.default_rule = 'uuid'
               AND COALESCE(actual_default, '') NOT ILIKE '%gen_random_uuid()%' THEN
                RAISE EXCEPTION
                    'installments.%: expected gen_random_uuid() default, got %',
                    r.column_name, actual_default;

            ELSIF r.default_rule = 'contains'
               AND POSITION(LOWER(r.default_token) IN LOWER(COALESCE(actual_default, ''))) = 0 THEN
                RAISE EXCEPTION
                    'installments.%: expected default containing %, got %',
                    r.column_name, r.default_token, actual_default;

            ELSIF r.default_rule = 'timestamp'
               AND LOWER(COALESCE(actual_default, '')) NOT LIKE '%current_timestamp%'
               AND LOWER(COALESCE(actual_default, '')) NOT LIKE '%now()%' THEN
                RAISE EXCEPTION
                    'installments.%: expected timestamp default, got %',
                    r.column_name, actual_default;
            END IF;
        END LOOP;

        SELECT COUNT(*)
        INTO matching_count
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE n.nspname = 'public'
          AND t.relname = 'installments'
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
                'installments: expected primary key on id';
        END IF;
    END IF;

    ---------------------------------------------------------------------------
    -- Indexes (created outside DO block for IF NOT EXISTS support)
    ---------------------------------------------------------------------------
END
$migration$;

CREATE INDEX IF NOT EXISTS idx_installments_contract_id
    ON public.installments (contract_id);

CREATE INDEX IF NOT EXISTS idx_installments_due_date
    ON public.installments (due_date);

CREATE INDEX IF NOT EXISTS idx_installments_tenant_id
    ON public.installments (tenant_id);
