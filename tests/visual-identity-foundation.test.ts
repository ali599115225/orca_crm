import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (relative: string) =>
  readFileSync(join(process.cwd(), relative), "utf8");

const workspaces = [
  "components/real-estate/properties/PropertiesWorkspace.tsx",
  "components/real-estate/tours/ToursWorkspace.tsx",
  "components/real-estate/offers/OffersWorkspace.tsx",
];

describe("ORCA visual identity foundation", () => {
  it("keeps the contracts and payments shell as the visual reference", () => {
    const reference = read(
      "components/contracts-payments/ContractsPaymentsShell.tsx",
    );
    expect(reference).toContain("rounded-[28px]");
    expect(reference).toContain("orca-workspace-tabs flex flex-wrap items-center justify-center");
    expect(reference).toContain("bg-[var(--nc-surface-strong)]");
  });

  it("uses the contracts workspace page, hero, metric and panel language", () => {
    for (const file of workspaces) {
      const source = read(file);
      expect(source, file).toContain('className="nc-page nc-stack orca-container pb-10"');
      expect(source, file).toContain('className="orca-workspace-hero"');
      expect(source, file).toContain('className="orca-workspace-metrics"');
      expect(source, file).toContain("orca-workspace-panel");
    }
  });

  it("removes nested scrolling and sticky detail-card constraints", () => {
    for (const file of workspaces) {
      const source = read(file);
      expect(source, file).not.toContain("xl:max-h-[calc(100vh-7rem)]");
      expect(source, file).not.toContain("xl:overflow-y-auto");
      expect(source, file).not.toContain("xl:sticky xl:top-24");
    }
  });

  it("uses one fixed-header dialog contract", () => {
    for (const file of workspaces) {
      const source = read(file);
      expect(source, file).toContain("orca-dialog-overlay");
      expect(source, file).toContain("orca-dialog-header");
      expect(source, file).toContain("orca-dialog-body");
    }
  });

  it("disables textarea dragging throughout the platform", () => {
    const css = read("app/globals.css");
    expect(css).toContain("resize: none !important");
    expect(css).toContain(".orca-form-textarea");
    expect(read("components/sales/SalesContractWorkspace.tsx")).toContain(
      "orca-form-textarea min-h-24",
    );
  });

  it("restores page-owned scrolling for tab content", () => {
    const css = read("app/globals.css");
    const marker = css.lastIndexOf(
      "ORCA VISUAL IDENTITY FOUNDATION — CONTRACTS WORKSPACE STANDARD",
    );
    expect(marker).toBeGreaterThan(-1);
    expect(css.slice(marker)).toContain("max-height: none !important");
    expect(css.slice(marker)).toContain("overflow: visible !important");
  });
});
