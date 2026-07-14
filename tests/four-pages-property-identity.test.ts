import { describe, expect, it } from "vitest";
import fs from "node:fs";

const marketingView = fs.readFileSync(
  "components/views/MarketingView.tsx",
  "utf8",
);
const marketing = fs.readFileSync(
  "components/marketing/MarketingPerformanceWorkspace.tsx",
  "utf8",
);
const campaigns = fs.readFileSync(
  "components/marketing/CampaignManagementWorkspace.tsx",
  "utf8",
);
const sales = fs.readFileSync(
  "components/views/SalesView.tsx",
  "utf8",
);
const settings = fs.readFileSync(
  "components/views/SettingsView.tsx",
  "utf8",
);
const pageHeader = fs.readFileSync(
  "components/ui/PageHeader.tsx",
  "utf8",
);
const layout = fs.readFileSync(
  "components/ui/LayoutContainer.tsx",
  "utf8",
);

describe("four pages use the property workspace identity", () => {
  it("removes campaign management from the marketing page", () => {
    expect(marketingView).not.toContain("CampaignManagementWorkspace");
    expect(marketingView).not.toContain("useState");
    expect(marketingView).toContain(
      '<MarketingPerformanceWorkspace mode="marketing" />',
    );
  });

  it("uses the property workspace shell on marketing sales and campaigns", () => {
    for (const source of [marketing, campaigns, sales]) {
      expect(source).toContain("orca-container");
      expect(source).toContain("pb-10");
      expect(source).toContain("workspace");
    }
  });

  it("uses property metrics and panels", () => {
    expect(marketing).toContain("orca-workspace-metric");
    expect(marketing).toContain("orca-workspace-panel");
    expect(campaigns).toContain("orca-workspace-metrics");
    expect(campaigns).toContain("orca-workspace-panel");
    expect(sales).toContain("orca-workspace-metric");
    expect(sales).toContain("orca-workspace-panel");
  });

  it("uses the property hero and panel identity in settings", () => {
    expect(settings).toContain("orca-workspace-hero");
    expect(settings).toContain("orca-workspace-panel");
    expect(settings).toContain("orca-container pb-10");
  });

  it("keeps shared components backward compatible", () => {
    expect(pageHeader).toContain("workspace = false");
    expect(layout).toContain("workspace = false");
  });

  it("routes campaign connection setup to advertising settings", () => {
    expect(campaigns).toContain(
      '"/operations/settings?tab=advertising"',
    );
  });
});

