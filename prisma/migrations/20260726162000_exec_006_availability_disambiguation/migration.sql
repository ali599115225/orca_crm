-- EXEC-006 availability function disambiguation.
-- Corrective additive migration for disposable validation only in this package.
-- No Production execution, customer-data mutation or backfill is authorized.

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
  SELECT availability_source.* INTO v_source
  FROM "unit_availability_sources" AS availability_source
  WHERE availability_source."tenant_id" = p_tenant_id
    AND availability_source."unit_id" = p_unit_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT
      'UNKNOWN_FAIL_CLOSED'::TEXT, p_unit_id, p_tenant_id, NULL::UUID, p_now,
      NULL::UUID, NULL::TEXT, NULL::TIMESTAMPTZ,
      'MISSING_AVAILABILITY_SOURCE'::TEXT, 'EXEC-006-v1'::TEXT, 0;
    RETURN;
  END IF;

  IF v_source."consistency_state" <> 'CONSISTENT' OR
     v_source."base_state" = 'UNKNOWN' OR v_source."source_version" < 1 THEN
    RETURN QUERY SELECT
      'UNKNOWN_FAIL_CLOSED'::TEXT, p_unit_id, p_tenant_id, v_source."branch_id", p_now,
      NULL::UUID, NULL::TEXT, NULL::TIMESTAMPTZ,
      'INVENTORY_SOURCE_INCOMPLETE_OR_INCONSISTENT'::TEXT,
      v_source."policy_version", v_source."source_version";
    RETURN;
  END IF;

  IF v_source."base_state" = 'INACTIVE' THEN
    RETURN QUERY SELECT
      'INACTIVE'::TEXT, p_unit_id, p_tenant_id, v_source."branch_id", p_now,
      NULL::UUID, NULL::TEXT, NULL::TIMESTAMPTZ,
      'UNIT_INACTIVE'::TEXT, v_source."policy_version", v_source."source_version";
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM "contracts" AS contract_record
    WHERE contract_record."tenant_id" = p_tenant_id
      AND contract_record."unit_id" = p_unit_id
      AND upper(contract_record."status") NOT IN
        ('CANCELLED', 'CANCELED', 'EXPIRED', 'REJECTED')
  ) THEN
    RETURN QUERY SELECT
      'CONTRACTUALLY_UNAVAILABLE'::TEXT, p_unit_id, p_tenant_id,
      v_source."branch_id", p_now, NULL::UUID, NULL::TEXT, NULL::TIMESTAMPTZ,
      'FINAL_CONTRACTUAL_LINK'::TEXT,
      v_source."policy_version", v_source."source_version";
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM "unit_operational_restrictions" AS restriction_record
    WHERE restriction_record."tenant_id" = p_tenant_id
      AND restriction_record."unit_id" = p_unit_id
      AND restriction_record."is_active" = TRUE
      AND restriction_record."effective_from" <= p_now
      AND (
        restriction_record."effective_until" IS NULL OR
        restriction_record."effective_until" > p_now
      )
  ) THEN
    RETURN QUERY SELECT
      'OPERATIONALLY_BLOCKED'::TEXT, p_unit_id, p_tenant_id,
      v_source."branch_id", p_now, NULL::UUID, NULL::TEXT, NULL::TIMESTAMPTZ,
      'ACTIVE_OPERATIONAL_RESTRICTION'::TEXT,
      v_source."policy_version", v_source."source_version";
    RETURN;
  END IF;

  SELECT commitment_record.* INTO v_blocker
  FROM "unit_commitments" AS commitment_record
  WHERE commitment_record."tenant_id" = p_tenant_id
    AND commitment_record."unit_id" = p_unit_id
    AND commitment_record."expires_at" > p_now
    AND commitment_record."status" IN ('PENDING', 'ACTIVE', 'PENDING_APPROVAL')
  ORDER BY commitment_record."created_at", commitment_record."id"
  LIMIT 1;

  IF FOUND THEN
    RETURN QUERY SELECT
      CASE WHEN v_blocker."commitment_type" = 'HOLD'
        THEN 'HELD' ELSE 'RESERVED' END::TEXT,
      p_unit_id, p_tenant_id, v_source."branch_id", p_now,
      v_blocker."id", v_blocker."commitment_type", v_blocker."expires_at",
      CASE WHEN v_blocker."commitment_type" = 'HOLD'
        THEN 'ACTIVE_HOLD' ELSE 'ACTIVE_RESERVATION' END::TEXT,
      v_source."policy_version", v_source."source_version";
    RETURN;
  END IF;

  RETURN QUERY SELECT
    'AVAILABLE'::TEXT, p_unit_id, p_tenant_id, v_source."branch_id", p_now,
    NULL::UUID, NULL::TEXT, NULL::TIMESTAMPTZ,
    'NO_ACTIVE_BLOCKER'::TEXT, v_source."policy_version", v_source."source_version";
END;
$$ LANGUAGE plpgsql STABLE;
