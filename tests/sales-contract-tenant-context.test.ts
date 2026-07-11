import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function source(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("sales contract tenant context", () => {
  it("runs the sales contract detail route inside the database session tenant context", () => {
    const route = source("app/api/v1/contracts/[id]/route.ts");

    expect(route).toContain(
      'import { runWithDatabaseSession, TENANT_ROLES } from "@/lib/api-auth-guard";',
    );
    expect(route).toContain(
      "return runWithDatabaseSession(request, TENANT_ROLES, async (session) => {",
    );
    expect(route).toContain("const tenantId = session.tenantId;");
    expect(route).not.toContain("getTenantAndUser");
  });

  it("keeps the contract lookup tenant-scoped", () => {
    const route = source("app/api/v1/contracts/[id]/route.ts");

    expect(route).toContain("await prisma.contract.findFirst");
    expect(route).toContain("where: { id, tenantId }");
  });
});