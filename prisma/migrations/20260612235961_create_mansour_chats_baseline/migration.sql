-- Restore the Mansour Chats baseline. This table was never created through
-- a tracked Prisma migration; it was first introduced directly via the
-- Prisma schema (model MansourChat, see commit be33a7c) and materialized
-- against the database through `prisma db push`, never through
-- `prisma migrate`.
--
-- Columns added by later migrations are intentionally excluded:
-- - contact_phone_hash: added by 20260613_add_hash_columns

DO $migration$
DECLARE
    r RECORD;
    actual_type TEXT;
    actual_nullable TEXT;
    actual_default TEXT;
    matching_count INTEGER;
BEGIN
    ---------------------------------------------------------------------------
    -- mansour_chats
    ---------------------------------------------------------------------------
    IF to_regclass('public.mansour_chats') IS NULL THEN
        CREATE TABLE public.mansour_chats (
            id UUID NOT NULL DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            lead_id UUID,
            contact_name TEXT NOT NULL,
            contact_phone TEXT NOT NULL,
            last_message TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'INTERESTED',
            messages_json TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT mansour_chats_pkey PRIMARY KEY (id),
            CONSTRAINT mansour_chats_tenant_id_fkey FOREIGN KEY (tenant_id)
                REFERENCES public.tenants(id) ON DELETE CASCADE,
            CONSTRAINT mansour_chats_lead_id_fkey FOREIGN KEY (lead_id)
                REFERENCES public.leads(id) ON DELETE SET NULL
        );
    ELSE
        FOR r IN
            SELECT *
            FROM (
                VALUES
                    ('id',             'uuid',                     'NO',  'uuid',      NULL),
                    ('tenant_id',      'uuid',                     'NO',  'none',      NULL),
                    ('lead_id',        'uuid',                     'YES', 'none',      NULL),
                    ('contact_name',   'text',                     'NO',  'none',      NULL),
                    ('contact_phone',  'text',                     'NO',  'none',      NULL),
                    ('last_message',   'text',                     'NO',  'none',      NULL),
                    ('status',         'text',                     'NO',  'contains',  'INTERESTED'),
                    ('messages_json',  'text',                     'NO',  'none',      NULL),
                    ('created_at',     'timestamp with time zone', 'NO',  'timestamp', NULL),
                    ('updated_at',     'timestamp with time zone', 'NO',  'timestamp', NULL)
            ) AS expected(column_name, data_type, is_nullable, default_rule, default_token)
        LOOP
            SELECT c.data_type, c.is_nullable, c.column_default
            INTO actual_type, actual_nullable, actual_default
            FROM information_schema.columns c
            WHERE c.table_schema = 'public'
              AND c.table_name = 'mansour_chats'
              AND c.column_name = r.column_name;

            IF NOT FOUND THEN
                RAISE EXCEPTION
                    'mansour_chats.% is missing',
                    r.column_name;
            END IF;

            IF actual_type <> r.data_type THEN
                RAISE EXCEPTION
                    'mansour_chats.%: type expected %, got %',
                    r.column_name, r.data_type, actual_type;
            END IF;

            IF actual_nullable <> r.is_nullable THEN
                RAISE EXCEPTION
                    'mansour_chats.%: nullable expected %, got %',
                    r.column_name, r.is_nullable, actual_nullable;
            END IF;

            IF r.default_rule = 'none'
               AND actual_default IS NOT NULL THEN
                RAISE EXCEPTION
                    'mansour_chats.%: expected no default, got %',
                    r.column_name, actual_default;

            ELSIF r.default_rule = 'uuid'
               AND COALESCE(actual_default, '') NOT ILIKE '%gen_random_uuid()%' THEN
                RAISE EXCEPTION
                    'mansour_chats.%: expected gen_random_uuid() default, got %',
                    r.column_name, actual_default;

            ELSIF r.default_rule = 'contains'
               AND POSITION(LOWER(r.default_token) IN LOWER(COALESCE(actual_default, ''))) = 0 THEN
                RAISE EXCEPTION
                    'mansour_chats.%: expected default containing %, got %',
                    r.column_name, r.default_token, actual_default;

            ELSIF r.default_rule = 'timestamp'
               AND LOWER(COALESCE(actual_default, '')) NOT LIKE '%current_timestamp%'
               AND LOWER(COALESCE(actual_default, '')) NOT LIKE '%now()%' THEN
                RAISE EXCEPTION
                    'mansour_chats.%: expected timestamp default, got %',
                    r.column_name, actual_default;
            END IF;
        END LOOP;

        SELECT COUNT(*)
        INTO matching_count
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE n.nspname = 'public'
          AND t.relname = 'mansour_chats'
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
                'mansour_chats: expected primary key on id';
        END IF;
    END IF;
END
$migration$;
