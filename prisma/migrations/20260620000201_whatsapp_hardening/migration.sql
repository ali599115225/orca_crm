-- Migration: WhatsApp Hardening
-- Platform settings, remaining FKs, signup state_hash

-- ═══ Platform Settings ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS "whatsapp_platform_settings" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "whatsapp_messaging_disabled" BOOLEAN NOT NULL DEFAULT false,
  "whatsapp_automation_disabled" BOOLEAN NOT NULL DEFAULT false,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "whatsapp_platform_settings_pkey" PRIMARY KEY ("id")
);

-- Seed: ensure a row exists
INSERT INTO "whatsapp_platform_settings" ("whatsapp_messaging_disabled", "whatsapp_automation_disabled")
SELECT false, false
WHERE NOT EXISTS (SELECT 1 FROM "whatsapp_platform_settings");

-- ═══ WhatsAppPhoneNumber composite FK enforcement ════════════════
-- Ensure phone's tenant matches connection's tenant
CREATE OR REPLACE FUNCTION check_whatsapp_phone_tenant_match()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.connection_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM whatsapp_connections
      WHERE id = NEW.connection_id AND tenant_id = NEW.tenant_id
    ) THEN
      RAISE EXCEPTION 'whatsapp_phone_numbers tenant_id must match connection tenant_id';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_whatsapp_phone_tenant_match
  BEFORE INSERT OR UPDATE ON whatsapp_phone_numbers
  FOR EACH ROW EXECUTE FUNCTION check_whatsapp_phone_tenant_match();

-- ═══ Signup session state hash ═══════════════════════════════════════
ALTER TABLE "whatsapp_signup_sessions" ADD COLUMN IF NOT EXISTS "state_hash" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "uq_whatsapp_signup_sessions_state_hash" ON "whatsapp_signup_sessions" ("state_hash") WHERE "state_hash" IS NOT NULL;
