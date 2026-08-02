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
  permissions: new Set(["offer.issue"]),
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

describe("EXEC-007 scope revalidation", () => {
  it("T-CHG-01 reloads exact active assignment and semantic permission", () => {
    expect(() => assertExactAuthority(context, assignment, identity, "offer.issue")).not.toThrow();
    expect(() => assertExactAuthority(context, { ...assignment, active: false }, identity, "offer.issue")).toThrow(/inactive/);
  });

  it("T-CHG-02 fails closed when branch, service line or resource scope changed", () => {
    expect(() => assertExactAuthority(context, { ...assignment, branchId: "other" }, identity, "offer.issue")).toThrow(/scope/);
    expect(() => assertExactAuthority(context, { ...assignment, serviceLine: "LEASING" }, identity, "offer.issue")).toThrow(/scope/);
    expect(() => assertExactAuthority(context, { ...assignment, resourceId: "other" }, identity, "offer.issue")).toThrow(/scope/);
  });
});
