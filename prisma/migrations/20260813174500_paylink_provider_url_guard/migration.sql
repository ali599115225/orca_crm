-- Post-closure R1 security hardening.
-- Paylink connections are allowed only on Paylink's official sandbox/production origins.
-- Production inspection on 2026-08-13 found zero existing PAYLINK rows, so this
-- validated constraint requires no data repair or backfill.
ALTER TABLE "revenue_provider_connections"
ADD CONSTRAINT "revenue_provider_paylink_base_url_ck"
CHECK (
  UPPER("provider") <> 'PAYLINK'
  OR (
    "base_url" IS NOT NULL
    AND "base_url" ~ '^https://(restpilot|restapi)\.paylink\.sa/?$'
  )
);
