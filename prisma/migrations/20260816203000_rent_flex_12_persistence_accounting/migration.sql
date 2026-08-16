-- ORCA RF12 — Rent Flex 12 persistence + direct-invoice identity.
-- Additive only. This artifact is for isolated migration readiness validation.
-- It does not alter legacy/W1 tables and is not applied to production by this package.

CREATE TABLE "rent_flex_unit_configs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "unit_id" UUID NOT NULL,
  "external_rnpl_enabled" BOOLEAN NOT NULL DEFAULT false,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "created_by" UUID NOT NULL,
  "updated_by" UUID NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "rent_flex_unit_configs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "uq_rent_flex_unit_configs_tenant_unit" ON "rent_flex_unit_configs"("tenant_id", "unit_id");
CREATE INDEX "idx_rent_flex_unit_configs_tenant_status" ON "rent_flex_unit_configs"("tenant_id", "status");

CREATE TABLE "rent_flex_selections" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "unit_id" UUID NOT NULL,
  "lead_id" UUID,
  "rental_lease_id" UUID,
  "finance_case_id" UUID,
  "selected_provider_offer_id" UUID,
  "mode" TEXT NOT NULL,
  "annual_rent_amount" NUMERIC(12,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'SAR',
  "first_due_date" DATE NOT NULL,
  "company_schedule_json" JSONB,
  "schedule_digest" VARCHAR(64),
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "created_by" UUID NOT NULL,
  "updated_by" UUID NOT NULL,
  "selected_at" TIMESTAMPTZ,
  "locked_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "rent_flex_selections_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "uq_rent_flex_selections_tenant_id" ON "rent_flex_selections"("tenant_id", "id");
CREATE UNIQUE INDEX "uq_rent_flex_selections_tenant_lease" ON "rent_flex_selections"("tenant_id", "rental_lease_id");
CREATE UNIQUE INDEX "uq_rent_flex_selections_tenant_finance_case" ON "rent_flex_selections"("tenant_id", "finance_case_id");
CREATE UNIQUE INDEX "uq_rent_flex_selections_tenant_selected_offer" ON "rent_flex_selections"("tenant_id", "selected_provider_offer_id");
CREATE INDEX "idx_rent_flex_selections_tenant_unit_status" ON "rent_flex_selections"("tenant_id", "unit_id", "status");
CREATE INDEX "idx_rent_flex_selections_tenant_lead" ON "rent_flex_selections"("tenant_id", "lead_id");

CREATE TABLE "rent_flex_offer_terms" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "finance_provider_offer_id" UUID NOT NULL,
  "owner_settlement_amount" NUMERIC(12,2) NOT NULL,
  "total_tenant_payable" NUMERIC(12,2) NOT NULL,
  "tenant_cost_delta" NUMERIC(12,2) NOT NULL,
  "first_due_date" DATE NOT NULL,
  "repayment_schedule_json" JSONB NOT NULL,
  "quote_digest" VARCHAR(64) NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "rent_flex_offer_terms_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "uq_rent_flex_offer_terms_tenant_id" ON "rent_flex_offer_terms"("tenant_id", "id");
CREATE UNIQUE INDEX "uq_rent_flex_offer_terms_tenant_offer" ON "rent_flex_offer_terms"("tenant_id", "finance_provider_offer_id");
CREATE INDEX "idx_rent_flex_offer_terms_tenant_digest" ON "rent_flex_offer_terms"("tenant_id", "quote_digest");

CREATE TABLE "rent_flex_settlements" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "rent_flex_selection_id" UUID NOT NULL,
  "finance_case_id" UUID,
  "finance_provider_offer_id" UUID,
  "rental_lease_id" UUID,
  "expected_amount" NUMERIC(12,2) NOT NULL,
  "received_amount" NUMERIC(12,2),
  "currency" TEXT NOT NULL DEFAULT 'SAR',
  "status" TEXT NOT NULL DEFAULT 'EXPECTED',
  "provider_reference" TEXT,
  "received_at" TIMESTAMPTZ,
  "evidence_json" JSONB,
  "created_by" UUID NOT NULL,
  "updated_by" UUID NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "rent_flex_settlements_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "uq_rent_flex_settlements_tenant_id" ON "rent_flex_settlements"("tenant_id", "id");
CREATE UNIQUE INDEX "uq_rent_flex_settlements_tenant_selection" ON "rent_flex_settlements"("tenant_id", "rent_flex_selection_id");
CREATE INDEX "idx_rent_flex_settlements_tenant_status" ON "rent_flex_settlements"("tenant_id", "status");
CREATE INDEX "idx_rent_flex_settlements_tenant_lease" ON "rent_flex_settlements"("tenant_id", "rental_lease_id");

CREATE TABLE "rent_flex_direct_invoice_links" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "rent_flex_selection_id" UUID NOT NULL,
  "rental_lease_id" UUID NOT NULL,
  "invoice_id" UUID NOT NULL,
  "installment_number" INTEGER NOT NULL,
  "due_date" DATE NOT NULL,
  "subtotal" NUMERIC(12,2) NOT NULL,
  "schedule_digest" VARCHAR(64) NOT NULL,
  "created_by" UUID NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "rent_flex_direct_invoice_links_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "uq_rf12_direct_invoice_link_selection_period" ON "rent_flex_direct_invoice_links"("tenant_id", "rent_flex_selection_id", "installment_number");
CREATE UNIQUE INDEX "uq_rf12_direct_invoice_link_invoice" ON "rent_flex_direct_invoice_links"("tenant_id", "invoice_id");
CREATE INDEX "idx_rf12_direct_invoice_link_lease" ON "rent_flex_direct_invoice_links"("tenant_id", "rental_lease_id");
CREATE INDEX "idx_rf12_direct_invoice_link_selection" ON "rent_flex_direct_invoice_links"("tenant_id", "rent_flex_selection_id");
