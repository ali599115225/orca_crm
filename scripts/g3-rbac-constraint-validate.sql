-- G3-09 RBAC constraint validation.
-- Execute only after g3-rbac-constraint-preflight.sql reports zero violations.
-- A future release runner should validate one constraint per controlled
-- maintenance transaction and record duration, lock waits, and completion.
-- This script is repository evidence only and is not executed by G3.

ALTER TABLE "org_units" VALIDATE CONSTRAINT "fk_org_units_tenant";
ALTER TABLE "org_assignments" VALIDATE CONSTRAINT "fk_org_assignments_tenant";
ALTER TABLE "access_roles" VALIDATE CONSTRAINT "fk_access_roles_tenant";
ALTER TABLE "access_role_permissions" VALIDATE CONSTRAINT "fk_access_role_permissions_tenant";
ALTER TABLE "role_assignments" VALIDATE CONSTRAINT "fk_role_assignments_tenant";
ALTER TABLE "authorization_audits" VALIDATE CONSTRAINT "fk_authorization_audits_tenant";

ALTER TABLE "org_units" VALIDATE CONSTRAINT "fk_org_units_parent_same_tenant";
ALTER TABLE "org_assignments" VALIDATE CONSTRAINT "fk_org_assignments_user_same_tenant";
ALTER TABLE "org_assignments" VALIDATE CONSTRAINT "fk_org_assignments_unit_same_tenant";
ALTER TABLE "org_assignments" VALIDATE CONSTRAINT "fk_org_assignments_creator_same_tenant";
ALTER TABLE "access_role_permissions" VALIDATE CONSTRAINT "fk_access_role_permissions_role_same_tenant";
ALTER TABLE "access_role_permissions" VALIDATE CONSTRAINT "fk_access_role_permissions_permission";
ALTER TABLE "role_assignments" VALIDATE CONSTRAINT "fk_role_assignments_user_same_tenant";
ALTER TABLE "role_assignments" VALIDATE CONSTRAINT "fk_role_assignments_role_same_tenant";
ALTER TABLE "role_assignments" VALIDATE CONSTRAINT "fk_role_assignments_scope_unit_same_tenant";
ALTER TABLE "role_assignments" VALIDATE CONSTRAINT "fk_role_assignments_creator_same_tenant";
ALTER TABLE "authorization_audits" VALIDATE CONSTRAINT "fk_authorization_audits_user_same_tenant";
ALTER TABLE "authorization_audits" VALIDATE CONSTRAINT "fk_authorization_audits_permission_key";

ALTER TABLE "org_units" VALIDATE CONSTRAINT "ck_org_units_parent_not_self";
ALTER TABLE "org_assignments" VALIDATE CONSTRAINT "ck_org_assignments_valid_window";
ALTER TABLE "role_assignments" VALIDATE CONSTRAINT "ck_role_assignments_valid_window";
ALTER TABLE "role_assignments" VALIDATE CONSTRAINT "ck_role_assignments_scope_shape";
ALTER TABLE "access_permissions" VALIDATE CONSTRAINT "ck_access_permissions_key_format";
ALTER TABLE "access_permissions" VALIDATE CONSTRAINT "ck_access_permissions_risk";
ALTER TABLE "authorization_audits" VALIDATE CONSTRAINT "ck_authorization_audits_reason_source";
