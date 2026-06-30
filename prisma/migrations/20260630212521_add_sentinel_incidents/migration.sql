-- CreateEnum
CREATE TYPE "SentinelIncidentSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "SentinelIncidentStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'FALSE_POSITIVE');

-- CreateEnum
CREATE TYPE "SentinelEscalationLevel" AS ENUM ('SENTINEL', 'ON_CALL_OPERATOR', 'PLATFORM_OWNER', 'MANUAL_INTERVENTION');

-- CreateTable
CREATE TABLE "sentinel_incidents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "severity" "SentinelIncidentSeverity" NOT NULL DEFAULT 'MEDIUM',
    "status" "SentinelIncidentStatus" NOT NULL DEFAULT 'OPEN',
    "escalation_level" "SentinelEscalationLevel" NOT NULL DEFAULT 'SENTINEL',
    "affected_service" TEXT,
    "diagnostic_metadata" JSONB,
    "fingerprint" TEXT,
    "correlation_id" TEXT,
    "request_id" TEXT,
    "detected_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledged_at" TIMESTAMPTZ,
    "resolved_at" TIMESTAMPTZ,
    "assigned_to_id" UUID,
    "related_task_order_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sentinel_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_sentinel_incidents_active" ON "sentinel_incidents"("status", "severity");

-- CreateIndex
CREATE INDEX "idx_sentinel_incidents_tenant_status" ON "sentinel_incidents"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "idx_sentinel_incidents_assignee_status" ON "sentinel_incidents"("assigned_to_id", "status");

-- CreateIndex
CREATE INDEX "idx_sentinel_incidents_correlation" ON "sentinel_incidents"("correlation_id");

-- CreateIndex
CREATE INDEX "idx_sentinel_incidents_request" ON "sentinel_incidents"("request_id");

-- CreateIndex
CREATE INDEX "idx_sentinel_incidents_task_order" ON "sentinel_incidents"("related_task_order_id");

-- CreateIndex
CREATE INDEX "idx_sentinel_incidents_detected" ON "sentinel_incidents"("detected_at" DESC);

-- CreateIndex
CREATE INDEX "idx_sentinel_incidents_fingerprint" ON "sentinel_incidents"("fingerprint", "status");

-- AddForeignKey
ALTER TABLE "sentinel_incidents" ADD CONSTRAINT "sentinel_incidents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sentinel_incidents" ADD CONSTRAINT "sentinel_incidents_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sentinel_incidents" ADD CONSTRAINT "sentinel_incidents_related_task_order_id_fkey" FOREIGN KEY ("related_task_order_id") REFERENCES "sentinel_task_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
