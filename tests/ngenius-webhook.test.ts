import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

const {
  prismaMock,
  verifyPaymentMock,
  completePaymentMock,
  failPaymentMock,
} = vi.hoisted(() => ({
  prismaMock: {
    paymentTransaction: {
      findFirst: vi.fn(),
      updateMany: vi.fn(),
    },
  },
  verifyPaymentMock: vi.fn(),
  completePaymentMock: vi.fn(),
  failPaymentMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/payments/providers/ngenius", () => ({
  ngeniusProvider: {
    code: "NGENIUS",
    verifyPayment: verifyPaymentMock,
  },
}));
vi.mock("@/lib/domain/transaction-spine", () => ({
  PAYMENT_STATUS: {
    PENDING: "PENDING",
    PROCESSING: "PROCESSING",
    COMPLETED: "COMPLETED",
    FAILED: "FAILED",
  },
  completePaymentTransaction: completePaymentMock,
  failPaymentTransaction: failPaymentMock,
}));

import { POST } from "@/app/api/payments/ngenius/webhook/route";

function request(body: unknown) {
  return new NextRequest("https://orca.test/api/payments/ngenius/webhook", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("N-Genius webhook authoritative reconciliation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects payloads without an order reference", async () => {
    const response = await POST(request({ status: "PURCHASED" }));
    expect(response.status).toBe(400);
  });

  it("returns 404 when the internal transaction is missing", async () => {
    prismaMock.paymentTransaction.findFirst.mockResolvedValue(null);
    const response = await POST(request({ id: "order-1" }));
    expect(response.status).toBe(404);
  });

  it("is idempotent for completed transactions", async () => {
    prismaMock.paymentTransaction.findFirst.mockResolvedValue({
      id: "tx-1",
      status: "COMPLETED",
      tenantId: "tenant-1",
    });

    const response = await POST(request({ id: "order-1" }));
    expect((await response.json()).status).toBe("already_completed");
    expect(verifyPaymentMock).not.toHaveBeenCalled();
  });

  it("completes a payment only after provider verification", async () => {
    prismaMock.paymentTransaction.findFirst.mockResolvedValue({
      id: "tx-1",
      status: "PENDING",
      tenantId: "tenant-1",
    });
    verifyPaymentMock.mockResolvedValue({
      paid: true,
      providerReference: "order-1",
      amountMinorUnits: 500_00,
      currency: "SAR",
      providerStatus: "PURCHASED",
      rawPayload: { id: "order-1" },
    });
    completePaymentMock.mockResolvedValue({ idempotent: false });

    const response = await POST(request({ id: "order-1", status: "PURCHASED" }));
    expect(verifyPaymentMock).toHaveBeenCalledWith("order-1");
    expect(completePaymentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        transactionId: "tx-1",
        tenantId: "tenant-1",
        amountMinorUnits: 500_00,
        currency: "SAR",
        providerStatus: "PURCHASED",
      }),
    );
    expect((await response.json()).status).toBe("completed");
  });

  it("keeps non-final provider states in processing", async () => {
    prismaMock.paymentTransaction.findFirst.mockResolvedValue({
      id: "tx-1",
      status: "PENDING",
      tenantId: "tenant-1",
    });
    verifyPaymentMock.mockResolvedValue({
      paid: false,
      providerReference: "order-1",
      amountMinorUnits: 500_00,
      currency: "SAR",
      providerStatus: "PENDING",
      rawPayload: { id: "order-1" },
    });
    prismaMock.paymentTransaction.updateMany.mockResolvedValue({ count: 1 });

    const response = await POST(request({ id: "order-1" }));
    expect(prismaMock.paymentTransaction.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "PROCESSING", gatewayStatus: "PENDING" }),
      }),
    );
    expect(failPaymentMock).not.toHaveBeenCalled();
    expect((await response.json()).status).toBe("pending");
  });

  it("records only final provider failures as failed", async () => {
    prismaMock.paymentTransaction.findFirst.mockResolvedValue({
      id: "tx-1",
      status: "PENDING",
      tenantId: "tenant-1",
    });
    verifyPaymentMock.mockResolvedValue({
      paid: false,
      providerReference: "order-1",
      amountMinorUnits: 500_00,
      currency: "SAR",
      providerStatus: "DECLINED",
      rawPayload: { id: "order-1" },
    });

    const response = await POST(request({ id: "order-1" }));
    expect(failPaymentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        transactionId: "tx-1",
        tenantId: "tenant-1",
        providerStatus: "DECLINED",
      }),
    );
    expect((await response.json()).status).toBe("failed");
  });
});
