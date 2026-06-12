-- Add missing last_contacted_at column to leads table
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "last_contacted_at" TIMESTAMPTZ;
