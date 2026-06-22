CREATE TABLE "sync_events" (
  "id" TEXT NOT NULL,
  "cursor" BIGSERIAL NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "topic" TEXT NOT NULL,
  "event_type" TEXT NOT NULL,
  "aggregate_type" TEXT NOT NULL,
  "aggregate_id" TEXT NOT NULL,
  "aggregate_version" INTEGER,
  "source_event_id" TEXT,
  "idempotency_key" TEXT NOT NULL,
  "payload" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMPTZ NOT NULL,

  CONSTRAINT "sync_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "sync_events_cursor_key"
  ON "sync_events"("cursor");

CREATE UNIQUE INDEX "sync_events_tenant_id_idempotency_key_key"
  ON "sync_events"("tenant_id", "idempotency_key");

CREATE INDEX "sync_events_tenant_id_cursor_idx"
  ON "sync_events"("tenant_id", "cursor");

CREATE INDEX "sync_events_expires_at_idx"
  ON "sync_events"("expires_at");

ALTER TABLE "sync_events"
  ADD CONSTRAINT "sync_events_topic_nonempty"
  CHECK (length(btrim("topic")) > 0);

ALTER TABLE "sync_events"
  ADD CONSTRAINT "sync_events_event_type_nonempty"
  CHECK (length(btrim("event_type")) > 0);

ALTER TABLE "sync_events"
  ADD CONSTRAINT "sync_events_aggregate_identity_nonempty"
  CHECK (
    length(btrim("aggregate_type")) > 0
    AND length(btrim("aggregate_id")) > 0
  );

ALTER TABLE "sync_events"
  ADD CONSTRAINT "sync_events_idempotency_key_nonempty"
  CHECK (length(btrim("idempotency_key")) > 0);

ALTER TABLE "sync_events"
  ADD CONSTRAINT "sync_events_aggregate_version_valid"
  CHECK ("aggregate_version" IS NULL OR "aggregate_version" >= 0);
ALTER TABLE "sync_events"
  ADD CONSTRAINT "sync_events_expiry_valid"
  CHECK ("expires_at" > "created_at");
