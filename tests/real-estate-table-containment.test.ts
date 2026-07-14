import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (relative: string) =>
  readFileSync(join(process.cwd(), relative), "utf8");

describe("real-estate table width containment", () => {
  it("keeps the properties table inside its desktop panel", () => {
    const source = read(
      "components/real-estate/properties/PropertiesWorkspace.tsx",
    );
    expect(source).toContain("min-w-[780px]");
    expect(source).not.toContain("min-w-[900px]");
    expect(source).toContain("h-1.5 w-20");
  });

  it("keeps the offers table inside its desktop panel", () => {
    const source = read(
      "components/real-estate/offers/OffersWorkspace.tsx",
    );
    expect(source).toContain("min-w-[720px]");
    expect(source).not.toContain("min-w-[850px]");
  });

  it("preserves horizontal scrolling for genuinely narrow screens", () => {
    for (const file of [
      "components/real-estate/properties/PropertiesWorkspace.tsx",
      "components/real-estate/offers/OffersWorkspace.tsx",
    ]) {
      expect(read(file), file).toContain("overflow-x-auto");
    }
  });
});
