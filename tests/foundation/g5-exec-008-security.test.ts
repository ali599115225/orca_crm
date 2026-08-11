import { describe, expect, it } from "vitest";
import { requireContractFinanceAuthority } from "@/lib/contract-finance/authority";
import { assertMoney, assertPositiveMoney } from "@/lib/contract-finance/contracts";
import type { ContractFinanceActorContext, ScopedResource } from "@/lib/contract-finance/contracts";

const tenantId = "11111111-1111-4111-8111-111111111111";
const branchId = "22222222-2222-4222-8222-222222222222";
const resource: ScopedResource = {
  tenantId,
  branchId,
  resourceType: "contract",
  resourceId: "33333333-3333-4333-8333-333333333333",
};

function actor(role: ContractFinanceActorContext["assignments"][number]["securityRole"], userId = "44444444-4444-4444-8444-444444444444"): ContractFinanceActorContext {
  return {
    tenantId,
    userId,
    assignments: [
      {
        id: "55555555-5555-4555-8555-555555555555",
        tenantId,
        userId,
        securityRole: role,
        scopeType: "BRANCH",
        branchId,
        active: true,
      },
    ],
    enabledBranchServices: [
      { branchId, serviceLine: "FINANCE_AND_COLLECTION", enabled: true },
    ],
  };
}

describe("EXEC-008 — security contracts", () => {
  it("does not grant implicit contract authority to Platform Owner or System Administrator", () => {
    for (const role of ["PLATFORM_OWNER", "SYSTEM_ADMINISTRATOR"] as const) {
      expect(() =>
        requireContractFinanceAuthority({
          actor: actor(role),
          operation: "CONTRACT_SIGN",
          resource,
        }),
      ).toThrow(/authority denied/i);
    }
  });

  it("fails closed for wrong-tenant authority", () => {
    expect(() =>
      requireContractFinanceAuthority({
        actor: actor("FINANCE_MANAGER"),
        operation: "FINANCE_WRITE",
        resource: { ...resource, tenantId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" },
      }),
    ).toThrow(/TENANT_SCOPE_MISMATCH/);
  });

  it("requires an independent refund approver", () => {
    const manager = actor("FINANCE_MANAGER");
    expect(() =>
      requireContractFinanceAuthority({
        actor: manager,
        operation: "REFUND_APPROVE",
        resource,
        initiatedByUserId: manager.userId,
      }),
    ).toThrow(/SEPARATION_OF_DUTIES_DENIED/);

    expect(
      requireContractFinanceAuthority({
        actor: manager,
        operation: "REFUND_APPROVE",
        resource,
        initiatedByUserId: "66666666-6666-4666-8666-666666666666",
      }).permission,
    ).toBe("finance.refund.approve");
  });

  it("uses explicit currency and safe integer minor units", () => {
    expect(assertMoney({ currency: "sar", minorUnits: 1250 })).toEqual({
      currency: "SAR",
      minorUnits: 1250,
    });
    expect(() => assertMoney({ currency: "SA", minorUnits: 100 })).toThrow();
    expect(() => assertMoney({ currency: "SAR", minorUnits: 10.5 })).toThrow();
    expect(() => assertPositiveMoney({ currency: "SAR", minorUnits: 0 })).toThrow();
  });
});
