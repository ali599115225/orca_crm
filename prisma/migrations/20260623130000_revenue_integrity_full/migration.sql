CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN CREATE TYPE "RevenueRiskSeverity" AS ENUM ('LOW','MEDIUM','HIGH','CRITICAL'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "RevenueRiskStatus" AS ENUM ('OPEN','ACKNOWLEDGED','RESOLVED','DISMISSED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "RevenueSuggestionStatus" AS ENUM ('PENDING_APPROVAL','APPROVED','REJECTED','EXECUTED','FAILED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "RevenueProviderStatus" AS ENUM ('NOT_CONFIGURED','PENDING','CONNECTED','ERROR','DISCONNECTED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "RevenueOutboxStatus" AS ENUM ('PENDING','RETRY','DELIVERED','DEAD_LETTER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "RevenueProviderApplicationStatus" AS ENUM ('DRAFT','SUBMITTED','UNDER_REVIEW','APPROVED','REJECTED','CANCELLED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "RevenueModelStatus" AS ENUM ('NOT_READY','TRAINING','ACTIVE','ARCHIVED','FAILED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS revenue_risk_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  rule_code VARCHAR(80) NOT NULL, fingerprint VARCHAR(255) NOT NULL, subject_type VARCHAR(80) NOT NULL,
  subject_id VARCHAR(120) NOT NULL, opportunity_id UUID NULL, invoice_id UUID NULL,
  severity "RevenueRiskSeverity" NOT NULL, status "RevenueRiskStatus" NOT NULL DEFAULT 'OPEN',
  reason_ar TEXT NOT NULL, reason_en TEXT NOT NULL, revenue_at_risk NUMERIC(18,2) NOT NULL DEFAULT 0,
  assignee_id UUID NULL REFERENCES users(id) ON DELETE SET NULL, due_at TIMESTAMPTZ NULL,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ NULL, acknowledged_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ NULL, resolved_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  resolution_reason TEXT NULL, metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT revenue_risk_tenant_fingerprint_uq UNIQUE (tenant_id, fingerprint)
);
CREATE INDEX IF NOT EXISTS revenue_risk_tenant_status_severity_idx ON revenue_risk_signals(tenant_id,status,severity);
CREATE INDEX IF NOT EXISTS revenue_risk_tenant_opportunity_idx ON revenue_risk_signals(tenant_id,opportunity_id);
CREATE INDEX IF NOT EXISTS revenue_risk_tenant_invoice_idx ON revenue_risk_signals(tenant_id,invoice_id);

CREATE TABLE IF NOT EXISTS revenue_rule_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  idempotency_key VARCHAR(160) NOT NULL, started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), completed_at TIMESTAMPTZ NULL,
  detected_count INTEGER NOT NULL DEFAULT 0, resolved_count INTEGER NOT NULL DEFAULT 0,
  skipped_rules JSONB NOT NULL DEFAULT '[]'::jsonb, result JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), CONSTRAINT revenue_rule_run_tenant_idempotency_uq UNIQUE(tenant_id,idempotency_key)
);
CREATE INDEX IF NOT EXISTS revenue_rule_run_tenant_started_idx ON revenue_rule_runs(tenant_id,started_at DESC);

CREATE TABLE IF NOT EXISTS revenue_next_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  target_type VARCHAR(80) NOT NULL, target_id VARCHAR(120) NOT NULL, opportunity_id UUID NULL,
  action_type VARCHAR(80) NOT NULL, title VARCHAR(255) NOT NULL, description TEXT NULL,
  assigned_to UUID NULL REFERENCES users(id) ON DELETE SET NULL, due_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'OPEN', source_suggestion_id UUID NULL,
  completed_at TIMESTAMPTZ NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS revenue_next_action_tenant_status_due_idx ON revenue_next_actions(tenant_id,status,due_at);
CREATE INDEX IF NOT EXISTS revenue_next_action_tenant_opportunity_idx ON revenue_next_actions(tenant_id,opportunity_id);

CREATE TABLE IF NOT EXISTS revenue_action_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  source_type VARCHAR(80) NOT NULL, source_id VARCHAR(120) NOT NULL, source_text_hash VARCHAR(64) NOT NULL,
  opportunity_id UUID NULL, contact_id UUID NULL, lead_id UUID NULL, unit_id UUID NULL,
  intent VARCHAR(80) NOT NULL, extracted_entities JSONB NOT NULL DEFAULT '{}'::jsonb,
  action_type VARCHAR(80) NOT NULL, action_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  confidence NUMERIC(5,4) NOT NULL, rationale_ar TEXT NOT NULL, rationale_en TEXT NOT NULL,
  status "RevenueSuggestionStatus" NOT NULL DEFAULT 'PENDING_APPROVAL', created_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  decided_by UUID NULL REFERENCES users(id) ON DELETE SET NULL, decided_at TIMESTAMPTZ NULL,
  decision_reason TEXT NULL, execution_result JSONB NULL, executed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS revenue_suggestion_tenant_status_created_idx ON revenue_action_suggestions(tenant_id,status,created_at DESC);
CREATE INDEX IF NOT EXISTS revenue_suggestion_tenant_opportunity_idx ON revenue_action_suggestions(tenant_id,opportunity_id);

CREATE TABLE IF NOT EXISTS revenue_domain_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  actor_id UUID NULL REFERENCES users(id) ON DELETE SET NULL, aggregate_type VARCHAR(80) NOT NULL,
  aggregate_id VARCHAR(120) NOT NULL, event_type VARCHAR(120) NOT NULL, correlation_id VARCHAR(120) NOT NULL,
  causation_id VARCHAR(120) NULL, idempotency_key VARCHAR(180) NOT NULL,
  before_data JSONB NULL, after_data JSONB NULL, metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT revenue_event_tenant_idempotency_uq UNIQUE(tenant_id,idempotency_key)
);
CREATE INDEX IF NOT EXISTS revenue_event_aggregate_idx ON revenue_domain_events(tenant_id,aggregate_type,aggregate_id,occurred_at DESC);
CREATE INDEX IF NOT EXISTS revenue_event_correlation_idx ON revenue_domain_events(tenant_id,correlation_id);

CREATE TABLE IF NOT EXISTS revenue_audit_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  actor_id UUID NULL REFERENCES users(id) ON DELETE SET NULL, action VARCHAR(120) NOT NULL,
  resource_type VARCHAR(80) NOT NULL, resource_id VARCHAR(120) NOT NULL, correlation_id VARCHAR(120) NOT NULL,
  before_data JSONB NULL, after_data JSONB NULL, ip_hash VARCHAR(64) NULL, user_agent_hash VARCHAR(64) NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS revenue_audit_resource_idx ON revenue_audit_entries(tenant_id,resource_type,resource_id,created_at DESC);
CREATE INDEX IF NOT EXISTS revenue_audit_correlation_idx ON revenue_audit_entries(tenant_id,correlation_id);

CREATE TABLE IF NOT EXISTS revenue_outbox_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES revenue_domain_events(id) ON DELETE CASCADE, topic VARCHAR(120) NOT NULL,
  payload JSONB NOT NULL, status "RevenueOutboxStatus" NOT NULL DEFAULT 'PENDING', attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), last_error TEXT NULL, delivered_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS revenue_outbox_status_next_idx ON revenue_outbox_messages(status,next_attempt_at);
CREATE INDEX IF NOT EXISTS revenue_outbox_tenant_created_idx ON revenue_outbox_messages(tenant_id,created_at DESC);

CREATE TABLE IF NOT EXISTS revenue_provider_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider VARCHAR(40) NOT NULL, status "RevenueProviderStatus" NOT NULL DEFAULT 'PENDING', base_url TEXT NULL,
  encrypted_credentials TEXT NOT NULL, credentials_version INTEGER NOT NULL DEFAULT 1, is_default BOOLEAN NOT NULL DEFAULT FALSE,
  last_tested_at TIMESTAMPTZ NULL, last_success_at TIMESTAMPTZ NULL, last_error TEXT NULL,
  webhook_secret_hash VARCHAR(64) NULL, metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID NULL REFERENCES users(id) ON DELETE SET NULL, updated_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT revenue_provider_tenant_provider_uq UNIQUE(tenant_id,provider)
);
CREATE INDEX IF NOT EXISTS revenue_provider_tenant_status_idx ON revenue_provider_connections(tenant_id,status);

CREATE TABLE IF NOT EXISTS revenue_provider_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider VARCHAR(40) NOT NULL, connection_id UUID NOT NULL REFERENCES revenue_provider_connections(id) ON DELETE CASCADE,
  external_event_id VARCHAR(180) NOT NULL, payload_hash VARCHAR(64) NOT NULL, verified BOOLEAN NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'RECEIVED', payload JSONB NOT NULL, error TEXT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), processed_at TIMESTAMPTZ NULL,
  CONSTRAINT revenue_webhook_tenant_provider_external_uq UNIQUE(tenant_id,provider,external_event_id)
);
CREATE INDEX IF NOT EXISTS revenue_webhook_tenant_provider_idx ON revenue_provider_webhooks(tenant_id,provider,received_at DESC);


CREATE TABLE IF NOT EXISTS revenue_provider_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider VARCHAR(40) NOT NULL, status "RevenueProviderApplicationStatus" NOT NULL DEFAULT 'DRAFT',
  company_data JSONB NOT NULL DEFAULT '{}'::jsonb, documents JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT NULL, external_reference VARCHAR(180) NULL,
  submitted_by UUID NULL REFERENCES users(id) ON DELETE SET NULL, submitted_at TIMESTAMPTZ NULL,
  reviewed_at TIMESTAMPTZ NULL, decision_reason TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS revenue_provider_application_tenant_idx
  ON revenue_provider_applications(tenant_id,provider,status);

CREATE TABLE IF NOT EXISTS revenue_dataset_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  version INTEGER NOT NULL, row_count INTEGER NOT NULL, feature_schema JSONB NOT NULL,
  label_distribution JSONB NOT NULL, data_hash VARCHAR(64) NOT NULL,
  period_start TIMESTAMPTZ NULL, period_end TIMESTAMPTZ NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT revenue_dataset_tenant_version_uq UNIQUE(tenant_id,version)
);
CREATE INDEX IF NOT EXISTS revenue_dataset_tenant_created_idx ON revenue_dataset_snapshots(tenant_id,created_at DESC);

CREATE TABLE IF NOT EXISTS revenue_model_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  version INTEGER NOT NULL, status "RevenueModelStatus" NOT NULL DEFAULT 'TRAINING', algorithm VARCHAR(80) NOT NULL,
  dataset_snapshot_id UUID NULL REFERENCES revenue_dataset_snapshots(id) ON DELETE SET NULL,
  feature_schema JSONB NOT NULL, artifact JSONB NOT NULL, metrics JSONB NOT NULL, minimum_rows INTEGER NOT NULL DEFAULT 30,
  drift_score NUMERIC(8,4) NULL, drift_status VARCHAR(40) NULL, activated_at TIMESTAMPTZ NULL,
  archived_at TIMESTAMPTZ NULL, failure_reason TEXT NULL, created_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT revenue_model_tenant_version_uq UNIQUE(tenant_id,version)
);
CREATE INDEX IF NOT EXISTS revenue_model_tenant_status_idx ON revenue_model_versions(tenant_id,status,created_at DESC);

CREATE TABLE IF NOT EXISTS revenue_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  model_version_id UUID NOT NULL REFERENCES revenue_model_versions(id) ON DELETE CASCADE,
  opportunity_id UUID NOT NULL, probability NUMERIC(8,6) NOT NULL, confidence NUMERIC(8,6) NOT NULL,
  explanation JSONB NOT NULL, feature_snapshot JSONB NOT NULL, outcome VARCHAR(40) NULL,
  scored_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), resolved_at TIMESTAMPTZ NULL,
  CONSTRAINT revenue_prediction_model_opportunity_uq UNIQUE(tenant_id,model_version_id,opportunity_id)
);
CREATE INDEX IF NOT EXISTS revenue_prediction_opportunity_idx ON revenue_predictions(tenant_id,opportunity_id,scored_at DESC);

CREATE OR REPLACE FUNCTION orca_revenue_set_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DO $$ DECLARE t TEXT; BEGIN
  FOREACH t IN ARRAY ARRAY['revenue_risk_signals','revenue_next_actions','revenue_action_suggestions','revenue_outbox_messages','revenue_provider_connections','revenue_provider_applications','revenue_model_versions'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I', 'trg_' || t || '_updated_at', t);
    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION orca_revenue_set_updated_at()', 'trg_' || t || '_updated_at', t);
  END LOOP;
END $$;
