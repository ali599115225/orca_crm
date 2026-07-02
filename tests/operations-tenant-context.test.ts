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
