BEGIN;

DO $$
BEGIN
  IF to_regclass('public.marketing_campaigns') IS NOT NULL
     OR to_regclass('public.marketing_campaign_channels') IS NOT NULL THEN
    RAISE EXCEPTION 'MARKETING_CAMPAIGN_TABLE_ALREADY_EXISTS';
  END IF;
END
$$;

CREATE TABLE "marketing_campaigns" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "created_by_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "objective" TEXT NOT NULL,
  "budget_kind" TEXT NOT NULL DEFAULT 'DAILY',
  "budget_amount" DECIMAL(14,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'SAR',
  "audience" JSONB NOT NULL,
  "creative" JSONB NOT NULL,
  "tracking" JSONB,
  "start_at" TIMESTAMPTZ,
  "end_at" TIMESTAMPTZ,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "marketing_campaigns_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "uq_marketing_campaign_tenant_id"
    UNIQUE ("tenant_id", "id"),
  CONSTRAINT "marketing_campaigns_tenant_id_fkey"
    FOREIGN KEY ("tenant_id")
    REFERENCES "tenants"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

CREATE INDEX "idx_marketing_campaigns_tenant_status"
  ON "marketing_campaigns"("tenant_id", "status");

CREATE INDEX "idx_marketing_campaigns_tenant_created"
  ON "marketing_campaigns"("tenant_id", "created_at" DESC);

CREATE TABLE "marketing_campaign_channels" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "campaign_id" UUID NOT NULL,
  "provider" TEXT NOT NULL,
  "connection_id" UUID,
  "provider_campaign_id" TEXT,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "remote_url" TEXT,
  "provider_options" JSONB,
  "last_error_code" TEXT,
  "last_synced_at" TIMESTAMPTZ,
  "published_at" TIMESTAMPTZ,
  "paused_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "marketing_campaign_channels_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "uq_marketing_campaign_channel_provider"
    UNIQUE ("tenant_id", "campaign_id", "provider"),
  CONSTRAINT "marketing_campaign_channels_tenant_id_fkey"
    FOREIGN KEY ("tenant_id")
    REFERENCES "tenants"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT "marketing_campaign_channels_campaign_fkey"
    FOREIGN KEY ("tenant_id", "campaign_id")
    REFERENCES "marketing_campaigns"("tenant_id", "id")
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

CREATE INDEX "idx_marketing_channels_tenant_provider_status"
  ON "marketing_campaign_channels"("tenant_id", "provider", "status");

CREATE INDEX "idx_marketing_channels_provider_campaign"
  ON "marketing_campaign_channels"("tenant_id", "provider_campaign_id");

COMMIT;
