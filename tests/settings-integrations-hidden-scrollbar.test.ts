import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(
  resolve(process.cwd(), "components/settings/SettingsIntegrationsHub.tsx"),
  "utf8",
);

describe("Settings integrations drawer scrollbars", () => {
  it("keeps internal scrolling while hiding all drawer scrollbars", () => {
    expect(source.match(/\[scrollbar-width:none\]/g)?.length).toBeGreaterThanOrEqual(3);
    expect(source.match(/\[&::-webkit-scrollbar\]:hidden/g)?.length).toBeGreaterThanOrEqual(3);
    expect(source).toContain("overflow-y-auto");
  });
});
