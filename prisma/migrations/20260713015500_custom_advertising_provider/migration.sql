BEGIN;

ALTER TABLE "platform_connections"
  ADD COLUMN IF NOT EXISTS "display_name" TEXT,
  ADD COLUMN IF NOT EXISTS "connection_mode" TEXT NOT NULL DEFAULT 'API',
  ADD COLUMN IF NOT EXISTS "base_url" TEXT,
  ADD COLUMN IF NOT EXISTS "encrypted_credentials" TEXT,
  ADD COLUMN IF NOT EXISTS "provider_config" JSONB,
  ADD COLUMN IF NOT EXISTS "last_tested_at" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "last_error" TEXT;

COMMIT;
