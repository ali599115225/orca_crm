import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

const view = read("components/views/AgentManagementView.tsx");
const route = read("app/api/v1/agents/route.ts");
const logs = read("app/api/v1/agents/[id]/logs/route.ts");
const run = read("app/api/v1/agents/[id]/run/route.ts");
const toggle = read("app/api/v1/agents/[id]/toggle/route.ts");
const registry = read("lib/agents/registry.ts");

describe("agents shared operations rebuild", () => {
  it("consumes canonical shared operations primitives rather than hand-built page shells", () => {
    for (const token of [
      "OperationsPageHeader",
      "OperationsKpiGrid",
      "OperationsPanel",
      "OperationsEmptyState",
      "OperationsMasterList",
      "OperationsMasterRow",
      "operationsVisual.page",
    ]) {
      expect(view).toContain(token);
    }

    expect(view).not.toContain('<header className="orca-workspace-hero"');
    expect(view).not.toContain('<div className="orca-workspace-metrics"');
    expect(view).not.toContain('className="orca-workspace-panel');
  });

  it("keeps dashboard-style icon-only refresh and rounded shared master rows", () => {
    expect(view).toContain("operationsVisual.iconButton");
    expect(view).toContain("OperationsMasterRow");
    expect(view).toContain("aria-pressed={selectedRow}");
    expect(view).toContain("[&::-webkit-scrollbar]:hidden");
  });

  it("does not invent manual execution for automatic agents", () => {
    expect(view).toContain("selected.supportsManualRun");
    expect(view).toContain("تلقائي فقط");
    expect(registry).toContain('manualRun: "SAHER_TELEMETRY"');
    expect(registry.match(/manualRun: "NONE"/g)?.length || 0).toBeGreaterThanOrEqual(5);
  });

  it("preserves the real tenant-scoped agent read, toggle, run and history paths", () => {
    expect(view).toContain('fetch("/api/v1/agents"');
    expect(view).toContain("/toggle");
    expect(view).toContain("/run");
    expect(view).toContain("/logs");

    expect(route).toContain("runWithTenantContext");
    expect(logs).toContain("runWithTenantContext");
    expect(run).toContain("runWithTenantContext");
    expect(toggle).toContain("runWithTenantContext");
    expect(toggle).toContain("updateMany");
  });

  it("keeps server truth for runtime states and safe telemetry", () => {
    expect(route).toContain("deriveRuntimeStatus");
    expect(view).toContain("يعمل الآن");
    expect(view).toContain("يحتاج انتباه");
    expect(view).toContain("فشل آخر تشغيل");
    expect(logs).toContain("safeLogMessage");
    expect(view).not.toContain("GEMINI_API_KEY");
  });

  it("does not add visible identifier labels to the rebuilt workspace", () => {
    expect(view).not.toContain("معرف الوكيل");
    expect(view).not.toContain("Agent ID");
    expect(view).not.toContain("UUID");
  });
});
