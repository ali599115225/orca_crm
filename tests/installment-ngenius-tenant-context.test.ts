import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const route = readFileSync(
  join(
    process.cwd(),
    "app/api/v1/installments/[id]/pay/route.ts",
  ),
  "utf8",
);

describe("installment N-Genius tenant context", () => {
  it("runs the complete payment operation inside authenticated tenant context", () => {
    expect(route).toContain(
      'import { runWithDatabaseSession } from "@/lib/api-auth-guard";',
    );
    expect(route).toContain("return runWithDatabaseSession(");
    expect(route).toContain("NGENIUS_ALLOWED_ROLES");
    expect(route).not.toContain(
      "const session = await requireAuth(request)",
    );
  });

  it("keeps every installment lookup explicitly tenant scoped", () => {
    expect(route).toContain("where: { id, tenantId }");
    expect(route).toContain(
      "where: { tenantId, idempotencyKey: key }",
    );
  });

  it("returns from the gateway to the canonical sales-contract route", () => {
    expect(route).toContain(
      "${appUrl}/operations/rental/sales/contracts/${installment.contract.id}",
    );
    expect(route).not.toContain(
      "${appUrl}/operations/sales/contracts/${installment.contract.id}",
    );
  });
});
