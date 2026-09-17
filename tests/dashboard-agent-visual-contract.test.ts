import { describe, expect, it } from "vitest";
import fs from "node:fs";

const source = (path: string) => fs.readFileSync(path, "utf8");

describe("dashboard executive model and agent plan", () => {
  it("keeps exactly the nine primary dashboard cards", () => {
    const header = source("features/dashboard/components/DashboardHeader.tsx");
    const metric = source("features/dashboard/components/DashboardMetricCard.tsx");
    const spine = source("features/dashboard/components/DealSpineSnapshot.tsx");
    const center = source("features/dashboard/components/AgentDecisionCenter.tsx");
    const operations = source("features/dashboard/components/DailyOperationsCenter.tsx");

    expect(header).toContain('data-dashboard-card="title"');
    expect(metric).toContain('data-dashboard-card="kpi"');
    expect(spine).toContain('data-dashboard-card="pipeline"');
    expect(center).toContain('data-dashboard-card="decision"');
    expect(center).toContain('data-dashboard-card="agents"');
    expect(operations).toContain('data-dashboard-card="operations"');
  });

  it("preserves the title card, contract action, refresh and shared identity", () => {
    const visual = source("features/dashboard/visual.ts");
    const header = source("features/dashboard/components/DashboardHeader.tsx");
    const kpis = source("features/dashboard/components/DashboardKpiGrid.tsx");

    expect(visual).toContain('page: "orca-dashboard-v1"');
    expect(visual).toContain('import { operationsVisual }');
    expect(header).toContain("<OperationsPageHeader");
    expect(header).toContain("copy.issueContract");
    expect(header).toContain("copy.askOrca");
    expect(header).toContain("className={operationsVisual.primaryButton}");
    expect(header).toContain("className={operationsVisual.secondaryButton}");
    expect(header).toContain("className={operationsVisual.iconButton}");
    expect(header).toContain("copy.refreshData");
    expect(kpis).toContain("className={dashboardVisual.kpiGrid}");
  });

  it("uses the current CSS-governed executive layout in two rows", () => {
    const center = source(
      "features/dashboard/components/AgentDecisionCenter.tsx",
    );
    const dashboardCss = source(
      "app/operations/dashboard/orca-dashboard-v1.css",
    );

    expect(center).toContain('className="orca-dashboard-v1-executive-grid"');
    expect(center).toContain('className="orca-dashboard-v1-lower-grid"');
    expect(center).toContain("orca-dashboard-v1-pipeline-slot");
    expect(center).toContain("orca-dashboard-v1-operations-slot");
    expect(center).toContain("orca-dashboard-v1-decision");
    expect(center).toContain("orca-dashboard-v1-agents");
    expect(center).toContain("<DealSpineSnapshot");
    expect(center).toContain("<DailyOperationsCenter");
    expect(dashboardCss).toContain(".orca-dashboard-v1-executive-grid,");
    expect(dashboardCss).toContain(".orca-dashboard-v1-lower-grid {");
    expect(dashboardCss).toContain(
      "grid-template-columns: minmax(0, 2.05fr) minmax(270px, 0.95fr);",
    );
  });

  it("renders the deal path as one connected flow rather than five cards", () => {
    const spine = source(
      "features/dashboard/components/DealSpineSnapshot.tsx",
    );
    const dashboardCss = source(
      "app/operations/dashboard/orca-dashboard-v1.css",
    );

    expect(spine).toContain("data-dashboard-connected-pipeline");
    expect(spine).toContain("orca-dashboard-v1-stage-track");
    expect(spine).toContain("orca-dashboard-v1-stage-line");
    expect(spine).toContain("data-dashboard-pipeline-summary");
    expect(dashboardCss).toContain(".orca-dashboard-v1-stage-track");
    expect(dashboardCss).toContain(
      "grid-template-columns: repeat(5, minmax(0, 1fr));",
    );
    expect(dashboardCss).toContain(".orca-dashboard-v1-stage-line");
    expect(spine).not.toContain("grid grid-cols-3 divide-x");
    expect(spine).not.toContain("dashboardVisual.stageCard");
    expect(spine).not.toContain("progressBar");
  });

  it("uses the five approved agents with Sentinel as coordinator", () => {
    const center = source(
      "features/dashboard/components/AgentDecisionCenter.tsx",
    ).toUpperCase();

    for (const agent of [
      "MANSOUR",
      "SAHER",
      "SANAD",
      "BASEER",
      "KHABEER",
      "SENTINEL",
    ]) {
      expect(center).toContain(agent);
    }
  });

  it("turns Ask ORCA into a free conversation field", () => {
    const center = source(
      "features/dashboard/components/AgentDecisionCenter.tsx",
    );

    expect(center).toContain("data-orca-assistant-modal");
    expect(center).not.toContain("data-orca-assistant-drawer");
    expect(center).toContain("createPortal");
    expect(center).toContain("document.body");
    expect(center).toContain("orca-dialog-overlay");
    expect(center).toContain('className="orca-dialog max-w-2xl');
    expect(center).toContain("orca-dialog-header");
    expect(center).toContain("orca-dialog-body");
    expect(center).toContain("orca-dialog-close");
    expect(center).not.toContain("absolute inset-y-0 flex w-full max-w-[460px]");
    expect(center).toContain("<textarea");
    expect(center).toContain("assistantInputPlaceholder");
    expect(center).toContain("handleDraftKeyDown");
    expect(center).toContain('event.key === "Enter"');
    expect(center).toContain("!event.shiftKey");
    expect(center).toContain("sendMessage");
  });

  it("keeps all summaries grounded in current dashboard and agent data", () => {
    const center = source(
      "features/dashboard/components/AgentDecisionCenter.tsx",
    );
    const copy = source("features/dashboard/copy/dashboardCopy.ts");

    expect(center).toContain("/api/v1/agents");
    expect(center).toContain("model.operations.tasks");
    expect(center).toContain("model.operations.whatsapp");
    expect(center).toContain("model.pipeline");
    expect(center).toContain("model.kpis");
    expect(copy).toContain("ولا تمثل تنبؤًا آليًا");
    expect(copy).not.toContain("قريبًا");
  });

  it("uses the current CSS-governed operational scrolling contract", () => {
    const center = source(
      "features/dashboard/components/AgentDecisionCenter.tsx",
    );
    const operations = source(
      "features/dashboard/components/DailyOperationsCenter.tsx",
    );
    const dashboardCss = source(
      "app/operations/dashboard/orca-dashboard-v1.css",
    );

    expect(center).toContain("orca-dashboard-v1-agents");
    expect(operations).toContain("orca-dashboard-v1-ops-panel");
    expect(dashboardCss).toContain(".orca-dashboard-v1-ops-panel");
    expect(dashboardCss).toContain("max-height: 260px");
    expect(dashboardCss).toContain("overflow-y: auto");
    expect(dashboardCss).toContain(".orca-dashboard-v1-hide-scrollbar");
    expect(dashboardCss).toContain(
      ".orca-dashboard-v1-hide-scrollbar::-webkit-scrollbar",
    );
  });
});
