import fs from "node:fs";
import path from "node:path";
import {
  describe,
  expect,
  it,
} from "vitest";

function source(relativePath: string): string {
  return fs.readFileSync(
    path.join(process.cwd(), relativePath),
    "utf8",
  );
}

describe("Feature 2 issued SALE invoice immutability", () => {
  it("does not let overdue, restructure, or early settlement mutate issued invoice monetary identity", () => {
    for (const relativePath of [
      "lib/domain/transaction-spine/overdue-authority.ts",
      "lib/domain/transaction-spine/early-settlement.ts",
      "lib/domain/transaction-spine/restructure-payment-plan.ts",
    ]) {
      const runtime = source(relativePath);

      expect(runtime).not.toContain(
        "tx.invoice.update",
      );

      expect(runtime).not.toContain(
        "prisma.invoice.update",
      );
    }
  });

  it("payment reconciliation updates payment state only, not issued invoice monetary fields", () => {
    const runtime = source(
      "lib/domain/transaction-spine/payment-reconciliation.ts",
    );

    const match = runtime.match(
      /await tx\.invoice\.update\(\{[\s\S]*?\n    \}\);/,
    );

    expect(match).not.toBeNull();

    const updateBlock = match?.[0] ?? "";

    expect(updateBlock).not.toMatch(
      /\bsubtotal\s*:/,
    );

    expect(updateBlock).not.toMatch(
      /\bvatRate\s*:/,
    );

    expect(updateBlock).not.toMatch(
      /\bvatAmount\s*:/,
    );

    expect(updateBlock).not.toMatch(
      /\btotalAmount\s*:/,
    );

    expect(updateBlock).not.toMatch(
      /\bcontractId\s*:/,
    );
  });

  it("overdue authority never persists invoice overdue status", () => {
    const runtime = source(
      "lib/domain/transaction-spine/overdue-authority.ts",
    );

    expect(runtime).not.toContain(
      'status: "overdue"',
    );

    expect(runtime).not.toContain(
      "INVOICE_STATUS.OVERDUE",
    );

    expect(runtime).toContain(
      'type: "SALE"',
    );
  });
});