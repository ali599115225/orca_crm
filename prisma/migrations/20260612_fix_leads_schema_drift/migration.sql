-- Fix schema drift: add missing columns to leads table
-- Columns missing from production: ai_summary
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "ai_summary" TEXT;
