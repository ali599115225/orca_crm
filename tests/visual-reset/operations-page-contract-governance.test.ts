import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const agents = fs.readFileSync(path.join(root, "AGENTS.md"), "utf8");
const contract = fs.readFileSync(
  path.join(root, "docs/ui/ORCA_OPERATIONS_PAGE_CONTRACT.md"),
  "utf8",
);
const dashboardHeader = fs.readFileSync(
  path.join(root, "features/dashboard/components/DashboardHeader.tsx"),
  "utf8",
);
const dashboardVisual = fs.readFileSync(
  path.join(root, "features/dashboard/visual.ts"),
  "utf8",
);
const operationsVisual = fs.readFileSync(
  path.join(root, "features/operations/visual.ts"),
  "utf8",
);

describe("ORCA Operations page contract governance", () => {
  it("makes the Operations page contract mandatory for repository agents", () => {
    expect(agents).toContain("ORCA OPERATIONS PAGE CONTRACT — MANDATORY");
    expect(agents).toContain("docs/ui/ORCA_OPERATIONS_PAGE_CONTRACT.md");
    expect(agents).toContain("VISUAL PASS + FUNCTIONAL PASS + NO DEAD UI");
  });

  it("locks Dashboard as the canonical visual reference", () => {
    expect(contract).toContain("Canonical visual reference:** Dashboard");
    expect(contract).toContain("No Per-Page Patching");
    expect(contract).toContain("Do not use repeated speculative patch attempts");
  });

  it("defines one shared Operations component contract", () => {
    for (const token of [
      "OperationsPageShell",
      "OperationsPageHeader",
      "OperationsPageActions",
      "OperationsKpiGrid",
      "OperationsPanel",
      "OperationsTabs",
      "OperationsEmptyState",
      "OperationsDialog",
    ]) {
      expect(contract).toContain(token);
    }
  });

  it("keeps Dashboard canonical while allowing its implementation to move onto the shared Operations contract", () => {
    expect(dashboardHeader).toContain("OperationsPageHeader");
    expect(dashboardHeader).toContain("operationsVisual.primaryButton");
    expect(dashboardHeader).toContain("operationsVisual.secondaryButton");
    expect(dashboardHeader).toContain("operationsVisual.iconButton");

    expect(dashboardVisual).toContain(
      'import { operationsVisual } from "@/features/operations/visual";',
    );
    expect(dashboardVisual).toContain("metricCard: operationsVisual.linkedMetricCard");
    expect(dashboardVisual).toContain("tabActive: operationsVisual.activeTab");
    expect(dashboardVisual).toContain("tabIdle: operationsVisual.tab");

    for (const token of [
      "primaryButton:",
      "secondaryButton:",
      "iconButton:",
      "metricCard:",
      "activeTab:",
      "tab:",
    ]) {
      expect(operationsVisual).toContain(token);
    }
  });

  it("locks one platform table typography contract across Operations", () => {
    expect(contract).toContain("Platform Table Typography — LOCKED");
    expect(contract).toContain("column headers: **12px**");
    expect(contract).toContain("primary row values: **14px**");
    expect(contract).toContain("secondary/supporting row values: **11px**");
    expect(contract).toContain("status badges: **12px**");
    expect(contract).toContain("row action text: **12px**");
  });

  it("locks shared Back Action and page-owned vertical scrolling", () => {
    expect(contract).toContain("Navigation / Back Action — LOCKED");
    expect(contract).toContain("OperationsBackAction");
    expect(contract).toContain("Scroll Ownership / Height — LOCKED");
    expect(contract).toContain("OperationsScrollRegion");
    expect(contract).toContain("log`, `conversation`, `menu`, or `dialog");
  });

  it("locks one shared conversation workspace and typography contract", () => {
    expect(contract).toContain("Conversation Workspace — LOCKED");
    expect(contract).toContain('OperationsScrollRegion scrollRole="conversation"');
    expect(contract).toContain("Email, WhatsApp and Helpdesk");
    expect(contract).toContain("Conversation Typography — LOCKED");
    expect(contract).toContain("conversation list title: **14px Bold**");
    expect(contract).toContain("metadata / date / time: **11px**");
    expect(contract).toContain("detail / message title: **16px Bold**");
    expect(contract).toContain("message body: **15px**");
    expect(contract).toContain("composer / reply input: **14px**");
  });

  it("requires functional integrity and rejects dead UI", () => {
    expect(contract).toContain("Functional Integrity");
    expect(contract).toContain("dead buttons");
    expect(contract).toContain("fake success");
    expect(contract).toContain(
      "A passing TypeScript build or static test alone is not page closure",
    );
  });
});