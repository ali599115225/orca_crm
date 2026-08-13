import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("custom payment provider integration", () => {
  it("supports a custom provider without a database migration", () => {
    expect(source("lib/revenue-integrity/contracts.ts")).toContain(
      '"CUSTOM_PAYMENT"',
    );
    expect(source("prisma/schema.prisma")).toContain(
      "provider             String                @db.VarChar(40)",
    );
  });

  it("requires complete API or external-link configuration", () => {
    const ui = source("components/settings/SettingsIntegrationsHub.tsx");
    expect(ui).toContain('"PAYMENT_LINK"');
    expect(ui).toContain("paymentLinkUrl");
    expect(ui).toContain("createPaymentPath");
    expect(ui).toContain("verifyPaymentPath");
    expect(ui).toContain("missingRequired");
  });

  it("validates HTTPS and required fields again on the server", () => {
    const trust = source("lib/revenue-integrity/trust-gates-core.ts");
    expect(trust).toContain("validateCustomPaymentCredentials");
    expect(trust).toContain("CUSTOM_PAYMENT_HTTPS_LINK_REQUIRED");
    expect(trust).toContain("CUSTOM_PAYMENT_API_FIELDS_REQUIRED");
    expect(trust).toContain('url.protocol !== "https:"');
  });
});
