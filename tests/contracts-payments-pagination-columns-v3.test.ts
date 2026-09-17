import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("contracts & payments V3 pagination and numeric column contract", () => {
  it("uses one shared 8-row pagination contract across all six top-level workspaces", () => {
    const pagination = source("components/operations/OperationsPagination.tsx");
    const files = [
      "components/sales/SalesContractsPanel.tsx",
      "components/contracts-payments/ContractsPaymentsCenter.tsx",
      "components/contracts-payments/InvoicesWorkspace.tsx",
      "components/contracts-payments/PaymentsWorkspace.tsx",
      "components/contracts-payments/ReconciliationWorkspace.tsx",
      "components/contracts-payments/SettlementsWorkspace.tsx",
    ];

    expect(pagination).toContain("OPERATIONS_TABLE_PAGE_SIZE = 8");
    expect(pagination).toContain("السابق");
    expect(pagination).toContain("التالي");

    for (const file of files) {
      const contents = source(file);
      expect(contents).toContain("OperationsPagination");
      expect(contents).toContain("OPERATIONS_TABLE_PAGE_SIZE");
    }
  });

  it("reserves money columns for up to 15 numeric digits plus separators and currency", () => {
    const css = source("app/operations/orca-page-contract-v1.css");

    expect(css).toContain(".orca-number-column");
    expect(css).toContain("min-width: 24ch");
    expect(css).toContain('font-feature-settings: "tnum" 1');
    expect(css).toContain(".orca-contracts-table-scroll");
    expect(css).toContain("max-width: 100%");
    expect(css).toContain("overflow-x: auto");
  });

  it("makes text truncate before numeric columns collapse", () => {
    const invoices = source("components/contracts-payments/InvoicesWorkspace.tsx");
    const payments = source("components/contracts-payments/PaymentsWorkspace.tsx");
    const settlements = source("components/contracts-payments/SettlementsWorkspace.tsx");

    for (const contents of [invoices, payments, settlements]) {
      expect(contents).toContain("orca-number-column");
      expect(contents).toContain("orca-text-column");
      expect(contents).toContain("orca-contracts-table-scroll");
    }
  });

  it("paginates bank reconciliation results instead of allowing unbounded vertical growth", () => {
    const reconciliation = source("components/contracts-payments/ReconciliationWorkspace.tsx");

    expect(reconciliation).toContain("visibleMatches");
    expect(reconciliation).toContain("visibleExceptions");
    expect(reconciliation).toContain("matchTotalPages");
    expect(reconciliation).toContain("exceptionTotalPages");
  });
});
