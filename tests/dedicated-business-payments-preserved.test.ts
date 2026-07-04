import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PaymentProviderAdapter } from "@/lib/payments/types";

vi.mock("server-only", () => ({}));

const {
  mockIsDedicatedCopy,
  prismaMock,
} = vi.hoisted(() => {
  const mockIsDedicatedCopy = vi.fn();
  const prismaMock = {
    paymentTransaction: {
      findFirst: vi.fn(),
      updateMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    tenant: {
      update: vi.fn(),
    },
  };
  return {
    mockIsDedicatedCopy,
    prismaMock,
  };
});

vi.mock("@/lib/deployment-license", () => ({
  isDedicatedCopyDeployment: () => mockIsDedicatedCopy(),
  getDeploymentLicenseMode: () =>
    mockIsDedicatedCopy() ? "DEDICATED_COPY" : "SAAS",
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/server/internal", () => ({
  handleSuccessfulPaymentInternal: vi.fn(async () => ({ success: true })),
}));

import { processPaymentCallback } from "@/lib/payments/service";

function mockAdapter(overrides: Partial<PaymentProviderAdapter> = {}): PaymentProviderAdapter {
  return {
    code: "MOYASAR",
    createPayment: vi.fn(),
    verifyPayment: vi.fn(async (ref?: string) => ({
      paid: true,
      providerReference: ref || "REF-001",
      amountMinorUnits: 299_00,
      currency: "SAR",
      providerStatus: "paid",
    })),
    ...overrides,
  };
}

function wireTransactionStore(initial: Record<string, any>) {
  const store = { ...initial };

  prismaMock.paymentTransaction.findFirst.mockImplementation(async ({ where }: any) => {
    if (where.provider && where.provider !== store.provider) return null;
    if (where.providerReference && where.providerReference !== store.providerReference) return null;
    return { ...store };
  });

  prismaMock.paymentTransaction.updateMany.mockImplementation(async ({ where, data }: any) => {
    const allowed = where.status?.in || [];
    if (where.id === store.id && allowed.includes(store.status)) {
      Object.assign(store, data);
      return { count: 1 };
    }
    return { count: 0 };
  });

  prismaMock.paymentTransaction.findUnique.mockImplementation(async ({ where }: any) => {
    return where.id === store.id ? { ...store } : null;
  });

  prismaMock.paymentTransaction.update.mockImplementation(async ({ where, data }: any) => {
    if (where.id === store.id) Object.assign(store, data);
    return { ...store };
  });

  return store;
}

function setDedicatedCopy(isDedicated: boolean) {
  mockIsDedicatedCopy.mockReturnValue(isDedicated);
}

beforeEach(() => {
  vi.stubEnv("ENABLED_PAYMENT_PROVIDERS", "MOYASAR,PAYLINK");
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("Business Payment Classification", () => {
  it("returns BUSINESS_PAYMENT_PENDING when invoiceId is present", async () => {
    setDedicatedCopy(false);
    wireTransactionStore({
      id: "tx-1",
      tenantId: "tenant-1",
      provider: "MOYASAR",
      providerReference: "REF-001",
      invoiceId: "invoice-123",
      installmentId: null,
      planCode: null,
      expectedAmountMinor: 10000,
      expectedCurrency: "SAR",
      status: "PENDING",
    });

    const adapter = mockAdapter();
    const result = await processPaymentCallback({
      provider: "MOYASAR",
      providerReference: "REF-001",
      adapter,
    });

    expect(result).toMatchObject({
      ok: true,
      status: "BUSINESS_PAYMENT_PENDING",
    });
    expect(adapter.verifyPayment).not.toHaveBeenCalled();
  });

  it("returns BUSINESS_PAYMENT_PENDING when installmentId is present", async () => {
    setDedicatedCopy(false);
    wireTransactionStore({
      id: "tx-2",
      tenantId: "tenant-1",
      provider: "MOYASAR",
      providerReference: "REF-002",
      invoiceId: null,
      installmentId: "installment-456",
      planCode: null,
      expectedAmountMinor: 5000,
      expectedCurrency: "SAR",
      status: "PENDING",
    });

    const adapter = mockAdapter();
    const result = await processPaymentCallback({
      provider: "MOYASAR",
      providerReference: "REF-002",
      adapter,
    });

    expect(result).toMatchObject({
      ok: true,
      status: "BUSINESS_PAYMENT_PENDING",
    });
    expect(adapter.verifyPayment).not.toHaveBeenCalled();
  });

  it("does not classify as business payment when only rawPayload has invoiceId", async () => {
    setDedicatedCopy(false);
    wireTransactionStore({
      id: "tx-3",
      tenantId: "tenant-1",
      provider: "MOYASAR",
      providerReference: "REF-003",
      invoiceId: null,
      installmentId: null,
      rawPayload: { invoiceId: "raw-invoice-789" },
      planCode: "pro",
      expectedAmountMinor: 299_00,
      expectedCurrency: "SAR",
      status: "PENDING",
    });

    const adapter = mockAdapter();
    const result = await processPaymentCallback({
      provider: "MOYASAR",
      providerReference: "REF-003",
      adapter,
    });

    expect(result.ok).toBe(true);
    expect(result.status).toBe("COMPLETED");
    expect(adapter.verifyPayment).toHaveBeenCalled();
  });
});

describe("Dedicated Copy Platform Payment Blocking", () => {
  it("returns DEDICATED_BLOCKED for platform payment in DEDICATED_COPY", async () => {
    setDedicatedCopy(true);
    wireTransactionStore({
      id: "tx-4",
      tenantId: "tenant-1",
      provider: "MOYASAR",
      providerReference: "REF-004",
      invoiceId: null,
      installmentId: null,
      planCode: "pro",
      expectedAmountMinor: 299_00,
      expectedCurrency: "SAR",
      status: "PENDING",
    });

    const adapter = mockAdapter();
    const result = await processPaymentCallback({
      provider: "MOYASAR",
      providerReference: "REF-004",
      adapter,
    });

    expect(result).toMatchObject({
      ok: false,
      status: "DEDICATED_BLOCKED",
    });
    expect(adapter.verifyPayment).not.toHaveBeenCalled();
    expect(prismaMock.tenant.update).not.toHaveBeenCalled();
  });

  it("still returns BUSINESS_PAYMENT_PENDING in DEDICATED_COPY when invoiceId exists", async () => {
    setDedicatedCopy(true);
    wireTransactionStore({
      id: "tx-5",
      tenantId: "tenant-1",
      provider: "MOYASAR",
      providerReference: "REF-005",
      invoiceId: "invoice-999",
      installmentId: null,
      planCode: null,
      expectedAmountMinor: 10000,
      expectedCurrency: "SAR",
      status: "PENDING",
    });

    const adapter = mockAdapter();
    const result = await processPaymentCallback({
      provider: "MOYASAR",
      providerReference: "REF-005",
      adapter,
    });

    expect(result).toMatchObject({
      ok: true,
      status: "BUSINESS_PAYMENT_PENDING",
    });
    expect(adapter.verifyPayment).not.toHaveBeenCalled();
  });
});

describe("Early Exit - No DB Mutations", () => {
  it("does not update transaction status on BUSINESS_PAYMENT_PENDING", async () => {
    setDedicatedCopy(false);
    const store = wireTransactionStore({
      id: "tx-6",
      tenantId: "tenant-1",
      provider: "MOYASAR",
      providerReference: "REF-006",
      invoiceId: "invoice-111",
      installmentId: null,
      planCode: null,
      expectedAmountMinor: 10000,
      expectedCurrency: "SAR",
      status: "PENDING",
    });

    const adapter = mockAdapter();
    await processPaymentCallback({
      provider: "MOYASAR",
      providerReference: "REF-006",
      adapter,
    });

    expect(store.status).toBe("PENDING");
    expect(prismaMock.paymentTransaction.updateMany).not.toHaveBeenCalled();
  });

  it("does not update transaction status on DEDICATED_BLOCKED", async () => {
    setDedicatedCopy(true);
    const store = wireTransactionStore({
      id: "tx-7",
      tenantId: "tenant-1",
      provider: "MOYASAR",
      providerReference: "REF-007",
      invoiceId: null,
      installmentId: null,
      planCode: "pro",
      expectedAmountMinor: 299_00,
      expectedCurrency: "SAR",
      status: "PENDING",
    });

    const adapter = mockAdapter();
    await processPaymentCallback({
      provider: "MOYASAR",
      providerReference: "REF-007",
      adapter,
    });

    expect(store.status).toBe("PENDING");
    expect(prismaMock.paymentTransaction.updateMany).not.toHaveBeenCalled();
  });
});
