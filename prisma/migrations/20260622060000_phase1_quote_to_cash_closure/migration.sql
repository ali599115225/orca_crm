-- ORCA Phase 1 final closure: accepted offer -> draft contract -> payment plan
-- -> explicit signing -> SALE invoice/installments -> verified payment.

ALTER TABLE "contracts"
  ADD COLUMN IF NOT EXISTS "accepted_at" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "reservation_expires_at" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "cancelled_at" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "cancel_reason" TEXT,
  ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "contracts" ALTER COLUMN "signed_at" DROP DEFAULT;
ALTER TABLE "contracts" ALTER COLUMN "signed_at" DROP NOT NULL;
ALTER TABLE "contracts" ALTER COLUMN "status" SET DEFAULT 'PENDING_SIGNATURE';

UPDATE "contracts"
SET
  "accepted_at" = COALESCE("accepted_at", "created_at"),
  "status" = CASE
    WHEN "signed_at" IS NOT NULL OR UPPER(COALESCE("status", '')) IN ('ACTIVE', 'SIGNED', 'COMPLETED')
      THEN 'SIGNED'
    ELSE 'PENDING_SIGNATURE'
  END,
  "signed_at" = CASE
    WHEN "signed_at" IS NOT NULL OR UPPER(COALESCE("status", '')) IN ('ACTIVE', 'SIGNED', 'COMPLETED')
      THEN COALESCE("signed_at", "created_at")
    ELSE NULL
  END;

UPDATE "contracts"
SET "reservation_expires_at" = COALESCE("reservation_expires_at", "accepted_at" + INTERVAL '7 days')
WHERE "status" = 'PENDING_SIGNATURE';

UPDATE "contracts"
SET "reservation_expires_at" = NULL
WHERE "status" = 'SIGNED';

ALTER TABLE "contracts" ALTER COLUMN "accepted_at" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "contracts" ALTER COLUMN "accepted_at" SET NOT NULL;

CREATE TABLE IF NOT EXISTS "payment_plans" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "contract_id" UUID NOT NULL,
  "template" TEXT NOT NULL DEFAULT 'SINGLE_PAYMENT',
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "total_amount" DECIMAL(12,2) NOT NULL,
  "schedule_json" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "installment_count" INTEGER NOT NULL DEFAULT 1,
  "activated_at" TIMESTAMPTZ,
  "completed_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payment_plans_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payment_plans_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "payment_plans_contract_id_fkey"
    FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "payment_plans_contract_id_key"
  ON "payment_plans"("contract_id");
CREATE INDEX IF NOT EXISTS "idx_payment_plans_tenant_status"
  ON "payment_plans"("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "idx_contracts_tenant_status"
  ON "contracts"("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "idx_contracts_reservation_expiry"
  ON "contracts"("reservation_expires_at");

ALTER TABLE "installments" ADD COLUMN IF NOT EXISTS "payment_plan_id" UUID;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'installments_payment_plan_id_fkey'
  ) THEN
    ALTER TABLE "installments"
      ADD CONSTRAINT "installments_payment_plan_id_fkey"
      FOREIGN KEY ("payment_plan_id") REFERENCES "payment_plans"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS "idx_installments_payment_plan_id"
  ON "installments"("payment_plan_id");

ALTER TABLE "payment_transactions" ALTER COLUMN "paid_at" DROP DEFAULT;
ALTER TABLE "payment_transactions" ALTER COLUMN "paid_at" DROP NOT NULL;
UPDATE "payment_transactions"
SET "paid_at" = NULL
WHERE "status" <> 'COMPLETED';

ALTER TABLE "receipts" ADD COLUMN IF NOT EXISTS "payment_transaction_id" UUID;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'receipts_payment_transaction_id_fkey'
  ) THEN
    ALTER TABLE "receipts"
      ADD CONSTRAINT "receipts_payment_transaction_id_fkey"
      FOREIGN KEY ("payment_transaction_id") REFERENCES "payment_transactions"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS "receipts_payment_transaction_id_key"
  ON "receipts"("payment_transaction_id")
  WHERE "payment_transaction_id" IS NOT NULL;

-- Keep one deterministic idempotency key. Older duplicates are detached before uniqueness.
WITH ranked AS (
  SELECT "id", ROW_NUMBER() OVER (
    PARTITION BY "idempotency_key" ORDER BY "created_at" ASC, "id" ASC
  ) AS rn
  FROM "payment_transactions"
  WHERE "idempotency_key" IS NOT NULL
)
UPDATE "payment_transactions" p
SET "idempotency_key" = NULL
FROM ranked r
WHERE p."id" = r."id" AND r.rn > 1;

DROP INDEX IF EXISTS "payment_transactions_idempotency_key_idx";
CREATE UNIQUE INDEX IF NOT EXISTS "payment_transactions_idempotency_key_uq"
  ON "payment_transactions"("idempotency_key")
  WHERE "idempotency_key" IS NOT NULL;

-- At most one active provider checkout per installment/provider.
WITH ranked AS (
  SELECT "id", ROW_NUMBER() OVER (
    PARTITION BY "tenant_id", "installment_id", "provider"
    ORDER BY "created_at" DESC, "id" DESC
  ) AS rn
  FROM "payment_transactions"
  WHERE "installment_id" IS NOT NULL
    AND "status" IN ('PENDING', 'PROCESSING')
)
UPDATE "payment_transactions" p
SET
  "status" = 'FAILED',
  "failure_reason" = COALESCE("failure_reason", 'Superseded by Phase 1 active-checkout integrity migration'),
  "last_error" = COALESCE("last_error", 'Superseded duplicate active checkout'),
  "paid_at" = NULL
FROM ranked r
WHERE p."id" = r."id" AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS "payment_transactions_active_installment_provider_uq"
  ON "payment_transactions"("tenant_id", "installment_id", "provider")
  WHERE "installment_id" IS NOT NULL AND "status" IN ('PENDING', 'PROCESSING');

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "invoices"
    WHERE "type" = 'SALE' AND "contract_id" IS NOT NULL
    GROUP BY "contract_id"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Phase 1 closure blocked: duplicate SALE invoices exist for a contract';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "invoices_one_sale_per_contract_uq"
  ON "invoices"("contract_id")
  WHERE "type" = 'SALE' AND "contract_id" IS NOT NULL;

-- Enforce the Phase 1 accepted-offer invariants after legacy normalization.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'offers_accepted_requires_unit_ck'
  ) THEN
    ALTER TABLE "offers"
      ADD CONSTRAINT "offers_accepted_requires_unit_ck"
      CHECK ("status" <> 'ACCEPTED' OR "unit_id" IS NOT NULL);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "offers_one_accepted_per_unit_uq"
  ON "offers"("unit_id")
  WHERE "status" = 'ACCEPTED' AND "unit_id" IS NOT NULL;