CREATE TABLE "deal_passports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "opportunity_id" UUID,
    "contract_id" UUID,
    "current_offer_id" UUID,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "version" INTEGER NOT NULL DEFAULT 0,
    "last_sequence" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deal_passports_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "deal_passports_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "deal_passports_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "opportunities"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "deal_passports_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "deal_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "deal_id" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "event_type" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "correlation_id" TEXT,
    "actor_id" UUID,
    "entity_type" TEXT,
    "entity_id" UUID,
    "payload" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deal_events_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "deal_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "deal_events_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "deal_passports"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "deal_passports_tenant_id_opportunity_id_key" ON "deal_passports"("tenant_id", "opportunity_id");
CREATE UNIQUE INDEX "deal_passports_tenant_id_contract_id_key" ON "deal_passports"("tenant_id", "contract_id");
CREATE UNIQUE INDEX "deal_passports_opportunity_id_key" ON "deal_passports"("opportunity_id");
CREATE UNIQUE INDEX "deal_passports_contract_id_key" ON "deal_passports"("contract_id");
CREATE INDEX "deal_passports_tenant_id_status_idx" ON "deal_passports"("tenant_id", "status");

CREATE UNIQUE INDEX "deal_events_deal_id_sequence_key" ON "deal_events"("deal_id", "sequence");
CREATE UNIQUE INDEX "deal_events_tenant_id_idempotency_key_key" ON "deal_events"("tenant_id", "idempotency_key");
CREATE INDEX "deal_events_tenant_id_deal_id_idx" ON "deal_events"("tenant_id", "deal_id");
CREATE INDEX "deal_events_tenant_id_event_type_idx" ON "deal_events"("tenant_id", "event_type");
