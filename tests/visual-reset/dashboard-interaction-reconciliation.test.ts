import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (file: string) =>
  fs.readFileSync(path.join(root, file), "utf8").replace(/\r\n/g, "\n");

const deal = read("features/dashboard/components/DealSpineSnapshot.tsx");
const daily = read("features/dashboard/components/DailyOperationsCenter.tsx");
const tasks = read("components/views/TasksView.tsx");
const agent = read("features/dashboard/components/AgentDecisionCenter.tsx");
const select = read(
  "components/features/contract-wizard/ContractWizardSelect.tsx",
);
const css = read("app/operations/dashboard/orca-dashboard-v1.css");

describe("Dashboard interaction reconciliation", () => {
  it("routes opportunity to the canonical Leads surface instead of a dead page", () => {
    expect(
      fs.existsSync(path.join(root, "app/operations/opportunities/page.tsx")),
    ).toBe(false);
    expect(deal).toContain('opportunity: "/operations/leads"');
    expect(deal).not.toContain("/operations/opportunities");
  });

  it("makes Dashboard task cards interactive and deep-links the exact task", () => {
    expect(daily).toContain(
      'href={`/operations/tasks?task=${encodeURIComponent(task.id)}`}',
    );
    expect(daily).toContain("dashboardVisual.interactiveContentCard");
    expect(tasks).toContain(
      'new URLSearchParams(window.location.search).get(\n      "task",',
    );
    expect(tasks).toContain("void loadData(preferredTaskId);");
    expect(tasks).toContain(
      "async (preferredTaskId?: string | null) => {",
    );
  });

  it("normalizes Sentinel to the same wrapper contract as the other agent cards", () => {
    expect(agent).toContain(
      "<div>\n                  {renderAgentRow(copy.sentinel, sentinelAgent, true)}\n                </div>",
    );
  });

  it("hides portal scrollbars cross-browser without disabling scrolling", () => {
    expect(select).toContain(
      "orca-dashboard-v1-hide-scrollbar overflow-y-auto",
    );
    expect(agent).toContain(
      "orca-dashboard-v1-hide-scrollbar min-h-0 flex-1 overflow-y-auto",
    );
    expect(css).toContain(
      ".orca-dashboard-v1-hide-scrollbar::-webkit-scrollbar",
    );
    expect(css).toContain("scrollbar-width: none !important;");
  });

  it("keeps Ask ORCA text direction correct while moving the send action away from the left dev indicator", () => {
    expect(agent).toContain(
      'dir="ltr"\n                    className="flex items-end gap-2',
    );
    expect(agent).toContain('dir={isArabic ? "rtl" : "ltr"}');
  });
});
