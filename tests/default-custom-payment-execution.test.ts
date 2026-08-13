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
    expect(trust).toContain(
      'provider: { in: ["NGENIUS", "CUSTOM_PAYMENT", "PAYLINK"] }',
    );
  });

  it("accepts hub payment brands without UNSUPPORTED_PROVIDER", () => {
    const contracts = source("lib/revenue-integrity/contracts.ts");
    const trust = source("lib/revenue-integrity/trust-gates.ts");
    expect(contracts).toContain('"MOYASAR"');
    expect(contracts).toContain('"HYPERPAY"');
    expect(contracts).toContain('"PAYTABS"');
    expect(trust).toContain('provider === "MOYASAR"');
    expect(trust).toContain('provider === "HYPERPAY"');
    expect(trust).toContain('provider === "PAYTABS"');
    expect(trust).toContain('credentials, "publishableKey"');
    expect(trust).toContain('credentials, "entityId"');
    expect(trust).toContain('credentials, "profileId"');
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
    expect(route).toContain('providerCode !== "PAYLINK"');
    expect(route).toContain("createHubPaylinkProvider");
    expect(route).toContain("runtime.credentials.secretKey");
    expect(route).not.toContain("PAYLINK_SECRET_KEY");
    expect(route).toContain("DEFAULT_PAYMENT_PROVIDER_NOT_CONFIGURED");
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
