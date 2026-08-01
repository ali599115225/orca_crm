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
  IF TG_OP='DELETE' THEN
    IF OLD."state" <> 'DRAFT' THEN
      RAISE EXCEPTION 'EXEC-007 frozen version cannot be deleted' USING ERRCODE='55000';
    END IF;
    RETURN OLD;
  END IF;

  IF OLD."state" <> 'DRAFT' THEN
    IF (
      NEW."tenant_id", NEW."offer_id", NEW."version_number", NEW."offer_kind",
      NEW."subject_party_id", NEW."customer_account_id", NEW."branch_id",
      NEW."unit_id", NEW."opportunity_id", NEW."content_payload",
      NEW."scope_snapshot", NEW."subject_snapshot", NEW."confirmation_text_version",
      NEW."canonicalization_version", NEW."content_hash", NEW."pricing_hash",
      NEW."terms_hash", NEW."validity_policy_version", NEW."valid_until_local_date",
      NEW."validity_time_zone", NEW."valid_until_utc", NEW."issued_at_utc",
      NEW."created_by_user_id", NEW."last_commercial_editor_id", NEW."created_at"
    ) IS DISTINCT FROM (
      OLD."tenant_id", OLD."offer_id", OLD."version_number", OLD."offer_kind",
      OLD."subject_party_id", OLD."customer_account_id", OLD."branch_id",
      OLD."unit_id", OLD."opportunity_id", OLD."content_payload",
      OLD."scope_snapshot", OLD."subject_snapshot", OLD."confirmation_text_version",
      OLD."canonicalization_version", OLD."content_hash", OLD."pricing_hash",
      OLD."terms_hash", OLD."validity_policy_version", OLD."valid_until_local_date",
      OLD."validity_time_zone", OLD."valid_until_utc", OLD."issued_at_utc",
      OLD."created_by_user_id", OLD."last_commercial_editor_id", OLD."created_at"
    ) THEN
      RAISE EXCEPTION 'EXEC-007 governed version fields are frozen' USING ERRCODE='55000';
    END IF;
    IF NEW."row_version" <> OLD."row_version" + 1 THEN
      RAISE EXCEPTION 'EXEC-007 offer version expected row version mismatch' USING ERRCODE='40001';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "fn_exec007_guard_pricing_freeze"() RETURNS trigger AS $$
DECLARE
  v_snapshot_id UUID;
  v_tenant_id UUID;
  v_version_state "Exec007OfferVersionState";
BEGIN
  IF TG_OP='DELETE' THEN
    v_tenant_id := OLD."tenant_id";
  ELSE
    v_tenant_id := NEW."tenant_id";
  END IF;

  IF TG_TABLE_NAME='exec007_offer_pricing_snapshots' THEN
    IF TG_OP='DELETE' THEN v_snapshot_id := OLD."id"; ELSE v_snapshot_id := NEW."id"; END IF;
    SELECT v."state" INTO v_version_state
      FROM "exec007_offer_versions" v
      JOIN "exec007_offer_pricing_snapshots" s
        ON s."tenant_id"=v."tenant_id" AND s."offer_version_id"=v."id"
     WHERE s."tenant_id"=v_tenant_id
       AND s."id"=v_snapshot_id;
  ELSE
    IF TG_OP='DELETE' THEN v_snapshot_id := OLD."pricing_snapshot_id"; ELSE v_snapshot_id := NEW."pricing_snapshot_id"; END IF;
    SELECT v."state" INTO v_version_state
      FROM "exec007_offer_versions" v
      JOIN "exec007_offer_pricing_snapshots" s
        ON s."tenant_id"=v."tenant_id" AND s."offer_version_id"=v."id"
     WHERE s."tenant_id"=v_tenant_id
       AND s."id"=v_snapshot_id;
  END IF;

  IF v_version_state IS NULL THEN
    RAISE EXCEPTION 'EXEC-007 pricing snapshot version binding missing' USING ERRCODE='23503';
  END IF;
  IF v_version_state <> 'DRAFT' THEN
    RAISE EXCEPTION 'EXEC-007 frozen pricing snapshot and components are immutable' USING ERRCODE='55000';
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
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

CREATE UNIQUE INDEX "uq_exec007_one_active_legal_hold"
  ON "exec007_legal_hold_records" ("tenant_id", "retention_assignment_id")
  WHERE "status"='ACTIVE';

CREATE OR REPLACE FUNCTION "fn_exec007_sync_legal_hold_status"() RETURNS trigger AS $$
DECLARE
  v_tenant_id UUID;
  v_assignment_id UUID;
  v_expected "Exec007LegalHoldStatus";
BEGIN
  IF TG_OP='DELETE' THEN
    v_tenant_id := OLD."tenant_id";
    v_assignment_id := OLD."retention_assignment_id";
  ELSE
    v_tenant_id := NEW."tenant_id";
    v_assignment_id := NEW."retention_assignment_id";
  END IF;
  IF TG_OP='DELETE' THEN
    RAISE EXCEPTION 'EXEC-007 legal hold records cannot be deleted; release them explicitly' USING ERRCODE='55000';
  END IF;
  IF TG_OP='UPDATE' AND OLD."status"='RELEASED' AND NEW."status" <> OLD."status" THEN
    RAISE EXCEPTION 'EXEC-007 released legal hold cannot be reactivated' USING ERRCODE='55000';
  END IF;

  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM "exec007_legal_hold_records" h
     WHERE h."tenant_id"=v_tenant_id
       AND h."retention_assignment_id"=v_assignment_id
       AND h."status"='ACTIVE'
  ) THEN 'ACTIVE'::"Exec007LegalHoldStatus" ELSE 'RELEASED'::"Exec007LegalHoldStatus" END
  INTO v_expected;

  UPDATE "exec007_retention_assignments"
     SET "legal_hold_status"=v_expected,
         "version"="version"+1,
         "updated_at"=transaction_timestamp()
   WHERE "tenant_id"=v_tenant_id AND "id"=v_assignment_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'EXEC-007 legal hold retention assignment missing' USING ERRCODE='23503';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "fn_exec007_guard_legal_hold_disposition"() RETURNS trigger AS $$
DECLARE
  v_active_hold BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM "exec007_legal_hold_records" h
     WHERE h."tenant_id"=OLD."tenant_id"
       AND h."retention_assignment_id"=OLD."id"
       AND h."status"='ACTIVE'
  ) INTO v_active_hold;

  IF TG_OP='UPDATE' AND NEW."legal_hold_status" IS DISTINCT FROM
     (CASE WHEN v_active_hold THEN 'ACTIVE'::"Exec007LegalHoldStatus" ELSE 'RELEASED'::"Exec007LegalHoldStatus" END) THEN
    RAISE EXCEPTION 'EXEC-007 legal hold status is inconsistent with authoritative hold records' USING ERRCODE='55000';
  END IF;
  IF (v_active_hold OR OLD."legal_hold_status"='ACTIVE')
     AND (TG_OP='DELETE' OR NEW."disposition_status"='DISPOSED') THEN
    RAISE EXCEPTION 'EXEC-007 active legal hold blocks disposition' USING ERRCODE='55000';
  END IF;
  IF TG_OP='UPDATE'
     AND NEW."disposition_status"='DISPOSED'
     AND NEW."downstream_relationship_ended_at" IS NULL THEN
    RAISE EXCEPTION 'EXEC-007 downstream relationship end is unresolved' USING ERRCODE='55000';
  END IF;
  RETURN COALESCE(NEW,OLD);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "fn_exec007_guard_cutover_transition"() RETURNS trigger AS $$
BEGIN
  IF NEW."version"=OLD."version"
     AND NEW."mode"=OLD."mode"
     AND OLD."mode"='EXEC007_ACTIVE'
     AND OLD."first_exec007_write_at" IS NULL
     AND NEW."first_exec007_write_at" IS NOT NULL
     AND NEW."authorized_release_sha" IS NOT DISTINCT FROM OLD."authorized_release_sha"
     AND NEW."updated_by_user_id" IS NOT DISTINCT FROM OLD."updated_by_user_id" THEN
    NEW."updated_at" := transaction_timestamp();
    RETURN NEW;
  END IF;

  IF NEW."version" <> OLD."version"+1 THEN
    RAISE EXCEPTION 'EXEC-007 cutover expected version mismatch' USING ERRCODE='40001';
  END IF;
  IF OLD."first_exec007_write_at" IS NOT NULL
     AND NEW."first_exec007_write_at" IS DISTINCT FROM OLD."first_exec007_write_at" THEN
    RAISE EXCEPTION 'EXEC-007 first-write latch is immutable' USING ERRCODE='55000';
  END IF;
  IF NOT (
    (OLD."mode"='LEGACY_ONLY' AND NEW."mode"='EXEC007_READY') OR
    (OLD."mode"='EXEC007_READY' AND NEW."mode" IN ('LEGACY_ONLY','EXEC007_ACTIVE')) OR
    (OLD."mode"='EXEC007_ACTIVE' AND NEW."mode"='RECOVERY_STOP') OR
    (OLD."mode"='RECOVERY_STOP' AND NEW."mode"='EXEC007_ACTIVE') OR
    OLD."mode"=NEW."mode"
  ) THEN
    RAISE EXCEPTION 'EXEC-007 invalid cutover transition % -> %',OLD."mode",NEW."mode" USING ERRCODE='55000';
  END IF;
  IF NEW."mode" IN ('EXEC007_READY','EXEC007_ACTIVE') AND NEW."authorized_release_sha" IS NULL THEN
    RAISE EXCEPTION 'EXEC-007 release SHA required' USING ERRCODE='23514';
  END IF;
  NEW."updated_at" := transaction_timestamp();
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

CREATE OR REPLACE FUNCTION "fn_exec007_guard_exec007_write"() RETURNS trigger AS $$
BEGIN
  PERFORM "fn_exec007_assert_write_mode"('EXEC007');
  UPDATE "exec007_cutover_control"
     SET "first_exec007_write_at"=transaction_timestamp()
   WHERE "singleton_key"=1
     AND "mode"='EXEC007_ACTIVE'
     AND "first_exec007_write_at" IS NULL;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
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
CREATE TRIGGER "trg_exec007_pricing_snapshot_immutable" BEFORE UPDATE OR DELETE ON "exec007_offer_pricing_snapshots" FOR EACH ROW EXECUTE FUNCTION "fn_exec007_guard_pricing_freeze"();
CREATE TRIGGER "trg_exec007_pricing_component_immutable" BEFORE INSERT OR UPDATE OR DELETE ON "exec007_offer_pricing_components" FOR EACH ROW EXECUTE FUNCTION "fn_exec007_guard_pricing_freeze"();
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
CREATE TRIGGER "trg_exec007_legal_hold_sync" AFTER INSERT OR UPDATE OR DELETE ON "exec007_legal_hold_records" FOR EACH ROW EXECUTE FUNCTION "fn_exec007_sync_legal_hold_status"();
CREATE TRIGGER "trg_exec007_cutover_transition" BEFORE UPDATE ON "exec007_cutover_control" FOR EACH ROW EXECUTE FUNCTION "fn_exec007_guard_cutover_transition"();
CREATE TRIGGER "trg_exec007_legacy_offer_write_guard" BEFORE INSERT OR UPDATE OR DELETE ON "offers" FOR EACH ROW EXECUTE FUNCTION "fn_exec007_guard_legacy_offer_write"();
CREATE TRIGGER "trg_exec007_mark_first_write_offer" BEFORE INSERT OR UPDATE OR DELETE ON "exec007_commercial_offers" FOR EACH ROW EXECUTE FUNCTION "fn_exec007_guard_exec007_write"();

DO $$
DECLARE
  v_table TEXT;
  v_trigger TEXT;
BEGIN
  FOR v_table IN
    SELECT tablename
      FROM pg_tables
     WHERE schemaname='public'
       AND left(tablename,8)='exec007_'
       AND tablename NOT IN ('exec007_cutover_control','exec007_cutover_transition_history','exec007_commercial_offers')
     ORDER BY tablename
  LOOP
    v_trigger := 'trg_exec007_00_write_gate_' || substr(md5(v_table),1,12);
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION "fn_exec007_guard_exec007_write"()',
      v_trigger,
      v_table
    );
  END LOOP;
END;
$$;


CREATE OR REPLACE FUNCTION "fn_exec007_complete_conditional_acceptance"(
  p_tenant_id UUID,
  p_offer_version_id UUID,
  p_principal_id UUID,
  p_subject_grant_id UUID,
  p_session_id UUID,
  p_challenge_id UUID,
  p_hold_id UUID,
  p_actor_user_id UUID,
  p_assignment_id UUID,
  p_expected_hold_version INTEGER,
  p_reservation_expires_at TIMESTAMPTZ,
  p_acceptance_method TEXT,
  p_evidence_payload JSONB,
  p_evidence_hash TEXT,
  p_correlation_id TEXT,
  p_idempotency_key_hash TEXT,
  p_payload_hash TEXT
) RETURNS TABLE (
  acceptance_intent_id UUID,
  acceptance_evidence_id UUID,
  completion_attempt_id UUID,
  reservation_id UUID,
  preparation_request_id UUID
) AS $$
DECLARE
  v_offer "exec007_commercial_offers"%ROWTYPE;
  v_version "exec007_offer_versions"%ROWTYPE;
  v_principal "exec007_customer_principals"%ROWTYPE;
  v_grant "exec007_customer_principal_subject_grants"%ROWTYPE;
  v_session "exec007_customer_sessions"%ROWTYPE;
  v_challenge "exec007_customer_auth_challenges"%ROWTYPE;
  v_hold "unit_commitments"%ROWTYPE;
  v_snapshot "exec007_offer_pricing_snapshots"%ROWTYPE;
  v_existing "exec007_idempotency_records"%ROWTYPE;
  v_intent_id UUID := gen_random_uuid();
  v_evidence_id UUID := gen_random_uuid();
  v_completion_id UUID := gen_random_uuid();
  v_reservation_id UUID;
  v_preparation_id UUID := gen_random_uuid();
  v_request_type "Exec007PreparationRequestType";
  v_result RECORD;
  v_now TIMESTAMPTZ;
BEGIN
  IF p_tenant_id IS NULL OR p_offer_version_id IS NULL OR p_principal_id IS NULL OR
     p_subject_grant_id IS NULL OR p_session_id IS NULL OR p_challenge_id IS NULL OR
     p_hold_id IS NULL OR p_actor_user_id IS NULL OR p_assignment_id IS NULL THEN
    RAISE EXCEPTION 'EXEC-007 conditional acceptance references are required' USING ERRCODE='22004';
  END IF;
  IF p_expected_hold_version < 1 THEN
    RAISE EXCEPTION 'EXEC-007 conditional acceptance version or reservation expiry is invalid' USING ERRCODE='22023';
  END IF;
  IF p_acceptance_method IS NULL OR btrim(p_acceptance_method)='' OR
     p_correlation_id IS NULL OR btrim(p_correlation_id)='' THEN
    RAISE EXCEPTION 'EXEC-007 acceptance method and correlation are required' USING ERRCODE='22023';
  END IF;
  IF p_evidence_hash !~ '^[0-9a-f]{64}$' OR p_idempotency_key_hash !~ '^[0-9a-f]{64}$' OR p_payload_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'EXEC-007 conditional acceptance hashes must be lowercase SHA-256' USING ERRCODE='22023';
  END IF;
  IF jsonb_typeof(p_evidence_payload) IS DISTINCT FROM 'object' OR
     p_evidence_payload->>'action' IS DISTINCT FROM 'ACCEPT' OR
     p_evidence_payload->>'offerVersionId' IS DISTINCT FROM p_offer_version_id::TEXT OR
     p_evidence_payload->>'challengeId' IS DISTINCT FROM p_challenge_id::TEXT THEN
    RAISE EXCEPTION 'EXEC-007 evidence payload is not bound to the exact ACCEPT challenge and OfferVersion' USING ERRCODE='23514';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_tenant_id::TEXT || ':EXEC007:ACCEPT:' || p_idempotency_key_hash, 0));
  v_now := clock_timestamp();
  IF p_reservation_expires_at <= v_now THEN
    RAISE EXCEPTION 'EXEC-007 conditional acceptance version or reservation expiry is invalid' USING ERRCODE='22023';
  END IF;

  SELECT * INTO v_existing
    FROM "exec007_idempotency_records"
   WHERE "tenant_id"=p_tenant_id
     AND "operation"='CONDITIONAL_ACCEPTANCE'
     AND "idempotency_key_hash"=p_idempotency_key_hash
   FOR UPDATE;
  IF FOUND THEN
    IF v_existing."payload_hash" <> p_payload_hash THEN
      RAISE EXCEPTION 'EXEC-007 idempotency payload mismatch' USING ERRCODE='22000';
    END IF;
    SELECT i."id" AS intent_id, e."id" AS evidence_id, c."id" AS completion_id,
           c."reservation_id", r."id" AS preparation_id
      INTO v_result
      FROM "exec007_acceptance_completion_attempts" c
      JOIN "exec007_acceptance_evidence" e
        ON e."tenant_id"=c."tenant_id" AND e."id"=c."acceptance_evidence_id"
      JOIN "exec007_acceptance_intents" i
        ON i."tenant_id"=e."tenant_id" AND i."id"=e."acceptance_intent_id"
      JOIN "exec007_preparation_requests" r
        ON r."tenant_id"=c."tenant_id" AND r."completion_attempt_id"=c."id"
     WHERE c."tenant_id"=p_tenant_id AND c."id"=v_existing."result_id" AND c."state"='COMPLETED';
    IF NOT FOUND THEN
      RAISE EXCEPTION 'EXEC-007 idempotent result is incomplete' USING ERRCODE='55000';
    END IF;
    RETURN QUERY SELECT v_result.intent_id,v_result.evidence_id,v_result.completion_id,v_result.reservation_id,v_result.preparation_id;
    RETURN;
  END IF;

  PERFORM "fn_exec007_assert_write_mode"('EXEC007');

  SELECT * INTO v_version
    FROM "exec007_offer_versions"
   WHERE "tenant_id"=p_tenant_id AND "id"=p_offer_version_id
   FOR UPDATE;
  IF NOT FOUND OR v_version."state" <> 'ISSUED' OR NOT v_version."is_current" OR
     v_version."valid_until_utc" IS NULL OR v_version."valid_until_utc" <= v_now THEN
    RAISE EXCEPTION 'EXEC-007 exact OfferVersion is not currently acceptable' USING ERRCODE='55000';
  END IF;

  SELECT * INTO v_offer
    FROM "exec007_commercial_offers"
   WHERE "tenant_id"=p_tenant_id AND "id"=v_version."offer_id"
   FOR UPDATE;
  IF NOT FOUND OR v_offer."state" <> 'OPEN' OR v_offer."current_issued_version_id" IS DISTINCT FROM v_version."id" OR
     v_offer."unit_id" IS DISTINCT FROM v_version."unit_id" OR v_offer."opportunity_id" IS DISTINCT FROM v_version."opportunity_id" OR
     v_offer."subject_party_id" IS DISTINCT FROM v_version."subject_party_id" OR
     v_offer."customer_account_id" IS DISTINCT FROM v_version."customer_account_id" OR
     v_offer."branch_id" IS DISTINCT FROM v_version."branch_id" OR v_offer."offer_kind" IS DISTINCT FROM v_version."offer_kind" THEN
    RAISE EXCEPTION 'EXEC-007 commercial offer and exact version binding mismatch' USING ERRCODE='23514';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM "exec007_offer_approval_requirements" req
     WHERE req."tenant_id"=p_tenant_id AND req."offer_version_id"=v_version."id"
       AND NOT EXISTS (
         SELECT 1 FROM "exec007_offer_approval_decisions" dec
          WHERE dec."tenant_id"=req."tenant_id" AND dec."requirement_id"=req."id" AND dec."state"='APPROVED'
       )
  ) THEN
    RAISE EXCEPTION 'EXEC-007 commercial authority approval is incomplete' USING ERRCODE='42501';
  END IF;

  SELECT * INTO v_snapshot
    FROM "exec007_offer_pricing_snapshots"
   WHERE "tenant_id"=p_tenant_id AND "offer_version_id"=v_version."id";
  IF NOT FOUND OR v_snapshot."pricing_hash" <> v_version."pricing_hash" OR v_snapshot."offer_kind" <> v_version."offer_kind" THEN
    RAISE EXCEPTION 'EXEC-007 pricing snapshot binding mismatch' USING ERRCODE='23514';
  END IF;

  SELECT * INTO v_principal
    FROM "exec007_customer_principals"
   WHERE "tenant_id"=p_tenant_id AND "id"=p_principal_id
   FOR UPDATE;
  IF NOT FOUND OR v_principal."status" <> 'ACTIVE' THEN
    RAISE EXCEPTION 'EXEC-007 customer principal is inactive' USING ERRCODE='42501';
  END IF;

  SELECT * INTO v_grant
    FROM "exec007_customer_principal_subject_grants"
   WHERE "tenant_id"=p_tenant_id AND "id"=p_subject_grant_id
   FOR UPDATE;
  IF NOT FOUND OR v_grant."principal_id" <> p_principal_id OR v_grant."status" <> 'ACTIVE' OR
     v_grant."effective_at" > v_now OR (v_grant."expires_at" IS NOT NULL AND v_grant."expires_at" <= v_now) OR
     v_grant."revoked_at" IS NOT NULL OR v_grant."subject_party_id" <> v_version."subject_party_id" OR
     v_grant."customer_account_id" IS DISTINCT FROM v_version."customer_account_id" OR
     v_grant."branch_id" <> v_version."branch_id" OR v_grant."service_line" <> v_offer."service_line" THEN
    RAISE EXCEPTION 'EXEC-007 subject grant does not authorize this exact offer version' USING ERRCODE='42501';
  END IF;

  SELECT * INTO v_session
    FROM "exec007_customer_sessions"
   WHERE "tenant_id"=p_tenant_id AND "id"=p_session_id
   FOR UPDATE;
  IF NOT FOUND OR v_session."principal_id" <> p_principal_id OR v_session."subject_grant_id" <> p_subject_grant_id OR
     v_session."status" <> 'ACTIVE' OR v_session."assurance_level" <> 'CUSTOMER_DECISION_STEP_UP' OR
     v_session."auth_version" <> v_principal."auth_version" OR v_session."grant_version" <> v_grant."grant_version" OR
     v_session."decision_step_up_at" IS NULL OR v_session."decision_step_up_at" > v_now OR
     v_session."revoked_at" IS NOT NULL OR v_session."absolute_expires_at" <= v_now OR v_session."idle_expires_at" <= v_now THEN
    RAISE EXCEPTION 'EXEC-007 customer session is not authorized for decision acceptance' USING ERRCODE='42501';
  END IF;

  SELECT * INTO v_challenge
    FROM "exec007_customer_auth_challenges"
   WHERE "tenant_id"=p_tenant_id AND "id"=p_challenge_id
   FOR UPDATE;
  IF NOT FOUND OR v_challenge."principal_id" IS DISTINCT FROM p_principal_id OR
     v_challenge."session_id" IS DISTINCT FROM p_session_id OR
     v_challenge."subject_grant_id" IS DISTINCT FROM p_subject_grant_id OR
     v_challenge."subject_party_id" IS DISTINCT FROM v_version."subject_party_id" OR
     v_challenge."customer_account_id" IS DISTINCT FROM v_version."customer_account_id" OR
     v_challenge."offer_version_id" IS DISTINCT FROM p_offer_version_id OR
     v_challenge."payload_proof_hash" IS DISTINCT FROM p_payload_hash OR
     v_challenge."action" IS DISTINCT FROM 'ACCEPT' OR v_challenge."status" <> 'PENDING' OR
     v_challenge."expires_at" <= v_now OR v_challenge."consumed_at" IS NOT NULL THEN
    RAISE EXCEPTION 'EXEC-007 acceptance challenge is invalid, expired, revoked, consumed, or structurally unbound' USING ERRCODE='42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM "exec007_customer_principal_identities" ident
     WHERE ident."tenant_id"=p_tenant_id AND ident."principal_id"=p_principal_id
       AND ident."identity_type"=v_challenge."identity_type" AND ident."status"='ACTIVE'
       AND ident."verified_at" <= v_now AND ident."revoked_at" IS NULL
  ) THEN
    RAISE EXCEPTION 'EXEC-007 challenge identity is not actively verified' USING ERRCODE='42501';
  END IF;

  SELECT * INTO v_hold
    FROM "unit_commitments"
   WHERE "tenant_id"=p_tenant_id AND "id"=p_hold_id
   FOR UPDATE;
  IF NOT FOUND OR v_hold."commitment_type" <> 'HOLD' OR v_hold."status" <> 'ACTIVE' OR
     v_hold."expires_at" <= v_now OR v_hold."version" <> p_expected_hold_version OR
     v_hold."unit_id" <> v_version."unit_id" OR v_hold."branch_id" <> v_version."branch_id" OR
     v_hold."party_id" IS DISTINCT FROM v_version."subject_party_id" OR
     v_hold."customer_account_id" IS DISTINCT FROM v_version."customer_account_id" OR
     v_hold."opportunity_id" IS DISTINCT FROM v_version."opportunity_id" THEN
    RAISE EXCEPTION 'EXEC-007 active hold does not match the exact offer subject and scope' USING ERRCODE='55000';
  END IF;

  INSERT INTO "exec007_acceptance_intents" (
    "id","tenant_id","offer_version_id","customer_session_id","principal_id","subject_party_id","customer_account_id",
    "action","state","nonce_hash","content_hash","pricing_hash","terms_hash","expires_at"
  ) VALUES (
    v_intent_id,p_tenant_id,v_version."id",p_session_id,p_principal_id,v_version."subject_party_id",v_version."customer_account_id",
    'ACCEPT','PENDING',p_idempotency_key_hash,v_version."content_hash",v_version."pricing_hash",v_version."terms_hash",
    LEAST(v_version."valid_until_utc",v_challenge."expires_at")
  );

  INSERT INTO "exec007_acceptance_evidence" (
    "id","tenant_id","acceptance_intent_id","offer_version_id","principal_id","subject_party_id","customer_account_id",
    "content_hash","pricing_hash","terms_hash","evidence_hash","network_hmac","hmac_key_version",
    "confirmation_text_version","canonicalization_version","assurance_level","server_confirmed_at"
  ) VALUES (
    v_evidence_id,p_tenant_id,v_intent_id,v_version."id",p_principal_id,v_version."subject_party_id",v_version."customer_account_id",
    v_version."content_hash",v_version."pricing_hash",v_version."terms_hash",p_evidence_hash,NULL,'EXEC007-NET-1',
    v_version."confirmation_text_version",v_version."canonicalization_version",v_session."assurance_level",v_now
  );

  v_reservation_id := "exec006_convert_hold_to_reservation"(
    p_tenant_id,p_hold_id,p_actor_user_id,p_assignment_id,p_expected_hold_version,p_reservation_expires_at,
    v_evidence_id::TEXT,'EXEC-007 conditional acceptance',p_correlation_id,p_idempotency_key_hash,p_payload_hash,v_now
  );

  IF NOT EXISTS (
    SELECT 1 FROM "unit_commitments" r
     WHERE r."tenant_id"=p_tenant_id AND r."id"=v_reservation_id
       AND r."commitment_type"='RESERVATION' AND r."status"='ACTIVE'
       AND r."converted_from_commitment_id"=p_hold_id
       AND r."unit_id"=v_version."unit_id" AND r."branch_id"=v_version."branch_id"
       AND r."party_id" IS NOT DISTINCT FROM v_version."subject_party_id"
       AND r."customer_account_id" IS NOT DISTINCT FROM v_version."customer_account_id"
       AND r."opportunity_id" IS NOT DISTINCT FROM v_version."opportunity_id"
  ) THEN
    RAISE EXCEPTION 'EXEC-007 reservation conversion did not produce the exact ACTIVE RESERVATION' USING ERRCODE='55000';
  END IF;

  INSERT INTO "exec007_acceptance_completion_attempts" (
    "id","tenant_id","offer_version_id","acceptance_evidence_id","subject_party_id","customer_account_id","hold_id",
    "reservation_id","state","expected_offer_version","expected_hold_version","idempotency_key_hash","completed_at"
  ) VALUES (
    v_completion_id,p_tenant_id,v_version."id",v_evidence_id,v_version."subject_party_id",v_version."customer_account_id",p_hold_id,
    v_reservation_id,'COMPLETED',v_version."row_version",p_expected_hold_version,p_idempotency_key_hash,v_now
  );

  v_request_type := CASE WHEN v_version."offer_kind"='SALE'
    THEN 'SALE_CONTRACT_PREPARATION_REQUEST'::"Exec007PreparationRequestType"
    ELSE 'LEASE_PREPARATION_REQUEST'::"Exec007PreparationRequestType" END;
  INSERT INTO "exec007_preparation_requests" (
    "id","tenant_id","completion_attempt_id","reservation_id","offer_id","offer_version_id","offer_kind","request_type",
    "state","subject_party_id","customer_account_id"
  ) VALUES (
    v_preparation_id,p_tenant_id,v_completion_id,v_reservation_id,v_offer."id",v_version."id",v_version."offer_kind",v_request_type,
    'REQUESTED',v_version."subject_party_id",v_version."customer_account_id"
  );

  UPDATE "exec007_acceptance_intents"
     SET "state"='CONFIRMED',"confirmed_at"=v_now
   WHERE "tenant_id"=p_tenant_id AND "id"=v_intent_id AND "state"='PENDING';
  UPDATE "exec007_customer_auth_challenges"
     SET "status"='CONSUMED',"consumed_at"=v_now
   WHERE "tenant_id"=p_tenant_id AND "id"=p_challenge_id AND "status"='PENDING' AND "consumed_at" IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'EXEC-007 challenge consumption race detected' USING ERRCODE='40001'; END IF;
  UPDATE "exec007_offer_versions"
     SET "state"='CONDITIONALLY_ACCEPTED',"is_current"=FALSE,"row_version"="row_version"+1,"updated_at"=v_now
   WHERE "tenant_id"=p_tenant_id AND "id"=v_version."id" AND "state"='ISSUED' AND "row_version"=v_version."row_version";
  IF NOT FOUND THEN RAISE EXCEPTION 'EXEC-007 OfferVersion acceptance race detected' USING ERRCODE='40001'; END IF;
  UPDATE "exec007_commercial_offers"
     SET "state"='PREPARATION_REQUESTED',"version"="version"+1,"updated_at"=v_now
   WHERE "tenant_id"=p_tenant_id AND "id"=v_offer."id" AND "state"='OPEN' AND "version"=v_offer."version";
  IF NOT FOUND THEN RAISE EXCEPTION 'EXEC-007 commercial offer acceptance race detected' USING ERRCODE='40001'; END IF;

  INSERT INTO "exec007_offer_version_state_history" ("tenant_id","offer_version_id","from_state","to_state","actor_user_id","reason","correlation_id","occurred_at")
  VALUES (p_tenant_id,v_version."id",'ISSUED','CONDITIONALLY_ACCEPTED',p_actor_user_id,'Customer conditional acceptance',p_correlation_id,v_now);
  INSERT INTO "exec007_offer_state_history" ("tenant_id","offer_id","from_state","to_state","actor_user_id","reason","correlation_id","occurred_at")
  VALUES (p_tenant_id,v_offer."id",'OPEN','PREPARATION_REQUESTED',p_actor_user_id,'Customer conditional acceptance completed',p_correlation_id,v_now);

  INSERT INTO "exec007_idempotency_records" (
    "tenant_id","operation","idempotency_key_hash","payload_hash","result_type","result_id"
  ) VALUES (p_tenant_id,'CONDITIONAL_ACCEPTANCE',p_idempotency_key_hash,p_payload_hash,'ACCEPTANCE_COMPLETION',v_completion_id);

  RETURN QUERY SELECT v_intent_id,v_evidence_id,v_completion_id,v_reservation_id,v_preparation_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON CONSTRAINT "fk_exec007_subject_grants_tenant_actor_party" ON "exec007_customer_principal_subject_grants" IS 'Physical correction: canonical EXEC-005 table customer_parties.';
COMMENT ON CONSTRAINT "fk_exec007_subject_grants_tenant_customer_account" ON "exec007_customer_principal_subject_grants" IS 'Physical correction: canonical EXEC-005 table customer_accounts_v2.';
COMMENT ON CONSTRAINT "fk_exec007_offers_tenant_opportunity" ON "exec007_commercial_offers" IS 'Physical correction: canonical EXEC-005 table customer_opportunities_v2.';
COMMENT ON CONSTRAINT "fk_exec007_completion_reservation" ON "exec007_acceptance_completion_attempts" IS 'Physical correction: EXEC-006 reservation is a unit_commitments row with commitment_type=RESERVATION; trigger enforces type/status.';

-- EXEC-007 Batch 3: split-custody database authorization, exact challenge binding,
-- and purpose-bound Raw-IP access. Additive migration; no data backfill.

DO $exec007_roles$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='orca_exec007_owner') THEN
    CREATE ROLE orca_exec007_owner NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='orca_exec007_key_owner') THEN
    CREATE ROLE orca_exec007_key_owner NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='orca_migration') THEN
    CREATE ROLE orca_migration LOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='orca_runtime') THEN
    CREATE ROLE orca_runtime LOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='orca_support_readonly') THEN
    CREATE ROLE orca_support_readonly NOLOGIN NOINHERIT;
  END IF;
END
$exec007_roles$;

ALTER ROLE orca_exec007_owner NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
ALTER ROLE orca_exec007_key_owner NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
ALTER ROLE orca_migration LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
ALTER ROLE orca_runtime LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
ALTER ROLE orca_support_readonly NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;

REVOKE orca_exec007_key_owner FROM orca_exec007_owner, orca_migration, orca_runtime, orca_support_readonly;
REVOKE orca_exec007_owner FROM orca_runtime, orca_support_readonly;

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

CREATE SCHEMA IF NOT EXISTS orca_exec007_secure AUTHORIZATION orca_exec007_key_owner;
REVOKE ALL ON SCHEMA orca_exec007_secure FROM PUBLIC, orca_migration, orca_runtime, orca_support_readonly;

CREATE TABLE orca_exec007_secure.exec007_db_authorization_keys (
  key_version TEXT PRIMARY KEY,
  secret_bytes BYTEA NOT NULL,
  status TEXT NOT NULL,
  active_slot SMALLINT,
  grace_slot SMALLINT,
  activated_at TIMESTAMPTZ,
  grace_until TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  retired_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT transaction_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT transaction_timestamp(),
  CONSTRAINT ck_exec007_db_auth_key_version CHECK (key_version ~ '^DB-AUTH-K[1-9][0-9]*$'),
  CONSTRAINT ck_exec007_db_auth_key_secret_32 CHECK (octet_length(secret_bytes)=32),
  CONSTRAINT ck_exec007_db_auth_key_status CHECK (status IN ('ACTIVE','GRACE','REVOKED','RETIRED')),
  CONSTRAINT ck_exec007_db_auth_key_active_slot_shape CHECK (
    (status='ACTIVE' AND active_slot=1 AND grace_slot IS NULL) OR
    (status<>'ACTIVE' AND active_slot IS NULL)
  ),
  CONSTRAINT ck_exec007_db_auth_key_grace_slot_shape CHECK (
    (status='GRACE' AND grace_slot IN (1,2)) OR
    (status<>'GRACE' AND grace_slot IS NULL)
  ),
  CONSTRAINT ck_exec007_db_auth_key_timestamp_shape CHECK (
    created_at <= updated_at AND
    ((status='ACTIVE' AND activated_at IS NOT NULL AND grace_until IS NULL AND revoked_at IS NULL AND retired_at IS NULL) OR
     (status='GRACE' AND activated_at IS NOT NULL AND grace_until IS NOT NULL AND grace_until>activated_at AND revoked_at IS NULL AND retired_at IS NULL) OR
     (status='REVOKED' AND revoked_at IS NOT NULL AND retired_at IS NULL) OR
     (status='RETIRED' AND retired_at IS NOT NULL AND revoked_at IS NULL))
  )
);
ALTER TABLE orca_exec007_secure.exec007_db_authorization_keys OWNER TO orca_exec007_key_owner;
CREATE UNIQUE INDEX ux_exec007_db_auth_one_active
  ON orca_exec007_secure.exec007_db_authorization_keys(active_slot) WHERE status='ACTIVE';
CREATE UNIQUE INDEX ux_exec007_db_auth_grace_slot
  ON orca_exec007_secure.exec007_db_authorization_keys(grace_slot) WHERE status='GRACE';

CREATE OR REPLACE FUNCTION public.fn_exec007_constant_time_equal_32(p_left BYTEA,p_right BYTEA)
RETURNS BOOLEAN
LANGUAGE plpgsql IMMUTABLE STRICT
SET search_path=pg_catalog
AS $fn$
DECLARE v_diff INTEGER:=0; v_index INTEGER;
BEGIN
  IF octet_length(p_left)<>32 OR octet_length(p_right)<>32 THEN RETURN FALSE; END IF;
  FOR v_index IN 0..31 LOOP
    v_diff := v_diff | (get_byte(p_left,v_index) # get_byte(p_right,v_index));
  END LOOP;
  RETURN v_diff=0;
END
$fn$;

CREATE OR REPLACE FUNCTION orca_exec007_secure.fn_exec007_verify_hmac(
  p_key_version TEXT,p_envelope TEXT,p_signature TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,orca_exec007_secure
AS $fn$
DECLARE v_key BYTEA; v_status TEXT; v_grace_until TIMESTAMPTZ; v_actual BYTEA; v_active_count INTEGER;
BEGIN
  IF to_regprocedure('public.hmac(bytea,bytea,text)') IS NULL THEN
    RAISE EXCEPTION 'EXEC007_HMAC_UNAVAILABLE' USING ERRCODE='0A000';
  END IF;
  IF p_key_version !~ '^DB-AUTH-K[1-9][0-9]*$' OR p_signature !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'EXEC007_DB_AUTH_INVALID' USING ERRCODE='28000';
  END IF;
  SELECT count(*) INTO v_active_count FROM orca_exec007_secure.exec007_db_authorization_keys WHERE status='ACTIVE';
  IF v_active_count<>1 THEN RAISE EXCEPTION 'EXEC007_DB_AUTH_ACTIVE_CARDINALITY' USING ERRCODE='55000'; END IF;
  SELECT secret_bytes,status,grace_until INTO v_key,v_status,v_grace_until
  FROM orca_exec007_secure.exec007_db_authorization_keys WHERE key_version=p_key_version;
  IF NOT FOUND OR v_status IN ('REVOKED','RETIRED') OR
     (v_status='GRACE' AND v_grace_until<=transaction_timestamp()) OR
     v_status NOT IN ('ACTIVE','GRACE') THEN
    RAISE EXCEPTION 'EXEC007_DB_AUTH_KEY_REJECTED' USING ERRCODE='28000';
  END IF;
  EXECUTE 'SELECT public.hmac(convert_to($1,''UTF8''),$2,''sha256'')' INTO v_actual USING p_envelope,v_key;
  RETURN public.fn_exec007_constant_time_equal_32(v_actual,decode(p_signature,'hex'));
END
$fn$;

CREATE OR REPLACE FUNCTION orca_exec007_secure.fn_exec007_bootstrap_db_authorization_key(
  p_key_version TEXT,p_secret_bytes BYTEA
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,orca_exec007_secure
AS $fn$
DECLARE v_total INTEGER; v_active INTEGER;
BEGIN
  PERFORM pg_advisory_xact_lock(7420070301);
  SELECT count(*),count(*) FILTER (WHERE status='ACTIVE') INTO v_total,v_active
  FROM orca_exec007_secure.exec007_db_authorization_keys;
  IF v_total<>0 OR v_active<>0 THEN RAISE EXCEPTION 'EXEC007_DB_AUTH_BOOTSTRAP_REQUIRES_EMPTY_STORE' USING ERRCODE='55000'; END IF;
  INSERT INTO orca_exec007_secure.exec007_db_authorization_keys
    (key_version,secret_bytes,status,active_slot,activated_at)
  VALUES (p_key_version,p_secret_bytes,'ACTIVE',1,transaction_timestamp());
  SELECT count(*) FILTER (WHERE status='ACTIVE'),count(*) FILTER (WHERE status='GRACE')
    INTO v_active,v_total FROM orca_exec007_secure.exec007_db_authorization_keys;
  IF v_active<>1 OR v_total<>0 THEN RAISE EXCEPTION 'EXEC007_DB_AUTH_BOOTSTRAP_POSTCONDITION' USING ERRCODE='55000'; END IF;
END
$fn$;

CREATE OR REPLACE FUNCTION orca_exec007_secure.fn_exec007_retire_expired_db_authorization_keys()
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,orca_exec007_secure
AS $fn$
DECLARE v_count INTEGER; v_now TIMESTAMPTZ;
BEGIN
  PERFORM pg_advisory_xact_lock(7420070301);
  v_now := clock_timestamp();
  UPDATE orca_exec007_secure.exec007_db_authorization_keys
     SET status='RETIRED',grace_slot=NULL,retired_at=v_now,updated_at=v_now
   WHERE status='GRACE' AND grace_until<=v_now;
  GET DIAGNOSTICS v_count=ROW_COUNT;
  RETURN v_count;
END
$fn$;

CREATE OR REPLACE FUNCTION orca_exec007_secure.fn_exec007_rotate_db_authorization_key(
  p_key_version TEXT,p_secret_bytes BYTEA
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,orca_exec007_secure
AS $fn$
DECLARE v_active_key TEXT; v_active_count INTEGER; v_grace_count INTEGER; v_slot SMALLINT; v_now TIMESTAMPTZ;
BEGIN
  PERFORM pg_advisory_xact_lock(7420070301);
  v_now := clock_timestamp();
  UPDATE orca_exec007_secure.exec007_db_authorization_keys
     SET status='RETIRED',grace_slot=NULL,retired_at=v_now,updated_at=v_now
   WHERE status='GRACE' AND grace_until<=v_now;
  SELECT count(*) INTO v_active_count FROM orca_exec007_secure.exec007_db_authorization_keys WHERE status='ACTIVE';
  IF v_active_count<>1 THEN RAISE EXCEPTION 'EXEC007_DB_AUTH_ROTATION_REQUIRES_ONE_ACTIVE' USING ERRCODE='55000'; END IF;
  IF EXISTS (SELECT 1 FROM orca_exec007_secure.exec007_db_authorization_keys WHERE key_version=p_key_version) THEN
    RAISE EXCEPTION 'EXEC007_DB_AUTH_KEY_VERSION_REUSE' USING ERRCODE='23505';
  END IF;
  SELECT slot INTO v_slot FROM (VALUES (1::smallint),(2::smallint)) AS slots(slot)
   WHERE NOT EXISTS (SELECT 1 FROM orca_exec007_secure.exec007_db_authorization_keys k WHERE k.status='GRACE' AND k.grace_slot=slot)
   ORDER BY slot LIMIT 1;
  IF v_slot IS NULL THEN RAISE EXCEPTION 'EXEC007_DB_AUTH_NO_GRACE_SLOT' USING ERRCODE='55000'; END IF;
  SELECT key_version INTO v_active_key FROM orca_exec007_secure.exec007_db_authorization_keys WHERE status='ACTIVE' FOR UPDATE;
  UPDATE orca_exec007_secure.exec007_db_authorization_keys
     SET status='GRACE',active_slot=NULL,grace_slot=v_slot,grace_until=v_now+interval '24 hours',updated_at=v_now
   WHERE key_version=v_active_key;
  INSERT INTO orca_exec007_secure.exec007_db_authorization_keys
    (key_version,secret_bytes,status,active_slot,activated_at,created_at,updated_at)
  VALUES (p_key_version,p_secret_bytes,'ACTIVE',1,v_now,v_now,v_now);
  SELECT count(*) FILTER (WHERE status='ACTIVE'),count(*) FILTER (WHERE status='GRACE')
    INTO v_active_count,v_grace_count FROM orca_exec007_secure.exec007_db_authorization_keys;
  IF v_active_count<>1 OR v_grace_count>2 THEN RAISE EXCEPTION 'EXEC007_DB_AUTH_ROTATION_POSTCONDITION' USING ERRCODE='55000'; END IF;
END
$fn$;

CREATE OR REPLACE FUNCTION orca_exec007_secure.fn_exec007_revoke_db_authorization_key(
  p_key_version TEXT,p_emergency_fail_closed BOOLEAN
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,orca_exec007_secure
AS $fn$
DECLARE v_status TEXT; v_now TIMESTAMPTZ;
BEGIN
  PERFORM pg_advisory_xact_lock(7420070301);
  v_now := clock_timestamp();
  SELECT status INTO v_status FROM orca_exec007_secure.exec007_db_authorization_keys WHERE key_version=p_key_version FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'EXEC007_DB_AUTH_KEY_UNKNOWN' USING ERRCODE='28000'; END IF;
  IF v_status='ACTIVE' AND NOT coalesce(p_emergency_fail_closed,FALSE) THEN
    RAISE EXCEPTION 'EXEC007_DB_AUTH_ACTIVE_REVOKE_REQUIRES_EMERGENCY' USING ERRCODE='55000';
  END IF;
  IF v_status IN ('REVOKED','RETIRED') THEN RETURN; END IF;
  UPDATE orca_exec007_secure.exec007_db_authorization_keys
     SET status='REVOKED',active_slot=NULL,grace_slot=NULL,grace_until=NULL,revoked_at=v_now,updated_at=v_now
   WHERE key_version=p_key_version;
END
$fn$;

ALTER FUNCTION orca_exec007_secure.fn_exec007_verify_hmac(TEXT,TEXT,TEXT) OWNER TO orca_exec007_key_owner;
ALTER FUNCTION orca_exec007_secure.fn_exec007_bootstrap_db_authorization_key(TEXT,BYTEA) OWNER TO orca_exec007_key_owner;
ALTER FUNCTION orca_exec007_secure.fn_exec007_rotate_db_authorization_key(TEXT,BYTEA) OWNER TO orca_exec007_key_owner;
ALTER FUNCTION orca_exec007_secure.fn_exec007_revoke_db_authorization_key(TEXT,BOOLEAN) OWNER TO orca_exec007_key_owner;
ALTER FUNCTION orca_exec007_secure.fn_exec007_retire_expired_db_authorization_keys() OWNER TO orca_exec007_key_owner;

REVOKE ALL ON ALL TABLES IN SCHEMA orca_exec007_secure FROM PUBLIC,orca_migration,orca_runtime,orca_support_readonly,orca_exec007_owner;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA orca_exec007_secure FROM PUBLIC,orca_migration,orca_runtime,orca_support_readonly,orca_exec007_owner;
GRANT USAGE ON SCHEMA orca_exec007_secure TO orca_exec007_owner;
GRANT EXECUTE ON FUNCTION orca_exec007_secure.fn_exec007_verify_hmac(TEXT,TEXT,TEXT) TO orca_exec007_owner;
GRANT EXECUTE ON FUNCTION public.fn_exec007_constant_time_equal_32(BYTEA,BYTEA) TO orca_exec007_key_owner;

ALTER TABLE public.exec007_customer_security_events
  ADD COLUMN branch_id UUID,
  ADD COLUMN service_line public."Exec007ServiceLine",
  ADD COLUMN offer_version_id UUID;

DO $security_event_preflight$
DECLARE v_row_count BIGINT; v_principal_null BIGINT; v_branch_null BIGINT; v_service_null BIGINT; v_offer_violation BIGINT;
BEGIN
  SELECT count(*),count(*) FILTER (WHERE principal_id IS NULL),count(*) FILTER (WHERE branch_id IS NULL),
         count(*) FILTER (WHERE service_line IS NULL),
         count(*) FILTER (WHERE offer_version_id IS NOT NULL)
  INTO v_row_count,v_principal_null,v_branch_null,v_service_null,v_offer_violation
  FROM public.exec007_customer_security_events;
  IF v_row_count<>0 OR v_principal_null<>0 OR v_branch_null<>0 OR v_service_null<>0 OR v_offer_violation<>0 THEN
    RAISE EXCEPTION 'EXEC007_SECURITY_EVENT_EXISTING_DATA_REQUIRES_SEPARATE_AUTHORITY' USING ERRCODE='55000';
  END IF;
END
$security_event_preflight$;

ALTER TABLE public.exec007_customer_security_events ALTER COLUMN principal_id SET NOT NULL;
ALTER TABLE public.exec007_customer_security_events DROP CONSTRAINT ck_exec007_security_event_ip_purpose;
ALTER TABLE public.exec007_customer_security_events
  ADD CONSTRAINT fk_exec007_security_event_branch FOREIGN KEY(tenant_id,branch_id)
    REFERENCES public.organization_branches(tenant_id,id) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT fk_exec007_security_event_offer_version FOREIGN KEY(tenant_id,offer_version_id)
    REFERENCES public.exec007_offer_versions(tenant_id,id) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT ck_exec007_security_event_type CHECK(event_type IN (
    'AUTHENTICATION_FAILURE','AUTHENTICATION_LOCKOUT','ACCOUNT_TAKEOVER_SIGNAL',
    'ACCEPTANCE_CHALLENGE_FAILURE','ACCEPTANCE_REPLAY_DETECTED')),
  ADD CONSTRAINT ck_exec007_security_event_purpose_pair CHECK(
    (event_type IN ('AUTHENTICATION_FAILURE','AUTHENTICATION_LOCKOUT') AND purpose_code='AUTH_ABUSE_INVESTIGATION') OR
    (event_type='ACCOUNT_TAKEOVER_SIGNAL' AND purpose_code='SUSPECTED_ACCOUNT_TAKEOVER') OR
    (event_type IN ('ACCEPTANCE_CHALLENGE_FAILURE','ACCEPTANCE_REPLAY_DETECTED') AND purpose_code='ACCEPTANCE_REPLAY_INVESTIGATION')),
  ADD CONSTRAINT ck_exec007_security_event_scope_shape CHECK(
    ((event_type IN ('AUTHENTICATION_FAILURE','AUTHENTICATION_LOCKOUT','ACCOUNT_TAKEOVER_SIGNAL')) AND
      offer_version_id IS NULL AND ((branch_id IS NULL AND service_line IS NULL) OR (branch_id IS NOT NULL AND service_line IS NOT NULL))) OR
    ((event_type IN ('ACCEPTANCE_CHALLENGE_FAILURE','ACCEPTANCE_REPLAY_DETECTED')) AND
      branch_id IS NOT NULL AND service_line IS NOT NULL AND offer_version_id IS NOT NULL));
CREATE INDEX idx_exec007_security_events_authority_lookup
  ON public.exec007_customer_security_events(tenant_id,id,principal_id,branch_id,service_line);
CREATE INDEX idx_exec007_security_events_offer_version
  ON public.exec007_customer_security_events(tenant_id,offer_version_id) WHERE offer_version_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.fn_exec007_validate_security_event_authority_fields()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path=pg_catalog,public AS $fn$
BEGIN
  IF NEW.branch_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.branch_services bs
    WHERE bs.tenant_id=NEW.tenant_id AND bs.branch_id=NEW.branch_id
      AND bs.service_line=NEW.service_line::text AND bs.enabled=TRUE
  ) THEN
    RAISE EXCEPTION 'EXEC007_SECURITY_EVENT_BRANCH_SERVICE_DISABLED' USING ERRCODE='42501';
  END IF;
  RETURN NEW;
END
$fn$;
CREATE TRIGGER trg_exec007_security_event_authority_validate
BEFORE INSERT OR UPDATE ON public.exec007_customer_security_events
FOR EACH ROW EXECUTE FUNCTION public.fn_exec007_validate_security_event_authority_fields();

CREATE OR REPLACE FUNCTION public.fn_exec007_guard_security_event_authority_immutable()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path=pg_catalog AS $fn$
BEGIN
  IF (NEW.tenant_id,NEW.principal_id,NEW.branch_id,NEW.service_line,NEW.offer_version_id,NEW.event_type,NEW.purpose_code)
     IS DISTINCT FROM
     (OLD.tenant_id,OLD.principal_id,OLD.branch_id,OLD.service_line,OLD.offer_version_id,OLD.event_type,OLD.purpose_code) THEN
    RAISE EXCEPTION 'EXEC007_SECURITY_EVENT_AUTHORITY_IMMUTABLE' USING ERRCODE='55000';
  END IF;
  RETURN NEW;
END
$fn$;
CREATE TRIGGER trg_exec007_security_event_authority_immutable
BEFORE UPDATE ON public.exec007_customer_security_events
FOR EACH ROW EXECUTE FUNCTION public.fn_exec007_guard_security_event_authority_immutable();

ALTER TABLE public.exec007_customer_principal_subject_grants
  ADD CONSTRAINT uq_exec007_subject_grants_binding UNIQUE(tenant_id,id,principal_id,subject_party_id);
ALTER TABLE public.exec007_customer_sessions
  ADD CONSTRAINT uq_exec007_sessions_binding UNIQUE(tenant_id,id,principal_id,subject_grant_id);
ALTER TABLE public.exec007_offer_versions
  ADD CONSTRAINT uq_exec007_offer_versions_binding UNIQUE(tenant_id,id,subject_party_id);

ALTER TABLE public.exec007_customer_auth_challenges
  ADD COLUMN session_id UUID,
  ADD COLUMN subject_grant_id UUID,
  ADD COLUMN subject_party_id UUID,
  ADD COLUMN customer_account_id UUID,
  ADD COLUMN offer_version_id UUID,
  ADD COLUMN payload_proof_hash TEXT,
  ADD CONSTRAINT ck_exec007_challenge_payload_proof_hash CHECK(payload_proof_hash IS NULL OR payload_proof_hash ~ '^[0-9a-f]{64}$'),
  ADD CONSTRAINT ck_exec007_challenge_binding_shape CHECK(
    (action IS NULL AND session_id IS NULL AND subject_grant_id IS NULL AND subject_party_id IS NULL AND
      customer_account_id IS NULL AND offer_version_id IS NULL AND payload_proof_hash IS NULL) OR
    (action IS NOT NULL AND principal_id IS NOT NULL AND session_id IS NOT NULL AND subject_grant_id IS NOT NULL AND
      subject_party_id IS NOT NULL AND offer_version_id IS NOT NULL AND payload_proof_hash IS NOT NULL)),
  ADD CONSTRAINT fk_exec007_challenge_session_binding FOREIGN KEY(tenant_id,session_id,principal_id,subject_grant_id)
    REFERENCES public.exec007_customer_sessions(tenant_id,id,principal_id,subject_grant_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT fk_exec007_challenge_grant_binding FOREIGN KEY(tenant_id,subject_grant_id,principal_id,subject_party_id)
    REFERENCES public.exec007_customer_principal_subject_grants(tenant_id,id,principal_id,subject_party_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT fk_exec007_challenge_offer_version_binding FOREIGN KEY(tenant_id,offer_version_id,subject_party_id)
    REFERENCES public.exec007_offer_versions(tenant_id,id,subject_party_id) ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION public.fn_exec007_validate_challenge_binding()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path=pg_catalog,public AS $fn$
DECLARE v_grant_account UUID; v_version_account UUID;
BEGIN
  IF NEW.action IS NULL THEN RETURN NEW; END IF;
  SELECT customer_account_id INTO v_grant_account FROM public.exec007_customer_principal_subject_grants
    WHERE tenant_id=NEW.tenant_id AND id=NEW.subject_grant_id;
  SELECT customer_account_id INTO v_version_account FROM public.exec007_offer_versions
    WHERE tenant_id=NEW.tenant_id AND id=NEW.offer_version_id;
  IF v_grant_account IS DISTINCT FROM NEW.customer_account_id OR
     v_version_account IS DISTINCT FROM NEW.customer_account_id THEN
    RAISE EXCEPTION 'EXEC007_CHALLENGE_CUSTOMER_ACCOUNT_BINDING_MISMATCH' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END
$fn$;
CREATE TRIGGER trg_exec007_challenge_binding_validate
BEFORE INSERT OR UPDATE ON public.exec007_customer_auth_challenges
FOR EACH ROW EXECUTE FUNCTION public.fn_exec007_validate_challenge_binding();

CREATE OR REPLACE FUNCTION public.fn_exec007_guard_challenge_binding_immutable()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path=pg_catalog AS $fn$
BEGIN
  IF (NEW.tenant_id,NEW.principal_id,NEW.session_id,NEW.subject_grant_id,NEW.subject_party_id,NEW.customer_account_id,
      NEW.offer_version_id,NEW.action,NEW.token_hash,NEW.payload_proof_hash)
     IS DISTINCT FROM
     (OLD.tenant_id,OLD.principal_id,OLD.session_id,OLD.subject_grant_id,OLD.subject_party_id,OLD.customer_account_id,
      OLD.offer_version_id,OLD.action,OLD.token_hash,OLD.payload_proof_hash) THEN
    RAISE EXCEPTION 'EXEC007_CHALLENGE_BINDING_IMMUTABLE' USING ERRCODE='55000';
  END IF;
  RETURN NEW;
END
$fn$;
CREATE TRIGGER trg_exec007_challenge_binding_immutable
BEFORE UPDATE ON public.exec007_customer_auth_challenges
FOR EACH ROW EXECUTE FUNCTION public.fn_exec007_guard_challenge_binding_immutable();

CREATE OR REPLACE FUNCTION public.fn_exec007_guard_security_event_read_audit_append_only()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path=pg_catalog AS $fn$
BEGIN
  RAISE EXCEPTION 'EXEC007_SECURITY_EVENT_READ_AUDIT_APPEND_ONLY' USING ERRCODE='55000';
END
$fn$;
CREATE TRIGGER trg_exec007_security_event_read_audit_append_only
BEFORE UPDATE OR DELETE ON public.exec007_security_event_reads
FOR EACH ROW EXECUTE FUNCTION public.fn_exec007_guard_security_event_read_audit_append_only();

CREATE TABLE public.exec007_db_authorization_nonces (
  tenant_id UUID NOT NULL,
  nonce_hash TEXT NOT NULL,
  actor_user_id UUID NOT NULL,
  assignment_id UUID NOT NULL,
  permission_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT transaction_timestamp(),
  CONSTRAINT pk_exec007_db_authorization_nonces PRIMARY KEY(tenant_id,nonce_hash),
  CONSTRAINT uq_exec007_db_authorization_nonces UNIQUE(tenant_id,nonce_hash),
  CONSTRAINT ck_exec007_db_authorization_nonce_hash CHECK(nonce_hash ~ '^[0-9a-f]{64}$'),
  CONSTRAINT ck_exec007_db_authorization_nonce_permission CHECK(permission_key='security.customer_event_raw_ip.read'),
  CONSTRAINT fk_exec007_db_authorization_nonce_actor FOREIGN KEY(tenant_id,actor_user_id)
    REFERENCES public.users(tenant_id,id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_exec007_db_authorization_nonce_assignment FOREIGN KEY(tenant_id,assignment_id)
    REFERENCES public.user_scope_assignments(tenant_id,id) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TYPE public.exec007_db_authorization_context AS (
  version TEXT,key_version TEXT,tenant_id UUID,actor_user_id UUID,assignment_id UUID,
  permission_key TEXT,scope_type TEXT,branch_id UUID,service_line public."Exec007ServiceLine",
  security_event_id UUID,purpose_code public."Exec007SecurityPurposeCode",correlation_id TEXT,
  issued_at TIMESTAMPTZ,expires_at TIMESTAMPTZ,nonce TEXT
);

CREATE OR REPLACE FUNCTION public.fn_exec007_get_security_event_authority_metadata(
  p_tenant_id UUID,p_security_event_id UUID
) RETURNS TABLE(
  security_event_id UUID,tenant_id UUID,principal_id UUID,branch_id UUID,
  service_line public."Exec007ServiceLine",offer_version_id UUID,event_type TEXT,occurred_at TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public
AS $fn$
BEGIN
  RETURN QUERY SELECT e.id,e.tenant_id,e.principal_id,e.branch_id,e.service_line,e.offer_version_id,e.event_type,e.recorded_at
  FROM public.exec007_customer_security_events e
  WHERE e.tenant_id=p_tenant_id AND e.id=p_security_event_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'EXEC007_SECURITY_EVENT_NOT_FOUND' USING ERRCODE='P0002'; END IF;
END
$fn$;

CREATE OR REPLACE FUNCTION public.fn_exec007_verify_db_authorization_context()
RETURNS public.exec007_db_authorization_context
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public
AS $fn$
DECLARE
  v_envelope TEXT:=current_setting('orca.db_auth.envelope',true);
  v_signature TEXT:=current_setting('orca.db_auth.signature',true);
  v_key_guc TEXT:=current_setting('orca.db_auth.key_version',true);
  v_lines TEXT[]; v_names TEXT[]:=ARRAY['version','key_version','tenant_id','actor_user_id','assignment_id','permission_key','scope_type','branch_id','service_line','security_event_id','purpose_code','correlation_id','issued_at','expires_at','nonce'];
  v_values TEXT[]:=ARRAY[]::TEXT[]; v_index INTEGER; v_line TEXT; v_value TEXT;
  v_context public.exec007_db_authorization_context; v_now TIMESTAMPTZ:=transaction_timestamp();
BEGIN
  IF v_envelope IS NULL OR v_envelope='' OR v_signature IS NULL OR v_signature='' OR v_key_guc IS NULL OR v_key_guc='' THEN
    RAISE EXCEPTION 'EXEC007_DB_AUTH_CONTEXT_MISSING' USING ERRCODE='28000';
  END IF;
  IF octet_length(v_envelope)>2048 OR octet_length(v_signature)>2048 OR octet_length(v_key_guc)>2048 THEN
    RAISE EXCEPTION 'EXEC007_DB_AUTH_CONTEXT_TOO_LONG' USING ERRCODE='22001';
  END IF;
  IF position(E'\r' in v_envelope)>0 OR right(v_envelope,1)=E'\n' OR
     length(v_envelope)-length(replace(v_envelope,E'\n',''))<>14 THEN
    RAISE EXCEPTION 'EXEC007_DB_AUTH_CANONICAL_SHAPE' USING ERRCODE='22023';
  END IF;
  v_lines:=string_to_array(v_envelope,E'\n');
  IF array_length(v_lines,1)<>15 THEN RAISE EXCEPTION 'EXEC007_DB_AUTH_FIELD_COUNT' USING ERRCODE='22023'; END IF;
  FOR v_index IN 1..15 LOOP
    v_line:=v_lines[v_index];
    IF v_line !~ ('^'||v_names[v_index]||'=') THEN RAISE EXCEPTION 'EXEC007_DB_AUTH_FIELD_ORDER' USING ERRCODE='22023'; END IF;
    v_value:=substr(v_line,length(v_names[v_index])+2);
    IF position('=' in v_value)>0 THEN RAISE EXCEPTION 'EXEC007_DB_AUTH_FIELD_SYNTAX' USING ERRCODE='22023'; END IF;
    v_values:=array_append(v_values,v_value);
  END LOOP;
  IF v_values[12] IS NULL OR v_values[12]='' THEN
    RAISE EXCEPTION 'EXEC007_DB_AUTH_CORRELATION_REQUIRED' USING ERRCODE='22004';
  END IF;
  IF v_values[1]<>'ORCA-DB-AUTH-1' OR v_values[2]!~'^DB-AUTH-K[1-9][0-9]*$' OR v_values[2]<>v_key_guc OR
     v_values[6]!~'^[a-z0-9_.-]+$' OR v_values[7] NOT IN ('COMPANY','BRANCH') OR
     v_values[11] NOT IN ('AUTH_ABUSE_INVESTIGATION','ACCEPTANCE_REPLAY_INVESTIGATION','SUSPECTED_ACCOUNT_TAKEOVER','SECURITY_INCIDENT_RESPONSE') OR
     v_values[12]='~' OR v_values[15]!~'^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'EXEC007_DB_AUTH_CANONICAL_VALUE' USING ERRCODE='22023';
  END IF;
  IF (v_values[7]='COMPANY' AND ((v_values[8]='~' AND v_values[9]<>'~') OR (v_values[8]<>'~' AND v_values[9]='~'))) OR
     (v_values[7]='BRANCH' AND (v_values[8]='~' OR v_values[9]='~')) THEN
    RAISE EXCEPTION 'EXEC007_DB_AUTH_SCOPE_SHAPE' USING ERRCODE='22023';
  END IF;
  IF octet_length(v_values[1])>32 OR octet_length(v_values[2])>32 OR octet_length(v_values[6])>96 OR
     octet_length(v_values[7])>32 OR octet_length(v_values[9])>32 OR octet_length(v_values[11])>64 OR
     octet_length(v_values[12])>147 THEN
    RAISE EXCEPTION 'EXEC007_DB_AUTH_FIELD_TOO_LONG' USING ERRCODE='22001';
  END IF;
  IF v_values[3]!~'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' OR
     v_values[4]!~'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' OR
     v_values[5]!~'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' OR
     (v_values[8]<>'~' AND v_values[8]!~'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') OR
     v_values[10]!~'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RAISE EXCEPTION 'EXEC007_DB_AUTH_UUID_FORMAT' USING ERRCODE='22023';
  END IF;
  IF v_values[13]!~'^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$' OR
     v_values[14]!~'^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$' THEN
    RAISE EXCEPTION 'EXEC007_DB_AUTH_TIMESTAMP_FORMAT' USING ERRCODE='22023';
  END IF;
  IF normalize(v_values[12],NFC)<>v_values[12] THEN RAISE EXCEPTION 'EXEC007_DB_AUTH_NON_NFC' USING ERRCODE='22023'; END IF;
  IF NOT orca_exec007_secure.fn_exec007_verify_hmac(v_values[2],v_envelope,v_signature) THEN
    RAISE EXCEPTION 'EXEC007_DB_AUTH_SIGNATURE_INVALID' USING ERRCODE='28000';
  END IF;
  v_context.version:=v_values[1]; v_context.key_version:=v_values[2]; v_context.tenant_id:=v_values[3]::uuid;
  v_context.actor_user_id:=v_values[4]::uuid; v_context.assignment_id:=v_values[5]::uuid; v_context.permission_key:=v_values[6];
  v_context.scope_type:=v_values[7]; v_context.branch_id:=CASE WHEN v_values[8]='~' THEN NULL ELSE v_values[8]::uuid END;
  v_context.service_line:=CASE WHEN v_values[9]='~' THEN NULL ELSE v_values[9]::public."Exec007ServiceLine" END;
  v_context.security_event_id:=v_values[10]::uuid; v_context.purpose_code:=v_values[11]::public."Exec007SecurityPurposeCode";
  v_context.correlation_id:=v_values[12]; v_context.issued_at:=v_values[13]::timestamptz; v_context.expires_at:=v_values[14]::timestamptz; v_context.nonce:=v_values[15];
  IF v_context.expires_at<=v_context.issued_at OR v_context.expires_at<=v_now OR
     v_context.expires_at-v_context.issued_at>interval '30 seconds' OR
     v_context.issued_at>v_now+interval '5 seconds' OR v_context.issued_at<v_now-interval '5 seconds' THEN
    RAISE EXCEPTION 'EXEC007_DB_AUTH_TTL_INVALID' USING ERRCODE='28000';
  END IF;
  IF v_context.permission_key<>'security.customer_event_raw_ip.read' THEN
    RAISE EXCEPTION 'EXEC007_DB_AUTH_PERMISSION_MISMATCH' USING ERRCODE='42501';
  END IF;
  IF v_context.purpose_code='SECURITY_INCIDENT_RESPONSE' THEN
    RAISE EXCEPTION 'EXEC007_DB_AUTH_PURPOSE_BLOCKED' USING ERRCODE='42501';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.users u JOIN public.tenants t ON t.id=u.tenant_id
    WHERE u.tenant_id=v_context.tenant_id AND u.id=v_context.actor_user_id AND u.is_active AND t.is_active) THEN
    RAISE EXCEPTION 'EXEC007_DB_AUTH_ACTOR_INVALID' USING ERRCODE='42501';
  END IF;
  IF NOT EXISTS(
    SELECT 1 FROM public.user_scope_assignments a
    JOIN public.exec007_customer_security_events e ON e.tenant_id=a.tenant_id AND e.id=v_context.security_event_id
    WHERE a.tenant_id=v_context.tenant_id AND a.id=v_context.assignment_id AND a.user_id=v_context.actor_user_id
      AND a.security_role='COMPLIANCE_AUDIT' AND a.scope_type=v_context.scope_type
      AND a.scope_type IN ('COMPANY','BRANCH') AND a.is_active
      AND (a.starts_at IS NULL OR a.starts_at<=v_now) AND (a.ends_at IS NULL OR a.ends_at>v_now)
      AND ((a.scope_type='COMPANY' AND v_context.branch_id IS NOT DISTINCT FROM e.branch_id) OR
           (a.scope_type='BRANCH' AND a.branch_id=e.branch_id AND v_context.branch_id=e.branch_id))
      AND v_context.service_line IS NOT DISTINCT FROM e.service_line
      AND v_context.purpose_code=e.purpose_code
      AND (e.branch_id IS NULL OR EXISTS(SELECT 1 FROM public.branch_services bs
        WHERE bs.tenant_id=e.tenant_id AND bs.branch_id=e.branch_id AND bs.service_line=e.service_line::text AND bs.enabled))
  ) THEN RAISE EXCEPTION 'EXEC007_DB_AUTH_AUTHORITY_MISMATCH' USING ERRCODE='42501'; END IF;
  RETURN v_context;
EXCEPTION WHEN invalid_text_representation OR datetime_field_overflow THEN
  RAISE EXCEPTION 'EXEC007_DB_AUTH_CANONICAL_CAST' USING ERRCODE='22023';
END
$fn$;

CREATE OR REPLACE FUNCTION public.fn_exec007_consume_db_authorization_nonce(
  p_context public.exec007_db_authorization_context
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $fn$
BEGIN
  INSERT INTO public.exec007_db_authorization_nonces(tenant_id,nonce_hash,actor_user_id,assignment_id,permission_key)
  VALUES(p_context.tenant_id,encode(public.digest(p_context.nonce,'sha256'),'hex'),p_context.actor_user_id,p_context.assignment_id,p_context.permission_key);
EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION 'EXEC007_DB_AUTH_NONCE_REPLAY' USING ERRCODE='28000';
END
$fn$;

CREATE OR REPLACE FUNCTION public.fn_exec007_guard_security_event_read(p_reason TEXT)
RETURNS INET
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $fn$
DECLARE v_context public.exec007_db_authorization_context; v_ip INET;
BEGIN
  IF p_reason IS NULL OR btrim(p_reason)='' THEN RAISE EXCEPTION 'EXEC007_SECURITY_READ_REASON_REQUIRED' USING ERRCODE='22004'; END IF;
  v_context:=public.fn_exec007_verify_db_authorization_context();
  PERFORM public.fn_exec007_consume_db_authorization_nonce(v_context);
  SELECT e.raw_ip INTO v_ip FROM public.exec007_customer_security_events e
  WHERE e.tenant_id=v_context.tenant_id AND e.id=v_context.security_event_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'EXEC007_SECURITY_EVENT_NOT_FOUND' USING ERRCODE='P0002'; END IF;
  INSERT INTO public.exec007_security_event_reads(tenant_id,security_event_id,reader_user_id,assignment_id,purpose_code,reason,correlation_id)
  VALUES(v_context.tenant_id,v_context.security_event_id,v_context.actor_user_id,v_context.assignment_id,v_context.purpose_code,p_reason,v_context.correlation_id);
  RETURN v_ip;
END
$fn$;

-- Replace the pre-Batch-3 guard signature after all dependent source has moved to the context guard.
DROP FUNCTION public.fn_exec007_guard_security_event_read(UUID,UUID,UUID,UUID,public."Exec007SecurityPurposeCode",TEXT,TEXT);

ALTER FUNCTION public.fn_exec007_constant_time_equal_32(BYTEA,BYTEA) OWNER TO orca_exec007_owner;
ALTER FUNCTION public.fn_exec007_get_security_event_authority_metadata(UUID,UUID) OWNER TO orca_exec007_owner;
ALTER FUNCTION public.fn_exec007_verify_db_authorization_context() OWNER TO orca_exec007_owner;
ALTER FUNCTION public.fn_exec007_consume_db_authorization_nonce(public.exec007_db_authorization_context) OWNER TO orca_exec007_owner;
ALTER FUNCTION public.fn_exec007_guard_security_event_read(TEXT) OWNER TO orca_exec007_owner;
ALTER FUNCTION public.fn_exec007_validate_security_event_authority_fields() OWNER TO orca_exec007_owner;
ALTER FUNCTION public.fn_exec007_guard_security_event_authority_immutable() OWNER TO orca_exec007_owner;
ALTER FUNCTION public.fn_exec007_validate_challenge_binding() OWNER TO orca_exec007_owner;
ALTER FUNCTION public.fn_exec007_guard_challenge_binding_immutable() OWNER TO orca_exec007_owner;
ALTER FUNCTION public.fn_exec007_guard_security_event_read_audit_append_only() OWNER TO orca_exec007_owner;
ALTER TABLE public.exec007_db_authorization_nonces OWNER TO orca_exec007_owner;
ALTER TYPE public.exec007_db_authorization_context OWNER TO orca_exec007_owner;

DO $exec007_ordinary_owners$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT c.oid::regclass AS object_name FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
           WHERE n.nspname='public' AND c.relkind IN ('r','p','S') AND c.relname LIKE 'exec007_%'
  LOOP EXECUTE format('ALTER %s %s OWNER TO orca_exec007_owner',
    CASE WHEN (SELECT relkind FROM pg_class WHERE oid=r.object_name::oid)='S' THEN 'SEQUENCE' ELSE 'TABLE' END,r.object_name); END LOOP;
  FOR r IN SELECT p.oid::regprocedure AS object_name FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
           WHERE n.nspname='public' AND p.proname LIKE 'fn_exec007_%'
  LOOP EXECUTE format('ALTER FUNCTION %s OWNER TO orca_exec007_owner',r.object_name); END LOOP;
END
$exec007_ordinary_owners$;

REVOKE ALL ON FUNCTION public.fn_exec007_constant_time_equal_32(BYTEA,BYTEA) FROM PUBLIC,orca_migration,orca_runtime,orca_support_readonly;
REVOKE ALL ON FUNCTION public.fn_exec007_verify_db_authorization_context() FROM PUBLIC,orca_migration,orca_runtime,orca_support_readonly;
REVOKE ALL ON FUNCTION public.fn_exec007_consume_db_authorization_nonce(public.exec007_db_authorization_context) FROM PUBLIC,orca_migration,orca_runtime,orca_support_readonly;
REVOKE ALL ON FUNCTION public.fn_exec007_validate_security_event_authority_fields() FROM PUBLIC,orca_migration,orca_runtime,orca_support_readonly;
REVOKE ALL ON FUNCTION public.fn_exec007_guard_security_event_authority_immutable() FROM PUBLIC,orca_migration,orca_runtime,orca_support_readonly;
REVOKE ALL ON FUNCTION public.fn_exec007_validate_challenge_binding() FROM PUBLIC,orca_migration,orca_runtime,orca_support_readonly;
REVOKE ALL ON FUNCTION public.fn_exec007_guard_challenge_binding_immutable() FROM PUBLIC,orca_migration,orca_runtime,orca_support_readonly;
REVOKE ALL ON FUNCTION public.fn_exec007_guard_security_event_read_audit_append_only() FROM PUBLIC,orca_migration,orca_runtime,orca_support_readonly;
REVOKE ALL ON FUNCTION public.fn_exec007_get_security_event_authority_metadata(UUID,UUID) FROM PUBLIC,orca_migration,orca_support_readonly;
REVOKE ALL ON FUNCTION public.fn_exec007_verify_db_authorization_context() FROM PUBLIC,orca_migration,orca_runtime,orca_support_readonly;
REVOKE ALL ON FUNCTION public.fn_exec007_consume_db_authorization_nonce(public.exec007_db_authorization_context) FROM PUBLIC,orca_migration,orca_runtime,orca_support_readonly;
REVOKE ALL ON FUNCTION public.fn_exec007_guard_security_event_read(TEXT) FROM PUBLIC,orca_migration,orca_support_readonly;
GRANT EXECUTE ON FUNCTION public.fn_exec007_get_security_event_authority_metadata(UUID,UUID) TO orca_runtime;
GRANT EXECUTE ON FUNCTION public.fn_exec007_guard_security_event_read(TEXT) TO orca_runtime;

DO $exec007_database_acl$
BEGIN
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO orca_runtime,orca_migration',current_database());
  EXECUTE format('REVOKE CREATE ON DATABASE %I FROM PUBLIC,orca_runtime,orca_migration,orca_support_readonly',current_database());
END
$exec007_database_acl$;
GRANT USAGE,CREATE ON SCHEMA public TO orca_exec007_owner;
REVOKE ALL ON TABLE public.users,public.tenants,public.user_scope_assignments,public.branch_services
  FROM orca_exec007_owner;
GRANT SELECT(id,tenant_id,is_active) ON TABLE public.users TO orca_exec007_owner;
GRANT SELECT(id,is_active) ON TABLE public.tenants TO orca_exec007_owner;
GRANT SELECT(tenant_id,id,user_id,security_role,scope_type,branch_id,is_active,starts_at,ends_at)
  ON TABLE public.user_scope_assignments TO orca_exec007_owner;
GRANT SELECT(tenant_id,branch_id,service_line,enabled)
  ON TABLE public.branch_services TO orca_exec007_owner;
GRANT USAGE ON SCHEMA public TO orca_runtime,orca_migration,orca_support_readonly;
REVOKE CREATE ON SCHEMA public FROM PUBLIC,orca_runtime,orca_migration,orca_support_readonly;
GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO orca_runtime;
GRANT USAGE,SELECT,UPDATE ON ALL SEQUENCES IN SCHEMA public TO orca_runtime;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO orca_support_readonly;
REVOKE ALL ON public.exec007_customer_security_events,public.exec007_security_event_reads,public.exec007_db_authorization_nonces
  FROM PUBLIC,orca_runtime,orca_support_readonly,orca_migration;
GRANT INSERT(id,tenant_id,principal_id,event_type,purpose_code,raw_ip,network_hmac,recorded_at,scheduled_deletion_at,legal_hold_status,metadata,branch_id,service_line,offer_version_id)
  ON public.exec007_customer_security_events TO orca_runtime;
REVOKE UPDATE,DELETE ON public.exec007_customer_security_events FROM orca_runtime;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA orca_exec007_secure FROM PUBLIC,orca_migration,orca_runtime,orca_support_readonly;
REVOKE ALL ON ALL TABLES IN SCHEMA orca_exec007_secure FROM PUBLIC,orca_migration,orca_runtime,orca_support_readonly,orca_exec007_owner;

ALTER DEFAULT PRIVILEGES FOR ROLE orca_exec007_owner REVOKE ALL ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE orca_exec007_owner REVOKE ALL ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE orca_exec007_key_owner REVOKE ALL ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE orca_exec007_key_owner REVOKE ALL ON FUNCTIONS FROM PUBLIC;

-- Migration setup is complete. Remove the only path that could impersonate the ordinary EXEC-007 owner.
REVOKE orca_exec007_owner FROM orca_migration;

DO $exec007_final_role_graph$
BEGIN
  IF pg_has_role('orca_migration','orca_exec007_owner','MEMBER') OR
     pg_has_role('orca_migration','orca_exec007_owner','SET') THEN
    RAISE EXCEPTION 'EXEC007_MIGRATION_OWNER_ESCALATION_REMAINS' USING ERRCODE='55000';
  END IF;
END
$exec007_final_role_graph$;
