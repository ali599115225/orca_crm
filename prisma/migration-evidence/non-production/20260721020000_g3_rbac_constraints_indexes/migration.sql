-- G3-09 RBAC integrity expansion.
-- REVIEW-ONLY: this migration is not applied to Production by G3.
--
-- Execution contract:
-- 1. apply G3-03 expand migration;
-- 2. run the G3-04 idempotent backfill in an isolated database;
-- 3. run scripts/g3-rbac-constraint-preflight.sql and require zero violations;
-- 4. create these indexes/NOT VALID constraints in a controlled maintenance run;
-- 5. validate with scripts/g3-rbac-constraint-validate.sql;
-- 6. use scripts/g3-rbac-constraint-rollback.sql only if code rollback is insufficient.
--
-- CREATE INDEX CONCURRENTLY cannot run inside a transaction block. A future
-- release runner must execute this file without wrapping it in BEGIN/COMMIT.

-- Composite identity anchors used to enforce same-tenant foreign keys.
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "uq_users_tenant_id_id"
  ON "users" ("tenant_id", "id");
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "uq_org_units_tenant_id_id"
  ON "org_units" ("tenant_id", "id");
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "uq_access_roles_tenant_id_id"
  ON "access_roles" ("tenant_id", "id");

-- Active-resolution hot paths. Partial indexes avoid inactive-history bloat.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_users_tenant_active_role"
  ON "users" ("tenant_id", "role", "id")
  WHERE "is_active" = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_org_assignments_active_window"
  ON "org_assignments" ("tenant_id", "user_id", "valid_from", "valid_until")
  WHERE "status" = 'ACTIVE';
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_role_assignments_active_window"
  ON "role_assignments" ("tenant_id", "user_id", "valid_from", "valid_until")
  WHERE "status" = 'ACTIVE';
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_role_assignments_active_role_scope"
  ON "role_assignments" ("tenant_id", "access_role_id", "scope_type", "scope_org_unit_id")
  WHERE "status" = 'ACTIVE';
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_authorization_audits_request"
  ON "authorization_audits" ("tenant_id", "request_id")
  WHERE "request_id" IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_authorization_audits_created_brin"
  ON "authorization_audits" USING BRIN ("created_at");

-- Tenant ownership.
ALTER TABLE "org_units"
  ADD CONSTRAINT "fk_org_units_tenant"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
  ON UPDATE CASCADE ON DELETE CASCADE NOT VALID;
ALTER TABLE "org_assignments"
  ADD CONSTRAINT "fk_org_assignments_tenant"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
  ON UPDATE CASCADE ON DELETE CASCADE NOT VALID;
ALTER TABLE "access_roles"
  ADD CONSTRAINT "fk_access_roles_tenant"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
  ON UPDATE CASCADE ON DELETE CASCADE NOT VALID;
ALTER TABLE "access_role_permissions"
  ADD CONSTRAINT "fk_access_role_permissions_tenant"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
  ON UPDATE CASCADE ON DELETE CASCADE NOT VALID;
ALTER TABLE "role_assignments"
  ADD CONSTRAINT "fk_role_assignments_tenant"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
  ON UPDATE CASCADE ON DELETE CASCADE NOT VALID;
ALTER TABLE "authorization_audits"
  ADD CONSTRAINT "fk_authorization_audits_tenant"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
  ON UPDATE CASCADE ON DELETE CASCADE NOT VALID;

-- Same-tenant organization and user relations.
ALTER TABLE "org_units"
  ADD CONSTRAINT "fk_org_units_parent_same_tenant"
  FOREIGN KEY ("tenant_id", "parent_id")
  REFERENCES "org_units"("tenant_id", "id")
  ON UPDATE CASCADE ON DELETE RESTRICT NOT VALID;
ALTER TABLE "org_assignments"
  ADD CONSTRAINT "fk_org_assignments_user_same_tenant"
  FOREIGN KEY ("tenant_id", "user_id")
  REFERENCES "users"("tenant_id", "id")
  ON UPDATE CASCADE ON DELETE CASCADE NOT VALID;
ALTER TABLE "org_assignments"
  ADD CONSTRAINT "fk_org_assignments_unit_same_tenant"
  FOREIGN KEY ("tenant_id", "org_unit_id")
  REFERENCES "org_units"("tenant_id", "id")
  ON UPDATE CASCADE ON DELETE CASCADE NOT VALID;
ALTER TABLE "org_assignments"
  ADD CONSTRAINT "fk_org_assignments_creator_same_tenant"
  FOREIGN KEY ("tenant_id", "created_by_id")
  REFERENCES "users"("tenant_id", "id")
  ON UPDATE CASCADE ON DELETE SET NULL ("created_by_id") NOT VALID;

-- Same-tenant role mappings and assignments.
ALTER TABLE "access_role_permissions"
  ADD CONSTRAINT "fk_access_role_permissions_role_same_tenant"
  FOREIGN KEY ("tenant_id", "access_role_id")
  REFERENCES "access_roles"("tenant_id", "id")
  ON UPDATE CASCADE ON DELETE CASCADE NOT VALID;
ALTER TABLE "access_role_permissions"
  ADD CONSTRAINT "fk_access_role_permissions_permission"
  FOREIGN KEY ("permission_id") REFERENCES "access_permissions"("id")
  ON UPDATE CASCADE ON DELETE RESTRICT NOT VALID;
ALTER TABLE "role_assignments"
  ADD CONSTRAINT "fk_role_assignments_user_same_tenant"
  FOREIGN KEY ("tenant_id", "user_id")
  REFERENCES "users"("tenant_id", "id")
  ON UPDATE CASCADE ON DELETE CASCADE NOT VALID;
ALTER TABLE "role_assignments"
  ADD CONSTRAINT "fk_role_assignments_role_same_tenant"
  FOREIGN KEY ("tenant_id", "access_role_id")
  REFERENCES "access_roles"("tenant_id", "id")
  ON UPDATE CASCADE ON DELETE CASCADE NOT VALID;
ALTER TABLE "role_assignments"
  ADD CONSTRAINT "fk_role_assignments_scope_unit_same_tenant"
  FOREIGN KEY ("tenant_id", "scope_org_unit_id")
  REFERENCES "org_units"("tenant_id", "id")
  ON UPDATE CASCADE ON DELETE RESTRICT NOT VALID;
ALTER TABLE "role_assignments"
  ADD CONSTRAINT "fk_role_assignments_creator_same_tenant"
  FOREIGN KEY ("tenant_id", "created_by_id")
  REFERENCES "users"("tenant_id", "id")
  ON UPDATE CASCADE ON DELETE SET NULL ("created_by_id") NOT VALID;

-- Audit references preserve history when a user is removed.
ALTER TABLE "authorization_audits"
  ADD CONSTRAINT "fk_authorization_audits_user_same_tenant"
  FOREIGN KEY ("tenant_id", "user_id")
  REFERENCES "users"("tenant_id", "id")
  ON UPDATE CASCADE ON DELETE SET NULL ("user_id") NOT VALID;
ALTER TABLE "authorization_audits"
  ADD CONSTRAINT "fk_authorization_audits_permission_key"
  FOREIGN KEY ("permission_key") REFERENCES "access_permissions"("key")
  ON UPDATE CASCADE ON DELETE RESTRICT NOT VALID;

-- Temporal and shape checks are added without scanning existing rows.
ALTER TABLE "org_units"
  ADD CONSTRAINT "ck_org_units_parent_not_self"
  CHECK ("parent_id" IS NULL OR "parent_id" <> "id") NOT VALID;
ALTER TABLE "org_assignments"
  ADD CONSTRAINT "ck_org_assignments_valid_window"
  CHECK ("valid_until" IS NULL OR "valid_until" > "valid_from") NOT VALID;
ALTER TABLE "role_assignments"
  ADD CONSTRAINT "ck_role_assignments_valid_window"
  CHECK ("valid_until" IS NULL OR "valid_until" > "valid_from") NOT VALID;
ALTER TABLE "role_assignments"
  ADD CONSTRAINT "ck_role_assignments_scope_shape"
  CHECK (
    ("scope_type" = 'TENANT' AND "scope_org_unit_id" IS NULL AND "resource_type" IS NULL AND "resource_id" IS NULL)
    OR ("scope_type" IN ('BRANCH', 'DEPARTMENT', 'TEAM') AND "scope_org_unit_id" IS NOT NULL AND "resource_type" IS NULL AND "resource_id" IS NULL)
    OR ("scope_type" = 'SELF' AND "scope_org_unit_id" IS NULL AND "resource_type" IS NULL AND "resource_id" IS NULL)
    OR ("scope_type" = 'RESOURCE' AND "scope_org_unit_id" IS NULL AND "resource_type" IS NOT NULL AND "resource_id" IS NOT NULL)
  ) NOT VALID;
ALTER TABLE "access_permissions"
  ADD CONSTRAINT "ck_access_permissions_key_format"
  CHECK ("key" ~ '^[a-z][a-z0-9-]*\.[a-z][a-z0-9-]*$') NOT VALID;
ALTER TABLE "access_permissions"
  ADD CONSTRAINT "ck_access_permissions_risk"
  CHECK ("risk" IN ('READ', 'WRITE', 'APPROVE', 'ADMIN', 'SYSTEM')) NOT VALID;
ALTER TABLE "authorization_audits"
  ADD CONSTRAINT "ck_authorization_audits_reason_source"
  CHECK (length(btrim("reason_code")) > 0 AND length(btrim("source")) > 0) NOT VALID;
