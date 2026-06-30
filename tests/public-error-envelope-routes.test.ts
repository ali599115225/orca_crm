import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function walk(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  });
}

describe("P0 public error envelopes in API routes", () => {
  it("does not project public errors down to messageAr only", () => {
    const violations = walk(path.join(process.cwd(), "app", "api"))
      .filter((file) => file.endsWith("route.ts"))
      .filter((file) => {
        const source = fs.readFileSync(file, "utf8");
        return /publicError\([\s\S]{0,500}?\)\.messageAr/.test(source);
      })
      .map((file) => path.relative(process.cwd(), file));

    expect(violations).toEqual([]);
  });
});