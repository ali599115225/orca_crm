import { describe, expect, it } from "vitest";
import fs from "node:fs";

const navigation = fs.readFileSync(
  "components/settings/SettingsNavigation.tsx",
  "utf8",
);
const view = fs.readFileSync(
  "components/views/SettingsView.tsx",
  "utf8",
);
const hub = fs.readFileSync(
  "components/settings/SettingsIntegrationsHub.tsx",
  "utf8",
);
const advertising = fs.readFileSync(
  "components/settings/AdvertisingPlatformIntegrations.tsx",
  "utf8",
);
const button = fs.readFileSync(
  "components/settings/SettingsButton.tsx",
  "utf8",
);
const callback = fs.readFileSync(
  "app/api/integrations/tiktok/oauth/callback/route.ts",
  "utf8",
);

describe("settings advertising tab", () => {
  it("adds a dedicated advertising settings section", () => {
    expect(navigation).toContain('"advertising"');
    expect(navigation).toContain("الحملات الإعلانية");
    expect(view).toContain('activeSection === "advertising"');
  });

  it("removes advertising platforms from the generic integrations hub", () => {
    expect(hub).not.toContain("AdvertisingPlatformIntegrations");
  });

  it("supports a custom advertising provider without fake testing", () => {
    expect(advertising).toContain("مزود إعلاني آخر");
    expect(advertising).toContain("saveCustomAdvertisingProviderAction");
    expect(advertising).not.toContain("testPlatformConnectionAction");
    expect(advertising).not.toContain("Math.random");
  });

  it("keeps TikTok OAuth inside the advertising tab", () => {
    expect(advertising).toContain(
      "/api/integrations/tiktok/oauth/start",
    );
    expect(callback).toContain(
      'url.searchParams.set("tab", "advertising")',
    );
  });

  it("uses 44px shared controls", () => {
    expect(button).toContain("h-11");
    expect(navigation).toContain("h-11");
  });
});
