import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const action = readFileSync(
  resolve(process.cwd(), "app/actions/organization.ts"),
  "utf8",
);

describe("Canonical company organization model", () => {
  it("uses OrgUnit hierarchy for department and team creation", () => {
    expect(action).toContain(
      "createOrganizationDepartmentAction",
    );
    expect(action).toContain(
      "createOrganizationTeamAction",
    );
    expect(action).toContain('type: "DEPARTMENT"');
    expect(action).toContain('type: "TEAM"');
    expect(action).toContain("parentId: branchId");
    expect(action).toContain("parentId: department.id");
  });

  it("uses OrgAssignment plus scoped RoleAssignment for staff authority", () => {
    expect(action).toContain(
      "assignOrganizationMemberAction",
    );
    expect(action).toContain("tx.orgAssignment.upsert");
    expect(action).toContain(
      "tx.roleAssignment.findFirst",
    );
    expect(action).toContain(
      "tx.roleAssignment.create",
    );
    expect(action).toContain(
      'scopeOrgUnitId: orgUnitId',
    );
    expect(action).toContain('"access.manage"');
  });

  it("validates tenant-owned user, org unit, and access role before assignment", () => {
    expect(action).toContain("tx.user.findFirst");
    expect(action).toContain("tx.orgUnit.findFirst");
    expect(action).toContain("tx.accessRole.findFirst");
    expect(action).toContain(
      "ORGANIZATION_ASSIGNABLE_UNIT_NOT_FOUND",
    );
    expect(action).toContain("ACCESS_ROLE_NOT_FOUND");
  });

  it("does not reintroduce EXEC-004 persistence into canonical actions", () => {
    expect(action).not.toContain(
      'FROM "organization_branches"',
    );
    expect(action).not.toContain(
      '"user_scope_assignments"',
    );
    expect(action).not.toContain(
      '"branch_services"',
    );
    expect(action).not.toContain(
      "organizationSqlRepository",
    );
  });
});
