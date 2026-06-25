-- Create enums
DO $$ BEGIN
    CREATE TYPE "RevenueIntelligenceStatus" AS ENUM ('READY', 'INSUFFICIENT_DATA');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "RevenueRiskBand" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add columns to revenue_intelligence_scores
ALTER TABLE "revenue_intelligence_scores"
    ADD COLUMN IF NOT EXISTS "status" "RevenueIntelligenceStatus" NOT NULL DEFAULT 'READY',
    ADD COLUMN IF NOT EXISTS "risk_band" "RevenueRiskBand",
    ADD COLUMN IF NOT EXISTS "horizon_days" INTEGER,
    ADD COLUMN IF NOT EXISTS "feature_hash" VARCHAR(64),
    ADD COLUMN IF NOT EXISTS "expires_at" TIMESTAMPTZ(6);

-- Make score and confidence nullable
ALTER TABLE "revenue_intelligence_scores"
    ALTER COLUMN "score" DROP NOT NULL,
    ALTER COLUMN "confidence" DROP NOT NULL;

-- Backfill risk_band for existing READY rows
UPDATE "revenue_intelligence_scores"
SET "risk_band" = CASE
    WHEN "score" >= 85 THEN 'CRITICAL'::"RevenueRiskBand"
    WHEN "score" >= 70 THEN 'HIGH'::"RevenueRiskBand"
    WHEN "score" >= 40 THEN 'MEDIUM'::"RevenueRiskBand"
    ELSE 'LOW'::"RevenueRiskBand"
END
WHERE "risk_band" IS NULL AND "score" IS NOT NULL;

-- Add index for expires_at
CREATE INDEX IF NOT EXISTS "revenue_intelligence_expires_idx"
    ON "revenue_intelligence_scores" ("tenant_id", "expires_at");

-- Create revenue_predictive_runs table
CREATE TABLE IF NOT EXISTS "revenue_predictive_runs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "idempotency_key" VARCHAR(160) NOT NULL,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),
    "scored_count" INTEGER NOT NULL DEFAULT 0,
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "failed_entities" JSONB NOT NULL DEFAULT '[]',
    "result" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revenue_predictive_runs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "revenue_predictive_run_tenant_key_uq"
    ON "revenue_predictive_runs" ("tenant_id", "idempotency_key");

CREATE INDEX IF NOT EXISTS "revenue_predictive_run_tenant_started_idx"
    ON "revenue_predictive_runs" ("tenant_id", "started_at");
