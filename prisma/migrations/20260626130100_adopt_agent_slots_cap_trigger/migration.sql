-- Pre-Flight Gate 0 (SCHEMA_GAP closure) verified, read-only, against a live
-- Production Clone (ep-empty-king-aqa15485/neondb) which of the database/*.sql
-- RLS policies / triggers / functions are actually load-bearing today:
--
--   pg_policies : 0 rows for tenants/users/leads/projects/tasks/tickets/
--                 agent_slots/usage_meters/payroll_commissions
--                 -> all 9 RLS policies in database/*.sql are dead, never applied.
--   pg_trigger  : only trigger_check_agent_slots_cap (on agent_slots) is present
--                 and enabled. trg_check_agent_slots, trg_leads_updated_at,
--                 trg_tickets_updated_at, trigger_leads_round_robin,
--                 trigger_sanitize_leads -> absent, dead.
--   pg_proc     : check_agent_slots_cap() and update_updated_at_column() exist;
--                 the other 5 target functions do not. update_updated_at_column()
--                 has zero triggers calling it (trg_leads_updated_at/
--                 trg_tickets_updated_at are absent) -> orphaned, not load-bearing,
--                 not ported.
--
-- Net result: exactly one function + one trigger are live and must survive a
-- migrate-reset/disaster-recovery rebuild. Adopted here verbatim, pulled
-- directly from pg_get_functiondef()/pg_get_triggerdef() on the live clone so
-- the text below is byte-identical to what is actually running -- not
-- reconstructed from database/patches/20260612_agent_slots_plan_alignment.sql
-- by hand (though that file's text matches exactly; see the comment added
-- there pointing back to this migration).
--
-- All other RLS policies / triggers / functions inventoried for this gate are
-- confirmed dead and are NOT ported -- see docs/SCHEMA_GAP_CLOSURE_REPORT.md
-- for the permanent, recorded cancellation of each one.

CREATE OR REPLACE FUNCTION public.check_agent_slots_cap()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
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
$function$;

DROP TRIGGER IF EXISTS trigger_check_agent_slots_cap ON public.agent_slots;

CREATE TRIGGER trigger_check_agent_slots_cap
BEFORE INSERT OR UPDATE OF is_active, tenant_id
ON public.agent_slots
FOR EACH ROW
WHEN (NEW.is_active = TRUE)
EXECUTE FUNCTION public.check_agent_slots_cap();
