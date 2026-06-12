-- Phase 07-A.1: Add delegation controls + chat table
ALTER TABLE "sentinel_config" ADD COLUMN IF NOT EXISTS "delegation_level" TEXT NOT NULL DEFAULT 'MONITORING_ONLY';
ALTER TABLE "sentinel_config" ADD COLUMN IF NOT EXISTS "fallback_plan_active" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "sentinel_config" ADD COLUMN IF NOT EXISTS "deep_repair_wait_minutes" INTEGER NOT NULL DEFAULT 15;

CREATE TABLE IF NOT EXISTS "sentinel_chat_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sender" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sentinel_chat_messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_sentinel_chat_created" ON "sentinel_chat_messages"("created_at" DESC);
