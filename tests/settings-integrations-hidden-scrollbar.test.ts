import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(
  resolve(process.cwd(), "components/settings/SettingsIntegrationsHub.tsx"),
  "utf8",
);
const dialog = readFileSync(
  resolve(process.cwd(), "components/operations/OperationsDialog.tsx"),
  "utf8",
);
const operationsCss = readFileSync(
  resolve(process.cwd(), "app/operations/orca-page-contract-v1.css"),
  "utf8",
);

describe("Settings integrations drawer scrollbars", () => {
  it("keeps internal scrolling hidden through the shared Operations dialog contract", () => {
    expect(source).toContain("OperationsDialog");
    expect(dialog).toContain("operationsVisual.dialogBody");
    expect(operationsCss).toContain(".orca-operations-dialog-body");
    expect(operationsCss).toContain("overflow-y: auto");
    expect(operationsCss).toContain("scrollbar-width: none");
    expect(operationsCss).toContain(".orca-operations-dialog-body::-webkit-scrollbar");
    expect(operationsCss).toContain("display: none");
  });
});
