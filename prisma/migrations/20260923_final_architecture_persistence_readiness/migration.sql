-- ORCA Batch 05 — final architecture persistence readiness.
-- Artifact only: not applied by this change. Run
-- prisma/migration-readiness/ORCA_FINAL_ARCHITECTURE/preflight.sql first.
-- Scope: G3 RBAC persistence (prisma/rbac.prisma), Contract tenant identity,
-- Document <-> Contract association, SIGNED_OPERATIONAL ContractSnapshot
-- extension, ContractDelivery. No data backfill.

-- ============================================================
-- G3 persistence — mirrors prisma/rbac.prisma exactly
-- Reconciliation-safe:
--   * G3 absent (0 of 13 canonical objects) -> create fresh, identical to
--     before.
--   * G3 fully present (13 of 13) AND structurally compatible with
--     prisma/rbac.prisma (columns, types, nullability, exact default
--     semantics, enum labels, and the exact object type/column list/order
--     of every primary key, unique constraint and index) -> skip creation
--     without touching a single existing G3 object.
--   * G3 fully present but structurally INCOMPATIBLE -> fail closed.
--   * G3 partially present (neither 0 nor 13) -> fail closed.
-- Nothing is ever guessed at, patched, or silently masked; a blanket
-- CREATE TABLE/TYPE IF NOT EXISTS is deliberately not used anywhere here.
-- ============================================================

DO $g3_reconcile$
DECLARE
  g3_existing_count INT;
  g3_total_count CONSTANT INT := 13;
  column_mismatch_count INT;
  enum_mismatch_count INT;
  index_mismatch_count INT;
  default_mismatch_count INT;
BEGIN
  SELECT
    (SELECT count(*) FROM pg_type t
       JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
        AND t.typname IN ('org_unit_type', 'org_assignment_status', 'access_scope_type',
                           'role_assignment_status', 'authorization_mode', 'authorization_decision'))
    +
    (SELECT count(*) FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r'
        AND c.relname IN ('org_units', 'org_assignments', 'access_permissions', 'access_roles',
                           'access_role_permissions', 'role_assignments', 'authorization_audits'))
    INTO g3_existing_count;

  IF g3_existing_count = g3_total_count THEN
    -- Structural compatibility gate. Column name, type and nullability are
    -- checked exactly; every column with a canonical default in
    -- prisma/rbac.prisma is checked against its exact expected default
    -- expression (whitespace-normalized, not brittle-formatting-sensitive);
    -- enum labels are checked exactly; and every canonical primary key,
    -- unique constraint and index is checked by name AND by its exact
    -- object type (primary/unique/plain), ordered column list, and absence
    -- of any predicate or expression — a correctly named object with the
    -- wrong definition fails this gate. G3 has no foreign keys per
    -- prisma/rbac.prisma, so none are checked.
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

    -- Index/constraint structure. A correctly named object on the wrong
    -- columns, in the wrong order, with the wrong uniqueness, or of the
    -- wrong CATALOG OBJECT TYPE fails this check. pg_index.indisunique
    -- alone cannot distinguish a bare unique index from the backing index
    -- of a table-level UNIQUE constraint — both report indisunique=true
    -- and otherwise look identical in pg_index — so pg_constraint is
    -- queried directly (via conindid, the authoritative catalog link from
    -- a constraint to the index that backs it) to determine the true kind
    -- of each object. Per the canonical DDL below, the 7 primary keys are
    -- declared with an inline CONSTRAINT ... PRIMARY KEY clause and are
    -- therefore genuine pg_constraint rows with contype='p'; every other
    -- canonical unique object here is declared with a bare
    -- CREATE UNIQUE INDEX statement, not ADD CONSTRAINT ... UNIQUE, and so
    -- MUST NOT be backed by any pg_constraint row (expected_contype IS
    -- NULL) — a same-name, same-columns object that has been upgraded (or
    -- downgraded) to a different catalog kind than the canonical DDL
    -- declares is treated as incompatible, not as an acceptable variant.
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

    IF column_mismatch_count = 0 AND enum_mismatch_count = 0 AND index_mismatch_count = 0 AND default_mismatch_count = 0 THEN
      RAISE NOTICE 'G3_RECONCILIATION: all % canonical G3 objects present and structurally compatible with prisma/rbac.prisma — skipping G3 creation.', g3_total_count;
    ELSE
      RAISE EXCEPTION 'G3_RECONCILIATION_BLOCKED: G3 fully present but structurally incompatible with prisma/rbac.prisma (column mismatches=%, enum label mismatches=%, incorrect/missing indexes or constraints=%, default value mismatches=%); refusing to skip, create, alter or drop anything. Manual investigation required.', column_mismatch_count, enum_mismatch_count, index_mismatch_count, default_mismatch_count;
    END IF;
  ELSIF g3_existing_count = 0 THEN
    RAISE NOTICE 'G3_RECONCILIATION: G3 absent — creating canonical G3 objects.';

    EXECUTE $ddl$
CREATE TYPE "org_unit_type" AS ENUM ('COMPANY', 'BRANCH', 'DEPARTMENT', 'TEAM');
CREATE TYPE "org_assignment_status" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "access_scope_type" AS ENUM ('TENANT', 'BRANCH', 'DEPARTMENT', 'TEAM', 'SELF', 'RESOURCE');
CREATE TYPE "role_assignment_status" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "authorization_mode" AS ENUM ('AUDIT', 'ENFORCE');
CREATE TYPE "authorization_decision" AS ENUM ('ALLOW', 'DENY', 'SHADOW_ALLOW', 'SHADOW_DENY', 'ERROR');
    $ddl$;

    EXECUTE $ddl$
CREATE TABLE "org_units" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "parent_id" UUID,
  "type" "org_unit_type" NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "org_units_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "uq_org_units_tenant_code" ON "org_units" ("tenant_id", "code");
CREATE INDEX "idx_org_units_tenant_type_active" ON "org_units" ("tenant_id", "type", "is_active");
CREATE INDEX "idx_org_units_tenant_parent" ON "org_units" ("tenant_id", "parent_id");
COMMENT ON TABLE "org_units" IS 'ORCA_G3_PROVENANCE:20260923_final_architecture_persistence_readiness';
    $ddl$;

    EXECUTE $ddl$
CREATE TABLE "org_assignments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "org_unit_id" UUID NOT NULL,
  "status" "org_assignment_status" NOT NULL DEFAULT 'ACTIVE',
  "is_primary" BOOLEAN NOT NULL DEFAULT false,
  "valid_from" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "valid_until" TIMESTAMPTZ,
  "created_by_id" UUID,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "org_assignments_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "uq_org_assignments_tenant_user_unit" ON "org_assignments" ("tenant_id", "user_id", "org_unit_id");
CREATE INDEX "idx_org_assignments_tenant_user_status" ON "org_assignments" ("tenant_id", "user_id", "status");
CREATE INDEX "idx_org_assignments_tenant_unit_status" ON "org_assignments" ("tenant_id", "org_unit_id", "status");
    $ddl$;

    EXECUTE $ddl$
CREATE TABLE "access_permissions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "key" TEXT NOT NULL,
  "resource" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "risk" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "access_permissions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "access_permissions_key_key" ON "access_permissions" ("key");
CREATE INDEX "idx_access_permissions_resource_action_active" ON "access_permissions" ("resource", "action", "is_active");
    $ddl$;

    EXECUTE $ddl$
CREATE TABLE "access_roles" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "is_system" BOOLEAN NOT NULL DEFAULT false,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "access_roles_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "uq_access_roles_tenant_key" ON "access_roles" ("tenant_id", "key");
CREATE INDEX "idx_access_roles_tenant_active" ON "access_roles" ("tenant_id", "is_active");
    $ddl$;

    EXECUTE $ddl$
CREATE TABLE "access_role_permissions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "access_role_id" UUID NOT NULL,
  "permission_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "access_role_permissions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "uq_access_role_permissions_tenant_role_permission" ON "access_role_permissions" ("tenant_id", "access_role_id", "permission_id");
CREATE INDEX "idx_access_role_permissions_tenant_role" ON "access_role_permissions" ("tenant_id", "access_role_id");
CREATE INDEX "idx_access_role_permissions_tenant_permission" ON "access_role_permissions" ("tenant_id", "permission_id");
    $ddl$;

    EXECUTE $ddl$
CREATE TABLE "role_assignments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "access_role_id" UUID NOT NULL,
  "scope_type" "access_scope_type" NOT NULL,
  "scope_org_unit_id" UUID,
  "resource_type" TEXT,
  "resource_id" UUID,
  "status" "role_assignment_status" NOT NULL DEFAULT 'ACTIVE',
  "valid_from" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "valid_until" TIMESTAMPTZ,
  "created_by_id" UUID,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "role_assignments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "idx_role_assignments_tenant_user_status" ON "role_assignments" ("tenant_id", "user_id", "status");
CREATE INDEX "idx_role_assignments_tenant_role_status" ON "role_assignments" ("tenant_id", "access_role_id", "status");
CREATE INDEX "idx_role_assignments_tenant_scope_unit" ON "role_assignments" ("tenant_id", "scope_type", "scope_org_unit_id");
CREATE INDEX "idx_role_assignments_tenant_resource" ON "role_assignments" ("tenant_id", "resource_type", "resource_id");
    $ddl$;

    EXECUTE $ddl$
CREATE TABLE "authorization_audits" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "user_id" UUID,
  "permission_key" TEXT NOT NULL,
  "mode" "authorization_mode" NOT NULL,
  "decision" "authorization_decision" NOT NULL,
  "legacy_allowed" BOOLEAN,
  "rbac_allowed" BOOLEAN NOT NULL,
  "scope_type" "access_scope_type",
  "scope_id" UUID,
  "resource_type" TEXT,
  "resource_id" UUID,
  "reason_code" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "request_id" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "authorization_audits_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "idx_authorization_audits_tenant_created" ON "authorization_audits" ("tenant_id", "created_at");
CREATE INDEX "idx_authorization_audits_tenant_user_created" ON "authorization_audits" ("tenant_id", "user_id", "created_at");
CREATE INDEX "idx_authorization_audits_tenant_permission_created" ON "authorization_audits" ("tenant_id", "permission_key", "created_at");
CREATE INDEX "idx_authorization_audits_tenant_decision_created" ON "authorization_audits" ("tenant_id", "decision", "created_at");
    $ddl$;
  ELSE
    RAISE EXCEPTION 'G3_RECONCILIATION_BLOCKED: partial G3 installation detected (% of % canonical objects present); refusing to create, alter or drop anything. Manual investigation required.', g3_existing_count, g3_total_count;
  END IF;
END
$g3_reconcile$;

-- ============================================================
-- Contract composite tenant identity (target of tenant-bound FKs)
-- ============================================================

CREATE UNIQUE INDEX "uq_contracts_tenant_id" ON "contracts" ("tenant_id", "id");

-- ============================================================
-- Document <-> Contract association (tenant-bound)
-- ============================================================

ALTER TABLE "documents" ADD COLUMN "contract_id" UUID;
CREATE UNIQUE INDEX "uq_documents_tenant_id" ON "documents" ("tenant_id", "id");
CREATE INDEX "idx_documents_tenant_contract" ON "documents" ("tenant_id", "contract_id");
ALTER TABLE "documents"
  ADD CONSTRAINT "documents_tenant_id_contract_id_fkey"
  FOREIGN KEY ("tenant_id", "contract_id") REFERENCES "contracts"("tenant_id", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================
-- ContractSnapshot extension — SIGNED_OPERATIONAL identity
-- ============================================================

ALTER TABLE "contract_snapshots"
  ALTER COLUMN "draft_id" DROP NOT NULL,
  ALTER COLUMN "template_version_id" DROP NOT NULL,
  ADD COLUMN "contract_version" INTEGER,
  ADD COLUMN "signature_evidence_hash" VARCHAR(64);

-- Non-SIGNED_OPERATIONAL snapshots (W1 ISSUED, amendments) keep requiring
-- draft_id + template_version_id; SIGNED_OPERATIONAL snapshots require the
-- signed contract identity instead.
ALTER TABLE "contract_snapshots"
  ADD CONSTRAINT "contract_snapshots_signed_operational_identity_ck"
  CHECK (
    (
      "snapshot_type" = 'SIGNED_OPERATIONAL'
      AND "contract_id" IS NOT NULL
      AND "contract_version" IS NOT NULL
      AND "signed_at" IS NOT NULL
      AND "signature_evidence_hash" IS NOT NULL
      AND "signature_evidence_hash" ~ '^[0-9a-f]{64}$'
    )
    OR (
      "snapshot_type" <> 'SIGNED_OPERATIONAL'
      AND "draft_id" IS NOT NULL
      AND "template_version_id" IS NOT NULL
    )
  );

CREATE UNIQUE INDEX "uq_contract_snapshots_tenant_contract_type_version"
  ON "contract_snapshots" ("tenant_id", "contract_id", "snapshot_type", "contract_version");

ALTER TABLE "contract_snapshots"
  ADD CONSTRAINT "contract_snapshots_tenant_id_contract_id_fkey"
  FOREIGN KEY ("tenant_id", "contract_id") REFERENCES "contracts"("tenant_id", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================
-- ContractDelivery — durable delivery state (no provider integration)
-- ============================================================

CREATE TABLE "contract_deliveries" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "contract_id" UUID NOT NULL,
  "document_id" UUID,
  "snapshot_id" UUID,
  "recipient" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "provider" TEXT,
  "provider_reference" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "error_message" TEXT,
  "sent_at" TIMESTAMPTZ,
  "failed_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "contract_deliveries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "contract_deliveries_tenant_id_contract_id_fkey"
    FOREIGN KEY ("tenant_id", "contract_id") REFERENCES "contracts"("tenant_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "contract_deliveries_tenant_id_document_id_fkey"
    FOREIGN KEY ("tenant_id", "document_id") REFERENCES "documents"("tenant_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "contract_deliveries_tenant_id_snapshot_id_fkey"
    FOREIGN KEY ("tenant_id", "snapshot_id") REFERENCES "contract_snapshots"("tenant_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "idx_contract_deliveries_tenant_contract_created" ON "contract_deliveries" ("tenant_id", "contract_id", "created_at");
CREATE INDEX "idx_contract_deliveries_tenant_status_created" ON "contract_deliveries" ("tenant_id", "status", "created_at");
CREATE INDEX "idx_contract_deliveries_tenant_document" ON "contract_deliveries" ("tenant_id", "document_id");
CREATE INDEX "idx_contract_deliveries_tenant_snapshot" ON "contract_deliveries" ("tenant_id", "snapshot_id");
