import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (relative: string) =>
  readFileSync(join(process.cwd(), relative), "utf8");

const files = [
  "components/real-estate/properties/PropertiesWorkspace.tsx",
  "components/real-estate/tours/ToursWorkspace.tsx",
  "components/real-estate/offers/OffersWorkspace.tsx",
];

describe("real-estate five-row pagination", () => {
  it("uses exactly five records per page in all three workspaces", () => {
    for (const file of files) {
      expect(read(file), file).toContain("const PAGE_SIZE = 5;");
    }
  });

  it("renders only the current page instead of the complete filtered result", () => {
    for (const file of files) {
      const source = read(file);
      expect(source, file).toContain("filtered.slice(");
      expect(source, file).toContain("paged.map((row)");
    }
  });

  it("provides previous and next navigation with disabled boundaries", () => {
    for (const file of files) {
      const source = read(file);
      expect(source, file).toContain('ar ? "السابق" : "Previous"');
      expect(source, file).toContain('ar ? "التالي" : "Next"');
      expect(source, file).toContain("disabled={page <= 1}");
      expect(source, file).toContain("disabled={page >= totalPages}");
    }
  });

  it("returns to the first page when filters change", () => {
    for (const file of files) {
      expect(read(file), file).toContain("setPage(1)");
    }
  });
});
