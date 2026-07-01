import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  SYSTEM_CLIENT_ALLOWLIST_MODULES,
  isAllowlistedSystemClient,
} from "@/lib/system-prisma-boundary";

function collectRuntimeSourceFiles(): string[] {
  const root = process.cwd();
  const dirs = ["app", "lib"];
  const files: string[] = [];

  function walk(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (
        entry.name.endsWith(".ts") &&
        !entry.name.endsWith(".test.ts") &&
        !entry.name.endsWith(".d.ts")
      ) {
        files.push(path.relative(root, full).replace(/\\/g, "/"));
      }
    }
  }

  for (const d of dirs) {
    const full = path.join(root, d);
    if (fs.existsSync(full)) walk(full);
  }

  return files;
}

function fileImportsRawPrisma(filePath: string): boolean {
  const content = fs.readFileSync(filePath, "utf8");
  return /import\s+.*\brawPrisma\b.*from\s+["'].*prisma["']/.test(content);
}

describe("R01 raw/system Prisma client boundary", () => {
  const sourceFiles = collectRuntimeSourceFiles();
  const rawImportFiles = sourceFiles.filter((f) => fileImportsRawPrisma(f));

  it("documents the allowlist with at least 15 entries", () => {
    expect(SYSTEM_CLIENT_ALLOWLIST_MODULES.length).toBeGreaterThanOrEqual(15);
  });

  it("every runtime rawPrisma import is in the allowlist", () => {
    const violations = rawImportFiles.filter(
      (f) => !isAllowlistedSystemClient(f),
    );
    expect(violations).toEqual([]);
  });

  it("every allowlist entry corresponds to an existing file", () => {
    const root = process.cwd();
    const missing = SYSTEM_CLIENT_ALLOWLIST_MODULES.filter(
      (mod) => !fs.existsSync(path.join(root, mod)),
    );
    expect(missing).toEqual([]);
  });

  it("no tenant-facing route handler imports rawPrisma directly", () => {
    const routeViolations = rawImportFiles.filter(
      (f) =>
        f.startsWith("app/api/") &&
        !f.includes("/cron/") &&
        !f.includes("/auth/login/") &&
        !f.includes("/db-init/"),
    );
    expect(routeViolations).toEqual([]);
  });

  it("no unused rawPrisma imports exist in runtime files", () => {
    const root = process.cwd();
    const unused: string[] = [];
    for (const f of rawImportFiles) {
      const content = fs.readFileSync(path.join(root, f), "utf8");
      const usagePattern = /rawPrisma\./g;
      const matches = content.match(usagePattern);
      if (!matches || matches.length === 0) {
        unused.push(f);
      }
    }
    expect(unused).toEqual([]);
  });

  it("lib/prisma.ts is the only file that creates the raw client", () => {
    const root = process.cwd();
    const creators = sourceFiles.filter((f) => {
      const content = fs.readFileSync(path.join(root, f), "utf8");
      return /createRawPrismaClient|new PrismaClient\s*\(/.test(content);
    });
    expect(creators).toEqual(["lib/prisma.ts"]);
  });
});
