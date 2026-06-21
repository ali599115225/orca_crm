-- Offer Unit Integrity Migration
-- Add unitId FK to Opportunity and Offer, safe backfill from legacy data

-- 1. Add unit_id columns
ALTER TABLE "opportunities" ADD COLUMN "unit_id" UUID;
ALTER TABLE "offers" ADD COLUMN "unit_id" UUID;

-- 2. Backfill Opportunity.unit_id from linked_unit_ids
-- Only if linked_unit_ids contains a valid UUID that exists in units table
-- and belongs to the same tenant
UPDATE "opportunities" AS o
SET "unit_id" = src."unit_id"
FROM (
  SELECT
    opp."id" AS "opportunity_id",
    u."id" AS "unit_id"
  FROM "opportunities" AS opp
  JOIN "units" AS u
    ON u."tenant_id" = opp."tenant_id"
   AND u."id" = CASE
     WHEN split_part(btrim(opp."linked_unit_ids"), ',', 1)
       ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
     THEN split_part(btrim(opp."linked_unit_ids"), ',', 1)::uuid
     ELSE NULL
   END
  WHERE opp."linked_unit_ids" IS NOT NULL
) AS src
WHERE o."id" = src."opportunity_id"
  AND o."unit_id" IS NULL;

-- 3. Backfill Opportunity.unit_id from Lead.unitId where valid and same tenant
UPDATE "opportunities" o
SET "unit_id" = l."unit_id"
FROM "leads" l
WHERE l."id" = o."lead_id"
  AND l."unit_id" IS NOT NULL
  AND o."unit_id" IS NULL
  AND EXISTS (
    SELECT 1 FROM "units" u
    WHERE u."id" = l."unit_id"
      AND u."tenant_id" = o."tenant_id"
  );

-- 4. Backfill Offer.unit_id from Opportunity.unit_id
UPDATE "offers" off
SET "unit_id" = opp."unit_id"
FROM "opportunities" opp
WHERE opp."id" = off."linked_opportunity_id"
  AND opp."unit_id" IS NOT NULL
  AND off."unit_id" IS NULL;

-- 5. Create FK constraints
ALTER TABLE "opportunities"
  ADD CONSTRAINT "opportunities_unit_id_fkey"
  FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE SET NULL;

ALTER TABLE "offers"
  ADD CONSTRAINT "offers_unit_id_fkey"
  FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE SET NULL;

-- 6. Create indexes
CREATE INDEX "idx_opportunities_unit_id" ON "opportunities"("unit_id");
CREATE INDEX "idx_offers_unit_id" ON "offers"("unit_id");
