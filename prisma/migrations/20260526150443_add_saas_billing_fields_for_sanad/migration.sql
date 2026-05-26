-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "billing_cycle" TEXT NOT NULL DEFAULT 'MONTHLY',
ADD COLUMN     "payment_status" TEXT NOT NULL DEFAULT 'UNPAID',
ADD COLUMN     "subscription_expires_at" TIMESTAMPTZ;
