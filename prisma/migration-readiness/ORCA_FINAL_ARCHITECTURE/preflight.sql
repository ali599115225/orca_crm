-- ORCA Batch 05 — preflight for
-- prisma/migrations/20260923_final_architecture_persistence_readiness/migration.sql
-- READ ONLY. Runs inside a read-only transaction and only inspects catalogs/rows.
-- Any failed check raises an exception naming the collision; the migration
-- must not be applied until every check passes.

BEGIN TRANSACTION READ ONLY;

DO $$
DECLARE
  missing TEXT;
  collision TEXT;
  violations BIGINT;
  g3_table_count INT;
  g3_enum_count INT;
  column_mismatch_count INT;
  enum_mismatch_count INT;
  index_mismatch_count INT;
  default_mismatch_count INT;
BEGIN
  -- 1. Required existing tables.
  SELECT string_agg(required.name, ', ') INTO missing
  FROM (VALUES ('tenants'), ('contracts'), ('documents'), ('contract_snapshots'),
               ('contract_drafts'), ('contract_template_versions')) AS required(name)
  WHERE to_regclass(format('public.%I', required.name)) IS NULL;
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'PREFLIGHT_FAIL required tables missing: %', missing;
  END IF;

  -- 2. W1 contract_snapshots foundation present.
  SELECT string_agg(required.name, ', ') INTO missing
  FROM (VALUES ('draft_id'), ('template_version_id'), ('contract_id'), ('snapshot_type'),
               ('digest'), ('signed_at'), ('structured_facts')) AS required(name)
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema = 'public' AND c.table_name = 'contract_snapshots'
      AND c.column_name = required.name
  );
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'PREFLIGHT_FAIL W1 contract_snapshots foundation incomplete, missing columns: %', missing;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_contract_snapshots_tenant_id'
      AND conrelid = 'public.contract_snapshots'::regclass
  ) THEN
    RAISE EXCEPTION 'PREFLIGHT_FAIL W1 foundation constraint uq_contract_snapshots_tenant_id missing';
  END IF;

  -- 3. G3 tables/enums: the migration is reconciliation-safe for a fully
  --    installed G3 set (it skips creation in that case), so only a
  --    PARTIAL G3 install is a blocker here — full absence (fresh DB) and
  --    full presence (already reconciled) both pass this check.
  SELECT count(*) INTO g3_table_count
  FROM (VALUES ('org_units'), ('org_assignments'), ('access_permissions'), ('access_roles'),
               ('access_role_permissions'), ('role_assignments'), ('authorization_audits')) AS target(name)
  WHERE to_regclass(format('public.%I', target.name)) IS NOT NULL;
  IF g3_table_count NOT IN (0, 7) THEN
    RAISE EXCEPTION 'PREFLIGHT_FAIL partial G3 table installation: % of 7 canonical G3 tables present', g3_table_count;
  END IF;

  SELECT count(*) INTO g3_enum_count
  FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
  WHERE n.nspname = 'public'
    AND t.typname IN ('org_unit_type', 'org_assignment_status', 'access_scope_type',
                      'role_assignment_status', 'authorization_mode', 'authorization_decision');
  IF g3_enum_count NOT IN (0, 6) THEN
    RAISE EXCEPTION 'PREFLIGHT_FAIL partial G3 enum installation: % of 6 canonical G3 enums present', g3_enum_count;
  END IF;

  IF g3_table_count = 7 AND g3_enum_count <> 6 THEN
    RAISE EXCEPTION 'PREFLIGHT_FAIL G3 tables fully present but enums are not (% of 6); mismatched G3 installation', g3_enum_count;
  END IF;
  IF g3_enum_count = 6 AND g3_table_count <> 7 THEN
    RAISE EXCEPTION 'PREFLIGHT_FAIL G3 enums fully present but tables are not (% of 7); mismatched G3 installation', g3_table_count;
  END IF;

  -- 3b. When G3 is fully present, the migration only skips creation if it is
  --     also structurally compatible with prisma/rbac.prisma. Mirror that
  --     exact gate here so a PREFLIGHT_PASS reliably predicts the migration
  --     outcome: column name/type/nullability are checked exactly; every
  --     column with a canonical default is checked against its exact
  --     expected default expression (whitespace-normalized); enum labels
  --     are checked exactly; and every canonical primary key/unique
  --     constraint/index is checked by name AND its exact object type,
  --     ordered column list, and absence of predicate/expression. G3 has no
  --     foreign keys per rbac.prisma.
  IF g3_table_count = 7 AND g3_enum_count = 6 THEN
    WITH expected_columns(table_name, column_name, expected_type, expected_notnull, expected_has_default) AS (
      VALUES
        ('org_units','id','uuid',true,true),
        ('org_units','tenant_id','uuid',true,false),
        ('org_units','parent_id','uuid',false,false),
        ('org_units','type','org_unit_type',true,false),
        ('org_units','code','text',true,false),
        ('org_units','name','text',true,false),
        ('org_units','is_active','boolean',true,true),
        ('org_units','metadata','jsonb',false,false),
        ('org_units','created_at','timestamp with time zone',true,true),
        ('org_units','updated_at','timestamp with time zone',true,true),
        ('org_assignments','id','uuid',true,true),
        ('org_assignments','tenant_id','uuid',true,false),
        ('org_assignments','user_id','uuid',true,false),
        ('org_assignments','org_unit_id','uuid',true,false),
        ('org_assignments','status','org_assignment_status',true,true),
        ('org_assignments','is_primary','boolean',true,true),
        ('org_assignments','valid_from','timestamp with time zone',true,true),
        ('org_assignments','valid_until','timestamp with time zone',false,false),
        ('org_assignments','created_by_id','uuid',false,false),
        ('org_assignments','metadata','jsonb',false,false),
        ('org_assignments','created_at','timestamp with time zone',true,true),
        ('org_assignments','updated_at','timestamp with time zone',true,true),
        ('access_permissions','id','uuid',true,true),
        ('access_permissions','key','text',true,false),
        ('access_permissions','resource','text',true,false),
        ('access_permissions','action','text',true,false),
        ('access_permissions','risk','text',true,false),
        ('access_permissions','description','text',true,false),
        ('access_permissions','is_active','boolean',true,true),
        ('access_permissions','created_at','timestamp with time zone',true,true),
        ('access_permissions','updated_at','timestamp with time zone',true,true),
        ('access_roles','id','uuid',true,true),
        ('access_roles','tenant_id','uuid',true,false),
        ('access_roles','key','text',true,false),
        ('access_roles','name','text',true,false),
        ('access_roles','description','text',false,false),
        ('access_roles','is_system','boolean',true,true),
        ('access_roles','is_active','boolean',true,true),
        ('access_roles','created_at','timestamp with time zone',true,true),
        ('access_roles','updated_at','timestamp with time zone',true,true),
        ('access_role_permissions','id','uuid',true,true),
        ('access_role_permissions','tenant_id','uuid',true,false),
        ('access_role_permissions','access_role_id','uuid',true,false),
        ('access_role_permissions','permission_id','uuid',true,false),
        ('access_role_permissions','created_at','timestamp with time zone',true,true),
        ('role_assignments','id','uuid',true,true),
        ('role_assignments','tenant_id','uuid',true,false),
        ('role_assignments','user_id','uuid',true,false),
        ('role_assignments','access_role_id','uuid',true,false),
        ('role_assignments','scope_type','access_scope_type',true,false),
        ('role_assignments','scope_org_unit_id','uuid',false,false),
        ('role_assignments','resource_type','text',false,false),
        ('role_assignments','resource_id','uuid',false,false),
        ('role_assignments','status','role_assignment_status',true,true),
        ('role_assignments','valid_from','timestamp with time zone',true,true),
        ('role_assignments','valid_until','timestamp with time zone',false,false),
        ('role_assignments','created_by_id','uuid',false,false),
        ('role_assignments','metadata','jsonb',false,false),
        ('role_assignments','created_at','timestamp with time zone',true,true),
        ('role_assignments','updated_at','timestamp with time zone',true,true),
        ('authorization_audits','id','uuid',true,true),
        ('authorization_audits','tenant_id','uuid',true,false),
        ('authorization_audits','user_id','uuid',false,false),
        ('authorization_audits','permission_key','text',true,false),
        ('authorization_audits','mode','authorization_mode',true,false),
        ('authorization_audits','decision','authorization_decision',true,false),
        ('authorization_audits','legacy_allowed','boolean',false,false),
        ('authorization_audits','rbac_allowed','boolean',true,false),
        ('authorization_audits','scope_type','access_scope_type',false,false),
        ('authorization_audits','scope_id','uuid',false,false),
        ('authorization_audits','resource_type','text',false,false),
        ('authorization_audits','resource_id','uuid',false,false),
        ('authorization_audits','reason_code','text',true,false),
        ('authorization_audits','source','text',true,false),
        ('authorization_audits','request_id','text',false,false),
        ('authorization_audits','metadata','jsonb',false,false),
        ('authorization_audits','created_at','timestamp with time zone',true,true)
    ),
    actual_columns AS (
      SELECT
        c.relname AS table_name,
        a.attname AS column_name,
        format_type(a.atttypid, a.atttypmod) AS actual_type,
        a.attnotnull AS actual_notnull,
        EXISTS (
          SELECT 1 FROM pg_attrdef d WHERE d.adrelid = a.attrelid AND d.adnum = a.attnum
        ) AS actual_has_default
      FROM pg_attribute a
      JOIN pg_class c ON c.oid = a.attrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname IN ('org_units', 'org_assignments', 'access_permissions', 'access_roles',
                           'access_role_permissions', 'role_assignments', 'authorization_audits')
        AND a.attnum > 0 AND NOT a.attisdropped
    )
    SELECT count(*) INTO column_mismatch_count
    FROM expected_columns e
    FULL JOIN actual_columns a
      ON a.table_name = e.table_name AND a.column_name = e.column_name
    WHERE a.table_name IS NULL
       OR e.table_name IS NULL
       OR a.actual_type IS DISTINCT FROM e.expected_type
       OR a.actual_notnull IS DISTINCT FROM e.expected_notnull
       OR a.actual_has_default IS DISTINCT FROM e.expected_has_default;

    WITH expected_enum_labels(enum_name, label) AS (
      VALUES
        ('org_unit_type','COMPANY'), ('org_unit_type','BRANCH'), ('org_unit_type','DEPARTMENT'), ('org_unit_type','TEAM'),
        ('org_assignment_status','ACTIVE'), ('org_assignment_status','INACTIVE'),
        ('access_scope_type','TENANT'), ('access_scope_type','BRANCH'), ('access_scope_type','DEPARTMENT'),
        ('access_scope_type','TEAM'), ('access_scope_type','SELF'), ('access_scope_type','RESOURCE'),
        ('role_assignment_status','ACTIVE'), ('role_assignment_status','INACTIVE'),
        ('authorization_mode','AUDIT'), ('authorization_mode','ENFORCE'),
        ('authorization_decision','ALLOW'), ('authorization_decision','DENY'),
        ('authorization_decision','SHADOW_ALLOW'), ('authorization_decision','SHADOW_DENY'), ('authorization_decision','ERROR')
    ),
    actual_enum_labels AS (
      SELECT t.typname AS enum_name, e.enumlabel AS label
      FROM pg_type t
      JOIN pg_namespace n ON n.oid = t.typnamespace
      JOIN pg_enum e ON e.enumtypid = t.oid
      WHERE n.nspname = 'public'
        AND t.typname IN ('org_unit_type', 'org_assignment_status', 'access_scope_type',
                           'role_assignment_status', 'authorization_mode', 'authorization_decision')
    )
    SELECT count(*) INTO enum_mismatch_count
    FROM expected_enum_labels e
    FULL JOIN actual_enum_labels a ON a.enum_name = e.enum_name AND a.label = e.label
    WHERE a.enum_name IS NULL OR e.enum_name IS NULL;

    -- Default semantics are classified from PostgreSQL's stored default
    -- expression, but built-in function identity is resolved through
    -- to_regprocedure(...)->OID rather than pg_depend. PostgreSQL deliberately
    -- omits pg_depend rows for dependencies on many initdb-pinned system objects,
    -- so pg_depend cannot prove built-in defaults such as now() or
    -- gen_random_uuid(). pg_get_expr is used only to reconstruct the expression;
    -- simple zero-argument function calls are then resolved back to pg_proc OIDs,
    -- while boolean/enum constants and CURRENT_TIMESTAMP are matched only in their
    -- canonical deparsed literal/special-form representation.
    --
    -- Canonical defaults from prisma/rbac.prisma (28 total):
    --   7 uuid generators, 5 boolean constants, 2 enum constants,
    --   14 transaction-start timestamps.
    WITH expected_defaults(table_name, column_name, semantic_kind, expected_value, expected_type) AS (
      VALUES
        ('org_units','id','uuid_generator','pg_catalog.gen_random_uuid()','uuid'),
        ('org_units','is_active','boolean_constant','true','boolean'),
        ('org_units','created_at','transaction_timestamp',NULL,'timestamp with time zone'),
        ('org_units','updated_at','transaction_timestamp',NULL,'timestamp with time zone'),

        ('org_assignments','id','uuid_generator','pg_catalog.gen_random_uuid()','uuid'),
        ('org_assignments','status','enum_constant','ACTIVE','org_assignment_status'),
        ('org_assignments','is_primary','boolean_constant','false','boolean'),
        ('org_assignments','valid_from','transaction_timestamp',NULL,'timestamp with time zone'),
        ('org_assignments','created_at','transaction_timestamp',NULL,'timestamp with time zone'),
        ('org_assignments','updated_at','transaction_timestamp',NULL,'timestamp with time zone'),

        ('access_permissions','id','uuid_generator','pg_catalog.gen_random_uuid()','uuid'),
        ('access_permissions','is_active','boolean_constant','true','boolean'),
        ('access_permissions','created_at','transaction_timestamp',NULL,'timestamp with time zone'),
        ('access_permissions','updated_at','transaction_timestamp',NULL,'timestamp with time zone'),

        ('access_roles','id','uuid_generator','pg_catalog.gen_random_uuid()','uuid'),
        ('access_roles','is_system','boolean_constant','false','boolean'),
        ('access_roles','is_active','boolean_constant','true','boolean'),
        ('access_roles','created_at','transaction_timestamp',NULL,'timestamp with time zone'),
        ('access_roles','updated_at','transaction_timestamp',NULL,'timestamp with time zone'),

        ('access_role_permissions','id','uuid_generator','pg_catalog.gen_random_uuid()','uuid'),
        ('access_role_permissions','created_at','transaction_timestamp',NULL,'timestamp with time zone'),

        ('role_assignments','id','uuid_generator','pg_catalog.gen_random_uuid()','uuid'),
        ('role_assignments','status','enum_constant','ACTIVE','role_assignment_status'),
        ('role_assignments','valid_from','transaction_timestamp',NULL,'timestamp with time zone'),
        ('role_assignments','created_at','transaction_timestamp',NULL,'timestamp with time zone'),
        ('role_assignments','updated_at','transaction_timestamp',NULL,'timestamp with time zone'),

        ('authorization_audits','id','uuid_generator','pg_catalog.gen_random_uuid()','uuid'),
        ('authorization_audits','created_at','transaction_timestamp',NULL,'timestamp with time zone')
    ),
    actual_defaults AS (
      SELECT
        c.relname AS table_name,
        a.attname AS column_name,
        d.oid AS attrdef_oid,
        pg_get_expr(d.adbin, d.adrelid, false) AS actual_default,
        CASE
          WHEN regexp_replace(pg_get_expr(d.adbin, d.adrelid, false), '\s+', '', 'g')
                 ~ '^(pg_catalog\.)?[a-z_][a-z0-9_]*\(\)$'
          THEN to_regprocedure(
                 regexp_replace(pg_get_expr(d.adbin, d.adrelid, false), '\s+', '', 'g')
               )::oid
          ELSE NULL
        END AS resolved_zero_arg_proc_oid
      FROM pg_attribute a
      JOIN pg_class c ON c.oid = a.attrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
      WHERE n.nspname = 'public'
        AND c.relname IN ('org_units', 'org_assignments', 'access_permissions', 'access_roles',
                           'access_role_permissions', 'role_assignments', 'authorization_audits')
        AND a.attnum > 0 AND NOT a.attisdropped
    ),
    default_mismatches AS (
      SELECT 1
      FROM expected_defaults e
      LEFT JOIN actual_defaults a
        ON a.table_name = e.table_name AND a.column_name = e.column_name
      WHERE a.attrdef_oid IS NULL
         OR CASE e.semantic_kind
              WHEN 'uuid_generator' THEN NOT (
                a.resolved_zero_arg_proc_oid = to_regprocedure('pg_catalog.gen_random_uuid()')::oid
              )
              WHEN 'boolean_constant' THEN NOT (
                lower(regexp_replace(a.actual_default, '\s+', '', 'g')) = e.expected_value
              )
              WHEN 'enum_constant' THEN NOT (
                replace(regexp_replace(a.actual_default, '\s+', '', 'g'), '"', '') IN (
                  format('%L::%I', e.expected_value, e.expected_type),
                  format('%L::public.%I', e.expected_value, e.expected_type)
                )
              )
              WHEN 'transaction_timestamp' THEN NOT (
                a.resolved_zero_arg_proc_oid IN (
                  to_regprocedure('pg_catalog.now()')::oid,
                  to_regprocedure('pg_catalog.transaction_timestamp()')::oid
                )
                OR upper(regexp_replace(a.actual_default, '\s+', '', 'g')) = 'CURRENT_TIMESTAMP'
              )
              ELSE true
            END
    )
    SELECT count(*) INTO default_mismatch_count
    FROM default_mismatches;

    -- Index/constraint structure mirrors migration.sql's reasoning exactly:
    -- pg_index.indisunique alone cannot distinguish a bare unique index
    -- from the backing index of a table-level UNIQUE constraint — both
    -- report indisunique=true and otherwise look identical in pg_index —
    -- so pg_constraint is queried directly (via conindid, the
    -- authoritative catalog link from a constraint to the index that
    -- backs it) to determine the true kind of each object. The 7 primary
    -- keys are genuine pg_constraint rows with contype='p'; every other
    -- canonical unique object here is a bare CREATE UNIQUE INDEX, not
    -- ADD CONSTRAINT ... UNIQUE, and so must NOT be constraint-backed.
    WITH expected_indexes(index_name, table_name, expected_unique, expected_primary, expected_columns, expected_contype) AS (
      VALUES
        ('org_units_pkey','org_units',true,true,'id','p'),
        ('uq_org_units_tenant_code','org_units',true,false,'tenant_id,code',NULL),
        ('idx_org_units_tenant_type_active','org_units',false,false,'tenant_id,type,is_active',NULL),
        ('idx_org_units_tenant_parent','org_units',false,false,'tenant_id,parent_id',NULL),
        ('org_assignments_pkey','org_assignments',true,true,'id','p'),
        ('uq_org_assignments_tenant_user_unit','org_assignments',true,false,'tenant_id,user_id,org_unit_id',NULL),
        ('idx_org_assignments_tenant_user_status','org_assignments',false,false,'tenant_id,user_id,status',NULL),
        ('idx_org_assignments_tenant_unit_status','org_assignments',false,false,'tenant_id,org_unit_id,status',NULL),
        ('access_permissions_pkey','access_permissions',true,true,'id','p'),
        ('access_permissions_key_key','access_permissions',true,false,'key',NULL),
        ('idx_access_permissions_resource_action_active','access_permissions',false,false,'resource,action,is_active',NULL),
        ('access_roles_pkey','access_roles',true,true,'id','p'),
        ('uq_access_roles_tenant_key','access_roles',true,false,'tenant_id,key',NULL),
        ('idx_access_roles_tenant_active','access_roles',false,false,'tenant_id,is_active',NULL),
        ('access_role_permissions_pkey','access_role_permissions',true,true,'id','p'),
        ('uq_access_role_permissions_tenant_role_permission','access_role_permissions',true,false,'tenant_id,access_role_id,permission_id',NULL),
        ('idx_access_role_permissions_tenant_role','access_role_permissions',false,false,'tenant_id,access_role_id',NULL),
        ('idx_access_role_permissions_tenant_permission','access_role_permissions',false,false,'tenant_id,permission_id',NULL),
        ('role_assignments_pkey','role_assignments',true,true,'id','p'),
        ('idx_role_assignments_tenant_user_status','role_assignments',false,false,'tenant_id,user_id,status',NULL),
        ('idx_role_assignments_tenant_role_status','role_assignments',false,false,'tenant_id,access_role_id,status',NULL),
        ('idx_role_assignments_tenant_scope_unit','role_assignments',false,false,'tenant_id,scope_type,scope_org_unit_id',NULL),
        ('idx_role_assignments_tenant_resource','role_assignments',false,false,'tenant_id,resource_type,resource_id',NULL),
        ('authorization_audits_pkey','authorization_audits',true,true,'id','p'),
        ('idx_authorization_audits_tenant_created','authorization_audits',false,false,'tenant_id,created_at',NULL),
        ('idx_authorization_audits_tenant_user_created','authorization_audits',false,false,'tenant_id,user_id,created_at',NULL),
        ('idx_authorization_audits_tenant_permission_created','authorization_audits',false,false,'tenant_id,permission_key,created_at',NULL),
        ('idx_authorization_audits_tenant_decision_created','authorization_audits',false,false,'tenant_id,decision,created_at',NULL)
    ),
    actual_indexes AS (
      SELECT
        ic.relname AS index_name,
        tc.relname AS table_name,
        i.indisunique AS actual_unique,
        i.indisprimary AS actual_primary,
        (i.indpred IS NOT NULL) AS has_predicate,
        (i.indexprs IS NOT NULL) AS has_expression,
        (
          SELECT string_agg(att.attname, ',' ORDER BY k.ord)
          FROM unnest(i.indkey::int2[]) WITH ORDINALITY AS k(attnum, ord)
          JOIN pg_attribute att ON att.attrelid = i.indrelid AND att.attnum = k.attnum
        ) AS actual_columns,
        (SELECT con.contype FROM pg_constraint con WHERE con.conindid = ic.oid) AS actual_contype
      FROM pg_index i
      JOIN pg_class ic ON ic.oid = i.indexrelid
      JOIN pg_class tc ON tc.oid = i.indrelid
      JOIN pg_namespace n ON n.oid = ic.relnamespace
      WHERE n.nspname = 'public'
        AND tc.relname IN ('org_units', 'org_assignments', 'access_permissions', 'access_roles',
                            'access_role_permissions', 'role_assignments', 'authorization_audits')
    )
    SELECT count(*) INTO index_mismatch_count
    FROM expected_indexes e
    LEFT JOIN actual_indexes a ON a.index_name = e.index_name
    WHERE a.index_name IS NULL
       OR a.table_name IS DISTINCT FROM e.table_name
       OR a.actual_unique IS DISTINCT FROM e.expected_unique
       OR a.actual_primary IS DISTINCT FROM e.expected_primary
       OR a.has_predicate IS TRUE
       OR a.has_expression IS TRUE
       OR a.actual_columns IS DISTINCT FROM e.expected_columns
       OR a.actual_contype IS DISTINCT FROM e.expected_contype;

    IF NOT (column_mismatch_count = 0 AND enum_mismatch_count = 0 AND index_mismatch_count = 0 AND default_mismatch_count = 0) THEN
      RAISE EXCEPTION 'PREFLIGHT_FAIL G3 fully present but structurally incompatible with prisma/rbac.prisma (column mismatches=%, enum label mismatches=%, incorrect/missing indexes or constraints=%, default value mismatches=%)', column_mismatch_count, enum_mismatch_count, index_mismatch_count, default_mismatch_count;
    END IF;
  END IF;

  -- contract_deliveries is new, unconditional migration output — it is not
  -- part of G3 reconciliation, so it must not already exist under any
  -- circumstance, exactly as before.
  SELECT string_agg(target.name, ', ') INTO collision
  FROM (VALUES ('contract_deliveries')) AS target(name)
  WHERE to_regclass(format('public.%I', target.name)) IS NOT NULL;
  IF collision IS NOT NULL THEN
    RAISE EXCEPTION 'PREFLIGHT_FAIL target tables already exist (partial install): %', collision;
  END IF;

  -- 4. document.contract_id / snapshot extension columns not installed.
  SELECT string_agg(c.table_name || '.' || c.column_name, ', ') INTO collision
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND ((c.table_name = 'documents' AND c.column_name = 'contract_id')
      OR (c.table_name = 'contract_snapshots'
          AND c.column_name IN ('contract_version', 'signature_evidence_hash')));
  IF collision IS NOT NULL THEN
    RAISE EXCEPTION 'PREFLIGHT_FAIL target columns already exist (partial install): %', collision;
  END IF;

  -- 5. Target indexes / constraints not installed.
  SELECT string_agg(target.name, ', ') INTO collision
  FROM (VALUES ('uq_contracts_tenant_id'), ('uq_documents_tenant_id'),
               ('idx_documents_tenant_contract'),
               ('uq_contract_snapshots_tenant_contract_type_version'),
               ('idx_contract_deliveries_tenant_contract_created'),
               ('idx_contract_deliveries_tenant_status_created'),
               ('idx_contract_deliveries_tenant_document'),
               ('idx_contract_deliveries_tenant_snapshot')) AS target(name)
  WHERE to_regclass(format('public.%I', target.name)) IS NOT NULL;
  IF collision IS NOT NULL THEN
    RAISE EXCEPTION 'PREFLIGHT_FAIL target indexes already exist (partial install): %', collision;
  END IF;

  SELECT string_agg(conname, ', ') INTO collision
  FROM pg_constraint
  WHERE conname IN ('documents_tenant_id_contract_id_fkey',
                    'contract_snapshots_tenant_id_contract_id_fkey',
                    'contract_snapshots_signed_operational_identity_ck');
  IF collision IS NOT NULL THEN
    RAISE EXCEPTION 'PREFLIGHT_FAIL target constraints already exist (partial install): %', collision;
  END IF;

  -- 6. Existing rows must satisfy the new constraints.
  SELECT count(*) INTO violations
  FROM contract_snapshots s
  WHERE s.contract_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM contracts c WHERE c.tenant_id = s.tenant_id AND c.id = s.contract_id
    );
  IF violations > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT_FAIL % contract_snapshots rows reference a contract outside their tenant or a missing contract', violations;
  END IF;

  SELECT count(*) INTO violations
  FROM contract_snapshots s
  WHERE s.snapshot_type = 'SIGNED_OPERATIONAL';
  IF violations > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT_FAIL % pre-existing SIGNED_OPERATIONAL snapshot rows found', violations;
  END IF;

  RAISE NOTICE 'PREFLIGHT_PASS ORCA final architecture persistence readiness';
END
$$;

ROLLBACK;
