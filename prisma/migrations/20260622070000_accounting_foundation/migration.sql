-- ORCA accounting foundation required by Phase 1 quote-to-cash closure.
-- The Prisma accounting models existed without a historical migration creating
-- their physical PostgreSQL tables. This migration closes that schema drift.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AccountType') THEN
    CREATE TYPE "AccountType" AS ENUM (
      'ASSET',
      'LIABILITY',
      'EQUITY',
      'REVENUE',
      'EXPENSE',
      'CONTRA_ASSET',
      'CONTRA_REVENUE'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'JournalEntryStatus') THEN
    CREATE TYPE "JournalEntryStatus" AS ENUM (
      'DRAFT',
      'POSTED',
      'REVERSED'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "accounts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "name_ar" TEXT NOT NULL,
  "name_en" TEXT,
  "type" "AccountType" NOT NULL,
  "parent_id" UUID,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "account_balances" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "account_id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "period" TEXT NOT NULL,
  "debit" DECIMAL(15,2) NOT NULL DEFAULT 0,
  "credit" DECIMAL(15,2) NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "account_balances_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "account_balances_nonnegative_ck"
    CHECK ("debit" >= 0 AND "credit" >= 0)
);

CREATE TABLE IF NOT EXISTS "journal_entries" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "entry_number" INTEGER NOT NULL,
  "description" TEXT NOT NULL,
  "status" "JournalEntryStatus" NOT NULL DEFAULT 'POSTED',
  "source" TEXT NOT NULL,
  "source_id" TEXT,
  "posted_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reversed_by_id" UUID,
  CONSTRAINT "journal_entries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "journal_lines" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "journal_entry_id" UUID NOT NULL,
  "account_id" UUID NOT NULL,
  "debit" DECIMAL(15,2) NOT NULL DEFAULT 0,
  "credit" DECIMAL(15,2) NOT NULL DEFAULT 0,
  "description" TEXT,
  CONSTRAINT "journal_lines_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "journal_lines_nonnegative_ck"
    CHECK ("debit" >= 0 AND "credit" >= 0),
  CONSTRAINT "journal_lines_single_side_ck"
    CHECK (NOT ("debit" > 0 AND "credit" > 0)),
  CONSTRAINT "journal_lines_value_ck"
    CHECK ("debit" > 0 OR "credit" > 0)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'accounts_tenant_id_fkey'
  ) THEN
    ALTER TABLE "accounts"
      ADD CONSTRAINT "accounts_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'accounts_parent_id_fkey'
  ) THEN
    ALTER TABLE "accounts"
      ADD CONSTRAINT "accounts_parent_id_fkey"
      FOREIGN KEY ("parent_id") REFERENCES "accounts"("id")
      ON DELETE NO ACTION ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'account_balances_account_id_fkey'
  ) THEN
    ALTER TABLE "account_balances"
      ADD CONSTRAINT "account_balances_account_id_fkey"
      FOREIGN KEY ("account_id") REFERENCES "accounts"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'account_balances_tenant_id_fkey'
  ) THEN
    ALTER TABLE "account_balances"
      ADD CONSTRAINT "account_balances_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'journal_entries_tenant_id_fkey'
  ) THEN
    ALTER TABLE "journal_entries"
      ADD CONSTRAINT "journal_entries_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'journal_entries_reversed_by_id_fkey'
  ) THEN
    ALTER TABLE "journal_entries"
      ADD CONSTRAINT "journal_entries_reversed_by_id_fkey"
      FOREIGN KEY ("reversed_by_id") REFERENCES "journal_entries"("id")
      ON DELETE NO ACTION ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'journal_lines_journal_entry_id_fkey'
  ) THEN
    ALTER TABLE "journal_lines"
      ADD CONSTRAINT "journal_lines_journal_entry_id_fkey"
      FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entries"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'journal_lines_account_id_fkey'
  ) THEN
    ALTER TABLE "journal_lines"
      ADD CONSTRAINT "journal_lines_account_id_fkey"
      FOREIGN KEY ("account_id") REFERENCES "accounts"("id")
      ON DELETE NO ACTION ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "accounts_tenant_id_code_key"
  ON "accounts"("tenant_id", "code");
CREATE INDEX IF NOT EXISTS "accounts_tenant_id_idx"
  ON "accounts"("tenant_id");
CREATE INDEX IF NOT EXISTS "accounts_parent_id_idx"
  ON "accounts"("parent_id");

CREATE UNIQUE INDEX IF NOT EXISTS "account_balances_account_id_period_tenant_id_key"
  ON "account_balances"("account_id", "period", "tenant_id");
CREATE INDEX IF NOT EXISTS "account_balances_tenant_id_period_idx"
  ON "account_balances"("tenant_id", "period");
CREATE INDEX IF NOT EXISTS "account_balances_account_id_idx"
  ON "account_balances"("account_id");

CREATE UNIQUE INDEX IF NOT EXISTS "journal_entries_tenant_id_entry_number_key"
  ON "journal_entries"("tenant_id", "entry_number");
CREATE INDEX IF NOT EXISTS "journal_entries_tenant_id_status_idx"
  ON "journal_entries"("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "journal_entries_tenant_id_posted_at_idx"
  ON "journal_entries"("tenant_id", "posted_at");
CREATE INDEX IF NOT EXISTS "journal_entries_source_id_idx"
  ON "journal_entries"("source_id");

CREATE INDEX IF NOT EXISTS "journal_lines_journal_entry_id_idx"
  ON "journal_lines"("journal_entry_id");
CREATE INDEX IF NOT EXISTS "journal_lines_account_id_idx"
  ON "journal_lines"("account_id");
