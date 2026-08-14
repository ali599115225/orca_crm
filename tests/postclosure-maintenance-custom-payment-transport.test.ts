import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function source(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("post-closure custom payment transport hardening", () => {
  it("delegates URL validation and JSON transport to the shared public HTTPS boundary", () => {
    const adapter = source("lib/payments/providers/custom-payment.ts");
    expect(adapter).toContain('from "@/lib/net/public-https"');
    expect(adapter).toContain("publicHttpsJsonRequest");
    expect(adapter).toContain("requirePublicProviderUrl");
    expect(adapter).toContain("CUSTOM_PAYMENT_PRIVATE_HOST_BLOCKED");
    expect(adapter).toContain("CUSTOM_PAYMENT_RESPONSE_ABORTED");
    expect(adapter).toContain("CUSTOM_PAYMENT_RESPONSE_TOO_LARGE");
    expect(adapter).toContain("CUSTOM_PAYMENT_TIMEOUT");
    expect(adapter).not.toContain("response.on(\"aborted\"");
  });

  it("validates the connected socket address and rejects truncated responses in the shared transport", () => {
    const shared = source("lib/net/public-https.ts");
    expect(shared).toContain("lookup: safeSocketLookup");
    expect(shared).toContain("assertPublicAddress(address)");
    expect(shared).toContain("PROVIDER_PRIVATE_HOST_BLOCKED");
    expect(shared).toContain("response.once(\"error\", (error) => settle(reject, error))");
    expect(shared).toContain("response.once(\"close\"");
    expect(shared).toContain("!response.readableEnded");
    expect(shared).toContain("PROVIDER_RESPONSE_ABORTED");
    expect(shared).toContain("PROVIDER_RESPONSE_TOO_LARGE");
    expect(shared).not.toContain("response.on(\"aborted\"");
  });
});
