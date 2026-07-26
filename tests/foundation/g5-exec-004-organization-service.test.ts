import { describe, expect, it, vi } from "vitest";
import {
  assignOrganizationScope,
  configureOrganizationBranchService,
  createOrganizationBranch,
  createOrganizationDepartment,
  createOrganizationTeam,
  OrganizationAuthorityError,
  revokeOrganizationScope,
  type OrganizationCommandContext,
  type OrganizationCommandRepository,
} from "@/lib/organization/service";
import type { OrganizationScopeAssignment } from "@/lib/organization/contracts";

const ADMIN_ASSIGNMENT: OrganizationScopeAssignment = {
  id: "assignment-admin",
  tenantId: "tenant-1",
  userId: "admin-1",
  securityRole: "GENERAL_MANAGER",
  scopeType: "COMPANY",
  branchId: null,
  departmentId: null,
  teamId: null,
  assignedResourceType: null,
  assignedResourceId: null,
  active: true,
  startsAt: null,
  endsAt: null,
};

const TARGET_ASSIGNMENT: OrganizationScopeAssignment = {
  id: "assignment-2",
  tenantId: "tenant-1",
  userId: "user-2",
  securityRole: "BROKER_AGENT",
  scopeType: "BRANCH",
  branchId: "branch-1",
  departmentId: null,
  teamId: null,
  assignedResourceType: null,
  assignedResourceId: null,
  active: true,
  startsAt: null,
  endsAt: null,
};

function repository(
  target: OrganizationScopeAssignment | null = TARGET_ASSIGNMENT,
): OrganizationCommandRepository {
  return {
    createBranchWithAudit: vi.fn().mockResolvedValue({
      id: "branch-1",
      tenantId: "tenant-1",
      code: "RUH",
      name: "فرع الرياض",
      active: true,
    }),
    createDepartmentWithAudit: vi.fn().mockResolvedValue({
      id: "department-1",
      tenantId: "tenant-1",
      branchId: null,
      code: "FIN",
      name: "المالية",
      central: true,
      active: true,
    }),
    createTeamWithAudit: vi.fn().mockResolvedValue({
      id: "team-1",
      tenantId: "tenant-1",
      branchId: null,
      departmentId: "department-1",
      code: "AR",
      name: "التحصيل",
      active: true,
    }),
    configureBranchServiceWithAudit: vi.fn().mockResolvedValue({
      branchId: "branch-1",
      serviceLine: "SALES",
      enabled: true,
    }),
    findScopeAssignment: vi.fn().mockResolvedValue(target),
    createScopeAssignmentWithAudit: vi.fn().mockResolvedValue(TARGET_ASSIGNMENT),
    revokeScopeAssignmentWithAudit: vi.fn().mockResolvedValue({
      ...TARGET_ASSIGNMENT,
      active: false,
    }),
  };
}

function context(
  overrides: Partial<OrganizationCommandContext> = {},
): OrganizationCommandContext {
  return {
    actorUserId: "admin-1",
    actorTenantId: "tenant-1",
    assignments: [ADMIN_ASSIGNMENT],
    enabledBranchServices: [],
    now: new Date("2026-07-26T00:00:00.000Z"),
    ...overrides,
  };
}

describe("EXEC-004 organization commands", () => {
  it("normalizes a branch code and delegates one audited transaction", async () => {
    const repo = repository();

    const result = await createOrganizationBranch(context(), repo, {
      code: " ruh ",
      name: " فرع الرياض ",
    });

    expect(result.id).toBe("branch-1");
    expect(repo.createBranchWithAudit).toHaveBeenCalledOnce();
    expect(repo.createBranchWithAudit).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      actorUserId: "admin-1",
      code: "RUH",
      name: "فرع الرياض",
      isCentral: false,
    });
  });

  it("rejects an invalid branch code before repository access", async () => {
    const repo = repository();

    await expect(
      createOrganizationBranch(context(), repo, {
        code: "!",
        name: "فرع",
      }),
    ).rejects.toThrow("INVALID_ORGANIZATION_CODE");
    expect(repo.createBranchWithAudit).not.toHaveBeenCalled();
  });

  it("creates a central department without a branch parent", async () => {
    const repo = repository();

    await createOrganizationDepartment(context(), repo, {
      code: " fin ",
      name: " المالية ",
      isCentral: true,
    });

    expect(repo.createDepartmentWithAudit).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      actorUserId: "admin-1",
      branchId: null,
      code: "FIN",
      name: "المالية",
      isCentral: true,
    });
  });

  it("requires a branch parent for a non-central department", async () => {
    const repo = repository();

    await expect(
      createOrganizationDepartment(context(), repo, {
        code: "SAL",
        name: "المبيعات",
        isCentral: false,
      }),
    ).rejects.toThrow("INVALID_DEPARTMENT_SCOPE");
    expect(repo.createDepartmentWithAudit).not.toHaveBeenCalled();
  });

  it("rejects a central department with a branch parent", async () => {
    const repo = repository();

    await expect(
      createOrganizationDepartment(context(), repo, {
        code: "FIN",
        name: "المالية",
        isCentral: true,
        branchId: "branch-1",
      }),
    ).rejects.toThrow("INVALID_DEPARTMENT_SCOPE");
    expect(repo.createDepartmentWithAudit).not.toHaveBeenCalled();
  });

  it("creates a team under an explicit department hierarchy", async () => {
    const repo = repository();

    await createOrganizationTeam(context(), repo, {
      code: " ar ",
      name: " التحصيل ",
      departmentId: "department-1",
    });

    expect(repo.createTeamWithAudit).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      actorUserId: "admin-1",
      branchId: null,
      departmentId: "department-1",
      code: "AR",
      name: "التحصيل",
    });
  });

  it("requires a department before team persistence", async () => {
    const repo = repository();

    await expect(
      createOrganizationTeam(context(), repo, {
        code: "AR",
        name: "التحصيل",
        departmentId: "",
      }),
    ).rejects.toThrow("DEPARTMENT_REQUIRED");
    expect(repo.createTeamWithAudit).not.toHaveBeenCalled();
  });

  it("lets a company-scoped general manager configure a branch service", async () => {
    const repo = repository();

    await configureOrganizationBranchService(context(), repo, {
      branchId: "branch-1",
      serviceLine: "SALES",
      enabled: true,
    });

    expect(repo.configureBranchServiceWithAudit).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      actorUserId: "admin-1",
      branchId: "branch-1",
      serviceLine: "SALES",
      enabled: true,
      managerUserId: null,
    });
  });

  it("does not let a branch manager activate service lines", async () => {
    const repo = repository();
    const branchManager: OrganizationScopeAssignment = {
      ...ADMIN_ASSIGNMENT,
      securityRole: "BRANCH_MANAGER",
      scopeType: "BRANCH",
      branchId: "branch-1",
    };

    await expect(
      configureOrganizationBranchService(
        context({ assignments: [branchManager] }),
        repo,
        {
          branchId: "branch-1",
          serviceLine: "SALES",
          enabled: true,
        },
      ),
    ).rejects.toMatchObject({
      name: "OrganizationAuthorityError",
      code: "ROLE_PERMISSION_DENIED",
    });
    expect(repo.configureBranchServiceWithAudit).not.toHaveBeenCalled();
  });

  it("prevents an actor from granting a role to themselves", async () => {
    const repo = repository();

    await expect(
      assignOrganizationScope(context(), repo, {
        userId: "admin-1",
        securityRole: "FINANCE_MANAGER",
        scopeType: "COMPANY",
      }),
    ).rejects.toBeInstanceOf(OrganizationAuthorityError);
    expect(repo.createScopeAssignmentWithAudit).not.toHaveBeenCalled();
  });

  it("requires complete assigned-resource identity", async () => {
    const repo = repository();

    await expect(
      assignOrganizationScope(context(), repo, {
        userId: "user-2",
        securityRole: "BROKER_AGENT",
        scopeType: "ASSIGNED_RESOURCE",
        branchId: "branch-1",
        assignedResourceType: "LEAD",
      }),
    ).rejects.toThrow("INVALID_ASSIGNMENT_SCOPE");
    expect(repo.createScopeAssignmentWithAudit).not.toHaveBeenCalled();
  });

  it("rejects an inverted assignment validity window", async () => {
    const repo = repository();

    await expect(
      assignOrganizationScope(context(), repo, {
        userId: "user-2",
        securityRole: "BROKER_AGENT",
        scopeType: "BRANCH",
        branchId: "branch-1",
        startsAt: new Date("2026-08-02T00:00:00.000Z"),
        endsAt: new Date("2026-08-01T00:00:00.000Z"),
      }),
    ).rejects.toThrow("INVALID_ASSIGNMENT_WINDOW");
    expect(repo.createScopeAssignmentWithAudit).not.toHaveBeenCalled();
  });

  it("rejects malformed hierarchy scope before persistence", async () => {
    const repo = repository();

    await expect(
      assignOrganizationScope(context(), repo, {
        userId: "user-2",
        securityRole: "BROKER_AGENT",
        scopeType: "BRANCH",
        branchId: "branch-1",
        departmentId: "department-1",
      }),
    ).rejects.toThrow("INVALID_ASSIGNMENT_SCOPE");
    expect(repo.createScopeAssignmentWithAudit).not.toHaveBeenCalled();
  });

  it("rejects a role at an invalid scope", async () => {
    const repo = repository();

    await expect(
      assignOrganizationScope(context(), repo, {
        userId: "user-2",
        securityRole: "SYSTEM_ADMINISTRATOR",
        scopeType: "BRANCH",
        branchId: "branch-1",
      }),
    ).rejects.toMatchObject({ code: "ROLE_SCOPE_DENIED" });
    expect(repo.createScopeAssignmentWithAudit).not.toHaveBeenCalled();
  });

  it("delegates a valid branch assignment with actor attribution", async () => {
    const repo = repository();

    await assignOrganizationScope(context(), repo, {
      userId: "user-2",
      securityRole: "BROKER_AGENT",
      scopeType: "BRANCH",
      branchId: "branch-1",
    });

    expect(repo.createScopeAssignmentWithAudit).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      actorUserId: "admin-1",
      userId: "user-2",
      securityRole: "BROKER_AGENT",
      scopeType: "BRANCH",
      branchId: "branch-1",
    });
  });

  it("blocks a branch manager from delegating finance authority", async () => {
    const repo = repository();
    const branchManager: OrganizationScopeAssignment = {
      ...ADMIN_ASSIGNMENT,
      securityRole: "BRANCH_MANAGER",
      scopeType: "BRANCH",
      branchId: "branch-1",
    };

    await expect(
      assignOrganizationScope(
        context({ assignments: [branchManager] }),
        repo,
        {
          userId: "user-2",
          securityRole: "FINANCE_MANAGER",
          scopeType: "BRANCH",
          branchId: "branch-1",
        },
      ),
    ).rejects.toMatchObject({ code: "ROLE_DELEGATION_DENIED" });
    expect(repo.createScopeAssignmentWithAudit).not.toHaveBeenCalled();
  });

  it("prevents self-revocation using the persisted assignment owner", async () => {
    const repo = repository(ADMIN_ASSIGNMENT);

    await expect(
      revokeOrganizationScope(context(), repo, {
        assignmentId: "assignment-admin",
      }),
    ).rejects.toMatchObject({ code: "SELF_REVOCATION_DENIED" });
    expect(repo.revokeScopeAssignmentWithAudit).not.toHaveBeenCalled();
  });

  it("revokes another user's assignment through the audited repository", async () => {
    const repo = repository();

    await revokeOrganizationScope(context(), repo, {
      assignmentId: "assignment-2",
    });

    expect(repo.findScopeAssignment).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      assignmentId: "assignment-2",
    });
    expect(repo.revokeScopeAssignmentWithAudit).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      actorUserId: "admin-1",
      assignmentId: "assignment-2",
    });
  });

  it("denies a forged cross-branch revocation request", async () => {
    const branchManager: OrganizationScopeAssignment = {
      ...ADMIN_ASSIGNMENT,
      securityRole: "BRANCH_MANAGER",
      scopeType: "BRANCH",
      branchId: "branch-1",
    };
    const targetInAnotherBranch: OrganizationScopeAssignment = {
      ...TARGET_ASSIGNMENT,
      id: "assignment-branch-2",
      branchId: "branch-2",
    };
    const repo = repository(targetInAnotherBranch);

    await expect(
      revokeOrganizationScope(
        context({ assignments: [branchManager] }),
        repo,
        { assignmentId: "assignment-branch-2" },
      ),
    ).rejects.toMatchObject({ code: "RESOURCE_SCOPE_DENIED" });
    expect(repo.revokeScopeAssignmentWithAudit).not.toHaveBeenCalled();
  });

  it("denies revocation of a role above the actor delegation ceiling", async () => {
    const branchManager: OrganizationScopeAssignment = {
      ...ADMIN_ASSIGNMENT,
      securityRole: "BRANCH_MANAGER",
      scopeType: "BRANCH",
      branchId: "branch-1",
    };
    const financeTarget: OrganizationScopeAssignment = {
      ...TARGET_ASSIGNMENT,
      securityRole: "FINANCE_MANAGER",
    };
    const repo = repository(financeTarget);

    await expect(
      revokeOrganizationScope(
        context({ assignments: [branchManager] }),
        repo,
        { assignmentId: "assignment-2" },
      ),
    ).rejects.toMatchObject({ code: "ROLE_DELEGATION_DENIED" });
    expect(repo.revokeScopeAssignmentWithAudit).not.toHaveBeenCalled();
  });

  it("fails closed when the persisted assignment does not exist", async () => {
    const repo = repository(null);

    await expect(
      revokeOrganizationScope(context(), repo, {
        assignmentId: "missing",
      }),
    ).rejects.toThrow("ORGANIZATION_ASSIGNMENT_NOT_FOUND");
    expect(repo.revokeScopeAssignmentWithAudit).not.toHaveBeenCalled();
  });
});
