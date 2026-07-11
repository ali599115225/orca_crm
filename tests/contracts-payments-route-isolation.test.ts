import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function source(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("contracts and payments route isolation", () => {
  it("opens sales contracts inside the contracts-and-payments route tree", () => {
    const panel = source("components/sales/SalesContractsPanel.tsx");

    expect(panel).toContain("/operations/rental/sales/contracts/");
    expect(panel).not.toContain("/operations/sales/contracts/");
  });

  it("keeps a compatibility redirect for old sales contract links", () => {
    const legacyPage = source(
      "app/operations/sales/contracts/[id]/page.tsx",
    );

    expect(legacyPage).toContain('import { redirect } from "next/navigation"');
    expect(legacyPage).toContain(
      "redirect(`/operations/rental/sales/contracts/${id}`)",
    );
    expect(legacyPage).not.toContain("SalesContractWorkspace");
  });

  it("renders the workspace under the contracts-and-payments route tree", () => {
    const isolatedPage = source(
      "app/operations/rental/sales/contracts/[id]/page.tsx",
    );
    const workspace = source(
      "components/sales/SalesContractWorkspace.tsx",
    );

    expect(isolatedPage).toContain("SalesContractWorkspace");
    expect(workspace).toContain(
      'router.push("/operations/rental?pane=sales")',
    );
  });
});