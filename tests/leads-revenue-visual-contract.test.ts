import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relative: string) =>
  fs.readFileSync(path.join(root, relative), "utf8");

describe("Leads and Revenue Integrity visual closure", () => {
  it("applies the Tasks workspace hierarchy to the leads list", () => {
    const workspace = read("features/leads/components/LeadsWorkspace.tsx");
    const visual = read("features/leads/visual.ts");

    expect(workspace).toContain("leadVisual.workspaceHero");
    expect(workspace).toContain("leadVisual.workspaceMetrics");
    expect(workspace).toContain("leadVisual.workspacePanel");
    expect(workspace).toContain("data-operational-list-card");
    expect(workspace).toContain('lg:h-[560px]');
    expect(workspace).toContain("[scrollbar-width:none]");
    expect(visual).toContain("orca-workspace-hero");
    expect(visual).toContain("orca-workspace-metrics");
    expect(visual).toContain("orca-workspace-panel");
  });

  it("keeps every lead detail tab inside one bounded workspace", () => {
    const detail = read("features/leads/components/LeadDetailClient.tsx");
    const visual = read("features/leads/visual.ts");

    expect(detail).toContain("leadVisual.detailHero");
    expect(detail).toContain("leadVisual.workspaceTabs");
    expect(detail).toContain('lg:h-[620px]');
    expect(detail).toContain("overflow-y-auto");
    expect(visual).toContain("min-h-[44px]");
  });

  it("keeps all lead dialogs under the shared bounded modal contract", () => {
    const visual = read("features/leads/visual.ts");
    const dialogs = [
      "features/leads/components/LeadFormDialog.tsx",
      "components/leads/dialogs/CreateOpportunityDialog.tsx",
      "components/leads/dialogs/CreateOfferDialog.tsx",
      "components/leads/dialogs/ScheduleTourDialog.tsx",
    ];

    expect(visual).toContain("z-[160]");
    expect(visual).toContain("max-h-[88vh]");
    expect(visual).toContain("[scrollbar-width:none]");

    for (const dialog of dialogs) {
      const source = read(dialog);
      expect(source, dialog).toContain("leadVisual.modalOverlay");
      expect(source, dialog).toContain("leadVisual.modal");
    }
  });

  it("applies the Tasks workspace hierarchy to Revenue Integrity", () => {
    const view = read("components/revenue-integrity/RevenueIntegrityView.tsx");
    const visual = read("components/revenue-integrity/visual.ts");

    expect(view).toContain("revenueVisual.workspaceHero");
    expect(view).toContain("revenueVisual.workspaceMetrics");
    expect(view).toContain("revenueVisual.workspaceTabs");
    expect(view).toContain("grid items-stretch gap-3");
    expect(view).not.toContain("self-start h-fit");
    expect(visual).toContain("orca-workspace-panel");
    expect(visual).toContain('lg:h-[560px]');
    expect(visual).toContain("min-h-[44px]");
  });

  it("does not alter operational action wiring", () => {
    const leads = read("features/leads/components/LeadsWorkspace.tsx");
    const detail = read("features/leads/components/LeadDetailClient.tsx");
    const revenue = read("components/revenue-integrity/RevenueIntegrityView.tsx");

    expect(leads).toContain("getLeadsAction");
    expect(leads).toContain("LeadFormDialog");
    expect(detail).toContain("updateLeadStatusAction");
    expect(detail).toContain("EngagementTabs");
    expect(revenue).toContain("runRevenueRadarAction");
    expect(revenue).toContain("approveRevenueSuggestionAction");
    expect(revenue).toContain("scoreAllIntelligenceAction");
  });
});
