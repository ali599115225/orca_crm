import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("agents and documents visual identity contract", () => {
  const agents = read("components/views/AgentManagementView.tsx");
  const documents = read("components/views/DocumentsView.tsx");
  const documentsRoute = read("app/api/v1/documents/route.ts");
  const documentRoute = read("app/api/v1/documents/[id]/route.ts");
  const access = read("lib/documents/access.ts");
  const operationsCss = read("app/operations/orca-page-contract-v1.css");

  it("aligns agents by consuming the canonical shared Operations primitives", () => {
    for (const token of [
      "OperationsPageHeader",
      "OperationsKpiGrid",
      "OperationsPanel",
      "OperationsEmptyState",
      "OperationsMasterList",
      "OperationsMasterRow",
      "operationsVisual.page",
    ]) {
      expect(agents).toContain(token);
    }

    expect(agents).not.toContain('<header className="orca-workspace-hero"');
    expect(agents).not.toContain('<div className="orca-workspace-metrics"');
    expect(agents).not.toContain('className="orca-workspace-panel');
    expect(agents).not.toContain("linear-gradient");
  });

  it("removes tenant-marketing language from the single-company agents UI", () => {
    expect(agents).not.toContain("عزل المنشأة");
    expect(agents).not.toContain("معزول حسب المنشأة");
    expect(agents).not.toContain("Tenant isolation");
    expect(agents).not.toContain("Tenant isolated");
    expect(agents).toContain("مزود الذكاء الاصطناعي غير مهيأ");
  });

  it("keeps the agents master pane left and detail pane right", () => {
    const agentMaster = agents.indexOf("data-operational-list-card");
    const agentDetail = agents.indexOf("data-operational-detail-card");

    expect(agents).toContain('dir="ltr"');
    expect(agentMaster).toBeGreaterThan(0);
    expect(agentDetail).toBeGreaterThan(agentMaster);
    expect(agents).toContain("OperationsMasterList");
    expect(agents).toContain("OperationsMasterRow");
  });

  it("keeps fixed agents workspace heights and hidden internal scrolling", () => {
    expect(agents).toContain('lg:h-[500px]');
    expect(agents).toContain("[scrollbar-width:none]");
    expect(agents).toContain("[&::-webkit-scrollbar]:hidden");
    expect(agents).toContain("operationsVisual.iconButton");
  });

  it("aligns documents with the canonical shared Operations workspace contract", () => {
    for (const token of [
      "OperationsPageHeader",
      "OperationsKpiGrid",
      "OperationsMetricCard",
      "OperationsExecutiveGrid",
      "OperationsPanel",
      "OperationsDialog",
      "operationsVisual.page",
    ]) {
      expect(documents).toContain(token);
    }
    expect(documents).toContain("data-operational-list-card");
    expect(documents).toContain("data-operational-detail-card");
    expect(documents).not.toContain('import PageHeader');
    expect(documents).not.toContain('from "@/components/layout/PageHeader"');
    expect(documents).not.toContain("SmartCard");
    expect(documents).not.toContain("linear-gradient");
  });

  it("removes tenant-marketing language from the single-company documents UI", () => {
    expect(documents).not.toContain("عزل المنشأة");
    expect(documents).not.toContain("عزل كامل حسب المنشأة");
    expect(documents).not.toContain("Tenant isolation");
    expect(documents).not.toContain("Tenant isolated");
    expect(documents).toContain("مستودع المستندات");
  });

  it("keeps documents master left and detail right with fixed workspace sizing", () => {
    const master = documents.indexOf("data-operational-list-card");
    const detail = documents.indexOf("data-operational-detail-card");

    expect(documents).toContain('dir="ltr"');
    expect(master).toBeGreaterThan(0);
    expect(detail).toBeGreaterThan(master);
    expect(documents).toContain('lg:h-[520px]');
    expect(documents).toContain("overflow-y-auto");
    expect(operationsCss).toContain(".orca-v1-shell .orca-operations-page *");
    expect(operationsCss).toContain("scrollbar-width: none");
    expect(operationsCss).toContain("min-height: 44px");
  });

  it("uses the document access boundary for all document operations", () => {
    expect(documentsRoute).toContain("runWithDocumentAccess");
    expect(documentRoute).toContain("runWithDocumentAccess");
    expect(documentsRoute).not.toContain("runWithDatabaseSession");
    expect(documentRoute).not.toContain("runWithDatabaseSession");
    expect(access).toContain("runWithTenantContext");
    expect(access).toContain("tenantId");
  });

  it("keeps document reads and mutations explicitly tenant scoped", () => {
    expect(documentsRoute).toContain(
      "where: { tenantId: access.tenantId }",
    );
    expect(documentsRoute).toContain("tenantId: access.tenantId");
    expect(documentRoute).toContain(
      "where: { id, tenantId: access.tenantId }",
    );
  });
});
