import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relativePath: string) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

describe("ORCA shared Operations page contract foundation", () => {
  it("loads the shared contract once from the Operations layout", () => {
    const layout = read("app/operations/layout.tsx");
    expect(layout).toContain("import './orca-page-contract-v1.css';");
  });

  it("defines the shared visual API and primitives required by governance", () => {
    const visual = read("features/operations/visual.ts");

    for (const token of [
      "hero",
      "metrics",
      "metricCard",
      "panel",
      "tabs",
      "activeTab",
      "emptyState",
      "dialogOverlay",
      "primaryButton",
      "secondaryButton",
      "iconButton",
    ]) {
      expect(visual).toContain(`${token}:`);
    }

    for (const file of [
      "OperationsPageHeader.tsx",
      "OperationsKpiGrid.tsx",
      "OperationsPanel.tsx",
      "OperationsTabs.tsx",
      "OperationsEmptyState.tsx",
      "OperationsDialog.tsx",
      "OperationsDataRow.tsx",
    ]) {
      expect(
        fs.existsSync(path.join(root, "components/operations", file)),
      ).toBe(true);
    }
  });

  it("makes Dashboard consume the same shared contract instead of a private header/button contract", () => {
    const header = read(
      "features/dashboard/components/DashboardHeader.tsx",
    );
    const visual = read("features/dashboard/visual.ts");

    expect(header).toContain("OperationsPageHeader");
    expect(header).toContain("operationsVisual.primaryButton");
    expect(header).toContain("operationsVisual.secondaryButton");
    expect(header).toContain("operationsVisual.iconButton");

    expect(visual).toContain(
      'import { operationsVisual } from "@/features/operations/visual";',
    );
    expect(visual).toContain("kpiGrid: operationsVisual.metrics");
    expect(visual).toContain("metricCard: operationsVisual.linkedMetricCard");
  });

  it("routes legacy workspace PageHeader users through OperationsPageHeader", () => {
    const pageHeader = read("components/ui/PageHeader.tsx");
    expect(pageHeader).toContain("OperationsPageHeader");
    expect(pageHeader).toContain("if (workspace)");
  });

  it("moves the rental/contracts shell onto the shared hero, metrics, panel, and tabs", () => {
    const rental = read(
      "components/contracts-payments/ContractsPaymentsShell.tsx",
    );

    expect(rental).toContain("OperationsPageHeader");
    expect(rental).toContain("OperationsKpiGrid");
    expect(rental).toContain("OperationsPanel");
    expect(rental).toContain("OperationsTabs");
    expect(rental).not.toContain(
      "pointer-events-none absolute inset-x-0 top-0 h-14",
    );
  });

  it("centrally normalizes existing workspace pages without per-page CSS patches", () => {
    const css = read("app/operations/orca-page-contract-v1.css");

    for (const selector of [
      ".orca-v1-shell .orca-workspace-hero",
      ".orca-v1-shell .orca-workspace-metrics",
      ".orca-v1-shell .orca-workspace-metric",
      ".orca-v1-shell .orca-workspace-panel",
      ".orca-v1-shell .orca-workspace-tabs",
      ".orca-operations-dialog-overlay",
    ]) {
      expect(css).toContain(selector);
    }
  });

  it("anchors every visible Operations destination to the shared contract family", () => {
    const implementationFiles = [
      "features/dashboard/components/DashboardHeader.tsx",
      "components/views/AgentManagementView.tsx",
      "components/views/CalculatorView.tsx",
      "components/marketing/CampaignManagementWorkspace.tsx",
      "components/views/DocumentsView.tsx",
      "app/operations/email/EmailClient.tsx",
      "components/views/HelpdeskView.tsx",
      "features/leads/components/LeadsWorkspace.tsx",
      "components/marketing/MarketingPerformanceWorkspace.tsx",
      "components/real-estate/offers/OffersWorkspace.tsx",
      "components/views/ProjectsView.tsx",
      "components/real-estate/properties/PropertiesWorkspace.tsx",
      "components/contracts-payments/ContractsPaymentsShell.tsx",
      "components/revenue-integrity/RevenueIntegrityView.tsx",
      "components/views/SalesView.tsx",
      "components/views/SettingsView.tsx",
      "components/views/TasksView.tsx",
      "components/real-estate/tours/ToursWorkspace.tsx",
      "components/views/WhatsAppView.tsx",
    ];

    const acceptedAnchors = [
      "OperationsPageHeader",
      "orca-workspace-hero",
      "<PageHeader",
      "leadVisual.workspaceHero",
      "revenueVisual.workspaceHero",
      "operationsVisual.",
    ];

    expect(implementationFiles).toHaveLength(19);

    for (const relativePath of implementationFiles) {
      const source = read(relativePath);
      expect(
        acceptedAnchors.some((anchor) => source.includes(anchor)),
        `${relativePath} is not anchored to the shared Operations contract family`,
      ).toBe(true);
    }
  });
});