\set ON_ERROR_STOP on

BEGIN;

-- Stable disposable-fixture identities. The preceding concurrency drill creates
-- Tenant A, Branch A, the grantor, Party A and the EXEC-006 schema.
INSERT INTO "users" (
  "id", "tenant_id", "name", "email", "password_hash", "role"
) VALUES
  ('00000000-0000-0000-0000-000000000211', '00000000-0000-0000-0000-000000000101', 'Department Actor', 'exec006-department-actor@example.test', 'x', 'SALES_EMPLOYEE'),
  ('00000000-0000-0000-0000-000000000212', '00000000-0000-0000-0000-000000000101', 'Team Actor', 'exec006-team-actor@example.test', 'x', 'SALES_EMPLOYEE'),
  ('00000000-0000-0000-0000-000000000213', '00000000-0000-0000-0000-000000000101', 'Wrong Resource Actor', 'exec006-wrong-resource@example.test', 'x', 'SALES_EMPLOYEE'),
  ('00000000-0000-0000-0000-000000000214', '00000000-0000-0000-0000-000000000101', 'Unit Resource Actor', 'exec006-unit-resource@example.test', 'x', 'SALES_EMPLOYEE');

INSERT INTO "organization_departments" (
  "id", "tenant_id", "branch_id", "code", "name", "is_central"
) VALUES (
  '00000000-0000-0000-0000-000000000311',
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000301',
  'EXD1',
  'Exact Scope Department',
  FALSE
);

INSERT INTO "organization_teams" (
  "id", "tenant_id", "branch_id", "department_id", "code", "name"
) VALUES (
  '00000000-0000-0000-0000-000000000312',
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000301',
  '00000000-0000-0000-0000-000000000311',
  'EXT1',
  'Exact Scope Team'
);

INSERT INTO "units" (
  "id", "tenant_id", "project_id", "unit_number", "floor_position",
  "price_sar", "type", "area", "status"
) VALUES (
  '00000000-0000-0000-0000-000000000609',
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000501',
  'A-9',
  9,
  100000,
  'Apartment',
  '100 m2',
  'Available'
);

INSERT INTO "unit_availability_sources" (
  "tenant_id", "unit_id", "branch_id", "project_id", "unit_type",
  "base_state", "consistency_state", "source_version", "policy_version",
  "legacy_projection_status", "updated_by_user_id"
) VALUES (
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000609',
  '00000000-0000-0000-0000-000000000301',
  '00000000-0000-0000-0000-000000000501',
  'Apartment',
  'ACTIVE',
  'CONSISTENT',
  1,
  'EXEC-006-v1',
  'Available',
  '00000000-0000-0000-0000-000000000201'
);

INSERT INTO "user_scope_assignments" (
  "id", "tenant_id", "user_id", "security_role", "scope_type",
  "branch_id", "department_id", "team_id", "assigned_resource_type",
  "assigned_resource_id", "is_active", "assigned_by_user_id"
) VALUES
  (
    '00000000-0000-0000-0000-000000000411',
    '00000000-0000-0000-0000-000000000101',
    '00000000-0000-0000-0000-000000000211',
    'SALES_LEASING_MANAGER',
    'DEPARTMENT',
    '00000000-0000-0000-0000-000000000301',
    '00000000-0000-0000-0000-000000000311',
    NULL,
    NULL,
    NULL,
    TRUE,
    '00000000-0000-0000-0000-000000000202'
  ),
  (
    '00000000-0000-0000-0000-000000000412',
    '00000000-0000-0000-0000-000000000101',
    '00000000-0000-0000-0000-000000000212',
    'SALES_LEASING_MANAGER',
    'TEAM',
    '00000000-0000-0000-0000-000000000301',
    '00000000-0000-0000-0000-000000000311',
    '00000000-0000-0000-0000-000000000312',
    NULL,
    NULL,
    TRUE,
    '00000000-0000-0000-0000-000000000202'
  ),
  (
    '00000000-0000-0000-0000-000000000413',
    '00000000-0000-0000-0000-000000000101',
    '00000000-0000-0000-0000-000000000213',
    'SALES_LEASING_MANAGER',
    'ASSIGNED_RESOURCE',
    '00000000-0000-0000-0000-000000000301',
    NULL,
    NULL,
    'TOUR_APPOINTMENT',
    '00000000-0000-0000-0000-000000000609',
    TRUE,
    '00000000-0000-0000-0000-000000000202'
  ),
  (
    '00000000-0000-0000-0000-000000000414',
    '00000000-0000-0000-0000-000000000101',
    '00000000-0000-0000-0000-000000000214',
    'SALES_LEASING_MANAGER',
    'ASSIGNED_RESOURCE',
    '00000000-0000-0000-0000-000000000301',
    NULL,
    NULL,
    'UNIT',
    '00000000-0000-0000-0000-000000000609',
    TRUE,
    '00000000-0000-0000-0000-000000000202'
  );

DO $$
BEGIN
  BEGIN
    PERFORM "exec006_assert_scope_assignment"(
      '00000000-0000-0000-0000-000000000101',
      '00000000-0000-0000-0000-000000000211',
      '00000000-0000-0000-0000-000000000411',
      '00000000-0000-0000-0000-000000000301',
      '00000000-0000-0000-0000-000000000609',
      'UNIT_HOLD_CREATE',
      '2026-07-26T12:00:00.000Z'
    );
    RAISE EXCEPTION 'department assignment unexpectedly authorized branch-wide access';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'department assignment unexpectedly authorized branch-wide access' THEN
      RAISE;
    END IF;
    IF SQLERRM NOT LIKE '%does not exactly cover resource scope%' THEN
      RAISE;
    END IF;
  END;

  BEGIN
    PERFORM "exec006_assert_scope_assignment"(
      '00000000-0000-0000-0000-000000000101',
      '00000000-0000-0000-0000-000000000212',
      '00000000-0000-0000-0000-000000000412',
      '00000000-0000-0000-0000-000000000301',
      '00000000-0000-0000-0000-000000000609',
      'UNIT_HOLD_CREATE',
      '2026-07-26T12:00:00.000Z'
    );
    RAISE EXCEPTION 'team assignment unexpectedly authorized branch-wide access';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'team assignment unexpectedly authorized branch-wide access' THEN
      RAISE;
    END IF;
    IF SQLERRM NOT LIKE '%does not exactly cover resource scope%' THEN
      RAISE;
    END IF;
  END;

  BEGIN
    PERFORM "exec006_assert_scope_assignment"(
      '00000000-0000-0000-0000-000000000101',
      '00000000-0000-0000-0000-000000000213',
      '00000000-0000-0000-0000-000000000413',
      '00000000-0000-0000-0000-000000000301',
      '00000000-0000-0000-0000-000000000609',
      'UNIT_HOLD_CREATE',
      '2026-07-26T12:00:00.000Z'
    );
    RAISE EXCEPTION 'wrong resource type unexpectedly authorized Unit access';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'wrong resource type unexpectedly authorized Unit access' THEN
      RAISE;
    END IF;
    IF SQLERRM NOT LIKE '%does not exactly cover resource scope%' THEN
      RAISE;
    END IF;
  END;

  -- Positive control: the persisted UNIT assignment matches both type and ID.
  PERFORM "exec006_assert_scope_assignment"(
    '00000000-0000-0000-0000-000000000101',
    '00000000-0000-0000-0000-000000000214',
    '00000000-0000-0000-0000-000000000414',
    '00000000-0000-0000-0000-000000000301',
    '00000000-0000-0000-0000-000000000609',
    'UNIT_HOLD_CREATE',
    '2026-07-26T12:00:00.000Z'
  );
END;
$$;

DO $$
BEGIN
  BEGIN
    INSERT INTO "tour_appointments_v2" (
      "id", "tenant_id", "branch_id", "unit_id", "staff_user_id",
      "party_id", "status", "start_at_utc", "end_at_utc", "timezone",
      "location", "unit_overlap_blocked", "created_by_user_id",
      "updated_by_user_id", "created_at", "updated_at"
    ) VALUES (
      '00000000-0000-0000-0000-000000000901',
      '00000000-0000-0000-0000-000000000101',
      '00000000-0000-0000-0000-000000000301',
      '00000000-0000-0000-0000-000000000609',
      '00000000-0000-0000-0000-000000000211',
      '00000000-0000-0000-0000-000000000701',
      'REQUESTED',
      '2026-08-01T08:00:00.000Z',
      '2026-08-01T09:00:00.000Z',
      'Asia/Riyadh',
      'Exact scope negative control',
      TRUE,
      '00000000-0000-0000-0000-000000000201',
      '00000000-0000-0000-0000-000000000201',
      '2026-07-26T12:00:00.000Z',
      '2026-07-26T12:00:00.000Z'
    );
    RAISE EXCEPTION 'department-scoped staff was scheduled branch-wide';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'department-scoped staff was scheduled branch-wide' THEN
      RAISE;
    END IF;
    IF SQLERRM NOT LIKE '%lacks exact persisted resource scope%' THEN
      RAISE;
    END IF;
  END;

  -- Positive control: a staff assignment to this exact UNIT is schedulable.
  INSERT INTO "tour_appointments_v2" (
    "id", "tenant_id", "branch_id", "unit_id", "staff_user_id",
    "party_id", "status", "start_at_utc", "end_at_utc", "timezone",
    "location", "unit_overlap_blocked", "created_by_user_id",
    "updated_by_user_id", "created_at", "updated_at"
  ) VALUES (
    '00000000-0000-0000-0000-000000000902',
    '00000000-0000-0000-0000-000000000101',
    '00000000-0000-0000-0000-000000000301',
    '00000000-0000-0000-0000-000000000609',
    '00000000-0000-0000-0000-000000000214',
    '00000000-0000-0000-0000-000000000701',
    'REQUESTED',
    '2026-08-01T10:00:00.000Z',
    '2026-08-01T11:00:00.000Z',
    'Asia/Riyadh',
    'Exact scope positive control',
    TRUE,
    '00000000-0000-0000-0000-000000000201',
    '00000000-0000-0000-0000-000000000201',
    '2026-07-26T12:00:00.000Z',
    '2026-07-26T12:00:00.000Z'
  );
END;
$$;

SELECT
  'exec006_exact_scope=PASS' AS result,
  'department_branch_expansion=false' AS department_scope,
  'team_branch_expansion=false' AS team_scope,
  'typed_resource_match=true' AS assigned_resource_scope,
  'tour_staff_exact_scope=true' AS tour_staff_scope;

ROLLBACK;
