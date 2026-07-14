import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (relative: string) => readFileSync(join(process.cwd(), relative), "utf8");

describe("centered gold visual contract", () => {
  it("removes fixed lease width and nested scrolling", () => {
    const source = read("components/contracts-payments/ContractsPaymentsCenter.tsx");
    expect(source).toContain("orca-master-detail");
    expect(source).toContain("orca-master-pane");
    expect(source).toContain("orca-detail-pane");
    expect(source).not.toContain("lg:w-[45%]");
    expect(source).not.toContain("max-h-[560px]");
  });

  it("uses responsive lifecycle stages", () => {
    const source = read("components/contracts-payments/FinancialLifecycleProgress.tsx");
    expect(source).toContain("orca-lifecycle-grid");
    expect(source).not.toContain("min-w-max");
    expect(source).not.toContain("min-w-[118px]");
  });

  it("centers shared tabs with golden hover", () => {
    const shell = read("components/contracts-payments/ContractsPaymentsShell.tsx");
    expect(shell).toContain("orca-workspace-tabs flex flex-wrap items-center justify-center");
    expect(shell).toContain("hover:border-[var(--orca-action-gold)]");
  });

  it("uses auto-fit contract summaries", () => {
    const source = read("components/sales/SalesContractWorkspace.tsx");
    expect(source).toContain("orca-auto-grid");
    expect(source).toContain("orca-summary-card");
  });
});
