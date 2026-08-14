-- W1A — Contract Studio + Finance Case persistence foundation.
-- Additive only: creates ten new tenant-isolated tables, their indexes and
-- foreign keys. Does not ALTER, UPDATE, DELETE, INSERT, DROP, or otherwise
-- mutate any existing table, column, constraint or data (including
-- contracts, payment_plans, installments, or provider tables).
-- No production migration is applied by this package.

-- 1. contract_templates
CREATE TABLE "contract_templates" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "contract_type" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "description" TEXT,
  "created_by" UUID,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "contract_templates_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "contract_templates_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "uq_contract_templates_tenant_code"
  ON "contract_templates"("tenant_id", "code");

CREATE INDEX "idx_contract_templates_tenant_status"
  ON "contract_templates"("tenant_id", "status");

CREATE INDEX "idx_contract_templates_tenant_type"
  ON "contract_templates"("tenant_id", "contract_type");

-- 2. contract_template_versions
CREATE TABLE "contract_template_versions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "template_id" UUID NOT NULL,
  "version" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "structure_json" JSONB NOT NULL,
  "variable_schema_json" JSONB NOT NULL DEFAULT '{}',
  "notes" TEXT,
  "created_by" UUID,
  "published_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "contract_template_versions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "contract_template_versions_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "contract_template_versions_template_id_fkey"
    FOREIGN KEY ("template_id") REFERENCES "contract_templates"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "uq_contract_template_versions_template_version"
  ON "contract_template_versions"("template_id", "version");

CREATE INDEX "idx_contract_template_versions_tenant_template_status"
  ON "contract_template_versions"("tenant_id", "template_id", "status");

-- 3. contract_clause_definitions
CREATE TABLE "contract_clause_definitions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "risk_tier" TEXT NOT NULL,
  "edit_mode" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_by" UUID,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "contract_clause_definitions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "contract_clause_definitions_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "uq_contract_clause_definitions_tenant_code_version"
  ON "contract_clause_definitions"("tenant_id", "code", "version");

CREATE INDEX "idx_contract_clause_definitions_tenant_risk_active"
  ON "contract_clause_definitions"("tenant_id", "risk_tier", "is_active");

-- 4. finance_cases
CREATE TABLE "finance_cases" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "case_number" TEXT NOT NULL,
  "lead_id" UUID,
  "unit_id" UUID,
  "contract_id" UUID,
  "purpose" TEXT NOT NULL,
  "property_source" TEXT NOT NULL,
  "internal_status" TEXT NOT NULL DEFAULT 'DRAFT',
  "authority_status" TEXT,
  "authority_provider" TEXT,
  "authority_reference" TEXT,
  "requested_amount" DECIMAL(12,2),
  "property_value" DECIMAL(12,2),
  "down_payment" DECIMAL(12,2),
  "term_months" INTEGER,
  "annual_rate" DECIMAL(7,4),
  "monthly_income" DECIMAL(12,2),
  "monthly_commitments" DECIMAL(12,2),
  "advisory_dsr_limit" DECIMAL(5,2),
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_by" UUID,
  "updated_by" UUID,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "finance_cases_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "finance_cases_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "finance_cases_lead_id_fkey"
    FOREIGN KEY ("lead_id") REFERENCES "leads"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "finance_cases_unit_id_fkey"
    FOREIGN KEY ("unit_id") REFERENCES "units"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "finance_cases_contract_id_fkey"
    FOREIGN KEY ("contract_id") REFERENCES "contracts"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "uq_finance_cases_tenant_case_number"
  ON "finance_cases"("tenant_id", "case_number");

CREATE INDEX "idx_finance_cases_tenant_internal_status"
  ON "finance_cases"("tenant_id", "internal_status");

CREATE INDEX "idx_finance_cases_tenant_purpose"
  ON "finance_cases"("tenant_id", "purpose");

CREATE INDEX "idx_finance_cases_lead_id"
  ON "finance_cases"("lead_id");

CREATE INDEX "idx_finance_cases_unit_id"
  ON "finance_cases"("unit_id");

CREATE INDEX "idx_finance_cases_contract_id"
  ON "finance_cases"("contract_id");

-- 5. contract_drafts
CREATE TABLE "contract_drafts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "template_id" UUID NOT NULL,
  "template_version_id" UUID NOT NULL,
  "contract_id" UUID,
  "finance_case_id" UUID,
  "title" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "content_json" JSONB NOT NULL,
  "data_bindings_json" JSONB NOT NULL,
  "clause_overrides_json" JSONB NOT NULL DEFAULT '[]',
  "created_by" UUID,
  "updated_by" UUID,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "contract_drafts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "contract_drafts_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "contract_drafts_template_id_fkey"
    FOREIGN KEY ("template_id") REFERENCES "contract_templates"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "contract_drafts_template_version_id_fkey"
    FOREIGN KEY ("template_version_id") REFERENCES "contract_template_versions"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "contract_drafts_contract_id_fkey"
    FOREIGN KEY ("contract_id") REFERENCES "contracts"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "contract_drafts_finance_case_id_fkey"
    FOREIGN KEY ("finance_case_id") REFERENCES "finance_cases"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "idx_contract_drafts_tenant_status"
  ON "contract_drafts"("tenant_id", "status");

CREATE INDEX "idx_contract_drafts_contract_id"
  ON "contract_drafts"("contract_id");

CREATE INDEX "idx_contract_drafts_finance_case_id"
  ON "contract_drafts"("finance_case_id");

-- 6. contract_snapshots
CREATE TABLE "contract_snapshots" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "draft_id" UUID NOT NULL,
  "contract_id" UUID,
  "template_version_id" UUID NOT NULL,
  "snapshot_type" TEXT NOT NULL DEFAULT 'ISSUED',
  "rendered_content" TEXT NOT NULL,
  "structured_facts" JSONB NOT NULL,
  "clause_snapshot" JSONB NOT NULL,
  "payment_plan_snapshot" JSONB,
  "approval_snapshot" JSONB NOT NULL,
  "digest" VARCHAR(64) NOT NULL,
  "created_by" UUID,
  "issued_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "signed_at" TIMESTAMPTZ,

  CONSTRAINT "contract_snapshots_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "contract_snapshots_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "contract_snapshots_draft_id_fkey"
    FOREIGN KEY ("draft_id") REFERENCES "contract_drafts"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "contract_snapshots_contract_id_fkey"
    FOREIGN KEY ("contract_id") REFERENCES "contracts"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "contract_snapshots_template_version_id_fkey"
    FOREIGN KEY ("template_version_id") REFERENCES "contract_template_versions"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "idx_contract_snapshots_tenant_contract_issued"
  ON "contract_snapshots"("tenant_id", "contract_id", "issued_at");

CREATE INDEX "idx_contract_snapshots_tenant_digest"
  ON "contract_snapshots"("tenant_id", "digest");

CREATE INDEX "idx_contract_snapshots_draft_id"
  ON "contract_snapshots"("draft_id");

-- 7. contract_approvals
CREATE TABLE "contract_approvals" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "draft_id" UUID NOT NULL,
  "risk_tier" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "requested_by" UUID,
  "decided_by" UUID,
  "reason" TEXT,
  "evidence_json" JSONB,
  "requested_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "decided_at" TIMESTAMPTZ,

  CONSTRAINT "contract_approvals_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "contract_approvals_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "contract_approvals_draft_id_fkey"
    FOREIGN KEY ("draft_id") REFERENCES "contract_drafts"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "idx_contract_approvals_tenant_draft_status"
  ON "contract_approvals"("tenant_id", "draft_id", "status");

-- 8. contract_amendments
CREATE TABLE "contract_amendments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "contract_id" UUID NOT NULL,
  "source_snapshot_id" UUID NOT NULL,
  "resulting_snapshot_id" UUID,
  "title" TEXT NOT NULL,
  "reason" TEXT,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "changes_json" JSONB NOT NULL,
  "created_by" UUID,
  "approved_by" UUID,
  "approved_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "contract_amendments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "contract_amendments_resulting_snapshot_id_key" UNIQUE ("resulting_snapshot_id"),
  CONSTRAINT "contract_amendments_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "contract_amendments_contract_id_fkey"
    FOREIGN KEY ("contract_id") REFERENCES "contracts"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "contract_amendments_source_snapshot_id_fkey"
    FOREIGN KEY ("source_snapshot_id") REFERENCES "contract_snapshots"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "contract_amendments_resulting_snapshot_id_fkey"
    FOREIGN KEY ("resulting_snapshot_id") REFERENCES "contract_snapshots"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "idx_contract_amendments_tenant_contract_status"
  ON "contract_amendments"("tenant_id", "contract_id", "status");

CREATE INDEX "idx_contract_amendments_source_snapshot_id"
  ON "contract_amendments"("source_snapshot_id");

-- 9. finance_provider_offers
CREATE TABLE "finance_provider_offers" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "finance_case_id" UUID NOT NULL,
  "provider" TEXT NOT NULL,
  "product_name" TEXT,
  "record_status" TEXT NOT NULL DEFAULT 'RECEIVED',
  "authority_status" TEXT,
  "provider_reference" TEXT,
  "amount" DECIMAL(12,2),
  "down_payment" DECIMAL(12,2),
  "monthly_payment" DECIMAL(12,2),
  "fees" DECIMAL(12,2),
  "term_months" INTEGER,
  "annual_rate" DECIMAL(7,4),
  "expires_at" TIMESTAMPTZ,
  "evidence_json" JSONB,
  "received_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "selected_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "finance_provider_offers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "finance_provider_offers_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "finance_provider_offers_finance_case_id_fkey"
    FOREIGN KEY ("finance_case_id") REFERENCES "finance_cases"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "idx_finance_provider_offers_tenant_case_status"
  ON "finance_provider_offers"("tenant_id", "finance_case_id", "record_status");

CREATE INDEX "idx_finance_provider_offers_tenant_provider_authority"
  ON "finance_provider_offers"("tenant_id", "provider", "authority_status");

-- 10. finance_case_events
CREATE TABLE "finance_case_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "finance_case_id" UUID NOT NULL,
  "event_type" TEXT NOT NULL,
  "internal_status" TEXT,
  "authority_status" TEXT,
  "provider" TEXT,
  "actor_id" UUID,
  "evidence_json" JSONB,
  "occurred_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "finance_case_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "finance_case_events_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "finance_case_events_finance_case_id_fkey"
    FOREIGN KEY ("finance_case_id") REFERENCES "finance_cases"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "idx_finance_case_events_tenant_case_occurred"
  ON "finance_case_events"("tenant_id", "finance_case_id", "occurred_at");