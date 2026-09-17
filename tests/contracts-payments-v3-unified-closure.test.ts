import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("contracts & payments V3 unified closure", () => {
  it("keeps exactly six shared workspace tabs with one hover contract", () => {
    const shell = source("components/contracts-payments/ContractsPaymentsShell.tsx");
    const css = source("app/operations/orca-page-contract-v1.css");

    for (const id of [
      '"sales"',
      '"leases"',
      '"invoices"',
      '"payments"',
      '"reconciliation"',
      '"settlements"',
    ]) {
      expect(shell).toContain(`id: ${id}`);
    }

    expect(shell).toContain("data-contracts-payments-tabs");
    expect(css).toContain(
      ".orca-contracts-payments-tabs .orca-operations-tab:not(.is-active):hover",
    );
  });

  it("uses list-to-detail navigation for both sales and rental contracts", () => {
    const leases = source("components/contracts-payments/ContractsPaymentsCenter.tsx");
    const sales = source("components/sales/SalesContractsPanel.tsx");
    const leaseRoute = source("app/operations/rental/leases/[id]/page.tsx");
    const saleRoute = source("app/operations/rental/sales/contracts/[id]/page.tsx");

    expect(leases).toContain("router.push(`/operations/rental/leases/${lease.id}`)");
    expect(sales).toContain(
      "router.push(`/operations/rental/sales/contracts/${contract.id}`)",
    );
    expect(leaseRoute).toContain("detailLeaseId={id}");
    expect(saleRoute).toContain("contractId={id}");
  });

  it("keeps back actions outside tablists and balances contract summary cards", () => {
    const leases = source("components/contracts-payments/ContractsPaymentsCenter.tsx");
    const sales = source("components/sales/SalesContractWorkspace.tsx");
    const css = source("app/operations/orca-page-contract-v1.css");

    expect(leases).toContain("OperationsBackAction");
    expect(sales).toContain("OperationsBackAction");
    expect(sales).toContain("orca-contract-summary-grid");
    expect(leases).toContain("orca-lease-summary-grid");
    expect(css).toContain("grid-template-columns: repeat(5, minmax(0, 1fr))");
    expect(css).toContain("grid-template-columns: repeat(3, minmax(0, 1fr))");
  });
  it("uses the shared Operations panel/header contract across the remaining workspaces", () => {
    for (const file of [
      "components/contracts-payments/InvoicesWorkspace.tsx",
      "components/contracts-payments/PaymentsWorkspace.tsx",
      "components/contracts-payments/ReconciliationWorkspace.tsx",
      "components/contracts-payments/SettlementsWorkspace.tsx",
    ]) {
      const workspace = source(file);
      expect(workspace).toContain("OperationsPanel");
      expect(workspace).toContain("OperationsPanelHeader");
    }
  });

});
