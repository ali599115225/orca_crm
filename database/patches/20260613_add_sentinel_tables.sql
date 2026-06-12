-- Sentinel Command Layer — tables
CREATE TABLE IF NOT EXISTS "sentinel_config" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "operating_mode" TEXT NOT NULL DEFAULT 'NORMAL_MODE',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sentinel_config_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "sentinel_task_orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "created_by" TEXT NOT NULL DEFAULT 'platform_sentinel',
    "assigned_to_type" TEXT NOT NULL,
    "assigned_to_name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "risk_level" TEXT NOT NULL DEFAULT 'LOW',
    "approval_required" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "source" TEXT NOT NULL DEFAULT 'SYSTEM',
    "correlation_id" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ,
    CONSTRAINT "sentinel_task_orders_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_sentinel_task_orders_status" ON "sentinel_task_orders"("status");
CREATE INDEX IF NOT EXISTS "idx_sentinel_task_orders_assigned" ON "sentinel_task_orders"("assigned_to_type", "status");
CREATE INDEX IF NOT EXISTS "idx_sentinel_task_orders_correlation" ON "sentinel_task_orders"("correlation_id");
CREATE INDEX IF NOT EXISTS "idx_sentinel_task_orders_created" ON "sentinel_task_orders"("created_at" DESC);

INSERT INTO "sentinel_config" ("id", "operating_mode") 
VALUES (gen_random_uuid(), 'NORMAL_MODE')
ON CONFLICT DO NOTHING;
