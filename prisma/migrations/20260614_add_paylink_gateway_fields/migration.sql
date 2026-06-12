-- Add Paylink sandbox gateway fields to payment_transactions and rental_invoices

-- PaymentTransaction gateway tracking fields
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'manual';
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS provider_transaction_id TEXT;
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS provider_invoice_id TEXT;
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS provider_reference TEXT;
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS payment_url TEXT;
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS gateway_status TEXT;
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS raw_payload JSONB;
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS webhook_received_at TIMESTAMPTZ;
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS failure_reason TEXT;
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- RentalInvoice gateway tracking fields
ALTER TABLE rental_invoices ADD COLUMN IF NOT EXISTS gateway_provider TEXT;
ALTER TABLE rental_invoices ADD COLUMN IF NOT EXISTS gateway_status TEXT;
ALTER TABLE rental_invoices ADD COLUMN IF NOT EXISTS payment_url TEXT;
