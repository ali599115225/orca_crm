import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function source(relativePath: string) {
  return fs.readFileSync(
    path.join(process.cwd(), relativePath),
    "utf8",
  );
}

describe("Operations tenant context scope", () => {
  it("wraps the operations layout database query", () => {
    const layout = source("app/operations/layout.tsx");

    expect(layout).toContain(
      "import { runWithTenantContext } from '@/lib/tenant-context';",
    );
    expect(layout).toContain(
      "const user = await runWithTenantContext(",
    );
    expect(layout).toContain("tenantId: tenant.id");
  });

  it("does not redirect authenticated tenant-resolution failures back to login", () => {
    const layout = source("app/operations/layout.tsx");

    expect(layout).toContain("function TenantUnavailableState()");
    expect(layout).toContain("return <TenantUnavailableState />;");
    expect(layout).toContain("isPrivilegedSessionPayload(session)");
    expect(layout).not.toContain("ali.orca@outlook.sa");
    expect(layout).not.toContain("elite.orca@outlook.sa");
  });

  it("wraps all dashboard operations in tenant context", () => {
    const dashboard = source(
      "app/operations/dashboard/page.tsx",
    );

    expect(dashboard).toContain(
      "import { runWithTenantContext } from '@/lib/tenant-context';",
    );
    expect(dashboard).toContain(
      "] = await runWithTenantContext(",
    );
    expect(dashboard).toContain(
      "() => Promise.allSettled([",
    );
  });
});
