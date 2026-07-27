-- EXEC-007: immutable offer versions, pricing, approval and conditional acceptance.
-- Additive only. No backfill. No production/customer-data action is performed here.
-- Physical FK targets are the canonical EXEC-005/006 tables on the frozen base:
-- customer_parties, customer_accounts_v2, customer_opportunities_v2 and unit_commitments.

CREATE TYPE "Exec007OfferKind" AS ENUM ('SALE', 'LEASE');
CREATE TYPE "Exec007RecordOrigin" AS ENUM ('EXEC007');
CREATE TYPE "Exec007OfferState" AS ENUM ('DRAFT', 'OPEN', 'PREPARATION_REQUESTED', 'CLOSED', 'ARCHIVED');
CREATE TYPE "Exec007OfferVersionState" AS ENUM ('DRAFT', 'DISCARDED', 'PENDING_APPROVAL', 'APPROVED', 'APPROVAL_REJECTED', 'ISSUED', 'SUPERSEDED', 'WITHDRAWN', 'EXPIRED', 'DECLINED', 'CONDITIONALLY_ACCEPTED');
CREATE TYPE "Exec007ApprovalType" AS ENUM ('STANDARD', 'EXCEPTION', 'FINANCIAL_REVIEW');
CREATE TYPE "Exec007ApprovalDecisionState" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'REVOKED', 'STALE');
CREATE TYPE "Exec007CustomerPrincipalStatus" AS ENUM ('ACTIVE', 'LOCKED', 'REVOKED');
CREATE TYPE "Exec007CustomerIdentityType" AS ENUM ('VERIFIED_PHONE', 'VERIFIED_EMAIL', 'EXTERNAL_SUBJECT');
CREATE TYPE "Exec007CustomerIdentityStatus" AS ENUM ('ACTIVE', 'REVOKED');
CREATE TYPE "Exec007SubjectGrantStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');
CREATE TYPE "Exec007CustomerSessionStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');
CREATE TYPE "Exec007AuthChallengeType" AS ENUM ('OTP', 'MAGIC_LINK');
CREATE TYPE "Exec007AuthChallengeStatus" AS ENUM ('PENDING', 'CONSUMED', 'EXPIRED', 'REVOKED');
CREATE TYPE "Exec007AssuranceLevel" AS ENUM ('CUSTOMER_VIEW_VERIFIED', 'CUSTOMER_DECISION_STEP_UP');
CREATE TYPE "Exec007DecisionAction" AS ENUM ('ACCEPT', 'DECLINE');
CREATE TYPE "Exec007DecisionIntentState" AS ENUM ('PENDING', 'CONFIRMED', 'EXPIRED', 'REVOKED');
CREATE TYPE "Exec007AcceptanceCompletionState" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');
CREATE TYPE "Exec007PreparationRequestType" AS ENUM ('SALE_CONTRACT_PREPARATION_REQUEST', 'LEASE_PREPARATION_REQUEST');
CREATE TYPE "Exec007PreparationRequestState" AS ENUM ('REQUESTED');
CREATE TYPE "Exec007CutoverMode" AS ENUM ('LEGACY_ONLY', 'EXEC007_READY', 'EXEC007_ACTIVE', 'RECOVERY_STOP');
CREATE TYPE "Exec007LegalHoldStatus" AS ENUM ('ACTIVE', 'RELEASED');
CREATE TYPE "Exec007RetentionDispositionStatus" AS ENUM ('SCHEDULED', 'BLOCKED', 'DISPOSED');
CREATE TYPE "Exec007SecurityPurposeCode" AS ENUM ('AUTH_ABUSE_INVESTIGATION', 'ACCEPTANCE_REPLAY_INVESTIGATION', 'SUSPECTED_ACCOUNT_TAKEOVER', 'SECURITY_INCIDENT_RESPONSE');
CREATE TYPE "Exec007TaxBasis" AS ENUM ('INCLUSIVE', 'EXCLUSIVE');
CREATE TYPE "Exec007PayerType" AS ENUM ('CUSTOMER', 'OWNER', 'BROKER', 'OTHER_NON_CUSTOMER');
CREATE TYPE "Exec007PricingSourceType" AS ENUM ('SALE_PROJECT_PRICE_BOOK', 'SALE_UNIT_PRICE_BOOK', 'LEASE_RENT_SCHEDULE');
CREATE TYPE "Exec007ServiceLine" AS ENUM ('SALES', 'LEASING');

CREATE TABLE "exec007_customer_principals" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "status" "Exec007CustomerPrincipalStatus" NOT NULL DEFAULT 'ACTIVE',
  "auth_version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT transaction_timestamp(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT transaction_timestamp(),
  CONSTRAINT "pk_exec007_customer_principals" PRIMARY KEY ("id"),
  CONSTRAINT "uq_exec007_customer_principals_tenant_id" UNIQUE ("tenant_id", "id"),
  CONSTRAINT "fk_exec007_customer_principals_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ck_exec007_customer_principals_auth_version" CHECK ("auth_version" > 0)
);

CREATE TABLE "exec007_customer_principal_identities" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "principal_id" UUID NOT NULL,
  "identity_type" "Exec007CustomerIdentityType" NOT NULL,
  "status" "Exec007CustomerIdentityStatus" NOT NULL DEFAULT 'ACTIVE',
  "normalized_identifier_hash" TEXT NOT NULL,
  "verified_at" TIMESTAMPTZ NOT NULL,
  "revoked_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT transaction_timestamp(),
  CONSTRAINT "pk_exec007_customer_principal_identities" PRIMARY KEY ("id"),
  CONSTRAINT "uq_exec007_customer_principal_identities_tenant_id" UNIQUE ("tenant_id", "id"),
  CONSTRAINT "uq_exec007_customer_principal_identities_identifier" UNIQUE ("tenant_id", "identity_type", "normalized_identifier_hash"),
  CONSTRAINT "fk_exec007_customer_identities_tenant_principal" FOREIGN KEY ("tenant_id", "principal_id") REFERENCES "exec007_customer_principals"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ck_exec007_customer_identity_hash" CHECK ("normalized_identifier_hash" ~ '^[0-9a-f]{64}$')
);

CREATE TABLE "exec007_customer_principal_subject_grants" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "principal_id" UUID NOT NULL,
  "actor_party_id" UUID NOT NULL,
  "subject_party_id" UUID NOT NULL,
  "customer_account_id" UUID,
  "status" "Exec007SubjectGrantStatus" NOT NULL DEFAULT 'ACTIVE',
  "grant_version" INTEGER NOT NULL DEFAULT 1,
  "branch_id" UUID NOT NULL,
  "service_line" "Exec007ServiceLine" NOT NULL,
  "resource_scope" JSONB NOT NULL DEFAULT '{}'::JSONB,
  "effective_at" TIMESTAMPTZ NOT NULL DEFAULT transaction_timestamp(),
  "expires_at" TIMESTAMPTZ,
  "revoked_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT transaction_timestamp(),
  CONSTRAINT "pk_exec007_customer_subject_grants" PRIMARY KEY ("id"),
  CONSTRAINT "uq_exec007_subject_grants_tenant_id" UNIQUE ("tenant_id", "id"),
  CONSTRAINT "fk_exec007_subject_grants_tenant_principal" FOREIGN KEY ("tenant_id", "principal_id") REFERENCES "exec007_customer_principals"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "fk_exec007_subject_grants_tenant_actor_party" FOREIGN KEY ("tenant_id", "actor_party_id") REFERENCES "customer_parties"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "fk_exec007_subject_grants_tenant_subject_party" FOREIGN KEY ("tenant_id", "subject_party_id") REFERENCES "customer_parties"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "fk_exec007_subject_grants_tenant_customer_account" FOREIGN KEY ("tenant_id", "customer_account_id") REFERENCES "customer_accounts_v2"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "fk_exec007_subject_grants_tenant_branch" FOREIGN KEY ("tenant_id", "branch_id") REFERENCES "organization_branches"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ck_exec007_subject_grants_version" CHECK ("grant_version" > 0),
  CONSTRAINT "ck_exec007_subject_grants_expiry" CHECK ("expires_at" IS NULL OR "expires_at" > "effective_at")
);

CREATE TABLE "exec007_customer_sessions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "principal_id" UUID NOT NULL,
  "subject_grant_id" UUID NOT NULL,
  "status" "Exec007CustomerSessionStatus" NOT NULL DEFAULT 'ACTIVE',
  "assurance_level" "Exec007AssuranceLevel" NOT NULL,
  "session_token_hash" TEXT NOT NULL,
  "auth_version" INTEGER NOT NULL,
  "grant_version" INTEGER NOT NULL,
  "last_seen_at" TIMESTAMPTZ NOT NULL,
  "decision_step_up_at" TIMESTAMPTZ,
  "idle_expires_at" TIMESTAMPTZ NOT NULL,
  "absolute_expires_at" TIMESTAMPTZ NOT NULL,
  "revoked_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT transaction_timestamp(),
  CONSTRAINT "pk_exec007_customer_sessions" PRIMARY KEY ("id"),
  CONSTRAINT "uq_exec007_sessions_tenant_id" UNIQUE ("tenant_id", "id"),
  CONSTRAINT "uq_exec007_sessions_token_hash" UNIQUE ("tenant_id", "session_token_hash"),
  CONSTRAINT "fk_exec007_sessions_tenant_principal" FOREIGN KEY ("tenant_id", "principal_id") REFERENCES "exec007_customer_principals"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "fk_exec007_sessions_tenant_grant" FOREIGN KEY ("tenant_id", "subject_grant_id") REFERENCES "exec007_customer_principal_subject_grants"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ck_exec007_sessions_hash_format" CHECK ("session_token_hash" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "ck_exec007_sessions_expiry" CHECK ("idle_expires_at" <= "absolute_expires_at")
);
CREATE INDEX "idx_exec007_customer_sessions_expiry" ON "exec007_customer_sessions" ("tenant_id", "status", "idle_expires_at", "absolute_expires_at");

CREATE TABLE "exec007_customer_auth_challenges" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "principal_id" UUID,
  "identity_type" "Exec007CustomerIdentityType" NOT NULL,
  "challenge_type" "Exec007AuthChallengeType" NOT NULL,
  "status" "Exec007AuthChallengeStatus" NOT NULL DEFAULT 'PENDING',
  "action" "Exec007DecisionAction",
  "token_hash" TEXT NOT NULL,
  "attempt_count" INTEGER NOT NULL DEFAULT 0,
  "expires_at" TIMESTAMPTZ NOT NULL,
  "consumed_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT transaction_timestamp(),
  CONSTRAINT "pk_exec007_customer_auth_challenges" PRIMARY KEY ("id"),
  CONSTRAINT "uq_exec007_challenges_tenant_id" UNIQUE ("tenant_id", "id"),
  CONSTRAINT "uq_exec007_challenges_token_hash" UNIQUE ("tenant_id", "token_hash"),
  CONSTRAINT "fk_exec007_challenges_tenant_principal" FOREIGN KEY ("tenant_id", "principal_id") REFERENCES "exec007_customer_principals"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ck_exec007_challenges_hash_format" CHECK ("token_hash" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "ck_exec007_challenges_attempts" CHECK ("attempt_count" BETWEEN 0 AND 10)
);
CREATE INDEX "idx_exec007_auth_challenges_expiry" ON "exec007_customer_auth_challenges" ("tenant_id", "status", "expires_at");

CREATE TABLE "exec007_commercial_offers" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "opportunity_id" UUID NOT NULL,
  "unit_id" UUID NOT NULL,
  "branch_id" UUID NOT NULL,
  "subject_party_id" UUID NOT NULL,
  "customer_account_id" UUID,
  "offer_kind" "Exec007OfferKind" NOT NULL,
  "service_line" "Exec007ServiceLine" NOT NULL,
  "record_origin" "Exec007RecordOrigin" NOT NULL DEFAULT 'EXEC007',
  "state" "Exec007OfferState" NOT NULL DEFAULT 'DRAFT',
  "current_issued_version_id" UUID,
  "legacy_offer_id" UUID,
  "created_by_user_id" UUID NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "close_reason" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT transaction_timestamp(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT transaction_timestamp(),
  CONSTRAINT "pk_exec007_commercial_offers" PRIMARY KEY ("id"),
  CONSTRAINT "uq_exec007_offers_tenant_id" UNIQUE ("tenant_id", "id"),
  CONSTRAINT "fk_exec007_offers_tenant_opportunity" FOREIGN KEY ("tenant_id", "opportunity_id") REFERENCES "customer_opportunities_v2"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "fk_exec007_offers_tenant_unit" FOREIGN KEY ("tenant_id", "unit_id") REFERENCES "units"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "fk_exec007_offers_tenant_branch" FOREIGN KEY ("tenant_id", "branch_id") REFERENCES "organization_branches"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "fk_exec007_offers_subject_party" FOREIGN KEY ("tenant_id", "subject_party_id") REFERENCES "customer_parties"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "fk_exec007_offers_customer_account" FOREIGN KEY ("tenant_id", "customer_account_id") REFERENCES "customer_accounts_v2"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "fk_exec007_offers_creator" FOREIGN KEY ("tenant_id", "created_by_user_id") REFERENCES "users"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "fk_exec007_offers_legacy" FOREIGN KEY ("legacy_offer_id") REFERENCES "offers"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ck_exec007_offers_exact_identity" CHECK ("opportunity_id" IS NOT NULL AND "unit_id" IS NOT NULL AND "offer_kind" IN ('SALE','LEASE')),
  CONSTRAINT "ck_exec007_offers_version" CHECK ("version" > 0)
);

CREATE TABLE "exec007_offer_versions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "offer_id" UUID NOT NULL,
  "version_number" INTEGER NOT NULL,
  "state" "Exec007OfferVersionState" NOT NULL DEFAULT 'DRAFT',
  "is_current" BOOLEAN NOT NULL DEFAULT FALSE,
  "offer_kind" "Exec007OfferKind" NOT NULL,
  "subject_party_id" UUID NOT NULL,
  "customer_account_id" UUID,
  "branch_id" UUID NOT NULL,
  "unit_id" UUID NOT NULL,
  "opportunity_id" UUID NOT NULL,
  "content_payload" JSONB NOT NULL DEFAULT '{}'::JSONB,
  "scope_snapshot" JSONB NOT NULL DEFAULT '{}'::JSONB,
  "subject_snapshot" JSONB NOT NULL DEFAULT '{}'::JSONB,
  "confirmation_text_version" TEXT NOT NULL,
  "canonicalization_version" TEXT NOT NULL DEFAULT 'EXEC007-CANON-1',
  "content_hash" TEXT NOT NULL,
  "pricing_hash" TEXT NOT NULL,
  "terms_hash" TEXT NOT NULL,
  "validity_policy_version" TEXT NOT NULL,
  "valid_until_local_date" DATE,
  "validity_time_zone" TEXT NOT NULL DEFAULT 'Asia/Riyadh',
  "valid_until_utc" TIMESTAMPTZ,
  "issued_at_utc" TIMESTAMPTZ,
  "withdrawal_reason" TEXT,
  "created_by_user_id" UUID NOT NULL,
  "last_commercial_editor_id" UUID NOT NULL,
  "row_version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT transaction_timestamp(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT transaction_timestamp(),
  CONSTRAINT "pk_exec007_offer_versions" PRIMARY KEY ("id"),
  CONSTRAINT "uq_exec007_offer_versions_tenant_id" UNIQUE ("tenant_id", "id"),
  CONSTRAINT "uq_exec007_offer_versions_offer_number" UNIQUE ("tenant_id", "offer_id", "version_number"),
  CONSTRAINT "fk_exec007_offer_versions_tenant_offer" FOREIGN KEY ("tenant_id", "offer_id") REFERENCES "exec007_commercial_offers"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "fk_exec007_offer_versions_subject_party" FOREIGN KEY ("tenant_id", "subject_party_id") REFERENCES "customer_parties"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "fk_exec007_offer_versions_customer_account" FOREIGN KEY ("tenant_id", "customer_account_id") REFERENCES "customer_accounts_v2"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "fk_exec007_offer_versions_unit" FOREIGN KEY ("tenant_id", "unit_id") REFERENCES "units"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "fk_exec007_offer_versions_opportunity" FOREIGN KEY ("tenant_id", "opportunity_id") REFERENCES "customer_opportunities_v2"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ck_exec007_offer_versions_hash_format" CHECK ("content_hash" ~ '^[0-9a-f]{64}$' AND "pricing_hash" ~ '^[0-9a-f]{64}$' AND "terms_hash" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "ck_exec007_offer_versions_validity_order" CHECK (("state" NOT IN ('ISSUED','SUPERSEDED','WITHDRAWN','EXPIRED','DECLINED','CONDITIONALLY_ACCEPTED')) OR ("issued_at_utc" IS NOT NULL AND "valid_until_utc" IS NOT NULL AND "valid_until_utc" > "issued_at_utc")),
  CONSTRAINT "ck_exec007_offer_versions_row_version" CHECK ("row_version" > 0)
);
ALTER TABLE "exec007_commercial_offers" ADD CONSTRAINT "fk_exec007_offers_current_version" FOREIGN KEY ("tenant_id", "current_issued_version_id") REFERENCES "exec007_offer_versions"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE DEFERRABLE INITIALLY DEFERRED;
CREATE UNIQUE INDEX "uq_exec007_offer_versions_one_current_issued" ON "exec007_offer_versions" ("tenant_id", "offer_id") WHERE "state"='ISSUED' AND "is_current"=TRUE;
CREATE INDEX "idx_exec007_offer_versions_current_lookup" ON "exec007_offer_versions" ("tenant_id", "offer_id", "state", "is_current");

CREATE TABLE "exec007_pricing_policy_versions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "source_type" "Exec007PricingSourceType" NOT NULL,
  "scope_type" TEXT NOT NULL,
  "scope_id" UUID NOT NULL,
  "version_number" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'SAR',
  "floor_amount" NUMERIC(18,2),
  "ceiling_amount" NUMERIC(18,2),
  "max_discount_rate" NUMERIC(18,6),
  "standard_validity_days" INTEGER NOT NULL,
  "normal_max_validity_days" INTEGER NOT NULL DEFAULT 30,
  "effective_from" TIMESTAMPTZ NOT NULL,
  "effective_to" TIMESTAMPTZ,
  "policy_payload" JSONB NOT NULL DEFAULT '{}'::JSONB,
  "created_by_user_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT transaction_timestamp(),
  CONSTRAINT "pk_exec007_pricing_policy_versions" PRIMARY KEY ("id"),
  CONSTRAINT "uq_exec007_pricing_policy_tenant_id" UNIQUE ("tenant_id", "id"),
  CONSTRAINT "uq_exec007_pricing_policy_scope_version" UNIQUE ("tenant_id", "source_type", "scope_type", "scope_id", "version_number"),
  CONSTRAINT "fk_exec007_pricing_policy_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "fk_exec007_pricing_policy_creator" FOREIGN KEY ("tenant_id", "created_by_user_id") REFERENCES "users"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ck_exec007_pricing_policy_currency" CHECK ("currency"='SAR'),
  CONSTRAINT "ck_exec007_pricing_policy_effective" CHECK ("effective_to" IS NULL OR "effective_to" > "effective_from"),
  CONSTRAINT "ck_exec007_pricing_policy_validity" CHECK ("standard_validity_days" > 0 AND "normal_max_validity_days" = 30)
);
CREATE INDEX "idx_exec007_pricing_policy_effective_scope" ON "exec007_pricing_policy_versions" ("tenant_id", "source_type", "scope_type", "scope_id", "effective_from", "effective_to");

CREATE TABLE "exec007_offer_pricing_snapshots" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "offer_version_id" UUID NOT NULL,
  "offer_kind" "Exec007OfferKind" NOT NULL,
  "policy_version_id" UUID NOT NULL,
  "source_type" "Exec007PricingSourceType" NOT NULL,
  "source_record_id" UUID NOT NULL,
  "source_version" TEXT NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'SAR',
  "tax_basis" "Exec007TaxBasis" NOT NULL,
  "base_amount" NUMERIC(18,2) NOT NULL,
  "discount_amount" NUMERIC(18,2) NOT NULL DEFAULT 0,
  "tax_amount" NUMERIC(18,2) NOT NULL DEFAULT 0,
  "fee_amount" NUMERIC(18,2) NOT NULL DEFAULT 0,
  "commission_amount" NUMERIC(18,2) NOT NULL DEFAULT 0,
  "customer_total" NUMERIC(18,2) NOT NULL,
  "periodic_rent" NUMERIC(18,2),
  "deposit_amount" NUMERIC(18,2),
  "escalation_rate" NUMERIC(18,6),
  "manual_adjustment_amount" NUMERIC(18,2),
  "manual_adjustment_rate" NUMERIC(18,6),
  "manual_adjustment_reason" TEXT,
  "adjustment_initiator_id" UUID,
  "exception_approval_decision_id" UUID,
  "resolution_trace" JSONB NOT NULL DEFAULT '{}'::JSONB,
  "pricing_hash" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT transaction_timestamp(),
  CONSTRAINT "pk_exec007_pricing_snapshots" PRIMARY KEY ("id"),
  CONSTRAINT "uq_exec007_pricing_snapshots_tenant_id" UNIQUE ("tenant_id", "id"),
  CONSTRAINT "uq_exec007_pricing_snapshot_version" UNIQUE ("tenant_id", "offer_version_id"),
  CONSTRAINT "fk_exec007_pricing_snapshot_tenant_version" FOREIGN KEY ("tenant_id", "offer_version_id") REFERENCES "exec007_offer_versions"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "fk_exec007_pricing_snapshot_policy" FOREIGN KEY ("tenant_id", "policy_version_id") REFERENCES "exec007_pricing_policy_versions"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "fk_exec007_pricing_snapshot_adjustment_actor" FOREIGN KEY ("tenant_id", "adjustment_initiator_id") REFERENCES "users"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ck_exec007_money_precision" CHECK ("base_amount"::NUMERIC(18,2) = "base_amount" AND "customer_total"::NUMERIC(18,2) = "customer_total"),
  CONSTRAINT "ck_exec007_rate_precision" CHECK (("escalation_rate" IS NULL OR "escalation_rate"::NUMERIC(18,6) = "escalation_rate") AND ("manual_adjustment_rate" IS NULL OR "manual_adjustment_rate"::NUMERIC(18,6) = "manual_adjustment_rate")),
  CONSTRAINT "ck_exec007_pricing_snapshot_hash" CHECK ("pricing_hash" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "ck_exec007_pricing_snapshot_currency" CHECK ("currency"='SAR'),
  CONSTRAINT "ck_exec007_pricing_kind_components" CHECK (("offer_kind"='SALE' AND "periodic_rent" IS NULL AND "deposit_amount" IS NULL AND "escalation_rate" IS NULL) OR ("offer_kind"='LEASE' AND "periodic_rent" IS NOT NULL AND "deposit_amount" IS NOT NULL))
);

CREATE TABLE "exec007_offer_pricing_components" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "pricing_snapshot_id" UUID NOT NULL,
  "component_code" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "amount" NUMERIC(18,2) NOT NULL,
  "rate" NUMERIC(18,6),
  "payer_type" "Exec007PayerType" NOT NULL,
  "tax_basis" "Exec007TaxBasis",
  "is_customer_obligation" BOOLEAN NOT NULL,
  "ordinal" INTEGER NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT transaction_timestamp(),
  CONSTRAINT "pk_exec007_pricing_components" PRIMARY KEY ("id"),
  CONSTRAINT "uq_exec007_pricing_components_tenant_id" UNIQUE ("tenant_id", "id"),
  CONSTRAINT "uq_exec007_pricing_component_code" UNIQUE ("tenant_id", "pricing_snapshot_id", "component_code"),
  CONSTRAINT "fk_exec007_pricing_components_snapshot" FOREIGN KEY ("tenant_id", "pricing_snapshot_id") REFERENCES "exec007_offer_pricing_snapshots"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ck_exec007_pricing_component_amount" CHECK ("amount" >= 0 AND "ordinal" >= 0)
);

CREATE TABLE "exec007_offer_approval_requirements" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "offer_version_id" UUID NOT NULL,
  "approval_type" "Exec007ApprovalType" NOT NULL,
  "requirement_key" TEXT NOT NULL,
  "policy_version_id" UUID,
  "required_permission" TEXT NOT NULL,
  "branch_id" UUID NOT NULL,
  "service_line" "Exec007ServiceLine" NOT NULL,
  "resource_scope" JSONB NOT NULL,
  "content_hash" TEXT NOT NULL,
  "pricing_hash" TEXT NOT NULL,
  "terms_hash" TEXT NOT NULL,
  "initiator_user_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT transaction_timestamp(),
  CONSTRAINT "pk_exec007_approval_requirements" PRIMARY KEY ("id"),
  CONSTRAINT "uq_exec007_approval_requirements_tenant_id" UNIQUE ("tenant_id", "id"),
  CONSTRAINT "uq_exec007_approval_requirement_type" UNIQUE ("tenant_id", "offer_version_id", "approval_type", "requirement_key"),
  CONSTRAINT "fk_exec007_approval_requirement_version" FOREIGN KEY ("tenant_id", "offer_version_id") REFERENCES "exec007_offer_versions"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "fk_exec007_approval_requirement_policy" FOREIGN KEY ("tenant_id", "policy_version_id") REFERENCES "exec007_pricing_policy_versions"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "fk_exec007_approval_requirement_initiator" FOREIGN KEY ("tenant_id", "initiator_user_id") REFERENCES "users"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "exec007_offer_approval_decisions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "requirement_id" UUID NOT NULL,
  "offer_version_id" UUID NOT NULL,
  "state" "Exec007ApprovalDecisionState" NOT NULL DEFAULT 'PENDING',
  "actor_user_id" UUID NOT NULL,
  "assignment_id" UUID NOT NULL,
  "reason" TEXT NOT NULL,
  "evidence_hash" TEXT NOT NULL,
  "decided_at" TIMESTAMPTZ NOT NULL DEFAULT transaction_timestamp(),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT transaction_timestamp(),
  CONSTRAINT "pk_exec007_approval_decisions" PRIMARY KEY ("id"),
  CONSTRAINT "uq_exec007_approval_decisions_tenant_id" UNIQUE ("tenant_id", "id"),
  CONSTRAINT "fk_exec007_approval_decision_requirement" FOREIGN KEY ("tenant_id", "requirement_id") REFERENCES "exec007_offer_approval_requirements"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "fk_exec007_approval_decision_version" FOREIGN KEY ("tenant_id", "offer_version_id") REFERENCES "exec007_offer_versions"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "fk_exec007_approval_decision_actor" FOREIGN KEY ("tenant_id", "actor_user_id") REFERENCES "users"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "fk_exec007_approval_decision_assignment" FOREIGN KEY ("tenant_id", "assignment_id") REFERENCES "user_scope_assignments"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ck_exec007_approval_decision_hash" CHECK ("evidence_hash" ~ '^[0-9a-f]{64}$')
);
CREATE INDEX "idx_exec007_approvals_effective_version" ON "exec007_offer_approval_decisions" ("tenant_id", "offer_version_id", "state");

CREATE TABLE "exec007_acceptance_intents" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "offer_version_id" UUID NOT NULL,
  "customer_session_id" UUID NOT NULL,
  "principal_id" UUID NOT NULL,
  "subject_party_id" UUID NOT NULL,
  "customer_account_id" UUID,
  "action" "Exec007DecisionAction" NOT NULL DEFAULT 'ACCEPT',
  "state" "Exec007DecisionIntentState" NOT NULL DEFAULT 'PENDING',
  "nonce_hash" TEXT NOT NULL,
  "content_hash" TEXT NOT NULL,
  "pricing_hash" TEXT NOT NULL,
  "terms_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMPTZ NOT NULL,
  "confirmed_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT transaction_timestamp(),
  CONSTRAINT "pk_exec007_acceptance_intents" PRIMARY KEY ("id"),
  CONSTRAINT "uq_exec007_acceptance_intents_tenant_id" UNIQUE ("tenant_id", "id"),
  CONSTRAINT "uq_exec007_acceptance_intent_nonce" UNIQUE ("tenant_id", "nonce_hash"),
  CONSTRAINT "fk_exec007_acceptance_intent_version" FOREIGN KEY ("tenant_id", "offer_version_id") REFERENCES "exec007_offer_versions"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "fk_exec007_acceptance_intent_session" FOREIGN KEY ("tenant_id", "customer_session_id") REFERENCES "exec007_customer_sessions"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "fk_exec007_acceptance_intent_principal" FOREIGN KEY ("tenant_id", "principal_id") REFERENCES "exec007_customer_principals"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ck_exec007_acceptance_intent_nonce" CHECK ("nonce_hash" ~ '^[0-9a-f]{64}$')
);
CREATE INDEX "idx_exec007_acceptance_intents_expiry" ON "exec007_acceptance_intents" ("tenant_id", "state", "expires_at");

CREATE TABLE "exec007_decline_intents" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "offer_version_id" UUID NOT NULL,
  "customer_session_id" UUID NOT NULL,
  "principal_id" UUID NOT NULL,
  "subject_party_id" UUID NOT NULL,
  "customer_account_id" UUID,
  "action" "Exec007DecisionAction" NOT NULL DEFAULT 'DECLINE',
  "state" "Exec007DecisionIntentState" NOT NULL DEFAULT 'PENDING',
  "nonce_hash" TEXT NOT NULL,
  "content_hash" TEXT NOT NULL,
  "pricing_hash" TEXT NOT NULL,
  "terms_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMPTZ NOT NULL,
  "confirmed_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT transaction_timestamp(),
  CONSTRAINT "pk_exec007_decline_intents" PRIMARY KEY ("id"),
  CONSTRAINT "uq_exec007_decline_intents_tenant_id" UNIQUE ("tenant_id", "id"),
  CONSTRAINT "uq_exec007_decline_intent_nonce" UNIQUE ("tenant_id", "nonce_hash"),
  CONSTRAINT "fk_exec007_decline_intent_version" FOREIGN KEY ("tenant_id", "offer_version_id") REFERENCES "exec007_offer_versions"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "fk_exec007_decline_intent_session" FOREIGN KEY ("tenant_id", "customer_session_id") REFERENCES "exec007_customer_sessions"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "fk_exec007_decline_intent_principal" FOREIGN KEY ("tenant_id", "principal_id") REFERENCES "exec007_customer_principals"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ck_exec007_decline_intent_nonce" CHECK ("nonce_hash" ~ '^[0-9a-f]{64}$')
);
CREATE INDEX "idx_exec007_decline_intents_expiry" ON "exec007_decline_intents" ("tenant_id", "state", "expires_at");

CREATE TABLE "exec007_acceptance_evidence" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "acceptance_intent_id" UUID NOT NULL,
  "offer_version_id" UUID NOT NULL,
  "principal_id" UUID NOT NULL,
  "subject_party_id" UUID NOT NULL,
  "customer_account_id" UUID,
  "content_hash" TEXT NOT NULL,
  "pricing_hash" TEXT NOT NULL,
  "terms_hash" TEXT NOT NULL,
  "evidence_hash" TEXT NOT NULL,
  "network_hmac" TEXT,
  "hmac_key_version" TEXT NOT NULL,
  "confirmation_text_version" TEXT NOT NULL,
  "canonicalization_version" TEXT NOT NULL DEFAULT 'EXEC007-CANON-1',
  "assurance_level" "Exec007AssuranceLevel" NOT NULL,
  "server_confirmed_at" TIMESTAMPTZ NOT NULL DEFAULT transaction_timestamp(),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT transaction_timestamp(),
  CONSTRAINT "pk_exec007_acceptance_evidence" PRIMARY KEY ("id"),
  CONSTRAINT "uq_exec007_acceptance_evidence_tenant_id" UNIQUE ("tenant_id", "id"),
  CONSTRAINT "uq_exec007_acceptance_evidence_intent" UNIQUE ("tenant_id", "acceptance_intent_id"),
  CONSTRAINT "fk_exec007_acceptance_evidence_intent" FOREIGN KEY ("tenant_id", "acceptance_intent_id") REFERENCES "exec007_acceptance_intents"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "fk_exec007_acceptance_evidence_version" FOREIGN KEY ("tenant_id", "offer_version_id") REFERENCES "exec007_offer_versions"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ck_exec007_evidence_hash_format" CHECK ("evidence_hash" ~ '^[0-9a-f]{64}$' AND ("network_hmac" IS NULL OR "network_hmac" ~ '^[0-9a-f]{64}$'))
);

CREATE TABLE "exec007_decline_evidence" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "decline_intent_id" UUID NOT NULL,
  "offer_version_id" UUID NOT NULL,
  "principal_id" UUID NOT NULL,
  "subject_party_id" UUID NOT NULL,
  "customer_account_id" UUID,
  "content_hash" TEXT NOT NULL,
  "pricing_hash" TEXT NOT NULL,
  "terms_hash" TEXT NOT NULL,
  "evidence_hash" TEXT NOT NULL,
  "network_hmac" TEXT,
  "hmac_key_version" TEXT NOT NULL,
  "confirmation_text_version" TEXT NOT NULL,
  "canonicalization_version" TEXT NOT NULL DEFAULT 'EXEC007-CANON-1',
  "assurance_level" "Exec007AssuranceLevel" NOT NULL,
  "server_confirmed_at" TIMESTAMPTZ NOT NULL DEFAULT transaction_timestamp(),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT transaction_timestamp(),
  CONSTRAINT "pk_exec007_decline_evidence" PRIMARY KEY ("id"),
  CONSTRAINT "uq_exec007_decline_evidence_tenant_id" UNIQUE ("tenant_id", "id"),
  CONSTRAINT "uq_exec007_decline_evidence_intent" UNIQUE ("tenant_id", "decline_intent_id"),
  CONSTRAINT "fk_exec007_decline_evidence_intent" FOREIGN KEY ("tenant_id", "decline_intent_id") REFERENCES "exec007_decline_intents"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "fk_exec007_decline_evidence_version" FOREIGN KEY ("tenant_id", "offer_version_id") REFERENCES "exec007_offer_versions"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ck_exec007_decline_evidence_hash_format" CHECK ("evidence_hash" ~ '^[0-9a-f]{64}$' AND ("network_hmac" IS NULL OR "network_hmac" ~ '^[0-9a-f]{64}$'))
);

CREATE TABLE "exec007_acceptance_completion_attempts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "offer_version_id" UUID NOT NULL,
  "acceptance_evidence_id" UUID NOT NULL,
  "subject_party_id" UUID NOT NULL,
  "customer_account_id" UUID,
  "hold_id" UUID NOT NULL,
  "reservation_id" UUID,
  "state" "Exec007AcceptanceCompletionState" NOT NULL DEFAULT 'PENDING',
  "failure_code" TEXT,
  "failure_detail" TEXT,
  "expected_offer_version" INTEGER NOT NULL,
  "expected_hold_version" INTEGER NOT NULL,
  "idempotency_key_hash" TEXT NOT NULL,
  "completed_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT transaction_timestamp(),
  CONSTRAINT "pk_exec007_completion_attempts" PRIMARY KEY ("id"),
  CONSTRAINT "uq_exec007_completion_attempts_tenant_id" UNIQUE ("tenant_id", "id"),
  CONSTRAINT "fk_exec007_completion_version" FOREIGN KEY ("tenant_id", "offer_version_id") REFERENCES "exec007_offer_versions"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "fk_exec007_completion_evidence" FOREIGN KEY ("tenant_id", "acceptance_evidence_id") REFERENCES "exec007_acceptance_evidence"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "fk_exec007_completion_hold" FOREIGN KEY ("tenant_id", "hold_id") REFERENCES "unit_commitments"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "fk_exec007_completion_reservation" FOREIGN KEY ("tenant_id", "reservation_id") REFERENCES "unit_commitments"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ck_exec007_completion_hash" CHECK ("idempotency_key_hash" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "ck_exec007_completion_shape" CHECK (("state"='COMPLETED' AND "reservation_id" IS NOT NULL AND "completed_at" IS NOT NULL AND "failure_code" IS NULL) OR ("state"='FAILED' AND "reservation_id" IS NULL AND "failure_code" IS NOT NULL) OR ("state"='PENDING' AND "reservation_id" IS NULL AND "completed_at" IS NULL))
);
CREATE UNIQUE INDEX "uq_exec007_completion_success_version_subject" ON "exec007_acceptance_completion_attempts" ("tenant_id", "offer_version_id", "subject_party_id", COALESCE("customer_account_id", '00000000-0000-0000-0000-000000000000'::UUID)) WHERE "state"='COMPLETED';

CREATE TABLE "exec007_preparation_requests" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "completion_attempt_id" UUID NOT NULL,
  "reservation_id" UUID NOT NULL,
  "offer_id" UUID NOT NULL,
  "offer_version_id" UUID NOT NULL,
  "offer_kind" "Exec007OfferKind" NOT NULL,
  "request_type" "Exec007PreparationRequestType" NOT NULL,
  "state" "Exec007PreparationRequestState" NOT NULL DEFAULT 'REQUESTED',
  "subject_party_id" UUID NOT NULL,
  "customer_account_id" UUID,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT transaction_timestamp(),
  CONSTRAINT "pk_exec007_preparation_requests" PRIMARY KEY ("id"),
  CONSTRAINT "uq_exec007_preparation_requests_tenant_id" UNIQUE ("tenant_id", "id"),
  CONSTRAINT "uq_exec007_preparation_request_completion" UNIQUE ("tenant_id", "completion_attempt_id"),
  CONSTRAINT "fk_exec007_preparation_completion" FOREIGN KEY ("tenant_id", "completion_attempt_id") REFERENCES "exec007_acceptance_completion_attempts"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "fk_exec007_preparation_request_reservation" FOREIGN KEY ("tenant_id", "reservation_id") REFERENCES "unit_commitments"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "fk_exec007_preparation_offer" FOREIGN KEY ("tenant_id", "offer_id") REFERENCES "exec007_commercial_offers"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "fk_exec007_preparation_version" FOREIGN KEY ("tenant_id", "offer_version_id") REFERENCES "exec007_offer_versions"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ck_exec007_preparation_kind" CHECK (("offer_kind"='SALE' AND "request_type"='SALE_CONTRACT_PREPARATION_REQUEST') OR ("offer_kind"='LEASE' AND "request_type"='LEASE_PREPARATION_REQUEST'))
);

CREATE TABLE "exec007_offer_state_history" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "tenant_id" UUID NOT NULL, "offer_id" UUID NOT NULL,
  "from_state" "Exec007OfferState", "to_state" "Exec007OfferState" NOT NULL, "actor_user_id" UUID,
  "reason" TEXT, "correlation_id" TEXT NOT NULL, "occurred_at" TIMESTAMPTZ NOT NULL DEFAULT transaction_timestamp(),
  CONSTRAINT "pk_exec007_offer_state_history" PRIMARY KEY ("id"), CONSTRAINT "uq_exec007_offer_state_history_tenant_id" UNIQUE ("tenant_id","id"),
  CONSTRAINT "fk_exec007_offer_state_history_offer" FOREIGN KEY ("tenant_id","offer_id") REFERENCES "exec007_commercial_offers"("tenant_id","id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "exec007_offer_version_state_history" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "tenant_id" UUID NOT NULL, "offer_version_id" UUID NOT NULL,
  "from_state" "Exec007OfferVersionState", "to_state" "Exec007OfferVersionState" NOT NULL, "actor_user_id" UUID,
  "reason" TEXT, "correlation_id" TEXT NOT NULL, "occurred_at" TIMESTAMPTZ NOT NULL DEFAULT transaction_timestamp(),
  CONSTRAINT "pk_exec007_offer_version_state_history" PRIMARY KEY ("id"), CONSTRAINT "uq_exec007_offer_version_state_history_tenant_id" UNIQUE ("tenant_id","id"),
  CONSTRAINT "fk_exec007_offer_version_state_history_version" FOREIGN KEY ("tenant_id","offer_version_id") REFERENCES "exec007_offer_versions"("tenant_id","id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "exec007_idempotency_records" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "tenant_id" UUID NOT NULL, "operation" TEXT NOT NULL,
  "idempotency_key_hash" TEXT NOT NULL, "payload_hash" TEXT NOT NULL, "result_type" TEXT NOT NULL, "result_id" UUID,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT transaction_timestamp(),
  CONSTRAINT "pk_exec007_idempotency_records" PRIMARY KEY ("id"), CONSTRAINT "uq_exec007_idempotency_tenant_id" UNIQUE ("tenant_id","id"),
  CONSTRAINT "uq_exec007_idempotency_operation_key" UNIQUE ("tenant_id","operation","idempotency_key_hash"),
  CONSTRAINT "ck_exec007_idempotency_hash_format" CHECK ("idempotency_key_hash" ~ '^[0-9a-f]{64}$' AND "payload_hash" ~ '^[0-9a-f]{64}$')
);

CREATE TABLE "exec007_delegated_business_operations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "tenant_id" UUID NOT NULL, "operation" TEXT NOT NULL,
  "business_actor_user_id" UUID NOT NULL, "technical_actor_id" TEXT NOT NULL, "assignment_id" UUID NOT NULL,
  "resource_type" TEXT NOT NULL, "resource_id" UUID NOT NULL, "payload_hash" TEXT NOT NULL,
  "correlation_id" TEXT NOT NULL, "idempotency_key_hash" TEXT NOT NULL, "expires_at" TIMESTAMPTZ NOT NULL,
  "consumed_at" TIMESTAMPTZ, "created_at" TIMESTAMPTZ NOT NULL DEFAULT transaction_timestamp(),
  CONSTRAINT "pk_exec007_delegated_operations" PRIMARY KEY ("id"), CONSTRAINT "uq_exec007_delegated_operations_tenant_id" UNIQUE ("tenant_id","id"),
  CONSTRAINT "fk_exec007_delegated_business_actor" FOREIGN KEY ("tenant_id","business_actor_user_id") REFERENCES "users"("tenant_id","id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "fk_exec007_delegated_assignment" FOREIGN KEY ("tenant_id","assignment_id") REFERENCES "user_scope_assignments"("tenant_id","id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ck_exec007_delegation_hashes" CHECK ("payload_hash" ~ '^[0-9a-f]{64}$' AND "idempotency_key_hash" ~ '^[0-9a-f]{64}$')
);

CREATE TABLE "exec007_retention_assignments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "tenant_id" UUID NOT NULL, "record_type" TEXT NOT NULL, "record_id" UUID NOT NULL,
  "policy_version" TEXT NOT NULL, "retention_started_at" TIMESTAMPTZ NOT NULL, "downstream_relationship_ended_at" TIMESTAMPTZ,
  "scheduled_disposition_at" TIMESTAMPTZ NOT NULL, "disposition_status" "Exec007RetentionDispositionStatus" NOT NULL DEFAULT 'SCHEDULED',
  "legal_hold_status" "Exec007LegalHoldStatus" NOT NULL DEFAULT 'RELEASED', "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT transaction_timestamp(), "updated_at" TIMESTAMPTZ NOT NULL DEFAULT transaction_timestamp(),
  CONSTRAINT "pk_exec007_retention_assignments" PRIMARY KEY ("id"), CONSTRAINT "uq_exec007_retention_assignments_tenant_id" UNIQUE ("tenant_id","id"),
  CONSTRAINT "uq_exec007_retention_record" UNIQUE ("tenant_id","record_type","record_id"),
  CONSTRAINT "ck_exec007_retention_dates" CHECK ("scheduled_disposition_at" >= "retention_started_at")
);
CREATE INDEX "idx_exec007_retention_due" ON "exec007_retention_assignments" ("tenant_id","disposition_status","scheduled_disposition_at");

CREATE TABLE "exec007_customer_security_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "tenant_id" UUID NOT NULL, "principal_id" UUID,
  "event_type" TEXT NOT NULL, "purpose_code" "Exec007SecurityPurposeCode" NOT NULL, "raw_ip" INET,
  "network_hmac" TEXT, "recorded_at" TIMESTAMPTZ NOT NULL DEFAULT transaction_timestamp(),
  "scheduled_deletion_at" TIMESTAMPTZ NOT NULL DEFAULT (transaction_timestamp() + INTERVAL '90 days'),
  "legal_hold_status" "Exec007LegalHoldStatus" NOT NULL DEFAULT 'RELEASED', "metadata" JSONB NOT NULL DEFAULT '{}'::JSONB,
  CONSTRAINT "pk_exec007_customer_security_events" PRIMARY KEY ("id"), CONSTRAINT "uq_exec007_security_events_tenant_id" UNIQUE ("tenant_id","id"),
  CONSTRAINT "fk_exec007_security_event_principal" FOREIGN KEY ("tenant_id","principal_id") REFERENCES "exec007_customer_principals"("tenant_id","id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ck_exec007_security_event_ip_purpose" CHECK ("raw_ip" IS NULL OR "purpose_code" IS NOT NULL),
  CONSTRAINT "ck_exec007_security_event_delete_date" CHECK ("scheduled_deletion_at" = "recorded_at" + INTERVAL '90 days')
);
CREATE INDEX "idx_exec007_security_events_deletion" ON "exec007_customer_security_events" ("tenant_id","scheduled_deletion_at") WHERE "legal_hold_status" <> 'ACTIVE';

CREATE TABLE "exec007_security_event_reads" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "tenant_id" UUID NOT NULL, "security_event_id" UUID NOT NULL,
  "reader_user_id" UUID NOT NULL, "assignment_id" UUID NOT NULL, "purpose_code" "Exec007SecurityPurposeCode" NOT NULL,
  "reason" TEXT NOT NULL, "correlation_id" TEXT NOT NULL, "read_at" TIMESTAMPTZ NOT NULL DEFAULT transaction_timestamp(),
  CONSTRAINT "pk_exec007_security_event_reads" PRIMARY KEY ("id"), CONSTRAINT "uq_exec007_security_event_reads_tenant_id" UNIQUE ("tenant_id","id"),
  CONSTRAINT "fk_exec007_security_read_event" FOREIGN KEY ("tenant_id","security_event_id") REFERENCES "exec007_customer_security_events"("tenant_id","id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "fk_exec007_security_read_user" FOREIGN KEY ("tenant_id","reader_user_id") REFERENCES "users"("tenant_id","id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "exec007_disposition_audit" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "tenant_id" UUID NOT NULL, "record_type" TEXT NOT NULL, "record_id" UUID NOT NULL,
  "action" TEXT NOT NULL, "policy_version" TEXT NOT NULL, "actor_user_id" UUID, "reason" TEXT NOT NULL,
  "evidence_hash" TEXT NOT NULL, "occurred_at" TIMESTAMPTZ NOT NULL DEFAULT transaction_timestamp(),
  CONSTRAINT "pk_exec007_disposition_audit" PRIMARY KEY ("id"), CONSTRAINT "uq_exec007_disposition_audit_tenant_id" UNIQUE ("tenant_id","id"),
  CONSTRAINT "ck_exec007_disposition_hash" CHECK ("evidence_hash" ~ '^[0-9a-f]{64}$')
);

CREATE TABLE "exec007_legal_hold_records" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "tenant_id" UUID NOT NULL, "retention_assignment_id" UUID NOT NULL,
  "status" "Exec007LegalHoldStatus" NOT NULL DEFAULT 'ACTIVE', "reason" TEXT NOT NULL,
  "placed_by_user_id" UUID NOT NULL, "placed_at" TIMESTAMPTZ NOT NULL DEFAULT transaction_timestamp(),
  "released_by_user_id" UUID, "released_at" TIMESTAMPTZ, "release_reason" TEXT,
  CONSTRAINT "pk_exec007_legal_hold_records" PRIMARY KEY ("id"), CONSTRAINT "uq_exec007_legal_hold_records_tenant_id" UNIQUE ("tenant_id","id"),
  CONSTRAINT "fk_exec007_retention_legal_hold" FOREIGN KEY ("tenant_id","retention_assignment_id") REFERENCES "exec007_retention_assignments"("tenant_id","id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ck_exec007_legal_hold_release" CHECK (("status"='ACTIVE' AND "released_at" IS NULL AND "released_by_user_id" IS NULL) OR ("status"='RELEASED' AND "released_at" IS NOT NULL AND "released_by_user_id" IS NOT NULL))
);

CREATE TABLE "exec007_cutover_control" (
  "singleton_key" SMALLINT NOT NULL DEFAULT 1,
  "mode" "Exec007CutoverMode" NOT NULL DEFAULT 'LEGACY_ONLY',
  "authorized_release_sha" TEXT,
  "first_exec007_write_at" TIMESTAMPTZ,
  "version" INTEGER NOT NULL DEFAULT 1,
  "updated_by_user_id" UUID,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT transaction_timestamp(),
  CONSTRAINT "pk_exec007_cutover_control" PRIMARY KEY ("singleton_key"),
  CONSTRAINT "uq_exec007_cutover_singleton" CHECK ("singleton_key"=1),
  CONSTRAINT "ck_exec007_release_sha_format" CHECK ("authorized_release_sha" IS NULL OR "authorized_release_sha" ~ '^[0-9a-f]{40}$'),
  CONSTRAINT "ck_exec007_cutover_version" CHECK ("version" > 0)
);
INSERT INTO "exec007_cutover_control" ("singleton_key", "mode", "version") VALUES (1, 'LEGACY_ONLY', 1);

CREATE TABLE "exec007_cutover_transition_history" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "from_mode" "Exec007CutoverMode" NOT NULL, "to_mode" "Exec007CutoverMode" NOT NULL,
  "authorized_release_sha" TEXT, "expected_version" INTEGER NOT NULL, "actor_user_id" UUID NOT NULL,
  "reason" TEXT NOT NULL, "evidence_hash" TEXT NOT NULL, "transitioned_at" TIMESTAMPTZ NOT NULL DEFAULT transaction_timestamp(),
  CONSTRAINT "pk_exec007_cutover_transition_history" PRIMARY KEY ("id"),
  CONSTRAINT "ck_exec007_cutover_history_hash" CHECK ("evidence_hash" ~ '^[0-9a-f]{64}$')
);
CREATE INDEX "idx_exec007_cutover_history_time" ON "exec007_cutover_transition_history" ("transitioned_at","id");

CREATE OR REPLACE FUNCTION "fn_exec007_guard_immutable_row"() RETURNS trigger AS $$
BEGIN RAISE EXCEPTION 'EXEC-007 immutable row: %', TG_TABLE_NAME USING ERRCODE='55000'; END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "fn_exec007_guard_offer_identity_immutable"() RETURNS trigger AS $$
BEGIN
  IF (NEW."tenant_id",NEW."opportunity_id",NEW."unit_id",NEW."offer_kind",NEW."record_origin") IS DISTINCT FROM (OLD."tenant_id",OLD."opportunity_id",OLD."unit_id",OLD."offer_kind",OLD."record_origin") THEN
    RAISE EXCEPTION 'EXEC-007 offer identity is immutable' USING ERRCODE='55000';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "fn_exec007_guard_offer_version_immutable"() RETURNS trigger AS $$
BEGIN
  IF TG_OP='DELETE' AND OLD."state" <> 'DRAFT' THEN RAISE EXCEPTION 'EXEC-007 frozen version cannot be deleted' USING ERRCODE='55000'; END IF;
  IF TG_OP='UPDATE' AND OLD."state" <> 'DRAFT' THEN
    IF (NEW."content_payload",NEW."scope_snapshot",NEW."subject_snapshot",NEW."content_hash",NEW."pricing_hash",NEW."terms_hash",NEW."valid_until_utc",NEW."offer_kind",NEW."unit_id",NEW."opportunity_id") IS DISTINCT FROM (OLD."content_payload",OLD."scope_snapshot",OLD."subject_snapshot",OLD."content_hash",OLD."pricing_hash",OLD."terms_hash",OLD."valid_until_utc",OLD."offer_kind",OLD."unit_id",OLD."opportunity_id") THEN
      RAISE EXCEPTION 'EXEC-007 governed version fields are frozen' USING ERRCODE='55000';
    END IF;
  END IF;
  RETURN COALESCE(NEW,OLD);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "fn_exec007_guard_approval_sod"() RETURNS trigger AS $$
DECLARE v_creator UUID; v_editor UUID; v_initiator UUID;
BEGIN
  SELECT v."created_by_user_id",v."last_commercial_editor_id",r."initiator_user_id" INTO v_creator,v_editor,v_initiator
  FROM "exec007_offer_versions" v JOIN "exec007_offer_approval_requirements" r ON r."tenant_id"=v."tenant_id" AND r."offer_version_id"=v."id"
  WHERE r."tenant_id"=NEW."tenant_id" AND r."id"=NEW."requirement_id";
  IF v_creator IS NULL OR v_editor IS NULL OR v_initiator IS NULL OR NEW."actor_user_id" IN (v_creator,v_editor,v_initiator) THEN
    RAISE EXCEPTION 'EXEC-007 separation of duties denied' USING ERRCODE='42501';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "fn_exec007_assert_reservation_reference"() RETURNS trigger AS $$
DECLARE v_type TEXT; v_status TEXT;
BEGIN
  IF NEW."reservation_id" IS NULL THEN RETURN NEW; END IF;
  SELECT "commitment_type","status" INTO v_type,v_status FROM "unit_commitments" WHERE "tenant_id"=NEW."tenant_id" AND "id"=NEW."reservation_id";
  IF v_type IS DISTINCT FROM 'RESERVATION' OR v_status IS DISTINCT FROM 'ACTIVE' THEN
    RAISE EXCEPTION 'EXEC-007 reservation reference must target an active EXEC-006 RESERVATION' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "fn_exec007_guard_legal_hold_disposition"() RETURNS trigger AS $$
BEGIN
  IF OLD."legal_hold_status"='ACTIVE' AND (TG_OP='DELETE' OR NEW."disposition_status"='DISPOSED') THEN
    RAISE EXCEPTION 'EXEC-007 active legal hold blocks disposition' USING ERRCODE='55000';
  END IF;
  IF TG_OP='UPDATE' AND NEW."disposition_status"='DISPOSED' AND OLD."downstream_relationship_ended_at" IS NULL THEN
    RAISE EXCEPTION 'EXEC-007 downstream relationship end is unresolved' USING ERRCODE='55000';
  END IF;
  RETURN COALESCE(NEW,OLD);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "fn_exec007_guard_cutover_transition"() RETURNS trigger AS $$
BEGIN
  IF NEW."version" <> OLD."version"+1 THEN RAISE EXCEPTION 'EXEC-007 cutover expected version mismatch' USING ERRCODE='40001'; END IF;
  IF OLD."first_exec007_write_at" IS NOT NULL AND NEW."first_exec007_write_at" IS DISTINCT FROM OLD."first_exec007_write_at" THEN RAISE EXCEPTION 'EXEC-007 first-write latch is immutable' USING ERRCODE='55000'; END IF;
  IF NOT ((OLD."mode"='LEGACY_ONLY' AND NEW."mode"='EXEC007_READY') OR (OLD."mode"='EXEC007_READY' AND NEW."mode" IN ('LEGACY_ONLY','EXEC007_ACTIVE')) OR (OLD."mode"='EXEC007_ACTIVE' AND NEW."mode"='RECOVERY_STOP') OR (OLD."mode"='RECOVERY_STOP' AND NEW."mode"='EXEC007_ACTIVE') OR OLD."mode"=NEW."mode") THEN
    RAISE EXCEPTION 'EXEC-007 invalid cutover transition % -> %',OLD."mode",NEW."mode" USING ERRCODE='55000';
  END IF;
  IF NEW."mode" IN ('EXEC007_READY','EXEC007_ACTIVE') AND NEW."authorized_release_sha" IS NULL THEN RAISE EXCEPTION 'EXEC-007 release SHA required' USING ERRCODE='23514'; END IF;
  NEW."updated_at" := transaction_timestamp();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "fn_exec007_mark_first_write"() RETURNS trigger AS $$
BEGIN
  UPDATE "exec007_cutover_control" SET "first_exec007_write_at"=COALESCE("first_exec007_write_at",transaction_timestamp()), "updated_at"=transaction_timestamp() WHERE "singleton_key"=1 AND "mode"='EXEC007_ACTIVE';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "fn_exec007_assert_write_mode"(p_write_class TEXT) RETURNS VOID AS $$
DECLARE v_mode "Exec007CutoverMode";
BEGIN
  SELECT "mode" INTO v_mode FROM "exec007_cutover_control" WHERE "singleton_key"=1;
  IF p_write_class='EXEC007' AND v_mode <> 'EXEC007_ACTIVE' THEN RAISE EXCEPTION 'EXEC-007 writes denied in mode %',v_mode USING ERRCODE='42501'; END IF;
  IF p_write_class='LEGACY' AND v_mode <> 'LEGACY_ONLY' THEN RAISE EXCEPTION 'Legacy commercial writes denied in mode %',v_mode USING ERRCODE='42501'; END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "fn_exec007_guard_legacy_offer_write"() RETURNS trigger AS $$
BEGIN PERFORM "fn_exec007_assert_write_mode"('LEGACY'); RETURN COALESCE(NEW,OLD); END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "fn_exec007_guard_legacy_acceptance"(p_record_origin TEXT) RETURNS VOID AS $$
BEGIN
  IF p_record_origin='EXEC007' THEN RAISE EXCEPTION 'Legacy acceptance rejects EXEC-007 identifiers' USING ERRCODE='42501'; END IF;
  PERFORM "fn_exec007_assert_write_mode"('LEGACY');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "fn_exec007_guard_security_event_read"(p_tenant_id UUID,p_security_event_id UUID,p_reader_user_id UUID,p_assignment_id UUID,p_purpose "Exec007SecurityPurposeCode",p_reason TEXT,p_correlation_id TEXT) RETURNS INET AS $$
DECLARE v_ip INET;
BEGIN
  IF p_reason IS NULL OR btrim(p_reason)='' OR p_correlation_id IS NULL OR btrim(p_correlation_id)='' THEN RAISE EXCEPTION 'restricted security read purpose and correlation required' USING ERRCODE='42501'; END IF;
  SELECT "raw_ip" INTO v_ip FROM "exec007_customer_security_events" WHERE "tenant_id"=p_tenant_id AND "id"=p_security_event_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'security event not found' USING ERRCODE='P0002'; END IF;
  INSERT INTO "exec007_security_event_reads" ("tenant_id","security_event_id","reader_user_id","assignment_id","purpose_code","reason","correlation_id") VALUES (p_tenant_id,p_security_event_id,p_reader_user_id,p_assignment_id,p_purpose,p_reason,p_correlation_id);
  RETURN v_ip;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp;

CREATE TRIGGER "trg_exec007_offer_identity_immutable" BEFORE UPDATE ON "exec007_commercial_offers" FOR EACH ROW EXECUTE FUNCTION "fn_exec007_guard_offer_identity_immutable"();
CREATE TRIGGER "trg_exec007_offer_version_immutable" BEFORE UPDATE OR DELETE ON "exec007_offer_versions" FOR EACH ROW EXECUTE FUNCTION "fn_exec007_guard_offer_version_immutable"();
CREATE TRIGGER "trg_exec007_pricing_snapshot_immutable" BEFORE UPDATE OR DELETE ON "exec007_offer_pricing_snapshots" FOR EACH ROW EXECUTE FUNCTION "fn_exec007_guard_immutable_row"();
CREATE TRIGGER "trg_exec007_approval_decision_immutable" BEFORE UPDATE OR DELETE ON "exec007_offer_approval_decisions" FOR EACH ROW EXECUTE FUNCTION "fn_exec007_guard_immutable_row"();
CREATE TRIGGER "trg_exec007_acceptance_evidence_immutable" BEFORE UPDATE OR DELETE ON "exec007_acceptance_evidence" FOR EACH ROW EXECUTE FUNCTION "fn_exec007_guard_immutable_row"();
CREATE TRIGGER "trg_exec007_decline_evidence_immutable" BEFORE UPDATE OR DELETE ON "exec007_decline_evidence" FOR EACH ROW EXECUTE FUNCTION "fn_exec007_guard_immutable_row"();
CREATE TRIGGER "trg_exec007_preparation_request_immutable" BEFORE UPDATE OR DELETE ON "exec007_preparation_requests" FOR EACH ROW EXECUTE FUNCTION "fn_exec007_guard_immutable_row"();
CREATE TRIGGER "trg_exec007_offer_history_immutable" BEFORE UPDATE OR DELETE ON "exec007_offer_state_history" FOR EACH ROW EXECUTE FUNCTION "fn_exec007_guard_immutable_row"();
CREATE TRIGGER "trg_exec007_offer_version_history_immutable" BEFORE UPDATE OR DELETE ON "exec007_offer_version_state_history" FOR EACH ROW EXECUTE FUNCTION "fn_exec007_guard_immutable_row"();
CREATE TRIGGER "trg_exec007_approval_sod" BEFORE INSERT ON "exec007_offer_approval_decisions" FOR EACH ROW EXECUTE FUNCTION "fn_exec007_guard_approval_sod"();
CREATE TRIGGER "trg_exec007_completion_reservation_guard" BEFORE INSERT OR UPDATE OF "reservation_id","state" ON "exec007_acceptance_completion_attempts" FOR EACH ROW EXECUTE FUNCTION "fn_exec007_assert_reservation_reference"();
CREATE TRIGGER "trg_exec007_preparation_reservation_guard" BEFORE INSERT OR UPDATE OF "reservation_id" ON "exec007_preparation_requests" FOR EACH ROW EXECUTE FUNCTION "fn_exec007_assert_reservation_reference"();
CREATE TRIGGER "trg_exec007_retention_legal_hold" BEFORE UPDATE OR DELETE ON "exec007_retention_assignments" FOR EACH ROW EXECUTE FUNCTION "fn_exec007_guard_legal_hold_disposition"();
CREATE TRIGGER "trg_exec007_cutover_transition" BEFORE UPDATE ON "exec007_cutover_control" FOR EACH ROW EXECUTE FUNCTION "fn_exec007_guard_cutover_transition"();
CREATE TRIGGER "trg_exec007_legacy_offer_write_guard" BEFORE INSERT OR UPDATE OR DELETE ON "offers" FOR EACH ROW EXECUTE FUNCTION "fn_exec007_guard_legacy_offer_write"();

CREATE TRIGGER "trg_exec007_mark_first_write_offer" AFTER INSERT ON "exec007_commercial_offers" FOR EACH ROW EXECUTE FUNCTION "fn_exec007_mark_first_write"();
CREATE TRIGGER "trg_exec007_mark_first_write_version" AFTER INSERT ON "exec007_offer_versions" FOR EACH ROW EXECUTE FUNCTION "fn_exec007_mark_first_write"();
CREATE TRIGGER "trg_exec007_mark_first_write_evidence" AFTER INSERT ON "exec007_acceptance_evidence" FOR EACH ROW EXECUTE FUNCTION "fn_exec007_mark_first_write"();
CREATE TRIGGER "trg_exec007_mark_first_write_completion" AFTER INSERT ON "exec007_acceptance_completion_attempts" FOR EACH ROW EXECUTE FUNCTION "fn_exec007_mark_first_write"();

COMMENT ON CONSTRAINT "fk_exec007_subject_grants_tenant_actor_party" ON "exec007_customer_principal_subject_grants" IS 'Physical correction: canonical EXEC-005 table customer_parties.';
COMMENT ON CONSTRAINT "fk_exec007_subject_grants_tenant_customer_account" ON "exec007_customer_principal_subject_grants" IS 'Physical correction: canonical EXEC-005 table customer_accounts_v2.';
COMMENT ON CONSTRAINT "fk_exec007_offers_tenant_opportunity" ON "exec007_commercial_offers" IS 'Physical correction: canonical EXEC-005 table customer_opportunities_v2.';
COMMENT ON CONSTRAINT "fk_exec007_completion_reservation" ON "exec007_acceptance_completion_attempts" IS 'Physical correction: EXEC-006 reservation is a unit_commitments row with commitment_type=RESERVATION; trigger enforces type/status.';
