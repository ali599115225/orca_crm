import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("custom payment reconciliation", () => {
  it("creates a signed return URL", () => {
    const route = source(
      "app/api/v1/installments/[id]/pay/route.ts",
    );
    expect(route).toContain("signCustomPaymentCallback");
    expect(route).toContain("/api/payments/custom/return");
  });

  it("verifies provider status before completion", () => {
    const reconciliation = source(
      "lib/payments/custom-payment-reconciliation.ts",
    );
    expect(reconciliation).toContain("adapter.verifyPayment");
    expect(reconciliation).toContain(
      "completePaymentTransaction",
    );
    expect(reconciliation).toContain(
      "failPaymentTransaction",
    );
  });

  it("keeps webhook processing tenant isolated", () => {
    const webhook = source(
      "app/api/payments/custom/webhook/[connectionId]/route.ts",
    );
    expect(webhook).toContain("tenantId:");
    expect(webhook).toContain(
      "verifyAndStoreProviderWebhook",
    );
    expect(webhook).toContain("providerReference");
  });

  it("requires signed custom webhooks", () => {
    const trust = source(
      "lib/revenue-integrity/trust-gates.ts",
    );
    expect(trust).toContain("webhookSignatureHeader");
    expect(trust).toContain("webhookSecret");
    expect(trust).toContain("webhookReferencePath");
  });
});
