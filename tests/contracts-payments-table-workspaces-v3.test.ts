import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("contracts & payments V3 operational table workspaces", () => {
  it("uses one shared toolbar and row-action contract across financial tables", () => {
    const invoices = source("components/contracts-payments/InvoicesWorkspace.tsx");
    const payments = source("components/contracts-payments/PaymentsWorkspace.tsx");
    const settlements = source("components/contracts-payments/SettlementsWorkspace.tsx");
    const css = source("app/operations/orca-page-contract-v1.css");

    for (const workspace of [invoices, payments, settlements]) {
      expect(workspace).toContain("OperationsTableToolbar");
      expect(workspace).toContain("OperationsRowActions");
      expect(workspace).toContain("OperationsRowAction");
      expect(workspace).toContain("orca-contracts-data-table");
    }

    expect(css).toContain(".orca-operations-table-toolbar");
    expect(css).toContain(".orca-operations-row-action.is-unavailable");
    expect(css).toContain(".orca-contracts-data-table .orca-actions-column");
  });

  it("keeps all three invoice actions visible and disables unavailable actions instead of removing them", () => {
    const invoices = source("components/contracts-payments/InvoicesWorkspace.tsx");

    expect(invoices).toContain("MANUALLY_COLLECTIBLE_STATUSES");
    expect(invoices).toContain("available={canRecordPayment}");
    expect(invoices).toContain("available={canPayNextInstallment}");
    expect(invoices).toContain("L('تسجيل سداد', 'Record payment')");
    expect(invoices).toContain("L('دفع القسط التالي', 'Pay next installment')");
    expect(invoices).toContain("L('تحميل PDF', 'Download PDF')");
    expect(invoices).not.toContain("invoice.status !== 'paid' && (");
  });

  it("uses shared KPI cards in payments and reconciliation rather than local card systems", () => {
    const payments = source("components/contracts-payments/PaymentsWorkspace.tsx");
    const reconciliation = source("components/contracts-payments/ReconciliationWorkspace.tsx");

    expect(payments).toContain("OperationsKpiGrid");
    expect(payments).toContain("OperationsMetricCard");
    expect(payments).not.toContain("from '@/components/ui/orca-components'");
    expect(reconciliation).toContain("OperationsKpiGrid");
    expect(reconciliation).toContain("OperationsMetricCard");
    expect(reconciliation).toContain("OperationsEmptyState");
  });

  it("uses DD/MM/YYYY display dates inside contracts and payments workspaces", () => {
    const display = source("components/contracts-payments/workspace-display.ts");
    const center = source("components/contracts-payments/ContractsPaymentsCenter.tsx");
    const sales = source("components/sales/SalesContractsPanel.tsx");

    expect(display).toContain("return `${isoDate[3]}/${isoDate[2]}/${isoDate[1]}`");
    expect(center).toContain("return `${isoDate[3]}/${isoDate[2]}/${isoDate[1]}`");
    expect(sales).toContain("return `${isoDate[3]}/${isoDate[2]}/${isoDate[1]}`");
  });
});
