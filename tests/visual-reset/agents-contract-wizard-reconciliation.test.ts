import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const css = fs.readFileSync(
  path.join(root, "app/operations/dashboard/orca-dashboard-v1.css"),
  "utf8",
);
const select = fs.readFileSync(
  path.join(
    root,
    "components/features/contract-wizard/ContractWizardSelect.tsx",
  ),
  "utf8",
);
const wizard = fs.readFileSync(
  path.join(root, "components/features/ContractWizard.tsx"),
  "utf8",
);

describe("Agents + Contract Wizard UX reconciliation", () => {
  it("balances the six desktop agent cards without violating Dashboard height guards", () => {
    const desktopStart = css.indexOf(
      "/* Desktop = compact natural document flow.",
    );
    const tabletStart = css.indexOf("/* Tablet = compact responsive flow");
    expect(desktopStart).toBeGreaterThanOrEqual(0);
    expect(tabletStart).toBeGreaterThan(desktopStart);

    const desktopCss = css.slice(desktopStart, tabletStart);

    expect(desktopCss).toContain(
      "grid-auto-rows: minmax(52px, 1fr);",
    );
    expect(desktopCss).toContain("flex-direction: column;");
    expect(desktopCss).toContain("height: auto !important;");
    expect(desktopCss).not.toContain("grid-template-rows:");
    expect(desktopCss).not.toMatch(/^\s*height:\s*100%;\s*$/m);
  });

  it("adds a configurable search threshold while preserving the default value of two", () => {
    expect(select).toContain("minimumSearchLength?: number;");
    expect(select).toContain("minimumSearchLength = 2");
    expect(select).toContain(
      "normalizedQuery.length < minimumSearchLength",
    );
    expect(select).toContain(
      "minimumSearchLength > 0 && enabledOptions.length > 8",
    );
  });

  it("supports explicit bottom placement within available space", () => {
    expect(select).toContain('placement === "bottom"');
    expect(select).toContain(
      '? Math.max(44, Math.min(280, spaceBelow - 4))',
    );
    expect(select).toContain("? rect.bottom + 4");
  });

  it("scopes immediate names and bottom placement to the client field only", () => {
    expect(wizard.match(/minimumSearchLength=\{0\}/g)).toHaveLength(1);
    expect(wizard.match(/placement="bottom"/g)).toHaveLength(1);
  });
});
