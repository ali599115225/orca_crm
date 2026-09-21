-- EXEC-004: additive organization and scoped-authority foundation.
-- This migration is repository evidence only in the current authorization.
-- It must not be executed against Production or customer data without a
-- separate migration/data authorization and a verified recovery point.

CREATE TABLE "organization_branches" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "is_central" BOOLEAN NOT NULL DEFAULT FALSE,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "organization_branches_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "organization_branches_tenant_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "organization_branches_code_format"
    CHECK ("code" ~ '^[A-Z0-9_-]{2,32}$'),
  CONSTRAINT "organization_branches_name_length"
    CHECK (char_length(btrim("name")) BETWEEN 1 AND 120),
  CONSTRAINT "organization_branches_tenant_code_key"
    UNIQUE ("tenant_id", "code")
);

CREATE UNIQUE INDEX "organization_branches_one_central_per_tenant"
  ON "organization_branches" ("tenant_id")
  WHERE "is_central" = TRUE;

CREATE TABLE "organization_departments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "branch_id" UUID,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "is_central" BOOLEAN NOT NULL DEFAULT FALSE,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "organization_departments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "organization_departments_tenant_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "organization_departments_branch_fkey"
    FOREIGN KEY ("branch_id") REFERENCES "organization_branches"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "organization_departments_code_format"
    CHECK ("code" ~ '^[A-Z0-9_-]{2,32}$'),
  CONSTRAINT "organization_departments_name_length"
    CHECK (char_length(btrim("name")) BETWEEN 1 AND 120),
  CONSTRAINT "organization_departments_central_scope" CHECK (
    ("is_central" = TRUE AND "branch_id" IS NULL) OR
    ("is_central" = FALSE AND "branch_id" IS NOT NULL)
  )
);

CREATE UNIQUE INDEX "organization_departments_scope_code_key"
  ON "organization_departments" (
    "tenant_id",
    COALESCE("branch_id", '00000000-0000-0000-0000-000000000000'::UUID),
    "code"
  );

CREATE TABLE "organization_teams" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "branch_id" UUID,
  "department_id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "organization_teams_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "organization_teams_tenant_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "organization_teams_branch_fkey"
    FOREIGN KEY ("branch_id") REFERENCES "organization_branches"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "organization_teams_department_fkey"
    FOREIGN KEY ("department_id") REFERENCES "organization_departments"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "organization_teams_code_format"
    CHECK ("code" ~ '^[A-Z0-9_-]{2,32}$'),
  CONSTRAINT "organization_teams_name_length"
    CHECK (char_length(btrim("name")) BETWEEN 1 AND 120)
);

CREATE UNIQUE INDEX "organization_teams_department_code_key"
  ON "organization_teams" ("tenant_id", "department_id", "code");

CREATE TABLE "branch_services" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "branch_id" UUID NOT NULL,
  "service_line" TEXT NOT NULL,
  "manager_user_id" UUID,
  "enabled" BOOLEAN NOT NULL DEFAULT FALSE,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "branch_services_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "branch_services_tenant_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "branch_services_branch_fkey"
    FOREIGN KEY ("branch_id") REFERENCES "organization_branches"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "branch_services_manager_fkey"
    FOREIGN KEY ("manager_user_id") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "branch_services_service_line_check" CHECK (
    "service_line" IN (
      'BROKERAGE',
      'MARKETING',
      'SALES',
      'LEASING',
      'PROPERTY_MANAGEMENT',
      'FACILITY_MANAGEMENT',
      'MAINTENANCE',
      'CUSTOMER_SERVICE',
      'FINANCE_AND_COLLECTION',
      'DOCUMENTS',
      'REPORTING'
    )
  ),
  CONSTRAINT "branch_services_tenant_branch_line_key"
    UNIQUE ("tenant_id", "branch_id", "service_line")
);

CREATE TABLE "user_scope_assignments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "security_role" TEXT NOT NULL,
  "scope_type" TEXT NOT NULL,
  "branch_id" UUID,
  "department_id" UUID,
  "team_id" UUID,
  "assigned_resource_type" TEXT,
  "assigned_resource_id" UUID,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "starts_at" TIMESTAMPTZ,
  "ends_at" TIMESTAMPTZ,
  "assigned_by_user_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_scope_assignments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "user_scope_assignments_tenant_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "user_scope_assignments_user_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "user_scope_assignments_assigned_by_fkey"
    FOREIGN KEY ("assigned_by_user_id") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "user_scope_assignments_branch_fkey"
    FOREIGN KEY ("branch_id") REFERENCES "organization_branches"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "user_scope_assignments_department_fkey"
    FOREIGN KEY ("department_id") REFERENCES "organization_departments"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "user_scope_assignments_team_fkey"
    FOREIGN KEY ("team_id") REFERENCES "organization_teams"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "user_scope_assignments_no_self_grant"
    CHECK ("user_id" <> "assigned_by_user_id"),
  CONSTRAINT "user_scope_assignments_security_role_check" CHECK (
    "security_role" IN (
      'PLATFORM_OWNER',
      'GENERAL_MANAGER',
      'OPERATIONS_MANAGER',
      'BRANCH_MANAGER',
      'SALES_LEASING_MANAGER',
      'BROKER_AGENT',
      'PROPERTY_MANAGER',
      'FACILITY_MAINTENANCE_MANAGER',
      'MAINTENANCE_COORDINATOR',
      'TECHNICIAN_CONTRACTOR',
      'FINANCE_MANAGER',
      'ACCOUNTANT_COLLECTOR',
      'CUSTOMER_SERVICE_REPRESENTATIVE',
      'COMPLIANCE_AUDIT',
      'SYSTEM_ADMINISTRATOR'
    )
  ),
  CONSTRAINT "user_scope_assignments_scope_type_check" CHECK (
    "scope_type" IN ('COMPANY', 'BRANCH', 'DEPARTMENT', 'TEAM', 'ASSIGNED_RESOURCE')
  ),
  CONSTRAINT "user_scope_assignments_window_check"
    CHECK ("ends_at" IS NULL OR "starts_at" IS NULL OR "ends_at" > "starts_at"),
  CONSTRAINT "user_scope_assignments_scope_shape_check" CHECK (
    (
      "scope_type" = 'COMPANY' AND
      "branch_id" IS NULL AND "department_id" IS NULL AND "team_id" IS NULL AND
      "assigned_resource_type" IS NULL AND "assigned_resource_id" IS NULL
    ) OR (
      "scope_type" = 'BRANCH' AND
      "branch_id" IS NOT NULL AND "department_id" IS NULL AND "team_id" IS NULL AND
      "assigned_resource_type" IS NULL AND "assigned_resource_id" IS NULL
    ) OR (
      "scope_type" = 'DEPARTMENT' AND
      "department_id" IS NOT NULL AND "team_id" IS NULL AND
      "assigned_resource_type" IS NULL AND "assigned_resource_id" IS NULL
    ) OR (
      "scope_type" = 'TEAM' AND
      "department_id" IS NOT NULL AND "team_id" IS NOT NULL AND
      "assigned_resource_type" IS NULL AND "assigned_resource_id" IS NULL
    ) OR (
      "scope_type" = 'ASSIGNED_RESOURCE' AND
      "assigned_resource_type" IS NOT NULL AND "assigned_resource_id" IS NOT NULL
    )
  )
);

CREATE INDEX "user_scope_assignments_lookup_idx"
  ON "user_scope_assignments" ("tenant_id", "user_id", "is_active");
CREATE INDEX "user_scope_assignments_branch_idx"
  ON "user_scope_assignments" ("tenant_id", "branch_id");
CREATE INDEX "user_scope_assignments_department_idx"
  ON "user_scope_assignments" ("tenant_id", "department_id");
CREATE INDEX "user_scope_assignments_team_idx"
  ON "user_scope_assignments" ("tenant_id", "team_id");
CREATE INDEX "user_scope_assignments_resource_idx"
  ON "user_scope_assignments" (
    "tenant_id",
    "assigned_resource_type",
    "assigned_resource_id"
  );

CREATE TABLE "organization_authority_audit" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "actor_user_id" UUID NOT NULL,
  "action" TEXT NOT NULL,
  "target_type" TEXT NOT NULL,
  "target_id" UUID,
  "branch_id" UUID,
  "details" JSONB NOT NULL DEFAULT '{}'::JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "organization_authority_audit_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "organization_authority_audit_tenant_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "organization_authority_audit_actor_fkey"
    FOREIGN KEY ("actor_user_id") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "organization_authority_audit_branch_fkey"
    FOREIGN KEY ("branch_id") REFERENCES "organization_branches"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "organization_authority_audit_tenant_time_idx"
  ON "organization_authority_audit" ("tenant_id", "created_at" DESC);
CREATE INDEX "organization_authority_audit_target_idx"
  ON "organization_authority_audit" ("tenant_id", "target_type", "target_id");

CREATE FUNCTION "exec004_validate_department_scope"()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW."is_central" AND NEW."branch_id" IS NOT NULL) OR
     (NOT NEW."is_central" AND NEW."branch_id" IS NULL) THEN
    RAISE EXCEPTION 'invalid organization department scope';
  END IF;

  IF NEW."branch_id" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "organization_branches"
    WHERE "id" = NEW."branch_id"
      AND "tenant_id" = NEW."tenant_id"
  ) THEN
    RAISE EXCEPTION 'organization department branch tenant mismatch';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "organization_departments_tenant_scope"
BEFORE INSERT OR UPDATE ON "organization_departments"
FOR EACH ROW EXECUTE FUNCTION "exec004_validate_department_scope"();

CREATE FUNCTION "exec004_validate_team_scope"()
RETURNS TRIGGER AS $$
DECLARE
  parent_branch_id UUID;
BEGIN
  SELECT "branch_id" INTO parent_branch_id
  FROM "organization_departments"
  WHERE "id" = NEW."department_id"
    AND "tenant_id" = NEW."tenant_id";

  IF NOT FOUND THEN
    RAISE EXCEPTION 'organization team department tenant mismatch';
  END IF;

  IF parent_branch_id IS DISTINCT FROM NEW."branch_id" THEN
    RAISE EXCEPTION 'organization team branch hierarchy mismatch';
  END IF;

  IF NEW."branch_id" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "organization_branches"
    WHERE "id" = NEW."branch_id"
      AND "tenant_id" = NEW."tenant_id"
  ) THEN
    RAISE EXCEPTION 'organization team branch tenant mismatch';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "organization_teams_tenant_scope"
BEFORE INSERT OR UPDATE ON "organization_teams"
FOR EACH ROW EXECUTE FUNCTION "exec004_validate_team_scope"();

CREATE FUNCTION "exec004_validate_branch_service_scope"()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "organization_branches"
    WHERE "id" = NEW."branch_id"
      AND "tenant_id" = NEW."tenant_id"
  ) THEN
    RAISE EXCEPTION 'branch service tenant mismatch';
  END IF;

  IF NEW."manager_user_id" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "users"
    WHERE "id" = NEW."manager_user_id"
      AND "tenant_id" = NEW."tenant_id"
  ) THEN
    RAISE EXCEPTION 'branch service manager tenant mismatch';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "branch_services_tenant_scope"
BEFORE INSERT OR UPDATE ON "branch_services"
FOR EACH ROW EXECUTE FUNCTION "exec004_validate_branch_service_scope"();

CREATE FUNCTION "exec004_validate_assignment_scope"()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "users"
    WHERE "id" = NEW."user_id"
      AND "tenant_id" = NEW."tenant_id"
  ) THEN
    RAISE EXCEPTION 'assignment user tenant mismatch';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM "users"
    WHERE "id" = NEW."assigned_by_user_id"
      AND "tenant_id" = NEW."tenant_id"
  ) THEN
    RAISE EXCEPTION 'assignment actor tenant mismatch';
  END IF;

  IF NEW."branch_id" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "organization_branches"
    WHERE "id" = NEW."branch_id"
      AND "tenant_id" = NEW."tenant_id"
  ) THEN
    RAISE EXCEPTION 'assignment branch tenant mismatch';
  END IF;

  IF NEW."department_id" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "organization_departments"
    WHERE "id" = NEW."department_id"
      AND "tenant_id" = NEW."tenant_id"
      AND "branch_id" IS NOT DISTINCT FROM NEW."branch_id"
  ) THEN
    RAISE EXCEPTION 'assignment department hierarchy mismatch';
  END IF;

  IF NEW."team_id" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "organization_teams"
    WHERE "id" = NEW."team_id"
      AND "tenant_id" = NEW."tenant_id"
      AND "department_id" IS NOT DISTINCT FROM NEW."department_id"
      AND "branch_id" IS NOT DISTINCT FROM NEW."branch_id"
  ) THEN
    RAISE EXCEPTION 'assignment team hierarchy mismatch';
  END IF;

  IF
    (NEW."security_role" IN ('PLATFORM_OWNER', 'GENERAL_MANAGER', 'SYSTEM_ADMINISTRATOR')
      AND NEW."scope_type" <> 'COMPANY') OR
    (NEW."security_role" = 'OPERATIONS_MANAGER'
      AND NEW."scope_type" NOT IN ('COMPANY', 'BRANCH', 'DEPARTMENT')) OR
    (NEW."security_role" = 'BRANCH_MANAGER'
      AND NEW."scope_type" <> 'BRANCH') OR
    (NEW."security_role" = 'SALES_LEASING_MANAGER'
      AND NEW."scope_type" NOT IN ('BRANCH', 'DEPARTMENT', 'TEAM')) OR
    (NEW."security_role" = 'BROKER_AGENT'
      AND NEW."scope_type" NOT IN ('BRANCH', 'DEPARTMENT', 'TEAM', 'ASSIGNED_RESOURCE')) OR
    (NEW."security_role" IN ('PROPERTY_MANAGER', 'FACILITY_MAINTENANCE_MANAGER', 'CUSTOMER_SERVICE_REPRESENTATIVE')
      AND NEW."scope_type" NOT IN ('COMPANY', 'BRANCH', 'DEPARTMENT', 'TEAM', 'ASSIGNED_RESOURCE')) OR
    (NEW."security_role" = 'MAINTENANCE_COORDINATOR'
      AND NEW."scope_type" NOT IN ('BRANCH', 'DEPARTMENT', 'TEAM', 'ASSIGNED_RESOURCE')) OR
    (NEW."security_role" = 'TECHNICIAN_CONTRACTOR'
      AND NEW."scope_type" NOT IN ('TEAM', 'ASSIGNED_RESOURCE')) OR
    (NEW."security_role" IN ('FINANCE_MANAGER', 'COMPLIANCE_AUDIT')
      AND NEW."scope_type" NOT IN ('COMPANY', 'BRANCH')) OR
    (NEW."security_role" = 'ACCOUNTANT_COLLECTOR'
      AND NEW."scope_type" NOT IN ('COMPANY', 'BRANCH', 'DEPARTMENT', 'TEAM'))
  THEN
    RAISE EXCEPTION 'security role scope mismatch';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "user_scope_assignments_tenant_scope"
BEFORE INSERT OR UPDATE ON "user_scope_assignments"
FOR EACH ROW EXECUTE FUNCTION "exec004_validate_assignment_scope"();

CREATE FUNCTION "exec004_validate_authority_audit_scope"()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "users"
    WHERE "id" = NEW."actor_user_id"
      AND "tenant_id" = NEW."tenant_id"
  ) THEN
    RAISE EXCEPTION 'authority audit actor tenant mismatch';
  END IF;

  IF NEW."branch_id" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "organization_branches"
    WHERE "id" = NEW."branch_id"
      AND "tenant_id" = NEW."tenant_id"
  ) THEN
    RAISE EXCEPTION 'authority audit branch tenant mismatch';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "organization_authority_audit_tenant_scope"
BEFORE INSERT ON "organization_authority_audit"
FOR EACH ROW EXECUTE FUNCTION "exec004_validate_authority_audit_scope"();

CREATE FUNCTION "exec004_prevent_authority_audit_mutation"()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'organization_authority_audit is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "organization_authority_audit_append_only"
BEFORE UPDATE OR DELETE ON "organization_authority_audit"
FOR EACH ROW EXECUTE FUNCTION "exec004_prevent_authority_audit_mutation"();
