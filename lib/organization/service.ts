import {
  canGrantOrganizationRole,
  evaluateOrganizationAuthority,
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
  findScopeAssignment(input: {
    tenantId: string;
    assignmentId: string;
  }): Promise<OrganizationScopeAssignmentRecord | null>;
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

function authorityInput(
  context: OrganizationCommandContext,
  permission: OrganizationPermissionKey,
  resource: OrganizationResourceScope,
  assignments: readonly OrganizationScopeAssignment[],
  initiatedByUserId?: string | null,
): OrganizationAuthorityInput {
  return {
    actorUserId: context.actorUserId,
    actorTenantId: context.actorTenantId,
    permission,
    resource,
    assignments,
    enabledBranchServices: context.enabledBranchServices,
    initiatedByUserId,
    now: context.now,
  };
}

function requireAuthority(
  context: OrganizationCommandContext,
  permission: OrganizationPermissionKey,
  resource: OrganizationResourceScope,
  initiatedByUserId?: string | null,
): void {
  const decision = evaluateOrganizationAuthority(
    authorityInput(
      context,
      permission,
      resource,
      context.assignments,
      initiatedByUserId,
    ),
  );

  if (!decision.allowed) {
    throw new OrganizationAuthorityError(decision.code);
  }
}

function requireRoleDelegationAuthority(
  context: OrganizationCommandContext,
  targetRole: OrganizationSecurityRole,
  resource: OrganizationResourceScope,
): void {
  requireAuthority(context, "organization.assignment.manage", resource);

  const canDelegate = context.assignments.some((assignment) => {
    if (!canGrantOrganizationRole(assignment.securityRole, targetRole)) {
      return false;
    }

    return evaluateOrganizationAuthority(
      authorityInput(
        context,
        "organization.assignment.manage",
        resource,
        [assignment],
      ),
    ).allowed;
  });

  if (!canDelegate) {
    throw new OrganizationAuthorityError("ROLE_DELEGATION_DENIED");
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

function validateAssignmentScope(input: {
  scopeType: OrganizationScopeType;
  branchId?: string | null;
  departmentId?: string | null;
  teamId?: string | null;
  assignedResourceType?: string | null;
  assignedResourceId?: string | null;
}): void {
  const hasBranch = Boolean(input.branchId);
  const hasDepartment = Boolean(input.departmentId);
  const hasTeam = Boolean(input.teamId);
  const hasResourceType = Boolean(input.assignedResourceType);
  const hasResourceId = Boolean(input.assignedResourceId);

  const valid =
    (input.scopeType === "COMPANY" &&
      !hasBranch &&
      !hasDepartment &&
      !hasTeam &&
      !hasResourceType &&
      !hasResourceId) ||
    (input.scopeType === "BRANCH" &&
      hasBranch &&
      !hasDepartment &&
      !hasTeam &&
      !hasResourceType &&
      !hasResourceId) ||
    (input.scopeType === "DEPARTMENT" &&
      hasDepartment &&
      !hasTeam &&
      !hasResourceType &&
      !hasResourceId) ||
    (input.scopeType === "TEAM" &&
      hasDepartment &&
      hasTeam &&
      !hasResourceType &&
      !hasResourceId) ||
    (input.scopeType === "ASSIGNED_RESOURCE" &&
      hasResourceType &&
      hasResourceId);

  if (!valid) throw new Error("INVALID_ASSIGNMENT_SCOPE");
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
  if (input.startsAt && input.endsAt && input.endsAt <= input.startsAt) {
    throw new Error("INVALID_ASSIGNMENT_WINDOW");
  }
  validateAssignmentScope(input);

  requireRoleDelegationAuthority(
    context,
    input.securityRole,
    assignmentResource({
      tenantId: context.actorTenantId,
      ...input,
    }),
  );

  return repository.createScopeAssignmentWithAudit({
    tenantId: context.actorTenantId,
    actorUserId: context.actorUserId,
    ...input,
  });
}

export async function revokeOrganizationScope(
  context: OrganizationCommandContext,
  repository: OrganizationCommandRepository,
  input: { assignmentId: string },
): Promise<OrganizationScopeAssignmentRecord> {
  const target = await repository.findScopeAssignment({
    tenantId: context.actorTenantId,
    assignmentId: input.assignmentId,
  });
  if (!target || !target.active) {
    throw new Error("ORGANIZATION_ASSIGNMENT_NOT_FOUND");
  }
  if (target.userId === context.actorUserId) {
    throw new OrganizationAuthorityError("SELF_REVOCATION_DENIED");
  }

  requireRoleDelegationAuthority(
    context,
    target.securityRole,
    assignmentResource({
      tenantId: target.tenantId,
      scopeType: target.scopeType,
      branchId: target.branchId,
      departmentId: target.departmentId,
      teamId: target.teamId,
      assignedResourceType: target.assignedResourceType,
      assignedResourceId: target.assignedResourceId,
    }),
  );

  return repository.revokeScopeAssignmentWithAudit({
    tenantId: context.actorTenantId,
    actorUserId: context.actorUserId,
    assignmentId: target.id,
  });
}
