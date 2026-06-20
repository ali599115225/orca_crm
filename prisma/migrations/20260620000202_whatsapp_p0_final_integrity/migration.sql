-- WhatsApp P0 final integrity closure.
-- This migration is intentionally NOT applied by the setup script.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -------------------------------------------------------------------
-- Embedded Signup: retain only a one-way SHA-256 state hash.
-- -------------------------------------------------------------------
ALTER TABLE "whatsapp_signup_sessions"
  ADD COLUMN IF NOT EXISTS "state_hash" TEXT;

UPDATE "whatsapp_signup_sessions"
SET "state_hash" = encode(digest("state", 'sha256'), 'hex')
WHERE "state_hash" IS NULL;

ALTER TABLE "whatsapp_signup_sessions"
  ALTER COLUMN "state_hash" SET NOT NULL;

DROP INDEX IF EXISTS "uq_whatsapp_signup_sessions_state";
DROP INDEX IF EXISTS "whatsapp_signup_sessions_state_key";
DROP INDEX IF EXISTS "idx_whatsapp_signup_sessions_state";

ALTER TABLE "whatsapp_signup_sessions"
  DROP COLUMN IF EXISTS "state";

CREATE UNIQUE INDEX IF NOT EXISTS
  "uq_whatsapp_signup_sessions_state_hash"
  ON "whatsapp_signup_sessions" ("state_hash");

-- -------------------------------------------------------------------
-- Plaintext certificate removal. Refuse data loss if legacy values exist.
-- -------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "whatsapp_phone_numbers"
    WHERE "certificate" IS NOT NULL
      AND btrim("certificate") <> ''
  ) THEN
    RAISE EXCEPTION
      'WHATSAPP_CERTIFICATE_DATA_PRESENT: migrate legacy certificate values securely before applying this migration';
  END IF;
END
$$;

ALTER TABLE "whatsapp_phone_numbers"
  DROP COLUMN IF EXISTS "certificate";

-- -------------------------------------------------------------------
-- Exactly one global platform settings row.
-- Existing duplicate rows are consolidated using the safest disabled state.
-- -------------------------------------------------------------------
ALTER TABLE "whatsapp_platform_settings"
  ADD COLUMN IF NOT EXISTS "singleton_key" TEXT;

DO $$
DECLARE
  keeper UUID;
  merged_messaging BOOLEAN;
  merged_automation BOOLEAN;
BEGIN
  SELECT
    bool_or("whatsapp_messaging_disabled"),
    bool_or("whatsapp_automation_disabled")
  INTO merged_messaging, merged_automation
  FROM "whatsapp_platform_settings";

  SELECT "id"
  INTO keeper
  FROM "whatsapp_platform_settings"
  ORDER BY "created_at", "id"
  LIMIT 1;

  IF keeper IS NULL THEN
    INSERT INTO "whatsapp_platform_settings" (
      "singleton_key",
      "whatsapp_messaging_disabled",
      "whatsapp_automation_disabled"
    )
    VALUES ('global', false, false)
    RETURNING "id" INTO keeper;
  ELSE
    UPDATE "whatsapp_platform_settings"
    SET
      "singleton_key" = 'global',
      "whatsapp_messaging_disabled" = COALESCE(merged_messaging, false),
      "whatsapp_automation_disabled" = COALESCE(merged_automation, false)
    WHERE "id" = keeper;

    DELETE FROM "whatsapp_platform_settings"
    WHERE "id" <> keeper;
  END IF;
END
$$;

ALTER TABLE "whatsapp_platform_settings"
  ALTER COLUMN "singleton_key" SET DEFAULT 'global',
  ALTER COLUMN "singleton_key" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS
  "uq_whatsapp_platform_settings_singleton"
  ON "whatsapp_platform_settings" ("singleton_key");

-- -------------------------------------------------------------------
-- Correct webhook message_id type before adding its FK.
-- Invalid legacy values are quarantined by clearing the optional link.
-- -------------------------------------------------------------------
UPDATE "whatsapp_webhook_events"
SET "message_id" = NULL
WHERE "message_id" IS NOT NULL
  AND "message_id" !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';

ALTER TABLE "whatsapp_webhook_events"
  ALTER COLUMN "message_id" TYPE UUID
  USING "message_id"::uuid;

-- -------------------------------------------------------------------
-- Preflight orphan checks. Never silently delete tenant-owned data.
-- -------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "whatsapp_signup_sessions" s
    LEFT JOIN "tenants" t ON t."id" = s."tenant_id"
    WHERE t."id" IS NULL
  ) THEN RAISE EXCEPTION 'ORPHAN_WHATSAPP_SIGNUP_SESSION_TENANT'; END IF;

  IF EXISTS (
    SELECT 1 FROM "whatsapp_signup_sessions" s
    LEFT JOIN "users" u ON u."id" = s."user_id"
    WHERE u."id" IS NULL
  ) THEN RAISE EXCEPTION 'ORPHAN_WHATSAPP_SIGNUP_SESSION_USER'; END IF;

  IF EXISTS (
    SELECT 1 FROM "whatsapp_templates" x
    LEFT JOIN "tenants" t ON t."id" = x."tenant_id"
    WHERE t."id" IS NULL
  ) THEN RAISE EXCEPTION 'ORPHAN_WHATSAPP_TEMPLATE_TENANT'; END IF;

  IF EXISTS (
    SELECT 1 FROM "whatsapp_integration_audits" x
    LEFT JOIN "tenants" t ON t."id" = x."tenant_id"
    WHERE t."id" IS NULL
  ) THEN RAISE EXCEPTION 'ORPHAN_WHATSAPP_AUDIT_TENANT'; END IF;

  IF EXISTS (
    SELECT 1 FROM "whatsapp_consents" x
    LEFT JOIN "tenants" t ON t."id" = x."tenant_id"
    WHERE t."id" IS NULL
  ) THEN RAISE EXCEPTION 'ORPHAN_WHATSAPP_CONSENT_TENANT'; END IF;

  IF EXISTS (
    SELECT 1 FROM "whatsapp_opt_outs" x
    LEFT JOIN "tenants" t ON t."id" = x."tenant_id"
    WHERE t."id" IS NULL
  ) THEN RAISE EXCEPTION 'ORPHAN_WHATSAPP_OPT_OUT_TENANT'; END IF;
END
$$;

-- -------------------------------------------------------------------
-- Missing foreign keys.
-- -------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_whatsapp_signup_sessions_tenant') THEN
    ALTER TABLE "whatsapp_signup_sessions"
      ADD CONSTRAINT "fk_whatsapp_signup_sessions_tenant"
      FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_whatsapp_signup_sessions_user') THEN
    ALTER TABLE "whatsapp_signup_sessions"
      ADD CONSTRAINT "fk_whatsapp_signup_sessions_user"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_whatsapp_webhook_events_tenant') THEN
    ALTER TABLE "whatsapp_webhook_events"
      ADD CONSTRAINT "fk_whatsapp_webhook_events_tenant"
      FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_whatsapp_webhook_events_message') THEN
    ALTER TABLE "whatsapp_webhook_events"
      ADD CONSTRAINT "fk_whatsapp_webhook_events_message"
      FOREIGN KEY ("message_id") REFERENCES "whatsapp_messages"("id") ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_whatsapp_templates_tenant') THEN
    ALTER TABLE "whatsapp_templates"
      ADD CONSTRAINT "fk_whatsapp_templates_tenant"
      FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_whatsapp_integration_audits_tenant') THEN
    ALTER TABLE "whatsapp_integration_audits"
      ADD CONSTRAINT "fk_whatsapp_integration_audits_tenant"
      FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_whatsapp_integration_audits_user') THEN
    ALTER TABLE "whatsapp_integration_audits"
      ADD CONSTRAINT "fk_whatsapp_integration_audits_user"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_whatsapp_integration_audits_credential') THEN
    ALTER TABLE "whatsapp_integration_audits"
      ADD CONSTRAINT "fk_whatsapp_integration_audits_credential"
      FOREIGN KEY ("credential_id") REFERENCES "whatsapp_credentials"("id") ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_whatsapp_integration_audits_phone') THEN
    ALTER TABLE "whatsapp_integration_audits"
      ADD CONSTRAINT "fk_whatsapp_integration_audits_phone"
      FOREIGN KEY ("phone_number_id") REFERENCES "whatsapp_phone_numbers"("phone_number_id") ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_whatsapp_consents_tenant') THEN
    ALTER TABLE "whatsapp_consents"
      ADD CONSTRAINT "fk_whatsapp_consents_tenant"
      FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_whatsapp_opt_outs_tenant') THEN
    ALTER TABLE "whatsapp_opt_outs"
      ADD CONSTRAINT "fk_whatsapp_opt_outs_tenant"
      FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_whatsapp_credentials_rotated_from') THEN
    ALTER TABLE "whatsapp_credentials"
      ADD CONSTRAINT "fk_whatsapp_credentials_rotated_from"
      FOREIGN KEY ("rotated_from") REFERENCES "whatsapp_credentials"("id") ON DELETE SET NULL;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS "idx_whatsapp_webhook_events_message"
  ON "whatsapp_webhook_events" ("message_id");
CREATE INDEX IF NOT EXISTS "idx_whatsapp_integration_audits_user"
  ON "whatsapp_integration_audits" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_whatsapp_integration_audits_credential"
  ON "whatsapp_integration_audits" ("credential_id");
CREATE INDEX IF NOT EXISTS "idx_whatsapp_integration_audits_phone"
  ON "whatsapp_integration_audits" ("phone_number_id");

-- -------------------------------------------------------------------
-- Cross-tenant integrity for tables carrying tenant_id plus references.
-- -------------------------------------------------------------------
CREATE OR REPLACE FUNCTION enforce_whatsapp_connection_tenant_match()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."connection_id" IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM "whatsapp_connections" c
    WHERE c."id" = NEW."connection_id"
      AND c."tenant_id" = NEW."tenant_id"
  ) THEN
    RAISE EXCEPTION 'WHATSAPP_CONNECTION_TENANT_MISMATCH';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "trg_whatsapp_phone_tenant_match"
  ON "whatsapp_phone_numbers";
DROP TRIGGER IF EXISTS "trg_whatsapp_signup_connection_tenant_match"
  ON "whatsapp_signup_sessions";
DROP TRIGGER IF EXISTS "trg_whatsapp_template_connection_tenant_match"
  ON "whatsapp_templates";
DROP TRIGGER IF EXISTS "trg_whatsapp_audit_connection_tenant_match"
  ON "whatsapp_integration_audits";

CREATE TRIGGER "trg_whatsapp_phone_tenant_match"
  BEFORE INSERT OR UPDATE ON "whatsapp_phone_numbers"
  FOR EACH ROW EXECUTE FUNCTION enforce_whatsapp_connection_tenant_match();

CREATE TRIGGER "trg_whatsapp_signup_connection_tenant_match"
  BEFORE INSERT OR UPDATE ON "whatsapp_signup_sessions"
  FOR EACH ROW EXECUTE FUNCTION enforce_whatsapp_connection_tenant_match();

CREATE TRIGGER "trg_whatsapp_template_connection_tenant_match"
  BEFORE INSERT OR UPDATE ON "whatsapp_templates"
  FOR EACH ROW EXECUTE FUNCTION enforce_whatsapp_connection_tenant_match();

CREATE TRIGGER "trg_whatsapp_audit_connection_tenant_match"
  BEFORE INSERT OR UPDATE ON "whatsapp_integration_audits"
  FOR EACH ROW EXECUTE FUNCTION enforce_whatsapp_connection_tenant_match();

CREATE OR REPLACE FUNCTION enforce_whatsapp_user_tenant_match()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."user_id" IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM "users" u
    WHERE u."id" = NEW."user_id"
      AND u."tenant_id" = NEW."tenant_id"
  ) THEN
    RAISE EXCEPTION 'WHATSAPP_USER_TENANT_MISMATCH';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "trg_whatsapp_signup_user_tenant_match"
  ON "whatsapp_signup_sessions";
DROP TRIGGER IF EXISTS "trg_whatsapp_audit_user_tenant_match"
  ON "whatsapp_integration_audits";

CREATE TRIGGER "trg_whatsapp_signup_user_tenant_match"
  BEFORE INSERT OR UPDATE ON "whatsapp_signup_sessions"
  FOR EACH ROW EXECUTE FUNCTION enforce_whatsapp_user_tenant_match();

CREATE TRIGGER "trg_whatsapp_audit_user_tenant_match"
  BEFORE INSERT OR UPDATE ON "whatsapp_integration_audits"
  FOR EACH ROW EXECUTE FUNCTION enforce_whatsapp_user_tenant_match();

CREATE OR REPLACE FUNCTION enforce_whatsapp_audit_credential_tenant_match()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."credential_id" IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM "whatsapp_credentials" cr
    JOIN "whatsapp_connections" c ON c."id" = cr."connection_id"
    WHERE cr."id" = NEW."credential_id"
      AND c."tenant_id" = NEW."tenant_id"
  ) THEN
    RAISE EXCEPTION 'WHATSAPP_CREDENTIAL_TENANT_MISMATCH';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "trg_whatsapp_audit_credential_tenant_match"
  ON "whatsapp_integration_audits";

CREATE TRIGGER "trg_whatsapp_audit_credential_tenant_match"
  BEFORE INSERT OR UPDATE ON "whatsapp_integration_audits"
  FOR EACH ROW EXECUTE FUNCTION enforce_whatsapp_audit_credential_tenant_match();

CREATE OR REPLACE FUNCTION enforce_whatsapp_event_message_tenant_match()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."message_id" IS NOT NULL THEN
    IF NEW."tenant_id" IS NULL OR NOT EXISTS (
      SELECT 1
      FROM "whatsapp_messages" m
      WHERE m."id" = NEW."message_id"
        AND m."tenant_id" = NEW."tenant_id"
    ) THEN
      RAISE EXCEPTION 'WHATSAPP_EVENT_MESSAGE_TENANT_MISMATCH';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "trg_whatsapp_event_message_tenant_match"
  ON "whatsapp_webhook_events";

CREATE TRIGGER "trg_whatsapp_event_message_tenant_match"
  BEFORE INSERT OR UPDATE ON "whatsapp_webhook_events"
  FOR EACH ROW EXECUTE FUNCTION enforce_whatsapp_event_message_tenant_match();