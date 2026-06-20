-- Migration: WhatsApp Multi-Tenant Foundation (P0 Batch 1)
-- Enums created by earlier prisma db push — skip CREATE TYPE
-- Non-destructive: preserves existing whatsapp_phone_numbers data

-- ═══ New Tables ══════════════════════════════════════════════════════

-- WhatsAppConnection
CREATE TABLE "whatsapp_connections" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "status" "WhatsAppConnectionStatus" NOT NULL DEFAULT 'DISCONNECTED',
  "waba_id" TEXT,
  "active_since" TIMESTAMPTZ,
  "disconnected_at" TIMESTAMPTZ,
  "last_health_check" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "whatsapp_connections_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "whatsapp_connections_tenant_id_unique" UNIQUE ("tenant_id"),
  CONSTRAINT "whatsapp_connections_waba_id_unique" UNIQUE ("waba_id")
);
CREATE INDEX "idx_whatsapp_connections_status" ON "whatsapp_connections"("status");

-- WhatsAppCredential
CREATE TABLE "whatsapp_credentials" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "connection_id" UUID NOT NULL,
  "encrypted_value" TEXT NOT NULL,
  "iv" TEXT NOT NULL,
  "auth_tag" TEXT NOT NULL,
  "algorithm" TEXT NOT NULL DEFAULT 'AES-256-GCM',
  "key_version" INTEGER NOT NULL DEFAULT 1,
  "token_fingerprint" TEXT NOT NULL,
  "issued_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "last_validated_at" TIMESTAMPTZ,
  "revoked_at" TIMESTAMPTZ,
  "rotated_from" UUID,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "whatsapp_credentials_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "idx_whatsapp_credentials_connection" ON "whatsapp_credentials"("connection_id");
CREATE INDEX "idx_whatsapp_credentials_fingerprint" ON "whatsapp_credentials"("token_fingerprint");
-- Partial unique: at most one active credential per connection
CREATE UNIQUE INDEX "uq_whatsapp_credentials_active" ON "whatsapp_credentials" ("connection_id") WHERE "is_active" = true;

-- WhatsAppPhoneNumber REFINEMENT — add missing columns incrementally
ALTER TABLE "whatsapp_phone_numbers" ADD COLUMN IF NOT EXISTS "connection_id" UUID;
ALTER TABLE "whatsapp_phone_numbers" ADD COLUMN IF NOT EXISTS "display_phone_number" TEXT;
ALTER TABLE "whatsapp_phone_numbers" ADD COLUMN IF NOT EXISTS "waba_id" TEXT;
ALTER TABLE "whatsapp_phone_numbers" ADD COLUMN IF NOT EXISTS "certificate" TEXT;
ALTER TABLE "whatsapp_phone_numbers" ADD COLUMN IF NOT EXISTS "is_primary" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "whatsapp_phone_numbers" ADD COLUMN IF NOT EXISTS "verified_name" TEXT;
ALTER TABLE "whatsapp_phone_numbers" ADD COLUMN IF NOT EXISTS "quality_rating" TEXT;
CREATE INDEX "idx_whatsapp_phone_numbers_connection" ON "whatsapp_phone_numbers"("connection_id");
-- Partial unique: at most one primary phone per connection
CREATE UNIQUE INDEX "uq_whatsapp_phone_numbers_primary" ON "whatsapp_phone_numbers" ("connection_id") WHERE "is_primary" = true;

-- WhatsAppSignupSession
CREATE TABLE "whatsapp_signup_sessions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "connection_id" UUID,
  "state" TEXT NOT NULL,
  "code_verifier" TEXT,
  "redirect_uri" TEXT NOT NULL,
  "status" "WhatsAppSignupSessionStatus" NOT NULL DEFAULT 'PENDING',
  "expires_at" TIMESTAMPTZ NOT NULL,
  "completed_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "whatsapp_signup_sessions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "uq_whatsapp_signup_sessions_state" ON "whatsapp_signup_sessions"("state");
CREATE INDEX "idx_whatsapp_signup_sessions_tenant_status" ON "whatsapp_signup_sessions"("tenant_id", "status");

-- WhatsAppWebhookEnvelope
CREATE TABLE "whatsapp_webhook_envelopes" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "request_hash" TEXT NOT NULL,
  "signature_valid" BOOLEAN NOT NULL DEFAULT false,
  "status" "WhatsAppWebhookEnvelopeStatus" NOT NULL DEFAULT 'RECEIVED',
  "raw_payload_snippet" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "expires_at" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "whatsapp_webhook_envelopes_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "idx_whatsapp_webhook_envelopes_status" ON "whatsapp_webhook_envelopes"("status");
CREATE INDEX "idx_whatsapp_webhook_envelopes_expires" ON "whatsapp_webhook_envelopes"("expires_at");

-- WhatsAppWebhookEvent
CREATE TABLE "whatsapp_webhook_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "envelope_id" UUID NOT NULL,
  "tenant_id" UUID,
  "waba_id" TEXT,
  "phone_number_id" TEXT,
  "event_type" "WhatsAppWebhookEventType" NOT NULL,
  "message_id" TEXT,
  "meta_message_id" TEXT,
  "occurred_at" TIMESTAMPTZ,
  "event_data" JSONB NOT NULL,
  "dedupe_key" TEXT NOT NULL,
  "status" "WhatsAppWebhookEventStatus" NOT NULL DEFAULT 'PENDING',
  "attempt_count" INTEGER NOT NULL DEFAULT 0,
  "max_attempts" INTEGER NOT NULL DEFAULT 3,
  "last_error" TEXT,
  "next_retry_at" TIMESTAMPTZ,
  "processed_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "whatsapp_webhook_events_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "uq_whatsapp_webhook_events_dedupe" ON "whatsapp_webhook_events"("dedupe_key");
CREATE INDEX "idx_whatsapp_webhook_events_envelope" ON "whatsapp_webhook_events"("envelope_id");
CREATE INDEX "idx_whatsapp_webhook_events_tenant_status" ON "whatsapp_webhook_events"("tenant_id", "status");
CREATE INDEX "idx_whatsapp_webhook_events_status_retry" ON "whatsapp_webhook_events"("status", "next_retry_at");

-- WhatsAppTemplate
CREATE TABLE "whatsapp_templates" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "connection_id" UUID NOT NULL,
  "meta_template_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "language" TEXT NOT NULL,
  "category" "WhatsAppTemplateCategory" NOT NULL,
  "meta_status" "WhatsAppTemplateSyncStatus" NOT NULL,
  "is_enabled" BOOLEAN NOT NULL DEFAULT false,
  "quality_score" TEXT,
  "components" JSONB,
  "variables" JSONB,
  "last_synced_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "whatsapp_templates_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "uq_whatsapp_templates_conn_template_lang" ON "whatsapp_templates"("connection_id", "meta_template_id", "language");
CREATE INDEX "idx_whatsapp_templates_conn_meta_status" ON "whatsapp_templates"("connection_id", "meta_status");
CREATE INDEX "idx_whatsapp_templates_conn_enabled" ON "whatsapp_templates"("connection_id", "is_enabled");

-- WhatsAppIntegrationAudit
CREATE TABLE "whatsapp_integration_audits" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "user_id" UUID,
  "connection_id" UUID,
  "credential_id" UUID,
  "phone_number_id" TEXT,
  "action" "WhatsAppIntegrationAuditAction" NOT NULL,
  "details" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "whatsapp_integration_audits_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "idx_whatsapp_integration_audits_tenant" ON "whatsapp_integration_audits"("tenant_id", "created_at");
CREATE INDEX "idx_whatsapp_integration_audits_connection" ON "whatsapp_integration_audits"("connection_id");

-- WhatsAppConsent
CREATE TABLE "whatsapp_consents" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "phone" TEXT NOT NULL,
  "phone_hash" TEXT NOT NULL,
  "consented_at" TIMESTAMPTZ NOT NULL,
  "consent_type" TEXT NOT NULL,
  "source" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "whatsapp_consents_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "uq_whatsapp_consents_tenant_phone_hash" ON "whatsapp_consents"("tenant_id", "phone_hash");

-- WhatsAppOptOut
CREATE TABLE "whatsapp_opt_outs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "phone" TEXT NOT NULL,
  "phone_hash" TEXT NOT NULL,
  "reason" TEXT,
  "source" TEXT,
  "opted_out_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "whatsapp_opt_outs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "uq_whatsapp_opt_outs_tenant_phone_hash" ON "whatsapp_opt_outs"("tenant_id", "phone_hash");

-- ═══ Kill Switch Fields ══════════════════════════════════════════════
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "messaging_disabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "automation_disabled" BOOLEAN NOT NULL DEFAULT false;

-- ═══ WhatsAppMessage Composite Key ═══════════════════════════════════
CREATE UNIQUE INDEX IF NOT EXISTS "uq_whatsapp_messages_tenant_meta" ON "whatsapp_messages" ("tenant_id", "meta_message_id") WHERE "meta_message_id" IS NOT NULL;

-- ═══ Foreign Keys ════════════════════════════════════════════════════
ALTER TABLE "whatsapp_connections" ADD CONSTRAINT "fk_whatsapp_connections_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
ALTER TABLE "whatsapp_credentials" ADD CONSTRAINT "fk_whatsapp_credentials_connection" FOREIGN KEY ("connection_id") REFERENCES "whatsapp_connections"("id") ON DELETE CASCADE;
ALTER TABLE "whatsapp_phone_numbers" ADD CONSTRAINT "fk_whatsapp_phone_numbers_connection" FOREIGN KEY ("connection_id") REFERENCES "whatsapp_connections"("id") ON DELETE SET NULL;
ALTER TABLE "whatsapp_signup_sessions" ADD CONSTRAINT "fk_whatsapp_signup_sessions_connection" FOREIGN KEY ("connection_id") REFERENCES "whatsapp_connections"("id") ON DELETE SET NULL;
ALTER TABLE "whatsapp_webhook_events" ADD CONSTRAINT "fk_whatsapp_webhook_events_envelope" FOREIGN KEY ("envelope_id") REFERENCES "whatsapp_webhook_envelopes"("id") ON DELETE CASCADE;
ALTER TABLE "whatsapp_templates" ADD CONSTRAINT "fk_whatsapp_templates_connection" FOREIGN KEY ("connection_id") REFERENCES "whatsapp_connections"("id") ON DELETE CASCADE;
ALTER TABLE "whatsapp_integration_audits" ADD CONSTRAINT "fk_whatsapp_integration_audits_connection" FOREIGN KEY ("connection_id") REFERENCES "whatsapp_connections"("id") ON DELETE SET NULL;

-- ═══ Trigger for updated_at ═════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_whatsapp_connections_updated_at BEFORE UPDATE ON "whatsapp_connections" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_whatsapp_phone_numbers_updated_at BEFORE UPDATE ON "whatsapp_phone_numbers" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_whatsapp_templates_updated_at BEFORE UPDATE ON "whatsapp_templates" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
