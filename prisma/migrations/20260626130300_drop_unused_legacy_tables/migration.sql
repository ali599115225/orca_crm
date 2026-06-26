-- SCHEMA_GAP closure, Migration 3: drop tenant_integrations and
-- agent_provider_preferences -- created by the locked baseline migration
-- 20260623_settings_agents_architecture_final, with zero model in
-- schema.prisma and zero references anywhere in application code (confirmed
-- by repo-wide search). Five independent hard gates below must all pass
-- before either DROP TABLE runs; any failure aborts the whole migration via
-- RAISE EXCEPTION -- no partial drop, no guessing.

DO $migration$
DECLARE
    row_count INTEGER;
    dep_count INTEGER;
    dep_name TEXT;
BEGIN
    -- Gate 1: zero rows
    SELECT COUNT(*) INTO row_count FROM public.tenant_integrations;
    IF row_count > 0 THEN
        RAISE EXCEPTION 'tenant_integrations: % row(s) present -- refusing to drop', row_count;
    END IF;

    SELECT COUNT(*) INTO row_count FROM public.agent_provider_preferences;
    IF row_count > 0 THEN
        RAISE EXCEPTION 'agent_provider_preferences: % row(s) present -- refusing to drop', row_count;
    END IF;

    -- Gate 2: no inbound foreign keys (something else referencing these tables)
    SELECT COUNT(*), STRING_AGG(t.relname || '.' || c.conname, ', ')
    INTO dep_count, dep_name
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_class ft ON ft.oid = c.confrelid
    WHERE c.contype = 'f'
      AND ft.relname IN ('tenant_integrations', 'agent_provider_preferences');

    IF dep_count > 0 THEN
        RAISE EXCEPTION 'tenant_integrations/agent_provider_preferences: % inbound FK(s) found (%) -- refusing to drop', dep_count, dep_name;
    END IF;

    -- Gate 3: no views / materialized views depending on them
    SELECT COUNT(*), STRING_AGG(table_name, ', ')
    INTO dep_count, dep_name
    FROM information_schema.view_table_usage
    WHERE table_name IN ('tenant_integrations', 'agent_provider_preferences');

    IF dep_count > 0 THEN
        RAISE EXCEPTION 'tenant_integrations/agent_provider_preferences: % dependent view(s) found (%) -- refusing to drop', dep_count, dep_name;
    END IF;

    -- Gate 4: no triggers attached to them
    SELECT COUNT(*), STRING_AGG(tgname, ', ')
    INTO dep_count, dep_name
    FROM pg_trigger
    WHERE tgrelid IN ('public.tenant_integrations'::regclass, 'public.agent_provider_preferences'::regclass)
      AND NOT tgisinternal;

    IF dep_count > 0 THEN
        RAISE EXCEPTION 'tenant_integrations/agent_provider_preferences: % trigger(s) attached (%) -- refusing to drop', dep_count, dep_name;
    END IF;

    -- Gate 5: no function body text-references them (best-effort static check
    -- for dynamic SQL usage that wouldn't show up as a pg_depend object dependency)
    SELECT COUNT(*), STRING_AGG(proname, ', ')
    INTO dep_count, dep_name
    FROM pg_proc
    WHERE prosrc ILIKE '%tenant_integrations%' OR prosrc ILIKE '%agent_provider_preferences%';

    IF dep_count > 0 THEN
        RAISE EXCEPTION 'tenant_integrations/agent_provider_preferences: % function(s) reference them in source (%) -- refusing to drop', dep_count, dep_name;
    END IF;

    -- All five gates passed
    DROP TABLE public.tenant_integrations;
    DROP TABLE public.agent_provider_preferences;

    IF to_regclass('public.tenant_integrations') IS NOT NULL THEN
        RAISE EXCEPTION 'tenant_integrations: drop did not take effect';
    END IF;
    IF to_regclass('public.agent_provider_preferences') IS NOT NULL THEN
        RAISE EXCEPTION 'agent_provider_preferences: drop did not take effect';
    END IF;
END
$migration$;
