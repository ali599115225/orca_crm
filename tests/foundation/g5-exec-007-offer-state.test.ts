import { describe, expect, it } from "vitest";
import { assertExactOfferIdentity } from "@/lib/offer-management/contracts";

const identity = {
  tenantId: "00000000-0000-4000-8000-000000000001",
  opportunityId: "00000000-0000-4000-8000-000000000002",
  unitId: "00000000-0000-4000-8000-000000000003",
  branchId: "00000000-0000-4000-8000-000000000004",
  subjectPartyId: "00000000-0000-4000-8000-000000000005",
  customerAccountId: null,
  offerKind: "SALE" as const,
  serviceLine: "SALES" as const,
  recordOrigin: "EXEC007" as const,
};

describe("EXEC-007 exact offer identity", () => {
  it("T-OD-01/T-OD-02 accepts one opportunity, one unit and matching kind", () => {
    expect(() => assertExactOfferIdentity(identity)).not.toThrow();
  });

  it("T-OD-03 rejects cross-kind service lines", () => {
    expect(() => assertExactOfferIdentity({ ...identity, serviceLine: "LEASING" })).toThrow(
      /kind and service line/,
    );
  });

  it("T-LEG-01 rejects non-EXEC007 origin", () => {
    expect(() => assertExactOfferIdentity({ ...identity, recordOrigin: "LEGACY" as never })).toThrow(
      /origin/,
    );
  });
});
