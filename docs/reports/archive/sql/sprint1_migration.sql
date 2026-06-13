-- Sprint 1 Migration: VAT + Invoice Number + QR
-- Part 1: Add new columns to existing tables (non-blocking)

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS invoice_prefix VARCHAR(20) DEFAULT 'INV';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS next_invoice_number INTEGER DEFAULT 1;

ALTER TABLE rental_leases ADD COLUMN IF NOT EXISTS vat_type VARCHAR(20) DEFAULT 'STANDARD';
ALTER TABLE rental_leases ADD COLUMN IF NOT EXISTS vat_rate DECIMAL(5,2) DEFAULT 15.00;

ALTER TABLE contracts ADD COLUMN IF NOT EXISTS vat_type VARCHAR(20) DEFAULT 'STANDARD';
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS vat_rate DECIMAL(5,2) DEFAULT 15.00;

ALTER TABLE installments ADD COLUMN IF NOT EXISTS vat_amount DECIMAL(12,2);

-- Part 2: Rebuild rental_invoices table
ALTER TABLE IF EXISTS rental_invoices RENAME TO rental_invoices_legacy;

CREATE TABLE IF NOT EXISTS rental_invoices (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lease_id        UUID NOT NULL REFERENCES rental_leases(id) ON DELETE CASCADE,
  invoice_number  INTEGER NOT NULL,
  invoice_prefix  VARCHAR(20) NOT NULL DEFAULT 'INV',
  zatca_uuid      UUID DEFAULT gen_random_uuid(),
  issue_date      DATE DEFAULT CURRENT_DATE,
  due_date        DATE NOT NULL,
  subtotal        DECIMAL(12,2) NOT NULL,
  vat_rate        DECIMAL(5,2) DEFAULT 15.00,
  vat_amount      DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_amount    DECIMAL(12,2) NOT NULL,
  qr_payload      TEXT,
  qr_code         TEXT,
  qr_image        TEXT,
  zatca_xml       TEXT,
  zatca_signed_xml TEXT,
  zatca_status    VARCHAR(20) DEFAULT 'PENDING',
  status          VARCHAR(20) DEFAULT 'unpaid',
  paid_at         TIMESTAMPTZ,
  payment_method  VARCHAR(50),
  payment_ref     VARCHAR(100),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, invoice_number)
);

CREATE INDEX IF NOT EXISTS idx_rental_invoices_lease_id ON rental_invoices(lease_id);
CREATE INDEX IF NOT EXISTS idx_rental_invoices_tenant_id ON rental_invoices(tenant_id);

-- Part 3: Migrate legacy data
INSERT INTO rental_invoices (id, tenant_id, lease_id, invoice_number, invoice_prefix, zatca_uuid, issue_date, due_date, subtotal, vat_rate, vat_amount, total_amount, status, paid_at, payment_method, payment_ref, created_at)
SELECT
  id, tenant_id, lease_id,
  ROW_NUMBER() OVER (PARTITION BY tenant_id ORDER BY created_at) AS invoice_number,
  'INV', gen_random_uuid(), created_at::DATE, due_date,
  amount AS subtotal,
  15.00, ROUND(amount * 15 / 115, 2) AS vat_amount,
  amount AS total_amount,
  status, paid_at, payment_method, payment_ref, created_at
FROM rental_invoices_legacy
ON CONFLICT DO NOTHING;

-- Part 4: Update tenant counters
UPDATE tenants t
SET
  next_invoice_number = (
    SELECT COALESCE(MAX(invoice_number), 0) + 1
    FROM rental_invoices
    WHERE tenant_id = t.id
  ),
  invoice_prefix = COALESCE(NULLIF(invoice_prefix, ''), 'INV')
WHERE TRUE;

-- Part 5: Verify migration
SELECT 'Migration complete' as status,
  (SELECT COUNT(*) FROM rental_invoices) as new_invoice_count,
  (SELECT COUNT(*) FROM rental_invoices_legacy) as legacy_invoice_count;
