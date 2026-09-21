-- EXEC-006 conversion/expiry race hardening.
-- Replaces only the reconciliation function after disposable PostgreSQL
-- demonstrated that SKIP LOCKED could leave an expired ACTIVE row when a
-- concurrent conversion held the row and then rolled back.
-- No Production execution, customer-data mutation or Backfill is authorized.

CREATE OR REPLACE FUNCTION "exec006_reconcile_expired_commitments"(
  p_tenant_id UUID,
  p_actor_user_id UUID,
  p_assignment_id UUID,
  p_limit INTEGER,
  p_cursor UUID,
  p_correlation_id TEXT,
  p_now TIMESTAMPTZ
) RETURNS TABLE (processed INTEGER, expired INTEGER, next_cursor UUID) AS $$
DECLARE
  v_candidate_id UUID;
  v_row "unit_commitments"%ROWTYPE;
  v_after "unit_commitments"%ROWTYPE;
  v_seen INTEGER := 0;
  v_expired INTEGER := 0;
  v_last_candidate UUID := NULL;
  v_permission TEXT;
BEGIN
  IF p_limit < 1 OR p_limit > 500 THEN
    RAISE EXCEPTION 'reconciliation batch limit must be between 1 and 500';
  END IF;
  IF char_length(btrim(COALESCE(p_correlation_id, ''))) = 0 THEN
    RAISE EXCEPTION 'reconciliation correlation ID is required';
  END IF;

  FOR v_candidate_id IN
    SELECT commitment_candidate."id"
    FROM "unit_commitments" AS commitment_candidate
    WHERE commitment_candidate."tenant_id" = p_tenant_id
      AND commitment_candidate."expires_at" <= p_now
      AND commitment_candidate."status" IN (
        'PENDING', 'ACTIVE', 'PENDING_APPROVAL'
      )
      AND (p_cursor IS NULL OR commitment_candidate."id" > p_cursor)
    ORDER BY commitment_candidate."id"
    LIMIT p_limit
  LOOP
    v_seen := v_seen + 1;
    v_last_candidate := v_candidate_id;

    -- Wait for the selected row instead of skipping it. After a concurrent
    -- conversion commits or rolls back, re-read the persisted state under lock.
    SELECT commitment_current.* INTO v_row
    FROM "unit_commitments" AS commitment_current
    WHERE commitment_current."tenant_id" = p_tenant_id
      AND commitment_current."id" = v_candidate_id
    FOR UPDATE;

    IF NOT FOUND THEN
      CONTINUE;
    END IF;

    PERFORM pg_advisory_xact_lock(
      hashtextextended(
        p_tenant_id::TEXT || ':' || v_row."unit_id"::TEXT,
        0
      )
    );

    -- Recheck after waiting. A successful competing transition is preserved;
    -- an expired still-blocking row is reconciled exactly once.
    IF v_row."expires_at" > p_now OR
       v_row."status" NOT IN ('PENDING', 'ACTIVE', 'PENDING_APPROVAL') THEN
      CONTINUE;
    END IF;

    v_permission := CASE
      WHEN v_row."commitment_type" = 'HOLD'
        THEN 'UNIT_HOLD_RELEASE'
      ELSE 'RESERVATION_RELEASE'
    END;

    PERFORM "exec006_assert_scope_assignment"(
      p_tenant_id,
      p_actor_user_id,
      p_assignment_id,
      v_row."branch_id",
      v_row."id",
      v_permission,
      p_now
    );

    UPDATE "unit_commitments" AS commitment_update
    SET
      "status" = 'EXPIRED',
      "version" = commitment_update."version" + 1,
      "updated_at" = p_now
    WHERE commitment_update."tenant_id" = p_tenant_id
      AND commitment_update."id" = v_row."id"
      AND commitment_update."version" = v_row."version"
      AND commitment_update."expires_at" <= p_now
      AND commitment_update."status" IN (
        'PENDING', 'ACTIVE', 'PENDING_APPROVAL'
      )
    RETURNING commitment_update.* INTO v_after;

    IF NOT FOUND THEN
      CONTINUE;
    END IF;

    INSERT INTO "unit_commitment_history" (
      "tenant_id",
      "branch_id",
      "unit_id",
      "commitment_id",
      "action",
      "previous_state",
      "next_state",
      "reason",
      "actor_user_id",
      "assignment_id",
      "correlation_id",
      "policy_version",
      "expiry_before",
      "expiry_after",
      "occurred_at"
    ) VALUES (
      p_tenant_id,
      v_row."branch_id",
      v_row."unit_id",
      v_row."id",
      'RECONCILE_EXPIRED',
      to_jsonb(v_row),
      to_jsonb(v_after),
      'server expiry reconciliation',
      p_actor_user_id,
      p_assignment_id,
      p_correlation_id,
      'EXEC-006-v1',
      v_row."expires_at",
      v_after."expires_at",
      p_now
    );

    INSERT INTO "unit_commitment_audit" (
      "tenant_id",
      "actor_user_id",
      "assignment_id",
      "branch_id",
      "unit_id",
      "commitment_id",
      "action",
      "previous_state",
      "next_state",
      "reason",
      "correlation_id",
      "policy_version",
      "expiry_before",
      "expiry_after",
      "occurred_at"
    ) VALUES (
      p_tenant_id,
      p_actor_user_id,
      p_assignment_id,
      v_row."branch_id",
      v_row."unit_id",
      v_row."id",
      'RECONCILE_EXPIRED',
      to_jsonb(v_row),
      to_jsonb(v_after),
      'server expiry reconciliation',
      p_correlation_id,
      'EXEC-006-v1',
      v_row."expires_at",
      v_after."expires_at",
      p_now
    );

    v_expired := v_expired + 1;
  END LOOP;

  processed := v_seen;
  expired := v_expired;
  next_cursor := CASE
    WHEN v_seen = p_limit THEN v_last_candidate
    ELSE NULL
  END;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION "exec006_reconcile_expired_commitments" IS
  'Bounded same-tenant expiry reconciliation that waits for concurrent row transitions, rechecks state and records append-only History/Audit.';