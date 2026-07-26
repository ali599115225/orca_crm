-- EXEC-006 strict authority and availability hardening.
-- Additive repository evidence only. No Production execution and no Backfill.

CREATE FUNCTION "exec006_assert_independent_approval"(
  p_tenant_id UUID,
  p_branch_id UUID,
  p_resource_id UUID,
  p_request_actor_id UUID,
  p_approved_by_user_id UUID,
  p_approval_evidence JSONB,
  p_permission TEXT,
  p_now TIMESTAMPTZ
) RETURNS VOID AS $$
DECLARE
  v_evidence_actor UUID;
  v_assignment_id UUID;
  v_approved_at TIMESTAMPTZ;
BEGIN
  IF p_approval_evidence IS NULL OR p_approved_by_user_id IS NULL THEN
    RAISE EXCEPTION 'independent elevated approval evidence is required';
  END IF;

  BEGIN
    v_evidence_actor := NULLIF(
      btrim(p_approval_evidence->>'approvedByActorId'), ''
    )::UUID;
    v_assignment_id := NULLIF(
      btrim(p_approval_evidence #>> '{approverAssignments,0,id}'), ''
    )::UUID;
    v_approved_at := NULLIF(
      btrim(p_approval_evidence->>'approvedAt'), ''
    )::TIMESTAMPTZ;
  EXCEPTION WHEN invalid_text_representation OR datetime_field_overflow THEN
    RAISE EXCEPTION 'approval evidence contains invalid actor, assignment or time';
  END;

  IF v_evidence_actor IS NULL OR v_evidence_actor <> p_approved_by_user_id THEN
    RAISE EXCEPTION 'approval evidence actor does not match approved_by_user_id';
  END IF;
  IF v_evidence_actor = p_request_actor_id THEN
    RAISE EXCEPTION 'self approval denied';
  END IF;
  IF v_approved_at IS NULL OR v_approved_at > p_now THEN
    RAISE EXCEPTION 'approval evidence time is missing or in the future';
  END IF;
  IF char_length(btrim(COALESCE(
      p_approval_evidence->>'approvalReference', ''
    ))) = 0 OR
     char_length(btrim(COALESCE(
      p_approval_evidence->>'reason', ''
    ))) = 0 THEN
    RAISE EXCEPTION 'approval reference and reason are required';
  END IF;

  IF v_assignment_id IS NULL THEN
    SELECT a."id" INTO v_assignment_id
    FROM "user_scope_assignments" a
    WHERE a."tenant_id" = p_tenant_id
      AND a."user_id" = v_evidence_actor
      AND a."is_active" = TRUE
      AND (a."starts_at" IS NULL OR a."starts_at" <= p_now)
      AND (a."ends_at" IS NULL OR a."ends_at" > p_now)
      AND (
        a."scope_type" = 'COMPANY' OR
        a."branch_id" = p_branch_id
      )
    ORDER BY
      CASE WHEN a."scope_type" = 'COMPANY' THEN 0 ELSE 1 END,
      a."created_at",
      a."id"
    LIMIT 1;
  END IF;

  IF v_assignment_id IS NULL THEN
    RAISE EXCEPTION 'persisted approver assignment is missing';
  END IF;

  PERFORM "exec006_assert_scope_assignment"(
    p_tenant_id,
    v_evidence_actor,
    v_assignment_id,
    p_branch_id,
    p_resource_id,
    p_permission,
    p_now
  );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "exec006_validate_commitment_approval_policy"()
RETURNS TRIGGER AS $$
DECLARE
  v_source "unit_availability_sources"%ROWTYPE;
  v_policy "unit_commitment_policies"%ROWTYPE;
  v_reference_time TIMESTAMPTZ;
  v_minutes INTEGER;
  v_standard INTEGER;
  v_absolute INTEGER;
  v_permission TEXT;
BEGIN
  SELECT * INTO v_source
  FROM "unit_availability_sources"
  WHERE "tenant_id" = NEW."tenant_id"
    AND "unit_id" = NEW."unit_id";
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing availability source for commitment policy';
  END IF;

  v_policy := "exec006_resolve_policy"(
    NEW."tenant_id",
    NEW."branch_id",
    v_source."project_id",
    v_source."unit_type"
  );

  v_reference_time := CASE
    WHEN TG_OP = 'INSERT' THEN NEW."starts_at"
    ELSE NEW."updated_at"
  END;
  v_minutes := floor(
    extract(epoch FROM (NEW."expires_at" - v_reference_time)) / 60
  );

  IF NEW."commitment_type" = 'HOLD' THEN
    v_standard := v_policy."standard_max_hold_minutes";
    v_absolute := v_policy."absolute_max_hold_minutes";
    v_permission := 'UNIT_HOLD_OVERRIDE';
  ELSE
    v_standard := v_policy."standard_max_reservation_minutes";
    v_absolute := v_policy."absolute_max_reservation_minutes";
    v_permission := 'RESERVATION_APPROVE';
  END IF;

  IF v_minutes <= 0 OR v_minutes > v_absolute THEN
    RAISE EXCEPTION 'commitment duration exceeds bounded policy';
  END IF;

  IF v_minutes > v_standard THEN
    IF TG_OP = 'UPDATE' AND
       NEW."expires_at" > OLD."expires_at" AND
       NEW."approval_evidence" IS NOT DISTINCT FROM OLD."approval_evidence" THEN
      RAISE EXCEPTION 'new independent approval evidence is required for long extension';
    END IF;

    PERFORM "exec006_assert_independent_approval"(
      NEW."tenant_id",
      NEW."branch_id",
      NEW."unit_id",
      NEW."initiated_by_user_id",
      NEW."approved_by_user_id",
      NEW."approval_evidence",
      v_permission,
      v_reference_time
    );
  END IF;

  IF NEW."commitment_type" = 'RESERVATION' AND
     NEW."status" = 'ACTIVE' AND
     NEW."converted_from_commitment_id" IS NULL THEN
    PERFORM "exec006_assert_independent_approval"(
      NEW."tenant_id",
      NEW."branch_id",
      NEW."unit_id",
      NEW."initiated_by_user_id",
      NEW."approved_by_user_id",
      NEW."approval_evidence",
      'RESERVATION_APPROVE',
      v_reference_time
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "unit_commitments_approval_policy_guard"
BEFORE INSERT OR UPDATE OF
  "status", "expires_at", "approved_by_user_id", "approval_evidence"
ON "unit_commitments"
FOR EACH ROW EXECUTE FUNCTION "exec006_validate_commitment_approval_policy"();

CREATE FUNCTION "exec006_guard_final_link_release"()
RETURNS TRIGGER AS $$
DECLARE
  v_effective_at TIMESTAMPTZ := COALESCE(NEW."updated_at", CURRENT_TIMESTAMP);
BEGIN
  IF OLD."status" IN ('PENDING', 'ACTIVE', 'PENDING_APPROVAL') AND
     NEW."status" IN ('RELEASED', 'CANCELLED') AND (
       EXISTS (
         SELECT 1 FROM "contracts" c
         WHERE c."tenant_id" = NEW."tenant_id"
           AND c."unit_id" = NEW."unit_id"
           AND upper(c."status") NOT IN (
             'CANCELLED', 'CANCELED', 'EXPIRED', 'REJECTED', 'VOID'
           )
       ) OR
       EXISTS (
         SELECT 1 FROM "rental_leases" r
         WHERE r."tenant_id" = NEW."tenant_id"
           AND r."unit_id" = NEW."unit_id"
           AND upper(r."status") NOT IN (
             'CANCELLED', 'CANCELED', 'EXPIRED', 'REJECTED', 'TERMINATED', 'VOID'
           )
           AND r."start_date" <= v_effective_at::DATE
           AND r."end_date" >= v_effective_at::DATE
       )
     ) THEN
    RAISE EXCEPTION 'final contractual link prevents commitment release';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "unit_commitments_final_link_release_guard"
BEFORE UPDATE OF "status" ON "unit_commitments"
FOR EACH ROW EXECUTE FUNCTION "exec006_guard_final_link_release"();

CREATE OR REPLACE FUNCTION "exec006_evaluate_unit_availability"(
  p_tenant_id UUID,
  p_unit_id UUID,
  p_now TIMESTAMPTZ
) RETURNS TABLE (
  availability_state TEXT,
  unit_id UUID,
  tenant_id UUID,
  branch_id UUID,
  evaluated_at TIMESTAMPTZ,
  blocking_commitment_id UUID,
  blocking_type TEXT,
  blocking_until TIMESTAMPTZ,
  reason_code TEXT,
  policy_version TEXT,
  source_version INTEGER
) AS $$
DECLARE
  v_source "unit_availability_sources"%ROWTYPE;
  v_blocker "unit_commitments"%ROWTYPE;
BEGIN
  SELECT * INTO v_source
  FROM "unit_availability_sources"
  WHERE "tenant_id" = p_tenant_id AND "unit_id" = p_unit_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT
      'UNKNOWN_FAIL_CLOSED'::TEXT,
      p_unit_id,
      p_tenant_id,
      NULL::UUID,
      p_now,
      NULL::UUID,
      NULL::TEXT,
      NULL::TIMESTAMPTZ,
      'MISSING_AVAILABILITY_SOURCE'::TEXT,
      'EXEC-006-v1'::TEXT,
      0;
    RETURN;
  END IF;

  IF v_source."consistency_state" <> 'CONSISTENT' OR
     v_source."base_state" = 'UNKNOWN' OR
     v_source."source_version" < 1 THEN
    RETURN QUERY SELECT
      'UNKNOWN_FAIL_CLOSED'::TEXT,
      p_unit_id,
      p_tenant_id,
      v_source."branch_id",
      p_now,
      NULL::UUID,
      NULL::TEXT,
      NULL::TIMESTAMPTZ,
      'INVENTORY_SOURCE_INCOMPLETE_OR_INCONSISTENT'::TEXT,
      v_source."policy_version",
      v_source."source_version";
    RETURN;
  END IF;

  IF v_source."base_state" = 'INACTIVE' THEN
    RETURN QUERY SELECT
      'INACTIVE'::TEXT,
      p_unit_id,
      p_tenant_id,
      v_source."branch_id",
      p_now,
      NULL::UUID,
      NULL::TEXT,
      NULL::TIMESTAMPTZ,
      'UNIT_INACTIVE'::TEXT,
      v_source."policy_version",
      v_source."source_version";
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM "contracts" c
    WHERE c."tenant_id" = p_tenant_id
      AND c."unit_id" = p_unit_id
      AND upper(c."status") NOT IN (
        'CANCELLED', 'CANCELED', 'EXPIRED', 'REJECTED', 'VOID'
      )
  ) OR EXISTS (
    SELECT 1 FROM "rental_leases" r
    WHERE r."tenant_id" = p_tenant_id
      AND r."unit_id" = p_unit_id
      AND upper(r."status") NOT IN (
        'CANCELLED', 'CANCELED', 'EXPIRED', 'REJECTED', 'TERMINATED', 'VOID'
      )
      AND r."start_date" <= p_now::DATE
      AND r."end_date" >= p_now::DATE
  ) THEN
    RETURN QUERY SELECT
      'CONTRACTUALLY_UNAVAILABLE'::TEXT,
      p_unit_id,
      p_tenant_id,
      v_source."branch_id",
      p_now,
      NULL::UUID,
      NULL::TEXT,
      NULL::TIMESTAMPTZ,
      'FINAL_CONTRACTUAL_LINK'::TEXT,
      v_source."policy_version",
      v_source."source_version";
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM "unit_operational_restrictions" r
    WHERE r."tenant_id" = p_tenant_id
      AND r."unit_id" = p_unit_id
      AND r."is_active" = TRUE
      AND r."effective_from" <= p_now
      AND (r."effective_until" IS NULL OR r."effective_until" > p_now)
  ) THEN
    RETURN QUERY SELECT
      'OPERATIONALLY_BLOCKED'::TEXT,
      p_unit_id,
      p_tenant_id,
      v_source."branch_id",
      p_now,
      NULL::UUID,
      NULL::TEXT,
      NULL::TIMESTAMPTZ,
      'ACTIVE_OPERATIONAL_RESTRICTION'::TEXT,
      v_source."policy_version",
      v_source."source_version";
    RETURN;
  END IF;

  SELECT * INTO v_blocker
  FROM "unit_commitments" c
  WHERE c."tenant_id" = p_tenant_id
    AND c."unit_id" = p_unit_id
    AND c."expires_at" > p_now
    AND c."status" IN ('PENDING', 'ACTIVE', 'PENDING_APPROVAL')
  ORDER BY c."created_at", c."id"
  LIMIT 1;

  IF FOUND THEN
    RETURN QUERY SELECT
      CASE WHEN v_blocker."commitment_type" = 'HOLD'
        THEN 'HELD' ELSE 'RESERVED' END::TEXT,
      p_unit_id,
      p_tenant_id,
      v_source."branch_id",
      p_now,
      v_blocker."id",
      v_blocker."commitment_type",
      v_blocker."expires_at",
      CASE WHEN v_blocker."commitment_type" = 'HOLD'
        THEN 'ACTIVE_HOLD' ELSE 'ACTIVE_RESERVATION' END::TEXT,
      v_source."policy_version",
      v_source."source_version";
    RETURN;
  END IF;

  RETURN QUERY SELECT
    'AVAILABLE'::TEXT,
    p_unit_id,
    p_tenant_id,
    v_source."branch_id",
    p_now,
    NULL::UUID,
    NULL::TEXT,
    NULL::TIMESTAMPTZ,
    'NO_ACTIVE_BLOCKER'::TEXT,
    v_source."policy_version",
    v_source."source_version";
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION "exec006_assert_independent_approval" IS
  'Validates elevated approval against a distinct active persisted EXEC-004 assignment.';
COMMENT ON TRIGGER "unit_commitments_final_link_release_guard" ON "unit_commitments" IS
  'Prevents releasing or cancelling an exclusive commitment while a final Contract or effective RentalLease links the Unit.';