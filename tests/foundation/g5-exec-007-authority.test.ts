import { describe, expect, it } from "vitest";
import { assertExactAuthority } from "@/lib/offer-management/authority";

const now = new Date("2026-07-27T12:00:00Z");
const identity = {
  tenantId: "tenant",
  opportunityId: "opp",
  unitId: "unit",
  branchId: "branch",
  subjectPartyId: "party",
  customerAccountId: null,
  offerKind: "SALE" as const,
  serviceLine: "SALES" as const,
  recordOrigin: "EXEC007" as const,
};
const context = {
  tenantId: "tenant",
  actorUserId: "user",
  assignmentId: "assignment",
  branchId: "branch",
  serviceLine: "SALES" as const,
  resourceType: "UNIT",
  resourceId: "unit",
  permissions: new Set(["offer.create"]),
  correlationId: "corr",
  now,
};
const assignment = {
  id: "assignment",
  tenantId: "tenant",
  userId: "user",
  branchId: "branch",
  serviceLine: "SALES" as const,
  resourceType: "UNIT",
  resourceId: "unit",
  active: true,
  effectiveFrom: new Date("2026-01-01T00:00:00Z"),
  effectiveTo: null,
};

describe("EXEC-007 exact authority", () => {
  it("T-AUTH-01/T-SCOPE-01/T-SCOPE-02 accepts semantic permission and exact scope", () => {
    expect(() => assertExactAuthority(context, assignment, identity, "offer.create")).not.toThrow();
  });

  it("T-AUTH-02/T-SCOPE-03/T-SCOPE-04 fails closed on tenant, service or resource mismatch", () => {
    expect(() => assertExactAuthority(context, { ...assignment, tenantId: "other" }, identity, "offer.create")).toThrow();
    expect(() => assertExactAuthority(context, { ...assignment, serviceLine: "LEASING" }, identity, "offer.create")).toThrow();
    expect(() => assertExactAuthority(context, { ...assignment, resourceId: "other" }, identity, "offer.create")).toThrow();
  });
});
