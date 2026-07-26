import {
  CustomerIdentityError,
  type CommandContext,
  type ResourceScope,
} from "@/lib/customer-identity/contracts";
import { evaluateOrganizationAuthority } from "@/lib/organization/authority";
import type {
  OrganizationPermissionKey,
  OrganizationScopeAssignment,
} from "@/lib/organization/contracts";

export type CustomerIdentityAction =
  | "READ"
  | "WRITE"
  | "VERIFY"
  | "CONVERT"
  | "OPPORTUNITY_STAGE"
  | "OPPORTUNITY_REASSIGN"
  | "MERGE_PREVIEW"
  | "MERGE_EXECUTE"
  | "MERGE_REVERSE"
  | "CONSENT_WRITE"
  | "RETENTION_WRITE";

const ACTION_PERMISSION: Readonly<
  Record<CustomerIdentityAction, OrganizationPermissionKey>
> = {
  READ: "sales.records.read",
  WRITE: "sales.records.write",
  VERIFY: "sales.records.write",
  CONVERT: "sales.records.write",
  OPPORTUNITY_STAGE: "sales.records.write",
  OPPORTUNITY_REASSIGN: "sales.records.write",
  MERGE_PREVIEW: "sales.records.read",
  MERGE_EXECUTE: "sales.records.write",
  MERGE_REVERSE: "sales.records.write",
  CONSENT_WRITE: "sales.records.write",
  RETENTION_WRITE: "sales.records.write",
};

export function validateCommandContext(context: CommandContext): void {
  if (!context.actorId.trim()) {
    throw new CustomerIdentityError("MISSING_ACTOR", "Actor is required");
  }
  if (!context.tenantId.trim()) {
    throw new CustomerIdentityError("MISSING_TENANT", "Tenant is required");
  }
  if (!context.auditCorrelationId.trim()) {
    throw new CustomerIdentityError(
      "VALIDATION_ERROR",
      "Audit correlation ID is required",
    );
  }
}

export function assertCustomerAuthority(
  context: CommandContext,
  action: CustomerIdentityAction,
  resource: ResourceScope,
  options: Readonly<{
    assignments?: readonly OrganizationScopeAssignment[];
    actorId?: string;
    initiatedByActorId?: string | null;
    requireCompanyScope?: boolean;
  }> = {},
): OrganizationScopeAssignment {
  validateCommandContext(context);

  const actorId = options.actorId ?? context.actorId;
  const assignments = options.assignments ?? context.assignments;
  const decision = evaluateOrganizationAuthority({
    actorUserId: actorId,
    actorTenantId: context.tenantId,
    permission: ACTION_PERMISSION[action],
    resource: {
      tenantId: context.tenantId,
      branchId: resource.branchId,
      departmentId: resource.departmentId,
      teamId: resource.teamId,
      resourceType: resource.resourceType,
      resourceId: resource.resourceId,
      serviceLine: "SALES",
    },
    assignments,
    enabledBranchServices: context.enabledBranchServices,
    initiatedByUserId: options.initiatedByActorId,
    now: context.timestamp,
  });

  if (!decision.allowed || !decision.assignmentId) {
    throw new CustomerIdentityError(
      decision.code === "TENANT_SCOPE_MISMATCH"
        ? "TENANT_SCOPE_MISMATCH"
        : decision.code === "RESOURCE_SCOPE_DENIED"
          ? "RESOURCE_SCOPE_DENIED"
          : "AUTHORITY_DENIED",
      `Customer identity authority denied: ${decision.code}`,
      { action, authorityCode: decision.code },
    );
  }

  const assignment = assignments.find(
    (candidate) => candidate.id === decision.assignmentId,
  );
  if (!assignment) {
    throw new CustomerIdentityError(
      "AUTHORITY_DENIED",
      "Authority decision referenced a missing assignment",
    );
  }

  if (options.requireCompanyScope && assignment.scopeType !== "COMPANY") {
    throw new CustomerIdentityError(
      "RESOURCE_SCOPE_DENIED",
      "Company-wide scope is required for this cross-branch operation",
      { assignmentId: assignment.id, scopeType: assignment.scopeType },
    );
  }

  return assignment;
}
