import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createCustomPaymentProvider } from "@/lib/payments/providers/custom-payment";

const paymentInput = {
  tenantId: "tenant-1",
  planCode: "plan-1",
  amountMinorUnits: 10_000,
  currency: "SAR",
  description: "ORCA custom payment transport test",
  callbackUrl: "https://orca.test/payments/callback",
  metadata: { internalTransactionId: "transaction-1" },
};

function paymentLinkProvider(paymentLinkUrl: string) {
  return createCustomPaymentProvider({
    baseUrl: null,
    credentials: {
      providerName: "Custom provider",
      integrationMode: "PAYMENT_LINK",
      paymentLinkUrl,
    },
  });
}

describe("post-closure custom payment transport hardening", () => {
  it("delegates API transport and public-address validation to the shared boundary", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "lib/payments/providers/custom-payment.ts"),
      "utf8",
    );

    expect(source).toContain("publicHttpsJsonRequest");
    expect(source).toContain("requireSharedPublicProviderUrl");
    expect(source).not.toContain('from "node:dns"');
    expect(source).not.toContain('from "node:dns/promises"');
    expect(source).not.toContain('from "node:https"');
    expect(source).not.toContain("safeSocketLookup");
  });

  it.each([
    "https://127.0.0.1/pay",
    "https://192.168.1.10/pay",
    "https://[::1]/pay",
    "https://[::ffff:127.0.0.1]/pay",
    "https://[::ffff:7f00:1]/pay",
    "https://[ff02::1]/pay",
    "https://192.0.2.1/pay",
    "https://198.18.0.1/pay",
    "https://198.51.100.1/pay",
    "https://203.0.113.1/pay",
  ])("rejects a non-public payment-link destination: %s", async (paymentLinkUrl) => {
    await expect(
      paymentLinkProvider(paymentLinkUrl).createPayment(paymentInput),
    ).rejects.toThrow("CUSTOM_PAYMENT_PRIVATE_HOST_BLOCKED");
  });

  it.each([
    "https://8.8.8.8/pay",
    "https://1.1.1.1/pay",
    "https://[2606:4700:4700::1111]/pay",
    "https://[::ffff:8.8.8.8]/pay",
    "https://[::ffff:808:808]/pay",
  ])("accepts a public HTTPS payment-link literal: %s", async (paymentLinkUrl) => {
    const result = await paymentLinkProvider(paymentLinkUrl).createPayment(paymentInput);

    expect(result.providerReference).toBe("transaction-1");
    expect(result.providerStatus).toBe("LINK_READY");
    expect(new URL(result.redirectUrl).protocol).toBe("https:");
  });
});
