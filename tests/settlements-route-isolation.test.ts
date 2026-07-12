import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  paymentFindMany: vi.fn(),
  leaseFindMany: vi.fn(),
  runWithDatabaseSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    paymentTransaction: { findMany: mocks.paymentFindMany },
    rentalLease: { findMany: mocks.leaseFindMany },
  },
}));

vi.mock("@/lib/api-auth-guard", () => ({
  TENANT_ROLES: ["ADMIN"],
  runWithDatabaseSession: mocks.runWithDatabaseSession,
}));

vi.mock("@/lib/errors", () => ({
  ErrorCode: { INTERNAL_ERROR: "INTERNAL_ERROR" },
}));

vi.mock("@/lib/http-error-response", () => ({
  httpErrorResponse: vi.fn(),
}));

import { GET } from "../app/api/v1/settlements/route";

describe("GET /api/v1/settlements", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.runWithDatabaseSession.mockImplementation(
      async (_request, _roles, handler) =>
        handler({ tenantId: "tenant-a", userId: "user-a", role: "ADMIN" }),
    );
    mocks.paymentFindMany.mockResolvedValue([]);
    mocks.leaseFindMany.mockResolvedValue([]);
  });

  it("tenant-scopes sale and rental settlement reads", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/v1/settlements"),
    );

    expect(response.status).toBe(200);
    expect(mocks.paymentFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: "tenant-a",
          status: "COMPLETED",
          method: "EARLY_SETTLEMENT",
        }),
      }),
    );
    expect(mocks.leaseFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tenantId: "tenant-a",
          financialRef: { not: null },
        },
      }),
    );
  });

  it("maps an early-settlement payment to a linked contract record", async () => {
    mocks.paymentFindMany.mockResolvedValue([
      {
        id: "payment-1",
        amount: "820000",
        fee: "0",
        netAmount: "820000",
        currency: "SAR",
        providerReference: "settlement-1",
        paidAt: new Date("2026-06-22T22:18:49.539Z"),
        createdAt: new Date("2026-06-22T22:18:49.539Z"),
        invoice: {
          contractId: "contract-1",
          invoiceNumber: 5,
          invoicePrefix: "INV",
          contract: {
            buyerName: "Buyer",
            unit: {
              unitNumber: "U-140",
              project: { name: "Project" },
            },
          },
        },
      },
    ]);

    const response = await GET(
      new NextRequest("http://localhost/api/v1/settlements"),
    );
    const body = await response.json();

    expect(body.success).toBe(true);
    expect(body.settlements[0]).toMatchObject({
      id: "payment-1",
      type: "SALE",
      contractId: "contract-1",
      customerName: "Buyer",
      gross: 820000,
      net: 820000,
      reference: "settlement-1",
    });
  });
});
