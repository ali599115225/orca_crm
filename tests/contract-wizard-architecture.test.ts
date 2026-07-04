import fs from "node:fs";
import { describe, expect, it } from "vitest";

const actionSource = fs.readFileSync("app/actions/contract.ts", "utf8");
const wizardSource = fs.readFileSync(
  "components/features/ContractWizard.tsx",
  "utf8",
);
const dashboardSource = fs.readFileSync(
  "app/operations/dashboard/DashboardView.tsx",
  "utf8",
);
const metricSource = fs.readFileSync(
  "app/operations/dashboard/components/DashboardMetricCard.tsx",
  "utf8",
);
const whatsappSource = fs.readFileSync(
  "app/operations/dashboard/components/DashboardWhatsAppSummary.tsx",
  "utf8",
);

describe("contract and dashboard architecture", () => {
  it("runs contract reads and writes inside an explicit tenant boundary", () => {
    expect(actionSource).toContain(
      'import { runWithTenantContext } from "@/lib/tenant-context"',
    );
    expect(
      actionSource.match(/return await runWithTenantContext\(/g)?.length ?? 0,
    ).toBeGreaterThanOrEqual(3);
  });

  it("does not return raw internal errors from wizard actions", () => {
    expect(actionSource).not.toContain("error: error.message");
    expect(actionSource).toContain("TENANT_CONTEXT_UNAVAILABLE");
  });

  it("contains no hardcoded Arabic interface copy in ContractWizard", () => {
    expect(wizardSource).not.toMatch(/[\u0600-\u06FF]/);
    expect(wizardSource).not.toContain('dir="rtl"');
    expect(wizardSource).toContain("const { lang, t } = useApp()");
  });

  it("uses one interaction primitive for all dashboard click surfaces", () => {
    expect(dashboardSource).toContain("<InteractiveSurface");
    expect(metricSource).toContain("<InteractiveSurface");
    expect(whatsappSource).toContain("<InteractiveSurface");
    expect(dashboardSource).not.toContain('role="button"');
    expect(metricSource).not.toContain('role="button"');
    expect(whatsappSource).not.toContain('role="button"');
  });

  it("removes icon-font dependencies from rebuilt dashboard surfaces", () => {
    expect(dashboardSource).not.toContain("ph-fill");
    expect(dashboardSource).not.toContain("ph-bold");
    expect(metricSource).not.toContain("ph-");
    expect(whatsappSource).not.toContain("ph-");
  });
});
