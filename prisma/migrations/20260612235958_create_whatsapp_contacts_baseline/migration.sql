-- Restore the WhatsApp Contacts baseline that was originally applied
-- through scripts/create-whatsapp-tables.sql.
--
-- Columns added by later migrations are intentionally excluded:
-- - phone_hash: added by 20260613_add_hash_columns
-- - assigned_user_id, assigned_user_name, archived: added by 20260620000100_whatsapp_contact_assignment_archive

DO $migration$
DECLARE
    r RECORD;
    actual_type TEXT;
    actual_nullable TEXT;
    actual_default TEXT;
    matching_count INTEGER;
    provider_null_count INTEGER;
    provider_nullable_after TEXT;
BEGIN
    ---------------------------------------------------------------------------
    -- whatsapp_contacts
    ---------------------------------------------------------------------------
    IF to_regclass('public.whatsapp_contacts') IS NULL THEN
        CREATE TABLE public.whatsapp_contacts (
            id UUID NOT NULL DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            phone TEXT NOT NULL,
            name TEXT,
            provider TEXT NOT NULL DEFAULT 'meta',
            meta_contact_id TEXT,
            lead_id UUID,
            last_message_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT whatsapp_contacts_pkey PRIMARY KEY (id),
            CONSTRAINT whatsapp_contacts_tenant_id_fkey FOREIGN KEY (tenant_id)
                REFERENCES public.tenants(id) ON DELETE CASCADE,
            CONSTRAINT whatsapp_contacts_lead_id_fkey FOREIGN KEY (lead_id)
                REFERENCES public.leads(id) ON DELETE SET NULL,
            CONSTRAINT whatsapp_contacts_tenant_id_phone_key UNIQUE (tenant_id, phone)
        );
    ELSE
        FOR r IN
            SELECT *
            FROM (
                VALUES
                    ('id',               'uuid',                     'NO',  'uuid',      NULL),
                    ('tenant_id',        'uuid',                     'NO',  'none',      NULL),
                    ('phone',            'text',                     'NO',  'none',      NULL),
                    ('name',             'text',                     'YES', 'none',      NULL),
                    ('provider',         'text',                     'FIX', 'contains',  'meta'),
                    ('meta_contact_id',  'text',                     'YES', 'none',      NULL),
                    ('lead_id',          'uuid',                     'YES', 'none',      NULL),
                    ('last_message_at',  'timestamp with time zone', 'YES', 'none',      NULL),
                    ('created_at',       'timestamp with time zone', 'NO',  'timestamp', NULL),
                    ('updated_at',       'timestamp with time zone', 'NO',  'timestamp', NULL)
            ) AS expected(column_name, data_type, is_nullable, default_rule, default_token)
        LOOP
            SELECT c.data_type, c.is_nullable, c.column_default
            INTO actual_type, actual_nullable, actual_default
            FROM information_schema.columns c
            WHERE c.table_schema = 'public'
              AND c.table_name = 'whatsapp_contacts'
              AND c.column_name = r.column_name;

            IF NOT FOUND THEN
                RAISE EXCEPTION
                    'whatsapp_contacts.% is missing',
                    r.column_name;
            END IF;

            IF actual_type <> r.data_type THEN
                RAISE EXCEPTION
                    'whatsapp_contacts.%: type expected %, got %',
                    r.column_name, r.data_type, actual_type;
            END IF;

            IF r.column_name = 'provider' AND r.is_nullable = 'FIX' THEN
                -- Historical legacy creation (scripts/create-whatsapp-tables.sql) left
                -- provider nullable. Tighten it here instead of failing outright, but
                -- only when it is provably safe: zero NULLs at the moment of migration.
                IF actual_nullable = 'YES' THEN
                    EXECUTE 'SELECT COUNT(*) FROM public.whatsapp_contacts WHERE provider IS NULL'
                        INTO provider_null_count;

                    IF provider_null_count > 0 THEN
                        RAISE EXCEPTION
                            'whatsapp_contacts.provider: % row(s) have NULL provider — refusing to guess a backfill value; resolve manually before this migration can proceed',
                            provider_null_count;
                    END IF;

                    ALTER TABLE public.whatsapp_contacts
                        ALTER COLUMN provider SET NOT NULL;

                    SELECT is_nullable INTO provider_nullable_after
                    FROM information_schema.columns
                    WHERE table_schema = 'public'
                      AND table_name = 'whatsapp_contacts'
                      AND column_name = 'provider';

                    IF provider_nullable_after <> 'NO' THEN
                        RAISE EXCEPTION
                            'whatsapp_contacts.provider: SET NOT NULL did not take effect (still nullable)';
                    END IF;
                END IF;
                -- actual_nullable was 'NO' already (or just fixed above) — fall through.
            ELSIF actual_nullable <> r.is_nullable THEN
                RAISE EXCEPTION
                    'whatsapp_contacts.%: nullable expected %, got %',
                    r.column_name, r.is_nullable, actual_nullable;
            END IF;

            IF r.default_rule = 'none'
               AND actual_default IS NOT NULL THEN
                RAISE EXCEPTION
                    'whatsapp_contacts.%: expected no default, got %',
                    r.column_name, actual_default;

            ELSIF r.default_rule = 'uuid'
               AND COALESCE(actual_default, '') NOT ILIKE '%gen_random_uuid()%' THEN
                RAISE EXCEPTION
                    'whatsapp_contacts.%: expected gen_random_uuid() default, got %',
                    r.column_name, actual_default;

            ELSIF r.default_rule = 'contains'
               AND POSITION(LOWER(r.default_token) IN LOWER(COALESCE(actual_default, ''))) = 0 THEN
                RAISE EXCEPTION
                    'whatsapp_contacts.%: expected default containing %, got %',
                    r.column_name, r.default_token, actual_default;

            ELSIF r.default_rule = 'timestamp'
               AND LOWER(COALESCE(actual_default, '')) NOT LIKE '%current_timestamp%'
               AND LOWER(COALESCE(actual_default, '')) NOT LIKE '%now()%' THEN
                RAISE EXCEPTION
                    'whatsapp_contacts.%: expected timestamp default, got %',
                    r.column_name, actual_default;
            END IF;
        END LOOP;

        SELECT COUNT(*)
        INTO matching_count
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE n.nspname = 'public'
          AND t.relname = 'whatsapp_contacts'
          AND c.conname = 'whatsapp_contacts_pkey'
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
                'whatsapp_contacts: expected primary key whatsapp_contacts_pkey on id';
        END IF;
    END IF;

    ---------------------------------------------------------------------------
    -- Indexes (created outside DO block for IF NOT EXISTS support)
    ---------------------------------------------------------------------------
END
$migration$;

CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_tenant_last
    ON public.whatsapp_contacts (tenant_id, last_message_at);

DO $verification$
DECLARE
    normalized_definition TEXT;
BEGIN
    SELECT REGEXP_REPLACE(LOWER(indexdef), '["[:space:]]', '', 'g')
    INTO normalized_definition
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'whatsapp_contacts'
      AND indexname = 'idx_whatsapp_contacts_tenant_last';

    IF normalized_definition IS NULL
       OR normalized_definition !~ '\(tenant_id,last_message_at\)$' THEN
        RAISE EXCEPTION
            'idx_whatsapp_contacts_tenant_last is missing or malformed';
    END IF;
END
$verification$;
