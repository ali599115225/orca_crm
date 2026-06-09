-- Sprint 2 Migration: ZATCA Phase 2 Full Compliance
-- Part 1: Add new columns to rental_invoices

ALTER TABLE rental_invoices ADD COLUMN IF NOT EXISTS invoice_type_code VARCHAR(10) DEFAULT '388';
ALTER TABLE rental_invoices ADD COLUMN IF NOT EXISTS previous_invoice_hash TEXT;
ALTER TABLE rental_invoices ADD COLUMN IF NOT EXISTS zatca_response TEXT;
ALTER TABLE rental_invoices ADD COLUMN IF NOT EXISTS zatca_error TEXT;
ALTER TABLE rental_invoices ADD COLUMN IF NOT EXISTS zatca_cleared_at TIMESTAMPTZ;
ALTER TABLE rental_invoices ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

UPDATE rental_invoices SET zatca_status = 'DRAFT' WHERE zatca_status = 'PENDING';

ALTER TABLE rental_invoices ALTER COLUMN zatca_status SET DEFAULT 'DRAFT';

-- Part 2: Create zatca_devices table

CREATE TABLE IF NOT EXISTS zatca_devices (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  device_name     VARCHAR(255) NOT NULL,
  device_type     VARCHAR(50) DEFAULT 'COMPLIANCE',
  csr             TEXT,
  compliance_cert TEXT,
  production_cert TEXT,
  private_key     TEXT NOT NULL,
  public_key      TEXT NOT NULL,
  status          VARCHAR(50) DEFAULT 'ACTIVE',
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_zatca_devices_tenant_id ON zatca_devices(tenant_id);

-- Part 3: Create zatca_queue table

CREATE TABLE IF NOT EXISTS zatca_queue (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  invoice_id      UUID NOT NULL REFERENCES rental_invoices(id) ON DELETE CASCADE,
  action          VARCHAR(50) DEFAULT 'REPORT',
  status          VARCHAR(50) DEFAULT 'PENDING',
  retry_count     INTEGER DEFAULT 0,
  max_retries     INTEGER DEFAULT 5,
  last_error      TEXT,
  next_retry_at   TIMESTAMPTZ,
  payload         TEXT,
  response        TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_zatca_queue_tenant_status ON zatca_queue(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_zatca_queue_next_retry ON zatca_queue(next_retry_at);

-- Part 4: Verify migration

SELECT 'Sprint 2 migration complete' as status,
  (SELECT COUNT(*) FROM rental_invoices) as invoice_count,
  (SELECT COUNT(*) FROM zatca_devices) as device_count,
  (SELECT COUNT(*) FROM zatca_queue) as queue_count;
