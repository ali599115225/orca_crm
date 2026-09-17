import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relativePath: string) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

describe("ORCA Operations structural reconciliation", () => {
  it("centralizes hero refresh and legacy dialog behavior", () => {
    const css = read("app/operations/orca-page-contract-v1.css");

    expect(css).toContain("STRUCTURAL RECONCILIATION V1");
    expect(css).toContain(
      ".orca-v1-shell .orca-workspace-hero button:has(svg.lucide-refresh-cw)",
    );
    expect(css).toContain(".orca-dialog-overlay");
    expect(css).toContain(".orca-dialog-header");
    expect(css).toContain(".orca-dialog-body");
    expect(css).toContain(".orca-dialog-footer");
    expect(css).toContain(".orca-dialog-close");
  });

  it("makes Projects consume shared header, KPI, and dialog primitives", () => {
    const source = read("components/views/ProjectsView.tsx");

    expect(source).toContain("OperationsPageHeader");
    expect(source).toContain("OperationsKpiGrid");
    expect(source).toContain("OperationsDialog");
    expect(source).toContain("className={operationsVisual.iconButton}");
    expect(source).toContain('form="project-create-form"');
    expect(source).not.toContain('{showCreateProject && (');
    expect(source).not.toContain(
      'className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"',
    );
  });

  it("moves campaign creation out of the page flow and into the shared dialog", () => {
    const source = read(
      "components/marketing/CampaignManagementWorkspace.tsx",
    );

    expect(source).toContain("OperationsDialog");
    expect(source).toContain('form="campaign-create-form"');
    expect(source).toContain("className={operationsVisual.primaryButton}");
    expect(source).not.toContain("{formOpen ? (");
    expect(source).not.toContain(
      '<SmartCard className="orca-workspace-panel p-5">',
    );
  });

  it("removes duplicated Leads and Revenue workspace/modal tokens", () => {
    const leads = read("features/leads/visual.ts");
    const revenue = read("components/revenue-integrity/visual.ts");

    expect(leads).toContain(
      'import { operationsVisual } from "@/features/operations/visual";',
    );
    expect(leads).toContain("workspaceHero: operationsVisual.hero");
    expect(leads).toContain("modalOverlay: operationsVisual.dialogOverlay");
    expect(leads).toContain("modal: operationsVisual.dialog");
    expect(leads).toContain("emptyState: operationsVisual.emptyState");

    expect(revenue).toContain(
      'import { operationsVisual } from "@/features/operations/visual";',
    );
    expect(revenue).toContain("workspaceHero: operationsVisual.hero");
    expect(revenue).toContain("modalOverlay: operationsVisual.dialogOverlay");
    expect(revenue).toContain(
      "modal: `${operationsVisual.dialog} max-w-md p-5`",
    );
  });

  it("moves marketing surfaces onto the shared Operations contract", () => {
    const source = read(
      "components/marketing/MarketingPerformanceWorkspace.tsx",
    );

    expect(source).toContain(
      'import { operationsVisual } from "@/features/operations/visual";',
    );
    expect(source).toContain("OperationsPageHeader");
    expect(source).toContain("OperationsKpiGrid");
    expect(source).toContain("OperationsMetricCard");
    expect(source).toContain("OperationsPanel");
    expect(source).toContain("operationsVisual.primaryButton");
  });

  it("preserves real Projects mutations instead of replacing them with UI-only behavior", () => {
    const source = read("components/views/ProjectsView.tsx");

    expect(source).toContain("createProjectAction(formData)");
    expect(source).toContain("toggleUnitStatusAction(");
    expect(source).toContain("getProjectUnitsAction(String(selectedProjectId))");
  });

  it("keeps campaign creation on the real server action", () => {
    const source = read(
      "components/marketing/CampaignManagementWorkspace.tsx",
    );

    expect(source).toContain("createMarketingCampaignAction");
    expect(source).toContain("onSubmit={createCampaign}");
  });
});
