-- G3-03 additive organization and RBAC expansion.
-- This migration is reviewable repository evidence only. It is not applied to
-- Production by this stage and contains no destructive statement.

CREATE TYPE "org_unit_type" AS ENUM ('COMPANY', 'BRANCH', 'DEPARTMENT', 'TEAM');
CREATE TYPE "org_assignment_status" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "access_scope_type" AS ENUM ('TENANT', 'BRANCH', 'DEPARTMENT', 'TEAM', 'SELF', 'RESOURCE');
CREATE TYPE "role_assignment_status" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "authorization_mode" AS ENUM ('AUDIT', 'ENFORCE');
CREATE TYPE "authorization_decision" AS ENUM ('ALLOW', 'DENY', 'SHADOW_ALLOW', 'SHADOW_DENY', 'ERROR');

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

CREATE TABLE "access_role_permissions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "access_role_id" UUID NOT NULL,
  "permission_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "access_role_permissions_pkey" PRIMARY KEY ("id")
);

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

CREATE UNIQUE INDEX "uq_org_units_tenant_code" ON "org_units"("tenant_id", "code");
CREATE INDEX "idx_org_units_tenant_type_active" ON "org_units"("tenant_id", "type", "is_active");
CREATE INDEX "idx_org_units_tenant_parent" ON "org_units"("tenant_id", "parent_id");

CREATE UNIQUE INDEX "uq_org_assignments_tenant_user_unit" ON "org_assignments"("tenant_id", "user_id", "org_unit_id");
CREATE INDEX "idx_org_assignments_tenant_user_status" ON "org_assignments"("tenant_id", "user_id", "status");
CREATE INDEX "idx_org_assignments_tenant_unit_status" ON "org_assignments"("tenant_id", "org_unit_id", "status");

CREATE UNIQUE INDEX "access_permissions_key_key" ON "access_permissions"("key");
CREATE INDEX "idx_access_permissions_resource_action_active" ON "access_permissions"("resource", "action", "is_active");

CREATE UNIQUE INDEX "uq_access_roles_tenant_key" ON "access_roles"("tenant_id", "key");
CREATE INDEX "idx_access_roles_tenant_active" ON "access_roles"("tenant_id", "is_active");

CREATE UNIQUE INDEX "uq_access_role_permissions_tenant_role_permission" ON "access_role_permissions"("tenant_id", "access_role_id", "permission_id");
CREATE INDEX "idx_access_role_permissions_tenant_role" ON "access_role_permissions"("tenant_id", "access_role_id");
CREATE INDEX "idx_access_role_permissions_tenant_permission" ON "access_role_permissions"("tenant_id", "permission_id");

CREATE INDEX "idx_role_assignments_tenant_user_status" ON "role_assignments"("tenant_id", "user_id", "status");
CREATE INDEX "idx_role_assignments_tenant_role_status" ON "role_assignments"("tenant_id", "access_role_id", "status");
CREATE INDEX "idx_role_assignments_tenant_scope_unit" ON "role_assignments"("tenant_id", "scope_type", "scope_org_unit_id");
CREATE INDEX "idx_role_assignments_tenant_resource" ON "role_assignments"("tenant_id", "resource_type", "resource_id");

CREATE INDEX "idx_authorization_audits_tenant_created" ON "authorization_audits"("tenant_id", "created_at");
CREATE INDEX "idx_authorization_audits_tenant_user_created" ON "authorization_audits"("tenant_id", "user_id", "created_at");
CREATE INDEX "idx_authorization_audits_tenant_permission_created" ON "authorization_audits"("tenant_id", "permission_key", "created_at");
CREATE INDEX "idx_authorization_audits_tenant_decision_created" ON "authorization_audits"("tenant_id", "decision", "created_at");
