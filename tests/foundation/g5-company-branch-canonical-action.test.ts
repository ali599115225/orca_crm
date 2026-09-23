import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const action = readFileSync(
  resolve(root, "app/actions/organization.ts"),
  "utf8",
);
const rbacSchema = readFileSync(
  resolve(root, "prisma/rbac.prisma"),
  "utf8",
);

describe("Company -> Branch canonical action cutover", () => {
  it("uses OrgUnit BRANCH as the branch persistence authority", () => {
    expect(rbacSchema).toContain("model OrgUnit {");
    expect(rbacSchema).toContain("BRANCH");

    expect(action).toContain("rawPrisma.orgUnit.findMany");
    expect(action).toContain("rawPrisma.orgUnit.findUnique");
    expect(action).toContain("tx.orgUnit.create");
    expect(action).toContain('type: "BRANCH"');
  });

  it("routes branch access through the canonical progressive authorization boundary", () => {
    expect(action).toContain(
      "assertServerActionRoleWithProgressiveAuthorization",
    );
    expect(action).toContain('"organization.read"');
    expect(action).toContain('"organization.manage"');
    expect(action).toContain('domain: "users-settings"');
  });

  it("does not use the duplicate EXEC-004 branch persistence path", () => {
    expect(action).not.toContain("organizationSqlRepository");
    expect(action).not.toContain("loadOrganizationAuthorityContext");
    expect(action).not.toContain('"organization_branches"');
    expect(action).not.toContain('"user_scope_assignments"');
  });

  it("keeps Company scope distinct from Branch scope", () => {
    expect(action).toContain(
      "CENTRAL_SCOPE_IS_COMPANY_NOT_BRANCH",
    );
    expect(action).toContain("parentId: null");
  });

  it("writes organization mutation evidence in the same transaction", () => {
    expect(action).toContain("rawPrisma.$transaction");
    expect(action).toContain("tx.auditLog.create");
    expect(action).toContain(
      '"ORGANIZATION_BRANCH_CREATED"',
    );
  });
});
