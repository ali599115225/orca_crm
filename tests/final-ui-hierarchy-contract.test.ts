
import { describe, expect, it } from "vitest";
import fs from "node:fs";

const source = (path: string) => fs.readFileSync(path, "utf8");

describe("final UI hierarchy contract", () => {
  it("applies the property workspace contract to the mortgage calculator", () => {
    const calculator = source("components/views/CalculatorView.tsx");
    expect(calculator).toContain("orca-calculator-final");
    expect(calculator).toContain("workspace");
    expect(calculator).toContain("orca-workspace-metric");
    expect(calculator).toContain("orca-workspace-panel");
  });

  it("removes sticky overlap from Settings navigation", () => {
    const settings = source("components/views/SettingsView.tsx");
    expect(settings).toContain("orca-settings-nav-shell");
    expect(settings).not.toContain("sticky top-0");
  });

  it("uses the unified Settings tab contract", () => {
    const navigation = source("components/settings/SettingsNavigation.tsx");
    expect(navigation).toContain("orca-settings-tabs");
    expect(navigation).toContain("orca-settings-tabs-track");
    expect(navigation).toContain("orca-settings-tab");
  });

  it("applies unified hierarchy to every Settings surface", () => {
    for (const path of [
      "components/settings/SettingsStaff.tsx",
      "components/settings/SettingsBilling.tsx",
      "components/settings/SettingsAIProviders.tsx",
      "components/settings/SettingsIntegrationsHub.tsx",
      "components/settings/AdvertisingPlatformIntegrations.tsx",
      "components/settings/SettingsCompliance.tsx",
    ]) {
      expect(source(path)).toContain("orca-settings-");
    }
  });

  it("keeps operational pages inside their final identity scopes", () => {
    expect(source("components/marketing/MarketingPerformanceWorkspace.tsx"))
      .toContain("orca-marketing-final");
    expect(source("components/marketing/CampaignManagementWorkspace.tsx"))
      .toContain("orca-campaigns-final");
    expect(source("components/views/SalesView.tsx"))
      .toContain("orca-sales-final");
  });

  it("defines fixed hierarchy and sizing rules centrally", () => {
    const css = source("app/globals.css");
    expect(css).toContain("ORCA FINAL UI HIERARCHY CONTRACT");
    expect(css).toContain(".orca-settings-card");
    expect(css).toContain("min-height: 44px !important");
  });
});
