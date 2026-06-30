-- AlterTable
ALTER TABLE "sentinel_task_orders" ADD COLUMN     "approval_expires_at" TIMESTAMPTZ,
ADD COLUMN     "approval_requested_at" TIMESTAMPTZ,
ADD COLUMN     "decided_at" TIMESTAMPTZ,
ADD COLUMN     "decided_by_id" UUID,
ADD COLUMN     "decision_reason" TEXT,
ADD COLUMN     "request_id" TEXT,
ADD COLUMN     "requested_by_id" UUID;

-- CreateIndex
CREATE INDEX "idx_sentinel_task_orders_expiry" ON "sentinel_task_orders"("status", "approval_expires_at");

-- CreateIndex
CREATE INDEX "idx_sentinel_task_orders_request" ON "sentinel_task_orders"("request_id");

-- CreateIndex
CREATE INDEX "idx_sentinel_task_orders_decided" ON "sentinel_task_orders"("decided_by_id", "decided_at");

-- AddForeignKey
ALTER TABLE "sentinel_task_orders" ADD CONSTRAINT "sentinel_task_orders_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sentinel_task_orders" ADD CONSTRAINT "sentinel_task_orders_decided_by_id_fkey" FOREIGN KEY ("decided_by_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
