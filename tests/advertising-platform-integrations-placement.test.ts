import { describe, expect, it } from "vitest";
import fs from "node:fs";

const hub = fs.readFileSync(
  "components/settings/SettingsIntegrationsHub.tsx",
  "utf8",
);
const view = fs.readFileSync(
  "components/views/SettingsView.tsx",
  "utf8",
);
const component = fs.readFileSync(
  "components/settings/AdvertisingPlatformIntegrations.tsx",
  "utf8",
);

describe("advertising platform integrations placement", () => {
  it("places advertising integrations in the dedicated advertising tab", () => {
    expect(view).toContain(
      'import AdvertisingPlatformIntegrations from "@/components/settings/AdvertisingPlatformIntegrations"',
    );
    expect(view).toContain('activeSection === "advertising"');
    expect(view).toContain("<AdvertisingPlatformIntegrations lang={lang} />");
    expect(hub).not.toContain("AdvertisingPlatformIntegrations");
  });

  it("uses the dedicated tenant-scoped advertising actions", () => {
    expect(component).toContain("getAdvertisingConnectionsAction");
    expect(component).toContain(
      "saveStandardAdvertisingConnectionAction",
    );
    expect(component).toContain(
      "saveCustomAdvertisingProviderAction",
    );
  });

  it("does not use simulated connection testing", () => {
    expect(component).not.toContain("testPlatformConnectionAction");
    expect(component).not.toContain("Math.random");
    expect(component).not.toContain("setTimeout");
  });
});
