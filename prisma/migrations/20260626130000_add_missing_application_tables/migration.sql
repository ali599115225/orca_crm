-- SCHEMA_GAP closure, Migration 1: tables that exist in schema.prisma and are
-- actively used by application code or by other schema.prisma relations, but
-- were never created by a tracked migration -- only reachable today via
-- `prisma db push`. Purely additive: no existing table or column is touched.
--
-- NOTE: the original investigation for this gate found only 6 such tables
-- (commission_payments, user_favorites, failed_login_attempts,
-- maintenance_tickets, zatca_devices, zatca_queue). Re-running
-- `prisma migrate diff` directly against a real post-53-migration database
-- surfaced 13 more that the manual code-usage sweep missed -- core platform
-- tables (agent_slots, usage_meters, payroll_commissions, tickets, etc.) that
-- other already-created tables and Gate 0's own RLS inventory reference.
-- This migration creates all 19. Column shapes copied verbatim from
-- schema.prisma; FKs only where schema.prisma declares a @relation.

CREATE TABLE IF NOT EXISTS public.tickets (
    id           UUID NOT NULL DEFAULT gen_random_uuid(),
    tenant_id    UUID NOT NULL,
    title        TEXT NOT NULL,
    description  TEXT NOT NULL,
    status       TEXT NOT NULL DEFAULT 'OPEN',
    ai_response  TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT tickets_pkey PRIMARY KEY (id),
    CONSTRAINT tickets_tenant_id_fkey FOREIGN KEY (tenant_id)
        REFERENCES public.tenants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.agent_slots (
    id          UUID NOT NULL DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL,
    slot_number INTEGER NOT NULL,
    agent_type  TEXT NOT NULL,
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT agent_slots_pkey PRIMARY KEY (id),
    CONSTRAINT agent_slots_tenant_id_fkey FOREIGN KEY (tenant_id)
        REFERENCES public.tenants(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS agent_slots_tenant_id_slot_number_key ON public.agent_slots (tenant_id, slot_number);

CREATE TABLE IF NOT EXISTS public.usage_meters (
    id            UUID NOT NULL DEFAULT gen_random_uuid(),
    tenant_id     UUID NOT NULL,
    agent_slot_id UUID,
    metric_type   TEXT NOT NULL,
    limit_value   INTEGER NOT NULL,
    usage_value   INTEGER NOT NULL DEFAULT 0,
    reset_at      TIMESTAMPTZ NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT usage_meters_pkey PRIMARY KEY (id),
    CONSTRAINT usage_meters_tenant_id_fkey FOREIGN KEY (tenant_id)
        REFERENCES public.tenants(id) ON DELETE CASCADE,
    CONSTRAINT usage_meters_agent_slot_id_fkey FOREIGN KEY (agent_slot_id)
        REFERENCES public.agent_slots(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS usage_meters_agent_slot_id_key ON public.usage_meters (agent_slot_id);

CREATE TABLE IF NOT EXISTS public.payroll_commissions (
    id          UUID NOT NULL DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL,
    user_id     UUID NOT NULL,
    amount      DECIMAL(12,2) NOT NULL,
    contract_id TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'PENDING',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT payroll_commissions_pkey PRIMARY KEY (id),
    CONSTRAINT payroll_commissions_tenant_id_fkey FOREIGN KEY (tenant_id)
        REFERENCES public.tenants(id) ON DELETE CASCADE,
    CONSTRAINT payroll_commissions_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES public.users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.commission_payments (
    id            UUID NOT NULL DEFAULT gen_random_uuid(),
    commission_id UUID NOT NULL,
    tenant_id     UUID NOT NULL,
    paid_at       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    amount        DECIMAL(12,2) NOT NULL,
    method        TEXT NOT NULL DEFAULT 'BANK_TRANSFER',
    status        TEXT NOT NULL DEFAULT 'PAID',
    CONSTRAINT commission_payments_pkey PRIMARY KEY (id),
    CONSTRAINT commission_payments_commission_id_fkey FOREIGN KEY (commission_id)
        REFERENCES public.payroll_commissions(id) ON DELETE CASCADE,
    CONSTRAINT commission_payments_tenant_id_fkey FOREIGN KEY (tenant_id)
        REFERENCES public.tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS commission_payments_commission_id_idx ON public.commission_payments (commission_id);
CREATE INDEX IF NOT EXISTS commission_payments_tenant_id_idx ON public.commission_payments (tenant_id);
CREATE INDEX IF NOT EXISTS commission_payments_status_idx ON public.commission_payments (status);

CREATE TABLE IF NOT EXISTS public.user_favorites (
    id          UUID NOT NULL DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL,
    user_id     UUID NOT NULL,
    property_id TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT user_favorites_pkey PRIMARY KEY (id)
);

CREATE UNIQUE INDEX IF NOT EXISTS user_favorites_user_id_property_id_key ON public.user_favorites (user_id, property_id);
CREATE INDEX IF NOT EXISTS user_favorites_tenant_id_idx ON public.user_favorites (tenant_id);

CREATE TABLE IF NOT EXISTS public.failed_login_attempts (
    id         UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT failed_login_attempts_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS failed_login_attempts_user_id_created_at_idx ON public.failed_login_attempts (user_id, created_at);

CREATE TABLE IF NOT EXISTS public.maintenance_tickets (
    id              UUID NOT NULL DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL,
    unit_id         UUID,
    title           TEXT NOT NULL,
    description     TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'pending',
    priority        "Priority" NOT NULL,
    category        TEXT DEFAULT 'other',
    reported_by     TEXT,
    assigned_to     TEXT,
    estimated_cost  DECIMAL(10,2),
    actual_cost     DECIMAL(10,2),
    scheduled_date  TIMESTAMPTZ,
    completed_date  TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT maintenance_tickets_pkey PRIMARY KEY (id),
    CONSTRAINT maintenance_tickets_tenant_id_fkey FOREIGN KEY (tenant_id)
        REFERENCES public.tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS maintenance_tickets_tenant_id_status_idx ON public.maintenance_tickets (tenant_id, status);
CREATE INDEX IF NOT EXISTS maintenance_tickets_unit_id_idx ON public.maintenance_tickets (unit_id);

CREATE TABLE IF NOT EXISTS public.zatca_devices (
    id              UUID NOT NULL DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL,
    device_name     TEXT NOT NULL,
    device_type     TEXT NOT NULL DEFAULT 'COMPLIANCE',
    csr             TEXT,
    compliance_cert TEXT,
    production_cert TEXT,
    private_key     TEXT NOT NULL,
    public_key      TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'ACTIVE',
    expires_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT zatca_devices_pkey PRIMARY KEY (id),
    CONSTRAINT zatca_devices_tenant_id_fkey FOREIGN KEY (tenant_id)
        REFERENCES public.tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_zatca_devices_tenant_id ON public.zatca_devices (tenant_id);

CREATE TABLE IF NOT EXISTS public.zatca_queue (
    id            UUID NOT NULL DEFAULT gen_random_uuid(),
    tenant_id     UUID NOT NULL,
    invoice_id    UUID NOT NULL,
    action        TEXT NOT NULL DEFAULT 'REPORT',
    status        TEXT NOT NULL DEFAULT 'PENDING',
    retry_count   INTEGER NOT NULL DEFAULT 0,
    max_retries   INTEGER NOT NULL DEFAULT 5,
    last_error    TEXT,
    next_retry_at TIMESTAMPTZ,
    payload       TEXT,
    response      TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at  TIMESTAMPTZ,
    CONSTRAINT zatca_queue_pkey PRIMARY KEY (id),
    CONSTRAINT zatca_queue_tenant_id_fkey FOREIGN KEY (tenant_id)
        REFERENCES public.tenants(id) ON DELETE CASCADE,
    CONSTRAINT zatca_queue_invoice_id_fkey FOREIGN KEY (invoice_id)
        REFERENCES public.invoices(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_zatca_queue_tenant_status ON public.zatca_queue (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_zatca_queue_next_retry ON public.zatca_queue (next_retry_at);

CREATE TABLE IF NOT EXISTS public.agent_telemetry_logs (
    id             UUID NOT NULL DEFAULT gen_random_uuid(),
    tenant_id      UUID NOT NULL,
    agent_id       TEXT NOT NULL,
    action_type    TEXT NOT NULL,
    log_message_ar TEXT NOT NULL,
    severity       TEXT NOT NULL DEFAULT 'Info',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT agent_telemetry_logs_pkey PRIMARY KEY (id),
    CONSTRAINT agent_telemetry_logs_tenant_id_fkey FOREIGN KEY (tenant_id)
        REFERENCES public.tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_telemetry_tenant_id ON public.agent_telemetry_logs (tenant_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_created_at ON public.agent_telemetry_logs (created_at DESC);

CREATE TABLE IF NOT EXISTS public.followup_sequences (
    id         UUID NOT NULL DEFAULT gen_random_uuid(),
    tenant_id  UUID NOT NULL,
    status     TEXT NOT NULL,
    delay_days INTEGER NOT NULL,
    message    TEXT NOT NULL,
    is_active  BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT followup_sequences_pkey PRIMARY KEY (id),
    CONSTRAINT followup_sequences_tenant_id_fkey FOREIGN KEY (tenant_id)
        REFERENCES public.tenants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.platform_connections (
    id                UUID NOT NULL DEFAULT gen_random_uuid(),
    tenant_id         UUID NOT NULL,
    platform          TEXT NOT NULL,
    account_id        TEXT NOT NULL,
    encrypted_api_key TEXT,
    status            TEXT NOT NULL DEFAULT 'DISCONNECTED',
    "leadTone"        TEXT NOT NULL DEFAULT 'PROFESSIONAL',
    auto_welcome_msg  TEXT NOT NULL DEFAULT '',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT platform_connections_pkey PRIMARY KEY (id),
    CONSTRAINT platform_connections_tenant_id_fkey FOREIGN KEY (tenant_id)
        REFERENCES public.tenants(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS platform_connections_tenant_id_platform_key ON public.platform_connections (tenant_id, platform);

CREATE TABLE IF NOT EXISTS public.agent_leases (
    id           UUID NOT NULL DEFAULT gen_random_uuid(),
    tenant_id    UUID NOT NULL,
    agent_id     TEXT NOT NULL,
    start_date   TIMESTAMPTZ NOT NULL,
    end_date     TIMESTAMPTZ NOT NULL,
    lease_price  DECIMAL(10,2) NOT NULL,
    auto_renewal BOOLEAN NOT NULL DEFAULT false,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT agent_leases_pkey PRIMARY KEY (id),
    CONSTRAINT agent_leases_tenant_id_fkey FOREIGN KEY (tenant_id)
        REFERENCES public.tenants(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS agent_leases_tenant_id_agent_id_key ON public.agent_leases (tenant_id, agent_id);

CREATE TABLE IF NOT EXISTS public.general_ledger (
    id          TEXT NOT NULL,
    tenant_id   UUID NOT NULL,
    "receiptId" TEXT,
    debit       DECIMAL(65,30) NOT NULL,
    credit      DECIMAL(65,30) NOT NULL,
    description TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT general_ledger_pkey PRIMARY KEY (id),
    CONSTRAINT general_ledger_tenant_id_fkey FOREIGN KEY (tenant_id)
        REFERENCES public.tenants(id) ON DELETE CASCADE,
    CONSTRAINT "general_ledger_receiptId_fkey" FOREIGN KEY ("receiptId")
        REFERENCES public.receipts(id) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "general_ledger_receiptId_key" ON public.general_ledger ("receiptId");
CREATE INDEX IF NOT EXISTS idx_general_ledger_tenant_id ON public.general_ledger (tenant_id);

CREATE TABLE IF NOT EXISTS public.automation_workflows (
    id            UUID NOT NULL DEFAULT gen_random_uuid(),
    tenant_id     UUID NOT NULL,
    name          TEXT NOT NULL,
    trigger_event TEXT NOT NULL,
    actions_json  TEXT NOT NULL,
    is_active     BOOLEAN NOT NULL DEFAULT true,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by    UUID,
    updated_by    UUID,
    audit_log     TEXT,
    CONSTRAINT automation_workflows_pkey PRIMARY KEY (id),
    CONSTRAINT automation_workflows_tenant_id_fkey FOREIGN KEY (tenant_id)
        REFERENCES public.tenants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.telemetry_events (
    id              UUID NOT NULL DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL,
    event_type      TEXT NOT NULL,
    event_data_json TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by      UUID,
    audit_log       TEXT,
    CONSTRAINT telemetry_events_pkey PRIMARY KEY (id),
    CONSTRAINT telemetry_events_tenant_id_fkey FOREIGN KEY (tenant_id)
        REFERENCES public.tenants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.whatsapp_attachments (
    id         UUID NOT NULL DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL,
    type       TEXT NOT NULL,
    mime_type  TEXT,
    url        TEXT,
    size       INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT whatsapp_attachments_pkey PRIMARY KEY (id),
    CONSTRAINT whatsapp_attachments_message_id_fkey FOREIGN KEY (message_id)
        REFERENCES public.whatsapp_messages(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.sentinel_chat_messages (
    id         UUID NOT NULL DEFAULT gen_random_uuid(),
    sender     TEXT NOT NULL,
    message    TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT sentinel_chat_messages_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_sentinel_chat_created ON public.sentinel_chat_messages (created_at DESC);
