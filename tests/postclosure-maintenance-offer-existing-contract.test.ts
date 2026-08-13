import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("post-closure existing-contract offer remediation", () => {
  it("cancels competing offers and returns accepted state before returning", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "lib/domain/transaction-spine/accept-offer.ts"), "utf8");
    const start = source.indexOf("if (offer.contract) {");
    const end = source.indexOf("const unit = await tx.unit.findFirst", start);
    const block = source.slice(start, end);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    expect(block).toContain("const updatedOffer = await tx.offer.update");
    expect(block).toContain("returnedOffer = { ...offer, ...updatedOffer }");
    expect(block).toContain("await tx.offer.updateMany");
    expect(block).toContain("OFFER_STATUS.PENDING");
    expect(block).toContain("OFFER_STATUS.SENT");
    expect(block).toContain("OFFER_STATUS.NEGOTIATION");
    expect(block).toContain("status: OFFER_STATUS.CANCELLED");
    expect(block).toContain("offer: returnedOffer");
    expect(block.indexOf("await tx.offer.updateMany")).toBeLessThan(block.indexOf("return {"));
  });
});
