import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

const page = read("app/operations/dashboard/page.tsx");
const view = read("features/dashboard/components/DashboardView.tsx");
const header = read("features/dashboard/components/DashboardHeader.tsx");
const metric = read("features/dashboard/components/DashboardMetricCard.tsx");
const pipeline = read("features/dashboard/components/DealSpineSnapshot.tsx");
const agent = read("features/dashboard/components/AgentDecisionCenter.tsx");
const daily = read("features/dashboard/components/DailyOperationsCenter.tsx");
const css = read("app/operations/dashboard/orca-dashboard-v1.css");

describe("ORCA Dashboard V1 zero-base", () => {
  it("installs a dashboard-only visual system", () => {
    expect(page).toContain('import "./orca-dashboard-v1.css";');
    expect(view).toContain("data-dashboard-zero-base-v1");
    expect(header).toContain("orca-dashboard-v1-command");
    expect(header).not.toContain("orca-workspace-hero");
    expect(metric).toContain("orca-dashboard-v1-metric-copy");
    expect(css).toContain("ORCA Dashboard V1 — Zero Base");
  });

  it("preserves live data/capability behavior", () => {
    expect(page).toContain("getDashboardReadModel");
    expect(page).toContain("getDashboardCapabilities");
    expect(view).toContain("ContractWizard");
    expect(view).toContain('window.addEventListener("search-change"');
    expect(agent).toContain('fetch("/api/v1/agents"');
    expect(daily).toContain("normalizedSearch");
    expect(daily).toContain("whatsappMatchesSearch");
  });

  it("replaces old dashboard layout hooks with the approved dense structure", () => {
    expect(agent).toContain("orca-dashboard-v1-executive-grid");
    expect(agent).toContain("orca-dashboard-v1-lower-grid");
    expect(agent).toContain("orca-dashboard-v1-decision");
    expect(agent).toContain("orca-dashboard-v1-agents");
    expect(daily).toContain("orca-dashboard-v1-operations");
    expect(daily).toContain("orca-dashboard-v1-ops-tablist");
    expect(daily).toContain("orca-dashboard-v1-ops-panel");
    expect(pipeline).toContain("orca-dashboard-v1-stage-track");
  });

  it("keeps desktop compact while allowing natural vertical scrolling", () => {
    const desktopStart = css.indexOf("/* Desktop = compact natural document flow.");
    const tabletStart = css.indexOf("/* Tablet = compact responsive flow");

    expect(desktopStart).toBeGreaterThanOrEqual(0);
    expect(tabletStart).toBeGreaterThan(desktopStart);

    const desktopCss = css.slice(desktopStart, tabletStart);

    expect(desktopCss).toContain("@media (min-width: 1200px)");
    expect(desktopCss).toContain("height: auto;");
    expect(desktopCss).toContain("overflow: visible;");
    expect(desktopCss).toContain("grid-auto-rows: auto;");
    expect(desktopCss).toContain("min-height: 180px;");
    expect(desktopCss).toContain("max-height: 260px;");
    expect(desktopCss).toContain("overflow-y: auto;");
    expect(desktopCss).not.toContain("grid-template-rows:");
    expect(desktopCss).not.toMatch(/^\s*height:\s*100%;\s*$/m);

    expect(css).toContain("scrollbar-width: none !important");
    expect(css).toContain("@media (min-width: 768px) and (max-width: 1199px)");
    expect(css).toContain("@media (max-width: 767px)");
  });

  it("keeps four compact KPIs and touch-safe actions", () => {
    expect(css).toContain("grid-template-columns: repeat(4, minmax(0, 1fr));");
    expect(css).toContain("min-height: 64px;");
    expect(css).toContain("min-height: 44px;");
  });

  it("uses only existing ORCA token families and hides visual scrollbars", () => {
    expect(css).toContain("var(--nc-surface-strong)");
    expect(css).toContain("var(--nc-accent)");
    expect(css).toContain("var(--nc-accent-border)");
    expect(css).toContain("scrollbar-width: none !important");
    expect(css).toContain("overflow-y: auto;");
    expect(css).toContain("overflow-x: auto;");
  });
});