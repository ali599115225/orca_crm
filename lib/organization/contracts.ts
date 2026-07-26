export const ORGANIZATION_SERVICE_LINES = [
  "BROKERAGE",
  "MARKETING",
  "SALES",
  "LEASING",
  "PROPERTY_MANAGEMENT",
  "FACILITY_MANAGEMENT",
  "MAINTENANCE",
  "CUSTOMER_SERVICE",
  "FINANCE_AND_COLLECTION",
  "DOCUMENTS",
  "REPORTING",
] as const;

export type OrganizationServiceLine =
  (typeof ORGANIZATION_SERVICE_LINES)[number];

export const ORGANIZATION_SECURITY_ROLES = [
  "PLATFORM_OWNER",
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
] as const;

export type OrganizationSecurityRole =
  (typeof ORGANIZATION_SECURITY_ROLES)[number];

export const DEFAULT_JOB_TITLE_EXAMPLES = [
  "Platform Owner",
  "General Manager",
  "Operations Manager",
  "Branch Manager",
  "Sales and Leasing Manager",
  "Broker / Agent",
  "Property Manager",
  "Facility and Maintenance Manager",
  "Maintenance Coordinator",
  "Technician / Contractor",
  "Finance Manager",
  "Accountant / Collector",
  "Customer Service Representative",
  "Compliance / Audit",
  "System Administrator",
] as const;

export const ORGANIZATION_SCOPE_TYPES = [
  "COMPANY",
  "BRANCH",
  "DEPARTMENT",
  "TEAM",
  "ASSIGNED_RESOURCE",
] as const;

export type OrganizationScopeType =
  (typeof ORGANIZATION_SCOPE_TYPES)[number];

export const ORGANIZATION_PERMISSION_KEYS = [
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
  "maintenance.assignment.manage",
  "finance.records.read",
  "finance.records.write",
  "finance.refund.initiate",
  "finance.refund.approve",
  "contracts.records.read",
  "contracts.records.write",
  "contracts.cancel.execute",
  "discount.approve",
  "export.execute",
  "system.configure",
] as const;

export type OrganizationPermissionKey =
  (typeof ORGANIZATION_PERMISSION_KEYS)[number];

export type OrganizationScopeAssignment = Readonly<{
  id: string;
  tenantId: string;
  userId: string;
  securityRole: OrganizationSecurityRole;
  scopeType: OrganizationScopeType;
  branchId?: string | null;
  departmentId?: string | null;
  teamId?: string | null;
  assignedResourceType?: string | null;
  assignedResourceId?: string | null;
  active: boolean;
  startsAt?: Date | null;
  endsAt?: Date | null;
}>;

export type OrganizationResourceScope = Readonly<{
  tenantId: string;
  branchId?: string | null;
  departmentId?: string | null;
  teamId?: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
  serviceLine?: OrganizationServiceLine | null;
}>;

export type EnabledBranchService = Readonly<{
  branchId: string;
  serviceLine: OrganizationServiceLine;
  enabled: boolean;
}>;

export type OrganizationAuthorityDecision = Readonly<{
  allowed: boolean;
  code:
    | "ALLOW"
    | "TENANT_SCOPE_MISMATCH"
    | "NO_ACTIVE_ASSIGNMENT"
    | "ROLE_PERMISSION_DENIED"
    | "RESOURCE_SCOPE_DENIED"
    | "SERVICE_DISABLED"
    | "SEPARATION_OF_DUTIES_DENIED";
  assignmentId: string | null;
}>;

export type OrganizationAuthorityInput = Readonly<{
  actorUserId: string;
  actorTenantId: string;
  permission: OrganizationPermissionKey;
  resource: OrganizationResourceScope;
  assignments: readonly OrganizationScopeAssignment[];
  enabledBranchServices?: readonly EnabledBranchService[];
  initiatedByUserId?: string | null;
  now?: Date;
}>;
