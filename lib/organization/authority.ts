import {
  type OrganizationAuthorityDecision,
  type OrganizationAuthorityInput,
  type OrganizationPermissionKey,
  type OrganizationScopeAssignment,
  type OrganizationSecurityRole,
  type OrganizationServiceLine,
} from "@/lib/organization/contracts";

export const ORGANIZATION_ROLE_PERMISSIONS = {
  PLATFORM_OWNER: [
    "organization.read",
    "organization.manage",
    "organization.branch_service.manage",
    "organization.assignment.manage",
    "organization.audit.read",
    "sales.records.read",
    "property.records.read",
    "maintenance.records.read",
    "finance.records.read",
    "contracts.records.read",
    "export.execute",
    "system.configure",
  ],
  GENERAL_MANAGER: [
    "organization.read",
    "organization.manage",
    "organization.branch_service.manage",
    "organization.assignment.manage",
    "organization.audit.read",
    "sales.records.read",
    "sales.records.write",
    "property.records.read",
    "property.records.write",
    "maintenance.records.read",
    "maintenance.records.write",
    "finance.records.read",
    "contracts.records.read",
    "contracts.records.write",
    "discount.approve",
    "export.execute",
  ],
  OPERATIONS_MANAGER: [
    "organization.read",
    "organization.assignment.manage",
    "organization.audit.read",
    "sales.records.read",
    "sales.records.write",
    "property.records.read",
    "property.records.write",
    "maintenance.records.read",
    "maintenance.records.write",
    "maintenance.assignment.manage",
    "contracts.records.read",
    "export.execute",
  ],
  BRANCH_MANAGER: [
    "organization.read",
    "organization.assignment.manage",
    "sales.records.read",
    "sales.records.write",
    "property.records.read",
    "property.records.write",
    "maintenance.records.read",
    "maintenance.records.write",
    "maintenance.assignment.manage",
    "finance.records.read",
    "contracts.records.read",
    "contracts.records.write",
    "discount.approve",
    "export.execute",
  ],
  SALES_LEASING_MANAGER: [
    "organization.read",
    "sales.records.read",
    "sales.records.write",
    "property.records.read",
    "contracts.records.read",
    "contracts.records.write",
    "discount.approve",
    "export.execute",
  ],
  BROKER_AGENT: [
    "organization.read",
    "sales.records.read",
    "sales.records.write",
    "property.records.read",
    "contracts.records.read",
  ],
  PROPERTY_MANAGER: [
    "organization.read",
    "property.records.read",
    "property.records.write",
    "maintenance.records.read",
    "maintenance.records.write",
    "contracts.records.read",
    "export.execute",
  ],
  FACILITY_MAINTENANCE_MANAGER: [
    "organization.read",
    "property.records.read",
    "maintenance.records.read",
    "maintenance.records.write",
    "maintenance.assignment.manage",
    "contracts.records.read",
    "export.execute",
  ],
  MAINTENANCE_COORDINATOR: [
    "organization.read",
    "property.records.read",
    "maintenance.records.read",
    "maintenance.records.write",
    "maintenance.assignment.manage",
  ],
  TECHNICIAN_CONTRACTOR: [
    "organization.read",
    "maintenance.records.read",
    "maintenance.records.write",
  ],
  FINANCE_MANAGER: [
    "organization.read",
    "organization.audit.read",
    "finance.records.read",
    "finance.records.write",
    "finance.refund.initiate",
    "finance.refund.approve",
    "contracts.records.read",
    "contracts.cancel.execute",
    "discount.approve",
    "export.execute",
  ],
  ACCOUNTANT_COLLECTOR: [
    "organization.read",
    "finance.records.read",
    "finance.records.write",
    "finance.refund.initiate",
    "contracts.records.read",
    "export.execute",
  ],
  CUSTOMER_SERVICE_REPRESENTATIVE: [
    "organization.read",
    "sales.records.read",
    "property.records.read",
    "maintenance.records.read",
    "contracts.records.read",
  ],
  COMPLIANCE_AUDIT: [
    "organization.read",
    "organization.audit.read",
    "sales.records.read",
    "property.records.read",
    "maintenance.records.read",
    "finance.records.read",
    "contracts.records.read",
    "export.execute",
    "security.customer_event_raw_ip.read",
  ],
  SYSTEM_ADMINISTRATOR: [
    "organization.read",
    "organization.audit.read",
    "system.configure",
  ],
} as const satisfies Readonly<
  Record<OrganizationSecurityRole, readonly OrganizationPermissionKey[]>
>;

export const ORGANIZATION_ROLE_GRANTS = {
  PLATFORM_OWNER: [
    "GENERAL_MANAGER",
    "OPERATIONS_MANAGER",
    "BRANCH_MANAGER",
    "SALES_LEASING_MANAGER",
    "BROKER_AGENT",
    "PROPERTY_MANAGER",
    "FACILITY_MAINTENANCE_MANAGER",
    "MAINTENANCE_COORDINATOR",
    "TECHNICIAN_CONTRACTOR",
    "FINANCE_MANAGER",
    "ACCOUNTANT_COLLECTOR",
    "CUSTOMER_SERVICE_REPRESENTATIVE",
    "COMPLIANCE_AUDIT",
    "SYSTEM_ADMINISTRATOR",
  ],
  GENERAL_MANAGER: [
    "OPERATIONS_MANAGER",
    "BRANCH_MANAGER",
    "SALES_LEASING_MANAGER",
    "BROKER_AGENT",
    "PROPERTY_MANAGER",
    "FACILITY_MAINTENANCE_MANAGER",
    "MAINTENANCE_COORDINATOR",
    "TECHNICIAN_CONTRACTOR",
    "FINANCE_MANAGER",
    "ACCOUNTANT_COLLECTOR",
    "CUSTOMER_SERVICE_REPRESENTATIVE",
    "COMPLIANCE_AUDIT",
    "SYSTEM_ADMINISTRATOR",
  ],
  OPERATIONS_MANAGER: [
    "BRANCH_MANAGER",
    "SALES_LEASING_MANAGER",
    "BROKER_AGENT",
    "PROPERTY_MANAGER",
    "FACILITY_MAINTENANCE_MANAGER",
    "MAINTENANCE_COORDINATOR",
    "TECHNICIAN_CONTRACTOR",
    "CUSTOMER_SERVICE_REPRESENTATIVE",
  ],
  BRANCH_MANAGER: [
    "SALES_LEASING_MANAGER",
    "BROKER_AGENT",
    "PROPERTY_MANAGER",
    "FACILITY_MAINTENANCE_MANAGER",
    "MAINTENANCE_COORDINATOR",
    "TECHNICIAN_CONTRACTOR",
    "CUSTOMER_SERVICE_REPRESENTATIVE",
  ],
  SALES_LEASING_MANAGER: [],
  BROKER_AGENT: [],
  PROPERTY_MANAGER: [],
  FACILITY_MAINTENANCE_MANAGER: [],
  MAINTENANCE_COORDINATOR: [],
  TECHNICIAN_CONTRACTOR: [],
  FINANCE_MANAGER: [],
  ACCOUNTANT_COLLECTOR: [],
  CUSTOMER_SERVICE_REPRESENTATIVE: [],
  COMPLIANCE_AUDIT: [],
  SYSTEM_ADMINISTRATOR: [],
} as const satisfies Readonly<
  Record<OrganizationSecurityRole, readonly OrganizationSecurityRole[]>
>;

const PERMISSION_SERVICE_LINE: Partial<
  Record<OrganizationPermissionKey, OrganizationServiceLine>
> = {
  "sales.records.read": "SALES",
  "sales.records.write": "SALES",
  "property.records.read": "PROPERTY_MANAGEMENT",
  "property.records.write": "PROPERTY_MANAGEMENT",
  "maintenance.records.read": "MAINTENANCE",
  "maintenance.records.write": "MAINTENANCE",
  "maintenance.assignment.manage": "MAINTENANCE",
  "finance.records.read": "FINANCE_AND_COLLECTION",
  "finance.records.write": "FINANCE_AND_COLLECTION",
  "finance.refund.initiate": "FINANCE_AND_COLLECTION",
  "finance.refund.approve": "FINANCE_AND_COLLECTION",
  "discount.approve": "SALES",
  "export.execute": "REPORTING",
};

const SEPARATION_OF_DUTIES_PERMISSIONS = new Set<OrganizationPermissionKey>([
  "finance.refund.approve",
  "discount.approve",
]);

export function roleHasOrganizationPermission(
  role: OrganizationSecurityRole,
  permission: OrganizationPermissionKey,
): boolean {
  const permissions = ORGANIZATION_ROLE_PERMISSIONS[
    role
  ] as readonly OrganizationPermissionKey[];
  return permissions.includes(permission);
}

export function canGrantOrganizationRole(
  grantorRole: OrganizationSecurityRole,
  targetRole: OrganizationSecurityRole,
): boolean {
  const grants = ORGANIZATION_ROLE_GRANTS[
    grantorRole
  ] as readonly OrganizationSecurityRole[];
  return grants.includes(targetRole);
}

function isAssignmentActive(
  assignment: OrganizationScopeAssignment,
  now: Date,
): boolean {
  if (!assignment.active) return false;
  if (assignment.startsAt && assignment.startsAt > now) return false;
  if (assignment.endsAt && assignment.endsAt <= now) return false;
  return true;
}

function assignmentMatchesResource(
  assignment: OrganizationScopeAssignment,
  input: OrganizationAuthorityInput,
): boolean {
  const resource = input.resource;

  switch (assignment.scopeType) {
    case "COMPANY":
      return true;
    case "BRANCH":
      return Boolean(
        assignment.branchId && resource.branchId === assignment.branchId,
      );
    case "DEPARTMENT":
      return Boolean(
        assignment.departmentId &&
          resource.departmentId === assignment.departmentId &&
          (!assignment.branchId || resource.branchId === assignment.branchId),
      );
    case "TEAM":
      return Boolean(
        assignment.teamId &&
          resource.teamId === assignment.teamId &&
          (!assignment.departmentId ||
            resource.departmentId === assignment.departmentId) &&
          (!assignment.branchId || resource.branchId === assignment.branchId),
      );
    case "ASSIGNED_RESOURCE":
      return Boolean(
        assignment.assignedResourceType &&
          assignment.assignedResourceId &&
          resource.resourceType === assignment.assignedResourceType &&
          resource.resourceId === assignment.assignedResourceId &&
          (!assignment.branchId || resource.branchId === assignment.branchId) &&
          (!assignment.departmentId ||
            resource.departmentId === assignment.departmentId) &&
          (!assignment.teamId || resource.teamId === assignment.teamId),
      );
  }
}

function serviceEnabledForBranch(input: OrganizationAuthorityInput): boolean {
  const requiredService = PERMISSION_SERVICE_LINE[input.permission];
  const branchId = input.resource.branchId;

  if (!requiredService || !branchId) return true;

  return Boolean(
    input.enabledBranchServices?.some(
      (service) =>
        service.branchId === branchId &&
        service.serviceLine === requiredService &&
        service.enabled,
    ),
  );
}

function denied(
  code: Exclude<OrganizationAuthorityDecision["code"], "ALLOW">,
): OrganizationAuthorityDecision {
  return { allowed: false, code, assignmentId: null };
}

export function evaluateOrganizationAuthority(
  input: OrganizationAuthorityInput,
): OrganizationAuthorityDecision {
  if (input.actorTenantId !== input.resource.tenantId) {
    return denied("TENANT_SCOPE_MISMATCH");
  }

  const now = input.now ?? new Date();
  const activeAssignments = input.assignments.filter(
    (assignment) =>
      assignment.tenantId === input.actorTenantId &&
      assignment.userId === input.actorUserId &&
      isAssignmentActive(assignment, now),
  );

  if (activeAssignments.length === 0) {
    return denied("NO_ACTIVE_ASSIGNMENT");
  }

  const permissionAssignments = activeAssignments.filter((assignment) =>
    roleHasOrganizationPermission(assignment.securityRole, input.permission),
  );

  if (permissionAssignments.length === 0) {
    return denied("ROLE_PERMISSION_DENIED");
  }

  const scopeEligibleAssignments =
    input.permission === "security.customer_event_raw_ip.read"
      ? permissionAssignments.filter(
          (assignment) =>
            assignment.securityRole === "COMPLIANCE_AUDIT" &&
            (assignment.scopeType === "COMPANY" || assignment.scopeType === "BRANCH"),
        )
      : permissionAssignments;

  if (scopeEligibleAssignments.length === 0) {
    return denied("ROLE_SCOPE_DENIED");
  }

  const scopedAssignment = scopeEligibleAssignments.find((assignment) =>
    assignmentMatchesResource(assignment, input),
  );

  if (!scopedAssignment) {
    return denied("RESOURCE_SCOPE_DENIED");
  }

  if (!serviceEnabledForBranch(input)) {
    return denied("SERVICE_DISABLED");
  }

  if (
    SEPARATION_OF_DUTIES_PERMISSIONS.has(input.permission) &&
    (!input.initiatedByUserId || input.initiatedByUserId === input.actorUserId)
  ) {
    return denied("SEPARATION_OF_DUTIES_DENIED");
  }

  return {
    allowed: true,
    code: "ALLOW",
    assignmentId: scopedAssignment.id,
  };
}
