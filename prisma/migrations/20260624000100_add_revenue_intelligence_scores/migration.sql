-- Migration: 20260624000100_add_revenue_intelligence_scores
-- Purpose: Add RevenueIntelligenceScore table for deterministic predictive intelligence engine
-- Production application: NOT applied. Local migration only.

-- 1. Create enum for intelligence categories
DO $$ BEGIN
  CREATE TYPE "RevenueIntelligenceCategory" AS ENUM (
    'REVENUE_LEAK',
    'COLLECTION_DELAY',
    'DEAL_FALL',
    'INTERVENTION_PRIORITY'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Create the revenue_intelligence_scores table
CREATE TABLE IF NOT EXISTS "revenue_intelligence_scores" (
  "id"                        UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"                 UUID NOT NULL,
  "entity_type"               VARCHAR(80) NOT NULL,
  "entity_id"                 VARCHAR(120) NOT NULL,
  "category"                  "RevenueIntelligenceCategory" NOT NULL,
  "score"                     INTEGER NOT NULL,
  "confidence"                INTEGER NOT NULL,
  "reasons"                   JSONB NOT NULL,
  "source_signals"            JSONB NOT NULL,
  "recommended_action"        VARCHAR(80),
  "recommended_action_payload" JSONB,
  "model_version"             VARCHAR(80) NOT NULL,
  "model_algorithm"           VARCHAR(80) NOT NULL,
  "window_key"                VARCHAR(160) NOT NULL,
  "generated_at"              TIMESTAMPTZ(6) NOT NULL,
  "created_at"                TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at"                TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

  CONSTRAINT "revenue_intelligence_scores_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "revenue_intelligence_scores_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
);

-- 3. Unique constraint: one record per entity+category+window per tenant
ALTER TABLE "revenue_intelligence_scores"
  DROP CONSTRAINT IF EXISTS "revenue_intelligence_entity_category_window_uq";

ALTER TABLE "revenue_intelligence_scores"
  ADD CONSTRAINT "revenue_intelligence_entity_category_window_uq"
  UNIQUE ("tenant_id", "entity_type", "entity_id", "category", "window_key");

-- 4. Indexes as specified
CREATE INDEX IF NOT EXISTS "revenue_intelligence_tenant_generated_idx"
  ON "revenue_intelligence_scores" ("tenant_id", "generated_at");

CREATE INDEX IF NOT EXISTS "revenue_intelligence_tenant_category_generated_idx"
  ON "revenue_intelligence_scores" ("tenant_id", "category", "generated_at");

CREATE INDEX IF NOT EXISTS "revenue_intelligence_entity_idx"
  ON "revenue_intelligence_scores" ("tenant_id", "entity_type", "entity_id");

-- 5. Score and confidence check constraints (0-100 integers)
ALTER TABLE "revenue_intelligence_scores"
  DROP CONSTRAINT IF EXISTS "revenue_intelligence_score_range";

ALTER TABLE "revenue_intelligence_scores"
  ADD CONSTRAINT "revenue_intelligence_score_range"
  CHECK ("score" >= 0 AND "score" <= 100);

ALTER TABLE "revenue_intelligence_scores"
  DROP CONSTRAINT IF EXISTS "revenue_intelligence_confidence_range";

ALTER TABLE "revenue_intelligence_scores"
  ADD CONSTRAINT "revenue_intelligence_confidence_range"
  CHECK ("confidence" >= 0 AND "confidence" <= 100);
