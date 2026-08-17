-- EXEC-006 exact persisted-scope hardening.
-- Corrects a final-review finding where DEPARTMENT/TEAM assignments were
-- previously treated as branch-wide and ASSIGNED_RESOURCE did not prove the
-- declared resource type against the persisted resource. Repository evidence
-- and disposable PostgreSQL validation only; no Production execution/Backfill.

CREATE OR REPLACE FUNCTION "exec006_assert_scope_assignment"(
  p_tenant_id UUID,
  p_actor_user_id UUID,
  p_assignment_id UUID,
  p_branch_id UUID,
  p_resource_id UUID,
  p_permission TEXT,
  p_now TIMESTAMPTZ
) RETURNS VOID AS $$
DECLARE
  v_assignment "user_scope_assignments"%ROWTYPE;
  v_allowed BOOLEAN := FALSE;
BEGIN
  SELECT assignment_record.* INTO v_assignment
  FROM "user_scope_assignments" AS assignment_record
  WHERE assignment_record."id" = p_assignment_id
    AND assignment_record."tenant_id" = p_tenant_id
    AND assignment_record."user_id" = p_actor_user_id
    AND assignment_record."is_active" = TRUE
    AND (
      assignment_record."starts_at" IS NULL OR
      assignment_record."starts_at" <= p_now
    )
    AND (
      assignment_record."ends_at" IS NULL OR
      assignment_record."ends_at" > p_now
    );

  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing or expired persisted scope assignment';
  END IF;

  CASE v_assignment."scope_type"
    WHEN 'COMPANY' THEN
      v_allowed := TRUE;
    WHEN 'BRANCH' THEN
      v_allowed := v_assignment."branch_id" = p_branch_id;
    WHEN 'DEPARTMENT' THEN
      -- EXEC-006 resources do not persist department identity. Treating the
      -- parent branch as sufficient would expand the assignment, so fail closed.
      v_allowed := FALSE;
    WHEN 'TEAM' THEN
      -- EXEC-006 resources do not persist team identity. Exact matching cannot
      -- be proved at this boundary, therefore the assignment cannot authorize it.
      v_allowed := FALSE;
    WHEN 'ASSIGNED_RESOURCE' THEN
      v_allowed :=
        (v_assignment."branch_id" IS NULL OR
         v_assignment."branch_id" = p_branch_id) AND
        (
          (
            v_assignment."assigned_resource_type" = 'UNIT' AND
            v_assignment."assigned_resource_id" = p_resource_id AND
            EXISTS (
              SELECT 1
              FROM "unit_availability_sources" AS source_record
              WHERE source_record."tenant_id" = p_tenant_id
                AND source_record."unit_id" = p_resource_id
                AND source_record."branch_id" = p_branch_id
            )
          ) OR
          (
            v_assignment."assigned_resource_type" = 'UNIT_COMMITMENT' AND
            v_assignment."assigned_resource_id" = p_resource_id AND
            EXISTS (
              SELECT 1
              FROM "unit_commitments" AS commitment_record
              WHERE commitment_record."tenant_id" = p_tenant_id
                AND commitment_record."id" = p_resource_id
                AND commitment_record."branch_id" = p_branch_id
            )
          ) OR
          (
            v_assignment."assigned_resource_type" = 'TOUR_APPOINTMENT' AND
            v_assignment."assigned_resource_id" = p_resource_id AND
            EXISTS (
              SELECT 1
              FROM "tour_appointments_v2" AS tour_record
              WHERE tour_record."tenant_id" = p_tenant_id
                AND tour_record."id" = p_resource_id
                AND tour_record."branch_id" = p_branch_id
            )
          )
        );
    ELSE
      v_allowed := FALSE;
  END CASE;

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'persisted assignment does not exactly cover resource scope';
  END IF;

  IF v_assignment."security_role" IN (
       'PLATFORM_OWNER', 'SYSTEM_ADMINISTRATOR'
     ) AND p_permission NOT IN (
       'UNIT_AVAILABILITY_READ', 'COMMITMENT_AUDIT_READ'
     ) THEN
    RAISE EXCEPTION 'technical role has no automatic commercial authority';
  END IF;

  IF p_permission IN (
       'RESERVATION_APPROVE', 'RESERVATION_EXTEND',
       'RESERVATION_RELEASE', 'RESERVATION_CANCEL', 'RESERVATION_CONVERT'
     ) AND v_assignment."security_role" NOT IN (
       'GENERAL_MANAGER', 'OPERATIONS_MANAGER',
       'BRANCH_MANAGER', 'SALES_LEASING_MANAGER'
     ) THEN
    RAISE EXCEPTION 'role lacks reservation authority';
  END IF;

  IF p_permission = 'UNIT_HOLD_OVERRIDE' AND
     v_assignment."security_role" NOT IN (
       'GENERAL_MANAGER', 'OPERATIONS_MANAGER'
     ) THEN
    RAISE EXCEPTION 'role lacks hold override authority';
  END IF;

  IF p_permission IN (
       'UNIT_HOLD_CREATE', 'UNIT_HOLD_EXTEND', 'UNIT_HOLD_RELEASE',
       'RESERVATION_CREATE', 'TOUR_CREATE', 'TOUR_CONFIRM',
       'TOUR_RESCHEDULE', 'TOUR_COMPLETE', 'TOUR_CANCEL'
     ) AND v_assignment."security_role" NOT IN (
       'GENERAL_MANAGER', 'OPERATIONS_MANAGER', 'BRANCH_MANAGER',
       'SALES_LEASING_MANAGER', 'BROKER_AGENT'
     ) THEN
    RAISE EXCEPTION 'role lacks EXEC-006 commercial authority';
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "exec006_assert_independent_approval"(
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

  IF v_evidence_actor IS NULL OR
     v_evidence_actor <> p_approved_by_user_id THEN
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
    SELECT assignment_record."id" INTO v_assignment_id
    FROM "user_scope_assignments" AS assignment_record
    WHERE assignment_record."tenant_id" = p_tenant_id
      AND assignment_record."user_id" = v_evidence_actor
      AND assignment_record."is_active" = TRUE
      AND (
        assignment_record."starts_at" IS NULL OR
        assignment_record."starts_at" <= p_now
      )
      AND (
        assignment_record."ends_at" IS NULL OR
        assignment_record."ends_at" > p_now
      )
      AND (
        assignment_record."scope_type" = 'COMPANY' OR
        (
          assignment_record."scope_type" = 'BRANCH' AND
          assignment_record."branch_id" = p_branch_id
        ) OR
        (
          assignment_record."scope_type" = 'ASSIGNED_RESOURCE' AND
          (
            assignment_record."branch_id" IS NULL OR
            assignment_record."branch_id" = p_branch_id
          ) AND
          assignment_record."assigned_resource_id" = p_resource_id AND
          (
            (
              assignment_record."assigned_resource_type" = 'UNIT' AND
              EXISTS (
                SELECT 1
                FROM "unit_availability_sources" AS source_record
                WHERE source_record."tenant_id" = p_tenant_id
                  AND source_record."unit_id" = p_resource_id
                  AND source_record."branch_id" = p_branch_id
              )
            ) OR
            (
              assignment_record."assigned_resource_type" = 'UNIT_COMMITMENT' AND
              EXISTS (
                SELECT 1
                FROM "unit_commitments" AS commitment_record
                WHERE commitment_record."tenant_id" = p_tenant_id
                  AND commitment_record."id" = p_resource_id
                  AND commitment_record."branch_id" = p_branch_id
              )
            ) OR
            (
              assignment_record."assigned_resource_type" = 'TOUR_APPOINTMENT' AND
              EXISTS (
                SELECT 1
                FROM "tour_appointments_v2" AS tour_record
                WHERE tour_record."tenant_id" = p_tenant_id
                  AND tour_record."id" = p_resource_id
                  AND tour_record."branch_id" = p_branch_id
              )
            )
          )
        )
      )
    ORDER BY
      CASE assignment_record."scope_type"
        WHEN 'COMPANY' THEN 0
        WHEN 'BRANCH' THEN 1
        ELSE 2
      END,
      assignment_record."created_at",
      assignment_record."id"
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

CREATE FUNCTION "exec006_validate_tour_staff_exact_scope"()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM "user_scope_assignments" AS assignment_record
    WHERE assignment_record."tenant_id" = NEW."tenant_id"
      AND assignment_record."user_id" = NEW."staff_user_id"
      AND assignment_record."is_active" = TRUE
      AND (
        assignment_record."starts_at" IS NULL OR
        assignment_record."starts_at" <= NEW."updated_at"
      )
      AND (
        assignment_record."ends_at" IS NULL OR
        assignment_record."ends_at" > NEW."updated_at"
      )
      AND (
        assignment_record."scope_type" = 'COMPANY' OR
        (
          assignment_record."scope_type" = 'BRANCH' AND
          assignment_record."branch_id" = NEW."branch_id"
        ) OR
        (
          assignment_record."scope_type" = 'ASSIGNED_RESOURCE' AND
          (
            assignment_record."branch_id" IS NULL OR
            assignment_record."branch_id" = NEW."branch_id"
          ) AND (
            (
              NEW."unit_id" IS NOT NULL AND
              assignment_record."assigned_resource_type" = 'UNIT' AND
              assignment_record."assigned_resource_id" = NEW."unit_id"
            ) OR
            (
              assignment_record."assigned_resource_type" = 'TOUR_APPOINTMENT' AND
              assignment_record."assigned_resource_id" = NEW."id"
            )
          )
        )
      )
  ) THEN
    RAISE EXCEPTION 'scheduled staff lacks exact persisted resource scope';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "00_tour_appointments_v2_staff_exact_scope_guard"
BEFORE INSERT OR UPDATE OF
  "tenant_id", "branch_id", "unit_id", "staff_user_id", "updated_at"
ON "tour_appointments_v2"
FOR EACH ROW EXECUTE FUNCTION "exec006_validate_tour_staff_exact_scope"();

COMMENT ON FUNCTION "exec006_assert_scope_assignment" IS
  'Requires exact COMPANY/BRANCH or persisted typed resource coverage; DEPARTMENT/TEAM fail closed because EXEC-006 resources carry no department/team identity.';
COMMENT ON FUNCTION "exec006_assert_independent_approval" IS
  'Requires a distinct persisted approver assignment with exact EXEC-006 scope; branch identity alone cannot elevate DEPARTMENT/TEAM assignments.';
COMMENT ON FUNCTION "exec006_validate_tour_staff_exact_scope" IS
  'Prevents branch-wide scheduling through narrower DEPARTMENT/TEAM assignments and verifies typed assigned-resource coverage.';
