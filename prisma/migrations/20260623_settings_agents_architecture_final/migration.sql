ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "job_title" TEXT,
  ADD COLUMN IF NOT EXISTS "department" TEXT,
  ADD COLUMN IF NOT EXISTS "phone" TEXT,
  ADD COLUMN IF NOT EXISTS "contract_start_at" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "contract_end_at" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS "tenant_integrations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "category" TEXT NOT NULL,
  "provider_code" TEXT NOT NULL,
  "encrypted_credentials" TEXT NOT NULL,
  "capabilities" JSONB,
  "status" TEXT NOT NULL DEFAULT 'CONFIGURED',
  "is_default" BOOLEAN NOT NULL DEFAULT false,
  "last_tested_at" TIMESTAMPTZ,
  "last_error" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tenant_integrations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "tenant_integrations_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "tenant_integrations_tenant_id_category_provider_code_key"
  ON "tenant_integrations"("tenant_id", "category", "provider_code");

CREATE INDEX IF NOT EXISTS "tenant_integrations_tenant_id_category_is_default_idx"
  ON "tenant_integrations"("tenant_id", "category", "is_default");

CREATE TABLE IF NOT EXISTS "agent_provider_preferences" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "agent_code" TEXT NOT NULL,
  "primary_provider_code" TEXT NOT NULL,
  "primary_model" TEXT NOT NULL,
  "fallback_provider_codes" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "agent_provider_preferences_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "agent_provider_preferences_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "agent_provider_preferences_tenant_id_agent_code_key"
  ON "agent_provider_preferences"("tenant_id", "agent_code");
