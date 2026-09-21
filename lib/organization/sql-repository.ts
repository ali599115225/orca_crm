import { Prisma } from "@prisma/client";
import { rawPrisma } from "@/lib/prisma";
import {
  type EnabledBranchService,
  type OrganizationScopeAssignment,
  type OrganizationScopeType,
  type OrganizationSecurityRole,
  type OrganizationServiceLine,
} from "@/lib/organization/contracts";
import {
  type OrganizationBranchRecord,
  type OrganizationCommandRepository,
  type OrganizationDepartmentRecord,
  type OrganizationTeamRecord,
} from "@/lib/organization/service";

function jsonDetails(value: unknown): string {
  return JSON.stringify(value);
}

type AssignmentRow = {
  id: string;
  tenantId: string;
  userId: string;
  securityRole: OrganizationSecurityRole;
  scopeType: OrganizationScopeType;
  branchId: string | null;
  departmentId: string | null;
  teamId: string | null;
  assignedResourceType: string | null;
  assignedResourceId: string | null;
  active: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
};

const assignmentColumns = Prisma.raw(`
  "id",
  "tenant_id" AS "tenantId",
  "user_id" AS "userId",
  "security_role" AS "securityRole",
  "scope_type" AS "scopeType",
  "branch_id" AS "branchId",
  "department_id" AS "departmentId",
  "team_id" AS "teamId",
  "assigned_resource_type" AS "assignedResourceType",
  "assigned_resource_id" AS "assignedResourceId",
  "is_active" AS "active",
  "starts_at" AS "startsAt",
  "ends_at" AS "endsAt"
`);

async function assertTenantUser(
  tx: Prisma.TransactionClient,
  tenantId: string,
  userId: string,
): Promise<void> {
  const rows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT "id"
    FROM "users"
    WHERE "id" = ${userId}::uuid
      AND "tenant_id" = ${tenantId}::uuid
      AND "is_active" = TRUE
    LIMIT 1
  `);
  if (rows.length !== 1) throw new Error("ORGANIZATION_USER_NOT_FOUND");
}

async function assertScopedReference(
  tx: Prisma.TransactionClient,
  table: "organization_branches" | "organization_departments" | "organization_teams",
  tenantId: string,
  id: string | null | undefined,
): Promise<void> {
  if (!id) return;
  const tableName = Prisma.raw(`\"${table}\"`);
  const rows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT "id"
    FROM ${tableName}
    WHERE "id" = ${id}::uuid
      AND "tenant_id" = ${tenantId}::uuid
      AND "is_active" = TRUE
    LIMIT 1
  `);
  if (rows.length !== 1) throw new Error("ORGANIZATION_SCOPE_REFERENCE_NOT_FOUND");
}

async function assertAssignmentHierarchy(
  tx: Prisma.TransactionClient,
  input: {
    tenantId: string;
    branchId?: string | null;
    departmentId?: string | null;
    teamId?: string | null;
  },
): Promise<void> {
  if (input.departmentId) {
    const departments = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT "id"
      FROM "organization_departments"
      WHERE "id" = ${input.departmentId}::uuid
        AND "tenant_id" = ${input.tenantId}::uuid
        AND "branch_id" IS NOT DISTINCT FROM ${input.branchId ?? null}::uuid
        AND "is_active" = TRUE
      LIMIT 1
    `);
    if (departments.length !== 1) {
      throw new Error("ORGANIZATION_DEPARTMENT_BRANCH_MISMATCH");
    }
  }

  if (input.teamId) {
    const teams = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT "id"
      FROM "organization_teams"
      WHERE "id" = ${input.teamId}::uuid
        AND "tenant_id" = ${input.tenantId}::uuid
        AND "department_id" IS NOT DISTINCT FROM ${input.departmentId ?? null}::uuid
        AND "branch_id" IS NOT DISTINCT FROM ${input.branchId ?? null}::uuid
        AND "is_active" = TRUE
      LIMIT 1
    `);
    if (teams.length !== 1) {
      throw new Error("ORGANIZATION_TEAM_HIERARCHY_MISMATCH");
    }
  }
}

export async function loadOrganizationAuthorityContext(
  tenantId: string,
  userId: string,
): Promise<{
  assignments: OrganizationScopeAssignment[];
  enabledBranchServices: EnabledBranchService[];
}> {
  const [assignments, services] = await Promise.all([
    rawPrisma.$queryRaw<AssignmentRow[]>(Prisma.sql`
      SELECT ${assignmentColumns}
      FROM "user_scope_assignments"
      WHERE "tenant_id" = ${tenantId}::uuid
        AND "user_id" = ${userId}::uuid
        AND "is_active" = TRUE
    `),
    rawPrisma.$queryRaw<
      Array<{
        branchId: string;
        serviceLine: OrganizationServiceLine;
        enabled: boolean;
      }>
    >(Prisma.sql`
      SELECT
        "branch_id" AS "branchId",
        "service_line" AS "serviceLine",
        "enabled"
      FROM "branch_services"
      WHERE "tenant_id" = ${tenantId}::uuid
    `),
  ]);

  return { assignments, enabledBranchServices: services };
}

export const organizationSqlRepository: OrganizationCommandRepository = {
  async createBranchWithAudit(input): Promise<OrganizationBranchRecord> {
    return rawPrisma.$transaction(async (tx) => {
      await assertTenantUser(tx, input.tenantId, input.actorUserId);
      const rows = await tx.$queryRaw<OrganizationBranchRecord[]>(Prisma.sql`
        INSERT INTO "organization_branches" (
          "tenant_id", "code", "name", "is_central"
        ) VALUES (
          ${input.tenantId}::uuid,
          ${input.code},
          ${input.name},
          ${input.isCentral}
        )
        RETURNING
          "id",
          "tenant_id" AS "tenantId",
          "code",
          "name",
          "is_active" AS "active"
      `);
      const branch = rows[0];
      if (!branch) throw new Error("ORGANIZATION_BRANCH_CREATE_FAILED");

      await tx.$executeRaw(Prisma.sql`
        INSERT INTO "organization_authority_audit" (
          "tenant_id", "actor_user_id", "action", "target_type",
          "target_id", "branch_id", "details"
        ) VALUES (
          ${input.tenantId}::uuid,
          ${input.actorUserId}::uuid,
          'BRANCH_CREATED',
          'BRANCH',
          ${branch.id}::uuid,
          ${branch.id}::uuid,
          ${jsonDetails({ code: input.code, name: input.name, isCentral: input.isCentral })}::jsonb
        )
      `);
      return branch;
    });
  },

  async createDepartmentWithAudit(input): Promise<OrganizationDepartmentRecord> {
    return rawPrisma.$transaction(async (tx) => {
      await assertTenantUser(tx, input.tenantId, input.actorUserId);
      await assertScopedReference(
        tx,
        "organization_branches",
        input.tenantId,
        input.branchId,
      );

      const rows = await tx.$queryRaw<OrganizationDepartmentRecord[]>(Prisma.sql`
        INSERT INTO "organization_departments" (
          "tenant_id", "branch_id", "code", "name", "is_central"
        ) VALUES (
          ${input.tenantId}::uuid,
          ${input.branchId}::uuid,
          ${input.code},
          ${input.name},
          ${input.isCentral}
        )
        RETURNING
          "id",
          "tenant_id" AS "tenantId",
          "branch_id" AS "branchId",
          "code",
          "name",
          "is_central" AS "central",
          "is_active" AS "active"
      `);
      const department = rows[0];
      if (!department) {
        throw new Error("ORGANIZATION_DEPARTMENT_CREATE_FAILED");
      }

      await tx.$executeRaw(Prisma.sql`
        INSERT INTO "organization_authority_audit" (
          "tenant_id", "actor_user_id", "action", "target_type",
          "target_id", "branch_id", "details"
        ) VALUES (
          ${input.tenantId}::uuid,
          ${input.actorUserId}::uuid,
          'DEPARTMENT_CREATED',
          'DEPARTMENT',
          ${department.id}::uuid,
          ${input.branchId}::uuid,
          ${jsonDetails({
            code: input.code,
            name: input.name,
            isCentral: input.isCentral,
          })}::jsonb
        )
      `);
      return department;
    });
  },

  async createTeamWithAudit(input): Promise<OrganizationTeamRecord> {
    return rawPrisma.$transaction(async (tx) => {
      await assertTenantUser(tx, input.tenantId, input.actorUserId);
      await assertScopedReference(
        tx,
        "organization_branches",
        input.tenantId,
        input.branchId,
      );
      await assertScopedReference(
        tx,
        "organization_departments",
        input.tenantId,
        input.departmentId,
      );
      await assertAssignmentHierarchy(tx, input);

      const rows = await tx.$queryRaw<OrganizationTeamRecord[]>(Prisma.sql`
        INSERT INTO "organization_teams" (
          "tenant_id", "branch_id", "department_id", "code", "name"
        ) VALUES (
          ${input.tenantId}::uuid,
          ${input.branchId}::uuid,
          ${input.departmentId}::uuid,
          ${input.code},
          ${input.name}
        )
        RETURNING
          "id",
          "tenant_id" AS "tenantId",
          "branch_id" AS "branchId",
          "department_id" AS "departmentId",
          "code",
          "name",
          "is_active" AS "active"
      `);
      const team = rows[0];
      if (!team) throw new Error("ORGANIZATION_TEAM_CREATE_FAILED");

      await tx.$executeRaw(Prisma.sql`
        INSERT INTO "organization_authority_audit" (
          "tenant_id", "actor_user_id", "action", "target_type",
          "target_id", "branch_id", "details"
        ) VALUES (
          ${input.tenantId}::uuid,
          ${input.actorUserId}::uuid,
          'TEAM_CREATED',
          'TEAM',
          ${team.id}::uuid,
          ${input.branchId}::uuid,
          ${jsonDetails({
            departmentId: input.departmentId,
            code: input.code,
            name: input.name,
          })}::jsonb
        )
      `);
      return team;
    });
  },

  async configureBranchServiceWithAudit(input): Promise<EnabledBranchService> {
    return rawPrisma.$transaction(async (tx) => {
      await assertTenantUser(tx, input.tenantId, input.actorUserId);
      await assertScopedReference(
        tx,
        "organization_branches",
        input.tenantId,
        input.branchId,
      );
      if (input.managerUserId) {
        await assertTenantUser(tx, input.tenantId, input.managerUserId);
      }

      const rows = await tx.$queryRaw<EnabledBranchService[]>(Prisma.sql`
        INSERT INTO "branch_services" (
          "tenant_id", "branch_id", "service_line", "manager_user_id", "enabled"
        ) VALUES (
          ${input.tenantId}::uuid,
          ${input.branchId}::uuid,
          ${input.serviceLine},
          ${input.managerUserId ?? null}::uuid,
          ${input.enabled}
        )
        ON CONFLICT ("tenant_id", "branch_id", "service_line")
        DO UPDATE SET
          "manager_user_id" = EXCLUDED."manager_user_id",
          "enabled" = EXCLUDED."enabled",
          "updated_at" = CURRENT_TIMESTAMP
        RETURNING
          "branch_id" AS "branchId",
          "service_line" AS "serviceLine",
          "enabled"
      `);
      const service = rows[0];
      if (!service) throw new Error("ORGANIZATION_SERVICE_CONFIG_FAILED");

      await tx.$executeRaw(Prisma.sql`
        INSERT INTO "organization_authority_audit" (
          "tenant_id", "actor_user_id", "action", "target_type",
          "target_id", "branch_id", "details"
        ) VALUES (
          ${input.tenantId}::uuid,
          ${input.actorUserId}::uuid,
          'BRANCH_SERVICE_CONFIGURED',
          'BRANCH_SERVICE',
          NULL,
          ${input.branchId}::uuid,
          ${jsonDetails({
            serviceLine: input.serviceLine,
            enabled: input.enabled,
            managerUserId: input.managerUserId ?? null,
          })}::jsonb
        )
      `);
      return service;
    });
  },

  async findScopeAssignment(input): Promise<OrganizationScopeAssignment | null> {
    const rows = await rawPrisma.$queryRaw<AssignmentRow[]>(Prisma.sql`
      SELECT ${assignmentColumns}
      FROM "user_scope_assignments"
      WHERE "id" = ${input.assignmentId}::uuid
        AND "tenant_id" = ${input.tenantId}::uuid
      LIMIT 1
    `);
    return rows[0] ?? null;
  },

  async createScopeAssignmentWithAudit(input): Promise<OrganizationScopeAssignment> {
    return rawPrisma.$transaction(async (tx) => {
      await assertTenantUser(tx, input.tenantId, input.actorUserId);
      await assertTenantUser(tx, input.tenantId, input.userId);
      await assertScopedReference(
        tx,
        "organization_branches",
        input.tenantId,
        input.branchId,
      );
      await assertScopedReference(
        tx,
        "organization_departments",
        input.tenantId,
        input.departmentId,
      );
      await assertScopedReference(
        tx,
        "organization_teams",
        input.tenantId,
        input.teamId,
      );
      await assertAssignmentHierarchy(tx, input);

      const rows = await tx.$queryRaw<AssignmentRow[]>(Prisma.sql`
        INSERT INTO "user_scope_assignments" (
          "tenant_id", "user_id", "security_role", "scope_type",
          "branch_id", "department_id", "team_id",
          "assigned_resource_type", "assigned_resource_id",
          "starts_at", "ends_at", "assigned_by_user_id"
        ) VALUES (
          ${input.tenantId}::uuid,
          ${input.userId}::uuid,
          ${input.securityRole},
          ${input.scopeType},
          ${input.branchId ?? null}::uuid,
          ${input.departmentId ?? null}::uuid,
          ${input.teamId ?? null}::uuid,
          ${input.assignedResourceType ?? null},
          ${input.assignedResourceId ?? null}::uuid,
          ${input.startsAt ?? null},
          ${input.endsAt ?? null},
          ${input.actorUserId}::uuid
        )
        RETURNING ${assignmentColumns}
      `);
      const assignment = rows[0];
      if (!assignment) throw new Error("ORGANIZATION_ASSIGNMENT_CREATE_FAILED");

      await tx.$executeRaw(Prisma.sql`
        INSERT INTO "organization_authority_audit" (
          "tenant_id", "actor_user_id", "action", "target_type",
          "target_id", "branch_id", "details"
        ) VALUES (
          ${input.tenantId}::uuid,
          ${input.actorUserId}::uuid,
          'SCOPE_ASSIGNMENT_CREATED',
          'USER_SCOPE_ASSIGNMENT',
          ${assignment.id}::uuid,
          ${input.branchId ?? null}::uuid,
          ${jsonDetails({
            userId: input.userId,
            securityRole: input.securityRole,
            scopeType: input.scopeType,
            departmentId: input.departmentId ?? null,
            teamId: input.teamId ?? null,
            assignedResourceType: input.assignedResourceType ?? null,
            assignedResourceId: input.assignedResourceId ?? null,
          })}::jsonb
        )
      `);
      return assignment;
    });
  },

  async revokeScopeAssignmentWithAudit(input): Promise<OrganizationScopeAssignment> {
    return rawPrisma.$transaction(async (tx) => {
      await assertTenantUser(tx, input.tenantId, input.actorUserId);
      const rows = await tx.$queryRaw<AssignmentRow[]>(Prisma.sql`
        UPDATE "user_scope_assignments"
        SET "is_active" = FALSE, "updated_at" = CURRENT_TIMESTAMP
        WHERE "id" = ${input.assignmentId}::uuid
          AND "tenant_id" = ${input.tenantId}::uuid
          AND "is_active" = TRUE
        RETURNING ${assignmentColumns}
      `);
      const assignment = rows[0];
      if (!assignment) throw new Error("ORGANIZATION_ASSIGNMENT_NOT_FOUND");

      await tx.$executeRaw(Prisma.sql`
        INSERT INTO "organization_authority_audit" (
          "tenant_id", "actor_user_id", "action", "target_type",
          "target_id", "branch_id", "details"
        ) VALUES (
          ${input.tenantId}::uuid,
          ${input.actorUserId}::uuid,
          'SCOPE_ASSIGNMENT_REVOKED',
          'USER_SCOPE_ASSIGNMENT',
          ${assignment.id}::uuid,
          ${assignment.branchId}::uuid,
          ${jsonDetails({ userId: assignment.userId, securityRole: assignment.securityRole })}::jsonb
        )
      `);
      return assignment;
    });
  },
};
