-- Phase 02 full closure is additive. Existing Deal Passport rows and events are preserved.

ALTER TABLE "deal_passports"
  ADD COLUMN "last_event_id" UUID,
  ADD COLUMN "last_event_at" TIMESTAMPTZ,
  ADD COLUMN "opened_at" TIMESTAMPTZ,
  ADD COLUMN "closed_at" TIMESTAMPTZ;

UPDATE "deal_passports"
SET "opened_at" = COALESCE("created_at", CURRENT_TIMESTAMP)
WHERE "opened_at" IS NULL;

ALTER TABLE "deal_passports"
  ALTER COLUMN "opened_at" SET DEFAULT CURRENT_TIMESTAMP,
  ALTER COLUMN "opened_at" SET NOT NULL;

ALTER TABLE "deal_events"
  ADD COLUMN "event_version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "causation_id" UUID,
  ADD COLUMN "actor_type" TEXT NOT NULL DEFAULT 'USER',
  ADD COLUMN "before_state" JSONB,
  ADD COLUMN "after_state" JSONB,
  ADD COLUMN "occurred_at" TIMESTAMPTZ;

UPDATE "deal_events"
SET
  "correlation_id" = COALESCE(NULLIF(BTRIM("correlation_id"), ''), 'legacy:' || "id"::text),
  "actor_type" = CASE WHEN "actor_id" IS NULL THEN 'SYSTEM' ELSE 'USER' END,
  "occurred_at" = COALESCE("created_at", CURRENT_TIMESTAMP);

ALTER TABLE "deal_events"
  ALTER COLUMN "correlation_id" SET NOT NULL,
  ALTER COLUMN "occurred_at" SET DEFAULT CURRENT_TIMESTAMP,
  ALTER COLUMN "occurred_at" SET NOT NULL;

ALTER TABLE "deal_events"
  ADD CONSTRAINT "deal_events_correlation_id_not_blank_check"
    CHECK (BTRIM("correlation_id") <> ''),
  ADD CONSTRAINT "deal_events_actor_type_check"
    CHECK ("actor_type" IN ('USER', 'SYSTEM', 'PROVIDER', 'BACKFILL'));

ALTER TABLE "deal_events"
  ADD CONSTRAINT "deal_events_causation_id_fkey"
  FOREIGN KEY ("causation_id") REFERENCES "deal_events"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Make the existing Opportunity.leadId column an explicit Prisma/DB relation.
ALTER TABLE "opportunities"
  ADD CONSTRAINT "opportunities_lead_id_fkey"
  FOREIGN KEY ("lead_id") REFERENCES "leads"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Payment retries are tenant-scoped and must not create duplicate transactions.
UPDATE "payment_transactions"
SET "idempotency_key" = NULL
WHERE "idempotency_key" IS NOT NULL AND BTRIM("idempotency_key") = '';

DROP INDEX IF EXISTS "payment_transactions_idempotency_key_idx";
CREATE UNIQUE INDEX "payment_transactions_tenant_idempotency_uq"
  ON "payment_transactions"("tenant_id", "idempotency_key");

DROP INDEX IF EXISTS "deal_events_tenant_id_deal_id_idx";
DROP INDEX IF EXISTS "deal_events_tenant_id_event_type_idx";

CREATE INDEX "deal_events_tenant_id_deal_id_occurred_at_idx"
  ON "deal_events"("tenant_id", "deal_id", "occurred_at");
CREATE INDEX "deal_events_tenant_id_event_type_occurred_at_idx"
  ON "deal_events"("tenant_id", "event_type", "occurred_at");
CREATE INDEX "deal_events_correlation_id_idx"
  ON "deal_events"("correlation_id");
CREATE INDEX "deal_events_causation_id_idx"
  ON "deal_events"("causation_id");
