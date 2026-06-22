ALTER TABLE "payment_plans"
  ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "last_amended_at" TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS "idx_payment_plans_last_amended_at"
  ON "payment_plans"("last_amended_at");
