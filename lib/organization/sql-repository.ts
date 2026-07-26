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
} from "@/lib/organization/service";

const UUID_NIL = "00000000-0000-0000-0000-000000000000";

function jsonDetails(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
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

export async function loadOrganizationAuthorityContext(
  tenantId: string,
  userId: string,
): Promise<{
  assignments: OrganizationScopeAssignment[];
  enabledBranchServices: EnabledBranchService[];
}> {
  const [assignments, services] = await Promise.all([
    rawPrisma.$queryRaw<AssignmentRow[]>(Prisma.sql`
      SELECT
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
          ${jsonDetails({ code: input.code, name: input.name, isCentral: input.isCentral })}
        )
      `);
      return branch;
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
          ${input.managerUserId ?? UUID_NIL}::uuid,
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

      if (!input.managerUserId) {
        await tx.$executeRaw(Prisma.sql`
          UPDATE "branch_services"
          SET "manager_user_id" = NULL
          WHERE "tenant_id" = ${input.tenantId}::uuid
            AND "branch_id" = ${input.branchId}::uuid
            AND "service_line" = ${input.serviceLine}
        `);
      }

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
          })}
        )
      `);
      return service;
    });
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
          ${input.branchId ?? UUID_NIL}::uuid,
          ${input.departmentId ?? UUID_NIL}::uuid,
          ${input.teamId ?? UUID_NIL}::uuid,
          ${input.assignedResourceType ?? null},
          ${input.assignedResourceId ?? UUID_NIL}::uuid,
          ${input.startsAt ?? null},
          ${input.endsAt ?? null},
          ${input.actorUserId}::uuid
        )
        RETURNING
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
      const assignment = rows[0];
      if (!assignment) throw new Error("ORGANIZATION_ASSIGNMENT_CREATE_FAILED");

      await tx.$executeRaw(Prisma.sql`
        UPDATE "user_scope_assignments"
        SET
          "branch_id" = NULLIF("branch_id", ${UUID_NIL}::uuid),
          "department_id" = NULLIF("department_id", ${UUID_NIL}::uuid),
          "team_id" = NULLIF("team_id", ${UUID_NIL}::uuid),
          "assigned_resource_id" = NULLIF("assigned_resource_id", ${UUID_NIL}::uuid)
        WHERE "id" = ${assignment.id}::uuid
      `);

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
          ${input.branchId ?? UUID_NIL}::uuid,
          ${jsonDetails({
            userId: input.userId,
            securityRole: input.securityRole,
            scopeType: input.scopeType,
            departmentId: input.departmentId ?? null,
            teamId: input.teamId ?? null,
            assignedResourceType: input.assignedResourceType ?? null,
            assignedResourceId: input.assignedResourceId ?? null,
          })}
        )
      `);
      if (!input.branchId) {
        await tx.$executeRaw(Prisma.sql`
          UPDATE "organization_authority_audit"
          SET "branch_id" = NULL
          WHERE "target_id" = ${assignment.id}::uuid
            AND "action" = 'SCOPE_ASSIGNMENT_CREATED'
        `);
      }
      return {
        ...assignment,
        branchId: input.branchId ?? null,
        departmentId: input.departmentId ?? null,
        teamId: input.teamId ?? null,
        assignedResourceId: input.assignedResourceId ?? null,
      };
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
        RETURNING
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
          ${assignment.branchId ?? UUID_NIL}::uuid,
          ${jsonDetails({ userId: assignment.userId, securityRole: assignment.securityRole })}
        )
      `);
      if (!assignment.branchId) {
        await tx.$executeRaw(Prisma.sql`
          UPDATE "organization_authority_audit"
          SET "branch_id" = NULL
          WHERE "target_id" = ${assignment.id}::uuid
            AND "action" = 'SCOPE_ASSIGNMENT_REVOKED'
        `);
      }
      return assignment;
    });
  },
};
