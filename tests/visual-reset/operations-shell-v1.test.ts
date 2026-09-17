import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const read = (file: string) =>
  fs.readFileSync(path.join(root, file), "utf8");

const dashboardLayout = read("components/layout/DashboardLayout.tsx");
const sidebar = read("app/components/SovereignSidebar.tsx");
const header = read("app/components/SovereignHeader.tsx");
const css = read("app/operations/orca-operations-v1.css");
const operationsLayout = read("app/operations/layout.tsx");
const rootLayout = read("app/layout.tsx");

describe("ORCA zero-base operations shell", () => {
  it("is explicitly zero-base and operations-scoped", () => {
    expect(dashboardLayout).toContain('data-orca-visual-system="zero-base-v1"');
    expect(operationsLayout).toContain("import './orca-operations-v1.css';");
    expect(rootLayout).not.toContain("orca-operations-v1.css");
    expect(css).toContain("ORCA ZERO-BASE OPERATIONS SHELL");
  });

  it("supports RTL Arabic and LTR English without separate layouts", () => {
    expect(dashboardLayout).toContain("dir={isRTL ? 'rtl' : 'ltr'}");
    expect(css).toContain('.orca-v1-shell[dir="rtl"]');
    expect(css).toContain('.orca-v1-shell[dir="ltr"]');
    expect(css).toContain("font-family: Calibri, Arial, sans-serif;");
    expect(css).toContain("font-family: Inter, Arial, sans-serif;");

    // In direction:rtl, Grid track 1 is the physical right edge.
    // Therefore the sidebar must be the first named area/track.
    expect(css).toContain('grid-template-areas: "sidebar main";');
    expect(css).toContain("grid-template-columns: 84px minmax(0, 1fr);");
    expect(css).toContain("grid-template-columns: 264px minmax(0, 1fr);");
    expect(css).not.toContain('grid-template-areas: "main sidebar";');
  });

  it("defines desktop, tablet and mobile layout contracts", () => {
    expect(css).toContain("@media (min-width: 1200px)");
    expect(css).toContain("@media (min-width: 768px) and (max-width: 1199px)");
    expect(css).toContain("@media (max-width: 767px)");
    expect(css).toContain("width: min(86vw, 320px);");
    expect(css).toContain("grid-template-columns: 264px minmax(0, 1fr);");
    expect(css).toContain("grid-template-columns: 84px minmax(0, 1fr);");
  });

  it("keeps mobile navigation as an actual off-canvas drawer", () => {
    expect(dashboardLayout).toContain("isMobileMenuOpen");
    expect(dashboardLayout).toContain("orca-v1-mobile-overlay");
    expect(dashboardLayout).toContain("isMobileMenuOpen ? 'is-open' : ''");
    expect(css).toContain(".orca-v1-sidebar-slot.is-open");
    expect(css).toContain("position: fixed;");
  });

  it("keeps every interactive shell control touch-safe", () => {
    expect(css).toContain("min-height: 44px;");
    expect(css).toContain("min-width: 44px;");
  });

  it("hides shell scrollbars visually without disabling scrolling", () => {
    expect(css).toContain("scrollbar-width: none !important");
    expect(css).toContain("overflow: auto;");
    expect(css).toContain("overflow-y: auto;");
  });

  it("keeps all 18 primary operations destinations", () => {
    const paths = [
      "/operations/dashboard",
      "/operations/leads",
      "/operations/revenue-integrity",
      "/operations/offers",
      "/operations/tours",
      "/operations/properties",
      "/operations/rental",
      "/operations/calculator",
      "/operations/marketing",
      "/operations/campaigns",
      "/operations/sales",
      "/operations/tasks",
      "/operations/documents",
      "/operations/helpdesk",
      "/operations/agents",
      "/operations/email",
      "/operations/whatsapp",
      "/operations/settings",
    ];

    for (const route of paths) {
      expect(sidebar).toContain(`path: "${route}"`);
    }
  });

  it("preserves the operational header behaviors", () => {
    expect(header).toContain("getHeaderNotificationsAction");
    expect(header).toContain("markAllHeaderNotificationsReadAction");
    expect(header).toContain("markHeaderNotificationReadAction");
    expect(header).toContain("search-change");
    expect(header).toContain("Ctrl+K");
    expect(header).toContain("toggleLang");
    expect(header).toContain("toggleTheme");
    expect(header).toContain("logoutAction");
  });

  it("uses current ORCA design tokens rather than a new palette", () => {
    expect(css).toContain("var(--nc-bg)");
    expect(css).toContain("var(--nc-surface-strong)");
    expect(css).toContain("var(--nc-accent-soft)");
    expect(css).toContain("var(--nc-accent-border)");
  });
});