-- Baseline: create contacts table before first FK reference in 20260611205518_add_email_message.
-- Source: commit be80185 (feat: implement 7-tabs leads workspace and version 1 APIs)
--
-- Behavior:
--   Table absent  -> create baseline (historical columns only).
--   Table present -> verify every baseline column, PK, FK, defaults; RAISE on mismatch.
--   Later columns (phone_hash, email_hash, ...) are allowed and ignored.

DO $$
DECLARE
  _tbl_exists   boolean;
  _missing      text[] := ARRAY[]::text[];
  _mismatch     text[] := ARRAY[]::text[];
  _actual_type  text;
  _actual_null  text;
  _actual_def   text;
  _fk_rec       record;
  _col_name     text;
  _exp_type     text;
  _exp_null     text;
  _exp_def      text;
  _baseline_cols text[][] := ARRAY[
    ARRAY['id',                     'uuid',        'NO',  'gen_random_uuid()'],
    ARRAY['tenant_id',              'uuid',        'NO',  NULL],
    ARRAY['lead_id',                'uuid',        'YES', NULL],
    ARRAY['name',                   'text',        'NO',  NULL],
    ARRAY['phone',                  'text',        'NO',  NULL],
    ARRAY['email',                  'text',        'YES', NULL],
    ARRAY['preferred_contact_time', 'text',        'YES', NULL],
    ARRAY['budget_range',           'text',        'YES', NULL],
    ARRAY['notes',                  'text',        'YES', NULL],
    ARRAY['created_at',             'timestamptz', 'NO',  'CURRENT_TIMESTAMP'],
    ARRAY['updated_at',             'timestamptz', 'NO',  'CURRENT_TIMESTAMP'],
    ARRAY['created_by',             'uuid',        'YES', NULL],
    ARRAY['updated_by',             'uuid',        'YES', NULL],
    ARRAY['audit_log',              'text',        'YES', NULL]
  ];
  _i int;
BEGIN
  _tbl_exists := (to_regclass('public.contacts') IS NOT NULL);

  IF NOT _tbl_exists THEN
    CREATE TABLE "contacts" (
      "id"                    UUID         NOT NULL DEFAULT gen_random_uuid(),
      "tenant_id"             UUID         NOT NULL,
      "lead_id"               UUID,
      "name"                  TEXT         NOT NULL,
      "phone"                 TEXT         NOT NULL,
      "email"                 TEXT,
      "preferred_contact_time" TEXT,
      "budget_range"          TEXT,
      "notes"                 TEXT,
      "created_at"            TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at"            TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "created_by"            UUID,
      "updated_by"            UUID,
      "audit_log"             TEXT,
      CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
    );

    ALTER TABLE "contacts"
      ADD CONSTRAINT "contacts_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;

    RETURN;
  END IF;

  FOR _i IN 1..array_length(_baseline_cols, 1) LOOP
    _col_name := _baseline_cols[_i][1];
    _exp_type := _baseline_cols[_i][2];
    _exp_null := _baseline_cols[_i][3];
    _exp_def  := _baseline_cols[_i][4];

    SELECT udt_name, is_nullable, column_default
      INTO _actual_type, _actual_null, _actual_def
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'contacts'
        AND column_name = _col_name;

    IF NOT FOUND THEN
      _missing := _missing || _col_name;
      CONTINUE;
    END IF;

    IF _actual_type != _exp_type THEN
      _mismatch := _mismatch || (_col_name || ': type expected ' || _exp_type || ', got ' || _actual_type);
    END IF;

    IF _actual_null != _exp_null THEN
      _mismatch := _mismatch || (_col_name || ': nullable expected ' || _exp_null || ', got ' || _actual_null);
    END IF;

    IF _exp_def IS NOT NULL THEN
      IF _actual_def IS NULL OR _actual_def NOT LIKE '%' || _exp_def || '%' THEN
        _mismatch := _mismatch || (_col_name || ': default expected to contain ' || _exp_def || ', got ' || COALESCE(_actual_def, 'NULL'));
      END IF;
    END IF;
  END LOOP;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.contacts'::regclass AND contype = 'p'
  ) THEN
    _mismatch := _mismatch || 'PRIMARY KEY missing on contacts';
  END IF;

  SELECT conname, confrelid::regclass,
         pg_get_constraintdef(oid) AS fk_def
    INTO _fk_rec
    FROM pg_constraint
    WHERE conrelid = 'public.contacts'::regclass
      AND contype = 'f'
      AND conname = 'contacts_tenant_id_fkey';

  IF NOT FOUND THEN
    _mismatch := _mismatch || 'FK contacts_tenant_id_fkey missing';
  ELSE
    IF _fk_rec.confrelid::text != 'tenants' THEN
      _mismatch := _mismatch || ('FK target expected tenants, got ' || _fk_rec.confrelid::text);
    END IF;
    IF _fk_rec.fk_def NOT LIKE '%ON DELETE CASCADE%' THEN
      _mismatch := _mismatch || 'FK missing ON DELETE CASCADE';
    END IF;
    IF _fk_rec.fk_def NOT LIKE '%ON UPDATE CASCADE%' THEN
      _mismatch := _mismatch || 'FK missing ON UPDATE CASCADE';
    END IF;
  END IF;

  IF array_length(_missing, 1) > 0 THEN
    RAISE EXCEPTION 'contacts baseline: missing columns: %', array_to_string(_missing, ', ');
  END IF;

  IF array_length(_mismatch, 1) > 0 THEN
    RAISE EXCEPTION 'contacts baseline: structure mismatch: %', array_to_string(_mismatch, '; ');
  END IF;
END;
$$;
