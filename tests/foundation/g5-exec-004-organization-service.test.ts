import { describe, expect, it, vi } from "vitest";
import {
  assignOrganizationScope,
  configureOrganizationBranchService,
  createOrganizationBranch,
  OrganizationAuthorityError,
  revokeOrganizationScope,
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

function repository(): OrganizationCommandRepository {
  return {
    createBranchWithAudit: vi.fn().mockResolvedValue({
      id: "branch-1",
      tenantId: "tenant-1",
      code: "RUH",
      name: "فرع الرياض",
      active: true,
    }),
    configureBranchServiceWithAudit: vi.fn().mockResolvedValue({
      branchId: "branch-1",
      serviceLine: "SALES",
      enabled: true,
    }),
    createScopeAssignmentWithAudit: vi.fn().mockResolvedValue({
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
    }),
    revokeScopeAssignmentWithAudit: vi.fn().mockResolvedValue({
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
      active: false,
      startsAt: null,
      endsAt: null,
    }),
  };
}

function context(overrides: Record<string, unknown> = {}) {
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
    ).rejects.toThrow("INVALID_BRANCH_CODE");
    expect(repo.createBranchWithAudit).not.toHaveBeenCalled();
  });

  it("configures a service only within the actor assignment scope", async () => {
    const repo = repository();
    const branchManager = {
      ...ADMIN_ASSIGNMENT,
      securityRole: "BRANCH_MANAGER" as const,
      scopeType: "BRANCH" as const,
      branchId: "branch-1",
    };

    await configureOrganizationBranchService(
      context({ assignments: [branchManager] }),
      repo,
      {
        branchId: "branch-1",
        serviceLine: "SALES",
        enabled: true,
      },
    );

    expect(repo.configureBranchServiceWithAudit).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      actorUserId: "admin-1",
      branchId: "branch-1",
      serviceLine: "SALES",
      enabled: true,
      managerUserId: null,
    });
  });

  it("denies cross-branch service configuration", async () => {
    const repo = repository();
    const branchManager = {
      ...ADMIN_ASSIGNMENT,
      securityRole: "BRANCH_MANAGER" as const,
      scopeType: "BRANCH" as const,
      branchId: "branch-1",
    };

    await expect(
      configureOrganizationBranchService(
        context({ assignments: [branchManager] }),
        repo,
        {
          branchId: "branch-2",
          serviceLine: "SALES",
          enabled: true,
        },
      ),
    ).rejects.toMatchObject({
      name: "OrganizationAuthorityError",
      code: "RESOURCE_SCOPE_DENIED",
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
    ).rejects.toThrow("ASSIGNED_RESOURCE_REQUIRED");
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

  it("prevents self-revocation of authority", async () => {
    const repo = repository();

    await expect(
      revokeOrganizationScope(context(), repo, {
        assignmentId: "assignment-admin",
        assignmentOwnerUserId: "admin-1",
        resource: { tenantId: "tenant-1" },
      }),
    ).rejects.toMatchObject({ code: "SELF_REVOCATION_DENIED" });
    expect(repo.revokeScopeAssignmentWithAudit).not.toHaveBeenCalled();
  });

  it("revokes another user's assignment through the audited repository", async () => {
    const repo = repository();

    await revokeOrganizationScope(context(), repo, {
      assignmentId: "assignment-2",
      assignmentOwnerUserId: "user-2",
      resource: { tenantId: "tenant-1", branchId: "branch-1" },
    });

    expect(repo.revokeScopeAssignmentWithAudit).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      actorUserId: "admin-1",
      assignmentId: "assignment-2",
    });
  });
});
