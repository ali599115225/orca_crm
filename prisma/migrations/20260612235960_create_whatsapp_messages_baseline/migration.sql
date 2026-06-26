-- Restore the WhatsApp Messages baseline that was originally applied
-- through scripts/create-whatsapp-tables.sql (first introduced at commit
-- feb70d5, with failed_at added at 09e4023 and ai_summary at 132ecd0).
--
-- Columns added by later migrations are intentionally excluded:
-- - phone_hash: added by 20260613_add_hash_columns

DO $migration$
DECLARE
    r RECORD;
    actual_type TEXT;
    actual_nullable TEXT;
    actual_default TEXT;
    matching_count INTEGER;
BEGIN
    ---------------------------------------------------------------------------
    -- whatsapp_messages
    ---------------------------------------------------------------------------
    IF to_regclass('public.whatsapp_messages') IS NULL THEN
        CREATE TABLE public.whatsapp_messages (
            id UUID NOT NULL DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            phone TEXT NOT NULL,
            direction TEXT DEFAULT 'inbound',
            provider TEXT DEFAULT 'meta',
            message_text TEXT,
            message_type TEXT DEFAULT 'text',
            meta_message_id TEXT,
            raw_payload JSONB,
            status TEXT DEFAULT 'received',
            delivered_at TIMESTAMPTZ,
            read_at TIMESTAMPTZ,
            failed_at TIMESTAMPTZ,
            ai_summary TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT whatsapp_messages_pkey PRIMARY KEY (id),
            CONSTRAINT whatsapp_messages_tenant_id_fkey FOREIGN KEY (tenant_id)
                REFERENCES public.tenants(id) ON DELETE CASCADE
        );
    ELSE
        FOR r IN
            SELECT *
            FROM (
                VALUES
                    ('id',               'uuid',                     'NO',  'uuid',      NULL),
                    ('tenant_id',        'uuid',                     'NO',  'none',      NULL),
                    ('phone',            'text',                     'NO',  'none',      NULL),
                    ('direction',        'text',                     'YES', 'contains',  'inbound'),
                    ('provider',         'text',                     'YES', 'contains',  'meta'),
                    ('message_text',     'text',                     'YES', 'none',      NULL),
                    ('message_type',     'text',                     'YES', 'contains',  'text'),
                    ('meta_message_id',  'text',                     'YES', 'none',      NULL),
                    ('raw_payload',      'jsonb',                    'YES', 'none',      NULL),
                    ('status',           'text',                     'YES', 'contains',  'received'),
                    ('delivered_at',     'timestamp with time zone', 'YES', 'none',      NULL),
                    ('read_at',          'timestamp with time zone', 'YES', 'none',      NULL),
                    ('failed_at',        'timestamp with time zone', 'YES', 'none',      NULL),
                    ('ai_summary',       'text',                     'YES', 'none',      NULL),
                    ('created_at',       'timestamp with time zone', 'NO',  'timestamp', NULL)
            ) AS expected(column_name, data_type, is_nullable, default_rule, default_token)
        LOOP
            SELECT c.data_type, c.is_nullable, c.column_default
            INTO actual_type, actual_nullable, actual_default
            FROM information_schema.columns c
            WHERE c.table_schema = 'public'
              AND c.table_name = 'whatsapp_messages'
              AND c.column_name = r.column_name;

            IF NOT FOUND THEN
                RAISE EXCEPTION
                    'whatsapp_messages.% is missing',
                    r.column_name;
            END IF;

            IF actual_type <> r.data_type THEN
                RAISE EXCEPTION
                    'whatsapp_messages.%: type expected %, got %',
                    r.column_name, r.data_type, actual_type;
            END IF;

            IF actual_nullable <> r.is_nullable THEN
                RAISE EXCEPTION
                    'whatsapp_messages.%: nullable expected %, got %',
                    r.column_name, r.is_nullable, actual_nullable;
            END IF;

            IF r.default_rule = 'none'
               AND actual_default IS NOT NULL THEN
                RAISE EXCEPTION
                    'whatsapp_messages.%: expected no default, got %',
                    r.column_name, actual_default;

            ELSIF r.default_rule = 'uuid'
               AND COALESCE(actual_default, '') NOT ILIKE '%gen_random_uuid()%' THEN
                RAISE EXCEPTION
                    'whatsapp_messages.%: expected gen_random_uuid() default, got %',
                    r.column_name, actual_default;

            ELSIF r.default_rule = 'contains'
               AND POSITION(LOWER(r.default_token) IN LOWER(COALESCE(actual_default, ''))) = 0 THEN
                RAISE EXCEPTION
                    'whatsapp_messages.%: expected default containing %, got %',
                    r.column_name, r.default_token, actual_default;

            ELSIF r.default_rule = 'timestamp'
               AND LOWER(COALESCE(actual_default, '')) NOT LIKE '%current_timestamp%'
               AND LOWER(COALESCE(actual_default, '')) NOT LIKE '%now()%' THEN
                RAISE EXCEPTION
                    'whatsapp_messages.%: expected timestamp default, got %',
                    r.column_name, actual_default;
            END IF;
        END LOOP;

        SELECT COUNT(*)
        INTO matching_count
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE n.nspname = 'public'
          AND t.relname = 'whatsapp_messages'
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
                'whatsapp_messages: expected primary key on id';
        END IF;
    END IF;

    ---------------------------------------------------------------------------
    -- Indexes (created outside DO block for IF NOT EXISTS support)
    ---------------------------------------------------------------------------
END
$migration$;

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_tenant_phone
    ON public.whatsapp_messages (tenant_id, phone, created_at);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_meta_id
    ON public.whatsapp_messages (meta_message_id);
