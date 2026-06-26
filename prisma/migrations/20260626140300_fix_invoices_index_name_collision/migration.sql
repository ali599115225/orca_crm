-- SCHEMA_GAP closure, Migration 61: fixes a bug discovered after applying
-- Migration 60 to a real Production Clone -- `idx_invoices_lease_id` and
-- `idx_invoices_tenant_id` already exist in this database, but as indexes on
-- `rental_invoices_legacy` (an untouched, out-of-scope legacy table), not on
-- `invoices`. Postgres index names are unique per-schema, not per-table, so
-- Migration 60's `CREATE INDEX IF NOT EXISTS idx_invoices_lease_id ON
-- invoices(...)` silently no-op'd (the name was already taken elsewhere) and
-- the index was never actually created on `invoices`. Migration 60 is
-- already applied and frozen (checksum
-- 3c66a318196857fe9609609d8941cfd0059ce21be21a99537297c20e2847dd9a) and is
-- not touched here. `rental_invoices_legacy` and its indexes are not touched
-- either. New, non-colliding names are used instead, matching the
-- corresponding `map:` update in schema.prisma.

CREATE INDEX IF NOT EXISTS invoices_lease_id_idx ON public.invoices (lease_id);
CREATE INDEX IF NOT EXISTS invoices_tenant_id_idx ON public.invoices (tenant_id);
