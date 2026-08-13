-- Validate the already-enforced Paylink URL constraint with the lighter validation lock.
ALTER TABLE "revenue_provider_connections"
VALIDATE CONSTRAINT "revenue_provider_paylink_base_url_ck";
