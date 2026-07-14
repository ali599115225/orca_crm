import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (relative: string) => readFileSync(join(process.cwd(), relative), "utf8");
const workspaces = [
  "components/real-estate/properties/PropertiesWorkspace.tsx",
  "components/real-estate/tours/ToursWorkspace.tsx",
  "components/real-estate/offers/OffersWorkspace.tsx",
];

describe("real-estate container-aware visual layout", () => {
  it("uses the shared container-aware contract", () => {
    for (const file of workspaces) {
      expect(read(file), file).toContain("orca-container");
      expect(read(file), file).toContain("orca-workspace-detail");
    }
  });

  it("uses auto-fit detail grids rather than fixed 8/4 spans", () => {
    const css = read("app/globals.css");
    expect(css).toContain("repeat(auto-fit, minmax(min(100%, 230px), 1fr))");
    expect(css).not.toContain("grid-column: span 8");
    expect(css).not.toContain("grid-column: span 4");
  });

  it("centers information and uses golden hover", () => {
    const css = read("app/globals.css");
    expect(css).toContain(".orca-data-row:hover");
    expect(css).toContain("border-color: var(--nc-accent) !important");
    expect(css).toContain(".orca-info-cell");
  });
});
