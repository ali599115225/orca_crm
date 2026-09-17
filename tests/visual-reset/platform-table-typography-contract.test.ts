import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("ORCA platform table typography contract", () => {
  it("defines the shared 12 / 14 / 11 / 12 hierarchy for native tables and grid tables", () => {
    const css = source("app/operations/orca-page-contract-v1.css");

    expect(css).toContain("ORCA PLATFORM TABLE TYPOGRAPHY CONTRACT");
    expect(css).toContain(".orca-v1-shell table thead th");
    expect(css).toContain(".orca-v1-shell table tbody td");
    expect(css).toContain(".orca-platform-grid-header");
    expect(css).toContain(".orca-platform-grid-row");
    expect(css).toContain("font-size: 12px !important");
    expect(css).toContain("font-size: 14px !important");
    expect(css).toContain("font-size: 11px !important");
  });

  it("moves the main operational CSS-grid tables onto the shared platform contract", () => {
    const files = [
      "components/marketing/MarketingPerformanceWorkspace.tsx",
      "components/real-estate/tours/ToursWorkspace.tsx",
      "components/real-estate/offers/OffersWorkspace.tsx",
      "components/views/SalesView.tsx",
      "components/revenue-integrity/RevenueIntegrityView.tsx",
    ];

    for (const file of files) {
      const contents = source(file);
      expect(contents).toContain("orca-platform-grid-header");
      expect(contents).toContain("orca-platform-grid-row");
    }
  });

  it("does not allow tiny 9px/10px headers in the governed custom-grid tables", () => {
    const files = [
      "components/marketing/MarketingPerformanceWorkspace.tsx",
      "components/real-estate/tours/ToursWorkspace.tsx",
      "components/real-estate/offers/OffersWorkspace.tsx",
      "components/views/SalesView.tsx",
      "components/revenue-integrity/RevenueIntegrityView.tsx",
    ];

    for (const file of files) {
      const contents = source(file);
      const headerLines = contents
        .split("\n")
        .filter((line) => line.includes("orca-platform-grid-header"))
        .join("\n");

      expect(headerLines).not.toContain("text-[9px]");
      expect(headerLines).not.toContain("text-[10px]");
    }
  });
});
