-- G3-09 RBAC constraint/index rollback.
-- This removes only G3-09 constraints and indexes. It never drops a table,
-- column, enum, or row and does not reverse the G3-03 additive schema.
-- DROP INDEX CONCURRENTLY must run outside a transaction block.

ALTER TABLE "authorization_audits" DROP CONSTRAINT IF EXISTS "ck_authorization_audits_reason_source";
ALTER TABLE "access_permissions" DROP CONSTRAINT IF EXISTS "ck_access_permissions_risk";
ALTER TABLE "access_permissions" DROP CONSTRAINT IF EXISTS "ck_access_permissions_key_format";
ALTER TABLE "role_assignments" DROP CONSTRAINT IF EXISTS "ck_role_assignments_scope_shape";
ALTER TABLE "role_assignments" DROP CONSTRAINT IF EXISTS "ck_role_assignments_valid_window";
ALTER TABLE "org_assignments" DROP CONSTRAINT IF EXISTS "ck_org_assignments_valid_window";
ALTER TABLE "org_units" DROP CONSTRAINT IF EXISTS "ck_org_units_parent_not_self";

ALTER TABLE "authorization_audits" DROP CONSTRAINT IF EXISTS "fk_authorization_audits_permission_key";
ALTER TABLE "authorization_audits" DROP CONSTRAINT IF EXISTS "fk_authorization_audits_user_same_tenant";
ALTER TABLE "role_assignments" DROP CONSTRAINT IF EXISTS "fk_role_assignments_creator_same_tenant";
ALTER TABLE "role_assignments" DROP CONSTRAINT IF EXISTS "fk_role_assignments_scope_unit_same_tenant";
ALTER TABLE "role_assignments" DROP CONSTRAINT IF EXISTS "fk_role_assignments_role_same_tenant";
ALTER TABLE "role_assignments" DROP CONSTRAINT IF EXISTS "fk_role_assignments_user_same_tenant";
ALTER TABLE "access_role_permissions" DROP CONSTRAINT IF EXISTS "fk_access_role_permissions_permission";
ALTER TABLE "access_role_permissions" DROP CONSTRAINT IF EXISTS "fk_access_role_permissions_role_same_tenant";
ALTER TABLE "org_assignments" DROP CONSTRAINT IF EXISTS "fk_org_assignments_creator_same_tenant";
ALTER TABLE "org_assignments" DROP CONSTRAINT IF EXISTS "fk_org_assignments_unit_same_tenant";
ALTER TABLE "org_assignments" DROP CONSTRAINT IF EXISTS "fk_org_assignments_user_same_tenant";
ALTER TABLE "org_units" DROP CONSTRAINT IF EXISTS "fk_org_units_parent_same_tenant";

ALTER TABLE "authorization_audits" DROP CONSTRAINT IF EXISTS "fk_authorization_audits_tenant";
ALTER TABLE "role_assignments" DROP CONSTRAINT IF EXISTS "fk_role_assignments_tenant";
ALTER TABLE "access_role_permissions" DROP CONSTRAINT IF EXISTS "fk_access_role_permissions_tenant";
ALTER TABLE "access_roles" DROP CONSTRAINT IF EXISTS "fk_access_roles_tenant";
ALTER TABLE "org_assignments" DROP CONSTRAINT IF EXISTS "fk_org_assignments_tenant";
ALTER TABLE "org_units" DROP CONSTRAINT IF EXISTS "fk_org_units_tenant";

DROP INDEX CONCURRENTLY IF EXISTS "idx_authorization_audits_created_brin";
DROP INDEX CONCURRENTLY IF EXISTS "idx_authorization_audits_request";
DROP INDEX CONCURRENTLY IF EXISTS "idx_role_assignments_active_role_scope";
DROP INDEX CONCURRENTLY IF EXISTS "idx_role_assignments_active_window";
DROP INDEX CONCURRENTLY IF EXISTS "idx_org_assignments_active_window";
DROP INDEX CONCURRENTLY IF EXISTS "idx_users_tenant_active_role";
DROP INDEX CONCURRENTLY IF EXISTS "uq_access_roles_tenant_id_id";
DROP INDEX CONCURRENTLY IF EXISTS "uq_org_units_tenant_id_id";
DROP INDEX CONCURRENTLY IF EXISTS "uq_users_tenant_id_id";
