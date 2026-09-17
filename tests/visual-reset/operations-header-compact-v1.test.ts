import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const css = fs.readFileSync(
  path.join(root, "app/operations/orca-operations-v1.css"),
  "utf8",
);
const header = fs.readFileSync(
  path.join(root, "app/components/SovereignHeader.tsx"),
  "utf8",
);

describe("ORCA zero-base responsive header", () => {
  it("does not use the rejected three-thirds desktop layout", () => {
    expect(css).not.toContain("width: 33.333333%");
    expect(css).not.toContain("V0.3 COMPACT");
    expect(css).toContain('grid-template-areas: "start search actions";');
  });

  it("uses a two-row mobile header while preserving search", () => {
    expect(css).toContain('"start actions"');
    expect(css).toContain('"search search"');
    expect(header).toContain('id="global-search"');
  });

  it("keeps language and theme controls available in the header", () => {
    expect(header).toContain("onClick={toggleLang}");
    expect(header).toContain("onClick={toggleTheme}");
  });

  it("keeps the desktop surface inset rather than full-bleed", () => {
    expect(css).toContain("border-radius: 18px;");
    expect(css).toContain("padding: 12px;");
    expect(css).toContain("gap: 12px;");
  });
});