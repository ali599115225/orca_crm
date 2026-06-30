-- CreateEnum
CREATE TYPE "SentinelHeartbeatStatus" AS ENUM ('HEALTHY', 'DEGRADED', 'DOWN');

-- CreateTable
CREATE TABLE "sentinel_heartbeats" (
    "service_id" VARCHAR(80) NOT NULL,
    "status" "SentinelHeartbeatStatus" NOT NULL DEFAULT 'HEALTHY',
    "last_seen_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" VARCHAR(64),
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sentinel_heartbeats_pkey" PRIMARY KEY ("service_id")
);

-- CreateIndex
CREATE INDEX "idx_sentinel_heartbeat_status_seen" ON "sentinel_heartbeats"("status", "last_seen_at");
