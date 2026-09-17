import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(
  resolve(process.cwd(), "app/components/SovereignHeader.tsx"),
  "utf8",
);

const shellCss = readFileSync(
  resolve(process.cwd(), "app/operations/orca-operations-v1.css"),
  "utf8",
);

describe("Sovereign header notification menu — Visual System V1", () => {
  it("uses the V1 operations popover contract", () => {
    expect(source).toContain("data-notification-opaque-panel");
    expect(source).toContain("orca-v1-notification-panel");
    expect(shellCss).toContain(".orca-v1-notification-panel");
    expect(shellCss).toContain("background: var(--nc-surface-solid)");
    expect(shellCss).toContain("backdrop-filter: none");
  });

  it("uses unified rounded read and unread notification rows", () => {
    expect(source).toContain("data-notification-opaque-item");
    expect(source).toContain("orca-v1-notification-item");
    expect(source).toContain("'is-read'");
    expect(source).toContain("'is-unread'");
    expect(shellCss).toContain(".orca-v1-notification-item.is-read");
    expect(shellCss).toContain(".orca-v1-notification-item.is-unread");
    expect(shellCss).toContain("border-radius: 12px");
  });

  it("uses the current ORCA color variables instead of a new palette", () => {
    expect(shellCss).toContain("var(--nc-surface-solid)");
    expect(shellCss).toContain("var(--nc-accent-soft)");
    expect(shellCss).toContain("var(--nc-accent-border)");
    expect(shellCss).not.toContain("--orca-v1-bg:");
    expect(shellCss).not.toContain("--orca-v1-accent:");
  });
});