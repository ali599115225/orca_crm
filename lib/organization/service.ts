import {
  evaluateOrganizationAuthority,
  roleHasOrganizationPermission,
} from "@/lib/organization/authority";
import {
  type EnabledBranchService,
  type OrganizationAuthorityInput,
  type OrganizationPermissionKey,
  type OrganizationResourceScope,
  type OrganizationScopeAssignment,
  type OrganizationScopeType,
  type OrganizationSecurityRole,
  type OrganizationServiceLine,
} from "@/lib/organization/contracts";

export type OrganizationCommandContext = Readonly<{
  actorUserId: string;
  actorTenantId: string;
  assignments: readonly OrganizationScopeAssignment[];
  enabledBranchServices?: readonly EnabledBranchService[];
  now?: Date;
}>;

export type OrganizationBranchRecord = Readonly<{
  id: string;
  tenantId: string;
  code: string;
  name: string;
  active: boolean;
}>;

export type OrganizationScopeAssignmentRecord =
  OrganizationScopeAssignment;

export interface OrganizationCommandRepository {
  createBranchWithAudit(input: {
    tenantId: string;
    actorUserId: string;
    code: string;
    name: string;
    isCentral: boolean;
  }): Promise<OrganizationBranchRecord>;
  configureBranchServiceWithAudit(input: {
    tenantId: string;
    actorUserId: string;
    branchId: string;
    serviceLine: OrganizationServiceLine;
    enabled: boolean;
    managerUserId?: string | null;
  }): Promise<EnabledBranchService>;
  createScopeAssignmentWithAudit(input: {
    tenantId: string;
    actorUserId: string;
    userId: string;
    securityRole: OrganizationSecurityRole;
    scopeType: OrganizationScopeType;
    branchId?: string | null;
    departmentId?: string | null;
    teamId?: string | null;
    assignedResourceType?: string | null;
    assignedResourceId?: string | null;
    startsAt?: Date | null;
    endsAt?: Date | null;
  }): Promise<OrganizationScopeAssignmentRecord>;
  revokeScopeAssignmentWithAudit(input: {
    tenantId: string;
    actorUserId: string;
    assignmentId: string;
  }): Promise<OrganizationScopeAssignmentRecord>;
}

export class OrganizationAuthorityError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(`ORGANIZATION_AUTHORITY_DENIED:${code}`);
    this.name = "OrganizationAuthorityError";
    this.code = code;
  }
}

function requireAuthority(
  context: OrganizationCommandContext,
  permission: OrganizationPermissionKey,
  resource: OrganizationResourceScope,
  initiatedByUserId?: string | null,
): void {
  const input: OrganizationAuthorityInput = {
    actorUserId: context.actorUserId,
    actorTenantId: context.actorTenantId,
    permission,
    resource,
    assignments: context.assignments,
    enabledBranchServices: context.enabledBranchServices,
    initiatedByUserId,
    now: context.now,
  };
  const decision = evaluateOrganizationAuthority(input);

  if (!decision.allowed) {
    throw new OrganizationAuthorityError(decision.code);
  }
}

function assignmentResource(input: {
  tenantId: string;
  scopeType: OrganizationScopeType;
  branchId?: string | null;
  departmentId?: string | null;
  teamId?: string | null;
  assignedResourceType?: string | null;
  assignedResourceId?: string | null;
}): OrganizationResourceScope {
  return {
    tenantId: input.tenantId,
    branchId: input.branchId,
    departmentId: input.departmentId,
    teamId: input.teamId,
    resourceType:
      input.scopeType === "ASSIGNED_RESOURCE"
        ? input.assignedResourceType
        : null,
    resourceId:
      input.scopeType === "ASSIGNED_RESOURCE"
        ? input.assignedResourceId
        : null,
  };
}

export async function createOrganizationBranch(
  context: OrganizationCommandContext,
  repository: OrganizationCommandRepository,
  input: { code: string; name: string; isCentral?: boolean },
): Promise<OrganizationBranchRecord> {
  requireAuthority(context, "organization.manage", {
    tenantId: context.actorTenantId,
  });

  const code = input.code.trim().toUpperCase();
  const name = input.name.trim();
  if (!code || !/^[A-Z0-9_-]{2,32}$/.test(code)) {
    throw new Error("INVALID_BRANCH_CODE");
  }
  if (!name || name.length > 120) {
    throw new Error("INVALID_BRANCH_NAME");
  }

  return repository.createBranchWithAudit({
    tenantId: context.actorTenantId,
    actorUserId: context.actorUserId,
    code,
    name,
    isCentral: Boolean(input.isCentral),
  });
}

export async function configureOrganizationBranchService(
  context: OrganizationCommandContext,
  repository: OrganizationCommandRepository,
  input: {
    branchId: string;
    serviceLine: OrganizationServiceLine;
    enabled: boolean;
    managerUserId?: string | null;
  },
): Promise<EnabledBranchService> {
  requireAuthority(context, "organization.branch_service.manage", {
    tenantId: context.actorTenantId,
    branchId: input.branchId,
  });

  return repository.configureBranchServiceWithAudit({
    tenantId: context.actorTenantId,
    actorUserId: context.actorUserId,
    branchId: input.branchId,
    serviceLine: input.serviceLine,
    enabled: input.enabled,
    managerUserId: input.managerUserId ?? null,
  });
}

export async function assignOrganizationScope(
  context: OrganizationCommandContext,
  repository: OrganizationCommandRepository,
  input: {
    userId: string;
    securityRole: OrganizationSecurityRole;
    scopeType: OrganizationScopeType;
    branchId?: string | null;
    departmentId?: string | null;
    teamId?: string | null;
    assignedResourceType?: string | null;
    assignedResourceId?: string | null;
    startsAt?: Date | null;
    endsAt?: Date | null;
  },
): Promise<OrganizationScopeAssignmentRecord> {
  if (input.userId === context.actorUserId) {
    throw new OrganizationAuthorityError("SELF_ASSIGNMENT_DENIED");
  }

  requireAuthority(
    context,
    "organization.assignment.manage",
    assignmentResource({
      tenantId: context.actorTenantId,
      ...input,
    }),
  );

  if (
    !roleHasOrganizationPermission(
      input.securityRole,
      "organization.read",
    )
  ) {
    throw new Error("INVALID_SECURITY_ROLE");
  }
  if (input.startsAt && input.endsAt && input.endsAt <= input.startsAt) {
    throw new Error("INVALID_ASSIGNMENT_WINDOW");
  }
  if (
    input.scopeType === "ASSIGNED_RESOURCE" &&
    (!input.assignedResourceType || !input.assignedResourceId)
  ) {
    throw new Error("ASSIGNED_RESOURCE_REQUIRED");
  }

  return repository.createScopeAssignmentWithAudit({
    tenantId: context.actorTenantId,
    actorUserId: context.actorUserId,
    ...input,
  });
}

export async function revokeOrganizationScope(
  context: OrganizationCommandContext,
  repository: OrganizationCommandRepository,
  input: {
    assignmentId: string;
    assignmentOwnerUserId: string;
    resource: OrganizationResourceScope;
  },
): Promise<OrganizationScopeAssignmentRecord> {
  if (input.assignmentOwnerUserId === context.actorUserId) {
    throw new OrganizationAuthorityError("SELF_REVOCATION_DENIED");
  }

  requireAuthority(
    context,
    "organization.assignment.manage",
    input.resource,
  );

  return repository.revokeScopeAssignmentWithAudit({
    tenantId: context.actorTenantId,
    actorUserId: context.actorUserId,
    assignmentId: input.assignmentId,
  });
}
