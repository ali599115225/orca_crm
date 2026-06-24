-- Saudi Trust Gates: GovernmentOutbox + AuditLog gate fields
-- Build 1: Ejar E2E
-- No production migration — schema-only until explicitly applied

-- ── 1. government_outbox ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS government_outbox (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider             VARCHAR(10) NOT NULL,
  operation            VARCHAR(50) NOT NULL,
  idempotency_key      VARCHAR(80) NOT NULL,
  business_entity_type VARCHAR(30) NULL,
  business_entity_id   UUID        NULL,
  payload              TEXT        NOT NULL,
  status               VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  retry_count          INTEGER     NOT NULL DEFAULT 0,
  max_retries          INTEGER     NOT NULL DEFAULT 5,
  last_error           TEXT        NULL,
  next_retry_at        TIMESTAMPTZ NULL,
  provider_response    TEXT        NULL,
  delivered_at         TIMESTAMPTZ NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT gov_outbox_idempotency_key_uq UNIQUE (idempotency_key)
);

-- Indexes for cron workers and monitoring
CREATE INDEX IF NOT EXISTS idx_gov_outbox_tenant_status
  ON government_outbox(tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_gov_outbox_retry
  ON government_outbox(next_retry_at, status)
  WHERE status = 'RETRYING';

CREATE INDEX IF NOT EXISTS idx_gov_outbox_provider_status
  ON government_outbox(provider, status);

-- ── 2. audit_logs: add Gate tracking columns ──────────────────────────────────
ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS gate_provider   VARCHAR(10)  NULL,
  ADD COLUMN IF NOT EXISTS gate_operation  VARCHAR(50)  NULL,
  ADD COLUMN IF NOT EXISTS gate_result     VARCHAR(30)  NULL,
  ADD COLUMN IF NOT EXISTS gate_reason     VARCHAR(60)  NULL,
  ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(80)  NULL;

CREATE INDEX IF NOT EXISTS idx_audit_gate_result
  ON audit_logs(tenant_id, gate_provider, gate_result)
  WHERE gate_provider IS NOT NULL;
