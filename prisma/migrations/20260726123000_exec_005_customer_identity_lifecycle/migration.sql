-- EXEC-005: additive customer identity and opportunity lifecycle foundation.
-- Repository evidence only. DO NOT execute against Production or customer data
-- without a separate migration/data authorization, verified recovery point,
-- isolated rehearsal, reconciliation and forward-fix plan.
-- No backfill is performed by this migration.

CREATE TABLE "customer_parties" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "party_type" TEXT NOT NULL,
  "lifecycle_state" TEXT NOT NULL DEFAULT 'ACTIVE',
  "branch_id" UUID,
  "department_id" UUID,
  "team_id" UUID,
  "merged_into_party_id" UUID,
  "legal_hold_reason" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_by_user_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "customer_parties_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "customer_parties_tenant_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "customer_parties_branch_fkey"
    FOREIGN KEY ("branch_id") REFERENCES "organization_branches"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "customer_parties_department_fkey"
    FOREIGN KEY ("department_id") REFERENCES "organization_departments"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "customer_parties_team_fkey"
    FOREIGN KEY ("team_id") REFERENCES "organization_teams"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "customer_parties_created_by_fkey"
    FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "customer_parties_merged_into_fkey"
    FOREIGN KEY ("merged_into_party_id") REFERENCES "customer_parties"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "customer_parties_party_type_check"
    CHECK ("party_type" IN ('PERSON', 'ORGANIZATION')),
  CONSTRAINT "customer_parties_lifecycle_state_check" CHECK (
    "lifecycle_state" IN (
      'ACTIVE', 'ARCHIVED', 'RESTRICTED', 'PENDING_DELETION',
      'ANONYMIZED', 'LEGAL_HOLD', 'MERGED'
    )
  ),
  CONSTRAINT "customer_parties_version_check" CHECK ("version" > 0),
  CONSTRAINT "customer_parties_merge_shape_check" CHECK (
    ("lifecycle_state" = 'MERGED' AND "merged_into_party_id" IS NOT NULL AND "merged_into_party_id" <> "id") OR
    ("lifecycle_state" <> 'MERGED' AND "merged_into_party_id" IS NULL)
  )
);

CREATE INDEX "customer_parties_tenant_state_idx"
  ON "customer_parties" ("tenant_id", "lifecycle_state");
CREATE INDEX "customer_parties_scope_idx"
  ON "customer_parties" ("tenant_id", "branch_id", "department_id", "team_id");
CREATE UNIQUE INDEX "customer_parties_merged_alias_unique"
  ON "customer_parties" ("tenant_id", "id", "merged_into_party_id")
  WHERE "merged_into_party_id" IS NOT NULL;

CREATE TABLE "customer_party_aliases" (
  "tenant_id" UUID NOT NULL,
  "alias_party_id" UUID NOT NULL,
  "survivor_party_id" UUID NOT NULL,
  "merge_id" UUID,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "customer_party_aliases_pkey" PRIMARY KEY ("tenant_id", "alias_party_id"),
  CONSTRAINT "customer_party_aliases_tenant_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "customer_party_aliases_alias_fkey"
    FOREIGN KEY ("alias_party_id") REFERENCES "customer_parties"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "customer_party_aliases_survivor_fkey"
    FOREIGN KEY ("survivor_party_id") REFERENCES "customer_parties"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "customer_party_aliases_no_self_check"
    CHECK ("alias_party_id" <> "survivor_party_id")
);

CREATE TABLE "customer_party_fields" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "party_id" UUID NOT NULL,
  "field_name" TEXT NOT NULL,
  "field_value" TEXT,
  "normalized_value" TEXT,
  "provenance_source" TEXT NOT NULL,
  "is_verified" BOOLEAN NOT NULL DEFAULT FALSE,
  "is_protected" BOOLEAN NOT NULL DEFAULT FALSE,
  "version" INTEGER NOT NULL DEFAULT 1,
  "changed_by_user_id" UUID NOT NULL,
  "audit_correlation_id" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "superseded_at" TIMESTAMPTZ,
  CONSTRAINT "customer_party_fields_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "customer_party_fields_tenant_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "customer_party_fields_party_fkey"
    FOREIGN KEY ("party_id") REFERENCES "customer_parties"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "customer_party_fields_actor_fkey"
    FOREIGN KEY ("changed_by_user_id") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "customer_party_fields_source_check" CHECK (
    "provenance_source" IN (
      'USER_ENTERED', 'IMPORTED', 'INTEGRATION', 'DERIVED',
      'VERIFIED', 'MERGED', 'SYSTEM'
    )
  ),
  CONSTRAINT "customer_party_fields_name_check"
    CHECK (char_length(btrim("field_name")) BETWEEN 1 AND 80),
  CONSTRAINT "customer_party_fields_version_check" CHECK ("version" > 0)
);

CREATE UNIQUE INDEX "customer_party_fields_current_key"
  ON "customer_party_fields" ("tenant_id", "party_id", "field_name")
  WHERE "superseded_at" IS NULL;
CREATE INDEX "customer_party_fields_normalized_lookup_idx"
  ON "customer_party_fields" ("tenant_id", "field_name", "normalized_value")
  WHERE "normalized_value" IS NOT NULL AND "superseded_at" IS NULL;

CREATE TABLE "customer_accounts_v2" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "party_id" UUID NOT NULL,
  "relationship_roles" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "lifecycle_state" TEXT NOT NULL DEFAULT 'ACTIVE',
  "branch_id" UUID,
  "department_id" UUID,
  "team_id" UUID,
  "owner_user_id" UUID,
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "customer_accounts_v2_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "customer_accounts_v2_tenant_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "customer_accounts_v2_party_fkey"
    FOREIGN KEY ("party_id") REFERENCES "customer_parties"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "customer_accounts_v2_branch_fkey"
    FOREIGN KEY ("branch_id") REFERENCES "organization_branches"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "customer_accounts_v2_department_fkey"
    FOREIGN KEY ("department_id") REFERENCES "organization_departments"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "customer_accounts_v2_team_fkey"
    FOREIGN KEY ("team_id") REFERENCES "organization_teams"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "customer_accounts_v2_owner_fkey"
    FOREIGN KEY ("owner_user_id") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "customer_accounts_v2_state_check" CHECK (
    "lifecycle_state" IN (
      'ACTIVE', 'ARCHIVED', 'RESTRICTED', 'PENDING_DELETION',
      'ANONYMIZED', 'LEGAL_HOLD'
    )
  ),
  CONSTRAINT "customer_accounts_v2_roles_check" CHECK (
    "relationship_roles" <@ ARRAY[
      'OWNER', 'TENANT', 'BUYER', 'SELLER', 'INVESTOR',
      'PROVIDER', 'PARTNER', 'OTHER'
    ]::TEXT[]
  )
);

CREATE INDEX "customer_accounts_v2_party_idx"
  ON "customer_accounts_v2" ("tenant_id", "party_id");
CREATE INDEX "customer_accounts_v2_scope_idx"
  ON "customer_accounts_v2" ("tenant_id", "branch_id", "team_id");

CREATE TABLE "customer_account_contacts" (
  "tenant_id" UUID NOT NULL,
  "customer_account_id" UUID NOT NULL,
  "contact_party_id" UUID NOT NULL,
  "contact_role" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "customer_account_contacts_pkey"
    PRIMARY KEY ("tenant_id", "customer_account_id", "contact_party_id"),
  CONSTRAINT "customer_account_contacts_account_fkey"
    FOREIGN KEY ("customer_account_id") REFERENCES "customer_accounts_v2"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "customer_account_contacts_party_fkey"
    FOREIGN KEY ("contact_party_id") REFERENCES "customer_parties"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "customer_account_contacts_no_self_check"
    CHECK ("customer_account_id"::TEXT <> "contact_party_id"::TEXT)
);

CREATE TABLE "customer_leads_v2" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "party_id" UUID,
  "customer_account_id" UUID,
  "legacy_lead_id" UUID,
  "service_line" TEXT NOT NULL,
  "project_id" UUID,
  "unit_id" UUID,
  "source" TEXT NOT NULL,
  "campaign_id" TEXT,
  "purpose" TEXT,
  "branch_id" UUID NOT NULL,
  "department_id" UUID,
  "team_id" UUID,
  "owner_user_id" UUID,
  "stage" TEXT NOT NULL DEFAULT 'NEW',
  "disqualification_reason" TEXT,
  "converted_at" TIMESTAMPTZ,
  "converted_by_user_id" UUID,
  "conversion_idempotency_key" TEXT,
  "converted_opportunity_id" UUID,
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "customer_leads_v2_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "customer_leads_v2_tenant_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "customer_leads_v2_party_fkey"
    FOREIGN KEY ("party_id") REFERENCES "customer_parties"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "customer_leads_v2_account_fkey"
    FOREIGN KEY ("customer_account_id") REFERENCES "customer_accounts_v2"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "customer_leads_v2_legacy_fkey"
    FOREIGN KEY ("legacy_lead_id") REFERENCES "leads"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "customer_leads_v2_branch_fkey"
    FOREIGN KEY ("branch_id") REFERENCES "organization_branches"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "customer_leads_v2_owner_fkey"
    FOREIGN KEY ("owner_user_id") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "customer_leads_v2_stage_check" CHECK (
    "stage" IN (
      'NEW', 'CONTACTED', 'QUALIFYING', 'QUALIFIED',
      'DISQUALIFIED', 'CONVERTED', 'ARCHIVED'
    )
  ),
  CONSTRAINT "customer_leads_v2_disqualified_reason_check" CHECK (
    ("stage" = 'DISQUALIFIED' AND char_length(btrim(COALESCE("disqualification_reason", ''))) > 0) OR
    ("stage" <> 'DISQUALIFIED')
  ),
  CONSTRAINT "customer_leads_v2_conversion_shape_check" CHECK (
    ("stage" = 'CONVERTED' AND "party_id" IS NOT NULL AND "converted_at" IS NOT NULL AND
      "converted_by_user_id" IS NOT NULL AND "conversion_idempotency_key" IS NOT NULL) OR
    ("stage" <> 'CONVERTED')
  )
);

CREATE UNIQUE INDEX "customer_leads_v2_conversion_idempotency_key"
  ON "customer_leads_v2" ("tenant_id", "conversion_idempotency_key")
  WHERE "conversion_idempotency_key" IS NOT NULL;
CREATE INDEX "customer_leads_v2_party_idx"
  ON "customer_leads_v2" ("tenant_id", "party_id", "stage");
CREATE INDEX "customer_leads_v2_scope_idx"
  ON "customer_leads_v2" ("tenant_id", "branch_id", "team_id", "stage");

CREATE TABLE "customer_opportunities_v2" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "party_id" UUID,
  "customer_account_id" UUID,
  "source_lead_id" UUID,
  "legacy_opportunity_id" UUID,
  "branch_id" UUID NOT NULL,
  "department_id" UUID,
  "team_id" UUID,
  "owner_user_id" UUID,
  "service_line" TEXT NOT NULL,
  "project_id" UUID,
  "unit_id" UUID,
  "expected_value" NUMERIC(18,2) NOT NULL DEFAULT 0,
  "stage" TEXT NOT NULL DEFAULT 'NEW',
  "probability" INTEGER NOT NULL DEFAULT 0,
  "expected_close_at" TIMESTAMPTZ,
  "outcome_reason" TEXT,
  "creation_source" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "customer_opportunities_v2_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "customer_opportunities_v2_tenant_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "customer_opportunities_v2_party_fkey"
    FOREIGN KEY ("party_id") REFERENCES "customer_parties"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "customer_opportunities_v2_account_fkey"
    FOREIGN KEY ("customer_account_id") REFERENCES "customer_accounts_v2"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "customer_opportunities_v2_source_lead_fkey"
    FOREIGN KEY ("source_lead_id") REFERENCES "customer_leads_v2"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "customer_opportunities_v2_legacy_fkey"
    FOREIGN KEY ("legacy_opportunity_id") REFERENCES "opportunities"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "customer_opportunities_v2_branch_fkey"
    FOREIGN KEY ("branch_id") REFERENCES "organization_branches"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "customer_opportunities_v2_owner_fkey"
    FOREIGN KEY ("owner_user_id") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "customer_opportunities_v2_subject_check"
    CHECK ("party_id" IS NOT NULL OR "customer_account_id" IS NOT NULL),
  CONSTRAINT "customer_opportunities_v2_value_check" CHECK ("expected_value" >= 0),
  CONSTRAINT "customer_opportunities_v2_probability_check"
    CHECK ("probability" BETWEEN 0 AND 100),
  CONSTRAINT "customer_opportunities_v2_stage_check" CHECK (
    "stage" IN (
      'NEW', 'QUALIFICATION', 'NEEDS_ANALYSIS', 'PROPOSAL',
      'NEGOTIATION', 'APPROVAL', 'WON', 'LOST', 'CANCELLED'
    )
  ),
  CONSTRAINT "customer_opportunities_v2_lost_reason_check" CHECK (
    ("stage" = 'LOST' AND char_length(btrim(COALESCE("outcome_reason", ''))) > 0) OR
    ("stage" <> 'LOST')
  )
);

CREATE INDEX "customer_opportunities_v2_party_idx"
  ON "customer_opportunities_v2" ("tenant_id", "party_id", "stage");
CREATE INDEX "customer_opportunities_v2_scope_idx"
  ON "customer_opportunities_v2" ("tenant_id", "branch_id", "team_id", "stage");
CREATE INDEX "customer_opportunities_v2_source_lead_idx"
  ON "customer_opportunities_v2" ("tenant_id", "source_lead_id");

ALTER TABLE "customer_leads_v2"
  ADD CONSTRAINT "customer_leads_v2_converted_opportunity_fkey"
  FOREIGN KEY ("converted_opportunity_id") REFERENCES "customer_opportunities_v2"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "customer_opportunity_history" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "opportunity_id" UUID NOT NULL,
  "event_type" TEXT NOT NULL,
  "previous_stage" TEXT NOT NULL,
  "next_stage" TEXT NOT NULL,
  "previous_expected_value" NUMERIC(18,2) NOT NULL,
  "next_expected_value" NUMERIC(18,2) NOT NULL,
  "previous_owner_user_id" UUID,
  "next_owner_user_id" UUID,
  "previous_branch_id" UUID NOT NULL,
  "next_branch_id" UUID NOT NULL,
  "previous_team_id" UUID,
  "next_team_id" UUID,
  "changed_by_user_id" UUID NOT NULL,
  "audit_correlation_id" TEXT NOT NULL,
  "reason" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "customer_opportunity_history_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "customer_opportunity_history_opportunity_fkey"
    FOREIGN KEY ("opportunity_id") REFERENCES "customer_opportunities_v2"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "customer_opportunity_history_actor_fkey"
    FOREIGN KEY ("changed_by_user_id") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "customer_opportunity_history_event_check"
    CHECK ("event_type" IN ('STAGE_CHANGED', 'REASSIGNED', 'VALUE_CHANGED', 'REOPENED'))
);

CREATE INDEX "customer_opportunity_history_tenant_time_idx"
  ON "customer_opportunity_history" ("tenant_id", "opportunity_id", "created_at");

CREATE TABLE "customer_communication_preferences" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "party_id" UUID NOT NULL,
  "channel" TEXT NOT NULL,
  "purpose" TEXT NOT NULL,
  "consent_state" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "branch_id" UUID,
  "service_line" TEXT,
  "recorded_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "withdrawn_at" TIMESTAMPTZ,
  "version" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "customer_communication_preferences_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "customer_communication_preferences_party_fkey"
    FOREIGN KEY ("party_id") REFERENCES "customer_parties"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "customer_communication_preferences_channel_check"
    CHECK ("channel" IN ('PHONE', 'SMS', 'WHATSAPP', 'EMAIL', 'PUSH', 'OTHER')),
  CONSTRAINT "customer_communication_preferences_purpose_check"
    CHECK ("purpose" IN ('SERVICE', 'TRANSACTIONAL', 'MARKETING', 'SURVEY', 'MAINTENANCE', 'OTHER')),
  CONSTRAINT "customer_communication_preferences_state_check"
    CHECK ("consent_state" IN ('GRANTED', 'DENIED', 'WITHDRAWN', 'NOT_REQUIRED', 'UNKNOWN')),
  CONSTRAINT "customer_communication_preferences_source_check"
    CHECK ("source" IN ('USER_ENTERED', 'IMPORTED', 'INTEGRATION', 'DERIVED', 'VERIFIED', 'MERGED', 'SYSTEM')),
  CONSTRAINT "customer_communication_preferences_withdrawal_check" CHECK (
    ("consent_state" = 'WITHDRAWN' AND "withdrawn_at" IS NOT NULL) OR
    ("consent_state" <> 'WITHDRAWN')
  )
);

CREATE UNIQUE INDEX "customer_communication_preferences_scope_key"
  ON "customer_communication_preferences" (
    "tenant_id", "party_id", "channel", "purpose",
    COALESCE("branch_id", '00000000-0000-0000-0000-000000000000'::UUID),
    COALESCE("service_line", '')
  );

CREATE TABLE "customer_communication_preference_history" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "preference_id" UUID NOT NULL,
  "consent_state" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "changed_by_user_id" UUID NOT NULL,
  "audit_correlation_id" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "customer_communication_preference_history_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "customer_communication_preference_history_preference_fkey"
    FOREIGN KEY ("preference_id") REFERENCES "customer_communication_preferences"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "customer_communication_preference_history_actor_fkey"
    FOREIGN KEY ("changed_by_user_id") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "customer_duplicate_reviews" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "candidate_party_id" UUID NOT NULL,
  "matched_party_id" UUID NOT NULL,
  "match_level" TEXT NOT NULL,
  "reason_codes" TEXT[] NOT NULL,
  "explanation" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
  "reviewed_by_user_id" UUID,
  "reviewed_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "customer_duplicate_reviews_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "customer_duplicate_reviews_candidate_fkey"
    FOREIGN KEY ("candidate_party_id") REFERENCES "customer_parties"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "customer_duplicate_reviews_match_fkey"
    FOREIGN KEY ("matched_party_id") REFERENCES "customer_parties"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "customer_duplicate_reviews_no_self_check"
    CHECK ("candidate_party_id" <> "matched_party_id"),
  CONSTRAINT "customer_duplicate_reviews_level_check"
    CHECK ("match_level" IN ('DETERMINISTIC_MATCH', 'POSSIBLE_MATCH')),
  CONSTRAINT "customer_duplicate_reviews_status_check"
    CHECK ("status" IN ('PENDING_REVIEW', 'CONFIRMED', 'REJECTED', 'MERGED'))
);

CREATE INDEX "customer_duplicate_reviews_pending_idx"
  ON "customer_duplicate_reviews" ("tenant_id", "status", "created_at");

CREATE TABLE "customer_party_merges" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "survivor_party_id" UUID NOT NULL,
  "merged_party_id" UUID NOT NULL,
  "preview_snapshot" JSONB NOT NULL,
  "survivor_after_snapshot" JSONB NOT NULL,
  "executed_by_user_id" UUID NOT NULL,
  "approved_by_user_id" UUID NOT NULL,
  "reason" TEXT NOT NULL,
  "idempotency_key" TEXT NOT NULL,
  "executed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reversed_at" TIMESTAMPTZ,
  "reversed_by_user_id" UUID,
  CONSTRAINT "customer_party_merges_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "customer_party_merges_survivor_fkey"
    FOREIGN KEY ("survivor_party_id") REFERENCES "customer_parties"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "customer_party_merges_merged_fkey"
    FOREIGN KEY ("merged_party_id") REFERENCES "customer_parties"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "customer_party_merges_executor_fkey"
    FOREIGN KEY ("executed_by_user_id") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "customer_party_merges_approver_fkey"
    FOREIGN KEY ("approved_by_user_id") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "customer_party_merges_no_self_check"
    CHECK ("survivor_party_id" <> "merged_party_id"),
  CONSTRAINT "customer_party_merges_sod_check"
    CHECK ("executed_by_user_id" <> "approved_by_user_id"),
  CONSTRAINT "customer_party_merges_reason_check"
    CHECK (char_length(btrim("reason")) > 0),
  CONSTRAINT "customer_party_merges_reversal_shape_check" CHECK (
    ("reversed_at" IS NULL AND "reversed_by_user_id" IS NULL) OR
    ("reversed_at" IS NOT NULL AND "reversed_by_user_id" IS NOT NULL)
  ),
  CONSTRAINT "customer_party_merges_idempotency_key"
    UNIQUE ("tenant_id", "idempotency_key")
);

ALTER TABLE "customer_party_aliases"
  ADD CONSTRAINT "customer_party_aliases_merge_fkey"
  FOREIGN KEY ("merge_id") REFERENCES "customer_party_merges"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "customer_party_merge_dependencies" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "merge_id" UUID NOT NULL,
  "dependency_type" TEXT NOT NULL,
  "dependency_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "customer_party_merge_dependencies_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "customer_party_merge_dependencies_merge_fkey"
    FOREIGN KEY ("merge_id") REFERENCES "customer_party_merges"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "customer_party_merge_dependencies_key"
    UNIQUE ("tenant_id", "merge_id", "dependency_type", "dependency_id")
);

CREATE TABLE "customer_retention_policies" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "record_type" TEXT NOT NULL,
  "retention_days" INTEGER,
  "anonymize_after_days" INTEGER,
  "requires_review" BOOLEAN NOT NULL DEFAULT TRUE,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "customer_retention_policies_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "customer_retention_policies_tenant_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "customer_retention_policies_days_check" CHECK (
    ("retention_days" IS NULL OR "retention_days" >= 0) AND
    ("anonymize_after_days" IS NULL OR "anonymize_after_days" >= 0)
  ),
  CONSTRAINT "customer_retention_policies_key"
    UNIQUE ("tenant_id", "record_type")
);

CREATE TABLE "customer_deletion_requests" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "party_id" UUID NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
  "reason" TEXT NOT NULL,
  "requested_by_user_id" UUID NOT NULL,
  "reviewed_by_user_id" UUID,
  "blocking_dependencies" JSONB NOT NULL DEFAULT '[]'::JSONB,
  "requested_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewed_at" TIMESTAMPTZ,
  CONSTRAINT "customer_deletion_requests_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "customer_deletion_requests_party_fkey"
    FOREIGN KEY ("party_id") REFERENCES "customer_parties"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "customer_deletion_requests_requester_fkey"
    FOREIGN KEY ("requested_by_user_id") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "customer_deletion_requests_status_check"
    CHECK ("status" IN ('PENDING_REVIEW', 'APPROVED', 'REJECTED', 'BLOCKED', 'COMPLETED')),
  CONSTRAINT "customer_deletion_requests_reason_check"
    CHECK (char_length(btrim("reason")) > 0)
);

CREATE TABLE "customer_idempotency_keys" (
  "tenant_id" UUID NOT NULL,
  "operation" TEXT NOT NULL,
  "idempotency_key" TEXT NOT NULL,
  "result_entity_type" TEXT NOT NULL,
  "result_entity_id" UUID NOT NULL,
  "request_hash" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "customer_idempotency_keys_pkey"
    PRIMARY KEY ("tenant_id", "operation", "idempotency_key")
);

CREATE TABLE "customer_identity_audit" (
  "sequence" BIGSERIAL NOT NULL,
  "tenant_id" UUID NOT NULL,
  "actor_user_id" UUID NOT NULL,
  "action" TEXT NOT NULL,
  "entity_type" TEXT NOT NULL,
  "entity_id" UUID NOT NULL,
  "before_state" JSONB,
  "after_state" JSONB,
  "reason" TEXT,
  "audit_correlation_id" TEXT NOT NULL,
  "occurred_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "customer_identity_audit_pkey" PRIMARY KEY ("sequence"),
  CONSTRAINT "customer_identity_audit_tenant_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "customer_identity_audit_actor_fkey"
    FOREIGN KEY ("actor_user_id") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "customer_identity_audit_entity_idx"
  ON "customer_identity_audit" ("tenant_id", "entity_type", "entity_id", "occurred_at");
CREATE INDEX "customer_identity_audit_correlation_idx"
  ON "customer_identity_audit" ("tenant_id", "audit_correlation_id");

CREATE FUNCTION "exec005_validate_customer_scope"()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."branch_id" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "organization_branches"
    WHERE "id" = NEW."branch_id" AND "tenant_id" = NEW."tenant_id"
  ) THEN
    RAISE EXCEPTION 'customer branch tenant mismatch';
  END IF;

  IF NEW."department_id" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "organization_departments"
    WHERE "id" = NEW."department_id" AND "tenant_id" = NEW."tenant_id"
      AND "branch_id" IS NOT DISTINCT FROM NEW."branch_id"
  ) THEN
    RAISE EXCEPTION 'customer department hierarchy mismatch';
  END IF;

  IF NEW."team_id" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "organization_teams"
    WHERE "id" = NEW."team_id" AND "tenant_id" = NEW."tenant_id"
      AND "branch_id" IS NOT DISTINCT FROM NEW."branch_id"
      AND (NEW."department_id" IS NULL OR "department_id" = NEW."department_id")
  ) THEN
    RAISE EXCEPTION 'customer team hierarchy mismatch';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "customer_parties_scope_guard"
BEFORE INSERT OR UPDATE ON "customer_parties"
FOR EACH ROW EXECUTE FUNCTION "exec005_validate_customer_scope"();

CREATE TRIGGER "customer_accounts_v2_scope_guard"
BEFORE INSERT OR UPDATE ON "customer_accounts_v2"
FOR EACH ROW EXECUTE FUNCTION "exec005_validate_customer_scope"();

CREATE TRIGGER "customer_leads_v2_scope_guard"
BEFORE INSERT OR UPDATE ON "customer_leads_v2"
FOR EACH ROW EXECUTE FUNCTION "exec005_validate_customer_scope"();

CREATE TRIGGER "customer_opportunities_v2_scope_guard"
BEFORE INSERT OR UPDATE ON "customer_opportunities_v2"
FOR EACH ROW EXECUTE FUNCTION "exec005_validate_customer_scope"();

CREATE FUNCTION "exec005_validate_party_tenant_links"()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."merged_into_party_id" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "customer_parties"
    WHERE "id" = NEW."merged_into_party_id" AND "tenant_id" = NEW."tenant_id"
  ) THEN
    RAISE EXCEPTION 'party merge tenant mismatch';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "customer_parties_tenant_link_guard"
BEFORE INSERT OR UPDATE ON "customer_parties"
FOR EACH ROW EXECUTE FUNCTION "exec005_validate_party_tenant_links"();

CREATE FUNCTION "exec005_deny_audit_mutation"()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'customer identity audit is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "customer_identity_audit_no_update"
BEFORE UPDATE OR DELETE ON "customer_identity_audit"
FOR EACH ROW EXECUTE FUNCTION "exec005_deny_audit_mutation"();

CREATE TRIGGER "customer_opportunity_history_no_update"
BEFORE UPDATE OR DELETE ON "customer_opportunity_history"
FOR EACH ROW EXECUTE FUNCTION "exec005_deny_audit_mutation"();

CREATE TRIGGER "customer_communication_history_no_update"
BEFORE UPDATE OR DELETE ON "customer_communication_preference_history"
FOR EACH ROW EXECUTE FUNCTION "exec005_deny_audit_mutation"();

COMMENT ON TABLE "customer_parties" IS
  'EXEC-005 identity root. Additive only; legacy Lead and Contact rows are not backfilled here.';
COMMENT ON TABLE "customer_party_aliases" IS
  'Permanent redirect evidence for merged Party identifiers; aliases must never be reused.';
COMMENT ON TABLE "customer_party_merges" IS
  'Auditable merge evidence with survivor, loser, preview, independent approval and reversal state.';
COMMENT ON TABLE "customer_identity_audit" IS
  'Append-only customer identity and opportunity lifecycle audit.';
