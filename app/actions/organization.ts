"use server";

import { Prisma } from "@prisma/client";
import { assertServerActionRole } from "@/lib/api-auth-guard";
import { rawPrisma } from "@/lib/prisma";
import {
  createOrganizationBranch,
  type OrganizationBranchRecord,
} from "@/lib/organization/service";
import {
  loadOrganizationAuthorityContext,
  organizationSqlRepository,
} from "@/lib/organization/sql-repository";
import { getSession } from "@/lib/session";
import { getActiveTenant } from "@/lib/tenant";

const ORGANIZATION_ROLES = ["ADMIN"] as const;

async function requireOrganizationSession() {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  const verified = await assertServerActionRole(session, ORGANIZATION_ROLES);
  const tenant = await getActiveTenant();
  return { session: verified, tenant };
}

export async function listOrganizationBranchesAction() {
  try {
    const { tenant } = await requireOrganizationSession();
    const branches = await rawPrisma.$queryRaw<OrganizationBranchRecord[]>(
      Prisma.sql`
        SELECT
          "id",
          "tenant_id" AS "tenantId",
          "code",
          "name",
          "is_active" AS "active"
        FROM "organization_branches"
        WHERE "tenant_id" = ${tenant.id}::uuid
        ORDER BY "name" ASC
      `,
    );
    return { success: true as const, branches };
  } catch (error) {
    return {
      success: false as const,
      branches: [] as OrganizationBranchRecord[],
      error: error instanceof Error ? error.message : "BRANCH_LIST_FAILED",
    };
  }
}

export async function createOrganizationBranchAction(input: {
  code: string;
  name: string;
  isCentral?: boolean;
}) {
  try {
    const { session, tenant } = await requireOrganizationSession();
    const authority = await loadOrganizationAuthorityContext(
      tenant.id,
      session.userId,
    );
    const branch = await createOrganizationBranch(
      {
        actorUserId: session.userId,
        actorTenantId: tenant.id,
        assignments: authority.assignments,
        enabledBranchServices: authority.enabledBranchServices,
      },
      organizationSqlRepository,
      input,
    );
    return { success: true as const, branch };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "BRANCH_CREATE_FAILED",
    };
  }
}
