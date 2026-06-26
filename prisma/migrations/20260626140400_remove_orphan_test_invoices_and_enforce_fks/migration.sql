-- Migration 62: remove two business-approved corrupted test invoices and
-- enforce the Invoice foreign keys that Migration 60 intentionally deferred.
--
-- BUSINESS_APPROVAL: GRANTED
-- DELETE_AUTHORIZATION: APPROVED
-- Scope is deliberately narrow:
--   * only the two approved invoice ids may be deleted
--   * only if any present rows exactly match the approved test-data fingerprint
--   * fresh databases, where neither row exists, continue normally
--   * rental_invoices_legacy is not touched

DO $migration$
DECLARE
    approved_ids CONSTANT uuid[] := ARRAY[
        '84e5fb7b-67c7-4e30-b204-c832f59d306b'::uuid,
        '65e2c386-6630-465d-948d-2a98a7dcc231'::uuid
    ];
    present_count integer;
    matching_count integer;
    deleted_count integer;
    orphan_count integer;
BEGIN
    SELECT COUNT(*)
      INTO present_count
      FROM public.invoices i
     WHERE i.id = ANY (approved_ids);

    SELECT COUNT(*)
      INTO matching_count
      FROM public.invoices i
     WHERE i.id = ANY (approved_ids)
       AND i.invoice_prefix = 'TST'
       AND i.invoice_number IN (1, 2)
       AND i.status = 'unpaid'
       AND i.type = 'RENTAL'
       AND i.contract_id IS NULL;

    IF present_count NOT IN (0, 2) THEN
        RAISE EXCEPTION
            'Approved orphan test invoice cardinality mismatch: expected 0 on fresh DB or 2 on production, found %',
            present_count;
    END IF;

    IF present_count <> matching_count THEN
        RAISE EXCEPTION
            'Approved orphan test invoice fingerprint mismatch: present %, matching %',
            present_count,
            matching_count;
    END IF;

    DELETE FROM public.invoices i
     WHERE i.id = ANY (approved_ids)
       AND i.invoice_prefix = 'TST'
       AND i.invoice_number IN (1, 2)
       AND i.status = 'unpaid'
       AND i.type = 'RENTAL'
       AND i.contract_id IS NULL;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    IF deleted_count <> matching_count THEN
        RAISE EXCEPTION
            'Approved orphan test invoice delete count mismatch: expected %, deleted %',
            matching_count,
            deleted_count;
    END IF;

    SELECT COUNT(*)
      INTO orphan_count
      FROM public.invoices i
      LEFT JOIN public.tenants t ON t.id = i.tenant_id
      LEFT JOIN public.rental_leases rl ON rl.id = i.lease_id
     WHERE t.id IS NULL
        OR (i.lease_id IS NOT NULL AND rl.id IS NULL);

    IF orphan_count <> 0 THEN
        RAISE EXCEPTION
            'invoices still has % orphan row(s); refusing to add tenant/lease foreign keys',
            orphan_count;
    END IF;

    IF EXISTS (
        SELECT 1
          FROM pg_constraint c
         WHERE c.conrelid = 'public.invoices'::regclass
           AND c.conname = 'rental_invoices_tenant_id_fkey'
           AND (c.confrelid <> 'public.tenants'::regclass
                OR c.confdeltype <> 'c'
                OR c.confupdtype <> 'c')
    ) THEN
        ALTER TABLE public.invoices DROP CONSTRAINT rental_invoices_tenant_id_fkey;
    END IF;

    IF NOT EXISTS (
        SELECT 1
          FROM pg_constraint c
         WHERE c.conrelid = 'public.invoices'::regclass
           AND c.conname = 'rental_invoices_tenant_id_fkey'
    ) THEN
        ALTER TABLE public.invoices
            ADD CONSTRAINT rental_invoices_tenant_id_fkey
            FOREIGN KEY (tenant_id)
            REFERENCES public.tenants(id)
            ON DELETE CASCADE
            ON UPDATE CASCADE;
    END IF;

    IF EXISTS (
        SELECT 1
          FROM pg_constraint c
         WHERE c.conrelid = 'public.invoices'::regclass
           AND c.conname = 'rental_invoices_lease_id_fkey'
           AND (c.confrelid <> 'public.rental_leases'::regclass
                OR c.confdeltype <> 'n'
                OR c.confupdtype <> 'c')
    ) THEN
        ALTER TABLE public.invoices DROP CONSTRAINT rental_invoices_lease_id_fkey;
    END IF;

    IF NOT EXISTS (
        SELECT 1
          FROM pg_constraint c
         WHERE c.conrelid = 'public.invoices'::regclass
           AND c.conname = 'rental_invoices_lease_id_fkey'
    ) THEN
        ALTER TABLE public.invoices
            ADD CONSTRAINT rental_invoices_lease_id_fkey
            FOREIGN KEY (lease_id)
            REFERENCES public.rental_leases(id)
            ON DELETE SET NULL
            ON UPDATE CASCADE;
    END IF;
END
$migration$;
