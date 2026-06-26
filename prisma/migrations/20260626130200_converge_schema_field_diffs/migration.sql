-- SCHEMA_GAP closure, Migration 2: converge remaining existing-table field and
-- index/constraint differences between the migrated database and
-- schema.prisma, generated from a real `prisma migrate diff` re-run after
-- Migrations 0 and 1 and the schema.prisma map:/field fixes in this gate.
--
-- Every `SET NOT NULL` below is preceded by a live NULL-count guard that
-- RAISE EXCEPTIONs with the row count instead of guessing a backfill value --
-- same pattern as the rental_leases.vat_type/vat_rate fix in migration 53.
-- Everything else here is widenings, DROP DEFAULT (Prisma manages these
-- client-side), nullable ADD COLUMN, or NOT-NULL-with-DEFAULT ADD COLUMN
-- (always safe in Postgres -- existing rows get backfilled to the default),
-- so no guard is needed for those.
--
-- The legacy global unique whatsapp_messages.meta_message_id constraint is
-- dropped per the project's own documented intent (see the comment already
-- in prisma/schema.prisma above the WhatsAppPlatformSettings model: "REPLACES
-- global @unique on metaMessageId with tenantId + metaMessageId composite").
-- The composite unique already enforces per-tenant uniqueness; dropping a
-- redundant broader UNIQUE constraint can never violate existing data.

DO $migration$
DECLARE
    null_count INTEGER;
BEGIN
    -- invoices: guarded tightenings
    SELECT COUNT(*) INTO null_count FROM public.invoices WHERE zatca_uuid IS NULL;
    IF null_count > 0 THEN
        RAISE EXCEPTION 'invoices.zatca_uuid: % row(s) NULL -- refusing to guess a value', null_count;
    END IF;

    SELECT COUNT(*) INTO null_count FROM public.invoices WHERE issue_date IS NULL;
    IF null_count > 0 THEN
        RAISE EXCEPTION 'invoices.issue_date: % row(s) NULL -- refusing to guess a value', null_count;
    END IF;

    SELECT COUNT(*) INTO null_count FROM public.invoices WHERE vat_rate IS NULL;
    IF null_count > 0 THEN
        RAISE EXCEPTION 'invoices.vat_rate: % row(s) NULL -- refusing to guess a value', null_count;
    END IF;

    SELECT COUNT(*) INTO null_count FROM public.invoices WHERE invoice_type_code IS NULL;
    IF null_count > 0 THEN
        RAISE EXCEPTION 'invoices.invoice_type_code: % row(s) NULL -- refusing to guess a value', null_count;
    END IF;

    SELECT COUNT(*) INTO null_count FROM public.invoices WHERE zatca_status IS NULL;
    IF null_count > 0 THEN
        RAISE EXCEPTION 'invoices.zatca_status: % row(s) NULL -- refusing to guess a value', null_count;
    END IF;

    SELECT COUNT(*) INTO null_count FROM public.invoices WHERE status IS NULL;
    IF null_count > 0 THEN
        RAISE EXCEPTION 'invoices.status: % row(s) NULL -- refusing to guess a value', null_count;
    END IF;

    SELECT COUNT(*) INTO null_count FROM public.invoices WHERE created_at IS NULL;
    IF null_count > 0 THEN
        RAISE EXCEPTION 'invoices.created_at: % row(s) NULL -- refusing to guess a value', null_count;
    END IF;

    SELECT COUNT(*) INTO null_count FROM public.invoices WHERE updated_at IS NULL;
    IF null_count > 0 THEN
        RAISE EXCEPTION 'invoices.updated_at: % row(s) NULL -- refusing to guess a value', null_count;
    END IF;

    ALTER TABLE public.invoices
        ALTER COLUMN invoice_prefix TYPE TEXT,
        ALTER COLUMN zatca_uuid SET NOT NULL,
        ALTER COLUMN issue_date SET NOT NULL,
        ALTER COLUMN issue_date SET DEFAULT CURRENT_TIMESTAMP,
        ALTER COLUMN vat_rate SET NOT NULL,
        ALTER COLUMN vat_amount DROP DEFAULT,
        ALTER COLUMN invoice_type_code SET NOT NULL,
        ALTER COLUMN invoice_type_code TYPE TEXT,
        ALTER COLUMN zatca_status SET NOT NULL,
        ALTER COLUMN zatca_status TYPE TEXT,
        ALTER COLUMN status SET NOT NULL,
        ALTER COLUMN status TYPE TEXT,
        ALTER COLUMN payment_method TYPE TEXT,
        ALTER COLUMN payment_ref TYPE TEXT,
        ALTER COLUMN created_at SET NOT NULL,
        ALTER COLUMN updated_at SET NOT NULL;

    -- whatsapp_messages: guarded tightenings
    SELECT COUNT(*) INTO null_count FROM public.whatsapp_messages WHERE direction IS NULL;
    IF null_count > 0 THEN
        RAISE EXCEPTION 'whatsapp_messages.direction: % row(s) NULL -- refusing to guess a value', null_count;
    END IF;

    SELECT COUNT(*) INTO null_count FROM public.whatsapp_messages WHERE provider IS NULL;
    IF null_count > 0 THEN
        RAISE EXCEPTION 'whatsapp_messages.provider: % row(s) NULL -- refusing to guess a value', null_count;
    END IF;

    ALTER TABLE public.whatsapp_messages
        ALTER COLUMN direction SET NOT NULL,
        ALTER COLUMN provider SET NOT NULL;
END
$migration$;

-- Unguarded, always-safe changes (widenings / DROP DEFAULT / nullable or
-- NOT-NULL-with-DEFAULT ADD COLUMN)

ALTER TABLE public.email_messages ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public.government_outbox ALTER COLUMN status TYPE TEXT;

ALTER TABLE public.leads
    ADD COLUMN IF NOT EXISTS assigned_agent_id UUID,
    ADD COLUMN IF NOT EXISTS audit_log TEXT,
    ADD COLUMN IF NOT EXISTS created_by UUID,
    ADD COLUMN IF NOT EXISTS score INTEGER,
    ADD COLUMN IF NOT EXISTS stage TEXT,
    ADD COLUMN IF NOT EXISTS updated_by UUID;

ALTER TABLE public.revenue_action_suggestions
    ALTER COLUMN extracted_entities DROP DEFAULT,
    ALTER COLUMN action_payload DROP DEFAULT,
    ALTER COLUMN updated_at DROP DEFAULT;

ALTER TABLE public.revenue_domain_events ALTER COLUMN metadata DROP DEFAULT;
ALTER TABLE public.revenue_intelligence_scores ALTER COLUMN updated_at DROP DEFAULT;
ALTER TABLE public.revenue_model_versions ALTER COLUMN updated_at DROP DEFAULT;
ALTER TABLE public.revenue_next_actions ALTER COLUMN updated_at DROP DEFAULT;
ALTER TABLE public.revenue_outbox_messages ALTER COLUMN updated_at DROP DEFAULT;

ALTER TABLE public.revenue_provider_applications
    ALTER COLUMN company_data DROP DEFAULT,
    ALTER COLUMN documents DROP DEFAULT,
    ALTER COLUMN updated_at DROP DEFAULT;

ALTER TABLE public.revenue_provider_connections
    ALTER COLUMN metadata DROP DEFAULT,
    ALTER COLUMN updated_at DROP DEFAULT;

ALTER TABLE public.revenue_risk_signals
    ALTER COLUMN metadata DROP DEFAULT,
    ALTER COLUMN updated_at DROP DEFAULT;

ALTER TABLE public.revenue_rule_runs
    ALTER COLUMN skipped_rules DROP DEFAULT,
    ALTER COLUMN result DROP DEFAULT;

ALTER TABLE public.sentinel_config
    ADD COLUMN IF NOT EXISTS deep_repair_wait_minutes INTEGER NOT NULL DEFAULT 15,
    ADD COLUMN IF NOT EXISTS delegation_level TEXT NOT NULL DEFAULT 'MONITORING_ONLY',
    ADD COLUMN IF NOT EXISTS fallback_plan_active BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.sync_events
    ALTER COLUMN created_at TYPE TIMESTAMP(3),
    ALTER COLUMN expires_at TYPE TIMESTAMP(3);

ALTER TABLE public.tasks
    ADD COLUMN IF NOT EXISTS audit_log TEXT,
    ADD COLUMN IF NOT EXISTS created_by UUID,
    ADD COLUMN IF NOT EXISTS updated_by UUID;

ALTER TABLE public.tenants
    ADD COLUMN IF NOT EXISTS commercial_registry TEXT,
    ADD COLUMN IF NOT EXISTS encrypted_api_key TEXT,
    ADD COLUMN IF NOT EXISTS encrypted_client_id TEXT,
    ADD COLUMN IF NOT EXISTS encrypted_client_secret TEXT,
    ADD COLUMN IF NOT EXISTS encrypted_zatca_credentials TEXT,
    ADD COLUMN IF NOT EXISTS extra_agents INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS growth_warning BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS invoice_prefix TEXT NOT NULL DEFAULT 'INV',
    ADD COLUMN IF NOT EXISTS national_address TEXT,
    ADD COLUMN IF NOT EXISTS next_invoice_number INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS vat_number TEXT,
    ADD COLUMN IF NOT EXISTS whatsapp_connected BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.whatsapp_connections
    ALTER COLUMN id DROP DEFAULT,
    ALTER COLUMN updated_at DROP DEFAULT;

ALTER TABLE public.whatsapp_consents ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.whatsapp_contacts ALTER COLUMN last_message_at TYPE TIMESTAMP(3);
ALTER TABLE public.whatsapp_credentials ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.whatsapp_integration_audits ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.whatsapp_opt_outs ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.whatsapp_phone_numbers ALTER COLUMN id DROP DEFAULT;

ALTER TABLE public.whatsapp_platform_settings
    ALTER COLUMN id DROP DEFAULT,
    ALTER COLUMN updated_at DROP DEFAULT;

ALTER TABLE public.whatsapp_signup_sessions ALTER COLUMN id DROP DEFAULT;

ALTER TABLE public.whatsapp_templates
    ALTER COLUMN id DROP DEFAULT,
    ALTER COLUMN updated_at DROP DEFAULT;

ALTER TABLE public.whatsapp_webhook_envelopes ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.whatsapp_webhook_events ALTER COLUMN id DROP DEFAULT;

-- whatsapp_messages: legacy global unique superseded by the tenant-scoped
-- composite (already documented in schema.prisma above WhatsAppPlatformSettings)
DROP INDEX IF EXISTS uq_whatsapp_messages_meta_message_id;

-- New indexes (no naming conflict -- these never existed under any name)
CREATE INDEX IF NOT EXISTS payment_transactions_provider_idx ON public.payment_transactions (provider);
CREATE INDEX IF NOT EXISTS payment_transactions_provider_transaction_id_idx ON public.payment_transactions (provider_transaction_id);
CREATE INDEX IF NOT EXISTS payment_transactions_provider_invoice_id_idx ON public.payment_transactions (provider_invoice_id);

CREATE INDEX IF NOT EXISTS revenue_suggestion_tenant_status_created_idx ON public.revenue_action_suggestions (tenant_id, status, created_at);
CREATE INDEX IF NOT EXISTS revenue_audit_resource_idx ON public.revenue_audit_entries (tenant_id, resource_type, resource_id, created_at);
CREATE INDEX IF NOT EXISTS revenue_dataset_tenant_created_idx ON public.revenue_dataset_snapshots (tenant_id, created_at);
CREATE INDEX IF NOT EXISTS revenue_event_aggregate_idx ON public.revenue_domain_events (tenant_id, aggregate_type, aggregate_id, occurred_at);
CREATE INDEX IF NOT EXISTS revenue_model_tenant_status_idx ON public.revenue_model_versions (tenant_id, status, created_at);
CREATE INDEX IF NOT EXISTS revenue_outbox_tenant_created_idx ON public.revenue_outbox_messages (tenant_id, created_at);
CREATE INDEX IF NOT EXISTS revenue_prediction_opportunity_idx ON public.revenue_predictions (tenant_id, opportunity_id, scored_at);
CREATE INDEX IF NOT EXISTS revenue_webhook_tenant_provider_idx ON public.revenue_provider_webhooks (tenant_id, provider, received_at);
CREATE INDEX IF NOT EXISTS revenue_rule_run_tenant_started_idx ON public.revenue_rule_runs (tenant_id, started_at);

CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_contacts_lead_id_key ON public.whatsapp_contacts (lead_id);
