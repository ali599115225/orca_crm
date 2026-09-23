import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(
    process.cwd(),
    "lib/offer-management/security-event-access.ts",
  ),
  "utf8",
);

describe("Offer security event canonical authority", () => {
  it("removes legacy user_scope_assignments authority", () => {
    expect(source).not.toContain("user_scope_assignments");
    expect(source).not.toContain("security_role = 'COMPLIANCE_AUDIT'");
  });

  it("uses canonical G3 role and permission persistence", () => {
    expect(source).toContain("role_assignments");
    expect(source).toContain("access_roles");
    expect(source).toContain("access_role_permissions");
    expect(source).toContain("access_permissions");
    expect(source).toContain("ap.key = ${PERMISSION}");
  });

  it("preserves company and branch envelope compatibility", () => {
    expect(source).toContain('candidate.scope_type === "TENANT"');
    expect(source).toContain('? "COMPANY"');
    expect(source).toContain("candidate.scope_org_unit_id");
  });
});
