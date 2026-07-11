import fs from "node:fs";
import { describe, expect, it } from "vitest";

const page = fs.readFileSync("app/operations/dashboard/page.tsx", "utf8");
const view = fs.readFileSync(
  "features/dashboard/components/DashboardView.tsx",
  "utf8",
);
const operations = fs.readFileSync(
  "features/dashboard/components/DailyOperationsCenter.tsx",
  "utf8",
);
const pipeline = fs.readFileSync(
  "features/dashboard/components/DealSpineSnapshot.tsx",
  "utf8",
);
const copy = fs.readFileSync(
  "features/dashboard/copy/dashboardCopy.ts",
  "utf8",
);
const visual = fs.readFileSync(
  "features/dashboard/visual.ts",
  "utf8",
);
const wizard = fs.readFileSync(
  "components/features/ContractWizard.tsx",
  "utf8",
);
const wizardVisual = fs.readFileSync(
  "components/features/contractWizardVisual.ts",
  "utf8",
);

describe("Dashboard V3 visual and structural closure", () => {
  it("has a trusted route-level loading and error boundary", () => {
    expect(fs.existsSync("app/operations/dashboard/loading.tsx")).toBe(true);
    expect(fs.existsSync("app/operations/dashboard/error.tsx")).toBe(true);
  });

  it("uses four KPI cards, one full-width spine, and one operations center", () => {
    expect(view).toContain("<DashboardKpiGrid");
    expect(view).toContain("<DealSpineSnapshot");
    expect(view).toContain("<DailyOperationsCenter");
    expect(view).not.toContain("xl:col-span-8");
    expect(view).not.toContain("xl:col-span-4");
  });

  it("removes dashboard pagination and the rejected competing-card layout", () => {
    expect(operations).not.toContain("DashboardPager");
    expect(operations).not.toContain("totalPages");
    expect(operations).toContain("viewAllTasks");
    expect(operations).toContain("viewAllLeads");
    expect(operations).toContain("openWhatsapp");
  });

  it("keeps Arabic and English copy separated", () => {
    expect(copy).toContain("AR: {");
    expect(copy).toContain("EN: {");
    expect(view).toContain("dashboardCopy.AR");
    expect(view).toContain("dashboardCopy.EN");
  });

  it("uses the platform identity accent for primary actions and interactions", () => {
    expect(visual).toContain("bg-[var(--nc-accent)]");
    expect(visual).toContain("text-[var(--nc-accent)]");
    expect(visual).toContain("hover:bg-[var(--nc-accent-soft)]");
    expect(visual).toContain("var(--orca-ui-on-primary)");
    expect(`${visual}\n${operations}`).not.toContain("var(--nc-op-blue)");
  });

  it("keeps pipeline and operations cards visually separated from their sections", () => {
    expect(visual).toContain("sectionPanel:");
    expect(visual).toContain("contentCard:");
    expect(visual).toContain("interactiveContentCard:");
    expect(pipeline).toContain("dashboardVisual.sectionPanel");
    expect(pipeline).toContain("dashboardVisual.stageCard");
    expect(operations).toContain("dashboardVisual.sectionPanel");
    expect(operations).toContain("dashboardVisual.contentCard");
  });

  it("keeps the contract wizard isolated and token-driven", () => {
    expect(wizard).toContain(
      'import { contractWizardVisual } from "./contractWizardVisual"',
    );
    expect(wizardVisual).toContain("var(--nc-surface-solid)");
    expect(wizardVisual).toContain("var(--nc-accent)");
    expect(wizardVisual).toContain("var(--orca-ui-on-primary)");
    expect(wizardVisual).not.toContain("var(--nc-op-blue)");
    expect(`${wizard}\n${wizardVisual}`).not.toMatch(/#[0-9a-fA-F]{3,8}/);
  });

  it("uses a real three-step contract flow with final review", () => {
    expect(wizard).toContain("const [currentStep, setCurrentStep]");
    expect(wizard).toContain('t("contractWizard.step.review")');
    expect(wizard).toContain('t("contractWizard.reviewTitle")');
    expect(wizard).toContain("currentStep === 2");
    expect(wizard).toContain('type="submit"');
    expect(wizard).toContain('t("contractWizard.back")');
    expect(wizard).toContain('t("contractWizard.next")');
  });

  it("updates metadata and no longer claims AI predictions", () => {
    expect(page).toContain("ملخص موثوق لمسار الصفقات والعمليات اليومية");
    expect(page).not.toContain("التنبؤات الذكية");
  });
});
