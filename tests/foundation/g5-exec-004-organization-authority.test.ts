import { describe, expect, it } from "vitest";
import {
  evaluateOrganizationAuthority,
  ORGANIZATION_ROLE_PERMISSIONS,
  roleHasOrganizationPermission,
} from "@/lib/organization/authority";
import {
  ORGANIZATION_PERMISSION_KEYS,
  ORGANIZATION_SECURITY_ROLES,
  type EnabledBranchService,
  type OrganizationScopeAssignment,
} from "@/lib/organization/contracts";

const NOW = new Date("2026-07-26T00:00:00.000Z");

function assignment(
  overrides: Partial<OrganizationScopeAssignment> = {},
): OrganizationScopeAssignment {
  return {
    id: "assignment-1",
    tenantId: "tenant-1",
    userId: "user-1",
    securityRole: "BRANCH_MANAGER",
    scopeType: "BRANCH",
    branchId: "branch-1",
    departmentId: null,
    teamId: null,
    assignedResourceType: null,
    assignedResourceId: null,
    active: true,
    startsAt: null,
    endsAt: null,
    ...overrides,
  };
}

const ENABLED_SERVICES: EnabledBranchService[] = [
  { branchId: "branch-1", serviceLine: "SALES", enabled: true },
  {
    branchId: "branch-1",
    serviceLine: "FINANCE_AND_COLLECTION",
    enabled: true,
  },
  { branchId: "branch-1", serviceLine: "MAINTENANCE", enabled: true },
  { branchId: "branch-1", serviceLine: "REPORTING", enabled: true },
];

function decide(input: {
  permission?: Parameters<typeof evaluateOrganizationAuthority>[0]["permission"];
  resource?: Parameters<typeof evaluateOrganizationAuthority>[0]["resource"];
  assignments?: OrganizationScopeAssignment[];
  enabledBranchServices?: EnabledBranchService[];
  actorTenantId?: string;
  initiatedByUserId?: string | null;
}) {
  return evaluateOrganizationAuthority({
    actorUserId: "user-1",
    actorTenantId: input.actorTenantId ?? "tenant-1",
    permission: input.permission ?? "sales.records.read",
    resource: input.resource ?? {
      tenantId: "tenant-1",
      branchId: "branch-1",
      serviceLine: "SALES",
    },
    assignments: input.assignments ?? [assignment()],
    enabledBranchServices:
      input.enabledBranchServices ?? ENABLED_SERVICES,
    initiatedByUserId: input.initiatedByUserId,
    now: NOW,
  });
}

describe("EXEC-004 organization authority", () => {
  it("allows a branch manager inside the explicitly assigned branch", () => {
    expect(decide({ permission: "sales.records.write" })).toMatchObject({
      allowed: true,
      code: "ALLOW",
      assignmentId: "assignment-1",
    });
  });

  it("denies cross-branch access even when the role has the permission", () => {
    expect(
      decide({
        permission: "sales.records.write",
        resource: {
          tenantId: "tenant-1",
          branchId: "branch-2",
          serviceLine: "SALES",
        },
      }),
    ).toMatchObject({ allowed: false, code: "RESOURCE_SCOPE_DENIED" });
  });

  it("denies cross-company tenant scope", () => {
    expect(
      decide({
        actorTenantId: "tenant-2",
        resource: { tenantId: "tenant-1", branchId: "branch-1" },
      }),
    ).toMatchObject({ allowed: false, code: "TENANT_SCOPE_MISMATCH" });
  });

  it("denies by default when no active assignment exists", () => {
    expect(decide({ assignments: [] })).toMatchObject({
      allowed: false,
      code: "NO_ACTIVE_ASSIGNMENT",
    });
  });

  it("does not treat branch membership as permission", () => {
    expect(
      decide({
        permission: "finance.records.write",
        assignments: [assignment({ securityRole: "BROKER_AGENT" })],
      }),
    ).toMatchObject({ allowed: false, code: "ROLE_PERMISSION_DENIED" });
  });

  it("keeps the technical system administrator outside finance authority", () => {
    expect(
      decide({
        permission: "finance.records.write",
        assignments: [
          assignment({
            securityRole: "SYSTEM_ADMINISTRATOR",
            scopeType: "COMPANY",
            branchId: null,
          }),
        ],
      }),
    ).toMatchObject({ allowed: false, code: "ROLE_PERMISSION_DENIED" });
  });

  it("keeps the platform owner outside automatic finance write authority", () => {
    expect(
      decide({
        permission: "finance.records.write",
        assignments: [
          assignment({
            securityRole: "PLATFORM_OWNER",
            scopeType: "COMPANY",
            branchId: null,
          }),
        ],
      }),
    ).toMatchObject({ allowed: false, code: "ROLE_PERMISSION_DENIED" });
  });

  it("requires a service line to be enabled for branch operations", () => {
    expect(
      decide({
        permission: "maintenance.records.write",
        assignments: [
          assignment({ securityRole: "FACILITY_MAINTENANCE_MANAGER" }),
        ],
        enabledBranchServices: [],
      }),
    ).toMatchObject({ allowed: false, code: "SERVICE_DISABLED" });
  });

  it("allows finance approval only when the branch service is enabled", () => {
    expect(
      decide({
        permission: "finance.refund.approve",
        assignments: [assignment({ securityRole: "FINANCE_MANAGER" })],
        initiatedByUserId: "another-user",
      }),
    ).toMatchObject({ allowed: true, code: "ALLOW" });
  });

  it("blocks self-approval for refunds", () => {
    expect(
      decide({
        permission: "finance.refund.approve",
        assignments: [assignment({ securityRole: "FINANCE_MANAGER" })],
        initiatedByUserId: "user-1",
      }),
    ).toMatchObject({
      allowed: false,
      code: "SEPARATION_OF_DUTIES_DENIED",
    });
  });

  it("blocks approval when initiator evidence is missing", () => {
    expect(
      decide({
        permission: "finance.refund.approve",
        assignments: [assignment({ securityRole: "FINANCE_MANAGER" })],
      }),
    ).toMatchObject({
      allowed: false,
      code: "SEPARATION_OF_DUTIES_DENIED",
    });
  });

  it("matches department assignments only to the exact department", () => {
    const departmentAssignment = assignment({
      securityRole: "OPERATIONS_MANAGER",
      scopeType: "DEPARTMENT",
      branchId: "branch-1",
      departmentId: "department-1",
    });

    expect(
      decide({
        permission: "property.records.write",
        assignments: [departmentAssignment],
        resource: {
          tenantId: "tenant-1",
          branchId: "branch-1",
          departmentId: "department-1",
          serviceLine: "PROPERTY_MANAGEMENT",
        },
        enabledBranchServices: [
          {
            branchId: "branch-1",
            serviceLine: "PROPERTY_MANAGEMENT",
            enabled: true,
          },
        ],
      }),
    ).toMatchObject({ allowed: true, code: "ALLOW" });

    expect(
      decide({
        permission: "property.records.write",
        assignments: [departmentAssignment],
        resource: {
          tenantId: "tenant-1",
          branchId: "branch-1",
          departmentId: "department-2",
          serviceLine: "PROPERTY_MANAGEMENT",
        },
        enabledBranchServices: [
          {
            branchId: "branch-1",
            serviceLine: "PROPERTY_MANAGEMENT",
            enabled: true,
          },
        ],
      }),
    ).toMatchObject({ allowed: false, code: "RESOURCE_SCOPE_DENIED" });
  });

  it("matches assigned-resource scope only to the exact record", () => {
    const resourceAssignment = assignment({
      securityRole: "BROKER_AGENT",
      scopeType: "ASSIGNED_RESOURCE",
      assignedResourceType: "LEAD",
      assignedResourceId: "lead-1",
    });

    expect(
      decide({
        assignments: [resourceAssignment],
        resource: {
          tenantId: "tenant-1",
          branchId: "branch-1",
          resourceType: "LEAD",
          resourceId: "lead-1",
          serviceLine: "SALES",
        },
      }),
    ).toMatchObject({ allowed: true, code: "ALLOW" });

    expect(
      decide({
        assignments: [resourceAssignment],
        resource: {
          tenantId: "tenant-1",
          branchId: "branch-1",
          resourceType: "LEAD",
          resourceId: "lead-2",
          serviceLine: "SALES",
        },
      }),
    ).toMatchObject({ allowed: false, code: "RESOURCE_SCOPE_DENIED" });
  });

  it("rejects expired assignments", () => {
    expect(
      decide({
        assignments: [
          assignment({ endsAt: new Date("2026-07-25T23:59:59.000Z") }),
        ],
      }),
    ).toMatchObject({ allowed: false, code: "NO_ACTIVE_ASSIGNMENT" });
  });

  it("rejects assignments that have not started", () => {
    expect(
      decide({
        assignments: [
          assignment({ startsAt: new Date("2026-07-27T00:00:00.000Z") }),
        ],
      }),
    ).toMatchObject({ allowed: false, code: "NO_ACTIVE_ASSIGNMENT" });
  });

  it("keeps compliance read-only", () => {
    const compliance = assignment({
      securityRole: "COMPLIANCE_AUDIT",
      scopeType: "COMPANY",
      branchId: null,
    });

    expect(
      decide({
        permission: "finance.records.read",
        assignments: [compliance],
      }),
    ).toMatchObject({ allowed: true, code: "ALLOW" });

    expect(
      decide({
        permission: "finance.records.write",
        assignments: [compliance],
      }),
    ).toMatchObject({ allowed: false, code: "ROLE_PERMISSION_DENIED" });
  });
});


describe("EXEC-007 Batch 3 dedicated raw-IP authority", () => {
  const permission = "security.customer_event_raw_ip.read" as const;
  const compliance = (scopeType: OrganizationScopeAssignment["scopeType"], overrides: Partial<OrganizationScopeAssignment> = {}) =>
    assignment({
      id: `compliance-${scopeType.toLowerCase()}`,
      securityRole: "COMPLIANCE_AUDIT",
      scopeType,
      branchId: scopeType === "COMPANY" ? null : "branch-1",
      departmentId: scopeType === "DEPARTMENT" ? "department-1" : null,
      teamId: scopeType === "TEAM" ? "team-1" : null,
      assignedResourceType: scopeType === "ASSIGNED_RESOURCE" ? "SECURITY_EVENT" : null,
      assignedResourceId: scopeType === "ASSIGNED_RESOURCE" ? "event-1" : null,
      ...overrides,
    });

  it("T-B3-AUTH-001 dedicated raw-IP permission is registered exactly once", () => {
    expect(ORGANIZATION_PERMISSION_KEYS.filter((item) => item === permission)).toHaveLength(1);
  });

  it("T-B3-AUTH-002 COMPLIANCE_AUDIT receives dedicated raw-IP permission", () => {
    expect(roleHasOrganizationPermission("COMPLIANCE_AUDIT", permission)).toBe(true);
    expect(ORGANIZATION_ROLE_PERMISSIONS.COMPLIANCE_AUDIT.filter((item) => item === permission)).toHaveLength(1);
  });

  it("T-B3-AUTH-003 PLATFORM_OWNER does not receive dedicated raw-IP permission", () => {
    expect(roleHasOrganizationPermission("PLATFORM_OWNER", permission)).toBe(false);
  });

  it("T-B3-AUTH-004 GENERAL_MANAGER does not receive dedicated raw-IP permission", () => {
    expect(roleHasOrganizationPermission("GENERAL_MANAGER", permission)).toBe(false);
  });

  it("T-B3-AUTH-005 SYSTEM_ADMINISTRATOR does not receive dedicated raw-IP permission", () => {
    expect(roleHasOrganizationPermission("SYSTEM_ADMINISTRATOR", permission)).toBe(false);
  });

  it("T-B3-AUTH-006 every non-COMPLIANCE_AUDIT role is denied", () => {
    for (const role of ORGANIZATION_SECURITY_ROLES) {
      expect(roleHasOrganizationPermission(role, permission)).toBe(role === "COMPLIANCE_AUDIT");
    }
  });

  it("T-B3-AUTH-007 active COMPLIANCE_AUDIT COMPANY assignment is eligible", () => {
    expect(decide({ permission, assignments: [compliance("COMPANY")] })).toEqual({
      allowed: true,
      code: "ALLOW",
      assignmentId: "compliance-company",
    });
  });

  it("T-B3-AUTH-008 exact active COMPLIANCE_AUDIT BRANCH assignment is eligible", () => {
    expect(decide({ permission, assignments: [compliance("BRANCH")] })).toEqual({
      allowed: true,
      code: "ALLOW",
      assignmentId: "compliance-branch",
    });
  });

  for (const scopeType of ["DEPARTMENT", "TEAM", "ASSIGNED_RESOURCE"] as const) {
    const id = scopeType === "DEPARTMENT" ? "T-B3-AUTH-009" : scopeType === "TEAM" ? "T-B3-AUTH-010" : "T-B3-AUTH-011";
    it(`${id} COMPLIANCE_AUDIT ${scopeType} assignment is rejected`, () => {
      expect(decide({
        permission,
        assignments: [compliance(scopeType)],
        resource: {
          tenantId: "tenant-1",
          branchId: "branch-1",
          departmentId: "department-1",
          teamId: "team-1",
          resourceType: "SECURITY_EVENT",
          resourceId: "event-1",
        },
      })).toMatchObject({ allowed: false, code: "ROLE_SCOPE_DENIED" });
    });
  }
});
