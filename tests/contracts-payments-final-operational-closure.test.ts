import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("contracts and payments final operational closure", () => {
  it("wires bank reconciliation to the real tenant-scoped upload endpoint", () => {
    const workspace = source(
      "components/contracts-payments/ReconciliationWorkspace.tsx",
    );
    const route = source("app/api/v1/reconciliation/upload/route.ts");

    expect(workspace).toContain('fetch("/api/v1/reconciliation/upload"');
    expect(workspace).toContain('formData.append("mode", "bank")');
    expect(workspace).toContain('accept=".csv,text/csv"');
    expect(workspace).toContain("data-reconciliation-workspace");
    expect(route).toContain("const tenantId = session.tenantId");
    expect(route).toContain("reconcileBankStatement(");
  });

  it("loads real settlement read models instead of placeholder state", () => {
    const center = source(
      "components/contracts-payments/ContractsPaymentsCenter.tsx",
    );
    const workspace = source(
      "components/contracts-payments/SettlementsWorkspace.tsx",
    );
    const route = source("app/api/v1/settlements/route.ts");

    expect(center).toContain("fetch('/api/v1/settlements/')");
    expect(center).toContain("<SettlementsWorkspace");
    expect(workspace).toContain("data-settlements-workspace");
    expect(route).toContain("tenantId: session.tenantId");
    expect(route).toContain('method: "EARLY_SETTLEMENT"');
    expect(route).toContain("financialRef: { not: null }");
    expect(center).not.toContain("نظام التسويات المالية قيد التطوير");
    expect(center).not.toContain("نظام المطابقة البنكية قيد التطوير");
  });

  it("shows tax composition and a completed financial-close action", () => {
    const workspace = source("components/sales/SalesContractWorkspace.tsx");

    expect(workspace).toContain('L("صافي العقد", "Contract subtotal")');
    expect(workspace).toContain('L("ضريبة القيمة المضافة", "VAT")');
    expect(workspace).toContain('L("إجمالي الفاتورة", "Invoice total")');
    expect(workspace).toContain(
      'L("اكتمل الإغلاق المالي", "Financial close completed")',
    );
  });
});
