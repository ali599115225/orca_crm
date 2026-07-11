import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function source(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("contracts and payments navigation", () => {
  it("keeps the selected contracts-and-payments pane in the URL", () => {
    const rental = source("app/operations/rental/page.tsx");

    expect(rental).toContain("useRouter, useSearchParams");
    expect(rental).toContain("const searchParams = useSearchParams();");
    expect(rental).toContain("const changePane = (pane: ActivePane)");
    expect(rental).toContain("params.set('pane', pane);");
    expect(rental).toContain("router.replace(");
    expect(rental).not.toContain("setActivePane(t.id as any)");
  });

  it("returns from a sales contract to the sales-contracts pane", () => {
    const workspace = source(
      "components/sales/SalesContractWorkspace.tsx",
    );

    expect(workspace).toContain(
      'router.push("/operations/rental?pane=sales")',
    );
    expect(workspace).not.toContain(
      'router.push("/operations/rental")',
    );
  });
});