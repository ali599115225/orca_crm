SELECT 'inv_count: ' || COUNT(*)::text FROM rental_invoices;
SELECT 'legacy_count: ' || COUNT(*)::text FROM rental_invoices_legacy;
SELECT 'tenants_migrated: ' || COUNT(*)::text FROM tenants WHERE invoice_prefix IS NOT NULL;
