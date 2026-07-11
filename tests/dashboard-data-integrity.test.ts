import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const featureRoot = path.join(root, "features/dashboard");

const route = fs.readFileSync(
  path.join(root, "app/operations/dashboard/DashboardView.tsx"),
  "utf8",
);
const view = fs.readFileSync(
  path.join(featureRoot, "components/DashboardView.tsx"),
  "utf8",
);
const operations = fs.readFileSync(
  path.join(featureRoot, "components/DailyOperationsCenter.tsx"),
  "utf8",
);
const pipeline = fs.readFileSync(
  path.join(featureRoot, "components/DealSpineSnapshot.tsx"),
  "utf8",
);

function allFeatureSources(): string {
  const files: string[] = [];

  const walk = (directory: string) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        walk(target);
      } else if (/\.(ts|tsx)$/.test(entry.name)) {
        files.push(fs.readFileSync(target, "utf8"));
      }
    }
  };

  walk(featureRoot);
  return files.join("\n");
}

describe("Dashboard V3 data integrity boundary", () => {
  it("keeps the route thin and delegates runtime ownership to the feature", () => {
    expect(route).toContain(
      'export { default } from "@/features/dashboard/components/DashboardView"',
    );
    expect(route).not.toContain("whatsAppStats");
  });

  it("keeps KPI, transaction spine, and daily operations isolated", () => {
    expect(view).toContain("<DashboardKpiGrid");
    expect(view).toContain("<DealSpineSnapshot");
    expect(view).toContain("<DailyOperationsCenter");
  });

  it("keeps WhatsApp inside the unified operations center", () => {
    expect(operations).toContain(
      '"tasks" | "recentLeads" | "whatsapp"',
    );
    expect(operations).toContain('role="tablist"');
    expect(operations).toContain('role="tabpanel"');
    expect(operations).not.toContain("xl:col-span-8");
    expect(operations).not.toContain("xl:col-span-4");
  });

  it("keeps the dashboard structure stable while search filters operations only", () => {
    expect(view).toContain(
      'window.addEventListener("search-change"',
    );
    expect(operations).toContain("normalizedSearch");
    expect(operations).toContain("whatsappMatchesSearch");
    expect(view).not.toContain("pipelineVisible");
    expect(view).not.toContain("anyWidgetVisible");
  });

  it("calculates pipeline percentages from the complete pipeline total", () => {
    expect(pipeline).toContain(
      "stage.count / pipeline.data.total",
    );
    expect(pipeline).not.toContain("filteredPipelineStages");
  });

  it("preserves explicit empty and error states", () => {
    const source = allFeatureSources();

    expect(source).toMatch(/kind\s*=\s*["']error["']/);
    expect(source).toMatch(/kind\s*=\s*["']empty["']/);
    expect(source).not.toContain(
      "whatsAppStats = { conversationsCount: 0",
    );
  });

  it("does not restore agents, AI preview, or dashboard pagination", () => {
    const source = allFeatureSources();

    expect(source).not.toContain("DashboardAgentsSummary");
    expect(source).not.toContain("AI / PREVIEW PANEL");
    expect(source).not.toContain("aiPredictions");
    expect(source).not.toContain("DashboardPager");
    expect(source).not.toContain("tasksPage");
    expect(source).not.toContain("requestsPage");
  });
});
