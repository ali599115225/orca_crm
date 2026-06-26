-- SCHEMA_GAP closure, Migration 58: real, manually-curated diff found by
-- comparing a genuine Production Clone (carrying real pre-migrate-tracking
-- history) against schema.prisma, AFTER migrations 1-57. Fresh-deploy-only
-- environments already satisfy every check below (they were created via
-- Migration 1 with the converged shape directly), so every block here is a
-- guarded no-op there and a real fix on a clone with older history.
--
-- Two unique constraints carry their original pre-rename auto-generated
-- names on real production history (`rental_invoices_tenant_id_invoice_number_key`,
-- `units_project_id_unit_number_key`) while a from-scratch migrate deploy
-- produces the short intentional names schema.prisma targets
-- (`uq_tenant_invoice_number`, `uq_project_unit_number`). Renamed here,
-- conditionally, so every environment converges on the same short name.
--
-- `rental_invoices_legacy` (confirmed present with real rows on this
-- Production Clone, confirmed absent on every from-scratch test clone) is
-- deliberately NOT touched here -- see docs/SCHEMA_GAP_CLOSURE_REPORT.md.
-- IMPORTANT: on a Production Clone where rental_invoices_legacy exists, its
-- own (untracked, pre-existing) primary key happens to already be named
-- "rental_invoices_pkey" -- a name collision with what a from-scratch
-- deploy names invoices' PK. invoices' PK is therefore "rental_invoices_pkey1"
-- there (collision-avoidance suffix) but "rental_invoices_pkey" (no suffix)
-- on a from-scratch deploy where rental_invoices_legacy never existed. The
-- block below converges every environment on the collision-safe
-- "rental_invoices_pkey1" name, renaming only when "rental_invoices_pkey"
-- is confirmed to belong to invoices (never touches rental_invoices_legacy's
-- own constraint of the same name).

DO $migration$
DECLARE
    null_count INTEGER;
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'rental_invoices_pkey'
          AND conrelid = 'public.invoices'::regclass
    ) THEN
        ALTER TABLE public.invoices RENAME CONSTRAINT rental_invoices_pkey TO rental_invoices_pkey1;
    END IF;

    -- Converge the two pre-rename-era unique constraint names to the
    -- short intentional names, if the old name is the one present
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'rental_invoices_tenant_id_invoice_number_key'
    ) THEN
        ALTER TABLE public.invoices RENAME CONSTRAINT rental_invoices_tenant_id_invoice_number_key TO uq_tenant_invoice_number;
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'units_project_id_unit_number_key'
    ) THEN
        ALTER TABLE public.units RENAME CONSTRAINT units_project_id_unit_number_key TO uq_project_unit_number;
    END IF;

    -- tenants: guarded tightenings (no-op if Migration 1's shape already applies)
    SELECT COUNT(*) INTO null_count FROM public.tenants WHERE invoice_prefix IS NULL;
    IF null_count > 0 THEN
        RAISE EXCEPTION 'tenants.invoice_prefix: % row(s) NULL -- refusing to guess a value', null_count;
    END IF;
    SELECT COUNT(*) INTO null_count FROM public.tenants WHERE next_invoice_number IS NULL;
    IF null_count > 0 THEN
        RAISE EXCEPTION 'tenants.next_invoice_number: % row(s) NULL -- refusing to guess a value', null_count;
    END IF;

    ALTER TABLE public.tenants
        ALTER COLUMN invoice_prefix TYPE TEXT,
        ALTER COLUMN invoice_prefix SET NOT NULL,
        ALTER COLUMN next_invoice_number SET NOT NULL;

    -- zatca_devices: guarded tightenings
    SELECT COUNT(*) INTO null_count FROM public.zatca_devices WHERE device_type IS NULL;
    IF null_count > 0 THEN
        RAISE EXCEPTION 'zatca_devices.device_type: % row(s) NULL -- refusing to guess a value', null_count;
    END IF;
    SELECT COUNT(*) INTO null_count FROM public.zatca_devices WHERE status IS NULL;
    IF null_count > 0 THEN
        RAISE EXCEPTION 'zatca_devices.status: % row(s) NULL -- refusing to guess a value', null_count;
    END IF;
    SELECT COUNT(*) INTO null_count FROM public.zatca_devices WHERE created_at IS NULL;
    IF null_count > 0 THEN
        RAISE EXCEPTION 'zatca_devices.created_at: % row(s) NULL -- refusing to guess a value', null_count;
    END IF;
    SELECT COUNT(*) INTO null_count FROM public.zatca_devices WHERE updated_at IS NULL;
    IF null_count > 0 THEN
        RAISE EXCEPTION 'zatca_devices.updated_at: % row(s) NULL -- refusing to guess a value', null_count;
    END IF;

    ALTER TABLE public.zatca_devices
        ALTER COLUMN device_name TYPE TEXT,
        ALTER COLUMN device_type SET NOT NULL,
        ALTER COLUMN device_type TYPE TEXT,
        ALTER COLUMN status SET NOT NULL,
        ALTER COLUMN status TYPE TEXT,
        ALTER COLUMN created_at SET NOT NULL,
        ALTER COLUMN updated_at SET NOT NULL;

    -- zatca_queue: guarded tightenings
    SELECT COUNT(*) INTO null_count FROM public.zatca_queue WHERE action IS NULL;
    IF null_count > 0 THEN
        RAISE EXCEPTION 'zatca_queue.action: % row(s) NULL -- refusing to guess a value', null_count;
    END IF;
    SELECT COUNT(*) INTO null_count FROM public.zatca_queue WHERE status IS NULL;
    IF null_count > 0 THEN
        RAISE EXCEPTION 'zatca_queue.status: % row(s) NULL -- refusing to guess a value', null_count;
    END IF;
    SELECT COUNT(*) INTO null_count FROM public.zatca_queue WHERE retry_count IS NULL;
    IF null_count > 0 THEN
        RAISE EXCEPTION 'zatca_queue.retry_count: % row(s) NULL -- refusing to guess a value', null_count;
    END IF;
    SELECT COUNT(*) INTO null_count FROM public.zatca_queue WHERE max_retries IS NULL;
    IF null_count > 0 THEN
        RAISE EXCEPTION 'zatca_queue.max_retries: % row(s) NULL -- refusing to guess a value', null_count;
    END IF;
    SELECT COUNT(*) INTO null_count FROM public.zatca_queue WHERE created_at IS NULL;
    IF null_count > 0 THEN
        RAISE EXCEPTION 'zatca_queue.created_at: % row(s) NULL -- refusing to guess a value', null_count;
    END IF;

    ALTER TABLE public.zatca_queue
        ALTER COLUMN action SET NOT NULL,
        ALTER COLUMN action TYPE TEXT,
        ALTER COLUMN status SET NOT NULL,
        ALTER COLUMN status TYPE TEXT,
        ALTER COLUMN retry_count SET NOT NULL,
        ALTER COLUMN max_retries SET NOT NULL,
        ALTER COLUMN created_at SET NOT NULL;
END
$migration$;
