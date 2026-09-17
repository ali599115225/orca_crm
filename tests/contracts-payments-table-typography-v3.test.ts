import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("contracts & payments V3 table typography", () => {
  it("defines one readable hierarchy for table headers and rows", () => {
    const css = source("app/operations/orca-page-contract-v1.css");

    expect(css).toContain("V3 CONTRACTS TABLE TYPOGRAPHY CONTRACT");
    expect(css).toContain("font-size: 12px !important");
    expect(css).toContain("font-size: 14px !important");
    expect(css).toContain("font-size: 11px !important");
    expect(css).toContain(".orca-table-badge");
  });

  it("uses the shared typography in sales and rental custom-grid tables", () => {
    const sales = source("components/sales/SalesContractsPanel.tsx");
    const leases = source("components/contracts-payments/ContractsPaymentsCenter.tsx");

    for (const contents of [sales, leases]) {
      expect(contents).toContain("orca-contracts-grid-header");
      expect(contents).toContain("orca-contracts-grid-row");
      expect(contents).toContain("orca-table-primary");
      expect(contents).toContain("orca-table-secondary");
    }
  });

  it("uses semantic primary, secondary and badge text in financial tables", () => {
    const files = [
      "components/contracts-payments/InvoicesWorkspace.tsx",
      "components/contracts-payments/PaymentsWorkspace.tsx",
      "components/contracts-payments/SettlementsWorkspace.tsx",
    ];

    for (const file of files) {
      const contents = source(file);
      expect(contents).toContain("orca-table-primary");
      expect(contents).toContain("orca-table-secondary");
      expect(contents).toContain("orca-table-badge");
    }
  });
});
