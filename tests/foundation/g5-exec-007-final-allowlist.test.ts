import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const allowedPrefixes = [
  ".github/workflows/exec-007-migration-validation.yml",
  "prisma/schema.prisma",
  "prisma/migrations/20260727090000_exec_007_exact_scope_foundation/migration.sql",
  "lib/offer-management/",
  "lib/customer-portal/",
  "lib/exec-007-cutover/",
  "tests/foundation/g5-exec-007-",
];

describe("EXEC-007 final allowlist structural gate", () => {
  it("T-ARCH-01 rejects forbidden implementation imports", () => {
    const files = ["lib/offer-management", "lib/customer-portal", "lib/exec-007-cutover"]
      .flatMap((dir) => fs.readdirSync(path.join(process.cwd(), dir)).map((name) => path.join(dir, name)))
      .filter((file) => file.endsWith(".ts"));
    const text = files.map((file) => fs.readFileSync(path.join(process.cwd(), file), "utf8")).join("\n");
    expect(text).not.toMatch(/createContract|createInvoice|createPaymentPlan|direct Unit\.status/i);
  });

  it("T-MIG-01 keeps all current implementation paths within governed prefixes", () => {
    const expected = [
      "prisma/schema.prisma",
      "prisma/migrations/20260727090000_exec_007_exact_scope_foundation/migration.sql",
      "lib/offer-management/state-machine.ts",
      "lib/customer-portal/session.ts",
      "lib/exec-007-cutover/legacy-guard.ts",
    ];
    expect(expected.every((file) => allowedPrefixes.some((prefix) => file === prefix || file.startsWith(prefix)))).toBe(true);
  });
});
