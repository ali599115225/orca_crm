-- Provider-neutral PaymentTransaction runtime closure.
-- Scope: payment_transactions only.

ALTER TABLE "payment_transactions"
  ADD COLUMN IF NOT EXISTS "plan_code" TEXT,
  ADD COLUMN IF NOT EXISTS "processed_at" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "expected_amount_minor" INTEGER,
  ADD COLUMN IF NOT EXISTS "expected_currency" TEXT,
  ADD COLUMN IF NOT EXISTS "last_error" TEXT;

ALTER TABLE "payment_transactions"
  ADD COLUMN IF NOT EXISTS "provider" TEXT,
  ADD COLUMN IF NOT EXISTS "provider_reference" TEXT;

UPDATE "payment_transactions"
SET "provider" = UPPER(COALESCE(NULLIF("provider", ''), 'MANUAL'))
WHERE "provider" IS NULL OR "provider" = '' OR "provider" <> UPPER("provider");

UPDATE "payment_transactions"
SET "expected_amount_minor" = COALESCE(ROUND("amount" * 100)::INTEGER, 0)
WHERE "expected_amount_minor" IS NULL;

UPDATE "payment_transactions"
SET "expected_currency" = UPPER(COALESCE(NULLIF("expected_currency", ''), NULLIF("currency", ''), 'SAR'))
WHERE "expected_currency" IS NULL OR "expected_currency" = '' OR "expected_currency" <> UPPER("expected_currency");

ALTER TABLE "payment_transactions"
  ALTER COLUMN "provider" SET DEFAULT 'MANUAL',
  ALTER COLUMN "provider" SET NOT NULL,
  ALTER COLUMN "expected_amount_minor" SET DEFAULT 0,
  ALTER COLUMN "expected_amount_minor" SET NOT NULL,
  ALTER COLUMN "expected_currency" SET DEFAULT 'SAR',
  ALTER COLUMN "expected_currency" SET NOT NULL,
  ALTER COLUMN "status" SET DEFAULT 'PENDING';

CREATE UNIQUE INDEX IF NOT EXISTS "payment_transaction_provider_reference_uq"
  ON "payment_transactions" ("provider", "provider_reference")
  WHERE "provider_reference" IS NOT NULL;
