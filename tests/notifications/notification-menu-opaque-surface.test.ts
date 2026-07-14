import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(
  resolve(process.cwd(), "app/components/SovereignHeader.tsx"),
  "utf8",
);

describe("Sovereign header notification menu opacity", () => {
  it("renders the menu on a fully opaque theme-aware surface", () => {
    expect(source).toContain("data-notification-opaque-panel");
    expect(source).toContain("bg-white");
    expect(source).toContain("dark:bg-slate-950");
    expect(source).toContain("backdrop-blur-none");
    expect(source).toContain("shadow-[0_24px_80px_rgba(15,23,42,0.34)]");
  });

  it("uses solid read and unread notification item surfaces", () => {
    expect(source).toContain("data-notification-opaque-item");
    expect(source).toContain("bg-slate-50");
    expect(source).toContain("dark:bg-slate-900");
    expect(source).toContain("bg-amber-50");
    expect(source).toContain("dark:bg-slate-800");
  });

  it("does not reuse translucent application surface tokens for the menu", () => {
    const menuStart = source.indexOf("data-notification-opaque-panel");
    const menuEnd = source.indexOf("{/* Language toggle */}", menuStart);
    const menuSource = source.slice(menuStart, menuEnd);
    expect(menuSource).not.toContain("bg-[var(--nc-surface-strong)]");
    expect(menuSource).not.toContain("bg-[var(--nc-accent-soft)]");
  });
});
