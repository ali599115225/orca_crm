import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

describe("Revenue Integrity compact four-tab identity", () => {
  const view = readFileSync(
    path.join(process.cwd(), "components/revenue-integrity/RevenueIntegrityView.tsx"),
    "utf8",
  );
  const visual = readFileSync(
    path.join(process.cwd(), "components/revenue-integrity/visual.ts"),
    "utf8",
  );

  it("applies the compact two-column layout to all four tabs", () => {
    for (const tab of ["radar", "actions", "audit", "predictive"]) {
      expect(view).toContain(`data-revenue-tab-layout="${tab}"`);
    }
  });

  it("uses a 2:1 operational split and shorter fixed cards", () => {
    expect(visual).toContain("minmax(0,2fr)_minmax(320px,1fr)");
    expect(visual).toContain("lg:h-[430px]");
    expect(visual).not.toContain("lg:h-[560px]");
  });
});
