import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("database initialization exposure", () => {
  it("does not expose database initialization through a public API route", () => {
    const route = path.join(
      process.cwd(),
      "app",
      "api",
      "db-init",
      "route.ts",
    );

    expect(fs.existsSync(route)).toBe(false);
  });

  it("keeps the privileged system Prisma boundary internal", () => {
    const boundary = path.join(
      process.cwd(),
      "lib",
      "system-prisma-boundary.ts",
    );

    expect(fs.existsSync(boundary)).toBe(true);
  });
});
