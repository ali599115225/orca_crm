import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) =>
  fs.readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");

const offers = read("components/real-estate/offers/OffersWorkspace.tsx");
const tours = read("components/real-estate/tours/ToursWorkspace.tsx");
const numberField = read("components/operations/OperationsNumberField.tsx");
const masterList = read("components/operations/OperationsMasterList.tsx");
const masterRow = read("components/operations/OperationsMasterRow.tsx");
const dialogCss = read("app/operations/orca-page-contract-v1.css");

describe("Offers and Tours shared visual correction", () => {
  it("removes browser-native number steppers from operation dialogs", () => {
    for (const source of [offers, tours]) {
      expect(source).toContain("OperationsNumberField");
      expect(source).not.toContain('type="number"');
    }

    expect(numberField).toContain('type="text"');
    expect(numberField).toContain('inputMode={mode === "decimal" ? "decimal" : "numeric"}');
    expect(numberField).toContain("normalizeDigits");
  });

  it("moves master-list interaction into shared rounded primitives", () => {
    for (const source of [offers, tours]) {
      expect(source).toContain("OperationsMasterList");
      expect(source).toContain("OperationsMasterRow");
      expect(source).not.toContain(
        '"hover:bg-[var(--nc-surface-soft)] focus-visible:bg-[var(--nc-surface-soft)]"',
      );
    }

    expect(masterList).toContain('"grid gap-1.5 p-1.5"');
    expect(masterRow).toContain("rounded-xl");
    expect(masterRow).toContain("hover:border-[var(--nc-border)]");
    expect(masterRow).toContain("border-[var(--nc-accent-border)] bg-[var(--nc-accent-soft)]");
  });

  it("keeps dialog overflow handling centralized and visually hidden", () => {
    expect(dialogCss).toContain(".orca-operations-dialog-body");
    expect(dialogCss).toContain("scrollbar-width: none");
    expect(dialogCss).toContain(".orca-operations-dialog-body::-webkit-scrollbar");
    expect(dialogCss).toContain("display: none");
  });
});
