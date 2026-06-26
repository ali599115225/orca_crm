-- Restore the Audit Logs baseline. This table was never created through a
-- tracked Prisma migration; it was first introduced via the Prisma schema
-- (model AuditLog, see commit be33a7c) and materialized against the
-- database through `prisma db push`, never through `prisma migrate`.
--
-- Body verified byte-identical across three widely-spaced checkpoints
-- (be33a7c, ef38b60, and the immediate parent of the commit introducing
-- 20260624000100_saudi_trust_gates_foundation) -- the highest stability
-- confidence recorded in this entire baseline-closure effort. See
-- AUDIT_LOGS_TEMPORAL_BASELINE_BLUEPRINT.md.
--
-- FK scope: TENANT_ONLY. user_id is a raw, unconstrained UUID column (no
-- @relation ever declared for it in tracked history).
--
-- Columns/index added by the only dependent migration are intentionally
-- excluded (and that migration's own ADD COLUMN/CREATE INDEX statements are
-- already idempotent IF NOT EXISTS, so this exclusion carries no risk):
-- - gate_provider, gate_operation, gate_result, gate_reason, idempotency_key,
--   idx_audit_gate_result: added by 20260624000100_saudi_trust_gates_foundation

DO $migration$
DECLARE
    r RECORD;
    actual_type TEXT;
    actual_nullable TEXT;
    actual_default TEXT;
    matching_count INTEGER;
BEGIN
    ---------------------------------------------------------------------------
    -- audit_logs
    ---------------------------------------------------------------------------
    IF to_regclass('public.audit_logs') IS NULL THEN
        CREATE TABLE public.audit_logs (
            id UUID NOT NULL DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            user_id UUID,
            action TEXT NOT NULL,
            table_name TEXT NOT NULL,
            record_id TEXT NOT NULL,
            details TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT audit_logs_pkey PRIMARY KEY (id),
            CONSTRAINT audit_logs_tenant_id_fkey FOREIGN KEY (tenant_id)
                REFERENCES public.tenants(id) ON DELETE CASCADE
        );
    ELSE
        FOR r IN
            SELECT *
            FROM (
                VALUES
                    ('id',         'uuid',                     'NO',  'uuid',      NULL),
                    ('tenant_id',  'uuid',                     'NO',  'none',      NULL),
                    ('user_id',    'uuid',                     'YES', 'none',      NULL),
                    ('action',     'text',                     'NO',  'none',      NULL),
                    ('table_name', 'text',                     'NO',  'none',      NULL),
                    ('record_id',  'text',                     'NO',  'none',      NULL),
                    ('details',    'text',                     'YES', 'none',      NULL),
                    ('created_at', 'timestamp with time zone', 'NO',  'timestamp', NULL)
            ) AS expected(column_name, data_type, is_nullable, default_rule, default_token)
        LOOP
            SELECT c.data_type, c.is_nullable, c.column_default
            INTO actual_type, actual_nullable, actual_default
            FROM information_schema.columns c
            WHERE c.table_schema = 'public'
              AND c.table_name = 'audit_logs'
              AND c.column_name = r.column_name;

            IF NOT FOUND THEN
                RAISE EXCEPTION
                    'audit_logs.% is missing',
                    r.column_name;
            END IF;

            IF actual_type <> r.data_type THEN
                RAISE EXCEPTION
                    'audit_logs.%: type expected %, got %',
                    r.column_name, r.data_type, actual_type;
            END IF;

            IF actual_nullable <> r.is_nullable THEN
                RAISE EXCEPTION
                    'audit_logs.%: nullable expected %, got %',
                    r.column_name, r.is_nullable, actual_nullable;
            END IF;

            IF r.default_rule = 'none'
               AND actual_default IS NOT NULL THEN
                RAISE EXCEPTION
                    'audit_logs.%: expected no default, got %',
                    r.column_name, actual_default;

            ELSIF r.default_rule = 'uuid'
               AND COALESCE(actual_default, '') NOT ILIKE '%gen_random_uuid()%' THEN
                RAISE EXCEPTION
                    'audit_logs.%: expected gen_random_uuid() default, got %',
                    r.column_name, actual_default;

            ELSIF r.default_rule = 'timestamp'
               AND LOWER(COALESCE(actual_default, '')) NOT LIKE '%current_timestamp%'
               AND LOWER(COALESCE(actual_default, '')) NOT LIKE '%now()%' THEN
                RAISE EXCEPTION
                    'audit_logs.%: expected timestamp default, got %',
                    r.column_name, actual_default;
            END IF;
        END LOOP;

        SELECT COUNT(*)
        INTO matching_count
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE n.nspname = 'public'
          AND t.relname = 'audit_logs'
          AND c.contype = 'p'
          AND (
              SELECT ARRAY_AGG(a.attname::text ORDER BY key_column.ordinality)
              FROM UNNEST(c.conkey) WITH ORDINALITY
                   AS key_column(attnum, ordinality)
              JOIN pg_attribute a
                ON a.attrelid = c.conrelid
               AND a.attnum = key_column.attnum
          ) = ARRAY['id']::TEXT[];

        IF matching_count <> 1 THEN
            RAISE EXCEPTION
                'audit_logs: expected primary key on id';
        END IF;
    END IF;

    ---------------------------------------------------------------------------
    -- Indexes (created outside DO block for IF NOT EXISTS support)
    ---------------------------------------------------------------------------
END
$migration$;

CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id
    ON public.audit_logs (tenant_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
    ON public.audit_logs (created_at DESC);
