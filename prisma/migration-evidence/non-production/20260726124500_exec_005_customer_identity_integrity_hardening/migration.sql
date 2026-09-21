-- EXEC-005 follow-up integrity hardening.
-- Additive constraints and triggers only. Repository evidence plus disposable CI
-- validation; never authorized for Production or customer data in this package.

ALTER TABLE "customer_party_aliases"
  ALTER COLUMN "merge_id" SET NOT NULL;

CREATE FUNCTION "exec005_party_belongs_to_tenant"(party_id UUID, tenant_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM "customer_parties" p
    WHERE p."id" = party_id AND p."tenant_id" = tenant_id
  );
$$ LANGUAGE sql STABLE;

CREATE FUNCTION "exec005_user_belongs_to_tenant"(user_id UUID, tenant_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM "users" u
    WHERE u."id" = user_id AND u."tenant_id" = tenant_id
  );
$$ LANGUAGE sql STABLE;

CREATE FUNCTION "exec005_validate_alias_tenant"()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT "exec005_party_belongs_to_tenant"(NEW."alias_party_id", NEW."tenant_id") OR
     NOT "exec005_party_belongs_to_tenant"(NEW."survivor_party_id", NEW."tenant_id") THEN
    RAISE EXCEPTION 'customer party alias tenant mismatch';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM "customer_party_merges" m
    WHERE m."id" = NEW."merge_id"
      AND m."tenant_id" = NEW."tenant_id"
      AND m."merged_party_id" = NEW."alias_party_id"
      AND m."survivor_party_id" = NEW."survivor_party_id"
  ) THEN
    RAISE EXCEPTION 'customer party alias merge mismatch';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "customer_party_aliases_tenant_guard"
BEFORE INSERT ON "customer_party_aliases"
FOR EACH ROW EXECUTE FUNCTION "exec005_validate_alias_tenant"();

CREATE FUNCTION "exec005_deny_alias_mutation"()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'customer party aliases are permanent';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "customer_party_aliases_no_mutation"
BEFORE UPDATE OR DELETE ON "customer_party_aliases"
FOR EACH ROW EXECUTE FUNCTION "exec005_deny_alias_mutation"();

CREATE FUNCTION "exec005_validate_party_field_tenant"()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT "exec005_party_belongs_to_tenant"(NEW."party_id", NEW."tenant_id") THEN
    RAISE EXCEPTION 'customer party field tenant mismatch';
  END IF;
  IF NOT "exec005_user_belongs_to_tenant"(NEW."changed_by_user_id", NEW."tenant_id") THEN
    RAISE EXCEPTION 'customer party field actor tenant mismatch';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "customer_party_fields_tenant_guard"
BEFORE INSERT ON "customer_party_fields"
FOR EACH ROW EXECUTE FUNCTION "exec005_validate_party_field_tenant"();

CREATE FUNCTION "exec005_protect_party_field_history"()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'customer party field history is append-only';
  END IF;
  IF OLD."tenant_id" IS DISTINCT FROM NEW."tenant_id" OR
     OLD."party_id" IS DISTINCT FROM NEW."party_id" OR
     OLD."field_name" IS DISTINCT FROM NEW."field_name" OR
     OLD."field_value" IS DISTINCT FROM NEW."field_value" OR
     OLD."normalized_value" IS DISTINCT FROM NEW."normalized_value" OR
     OLD."provenance_source" IS DISTINCT FROM NEW."provenance_source" OR
     OLD."is_verified" IS DISTINCT FROM NEW."is_verified" OR
     OLD."is_protected" IS DISTINCT FROM NEW."is_protected" OR
     OLD."version" IS DISTINCT FROM NEW."version" OR
     OLD."changed_by_user_id" IS DISTINCT FROM NEW."changed_by_user_id" OR
     OLD."audit_correlation_id" IS DISTINCT FROM NEW."audit_correlation_id" OR
     OLD."created_at" IS DISTINCT FROM NEW."created_at" OR
     OLD."superseded_at" IS NOT NULL OR NEW."superseded_at" IS NULL THEN
    RAISE EXCEPTION 'customer party field history is append-only';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "customer_party_fields_history_guard"
BEFORE UPDATE OR DELETE ON "customer_party_fields"
FOR EACH ROW EXECUTE FUNCTION "exec005_protect_party_field_history"();

CREATE FUNCTION "exec005_validate_account_tenant"()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT "exec005_party_belongs_to_tenant"(NEW."party_id", NEW."tenant_id") THEN
    RAISE EXCEPTION 'customer account party tenant mismatch';
  END IF;
  IF NEW."owner_user_id" IS NOT NULL AND
     NOT "exec005_user_belongs_to_tenant"(NEW."owner_user_id", NEW."tenant_id") THEN
    RAISE EXCEPTION 'customer account owner tenant mismatch';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "customer_accounts_v2_tenant_guard"
BEFORE INSERT OR UPDATE ON "customer_accounts_v2"
FOR EACH ROW EXECUTE FUNCTION "exec005_validate_account_tenant"();

CREATE FUNCTION "exec005_validate_account_contact_tenant"()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "customer_accounts_v2" a
    WHERE a."id" = NEW."customer_account_id" AND a."tenant_id" = NEW."tenant_id"
  ) OR NOT "exec005_party_belongs_to_tenant"(NEW."contact_party_id", NEW."tenant_id") THEN
    RAISE EXCEPTION 'customer account contact tenant mismatch';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "customer_account_contacts_tenant_guard"
BEFORE INSERT OR UPDATE ON "customer_account_contacts"
FOR EACH ROW EXECUTE FUNCTION "exec005_validate_account_contact_tenant"();

CREATE FUNCTION "exec005_validate_lead_tenant"()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."party_id" IS NOT NULL AND
     NOT "exec005_party_belongs_to_tenant"(NEW."party_id", NEW."tenant_id") THEN
    RAISE EXCEPTION 'customer lead party tenant mismatch';
  END IF;
  IF NEW."customer_account_id" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "customer_accounts_v2" a
    WHERE a."id" = NEW."customer_account_id"
      AND a."tenant_id" = NEW."tenant_id"
      AND (NEW."party_id" IS NULL OR a."party_id" = NEW."party_id")
  ) THEN
    RAISE EXCEPTION 'customer lead account tenant or subject mismatch';
  END IF;
  IF NEW."legacy_lead_id" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "leads" l
    WHERE l."id" = NEW."legacy_lead_id" AND l."tenant_id" = NEW."tenant_id"
  ) THEN
    RAISE EXCEPTION 'customer lead legacy tenant mismatch';
  END IF;
  IF NEW."owner_user_id" IS NOT NULL AND
     NOT "exec005_user_belongs_to_tenant"(NEW."owner_user_id", NEW."tenant_id") THEN
    RAISE EXCEPTION 'customer lead owner tenant mismatch';
  END IF;
  IF NEW."converted_by_user_id" IS NOT NULL AND
     NOT "exec005_user_belongs_to_tenant"(NEW."converted_by_user_id", NEW."tenant_id") THEN
    RAISE EXCEPTION 'customer lead converter tenant mismatch';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "customer_leads_v2_tenant_guard"
BEFORE INSERT OR UPDATE ON "customer_leads_v2"
FOR EACH ROW EXECUTE FUNCTION "exec005_validate_lead_tenant"();

CREATE FUNCTION "exec005_validate_opportunity_tenant"()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."party_id" IS NOT NULL AND
     NOT "exec005_party_belongs_to_tenant"(NEW."party_id", NEW."tenant_id") THEN
    RAISE EXCEPTION 'customer opportunity party tenant mismatch';
  END IF;
  IF NEW."customer_account_id" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "customer_accounts_v2" a
    WHERE a."id" = NEW."customer_account_id"
      AND a."tenant_id" = NEW."tenant_id"
      AND (NEW."party_id" IS NULL OR a."party_id" = NEW."party_id")
  ) THEN
    RAISE EXCEPTION 'customer opportunity account tenant or subject mismatch';
  END IF;
  IF NEW."source_lead_id" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "customer_leads_v2" l
    WHERE l."id" = NEW."source_lead_id"
      AND l."tenant_id" = NEW."tenant_id"
      AND (NEW."party_id" IS NULL OR l."party_id" IS NULL OR l."party_id" = NEW."party_id")
  ) THEN
    RAISE EXCEPTION 'customer opportunity source lead mismatch';
  END IF;
  IF NEW."legacy_opportunity_id" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "opportunities" o
    WHERE o."id" = NEW."legacy_opportunity_id" AND o."tenant_id" = NEW."tenant_id"
  ) THEN
    RAISE EXCEPTION 'customer opportunity legacy tenant mismatch';
  END IF;
  IF NEW."owner_user_id" IS NOT NULL AND
     NOT "exec005_user_belongs_to_tenant"(NEW."owner_user_id", NEW."tenant_id") THEN
    RAISE EXCEPTION 'customer opportunity owner tenant mismatch';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "customer_opportunities_v2_tenant_guard"
BEFORE INSERT OR UPDATE ON "customer_opportunities_v2"
FOR EACH ROW EXECUTE FUNCTION "exec005_validate_opportunity_tenant"();

CREATE FUNCTION "exec005_validate_opportunity_history_tenant"()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "customer_opportunities_v2" o
    WHERE o."id" = NEW."opportunity_id" AND o."tenant_id" = NEW."tenant_id"
  ) OR NOT "exec005_user_belongs_to_tenant"(NEW."changed_by_user_id", NEW."tenant_id") THEN
    RAISE EXCEPTION 'customer opportunity history tenant mismatch';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "customer_opportunity_history_tenant_guard"
BEFORE INSERT ON "customer_opportunity_history"
FOR EACH ROW EXECUTE FUNCTION "exec005_validate_opportunity_history_tenant"();

CREATE FUNCTION "exec005_validate_preference_tenant"()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT "exec005_party_belongs_to_tenant"(NEW."party_id", NEW."tenant_id") THEN
    RAISE EXCEPTION 'customer preference party tenant mismatch';
  END IF;
  IF NEW."branch_id" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "organization_branches" b
    WHERE b."id" = NEW."branch_id" AND b."tenant_id" = NEW."tenant_id"
  ) THEN
    RAISE EXCEPTION 'customer preference branch tenant mismatch';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "customer_communication_preferences_tenant_guard"
BEFORE INSERT OR UPDATE ON "customer_communication_preferences"
FOR EACH ROW EXECUTE FUNCTION "exec005_validate_preference_tenant"();

CREATE FUNCTION "exec005_validate_preference_history_tenant"()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "customer_communication_preferences" p
    WHERE p."id" = NEW."preference_id" AND p."tenant_id" = NEW."tenant_id"
  ) OR NOT "exec005_user_belongs_to_tenant"(NEW."changed_by_user_id", NEW."tenant_id") THEN
    RAISE EXCEPTION 'customer preference history tenant mismatch';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "customer_communication_history_tenant_guard"
BEFORE INSERT ON "customer_communication_preference_history"
FOR EACH ROW EXECUTE FUNCTION "exec005_validate_preference_history_tenant"();

CREATE FUNCTION "exec005_validate_duplicate_review_tenant"()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT "exec005_party_belongs_to_tenant"(NEW."candidate_party_id", NEW."tenant_id") OR
     NOT "exec005_party_belongs_to_tenant"(NEW."matched_party_id", NEW."tenant_id") THEN
    RAISE EXCEPTION 'customer duplicate review tenant mismatch';
  END IF;
  IF NEW."reviewed_by_user_id" IS NOT NULL AND
     NOT "exec005_user_belongs_to_tenant"(NEW."reviewed_by_user_id", NEW."tenant_id") THEN
    RAISE EXCEPTION 'customer duplicate reviewer tenant mismatch';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "customer_duplicate_reviews_tenant_guard"
BEFORE INSERT OR UPDATE ON "customer_duplicate_reviews"
FOR EACH ROW EXECUTE FUNCTION "exec005_validate_duplicate_review_tenant"();

CREATE FUNCTION "exec005_validate_merge_tenant"()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT "exec005_party_belongs_to_tenant"(NEW."survivor_party_id", NEW."tenant_id") OR
     NOT "exec005_party_belongs_to_tenant"(NEW."merged_party_id", NEW."tenant_id") OR
     NOT "exec005_user_belongs_to_tenant"(NEW."executed_by_user_id", NEW."tenant_id") OR
     NOT "exec005_user_belongs_to_tenant"(NEW."approved_by_user_id", NEW."tenant_id") THEN
    RAISE EXCEPTION 'customer merge tenant mismatch';
  END IF;
  IF NEW."reversed_by_user_id" IS NOT NULL AND
     NOT "exec005_user_belongs_to_tenant"(NEW."reversed_by_user_id", NEW."tenant_id") THEN
    RAISE EXCEPTION 'customer merge reverser tenant mismatch';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "customer_party_merges_tenant_guard"
BEFORE INSERT OR UPDATE ON "customer_party_merges"
FOR EACH ROW EXECUTE FUNCTION "exec005_validate_merge_tenant"();

CREATE FUNCTION "exec005_protect_merge_evidence"()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' OR
     OLD."tenant_id" IS DISTINCT FROM NEW."tenant_id" OR
     OLD."survivor_party_id" IS DISTINCT FROM NEW."survivor_party_id" OR
     OLD."merged_party_id" IS DISTINCT FROM NEW."merged_party_id" OR
     OLD."preview_snapshot" IS DISTINCT FROM NEW."preview_snapshot" OR
     OLD."survivor_after_snapshot" IS DISTINCT FROM NEW."survivor_after_snapshot" OR
     OLD."executed_by_user_id" IS DISTINCT FROM NEW."executed_by_user_id" OR
     OLD."approved_by_user_id" IS DISTINCT FROM NEW."approved_by_user_id" OR
     OLD."reason" IS DISTINCT FROM NEW."reason" OR
     OLD."idempotency_key" IS DISTINCT FROM NEW."idempotency_key" OR
     OLD."executed_at" IS DISTINCT FROM NEW."executed_at" OR
     OLD."reversed_at" IS NOT NULL OR NEW."reversed_at" IS NULL OR
     NEW."reversed_by_user_id" IS NULL THEN
    RAISE EXCEPTION 'customer merge evidence is immutable except one reversal';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "customer_party_merges_evidence_guard"
BEFORE UPDATE OR DELETE ON "customer_party_merges"
FOR EACH ROW EXECUTE FUNCTION "exec005_protect_merge_evidence"();

CREATE FUNCTION "exec005_validate_merge_dependency_tenant"()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "customer_party_merges" m
    WHERE m."id" = NEW."merge_id" AND m."tenant_id" = NEW."tenant_id"
  ) THEN
    RAISE EXCEPTION 'customer merge dependency tenant mismatch';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "customer_party_merge_dependencies_tenant_guard"
BEFORE INSERT OR UPDATE ON "customer_party_merge_dependencies"
FOR EACH ROW EXECUTE FUNCTION "exec005_validate_merge_dependency_tenant"();

CREATE FUNCTION "exec005_validate_deletion_request_tenant"()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT "exec005_party_belongs_to_tenant"(NEW."party_id", NEW."tenant_id") OR
     NOT "exec005_user_belongs_to_tenant"(NEW."requested_by_user_id", NEW."tenant_id") THEN
    RAISE EXCEPTION 'customer deletion request tenant mismatch';
  END IF;
  IF NEW."reviewed_by_user_id" IS NOT NULL AND
     NOT "exec005_user_belongs_to_tenant"(NEW."reviewed_by_user_id", NEW."tenant_id") THEN
    RAISE EXCEPTION 'customer deletion reviewer tenant mismatch';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "customer_deletion_requests_tenant_guard"
BEFORE INSERT OR UPDATE ON "customer_deletion_requests"
FOR EACH ROW EXECUTE FUNCTION "exec005_validate_deletion_request_tenant"();

CREATE FUNCTION "exec005_validate_audit_tenant"()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT "exec005_user_belongs_to_tenant"(NEW."actor_user_id", NEW."tenant_id") THEN
    RAISE EXCEPTION 'customer identity audit actor tenant mismatch';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "customer_identity_audit_tenant_guard"
BEFORE INSERT ON "customer_identity_audit"
FOR EACH ROW EXECUTE FUNCTION "exec005_validate_audit_tenant"();

CREATE FUNCTION "exec005_deny_idempotency_mutation"()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'customer idempotency evidence is immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "customer_idempotency_keys_no_mutation"
BEFORE UPDATE OR DELETE ON "customer_idempotency_keys"
FOR EACH ROW EXECUTE FUNCTION "exec005_deny_idempotency_mutation"();

COMMENT ON FUNCTION "exec005_validate_lead_tenant"() IS
  'Fail-closed tenant and subject-integrity guard for EXEC-005 Leads.';
COMMENT ON FUNCTION "exec005_validate_opportunity_tenant"() IS
  'Fail-closed tenant and subject-integrity guard for EXEC-005 Opportunities.';
COMMENT ON TRIGGER "customer_party_aliases_no_mutation" ON "customer_party_aliases" IS
  'Merged Party aliases are permanent and cannot be repurposed.';
