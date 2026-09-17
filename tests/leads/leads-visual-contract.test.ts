import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relative: string) =>
  fs.readFileSync(path.join(root, relative), "utf8");

const visualTargets = [
  "features/leads/components/LeadsWorkspace.tsx",
  "features/leads/components/LeadDetailClient.tsx",
  "features/leads/components/LeadFormDialog.tsx",
  "components/leads/dialogs/CreateOpportunityDialog.tsx",
  "components/leads/dialogs/CreateOfferDialog.tsx",
  "components/leads/dialogs/ScheduleTourDialog.tsx",
  "components/leads/panels/LeadOpportunitiesPanel.tsx",
  "components/leads/panels/LeadOffersPanel.tsx",
  "components/leads/panels/LeadToursPanel.tsx",
];

describe("Leads visual contract", () => {
  it("anchors Leads to the canonical Operations contract", () => {
    const visual = read("features/leads/visual.ts");
    const workspace = read("features/leads/components/LeadsWorkspace.tsx");
    const detail = read("features/leads/components/LeadDetailClient.tsx");

    expect(visual).toContain(
      'import { operationsVisual } from "@/features/operations/visual";',
    );
    expect(visual).toContain("page: operationsVisual.page");
    expect(visual).toContain("workspaceHero: operationsVisual.hero");
    expect(visual).toContain("metricCard: operationsVisual.metricCard");
    expect(visual).toContain("modalOverlay: operationsVisual.dialogOverlay");

    for (const source of [workspace, detail]) {
      expect(source).toContain("OperationsPageHeader");
      expect(source).toContain("OperationsMetricCard");
      expect(source).toContain("operationsVisual");
    }
  });

  it("removes hard-coded legacy gold and navy styling from Leads surfaces", () => {
    for (const target of visualTargets) {
      const source = read(target);
      expect(source, target).not.toContain("#D9AD55");
      expect(source, target).not.toContain("#EDC66D");
      expect(source, target).not.toContain("#0A1F3A");
      expect(source, target).not.toContain("#07182D");
    }
  });

  it("keeps gold interaction semantics centralized in the shared Operations contract", () => {
    const operationsVisual = read("features/operations/visual.ts");
    const css = read("app/operations/orca-page-contract-v1.css");

    expect(operationsVisual).toContain(
      'primaryButton: "orca-operations-primary-button"',
    );
    expect(operationsVisual).toContain(
      'activeTab: "orca-operations-tab is-active"',
    );
    expect(css).toContain("background: var(--nc-accent);");
    expect(css).toContain("border-color: var(--nc-accent-border);");
    expect(css).toContain("background: var(--nc-accent-soft);");
  });

  it("gives KPI and detail cards a consistent shared icon hierarchy", () => {
    const workspace = read("features/leads/components/LeadsWorkspace.tsx");
    const detail = read("features/leads/components/LeadDetailClient.tsx");

    expect(workspace).toContain("UsersRound");
    expect(workspace).toContain("UserPlus");
    expect(workspace).toContain("BadgeCheck");
    expect(workspace).toContain("TrendingUp");
    expect(workspace).toContain("OperationsMetricCard");
    expect(detail).toContain("OperationsMetricCard");
    expect(detail).toContain("operationsVisual.softPanel");
  });

  it("matches Dashboard hover behavior through shared master rows", () => {
    const workspace = read("features/leads/components/LeadsWorkspace.tsx");
    const css = read("app/operations/orca-page-contract-v1.css");

    expect(workspace).toContain("OperationsMasterRow");
    expect(css).toContain(".orca-v1-shell .orca-operations-master-row:hover");
    expect(css).toContain("border-color: var(--nc-accent-border);");
    expect(workspace).not.toContain("hover:!border-[var(--nc-op-blue-border)]");
  });

  it("keeps non-semantic icon tiles neutral instead of operational blue", () => {
    const visual = read("features/leads/visual.ts");
    const css = read("app/operations/orca-page-contract-v1.css");

    expect(visual).toContain("iconTile: operationsVisual.iconTile");
    expect(css).toContain(".orca-operations-icon-tile");
    expect(css).toContain("background: var(--nc-surface-soft);");
    expect(css).toContain("color: var(--nc-text-secondary);");
  });

  it("uses semantic status colors instead of one gold badge", () => {
    const visual = read("features/leads/visual.ts");
    expect(visual).toContain("border-sky-500/25");
    expect(visual).toContain("border-emerald-500/25");
    expect(visual).toContain("border-red-500/25");
    expect(visual).toContain("border-violet-500/25");

    const workspace = read("features/leads/components/LeadsWorkspace.tsx");
    const detail = read("features/leads/components/LeadDetailClient.tsx");
    expect(workspace).toContain("leadStatusTone(lead.status)");
    expect(detail).toContain("leadStatusTone(lead.status)");
  });

  it("renders neutral dropdown selection with a check marker", () => {
    const select = read("components/settings/SettingsSelect.tsx");
    expect(select).toContain("<Check");
    expect(select).toContain("bg-[var(--nc-surface-strong)]");
    expect(select).not.toContain(
      'option.value === value\n                      ? "bg-[var(--nc-accent-soft)]',
    );
    expect(select).toContain("preferredMinimum");
  });
});
