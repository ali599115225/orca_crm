import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function source(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("sales contract workspace presentation truth", () => {
  it("does not present a zero remaining balance before an invoice exists", () => {
    const workspace = source(
      "components/sales/SalesContractWorkspace.tsx",
    );

    expect(workspace).toContain("function remainingBalanceLabel(");
    expect(workspace).toContain('"بانتظار إصدار الفاتورة"');
    expect(workspace).toContain('"Awaiting invoice issuance"');
    expect(workspace).toContain("Boolean(contract.invoice)");
  });

  it("normalizes and localizes contract lifecycle timeline actions", () => {
    const workspace = source(
      "components/sales/SalesContractWorkspace.tsx",
    );

    expect(workspace).toContain("const normalizedAction = action");
    expect(workspace).toContain("CREATE_DRAFT_CONTRACT:");
    expect(workspace).toContain("CREATE_CONTRACT_DRAFT:");
    expect(workspace).toContain("ISSUE_CONTRACT:");
    expect(workspace).toContain("CONTRACT_ISSUED:");
    expect(workspace).toContain("map[normalizedAction]");
  });

  it("localizes payment-plan lifecycle statuses", () => {
    const workspace = source(
      "components/sales/SalesContractWorkspace.tsx",
    );

    expect(workspace).toContain('DRAFT: ["مسودة", "Draft"]');
    expect(workspace).toContain('ACTIVE: ["نشطة", "Active"]');
  });
});