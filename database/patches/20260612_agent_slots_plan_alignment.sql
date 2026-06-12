-- ============================================================
-- Patch: Agent Slots Plan Alignment
-- Date: 2026-06-13
-- Aligns DB trigger limits with lib/plan-guard.ts
-- ============================================================
-- Drops conflicting triggers from:
--   database/agent_systems.sql (old)
--   database/migrations/rls_and_trigger.sql (deprecated taxonomy)
-- Creates unified trigger with basic/silver/gold limits.
-- ============================================================

-- Drop ALL conflicting triggers
DROP TRIGGER IF EXISTS trg_check_agent_slots ON public.agent_slots;
DROP TRIGGER IF EXISTS trigger_check_agent_slots_cap ON public.agent_slots;

-- Drop old function variants
DROP FUNCTION IF EXISTS public.check_agent_slots_cap_logic();
DROP FUNCTION IF EXISTS public.check_agent_slots_cap();

-- Create unified function matching plan-guard.ts limits
CREATE OR REPLACE FUNCTION public.check_agent_slots_cap()
RETURNS TRIGGER AS $$
DECLARE
  tenant_plan TEXT;
  active_slots_count INT;
  max_slots INT;
BEGIN
  SELECT LOWER(COALESCE(subscription_plan, 'basic'))
  INTO tenant_plan
  FROM public.tenants
  WHERE id = NEW.tenant_id;

  IF tenant_plan IS NULL THEN
    tenant_plan := 'basic';
  END IF;

  CASE tenant_plan
    WHEN 'basic'       THEN max_slots := 1;
    WHEN 'starter'     THEN max_slots := 1;

    WHEN 'silver'      THEN max_slots := 2;
    WHEN 'pro'         THEN max_slots := 2;
    WHEN 'professional'THEN max_slots := 2;

    WHEN 'gold'        THEN max_slots := 5;
    WHEN 'diamond'     THEN max_slots := 5;
    WHEN 'platinum'    THEN max_slots := 5;
    WHEN 'enterprise'  THEN max_slots := 5;

    ELSE max_slots := 1;
  END CASE;

  IF TG_OP = 'UPDATE' THEN
    SELECT COUNT(*)
    INTO active_slots_count
    FROM public.agent_slots
    WHERE tenant_id = NEW.tenant_id
      AND is_active = TRUE
      AND id <> NEW.id;
  ELSE
    SELECT COUNT(*)
    INTO active_slots_count
    FROM public.agent_slots
    WHERE tenant_id = NEW.tenant_id
      AND is_active = TRUE;
  END IF;

  IF active_slots_count >= max_slots THEN
    RAISE EXCEPTION 'CAP LOCK: max % active agent slots for plan %. Current: %.',
      max_slots, tenant_plan, active_slots_count
    USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create single unified trigger (covers INSERT + UPDATE reactivation)
CREATE TRIGGER trigger_check_agent_slots_cap
BEFORE INSERT OR UPDATE OF is_active, tenant_id
ON public.agent_slots
FOR EACH ROW
WHEN (NEW.is_active = TRUE)
EXECUTE FUNCTION public.check_agent_slots_cap();
