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

    expect(visual).toContain("orca-dashboard-final");
    expect(header).toContain("orca-workspace-hero");
    expect(header).toContain("copy.issueContract");
    expect(header).toContain("copy.askOrca");
    expect(header).toContain("className={dashboardVisual.headerPrimaryButton}");
    expect(header).toContain("className={dashboardVisual.headerSecondaryButton}");
    expect(header).toContain("className={dashboardVisual.headerGhostButton}");
    expect(header).toContain("copy.refreshData");
    expect(kpis).toContain("orca-workspace-metrics");
  });

  it("uses the approved 8/4 executive layout in two rows", () => {
    const center = source(
      "features/dashboard/components/AgentDecisionCenter.tsx",
    );

    expect(center).toContain("xl:grid-cols-12");
    expect(center.match(/xl:col-span-8/g)?.length).toBe(2);
    expect(center.match(/xl:col-span-4/g)?.length).toBe(2);
    expect(center).toContain("<DealSpineSnapshot");
    expect(center).toContain("<DailyOperationsCenter");
  });

  it("renders the deal path as one connected flow rather than five cards", () => {
    const spine = source(
      "features/dashboard/components/DealSpineSnapshot.tsx",
    );

    expect(spine).toContain("data-dashboard-connected-pipeline");
    expect(spine).toContain("grid grid-cols-5");
    expect(spine).toContain('left-[10%] right-[10%]');
    expect(spine).toContain("data-dashboard-pipeline-summary");
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

    expect(center).toContain("data-orca-assistant-drawer");
    expect(center).toContain("createPortal");
    expect(center).toContain("document.body");
    expect(center).toContain("z-[999]");
    expect(center).toContain("nc-btn-secondary");
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

  it("uses fixed-height operational panels with internal hidden scrolling", () => {
    const center = source(
      "features/dashboard/components/AgentDecisionCenter.tsx",
    );
    const operations = source(
      "features/dashboard/components/DailyOperationsCenter.tsx",
    );

    expect(center).toContain("max-h-[430px]");
    expect(center).toContain("[scrollbar-width:none]");
    expect(operations).toContain("max-h-[430px]");
    expect(operations).toContain("overflow-y-auto");
  });
});
