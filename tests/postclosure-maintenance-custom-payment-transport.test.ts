import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("post-closure custom payment transport hardening", () => {
  it("validates the connected socket address and rejects truncated responses", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "lib/payments/providers/custom-payment.ts"), "utf8");
    expect(source).toContain("lookup: safeSocketLookup");
    expect(source).toContain("assertPublicAddress(address)");
    expect(source).toContain("CUSTOM_PAYMENT_PRIVATE_HOST_BLOCKED");
    expect(source).toContain("response.once(\"error\", reject)");
    expect(source).toContain("response.once(\"close\"");
    expect(source).toContain("!response.readableEnded");
    expect(source).toContain("CUSTOM_PAYMENT_RESPONSE_ABORTED");
    expect(source).toContain("CUSTOM_PAYMENT_RESPONSE_TOO_LARGE");
    expect(source).not.toContain("response.on(\"aborted\"");
  });
});
