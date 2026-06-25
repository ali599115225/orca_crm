-- Restore the Sentinel Command Layer baseline that was originally applied
-- through database/patches/20260613_add_sentinel_tables.sql.
--
-- execution_payload is intentionally excluded because it is added by:
-- 20260613_add_execution_payload_to_sentinel_task_orders

DO $migration$
DECLARE
    r RECORD;
    actual_type TEXT;
    actual_nullable TEXT;
    actual_default TEXT;
    matching_count INTEGER;
    config_created BOOLEAN := FALSE;
BEGIN
    ---------------------------------------------------------------------------
    -- sentinel_config
    ---------------------------------------------------------------------------
    IF to_regclass('public.sentinel_config') IS NULL THEN
        CREATE TABLE public.sentinel_config (
            id UUID NOT NULL DEFAULT gen_random_uuid(),
            operating_mode TEXT NOT NULL DEFAULT 'NORMAL_MODE',
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT sentinel_config_pkey PRIMARY KEY (id)
        );

        config_created := TRUE;
    ELSE
        FOR r IN
            SELECT *
            FROM (
                VALUES
                    ('id',             'uuid',                     'NO', 'uuid',      NULL),
                    ('operating_mode', 'text',                     'NO', 'contains',  'NORMAL_MODE'),
                    ('is_active',      'boolean',                  'NO', 'boolean',   'true'),
                    ('updated_at',     'timestamp with time zone', 'NO', 'timestamp', NULL),
                    ('created_at',     'timestamp with time zone', 'NO', 'timestamp', NULL)
            ) AS expected(column_name, data_type, is_nullable, default_rule, default_token)
        LOOP
            SELECT c.data_type, c.is_nullable, c.column_default
            INTO actual_type, actual_nullable, actual_default
            FROM information_schema.columns c
            WHERE c.table_schema = 'public'
              AND c.table_name = 'sentinel_config'
              AND c.column_name = r.column_name;

            IF NOT FOUND THEN
                RAISE EXCEPTION
                    'sentinel_config.% is missing',
                    r.column_name;
            END IF;

            IF actual_type <> r.data_type THEN
                RAISE EXCEPTION
                    'sentinel_config.%: type expected %, got %',
                    r.column_name, r.data_type, actual_type;
            END IF;

            IF actual_nullable <> r.is_nullable THEN
                RAISE EXCEPTION
                    'sentinel_config.%: nullable expected %, got %',
                    r.column_name, r.is_nullable, actual_nullable;
            END IF;

            IF r.default_rule = 'uuid'
               AND COALESCE(actual_default, '') NOT ILIKE '%gen_random_uuid()%' THEN
                RAISE EXCEPTION
                    'sentinel_config.%: expected gen_random_uuid() default, got %',
                    r.column_name, actual_default;

            ELSIF r.default_rule = 'contains'
               AND POSITION(LOWER(r.default_token) IN LOWER(COALESCE(actual_default, ''))) = 0 THEN
                RAISE EXCEPTION
                    'sentinel_config.%: expected default containing %, got %',
                    r.column_name, r.default_token, actual_default;

            ELSIF r.default_rule = 'boolean'
               AND LOWER(COALESCE(actual_default, '')) <> LOWER(r.default_token) THEN
                RAISE EXCEPTION
                    'sentinel_config.%: expected default %, got %',
                    r.column_name, r.default_token, actual_default;

            ELSIF r.default_rule = 'timestamp'
               AND LOWER(COALESCE(actual_default, '')) NOT LIKE '%current_timestamp%'
               AND LOWER(COALESCE(actual_default, '')) NOT LIKE '%now()%' THEN
                RAISE EXCEPTION
                    'sentinel_config.%: expected timestamp default, got %',
                    r.column_name, actual_default;
            END IF;
        END LOOP;

        SELECT COUNT(*)
        INTO matching_count
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE n.nspname = 'public'
          AND t.relname = 'sentinel_config'
          AND c.conname = 'sentinel_config_pkey'
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
                'sentinel_config: expected primary key sentinel_config_pkey on id';
        END IF;
    END IF;

    ---------------------------------------------------------------------------
    -- sentinel_task_orders
    ---------------------------------------------------------------------------
    IF to_regclass('public.sentinel_task_orders') IS NULL THEN
        CREATE TABLE public.sentinel_task_orders (
            id UUID NOT NULL DEFAULT gen_random_uuid(),
            tenant_id UUID,
            created_by TEXT NOT NULL DEFAULT 'platform_sentinel',
            assigned_to_type TEXT NOT NULL,
            assigned_to_name TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            priority TEXT NOT NULL DEFAULT 'MEDIUM',
            risk_level TEXT NOT NULL DEFAULT 'LOW',
            approval_required BOOLEAN NOT NULL DEFAULT FALSE,
            status TEXT NOT NULL DEFAULT 'OPEN',
            source TEXT NOT NULL DEFAULT 'SYSTEM',
            correlation_id TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            completed_at TIMESTAMPTZ,
            CONSTRAINT sentinel_task_orders_pkey PRIMARY KEY (id)
        );
    ELSE
        FOR r IN
            SELECT *
            FROM (
                VALUES
                    ('id',                'uuid',                     'NO',  'uuid',      NULL),
                    ('tenant_id',         'uuid',                     'YES', 'none',      NULL),
                    ('created_by',        'text',                     'NO',  'contains',  'platform_sentinel'),
                    ('assigned_to_type',  'text',                     'NO',  'none',      NULL),
                    ('assigned_to_name',  'text',                     'NO',  'none',      NULL),
                    ('title',             'text',                     'NO',  'none',      NULL),
                    ('description',       'text',                     'YES', 'none',      NULL),
                    ('priority',          'text',                     'NO',  'contains',  'MEDIUM'),
                    ('risk_level',        'text',                     'NO',  'contains',  'LOW'),
                    ('approval_required', 'boolean',                  'NO',  'boolean',   'false'),
                    ('status',            'text',                     'NO',  'contains',  'OPEN'),
                    ('source',            'text',                     'NO',  'contains',  'SYSTEM'),
                    ('correlation_id',    'text',                     'YES', 'none',      NULL),
                    ('created_at',        'timestamp with time zone', 'NO',  'timestamp', NULL),
                    ('updated_at',        'timestamp with time zone', 'NO',  'timestamp', NULL),
                    ('completed_at',      'timestamp with time zone', 'YES', 'none',      NULL)
            ) AS expected(column_name, data_type, is_nullable, default_rule, default_token)
        LOOP
            SELECT c.data_type, c.is_nullable, c.column_default
            INTO actual_type, actual_nullable, actual_default
            FROM information_schema.columns c
            WHERE c.table_schema = 'public'
              AND c.table_name = 'sentinel_task_orders'
              AND c.column_name = r.column_name;

            IF NOT FOUND THEN
                RAISE EXCEPTION
                    'sentinel_task_orders.% is missing',
                    r.column_name;
            END IF;

            IF actual_type <> r.data_type THEN
                RAISE EXCEPTION
                    'sentinel_task_orders.%: type expected %, got %',
                    r.column_name, r.data_type, actual_type;
            END IF;

            IF actual_nullable <> r.is_nullable THEN
                RAISE EXCEPTION
                    'sentinel_task_orders.%: nullable expected %, got %',
                    r.column_name, r.is_nullable, actual_nullable;
            END IF;

            IF r.default_rule = 'none'
               AND actual_default IS NOT NULL THEN
                RAISE EXCEPTION
                    'sentinel_task_orders.%: expected no default, got %',
                    r.column_name, actual_default;

            ELSIF r.default_rule = 'uuid'
               AND COALESCE(actual_default, '') NOT ILIKE '%gen_random_uuid()%' THEN
                RAISE EXCEPTION
                    'sentinel_task_orders.%: expected gen_random_uuid() default, got %',
                    r.column_name, actual_default;

            ELSIF r.default_rule = 'contains'
               AND POSITION(LOWER(r.default_token) IN LOWER(COALESCE(actual_default, ''))) = 0 THEN
                RAISE EXCEPTION
                    'sentinel_task_orders.%: expected default containing %, got %',
                    r.column_name, r.default_token, actual_default;

            ELSIF r.default_rule = 'boolean'
               AND LOWER(COALESCE(actual_default, '')) <> LOWER(r.default_token) THEN
                RAISE EXCEPTION
                    'sentinel_task_orders.%: expected default %, got %',
                    r.column_name, r.default_token, actual_default;

            ELSIF r.default_rule = 'timestamp'
               AND LOWER(COALESCE(actual_default, '')) NOT LIKE '%current_timestamp%'
               AND LOWER(COALESCE(actual_default, '')) NOT LIKE '%now()%' THEN
                RAISE EXCEPTION
                    'sentinel_task_orders.%: expected timestamp default, got %',
                    r.column_name, actual_default;
            END IF;
        END LOOP;

        SELECT COUNT(*)
        INTO matching_count
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE n.nspname = 'public'
          AND t.relname = 'sentinel_task_orders'
          AND c.conname = 'sentinel_task_orders_pkey'
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
                'sentinel_task_orders: expected primary key sentinel_task_orders_pkey on id';
        END IF;
    END IF;

    -- Preserve legacy databases. Seed only when this migration creates the table.
    IF config_created THEN
        INSERT INTO public.sentinel_config (id, operating_mode)
        VALUES (gen_random_uuid(), 'NORMAL_MODE');
    END IF;
END
$migration$;

CREATE INDEX IF NOT EXISTS idx_sentinel_task_orders_status
    ON public.sentinel_task_orders (status);

CREATE INDEX IF NOT EXISTS idx_sentinel_task_orders_assigned
    ON public.sentinel_task_orders (assigned_to_type, status);

CREATE INDEX IF NOT EXISTS idx_sentinel_task_orders_correlation
    ON public.sentinel_task_orders (correlation_id);

CREATE INDEX IF NOT EXISTS idx_sentinel_task_orders_created
    ON public.sentinel_task_orders (created_at DESC);

DO $verification$
DECLARE
    normalized_definition TEXT;
BEGIN
    SELECT REGEXP_REPLACE(LOWER(indexdef), '["[:space:]]', '', 'g')
    INTO normalized_definition
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'sentinel_task_orders'
      AND indexname = 'idx_sentinel_task_orders_status';

    IF normalized_definition IS NULL
       OR normalized_definition !~ '\(status\)$' THEN
        RAISE EXCEPTION
            'idx_sentinel_task_orders_status is missing or malformed';
    END IF;

    SELECT REGEXP_REPLACE(LOWER(indexdef), '["[:space:]]', '', 'g')
    INTO normalized_definition
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'sentinel_task_orders'
      AND indexname = 'idx_sentinel_task_orders_assigned';

    IF normalized_definition IS NULL
       OR normalized_definition !~ '\(assigned_to_type,status\)$' THEN
        RAISE EXCEPTION
            'idx_sentinel_task_orders_assigned is missing or malformed';
    END IF;

    SELECT REGEXP_REPLACE(LOWER(indexdef), '["[:space:]]', '', 'g')
    INTO normalized_definition
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'sentinel_task_orders'
      AND indexname = 'idx_sentinel_task_orders_correlation';

    IF normalized_definition IS NULL
       OR normalized_definition !~ '\(correlation_id\)$' THEN
        RAISE EXCEPTION
            'idx_sentinel_task_orders_correlation is missing or malformed';
    END IF;

    SELECT REGEXP_REPLACE(LOWER(indexdef), '["[:space:]]', '', 'g')
    INTO normalized_definition
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'sentinel_task_orders'
      AND indexname = 'idx_sentinel_task_orders_created';

    IF normalized_definition IS NULL
       OR normalized_definition !~ '\(created_atdesc\)$' THEN
        RAISE EXCEPTION
            'idx_sentinel_task_orders_created is missing or malformed';
    END IF;
END
$verification$;