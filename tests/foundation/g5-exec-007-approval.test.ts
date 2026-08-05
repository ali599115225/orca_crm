import { describe, expect, it } from "vitest";
import { approvalsAreEffective, assertIndependentApproval } from "@/lib/offer-management/approval";

const requirement = {
  id: "r",
  tenantId: "t",
  offerVersionId: "v",
  approvalType: "EXCEPTION" as const,
  requirementKey: "floor",
  requiredPermission: "offer.approve_exception",
  initiatorUserId: "initiator",
  creatorUserId: "creator",
  lastCommercialEditorId: "editor",
  contentHash: "a".repeat(64),
  pricingHash: "b".repeat(64),
  termsHash: "c".repeat(64),
};

describe("EXEC-007 approvals and SoD", () => {
  it("T-APP-01/T-SOD-01 accepts an independent scoped approver", () => {
    expect(() =>
      assertIndependentApproval(requirement, {
        tenantId: "t",
        actorUserId: "approver",
        assignmentId: "assignment",
        permissions: new Set(["offer.approve_exception"]),
      }),
    ).not.toThrow();
  });

  it("T-APP-02 requires every frozen approval requirement before issuance", () => {
    const second = { ...requirement, id: "r2", requirementKey: "manual" };
    expect(approvalsAreEffective([requirement, second], new Set(["r", "r2"]))).toBe(true);
    expect(approvalsAreEffective([requirement, second], new Set(["r"]))).toBe(false);
  });

  it("T-SOD-02/T-SOD-03/T-SOD-04 rejects creator, editor and initiator", () => {
    for (const actorUserId of ["creator", "editor", "initiator"]) {
      expect(() =>
        assertIndependentApproval(requirement, {
          tenantId: "t",
          actorUserId,
          assignmentId: "assignment",
          permissions: new Set(["offer.approve_exception"]),
        }),
      ).toThrow(/conflicting/);
    }
  });
});
