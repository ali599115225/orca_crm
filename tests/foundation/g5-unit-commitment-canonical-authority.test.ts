import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { AccessContext } from "@/lib/authz/authorization";
import type { PermissionKey } from "@/lib/authz/permission-registry";
import {
  assertUnitCommitmentAuthority,
} from "@/lib/unit-commitment/authority";
import type {
  UnitCommandContext,
} from "@/lib/unit-commitment/contracts";

function accessContext(
  permission: PermissionKey,
  branchId = "branch-1",
): AccessContext {
  const permissionKeys =
    new Set<PermissionKey>([permission]);

  return {
    tenantId: "tenant-1",
    userId: "user-1",
    tenantActive: true,
    userActive: true,
    legacyRole: "",
    orgAssignments: [],
    roleAssignments: [
      {
        id: "role-assignment-1",
        accessRoleId: "role-1",
        roleKey: "sales-agent",
        scopeType: "BRANCH",
        scopeOrgUnitId: branchId,
        resourceType: null,
        resourceId: null,
        validFrom: new Date("2026-01-01T00:00:00.000Z"),
        validUntil: null,
        permissionKeys,
      },
    ],
    permissionKeys,
    resolvedAt: new Date("2026-09-22T00:00:00.000Z"),
  };
}

function context(
  authorizationContext: AccessContext,
): UnitCommandContext {
  return {
    actorId: "user-1",
    tenantId: "tenant-1",
    scope: {
      branchId: "branch-1",
    },
    authorizationContext,
    auditCorrelationId: "corr-1",
  };
}

describe("Unit Commitment final canonical authority", () => {
  it("authorizes through canonical G3 RoleAssignment", () => {
    const evidence =
      assertUnitCommitmentAuthority(
        context(
          accessContext(
            "unit-commitments.hold-create",
          ),
        ),
        "UNIT_HOLD_CREATE",
        {
          branchId: "branch-1",
          resourceType: "UNIT",
          resourceId: "unit-1",
        },
      );

    expect(evidence.id).toBe(
      "role-assignment-1",
    );
  });

  it("fails closed on scope mismatch", () => {
    expect(() =>
      assertUnitCommitmentAuthority(
        context(
          accessContext(
            "unit-commitments.hold-create",
            "branch-2",
          ),
        ),
        "UNIT_HOLD_CREATE",
        {
          branchId: "branch-1",
          resourceType: "UNIT",
          resourceId: "unit-1",
        },
      ),
    ).toThrow();
  });

  it("contains no EXEC-004 authority fallback", () => {
    const authority =
      readFileSync(
        resolve(
          process.cwd(),
          "lib/unit-commitment/authority.ts",
        ),
        "utf8",
      );

    for (const forbidden of [
      "evaluateOrganizationAuthority",
      "OrganizationScopeAssignment",
      "ROLE_PERMISSION_MATRIX",
      "enabledBranchServices",
    ]) {
      expect(authority).not.toContain(
        forbidden,
      );
    }
  });

  it("keeps AccessContext outside durable ApprovalEvidence", () => {
    const contracts =
      readFileSync(
        resolve(
          process.cwd(),
          "lib/unit-commitment/contracts.ts",
        ),
        "utf8",
      );

    const start =
      contracts.indexOf(
        "export type ApprovalEvidence",
      );

    const end =
      contracts.indexOf(
        "}>;",
        start,
      );

    const block =
      contracts.slice(
        start,
        end + 3,
      );

    expect(block).not.toContain(
      "AccessContext",
    );

    expect(block).not.toContain(
      "approverAssignments",
    );
  });

  it("uses canonical staff placement evidence", () => {
    const service =
      readFileSync(
        resolve(
          process.cwd(),
          "lib/unit-commitment/service.ts",
        ),
        "utf8",
      );

    expect(service).toContain(
      "isCanonicalStaffPlacementEvidence",
    );

    expect(service).not.toContain(
      "context.assignments",
    );
  });
});
