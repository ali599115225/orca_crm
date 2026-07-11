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
  it("uses one shared visual token contract", () => {
    const visual = read("features/leads/visual.ts");
    expect(visual).toContain("export const leadVisual");
    expect(visual).toContain("primaryButton");
    expect(visual).toContain("secondaryButton");
    expect(visual).toContain("modalOverlay");
    expect(visual).toContain("iconTile");
    expect(visual).toContain("metricCard");
    expect(visual).toContain("metricIconTile");
    expect(visual).toContain("interactiveRow");

    for (const target of visualTargets) {
      expect(read(target), target).toContain("leadVisual");
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

  it("keeps gold limited to shared primary, active, and focus states", () => {
    const visual = read("features/leads/visual.ts");
    expect(visual).toContain("bg-[var(--nc-accent)]");
    expect(visual).toContain("bg-[var(--nc-accent-soft)]");
    expect(visual).toContain("focus-visible:ring-[var(--nc-accent-soft)]");
  });

  it("gives KPI and detail cards a consistent icon hierarchy", () => {
    const workspace = read("features/leads/components/LeadsWorkspace.tsx");
    const detail = read("features/leads/components/LeadDetailClient.tsx");

    expect(workspace).toContain("UsersRound");
    expect(workspace).toContain("UserPlus");
    expect(workspace).toContain("BadgeCheck");
    expect(workspace).toContain("TrendingUp");
    expect(workspace).toContain("leadVisual.metricCard");
    expect(workspace).toContain("leadVisual.metricIconTile");
    expect(detail).toContain("leadVisual.iconTile");
  });

  it("matches Dashboard gold hover behavior for KPI cards and lead rows", () => {
    const visual = read("features/leads/visual.ts");
    const workspace = read("features/leads/components/LeadsWorkspace.tsx");

    expect(visual).toContain("hover:border-[var(--nc-accent-border)]");
    expect(visual).toContain("hover:bg-[var(--nc-accent-soft)]");
    expect(visual).toContain("group-hover:text-[var(--nc-accent)]");
    expect(workspace).toContain("leadVisual.metricCard");
    expect(workspace).toContain("leadVisual.interactiveRow");
    expect(workspace).not.toContain("hover:!border-[var(--nc-op-blue-border)]");
  });

  it("keeps non-semantic icon tiles neutral instead of operational blue", () => {
    const visual = read("features/leads/visual.ts");
    const iconTileBlock = visual.slice(
      visual.indexOf("iconTile:"),
      visual.indexOf("metricIconTile:"),
    );

    expect(iconTileBlock).toContain("nc-glass-border");
    expect(iconTileBlock).toContain("nc-text-secondary");
    expect(iconTileBlock).not.toContain("nc-op-blue");
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
    expect(select).not.toContain('option.value === value\n                      ? "bg-[var(--nc-accent-soft)]');
    expect(select).toContain("preferredMinimum");
  });
});
