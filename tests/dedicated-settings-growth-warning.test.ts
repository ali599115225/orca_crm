import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const settingsPage = readFileSync(
  join(process.cwd(), "app/operations/settings/page.tsx"),
  "utf8",
);
const settingsView = readFileSync(
  join(process.cwd(), "components/views/SettingsView.tsx"),
  "utf8",
);

describe("Settings — single-company product surface", () => {
  it("does not query SaaS plan, add-on, or growth-warning fields", () => {
    expect(settingsPage).not.toContain("subscriptionPlan");
    expect(settingsPage).not.toContain("extraAgents");
    expect(settingsPage).not.toContain("growthWarning");
    expect(settingsPage).not.toContain("PLAN_LEAD_LIMITS");
  });

  it("does not render a plan label or billing component", () => {
    expect(settingsView).not.toContain("SettingsBilling");
    expect(settingsView).not.toContain("Current Plan");
    expect(settingsView).not.toContain("الباقة الحالية");
    expect(settingsView).toContain("hideBilling");
  });

  it("redirects stale billing tabs to organization settings", () => {
    expect(settingsView).toContain(
      'requested === "billing" ? "organization" : requested',
    );
  });
});
