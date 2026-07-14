import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const emailView = fs.readFileSync(
  path.join(root, "app/operations/email/EmailClient.tsx"),
  "utf8",
);
const integrations = fs.readFileSync(
  path.join(root, "components/settings/SettingsIntegrationsHub.tsx"),
  "utf8",
);

describe("email provider settings deep link", () => {
  it("links missing provider state directly to SMTP and Resend connection drawers", () => {
    expect(emailView).toContain(
      "/operations/settings?tab=integrations&category=EMAIL&provider=SMTP&open=1",
    );
    expect(emailView).toContain(
      "/operations/settings?tab=integrations&category=EMAIL&provider=RESEND&open=1",
    );
  });

  it("opens the requested provider from URL parameters once", () => {
    expect(integrations).toContain("new URLSearchParams(window.location.search)");
    expect(integrations).toContain('params.get("open") !== "1"');
    expect(integrations).toContain('params.get("provider")');
    expect(integrations).toContain("autoOpenHandledRef.current = true");
    expect(integrations).toContain("setCategoryFilter(provider.category)");
    expect(integrations).toContain("setActiveProvider(provider.id)");
    expect(integrations).toContain('setMode("CONNECT")');
    expect(integrations).toContain("setDrawerOpen(true)");
  });

  it("keeps the real encrypted tenant connection form for Resend", () => {
    expect(integrations).toContain('id: "RESEND"');
    expect(integrations).toContain('{ key: "apiKey"');
    expect(integrations).toContain('{ key: "fromEmail"');
    expect(integrations).toContain("saveRevenueProviderAction({");
    expect(integrations).toContain("credentials,");
  });

  it("keeps provider forms below the application header", () => {
    expect(integrations).toContain("top-[88px]");
    expect(integrations).toContain("rounded-2xl");
  });

  it("masks legacy global provider data without mutating history", () => {
    expect(emailView).toContain("isLegacyGlobalEmailProviderText");
    expect(emailView).toMatch(/onboarding@resend\\\.dev/);
    expect(emailView).toContain("RESEND_API_KEY");
    expect(emailView).toContain("EMAIL_FROM");
    expect(emailView).toContain("? t.senderUnavailable");
    expect(emailView).toContain("? t.providerMissing");
  });
});
