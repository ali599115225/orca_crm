-- Transaction Spine Migration
-- Rename RentalInvoice to Invoice, add FK relations, unify invoice model

-- 1. Create new enums
CREATE TYPE "InvoiceType" AS ENUM ('SALE', 'RENTAL');
CREATE TYPE "TourStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'FOLLOW_UP');

-- 2. Rename table: rental_invoices -> invoices
ALTER TABLE "rental_invoices" RENAME TO "invoices";

-- 3. Rename indexes on invoices
ALTER INDEX "idx_rental_invoices_lease_id" RENAME TO "idx_invoices_lease_id";
ALTER INDEX "idx_rental_invoices_tenant_id" RENAME TO "idx_invoices_tenant_id";

-- 4. Add type and contract_id to invoices
ALTER TABLE "invoices" ADD COLUMN "type" "InvoiceType" NOT NULL DEFAULT 'RENTAL';
ALTER TABLE "invoices" ADD COLUMN "contract_id" UUID;

-- 5. Make lease_id nullable on invoices (was NOT NULL before)
ALTER TABLE "invoices" ALTER COLUMN "lease_id" DROP NOT NULL;

-- 6. Add new columns to tours
ALTER TABLE "tours" ADD COLUMN "opportunity_id" UUID;
ALTER TABLE "tours" ADD COLUMN "unit_id" UUID;

-- 7. Convert tours.status from text to TourStatus enum
-- First, backfill any non-standard values to SCHEDULED
UPDATE "tours" SET "status" = 'SCHEDULED' WHERE "status" NOT IN ('SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'FOLLOW_UP');
-- Drop existing default before type change
ALTER TABLE "tours" ALTER COLUMN "status" DROP DEFAULT;
-- Change column type
ALTER TABLE "tours" ALTER COLUMN "status" TYPE "TourStatus" USING "status"::text::"TourStatus";
-- Set new default
ALTER TABLE "tours" ALTER COLUMN "status" SET DEFAULT 'SCHEDULED'::"TourStatus";

-- 8. Add new columns to contracts
ALTER TABLE "contracts" ADD COLUMN "lead_id" UUID;
ALTER TABLE "contracts" ADD COLUMN "offer_id" UUID;

-- 9. Add invoice_id to installments
ALTER TABLE "installments" ADD COLUMN "invoice_id" UUID;

-- Convert existing payment reference columns from TEXT to UUID.
ALTER TABLE "payment_transactions"
  ALTER COLUMN "invoice_id" TYPE UUID USING "invoice_id"::uuid,
  ALTER COLUMN "installment_id" TYPE UUID USING "installment_id"::uuid;

-- 10. Create FK constraints
-- Tours -> Lead
ALTER TABLE "tours" ADD CONSTRAINT "tours_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE RESTRICT;
-- Tours -> Opportunity
ALTER TABLE "tours" ADD CONSTRAINT "tours_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "opportunities"("id") ON DELETE SET NULL;
-- Tours -> Unit
ALTER TABLE "tours" ADD CONSTRAINT "tours_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE SET NULL;
-- Tours -> User (assigned_to)
ALTER TABLE "tours" ADD CONSTRAINT "tours_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE RESTRICT;

-- Contracts -> Lead
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL;
-- Contracts -> Offer (unique)
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offers"("id") ON DELETE SET NULL;

-- Invoices -> Contract
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE SET NULL;

-- Installments -> Invoice
ALTER TABLE "installments" ADD CONSTRAINT "installments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL;

-- PaymentTransaction -> Invoice
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL;
-- PaymentTransaction -> Installment
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_installment_id_fkey" FOREIGN KEY ("installment_id") REFERENCES "installments"("id") ON DELETE SET NULL;

-- 11. Create new indexes
CREATE INDEX "idx_invoices_contract_id" ON "invoices"("contract_id");
CREATE INDEX "idx_installments_invoice_id" ON "installments"("invoice_id");
CREATE INDEX "idx_tours_opportunity_id" ON "tours"("opportunity_id");
CREATE INDEX "idx_tours_unit_id" ON "tours"("unit_id");
CREATE INDEX "idx_contracts_lead_id" ON "contracts"("lead_id");
CREATE INDEX "idx_contracts_offer_id" ON "contracts"("offer_id");

-- 12. Add unique constraint on contracts.offer_id
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_offer_id_key" UNIQUE ("offer_id");
