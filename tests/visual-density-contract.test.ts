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

describe("visual density contract", () => {
  it("uses the full available width for selected record details", () => {
    for (const file of workspaces) {
      const source = read(file);
      expect(source, file).toContain("orca-workspace-detail");
      expect(source, file).toContain("orca-detail-header");
      expect(source, file).toContain("orca-detail-primary");
      expect(source, file).toContain("orca-detail-secondary");
      expect(source, file).not.toContain("max-w-5xl");
    }
  });

  it("uses the container-aware contracts workspace shell for contract details", () => {
    const source = read(
      "components/sales/SalesContractWorkspace.tsx",
    );
    expect(source).toContain(
      'className="nc-page nc-stack orca-container pb-10"',
    );
    expect(source).toContain("orca-contract-kpis");
    expect(source).toContain("orca-contract-kpi");
    expect(source).toContain("orca-workspace-tabs");
  });

  it("keeps contract KPIs responsive without reserving empty columns", () => {
    const css = read("app/globals.css");
    expect(css).toContain(".orca-contract-kpis");
    expect(css).toContain(
      "repeat(auto-fit, minmax(min(100%, 180px), 1fr))",
    );
    expect(css).not.toContain("repeat(6, minmax(0, 1fr))");
  });
});
