import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = fs.readFileSync(
  path.join(process.cwd(), "lib/domain/transaction-spine/accept-offer.ts"),
  "utf8",
);

const activeStatuses = [
  "OFFER_STATUS.PENDING",
  "OFFER_STATUS.SENT",
  "OFFER_STATUS.NEGOTIATION",
];

function expectActiveCompetitorsCancelled(block: string) {
  expect(block).toContain("const competingOffers = await tx.offer.findMany");
  for (const status of activeStatuses) expect(block).toContain(status);
  expect(block).toContain("for (const competingOffer of competingOffers)");
  expect(block).toContain("status: OFFER_STATUS.CANCELLED");
  expect(block).toContain("competingOffer.auditLog || \"\"");
  expect(block).toContain("Superseded by accepted offer");
}

describe("post-closure offer acceptance remediation", () => {
  it("cancels every active competing offer and returns accepted state in the existing-contract path", () => {
    const start = source.indexOf("if (offer.contract) {");
    const end = source.indexOf("const unit = await tx.unit.findFirst", start);
    const block = source.slice(start, end);

    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    expect(block).toContain("const updatedOffer = await tx.offer.update");
    expect(block).toContain("returnedOffer = { ...offer, ...updatedOffer }");
    expectActiveCompetitorsCancelled(block);
    expect(block).toContain("offer: returnedOffer");
    expect(block.indexOf("const competingOffers = await tx.offer.findMany")).toBeLessThan(
      block.indexOf("return {"),
    );
  });

  it("cancels PENDING, SENT, and NEGOTIATION competitors after creating a new contract", () => {
    const start = source.indexOf("const acceptedOffer = await tx.offer.update");
    const end = source.indexOf("await tx.opportunity.update", start);
    const block = source.slice(start, end);

    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    expectActiveCompetitorsCancelled(block);
  });
});
