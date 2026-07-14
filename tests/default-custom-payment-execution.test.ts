import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("default payment provider execution", () => {
  it("selects the connected tenant default provider", () => {
    const trust = source(
      "lib/revenue-integrity/trust-gates.ts",
    );
    expect(trust).toContain(
      "getDefaultPaymentProviderRuntime",
    );
    expect(trust).toContain("tenantId,");
    expect(trust).toContain("isDefault: true");
    expect(trust).toContain('status: "CONNECTED"');
  });

  it("uses a provider-neutral installment route", () => {
    const route = source(
      "app/api/v1/installments/[id]/pay/route.ts",
    );
    expect(route).toContain(
      "getDefaultPaymentProviderRuntime(tenantId)",
    );
    expect(route).toContain(
      "provider: providerCode",
    );
    expect(route).toContain(
      "idempotencyHash",
    );
  });

  it("executes custom API calls with tenant-safe credentials", () => {
    const adapter = source(
      "lib/payments/providers/custom-payment.ts",
    );
    expect(adapter).toContain(
      "createCustomPaymentProvider",
    );
    expect(adapter).toContain(
      '"Idempotency-Key"',
    );
    expect(adapter).toContain(
      "CUSTOM_PAYMENT_PRIVATE_HOST_BLOCKED",
    );
    expect(adapter).toContain(
      "verifyPayment",
    );
  });

  it("keeps the old N-Genius route as a compatibility alias", () => {
    expect(
      source(
        "app/api/v1/installments/[id]/pay/ngenius/route.ts",
      ).trim(),
    ).toBe('export { POST } from "../route";');
  });
});
