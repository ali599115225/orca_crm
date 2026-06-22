import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

const { prismaMock, verifyPaymentMock } = vi.hoisted(() => ({
  prismaMock: {
    paymentTransaction: {
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    installment: {
      findFirst: vi.fn(),
      updateMany: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn(async (fn: any) => fn(prismaMock)),
  },
  verifyPaymentMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn(async () => ({ allowed: true, remaining: 59, resetIn: 60_000 })),
}));
vi.mock("@/lib/privacy-mask", () => ({
  redactPiiFromPayload: (p: any) => p,
}));
vi.mock("@/lib/errors", () => ({
  ErrorCode: {
    RATE_LIMITED: "RATE_LIMITED",
    WEBHOOK_INVALID: "WEBHOOK_INVALID",
    NOT_FOUND: "NOT_FOUND",
    BAD_REQUEST: "BAD_REQUEST",
    INTERNAL_ERROR: "INTERNAL_ERROR",
  },
  publicError: (code: string, msg: string) => ({ code, message: msg }),
}));

vi.mock("@/lib/payments/providers/ngenius", () => ({
  ngeniusProvider: {
    code: "NGENIUS",
    verifyPayment: verifyPaymentMock,
  },
}));

import { POST } from "@/app/api/payments/ngenius/webhook/route";

function makeRequest(body: any): NextRequest {
  return new NextRequest("https://orca.test/api/payments/ngenius/webhook", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

describe("N-Genius webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects requests with missing order id", async () => {
    const req = makeRequest({ status: "AUTHORIZED" });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 404 when payment transaction not found", async () => {
    prismaMock.paymentTransaction.findFirst.mockResolvedValue(null);

    const req = makeRequest({ id: "order-1", status: "AUTHORIZED" });

    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it("returns already_processed for COMPLETED payments", async () => {
    prismaMock.paymentTransaction.findFirst.mockResolvedValue({
      id: "tx-1",
      status: "COMPLETED",
      provider: "NGENIUS",
      providerReference: "order-1",
    });

    const req = makeRequest({ id: "order-1", status: "AUTHORIZED" });

    const res = await POST(req);
    const body = await res.json();
    expect(body.status).toBe("already_processed");
  });

  it("verifies order via N-Genius API before processing", async () => {
    prismaMock.paymentTransaction.findFirst.mockResolvedValue({
      id: "tx-1",
      tenantId: "tenant-1",
      status: "PENDING",
      provider: "NGENIUS",
      providerReference: "order-1",
      amount: 500,
      expectedAmountMinor: 500_00,
      expectedCurrency: "SAR",
      installmentId: "inst-1",
    });

    verifyPaymentMock.mockResolvedValue({
      paid: true,
      providerReference: "order-1",
      amountMinorUnits: 500_00,
      currency: "SAR",
      providerStatus: "AUTHORIZED",
    });

    prismaMock.installment.findFirst.mockResolvedValue({
      id: "inst-1",
      tenantId: "tenant-1",
      amountSar: 500,
      paymentStatus: "Pending",
    });

    prismaMock.paymentTransaction.update.mockResolvedValue({});
    prismaMock.installment.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.auditLog.create.mockResolvedValue({});

    const req = makeRequest({ id: "order-1", status: "AUTHORIZED" });

    const res = await POST(req);
    const body = await res.json();

    expect(verifyPaymentMock).toHaveBeenCalledWith("order-1");
    expect(body.status).toBe("processed");
    expect(prismaMock.paymentTransaction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "tx-1" },
        data: expect.objectContaining({
          status: "COMPLETED",
          gatewayStatus: "completed",
        }),
      }),
    );
  });

  it("rejects amount mismatch from N-Genius verification", async () => {
    prismaMock.paymentTransaction.findFirst.mockResolvedValue({
      id: "tx-1",
      tenantId: "tenant-1",
      status: "PENDING",
      provider: "NGENIUS",
      providerReference: "order-1",
      amount: 500,
      expectedAmountMinor: 500_00,
      expectedCurrency: "SAR",
    });

    verifyPaymentMock.mockResolvedValue({
      paid: true,
      providerReference: "order-1",
      amountMinorUnits: 400_00,
      currency: "SAR",
      providerStatus: "AUTHORIZED",
    });

    const req = makeRequest({ id: "order-1", status: "AUTHORIZED" });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("rejects currency mismatch from N-Genius verification", async () => {
    prismaMock.paymentTransaction.findFirst.mockResolvedValue({
      id: "tx-1",
      tenantId: "tenant-1",
      status: "PENDING",
      provider: "NGENIUS",
      providerReference: "order-1",
      amount: 500,
      expectedAmountMinor: 500_00,
      expectedCurrency: "SAR",
    });

    verifyPaymentMock.mockResolvedValue({
      paid: true,
      providerReference: "order-1",
      amountMinorUnits: 500_00,
      currency: "AED",
      providerStatus: "AUTHORIZED",
    });

    const req = makeRequest({ id: "order-1", status: "AUTHORIZED" });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("marks payment as FAILED when N-Genius verification returns not paid", async () => {
    prismaMock.paymentTransaction.findFirst.mockResolvedValue({
      id: "tx-1",
      tenantId: "tenant-1",
      status: "PENDING",
      provider: "NGENIUS",
      providerReference: "order-1",
      installmentId: "inst-1",
    });

    verifyPaymentMock.mockResolvedValue({
      paid: false,
      providerReference: "order-1",
      amountMinorUnits: 500_00,
      currency: "SAR",
      providerStatus: "FAILED",
    });

    prismaMock.paymentTransaction.update.mockResolvedValue({});
    prismaMock.installment.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.auditLog.create.mockResolvedValue({});

    const req = makeRequest({ id: "order-1", status: "FAILED" });

    const res = await POST(req);
    const body = await res.json();

    expect(body.status).toBe("recorded");
    expect(prismaMock.paymentTransaction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "tx-1" },
        data: expect.objectContaining({
          status: "FAILED",
        }),
      }),
    );
  });

  it("processes webhook without Bearer auth (N-Genius does not support it)", async () => {
    prismaMock.paymentTransaction.findFirst.mockResolvedValue({
      id: "tx-1",
      tenantId: "tenant-1",
      status: "PENDING",
      provider: "NGENIUS",
      providerReference: "order-1",
      amount: 500,
      expectedAmountMinor: 500_00,
      expectedCurrency: "SAR",
    });

    verifyPaymentMock.mockResolvedValue({
      paid: true,
      providerReference: "order-1",
      amountMinorUnits: 500_00,
      currency: "SAR",
      providerStatus: "AUTHORIZED",
    });

    prismaMock.paymentTransaction.update.mockResolvedValue({});
    prismaMock.auditLog.create.mockResolvedValue({});

    const req = makeRequest({ id: "order-1", status: "AUTHORIZED" });

    const res = await POST(req);
    const body = await res.json();

    expect(body.status).toBe("processed");
  });

  it("accepts webhook without any auth headers", async () => {
    prismaMock.paymentTransaction.findFirst.mockResolvedValue({
      id: "tx-1",
      tenantId: "tenant-1",
      status: "PENDING",
      provider: "NGENIUS",
      providerReference: "order-1",
      amount: 500,
      expectedAmountMinor: 500_00,
      expectedCurrency: "SAR",
    });

    verifyPaymentMock.mockResolvedValue({
      paid: true,
      providerReference: "order-1",
      amountMinorUnits: 500_00,
      currency: "SAR",
      providerStatus: "AUTHORIZED",
    });

    prismaMock.paymentTransaction.update.mockResolvedValue({});
    prismaMock.auditLog.create.mockResolvedValue({});

    const req = makeRequest({ id: "order-1", status: "AUTHORIZED" });

    const res = await POST(req);
    const body = await res.json();

    expect(body.status).toBe("processed");
  });
});
