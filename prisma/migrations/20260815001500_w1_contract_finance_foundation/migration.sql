-- ORCA W1A — Contract Studio + Finance Case persistence foundation.
-- Additive only. No production migration/backfill/provider action is performed here.
-- Legacy Contract / Lead / Unit references are scalar UUIDs in W1A; no existing
-- table, column, constraint, or row is altered by this migration.
-- Every W1A business table is database-bound to tenants with ON DELETE CASCADE.

CREATE TABLE "contract_templates" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "contract_type" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "description" TEXT,
  "created_by" UUID,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT transaction_timestamp(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT transaction_timestamp(),
  CONSTRAINT "contract_templates_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "uq_contract_templates_tenant_id" UNIQUE ("tenant_id", "id"),
  CONSTRAINT "uq_contract_templates_tenant_code" UNIQUE ("tenant_id", "code"),
  CONSTRAINT "fk_contract_templates_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "idx_contract_templates_tenant_status" ON "contract_templates" ("tenant_id", "status");
CREATE INDEX "idx_contract_templates_tenant_type" ON "contract_templates" ("tenant_id", "contract_type");

CREATE TABLE "contract_clause_definitions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "risk_tier" TEXT NOT NULL,
  "edit_mode" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_by" UUID,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT transaction_timestamp(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT transaction_timestamp(),
  CONSTRAINT "contract_clause_definitions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "uq_contract_clause_definitions_tenant_id" UNIQUE ("tenant_id", "id"),
  CONSTRAINT "uq_contract_clause_definitions_tenant_code_version" UNIQUE ("tenant_id", "code", "version"),
  CONSTRAINT "fk_contract_clause_definitions_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "idx_contract_clause_definitions_tenant_risk_active" ON "contract_clause_definitions" ("tenant_id", "risk_tier", "is_active");

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
  "requested_amount" NUMERIC(12,2),
  "property_value" NUMERIC(12,2),
  "down_payment" NUMERIC(12,2),
  "term_months" INTEGER,
  "annual_rate" NUMERIC(7,4),
  "monthly_income" NUMERIC(12,2),
  "monthly_commitments" NUMERIC(12,2),
  "advisory_dsr_limit" NUMERIC(5,2),
  "metadata" JSONB NOT NULL DEFAULT '{}'::JSONB,
  "created_by" UUID,
  "updated_by" UUID,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT transaction_timestamp(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT transaction_timestamp(),
  CONSTRAINT "finance_cases_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "uq_finance_cases_tenant_id" UNIQUE ("tenant_id", "id"),
  CONSTRAINT "uq_finance_cases_tenant_case_number" UNIQUE ("tenant_id", "case_number"),
  CONSTRAINT "fk_finance_cases_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "idx_finance_cases_tenant_internal_status" ON "finance_cases" ("tenant_id", "internal_status");
CREATE INDEX "idx_finance_cases_tenant_purpose" ON "finance_cases" ("tenant_id", "purpose");
CREATE INDEX "idx_finance_cases_tenant_lead" ON "finance_cases" ("tenant_id", "lead_id");
CREATE INDEX "idx_finance_cases_tenant_unit" ON "finance_cases" ("tenant_id", "unit_id");
CREATE INDEX "idx_finance_cases_tenant_contract" ON "finance_cases" ("tenant_id", "contract_id");

CREATE TABLE "contract_template_versions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "template_id" UUID NOT NULL,
  "version" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "structure_json" JSONB NOT NULL,
  "variable_schema_json" JSONB NOT NULL DEFAULT '{}'::JSONB,
  "notes" TEXT,
  "created_by" UUID,
  "published_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT transaction_timestamp(),
  CONSTRAINT "contract_template_versions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "uq_contract_template_versions_tenant_id" UNIQUE ("tenant_id", "id"),
  CONSTRAINT "uq_contract_template_versions_template_version" UNIQUE ("template_id", "version"),
  CONSTRAINT "fk_contract_template_versions_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "fk_contract_template_versions_template" FOREIGN KEY ("tenant_id", "template_id") REFERENCES "contract_templates"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "idx_contract_template_versions_tenant_template_status" ON "contract_template_versions" ("tenant_id", "template_id", "status");

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
  "clause_overrides_json" JSONB NOT NULL DEFAULT '[]'::JSONB,
  "created_by" UUID,
  "updated_by" UUID,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT transaction_timestamp(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT transaction_timestamp(),
  CONSTRAINT "contract_drafts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "uq_contract_drafts_tenant_id" UNIQUE ("tenant_id", "id"),
  CONSTRAINT "fk_contract_drafts_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "fk_contract_drafts_template" FOREIGN KEY ("tenant_id", "template_id") REFERENCES "contract_templates"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "fk_contract_drafts_template_version" FOREIGN KEY ("tenant_id", "template_version_id") REFERENCES "contract_template_versions"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "fk_contract_drafts_finance_case" FOREIGN KEY ("tenant_id", "finance_case_id") REFERENCES "finance_cases"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "idx_contract_drafts_tenant_status" ON "contract_drafts" ("tenant_id", "status");
CREATE INDEX "idx_contract_drafts_tenant_contract" ON "contract_drafts" ("tenant_id", "contract_id");
CREATE INDEX "idx_contract_drafts_tenant_finance_case" ON "contract_drafts" ("tenant_id", "finance_case_id");

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
  "issued_at" TIMESTAMPTZ NOT NULL DEFAULT transaction_timestamp(),
  "signed_at" TIMESTAMPTZ,
  CONSTRAINT "contract_snapshots_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "uq_contract_snapshots_tenant_id" UNIQUE ("tenant_id", "id"),
  CONSTRAINT "fk_contract_snapshots_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "fk_contract_snapshots_draft" FOREIGN KEY ("tenant_id", "draft_id") REFERENCES "contract_drafts"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "fk_contract_snapshots_template_version" FOREIGN KEY ("tenant_id", "template_version_id") REFERENCES "contract_template_versions"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "idx_contract_snapshots_tenant_contract_issued" ON "contract_snapshots" ("tenant_id", "contract_id", "issued_at");
CREATE INDEX "idx_contract_snapshots_tenant_digest" ON "contract_snapshots" ("tenant_id", "digest");
CREATE INDEX "idx_contract_snapshots_tenant_draft" ON "contract_snapshots" ("tenant_id", "draft_id");

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
  "requested_at" TIMESTAMPTZ NOT NULL DEFAULT transaction_timestamp(),
  "decided_at" TIMESTAMPTZ,
  CONSTRAINT "contract_approvals_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "uq_contract_approvals_tenant_id" UNIQUE ("tenant_id", "id"),
  CONSTRAINT "fk_contract_approvals_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "fk_contract_approvals_draft" FOREIGN KEY ("tenant_id", "draft_id") REFERENCES "contract_drafts"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "idx_contract_approvals_tenant_draft_status" ON "contract_approvals" ("tenant_id", "draft_id", "status");

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
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT transaction_timestamp(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT transaction_timestamp(),
  CONSTRAINT "contract_amendments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "uq_contract_amendments_tenant_id" UNIQUE ("tenant_id", "id"),
  CONSTRAINT "uq_contract_amendments_tenant_resulting_snapshot" UNIQUE ("tenant_id", "resulting_snapshot_id"),
  CONSTRAINT "fk_contract_amendments_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "fk_contract_amendments_source_snapshot" FOREIGN KEY ("tenant_id", "source_snapshot_id") REFERENCES "contract_snapshots"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "fk_contract_amendments_resulting_snapshot" FOREIGN KEY ("tenant_id", "resulting_snapshot_id") REFERENCES "contract_snapshots"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "idx_contract_amendments_tenant_contract_status" ON "contract_amendments" ("tenant_id", "contract_id", "status");
CREATE INDEX "idx_contract_amendments_tenant_source_snapshot" ON "contract_amendments" ("tenant_id", "source_snapshot_id");

CREATE TABLE "finance_provider_offers" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "finance_case_id" UUID NOT NULL,
  "provider" TEXT NOT NULL,
  "product_name" TEXT,
  "record_status" TEXT NOT NULL DEFAULT 'RECEIVED',
  "authority_status" TEXT,
  "provider_reference" TEXT,
  "amount" NUMERIC(12,2),
  "down_payment" NUMERIC(12,2),
  "monthly_payment" NUMERIC(12,2),
  "fees" NUMERIC(12,2),
  "term_months" INTEGER,
  "annual_rate" NUMERIC(7,4),
  "expires_at" TIMESTAMPTZ,
  "evidence_json" JSONB,
  "received_at" TIMESTAMPTZ NOT NULL DEFAULT transaction_timestamp(),
  "selected_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT transaction_timestamp(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT transaction_timestamp(),
  CONSTRAINT "finance_provider_offers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "uq_finance_provider_offers_tenant_id" UNIQUE ("tenant_id", "id"),
  CONSTRAINT "fk_finance_provider_offers_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "fk_finance_provider_offers_case" FOREIGN KEY ("tenant_id", "finance_case_id") REFERENCES "finance_cases"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "idx_finance_provider_offers_case_status" ON "finance_provider_offers" ("tenant_id", "finance_case_id", "record_status");
CREATE INDEX "idx_finance_provider_offers_provider_authority" ON "finance_provider_offers" ("tenant_id", "provider", "authority_status");

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
  "occurred_at" TIMESTAMPTZ NOT NULL DEFAULT transaction_timestamp(),
  CONSTRAINT "finance_case_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "uq_finance_case_events_tenant_id" UNIQUE ("tenant_id", "id"),
  CONSTRAINT "fk_finance_case_events_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "fk_finance_case_events_case" FOREIGN KEY ("tenant_id", "finance_case_id") REFERENCES "finance_cases"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "idx_finance_case_events_case_time" ON "finance_case_events" ("tenant_id", "finance_case_id", "occurred_at");
