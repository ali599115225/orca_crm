import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PaymentProviderAdapter } from "@/lib/payments/types";

vi.mock("server-only", () => ({}));

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    paymentTransaction: {
      create: vi.fn(),
      findFirst: vi.fn(),
      updateMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/server/internal", () => ({
  handleSuccessfulPaymentInternal: vi.fn(async () => ({ success: false })),
}));

import {
  createPaymentTransaction,
  initiatePayment,
  processPaymentCallback,
} from "@/lib/payments/service";

function mockAdapter(): PaymentProviderAdapter {
  return {
    code: "MOYASAR",
    createPayment: vi.fn(async () => ({
      providerReference: "REF-001",
      redirectUrl: "https://pay.test/REF-001",
      providerStatus: "initiated",
    })),
    verifyPayment: vi.fn(async () => ({
      paid: true,
      providerReference: "REF-001",
      amountMinorUnits: 299_00,
      currency: "SAR",
      providerStatus: "paid",
    })),
  };
}

beforeEach(() => {
  vi.stubEnv("ENABLED_PAYMENT_PROVIDERS", "MOYASAR,PAYLINK");
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("payment service single-company boundary", () => {
  it("blocks legacy platform payment initiation before DB or provider calls", async () => {
    const adapter = mockAdapter();
    const result = await initiatePayment({
      tenantId: "company-1",
      planCode: "pro",
      providerCode: "MOYASAR",
      adapter,
    });

    expect(result).toMatchObject({
      success: false,
      code: "LEGACY_SAAS_OUT_OF_SCOPE",
    });
    expect(prismaMock.paymentTransaction.create).not.toHaveBeenCalled();
    expect(adapter.createPayment).not.toHaveBeenCalled();
  });

  it("keeps low-level transaction persistence available for future domain adapters", async () => {
    prismaMock.paymentTransaction.create.mockResolvedValue({ id: "tx-1" });

    await expect(
      createPaymentTransaction({
        tenantId: "company-1",
        provider: "MOYASAR",
        planCode: "domain-adapter-placeholder",
        amountMinor: 10_000,
      }),
    ).resolves.toBe("tx-1");

    expect(
      prismaMock.paymentTransaction.create.mock.calls[0][0].data
        .providerReference,
    ).toBeNull();
  });

  it("rejects an unknown callback reference without provider verification", async () => {
    prismaMock.paymentTransaction.findFirst.mockResolvedValue(null);
    const adapter = mockAdapter();

    await expect(
      processPaymentCallback({
        provider: "MOYASAR",
        providerReference: "UNKNOWN",
        adapter,
      }),
    ).resolves.toMatchObject({ ok: false, status: "REJECTED" });
    expect(adapter.verifyPayment).not.toHaveBeenCalled();
  });

  it("blocks legacy platform callbacks before verification or mutation", async () => {
    prismaMock.paymentTransaction.findFirst.mockResolvedValue({
      id: "tx-platform",
      tenantId: "company-1",
      provider: "MOYASAR",
      providerReference: "REF-001",
      invoiceId: null,
      installmentId: null,
      planCode: "pro",
      status: "PENDING",
    });
    const adapter = mockAdapter();

    await expect(
      processPaymentCallback({
        provider: "MOYASAR",
        providerReference: "REF-001",
        adapter,
      }),
    ).resolves.toMatchObject({ ok: false, status: "DEDICATED_BLOCKED" });
    expect(adapter.verifyPayment).not.toHaveBeenCalled();
    expect(prismaMock.paymentTransaction.updateMany).not.toHaveBeenCalled();
  });

  it("preserves business-payment callbacks for their domain processor", async () => {
    prismaMock.paymentTransaction.findFirst.mockResolvedValue({
      id: "tx-invoice",
      tenantId: "company-1",
      provider: "MOYASAR",
      providerReference: "REF-001",
      invoiceId: "invoice-1",
      installmentId: null,
      planCode: null,
      status: "PENDING",
    });
    const adapter = mockAdapter();

    await expect(
      processPaymentCallback({
        provider: "MOYASAR",
        providerReference: "REF-001",
        adapter,
      }),
    ).resolves.toMatchObject({
      ok: true,
      status: "BUSINESS_PAYMENT_PENDING",
    });
    expect(adapter.verifyPayment).not.toHaveBeenCalled();
    expect(prismaMock.paymentTransaction.updateMany).not.toHaveBeenCalled();
  });
});
