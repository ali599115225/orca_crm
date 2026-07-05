import fs from "node:fs";
import { describe, expect, it } from "vitest";

const dashboardSource = fs.readFileSync(
  "app/operations/dashboard/DashboardView.tsx",
  "utf8",
);
const wizardSource = fs.readFileSync(
  "components/features/ContractWizard.tsx",
  "utf8",
);

describe("Dashboard page closure gate", () => {
  it("includes the dashboard-owned contract wizard in localization closure", () => {
    expect(dashboardSource).toContain("<ContractWizard");
    expect(wizardSource).toContain("displayPerson(");
    expect(wizardSource).toContain("displayEntity(");
    expect(wizardSource).toContain(
      'const displayLocale: DisplayLocale = lang === "AR" ? "ar" : "en"',
    );
  });

  it("does not build form option labels from raw person or project names", () => {
    expect(wizardSource).not.toContain("label: `${client.name}");
    expect(wizardSource).not.toContain(
      "label: `${property.projectName",
    );
    expect(wizardSource).toContain("displayedClientName");
    expect(wizardSource).toContain("displayedProjectName");
  });

  it("keeps the wizard on the centralized translation and error layers", () => {
    expect(wizardSource).toContain("const { lang, t } = useApp()");
    expect(wizardSource).not.toContain('dir="rtl"');
    expect(wizardSource).not.toContain("TENANT_CONTEXT_REQUIRED");
    expect(wizardSource).not.toMatch(/[\u0600-\u06FF]/);
  });
});
