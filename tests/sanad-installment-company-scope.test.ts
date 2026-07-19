import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const installmentFindMany = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: {
    installment: { findMany: installmentFindMany },
    lead: { update: vi.fn() },
  },
}));

import { runInstallmentAgentInternal } from "@/lib/server/internal";

describe("SANAD installment company scope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    installmentFindMany.mockResolvedValue([]);
  });

  it("rejects a missing trusted company scope before Prisma", async () => {
    await expect(runInstallmentAgentInternal("")).resolves.toMatchObject({
      success: false,
      error: "COMPANY_SCOPE_REQUIRED",
    });
    expect(installmentFindMany).not.toHaveBeenCalled();
  });

  it("filters installments by the trusted company scope", async () => {
    await expect(
      runInstallmentAgentInternal("company-1"),
    ).resolves.toMatchObject({ success: true });

    expect(installmentFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: "company-1" }),
      }),
    );
  });
});
