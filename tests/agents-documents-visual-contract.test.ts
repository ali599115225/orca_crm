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

  it("aligns agents with the shared operations workspace contract", () => {
    expect(agents).toContain("orca-workspace-hero");
    expect(agents).toContain("orca-workspace-metrics");
    expect(agents).toContain("orca-workspace-metric");
    expect(agents).toContain("orca-workspace-panel");
    expect(agents).toContain("data-operational-list-card");
    expect(agents).toContain("data-operational-detail-card");
    expect(agents).toContain("nc-btn nc-btn-ghost");
    expect(agents).toContain("nc-btn-primary");
    expect(agents).not.toContain("PageHeader");
    expect(agents).not.toContain("SmartCard");
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
  });

  it("keeps fixed agents workspace heights and hidden internal scrolling", () => {
    expect(agents).toContain('lg:h-[520px]');
    expect(agents).toContain("[scrollbar-width:none]");
    expect(agents).toContain("[&::-webkit-scrollbar]:hidden");
    expect(agents).toContain('min-h-[44px]');
  });

  it("aligns documents with the shared tasks workspace contract", () => {
    expect(documents).toContain("orca-workspace-hero");
    expect(documents).toContain("orca-workspace-metrics");
    expect(documents).toContain("orca-workspace-metric");
    expect(documents).toContain("orca-workspace-panel");
    expect(documents).toContain("data-operational-list-card");
    expect(documents).toContain("data-operational-detail-card");
    expect(documents).toContain("nc-btn nc-btn-ghost");
    expect(documents).toContain("nc-btn-primary");
    expect(documents).not.toContain("PageHeader");
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
    expect(documents).toContain("[scrollbar-width:none]");
    expect(documents).toContain("[&::-webkit-scrollbar]:hidden");
    expect(documents).toContain('min-h-[44px]');
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
