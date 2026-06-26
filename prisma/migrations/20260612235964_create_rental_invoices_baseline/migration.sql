-- Restore the Rental Invoices baseline. This table was never created
-- through a tracked Prisma migration; it was first introduced via the
-- Prisma schema (model RentalInvoice, see commit 1136cfb) and evolved twice
-- more through `prisma db push` (tenant_id added at 31b608f; the full ZATCA
-- invoice shape -- invoice_number, zatca_uuid, subtotal, vat fields, qr
-- fields, zatca_* fields, updated_at -- added at da816e5), all confirmed by
-- direct extraction of the model body at each commit. See
-- BASELINE_DESIGN_GATE_REPORT_ADDENDUM.md section 1 for the full
-- field-provenance table.
--
-- 20260621000200_transaction_spine later renames this table to "invoices"
-- (ALTER TABLE "rental_invoices" RENAME TO "invoices"), makes lease_id
-- nullable, and adds "type"/"contract_id". This migration is therefore
-- rename-aware: it must behave correctly whether it runs against a
-- genuinely fresh database, a database that still has the table under its
-- original name, or a database where the rename has already happened.
--
-- Columns added by later migrations are intentionally excluded from the
-- baseline shape below:
-- - gateway_provider, gateway_status, payment_url:
--   added by 20260614_add_paylink_gateway_fields (ADD COLUMN IF NOT EXISTS)
-- - type, contract_id, nullable lease_id, renamed indexes:
--   added/changed by 20260621000200_transaction_spine
--
-- updated_at: the Prisma declaration at commit 48a600d^ is literally
-- `updatedAt DateTime @default(now()) @updatedAt @map("updated_at")
-- @db.Timestamptz` -- the `@default(now())` directive is present and
-- independent of `@updatedAt`, which justifies a DB-level DEFAULT now()
-- here (not inferred from `@updatedAt` alone).
--
-- vat_amount: the real database currently shows a `DEFAULT 0` for this
-- column even though no Prisma declaration in tracked history shows an
-- explicit @default for it, and no tracked migration adds this default --
-- it is therefore treated as part of the original db-pushed shape, per the
-- project's column-compatibility verification against the real schema
-- export (BASELINE_DESIGN_GATE_REPORT_ADDENDUM.md section 5).

DO $migration$
DECLARE
    r RECORD;
    actual_type TEXT;
    actual_nullable TEXT;
    actual_default TEXT;
    matching_count INTEGER;
    rental_invoices_exists BOOLEAN;
    invoices_exists BOOLEAN;
BEGIN
    rental_invoices_exists := to_regclass('public.rental_invoices') IS NOT NULL;
    invoices_exists := to_regclass('public.invoices') IS NOT NULL;

    ---------------------------------------------------------------------------
    -- Four-way rename-aware branch
    ---------------------------------------------------------------------------
    IF rental_invoices_exists AND invoices_exists THEN
        -- Inconsistent state: both the pre-rename and post-rename table
        -- names exist simultaneously. This should never happen on any
        -- legitimate database lineage; fail loudly rather than guess.
        RAISE EXCEPTION
            'rental_invoices baseline: both "rental_invoices" and "invoices" exist simultaneously -- inconsistent database state, refusing to proceed';

    ELSIF invoices_exists THEN
        -- Already renamed by 20260621000200_transaction_spine. This is the
        -- expected, correct state on any database where that migration has
        -- already applied successfully. Verify a handful of identity
        -- columns -- including ones that ONLY exist post-rename -- to
        -- confirm this is genuinely the evolved rental_invoices table and
        -- not an unrelated table that happens to be named "invoices", then
        -- no-op.
        FOR r IN
            SELECT unnest(ARRAY[
                'id', 'tenant_id', 'lease_id', 'invoice_number',
                'invoice_prefix', 'zatca_uuid', 'subtotal', 'vat_amount',
                'total_amount', 'type', 'contract_id'
            ]) AS column_name
        LOOP
            PERFORM 1
            FROM information_schema.columns c
            WHERE c.table_schema = 'public'
              AND c.table_name = 'invoices'
              AND c.column_name = r.column_name;

            IF NOT FOUND THEN
                RAISE EXCEPTION
                    'rental_invoices baseline: "invoices" exists but is missing expected post-rename column %; refusing to treat as a no-op',
                    r.column_name;
            END IF;
        END LOOP;

        RAISE NOTICE 'rental_invoices baseline: table already renamed to "invoices" with expected columns present; no-op.';

    ELSIF NOT rental_invoices_exists THEN
        -- Neither name exists: genuinely fresh database. Create the table
        -- in its historically correct, pre-rename shape.
        CREATE TABLE public.rental_invoices (
            id UUID NOT NULL DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            lease_id UUID NOT NULL,
            invoice_number INTEGER NOT NULL,
            invoice_prefix VARCHAR(20) NOT NULL DEFAULT 'INV',
            zatca_uuid UUID DEFAULT gen_random_uuid(),
            issue_date DATE DEFAULT CURRENT_DATE,
            due_date DATE NOT NULL,
            subtotal DECIMAL(12,2) NOT NULL,
            vat_rate DECIMAL(5,2) DEFAULT 15.00,
            vat_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
            total_amount DECIMAL(12,2) NOT NULL,
            qr_payload TEXT,
            qr_code TEXT,
            qr_image TEXT,
            invoice_type_code VARCHAR(10) DEFAULT '388',
            previous_invoice_hash TEXT,
            zatca_xml TEXT,
            zatca_signed_xml TEXT,
            zatca_status VARCHAR(20) DEFAULT 'DRAFT',
            zatca_response TEXT,
            zatca_error TEXT,
            zatca_cleared_at TIMESTAMPTZ,
            status VARCHAR(20) DEFAULT 'unpaid',
            paid_at TIMESTAMPTZ,
            payment_method VARCHAR(50),
            payment_ref VARCHAR(100),
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT rental_invoices_pkey PRIMARY KEY (id),
            CONSTRAINT uq_tenant_invoice_number UNIQUE (tenant_id, invoice_number),
            CONSTRAINT rental_invoices_tenant_id_fkey FOREIGN KEY (tenant_id)
                REFERENCES public.tenants(id) ON DELETE CASCADE,
            CONSTRAINT rental_invoices_lease_id_fkey FOREIGN KEY (lease_id)
                REFERENCES public.rental_leases(id) ON DELETE CASCADE
        );

    ELSE
        -- rental_invoices_exists = true (and invoices does not): table
        -- exists under its original pre-rename name. Validate its shape.
        FOR r IN
            SELECT *
            FROM (
                VALUES
                    ('id',                    'uuid',                     'NO',  'uuid',      NULL),
                    ('tenant_id',              'uuid',                     'NO',  'none',      NULL),
                    ('lease_id',               'uuid',                     'NO',  'none',      NULL),
                    ('invoice_number',         'integer',                  'NO',  'none',      NULL),
                    ('invoice_prefix',         'character varying',       'NO',  'contains',  'INV'),
                    ('zatca_uuid',             'uuid',                     'YES', 'uuid',      NULL),
                    ('issue_date',             'date',                     'YES', 'none',      NULL),
                    ('due_date',               'date',                     'NO',  'none',      NULL),
                    ('subtotal',               'numeric',                  'NO',  'none',      NULL),
                    ('vat_rate',               'numeric',                  'YES', 'none',      NULL),
                    ('vat_amount',             'numeric',                  'NO',  'contains',  '0'),
                    ('total_amount',           'numeric',                  'NO',  'none',      NULL),
                    ('qr_payload',             'text',                     'YES', 'none',      NULL),
                    ('qr_code',                'text',                     'YES', 'none',      NULL),
                    ('qr_image',               'text',                     'YES', 'none',      NULL),
                    ('invoice_type_code',      'character varying',       'YES', 'contains',  '388'),
                    ('previous_invoice_hash',  'text',                     'YES', 'none',      NULL),
                    ('zatca_xml',              'text',                     'YES', 'none',      NULL),
                    ('zatca_signed_xml',       'text',                     'YES', 'none',      NULL),
                    ('zatca_status',           'character varying',       'YES', 'contains',  'DRAFT'),
                    ('zatca_response',         'text',                     'YES', 'none',      NULL),
                    ('zatca_error',            'text',                     'YES', 'none',      NULL),
                    ('zatca_cleared_at',       'timestamp with time zone', 'YES', 'none',      NULL),
                    ('status',                 'character varying',       'YES', 'contains',  'unpaid'),
                    ('paid_at',                'timestamp with time zone', 'YES', 'none',      NULL),
                    ('payment_method',         'character varying',       'YES', 'none',      NULL),
                    ('payment_ref',            'character varying',       'YES', 'none',      NULL),
                    ('created_at',             'timestamp with time zone', 'YES', 'timestamp', NULL),
                    ('updated_at',             'timestamp with time zone', 'YES', 'timestamp', NULL)
            ) AS expected(column_name, data_type, is_nullable, default_rule, default_token)
        LOOP
            SELECT c.data_type, c.is_nullable, c.column_default
            INTO actual_type, actual_nullable, actual_default
            FROM information_schema.columns c
            WHERE c.table_schema = 'public'
              AND c.table_name = 'rental_invoices'
              AND c.column_name = r.column_name;

            IF NOT FOUND THEN
                RAISE EXCEPTION
                    'rental_invoices.% is missing',
                    r.column_name;
            END IF;

            IF actual_type <> r.data_type THEN
                RAISE EXCEPTION
                    'rental_invoices.%: type expected %, got %',
                    r.column_name, r.data_type, actual_type;
            END IF;

            IF actual_nullable <> r.is_nullable THEN
                RAISE EXCEPTION
                    'rental_invoices.%: nullable expected %, got %',
                    r.column_name, r.is_nullable, actual_nullable;
            END IF;

            IF r.default_rule = 'none'
               AND actual_default IS NOT NULL THEN
                RAISE EXCEPTION
                    'rental_invoices.%: expected no default, got %',
                    r.column_name, actual_default;

            ELSIF r.default_rule = 'uuid'
               AND COALESCE(actual_default, '') NOT ILIKE '%gen_random_uuid()%' THEN
                RAISE EXCEPTION
                    'rental_invoices.%: expected gen_random_uuid() default, got %',
                    r.column_name, actual_default;

            ELSIF r.default_rule = 'contains'
               AND POSITION(LOWER(r.default_token) IN LOWER(COALESCE(actual_default, ''))) = 0 THEN
                RAISE EXCEPTION
                    'rental_invoices.%: expected default containing %, got %',
                    r.column_name, r.default_token, actual_default;

            ELSIF r.default_rule = 'timestamp'
               AND LOWER(COALESCE(actual_default, '')) NOT LIKE '%current_timestamp%'
               AND LOWER(COALESCE(actual_default, '')) NOT LIKE '%now()%' THEN
                RAISE EXCEPTION
                    'rental_invoices.%: expected timestamp default, got %',
                    r.column_name, actual_default;
            END IF;
        END LOOP;

        SELECT COUNT(*)
        INTO matching_count
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE n.nspname = 'public'
          AND t.relname = 'rental_invoices'
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
                'rental_invoices: expected primary key on id';
        END IF;
    END IF;
END
$migration$;

-- Indexes only make sense, and are only created, against the pre-rename
-- table name -- if "invoices" already exists (post-rename), the no-op
-- branch above already returned without needing these, and transaction_spine
-- itself owns renaming idx_rental_invoices_* to idx_invoices_*.
DO $index_guard$
BEGIN
    IF to_regclass('public.rental_invoices') IS NOT NULL THEN
        CREATE INDEX IF NOT EXISTS idx_rental_invoices_lease_id
            ON public.rental_invoices (lease_id);

        CREATE INDEX IF NOT EXISTS idx_rental_invoices_tenant_id
            ON public.rental_invoices (tenant_id);
    END IF;
END
$index_guard$;
