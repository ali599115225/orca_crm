import fs from "node:fs";
import { describe, expect, it } from "vitest";

const routeView = fs.readFileSync(
  "app/operations/dashboard/DashboardView.tsx",
  "utf8",
);
const dashboardView = fs.readFileSync(
  "features/dashboard/components/DashboardView.tsx",
  "utf8",
);
const wizardSource = fs.readFileSync(
  "components/features/ContractWizard.tsx",
  "utf8",
);

describe("Dashboard page closure gate", () => {
  it("keeps the route thin and delegates to the isolated dashboard feature", () => {
    expect(routeView).toContain(
      'export { default } from "@/features/dashboard/components/DashboardView"',
    );
  });

  it("includes the dashboard-owned contract wizard in localization closure", () => {
    expect(dashboardView).toContain("<ContractWizard");
    expect(wizardSource).toContain("displayPerson(");
    expect(wizardSource).toContain("displayEntity(");
    expect(wizardSource).toContain(
      'const displayLocale: DisplayLocale = lang === "AR" ? "ar" : "en"',
    );
  });

  it("does not build wizard labels from raw person or project names", () => {
    expect(wizardSource).not.toContain("label: `${client.name}");
    expect(wizardSource).not.toContain("label: `${property.projectName");
    expect(wizardSource).toContain("displayedClientName");
    expect(wizardSource).toContain("displayedProjectName");
  });

  it("keeps the wizard on centralized translations and error codes", () => {
    expect(wizardSource).toContain("const { lang, t } = useApp()");
    expect(wizardSource).not.toContain('dir="rtl"');
    expect(wizardSource).not.toContain("TENANT_CONTEXT_REQUIRED");
  });
});
