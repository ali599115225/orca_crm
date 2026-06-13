-- ============================================================
-- SPRINT 3 – Accounting Core + Real Payments Migration
-- ORCA CRM – Double-Entry Accounting Engine
-- ============================================================

BEGIN;

-- 1. AccountType Enum
DO $$ BEGIN
  CREATE TYPE "AccountType" AS ENUM ('ASSET','LIABILITY','EQUITY','REVENUE','EXPENSE','CONTRA_ASSET','CONTRA_REVENUE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. JournalEntryStatus Enum
DO $$ BEGIN
  CREATE TYPE "JournalEntryStatus" AS ENUM ('DRAFT','POSTED','REVERSED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. Accounts (Chart of Accounts)
CREATE TABLE IF NOT EXISTS "accounts" (
  "id"          UUID        DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id"   UUID        NOT NULL,
  "code"        TEXT        NOT NULL,
  "name_ar"     TEXT        NOT NULL,
  "name_en"     TEXT,
  "type"        "AccountType" NOT NULL,
  "parent_id"   UUID,
  "is_active"   BOOLEAN     DEFAULT true NOT NULL,
  "created_at"  TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT "accounts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "accounts_tenant_id_code_key" UNIQUE ("tenant_id", "code"),
  CONSTRAINT "accounts_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "accounts"("id") ON DELETE SET NULL,
  CONSTRAINT "accounts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "idx_accounts_tenant_id" ON "accounts"("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_accounts_parent_id" ON "accounts"("parent_id");

-- 4. Account Balances
CREATE TABLE IF NOT EXISTS "account_balances" (
  "id"          UUID        DEFAULT gen_random_uuid() NOT NULL,
  "account_id"  UUID        NOT NULL,
  "tenant_id"   UUID        NOT NULL,
  "period"      TEXT        NOT NULL,
  "debit"       DECIMAL(15,2) DEFAULT 0 NOT NULL,
  "credit"      DECIMAL(15,2) DEFAULT 0 NOT NULL,
  "created_at"  TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT "account_balances_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "account_balances_account_id_period_tenant_id_key" UNIQUE ("account_id", "period", "tenant_id"),
  CONSTRAINT "account_balances_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE,
  CONSTRAINT "account_balances_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "idx_ab_tenant_period" ON "account_balances"("tenant_id", "period");
CREATE INDEX IF NOT EXISTS "idx_ab_account_id" ON "account_balances"("account_id");

-- 5. Journal Entries
CREATE TABLE IF NOT EXISTS "journal_entries" (
  "id"             UUID        DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id"      UUID        NOT NULL,
  "entry_number"   INTEGER     NOT NULL,
  "description"    TEXT        NOT NULL,
  "status"         "JournalEntryStatus" DEFAULT 'POSTED' NOT NULL,
  "source"         TEXT        NOT NULL,
  "source_id"      TEXT,
  "posted_at"      TIMESTAMPTZ DEFAULT now() NOT NULL,
  "created_at"     TIMESTAMPTZ DEFAULT now() NOT NULL,
  "reversed_by_id" UUID,
  CONSTRAINT "journal_entries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "journal_entries_tenant_id_entry_number_key" UNIQUE ("tenant_id", "entry_number"),
  CONSTRAINT "journal_entries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "journal_entries_reversed_by_id_fkey" FOREIGN KEY ("reversed_by_id") REFERENCES "journal_entries"("id") ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS "idx_je_tenant_status" ON "journal_entries"("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "idx_je_tenant_posted" ON "journal_entries"("tenant_id", "posted_at");
CREATE INDEX IF NOT EXISTS "idx_je_source_id" ON "journal_entries"("source_id");

-- 6. Journal Lines
CREATE TABLE IF NOT EXISTS "journal_lines" (
  "id"               UUID        DEFAULT gen_random_uuid() NOT NULL,
  "journal_entry_id" UUID        NOT NULL,
  "account_id"       UUID        NOT NULL,
  "debit"            DECIMAL(15,2) DEFAULT 0 NOT NULL,
  "credit"           DECIMAL(15,2) DEFAULT 0 NOT NULL,
  "description"      TEXT,
  CONSTRAINT "journal_lines_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "journal_lines_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entries"("id") ON DELETE CASCADE,
  CONSTRAINT "journal_lines_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS "idx_jl_entry_id" ON "journal_lines"("journal_entry_id");
CREATE INDEX IF NOT EXISTS "idx_jl_account_id" ON "journal_lines"("account_id");

-- 7. Payment Transactions (replaces mock payments)
CREATE TABLE IF NOT EXISTS "payment_transactions" (
  "id"               UUID        DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id"        UUID        NOT NULL,
  "invoice_id"       TEXT,
  "installment_id"   TEXT,
  "amount"           DECIMAL(12,2) NOT NULL,
  "fee"              DECIMAL(12,2) DEFAULT 0 NOT NULL,
  "net_amount"       DECIMAL(12,2) NOT NULL,
  "currency"         TEXT        DEFAULT 'SAR' NOT NULL,
  "method"           TEXT        NOT NULL,
  "status"           TEXT        DEFAULT 'COMPLETED' NOT NULL,
  "gateway_ref"      TEXT,
  "gateway_response" TEXT,
  "paid_at"          TIMESTAMPTZ DEFAULT now() NOT NULL,
  "created_at"       TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payment_transactions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "idx_pt_tenant" ON "payment_transactions"("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_pt_invoice" ON "payment_transactions"("invoice_id");
CREATE INDEX IF NOT EXISTS "idx_pt_status" ON "payment_transactions"("status");

-- 8. Commission Payments
CREATE TABLE IF NOT EXISTS "commission_payments" (
  "id"             UUID        DEFAULT gen_random_uuid() NOT NULL,
  "commission_id"  UUID        NOT NULL,
  "tenant_id"      UUID        NOT NULL,
  "paid_at"        TIMESTAMPTZ DEFAULT now() NOT NULL,
  "amount"         DECIMAL(12,2) NOT NULL,
  "method"         TEXT        DEFAULT 'BANK_TRANSFER' NOT NULL,
  "status"         TEXT        DEFAULT 'PAID' NOT NULL,
  CONSTRAINT "commission_payments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "commission_payments_commission_id_fkey" FOREIGN KEY ("commission_id") REFERENCES "payroll_commissions"("id") ON DELETE CASCADE,
  CONSTRAINT "commission_payments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "idx_cp_commission" ON "commission_payments"("commission_id");
CREATE INDEX IF NOT EXISTS "idx_cp_tenant" ON "commission_payments"("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_cp_status" ON "commission_payments"("status");

-- 9. Seed default chart of accounts is done via application code (seedChartOfAccounts)

COMMIT;
