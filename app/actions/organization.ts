"use server";

import { rawPrisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { runWithTenantContext } from "@/lib/tenant-context";
import { assertServerActionRoleWithProgressiveAuthorization } from "@/lib/authz/progressive-guards";

const ORGANIZATION_ROLES = ["ADMIN"] as const;

type CanonicalBranchRecord = Readonly<{
  id: string;
  tenantId: string;
  code: string;
  name: string;
  active: boolean;
}>;

type OrganizationPermission =
  | "organization.read"
  | "organization.manage"
  | "access.manage";

function normalizeBranchInput(codeInput: string, nameInput: string) {
  const code = codeInput.trim().toUpperCase();
  const name = nameInput.trim();

  if (!/^[A-Z0-9_-]{2,32}$/.test(code)) {
    throw new Error("INVALID_ORGANIZATION_CODE");
  }

  if (!name || name.length > 120) {
    throw new Error("INVALID_ORGANIZATION_NAME");
  }

  return { code, name };
}

async function withOrganizationSession<T>(
  permissionKey: OrganizationPermission,
  source: string,
  operation: (session: {
    userId: string;
    tenantId: string;
  }) => Promise<T>,
): Promise<T> {
  const session = await getSession();

  if (
    !session ||
    typeof session.userId !== "string" ||
    !session.userId.trim() ||
    typeof session.tenantId !== "string" ||
    !session.tenantId.trim()
  ) {
    throw new Error("UNAUTHORIZED");
  }

  const userId = session.userId;
  const tenantId = session.tenantId;

  return await runWithTenantContext(
    {
      tenantId,
      userId,
    },
    async () => {
      const verified =
        await assertServerActionRoleWithProgressiveAuthorization(
          session,
          ORGANIZATION_ROLES,
          {
            domain: "users-settings",
            permissionKey,
            source,
            resource: {
              tenantId,
            },
          },
        );

      return await operation({
        userId: verified.userId,
        tenantId: verified.tenantId,
      });
    },
  );
}

export async function listOrganizationBranchesAction() {
  try {
    return await withOrganizationSession(
      "organization.read",
      "action:listOrganizationBranchesAction",
      async (session) => {
        const branches = await rawPrisma.orgUnit.findMany({
          where: {
            tenantId: session.tenantId,
            type: "BRANCH",
            isActive: true,
          },
          orderBy: {
            name: "asc",
          },
          select: {
            id: true,
            tenantId: true,
            code: true,
            name: true,
            isActive: true,
          },
        });

        return {
          success: true as const,
          branches: branches.map(
            (branch): CanonicalBranchRecord => ({
              id: branch.id,
              tenantId: branch.tenantId,
              code: branch.code,
              name: branch.name,
              active: branch.isActive,
            }),
          ),
        };
      },
    );
  } catch (error) {
    return {
      success: false as const,
      branches: [] as CanonicalBranchRecord[],
      error:
        error instanceof Error
          ? error.message
          : "BRANCH_LIST_FAILED",
    };
  }
}

export async function createOrganizationBranchAction(input: {
  code: string;
  name: string;
  isCentral?: boolean;
}) {
  try {
    if (input.isCentral === true) {
      throw new Error("CENTRAL_SCOPE_IS_COMPANY_NOT_BRANCH");
    }

    const { code, name } = normalizeBranchInput(
      input.code,
      input.name,
    );

    return await withOrganizationSession(
      "organization.manage",
      "action:createOrganizationBranchAction",
      async (session) => {
        const existing = await rawPrisma.orgUnit.findUnique({
          where: {
            tenantId_code: {
              tenantId: session.tenantId,
              code,
            },
          },
          select: {
            id: true,
          },
        });

        if (existing) {
          throw new Error("ORGANIZATION_BRANCH_CODE_EXISTS");
        }

        const branch = await rawPrisma.$transaction(
          async (tx) => {
            const created = await tx.orgUnit.create({
              data: {
                tenantId: session.tenantId,
                parentId: null,
                type: "BRANCH",
                code,
                name,
                isActive: true,
                metadata: {
                  source: "canonical-company-branch",
                },
              },
              select: {
                id: true,
                tenantId: true,
                code: true,
                name: true,
                isActive: true,
              },
            });

            await tx.auditLog.create({
              data: {
                tenantId: session.tenantId,
                userId: session.userId,
                action: "ORGANIZATION_BRANCH_CREATED",
                tableName: "org_units",
                recordId: created.id,
                details: JSON.stringify({
                  type: "BRANCH",
                  code: created.code,
                }),
              },
            });

            return created;
          },
        );

        return {
          success: true as const,
          branch: {
            id: branch.id,
            tenantId: branch.tenantId,
            code: branch.code,
            name: branch.name,
            active: branch.isActive,
          } satisfies CanonicalBranchRecord,
        };
      },
    );
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error
          ? error.message
          : "BRANCH_CREATE_FAILED",
    };
  }
}
// ORCA_CANONICAL_ORGANIZATION_MODEL_V1

function canonicalScopeForOrgUnit(
  type: "BRANCH" | "DEPARTMENT" | "TEAM",
): "BRANCH" | "DEPARTMENT" | "TEAM" {
  return type;
}

function parseOptionalValidUntil(
  value: string | null | undefined,
): Date | null {
  if (!value) return null;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("INVALID_ASSIGNMENT_VALID_UNTIL");
  }

  if (parsed <= new Date()) {
    throw new Error("ASSIGNMENT_VALID_UNTIL_MUST_BE_FUTURE");
  }

  return parsed;
}

export async function createOrganizationDepartmentAction(input: {
  branchId?: string | null;
  code: string;
  name: string;
}) {
  try {
    const { code, name } = normalizeBranchInput(
      input.code,
      input.name,
    );

    return await withOrganizationSession(
      "organization.manage",
      "action:createOrganizationDepartmentAction",
      async (session) => {
        const branchId = String(input.branchId ?? "").trim() || null;

        if (branchId) {
          const branch = await rawPrisma.orgUnit.findFirst({
            where: {
              id: branchId,
              tenantId: session.tenantId,
              type: "BRANCH",
              isActive: true,
            },
            select: {
              id: true,
            },
          });

          if (!branch) {
            throw new Error("ORGANIZATION_BRANCH_NOT_FOUND");
          }
        }

        const duplicate = await rawPrisma.orgUnit.findUnique({
          where: {
            tenantId_code: {
              tenantId: session.tenantId,
              code,
            },
          },
          select: {
            id: true,
          },
        });

        if (duplicate) {
          throw new Error("ORGANIZATION_UNIT_CODE_EXISTS");
        }

        const department = await rawPrisma.$transaction(
          async (tx) => {
            const created = await tx.orgUnit.create({
              data: {
                tenantId: session.tenantId,
                parentId: branchId,
                type: "DEPARTMENT",
                code,
                name,
                isActive: true,
                metadata: {
                  source: "canonical-company-organization",
                },
              },
              select: {
                id: true,
                tenantId: true,
                parentId: true,
                type: true,
                code: true,
                name: true,
                isActive: true,
              },
            });

            await tx.auditLog.create({
              data: {
                tenantId: session.tenantId,
                userId: session.userId,
                action: "ORGANIZATION_DEPARTMENT_CREATED",
                tableName: "org_units",
                recordId: created.id,
                details: JSON.stringify({
                  type: "DEPARTMENT",
                  parentId: created.parentId,
                  code: created.code,
                }),
              },
            });

            return created;
          },
        );

        return {
          success: true as const,
          department,
        };
      },
    );
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error
          ? error.message
          : "DEPARTMENT_CREATE_FAILED",
    };
  }
}

export async function createOrganizationTeamAction(input: {
  departmentId: string;
  code: string;
  name: string;
}) {
  try {
    const departmentId = String(input.departmentId || "").trim();
    if (!departmentId) {
      throw new Error("DEPARTMENT_REQUIRED");
    }

    const { code, name } = normalizeBranchInput(
      input.code,
      input.name,
    );

    return await withOrganizationSession(
      "organization.manage",
      "action:createOrganizationTeamAction",
      async (session) => {
        const department = await rawPrisma.orgUnit.findFirst({
          where: {
            id: departmentId,
            tenantId: session.tenantId,
            type: "DEPARTMENT",
            isActive: true,
          },
          select: {
            id: true,
          },
        });

        if (!department) {
          throw new Error("ORGANIZATION_DEPARTMENT_NOT_FOUND");
        }

        const duplicate = await rawPrisma.orgUnit.findUnique({
          where: {
            tenantId_code: {
              tenantId: session.tenantId,
              code,
            },
          },
          select: {
            id: true,
          },
        });

        if (duplicate) {
          throw new Error("ORGANIZATION_UNIT_CODE_EXISTS");
        }

        const team = await rawPrisma.$transaction(
          async (tx) => {
            const created = await tx.orgUnit.create({
              data: {
                tenantId: session.tenantId,
                parentId: department.id,
                type: "TEAM",
                code,
                name,
                isActive: true,
                metadata: {
                  source: "canonical-company-organization",
                },
              },
              select: {
                id: true,
                tenantId: true,
                parentId: true,
                type: true,
                code: true,
                name: true,
                isActive: true,
              },
            });

            await tx.auditLog.create({
              data: {
                tenantId: session.tenantId,
                userId: session.userId,
                action: "ORGANIZATION_TEAM_CREATED",
                tableName: "org_units",
                recordId: created.id,
                details: JSON.stringify({
                  type: "TEAM",
                  parentId: created.parentId,
                  code: created.code,
                }),
              },
            });

            return created;
          },
        );

        return {
          success: true as const,
          team,
        };
      },
    );
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error
          ? error.message
          : "TEAM_CREATE_FAILED",
    };
  }
}

export async function assignOrganizationMemberAction(input: {
  userId: string;
  orgUnitId: string;
  accessRoleKey: string;
  isPrimary?: boolean;
  validUntil?: string | null;
}) {
  try {
    const userId = String(input.userId || "").trim();
    const orgUnitId = String(input.orgUnitId || "").trim();
    const accessRoleKey = String(input.accessRoleKey || "").trim();

    if (!userId) {
      throw new Error("USER_REQUIRED");
    }

    if (!orgUnitId) {
      throw new Error("ORGANIZATION_UNIT_REQUIRED");
    }

    if (!accessRoleKey) {
      throw new Error("ACCESS_ROLE_REQUIRED");
    }

    const validUntil = parseOptionalValidUntil(input.validUntil);

    return await withOrganizationSession(
      "access.manage",
      "action:assignOrganizationMemberAction",
      async (session) =>
        await rawPrisma.$transaction(async (tx) => {
          const [user, unit, role] = await Promise.all([
            tx.user.findFirst({
              where: {
                id: userId,
                tenantId: session.tenantId,
                isActive: true,
              },
              select: {
                id: true,
              },
            }),
            tx.orgUnit.findFirst({
              where: {
                id: orgUnitId,
                tenantId: session.tenantId,
                isActive: true,
              },
              select: {
                id: true,
                type: true,
              },
            }),
            tx.accessRole.findFirst({
              where: {
                tenantId: session.tenantId,
                key: accessRoleKey,
                isActive: true,
              },
              select: {
                id: true,
                key: true,
              },
            }),
          ]);

          if (!user) {
            throw new Error("ORGANIZATION_USER_NOT_FOUND");
          }

          if (
            !unit ||
            (
              unit.type !== "BRANCH" &&
              unit.type !== "DEPARTMENT" &&
              unit.type !== "TEAM"
            )
          ) {
            throw new Error("ORGANIZATION_ASSIGNABLE_UNIT_NOT_FOUND");
          }

          if (!role) {
            throw new Error("ACCESS_ROLE_NOT_FOUND");
          }

          if (input.isPrimary === true) {
            await tx.orgAssignment.updateMany({
              where: {
                tenantId: session.tenantId,
                userId,
                status: "ACTIVE",
                isPrimary: true,
              },
              data: {
                isPrimary: false,
              },
            });
          }

          const orgAssignment = await tx.orgAssignment.upsert({
            where: {
              tenantId_userId_orgUnitId: {
                tenantId: session.tenantId,
                userId,
                orgUnitId,
              },
            },
            update: {
              status: "ACTIVE",
              isPrimary: Boolean(input.isPrimary),
              validUntil,
              metadata: {
                source: "canonical-company-organization",
              },
            },
            create: {
              tenantId: session.tenantId,
              userId,
              orgUnitId,
              status: "ACTIVE",
              isPrimary: Boolean(input.isPrimary),
              validUntil,
              createdById: session.userId,
              metadata: {
                source: "canonical-company-organization",
              },
            },
          });

          const scopeType = canonicalScopeForOrgUnit(unit.type);

          const existingRoleAssignment =
            await tx.roleAssignment.findFirst({
              where: {
                tenantId: session.tenantId,
                userId,
                accessRoleId: role.id,
                scopeType,
                scopeOrgUnitId: orgUnitId,
                status: "ACTIVE",
              },
              select: {
                id: true,
              },
            });

          const roleAssignment = existingRoleAssignment
            ? await tx.roleAssignment.update({
                where: {
                  id: existingRoleAssignment.id,
                },
                data: {
                  validUntil,
                  metadata: {
                    source: "canonical-company-organization",
                  },
                },
              })
            : await tx.roleAssignment.create({
                data: {
                  tenantId: session.tenantId,
                  userId,
                  accessRoleId: role.id,
                  scopeType,
                  scopeOrgUnitId: orgUnitId,
                  status: "ACTIVE",
                  validUntil,
                  createdById: session.userId,
                  metadata: {
                    source: "canonical-company-organization",
                  },
                },
              });

          await tx.auditLog.create({
            data: {
              tenantId: session.tenantId,
              userId: session.userId,
              action: "ORGANIZATION_MEMBER_ASSIGNED",
              tableName: "org_assignments",
              recordId: orgAssignment.id,
              details: JSON.stringify({
                targetUserId: userId,
                orgUnitId,
                accessRoleKey: role.key,
                roleAssignmentId: roleAssignment.id,
                scopeType,
                isPrimary: Boolean(input.isPrimary),
              }),
            },
          });

          return {
            success: true as const,
            orgAssignment,
            roleAssignment,
          };
        }),
    );
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error
          ? error.message
          : "ORGANIZATION_MEMBER_ASSIGNMENT_FAILED",
    };
  }
}
