-- SCHEMA_GAP closure, Migration 60: adds 9 foreign keys and 2 indexes that
-- were never created on a Production Clone where the underlying tables
-- pre-existed (via historical `db push`, before Prisma migrate tracking
-- began) and Migration 1's `CREATE TABLE IF NOT EXISTS` therefore skipped
-- them entirely, leaving the original (constraint-less) shape in place.
--
-- Read-only investigation confirmed, for all 11 originally-missing FKs:
--   zatca_devices.tenant_id, zatca_queue.tenant_id, zatca_queue.invoice_id,
--   payment_transactions.tenant_id, whatsapp_attachments.message_id,
--   whatsapp_contacts.lead_id, whatsapp_contacts.tenant_id,
--   whatsapp_messages.tenant_id, whatsapp_phone_numbers.tenant_id
-- -> ZERO orphan rows. Each gated below anyway (defense in depth, not just
-- trust in the investigation).
--
--   invoices.tenant_id, invoices.lease_id
-- -> 2 orphan rows (same two: 84e5fb7b-67c7-4e30-b204-c832f59d306b,
-- 65e2c386-6630-465d-948d-2a98a7dcc231). Both have a dangling tenant_id
-- matching none of the 3 real tenants, both reference a lease_id that does
-- not exist in rental_leases, and contract_id is NULL on both -- no other
-- column or relation on these rows can deterministically reconstruct the
-- correct tenant or lease. NOT remediated here. These two constraints are
-- deliberately NOT added by this migration -- see the gated block below,
-- which raises a notice (not an exception, since the rest of this
-- migration must still succeed) and leaves both rows and both missing
-- constraints exactly as they are.

DO $migration$
DECLARE
    orphan_count INTEGER;
BEGIN
    -- zatca_devices.tenant_id
    SELECT COUNT(*) INTO orphan_count FROM zatca_devices z WHERE NOT EXISTS (SELECT 1 FROM tenants t WHERE t.id = z.tenant_id);
    IF orphan_count > 0 THEN
        RAISE EXCEPTION 'zatca_devices.tenant_id: % orphan row(s) -- refusing to add FK', orphan_count;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'zatca_devices_tenant_id_fkey') THEN
        ALTER TABLE public.zatca_devices ADD CONSTRAINT zatca_devices_tenant_id_fkey
            FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    -- zatca_queue.tenant_id
    SELECT COUNT(*) INTO orphan_count FROM zatca_queue z WHERE NOT EXISTS (SELECT 1 FROM tenants t WHERE t.id = z.tenant_id);
    IF orphan_count > 0 THEN
        RAISE EXCEPTION 'zatca_queue.tenant_id: % orphan row(s) -- refusing to add FK', orphan_count;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'zatca_queue_tenant_id_fkey') THEN
        ALTER TABLE public.zatca_queue ADD CONSTRAINT zatca_queue_tenant_id_fkey
            FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    -- zatca_queue.invoice_id
    SELECT COUNT(*) INTO orphan_count FROM zatca_queue z WHERE NOT EXISTS (SELECT 1 FROM invoices i WHERE i.id = z.invoice_id);
    IF orphan_count > 0 THEN
        RAISE EXCEPTION 'zatca_queue.invoice_id: % orphan row(s) -- refusing to add FK', orphan_count;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'zatca_queue_invoice_id_fkey') THEN
        ALTER TABLE public.zatca_queue ADD CONSTRAINT zatca_queue_invoice_id_fkey
            FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    -- payment_transactions.tenant_id
    SELECT COUNT(*) INTO orphan_count FROM payment_transactions p WHERE NOT EXISTS (SELECT 1 FROM tenants t WHERE t.id = p.tenant_id);
    IF orphan_count > 0 THEN
        RAISE EXCEPTION 'payment_transactions.tenant_id: % orphan row(s) -- refusing to add FK', orphan_count;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_transactions_tenant_id_fkey') THEN
        ALTER TABLE public.payment_transactions ADD CONSTRAINT payment_transactions_tenant_id_fkey
            FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    -- whatsapp_attachments.message_id
    SELECT COUNT(*) INTO orphan_count FROM whatsapp_attachments w WHERE NOT EXISTS (SELECT 1 FROM whatsapp_messages m WHERE m.id = w.message_id);
    IF orphan_count > 0 THEN
        RAISE EXCEPTION 'whatsapp_attachments.message_id: % orphan row(s) -- refusing to add FK', orphan_count;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'whatsapp_attachments_message_id_fkey') THEN
        ALTER TABLE public.whatsapp_attachments ADD CONSTRAINT whatsapp_attachments_message_id_fkey
            FOREIGN KEY (message_id) REFERENCES public.whatsapp_messages(id) ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    -- whatsapp_contacts.lead_id (nullable)
    SELECT COUNT(*) INTO orphan_count FROM whatsapp_contacts w WHERE w.lead_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM leads l WHERE l.id = w.lead_id);
    IF orphan_count > 0 THEN
        RAISE EXCEPTION 'whatsapp_contacts.lead_id: % orphan row(s) -- refusing to add FK', orphan_count;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'whatsapp_contacts_lead_id_fkey') THEN
        ALTER TABLE public.whatsapp_contacts ADD CONSTRAINT whatsapp_contacts_lead_id_fkey
            FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    -- whatsapp_contacts.tenant_id
    SELECT COUNT(*) INTO orphan_count FROM whatsapp_contacts w WHERE NOT EXISTS (SELECT 1 FROM tenants t WHERE t.id = w.tenant_id);
    IF orphan_count > 0 THEN
        RAISE EXCEPTION 'whatsapp_contacts.tenant_id: % orphan row(s) -- refusing to add FK', orphan_count;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'whatsapp_contacts_tenant_id_fkey') THEN
        ALTER TABLE public.whatsapp_contacts ADD CONSTRAINT whatsapp_contacts_tenant_id_fkey
            FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    -- whatsapp_messages.tenant_id
    SELECT COUNT(*) INTO orphan_count FROM whatsapp_messages w WHERE NOT EXISTS (SELECT 1 FROM tenants t WHERE t.id = w.tenant_id);
    IF orphan_count > 0 THEN
        RAISE EXCEPTION 'whatsapp_messages.tenant_id: % orphan row(s) -- refusing to add FK', orphan_count;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'whatsapp_messages_tenant_id_fkey') THEN
        ALTER TABLE public.whatsapp_messages ADD CONSTRAINT whatsapp_messages_tenant_id_fkey
            FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    -- whatsapp_phone_numbers.tenant_id
    SELECT COUNT(*) INTO orphan_count FROM whatsapp_phone_numbers w WHERE NOT EXISTS (SELECT 1 FROM tenants t WHERE t.id = w.tenant_id);
    IF orphan_count > 0 THEN
        RAISE EXCEPTION 'whatsapp_phone_numbers.tenant_id: % orphan row(s) -- refusing to add FK', orphan_count;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'whatsapp_phone_numbers_tenant_id_fkey') THEN
        ALTER TABLE public.whatsapp_phone_numbers ADD CONSTRAINT whatsapp_phone_numbers_tenant_id_fkey
            FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    -- invoices.tenant_id / invoices.lease_id: deliberately NOT added.
    -- INVOICE_ORPHAN_REMEDIATION_REQUIRED -- see header comment. Logged as a
    -- NOTICE (non-fatal) so it is visible in deploy output without aborting
    -- the rest of this migration.
    SELECT COUNT(*) INTO orphan_count FROM invoices i WHERE NOT EXISTS (SELECT 1 FROM tenants t WHERE t.id = i.tenant_id);
    IF orphan_count > 0 THEN
        RAISE NOTICE 'INVOICE_ORPHAN_REMEDIATION_REQUIRED: % invoices row(s) have no deterministic tenant/lease recovery path -- invoices_tenant_id_fkey and invoices_lease_id_fkey intentionally NOT added by this migration', orphan_count;
    END IF;
END
$migration$;

-- Indexes: plain, no orphan risk, safe unconditionally.
CREATE INDEX IF NOT EXISTS idx_invoices_lease_id ON public.invoices (lease_id);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_id ON public.invoices (tenant_id);
