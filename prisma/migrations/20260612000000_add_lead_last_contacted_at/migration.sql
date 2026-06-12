-- Add missing columns to leads table (schema drift fix)
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "last_contacted_at" TIMESTAMPTZ;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "priority" TEXT;
