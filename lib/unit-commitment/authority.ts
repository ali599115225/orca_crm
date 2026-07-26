import { evaluateOrganizationAuthority } from "@/lib/organization/authority";
import type {
  OrganizationPermissionKey,
  OrganizationScopeAssignment,
  OrganizationSecurityRole,
} from "@/lib/organization/contracts";
import {
  UnitCommitmentError,
  type Exec006PermissionKey,
  type UnitCommandContext,
  type UnitResourceScope,
} from "@/lib/unit-commitment/contracts";

const READ_PERMISSIONS = new Set<Exec006PermissionKey>([
  "UNIT_AVAILABILITY_READ",
  "COMMITMENT_AUDIT_READ",
]);

const BASE_PERMISSION: Readonly<
  Record<Exec006PermissionKey, OrganizationPermissionKey>
> = {
  UNIT_AVAILABILITY_READ: "property.records.read",
  UNIT_HOLD_CREATE: "sales.records.write",
  UNIT_HOLD_EXTEND: "sales.records.write",
  UNIT_HOLD_RELEASE: "sales.records.write",
  UNIT_HOLD_OVERRIDE: "sales.records.write",
  RESERVATION_CREATE: "sales.records.write",
  RESERVATION_APPROVE: "sales.records.write",
  RESERVATION_EXTEND: "sales.records.write",
  RESERVATION_RELEASE: "sales.records.write",
  RESERVATION_CANCEL: "sales.records.write",
  RESERVATION_CONVERT: "sales.records.write",
  TOUR_CREATE: "sales.records.write",
  TOUR_CONFIRM: "sales.records.write",
  TOUR_RESCHEDULE: "sales.records.write",
  TOUR_COMPLETE: "sales.records.write",
  TOUR_CANCEL: "sales.records.write",
  COMMITMENT_AUDIT_READ: "property.records.read",
};

const ROLE_PERMISSION_MATRIX: Readonly<
  Record<Exec006PermissionKey, readonly OrganizationSecurityRole[]>
> = {
  UNIT_AVAILABILITY_READ: [
    "PLATFORM_OWNER",
    "GENERAL_MANAGER",
    "OPERATIONS_MANAGER",
    "BRANCH_MANAGER",
    "SALES_LEASING_MANAGER",
    "BROKER_AGENT",
    "PROPERTY_MANAGER",
    "CUSTOMER_SERVICE_REPRESENTATIVE",
    "COMPLIANCE_AUDIT",
  ],
  UNIT_HOLD_CREATE: [
    "GENERAL_MANAGER",
    "OPERATIONS_MANAGER",
    "BRANCH_MANAGER",
    "SALES_LEASING_MANAGER",
    "BROKER_AGENT",
  ],
  UNIT_HOLD_EXTEND: [
    "GENERAL_MANAGER",
    "OPERATIONS_MANAGER",
    "BRANCH_MANAGER",
    "SALES_LEASING_MANAGER",
    "BROKER_AGENT",
  ],
  UNIT_HOLD_RELEASE: [
    "GENERAL_MANAGER",
    "OPERATIONS_MANAGER",
    "BRANCH_MANAGER",
    "SALES_LEASING_MANAGER",
    "BROKER_AGENT",
  ],
  UNIT_HOLD_OVERRIDE: ["GENERAL_MANAGER", "OPERATIONS_MANAGER"],
  RESERVATION_CREATE: [
    "GENERAL_MANAGER",
    "OPERATIONS_MANAGER",
    "BRANCH_MANAGER",
    "SALES_LEASING_MANAGER",
    "BROKER_AGENT",
  ],
  RESERVATION_APPROVE: [
    "GENERAL_MANAGER",
    "OPERATIONS_MANAGER",
    "BRANCH_MANAGER",
    "SALES_LEASING_MANAGER",
  ],
  RESERVATION_EXTEND: [
    "GENERAL_MANAGER",
    "OPERATIONS_MANAGER",
    "BRANCH_MANAGER",
    "SALES_LEASING_MANAGER",
  ],
  RESERVATION_RELEASE: [
    "GENERAL_MANAGER",
    "OPERATIONS_MANAGER",
    "BRANCH_MANAGER",
    "SALES_LEASING_MANAGER",
  ],
  RESERVATION_CANCEL: [
    "GENERAL_MANAGER",
    "OPERATIONS_MANAGER",
    "BRANCH_MANAGER",
    "SALES_LEASING_MANAGER",
  ],
  RESERVATION_CONVERT: [
    "GENERAL_MANAGER",
    "OPERATIONS_MANAGER",
    "BRANCH_MANAGER",
    "SALES_LEASING_MANAGER",
  ],
  TOUR_CREATE: [
    "GENERAL_MANAGER",
    "OPERATIONS_MANAGER",
    "BRANCH_MANAGER",
    "SALES_LEASING_MANAGER",
    "BROKER_AGENT",
  ],
  TOUR_CONFIRM: [
    "GENERAL_MANAGER",
    "OPERATIONS_MANAGER",
    "BRANCH_MANAGER",
    "SALES_LEASING_MANAGER",
    "BROKER_AGENT",
  ],
  TOUR_RESCHEDULE: [
    "GENERAL_MANAGER",
    "OPERATIONS_MANAGER",
    "BRANCH_MANAGER",
    "SALES_LEASING_MANAGER",
    "BROKER_AGENT",
  ],
  TOUR_COMPLETE: [
    "GENERAL_MANAGER",
    "OPERATIONS_MANAGER",
    "BRANCH_MANAGER",
    "SALES_LEASING_MANAGER",
    "BROKER_AGENT",
  ],
  TOUR_CANCEL: [
    "GENERAL_MANAGER",
    "OPERATIONS_MANAGER",
    "BRANCH_MANAGER",
    "SALES_LEASING_MANAGER",
    "BROKER_AGENT",
  ],
  COMMITMENT_AUDIT_READ: [
    "PLATFORM_OWNER",
    "GENERAL_MANAGER",
    "OPERATIONS_MANAGER",
    "BRANCH_MANAGER",
    "COMPLIANCE_AUDIT",
  ],
};

export function validateUnitCommandContext(context: UnitCommandContext): void {
  if (!context.actorId.trim()) {
    throw new UnitCommitmentError("MISSING_ACTOR", "Actor is required");
  }
  if (!context.tenantId.trim()) {
    throw new UnitCommitmentError("MISSING_TENANT", "Tenant is required");
  }
  if (!context.auditCorrelationId.trim()) {
    throw new UnitCommitmentError(
      "VALIDATION_ERROR",
      "Audit correlation ID is required",
    );
  }
}

export function assertUnitCommitmentAuthority(
  context: UnitCommandContext,
  permission: Exec006PermissionKey,
  resource: UnitResourceScope,
  options: Readonly<{
    assignments?: readonly OrganizationScopeAssignment[];
    actorId?: string;
    requireCompanyScope?: boolean;
  }> = {},
): OrganizationScopeAssignment {
  validateUnitCommandContext(context);
  const actorId = options.actorId ?? context.actorId;
  const assignments = options.assignments ?? context.assignments;
  const decision = evaluateOrganizationAuthority({
    actorUserId: actorId,
    actorTenantId: context.tenantId,
    permission: BASE_PERMISSION[permission],
    resource: {
      tenantId: context.tenantId,
      branchId: resource.branchId,
      departmentId: resource.departmentId,
      teamId: resource.teamId,
      resourceType: resource.resourceType,
      resourceId: resource.resourceId,
      serviceLine: READ_PERMISSIONS.has(permission)
        ? "PROPERTY_MANAGEMENT"
        : "SALES",
    },
    assignments,
    enabledBranchServices: context.enabledBranchServices,
    now: context.timestamp,
  });

  if (!decision.allowed || !decision.assignmentId) {
    const code =
      decision.code === "TENANT_SCOPE_MISMATCH"
        ? "TENANT_SCOPE_MISMATCH"
        : decision.code === "RESOURCE_SCOPE_DENIED"
          ? "RESOURCE_SCOPE_DENIED"
          : "AUTHORITY_DENIED";
    throw new UnitCommitmentError(
      code,
      `EXEC-006 authority denied: ${decision.code}`,
      { permission, authorityCode: decision.code },
    );
  }

  const assignment = assignments.find(
    (candidate) => candidate.id === decision.assignmentId,
  );
  if (!assignment || assignment.userId !== actorId) {
    throw new UnitCommitmentError(
      "AUTHORITY_DENIED",
      "Authority decision referenced a missing or mismatched assignment",
    );
  }

  if (!ROLE_PERMISSION_MATRIX[permission].includes(assignment.securityRole)) {
    throw new UnitCommitmentError(
      "AUTHORITY_DENIED",
      `Security role has no ${permission} authority`,
      { permission, securityRole: assignment.securityRole },
    );
  }

  if (options.requireCompanyScope && assignment.scopeType !== "COMPANY") {
    throw new UnitCommitmentError(
      "RESOURCE_SCOPE_DENIED",
      "Company scope is required for this override",
      { assignmentId: assignment.id, scopeType: assignment.scopeType },
    );
  }

  return assignment;
}

export function assertIndependentApproval(
  context: UnitCommandContext,
  initiatedByActorId: string | null | undefined,
): void {
  if (!initiatedByActorId?.trim()) {
    throw new UnitCommitmentError(
      "MISSING_INITIATOR",
      "Persisted initiator evidence is required",
    );
  }
  if (initiatedByActorId === context.actorId) {
    throw new UnitCommitmentError(
      "SELF_APPROVAL_DENIED",
      "The reservation initiator cannot approve the same request",
    );
  }
}

export function canDiscloseBlockingCustomer(
  context: UnitCommandContext,
  resource: UnitResourceScope,
): boolean {
  try {
    assertUnitCommitmentAuthority(
      context,
      "COMMITMENT_AUDIT_READ",
      resource,
    );
    return true;
  } catch {
    return false;
  }
}