-- ORCA W1F — W1 schema metadata alignment.
-- Reconciles W1-only default expressions and FK names with the committed Prisma schema.
-- No legacy table, row data, backfill, destructive DROP, or production action is performed here.

-- Prisma @default(now()) is represented as CURRENT_TIMESTAMP in generated PostgreSQL DDL.
ALTER TABLE "contract_amendments"
  ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP,
  ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "contract_approvals"
  ALTER COLUMN "requested_at" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "contract_clause_definitions"
  ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP,
  ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "contract_drafts"
  ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP,
  ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "contract_snapshots"
  ALTER COLUMN "issued_at" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "contract_template_versions"
  ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "contract_templates"
  ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP,
  ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "finance_case_events"
  ALTER COLUMN "occurred_at" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "finance_cases"
  ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP,
  ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "finance_provider_offers"
  ALTER COLUMN "received_at" SET DEFAULT CURRENT_TIMESTAMP,
  ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP,
  ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;

-- Align W1 relation constraint names with Prisma's deterministic PostgreSQL names.
ALTER TABLE "contract_amendments"
  RENAME CONSTRAINT "fk_contract_amendments_resulting_snapshot"
  TO "contract_amendments_tenant_id_resulting_snapshot_id_fkey";
ALTER TABLE "contract_amendments"
  RENAME CONSTRAINT "fk_contract_amendments_source_snapshot"
  TO "contract_amendments_tenant_id_source_snapshot_id_fkey";

ALTER TABLE "contract_approvals"
  RENAME CONSTRAINT "fk_contract_approvals_draft"
  TO "contract_approvals_tenant_id_draft_id_fkey";

ALTER TABLE "contract_drafts"
  RENAME CONSTRAINT "fk_contract_drafts_finance_case"
  TO "contract_drafts_tenant_id_finance_case_id_fkey";
ALTER TABLE "contract_drafts"
  RENAME CONSTRAINT "fk_contract_drafts_template"
  TO "contract_drafts_tenant_id_template_id_fkey";
ALTER TABLE "contract_drafts"
  RENAME CONSTRAINT "fk_contract_drafts_template_version"
  TO "contract_drafts_tenant_id_template_version_id_fkey";

ALTER TABLE "contract_snapshots"
  RENAME CONSTRAINT "fk_contract_snapshots_draft"
  TO "contract_snapshots_tenant_id_draft_id_fkey";
ALTER TABLE "contract_snapshots"
  RENAME CONSTRAINT "fk_contract_snapshots_template_version"
  TO "contract_snapshots_tenant_id_template_version_id_fkey";

ALTER TABLE "contract_template_versions"
  RENAME CONSTRAINT "fk_contract_template_versions_template"
  TO "contract_template_versions_tenant_id_template_id_fkey";

ALTER TABLE "finance_case_events"
  RENAME CONSTRAINT "fk_finance_case_events_case"
  TO "finance_case_events_tenant_id_finance_case_id_fkey";

ALTER TABLE "finance_provider_offers"
  RENAME CONSTRAINT "fk_finance_provider_offers_case"
  TO "finance_provider_offers_tenant_id_finance_case_id_fkey";
