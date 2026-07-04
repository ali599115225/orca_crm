import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
      create: vi.fn(),
    },
    tenant: { update: vi.fn() },
  };
  return { mockIsDedicatedCopy, prismaMock };
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

import { claimPaymentTransaction, processPaymentCallback } from "@/lib/payments/service";
import type { PaymentProviderAdapter } from "@/lib/payments/types";

function mockAdapter(overrides: Partial<PaymentProviderAdapter> = {}): PaymentProviderAdapter {
  return {
    code: "PAYLINK",
    createPayment: vi.fn(),
    verifyPayment: vi.fn(async (ref?: string) => ({
      paid: true,
      providerReference: ref || "REF-001",
      amountMinorUnits: 10000,
      currency: "SAR",
      providerStatus: "paid",
    })),
    ...overrides,
  };
}

function wireTransactionStore(initial: Record<string, any>) {
  const store = { ...initial };

  prismaMock.paymentTransaction.findFirst.mockImplementation(async ({ where }: any) => {
    const providerWhere = where.provider;
    if (providerWhere) {
      if (providerWhere.in) {
        if (!providerWhere.in.includes(store.provider)) return null;
      } else if (typeof providerWhere === "string") {
        if (providerWhere !== store.provider) return null;
      }
    }
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

beforeEach(() => {
  vi.stubEnv("ENABLED_PAYMENT_PROVIDERS", "MOYASAR,PAYLINK");
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("Paylink dual-provider lookup — claimPaymentTransaction", () => {
  it("finds transaction with provider='PAYLINK' (uppercase)", async () => {
    wireTransactionStore({
      id: "tx-1",
      tenantId: "tenant-1",
      provider: "PAYLINK",
      providerReference: "REF-001",
      invoiceId: null,
      installmentId: null,
      planCode: null,
      expectedAmountMinor: 10000,
      expectedCurrency: "SAR",
      status: "PENDING",
    });

    const result = await claimPaymentTransaction("PAYLINK", "REF-001");
    expect(result).not.toBeNull();
    expect(result!.claimed).toBe(true);
  });

  it("finds transaction with provider='paylink' (lowercase) when searching for PAYLINK", async () => {
    wireTransactionStore({
      id: "tx-2",
      tenantId: "tenant-1",
      provider: "paylink",
      providerReference: "REF-002",
      invoiceId: null,
      installmentId: null,
      planCode: null,
      expectedAmountMinor: 10000,
      expectedCurrency: "SAR",
      status: "PENDING",
    });

    const result = await claimPaymentTransaction("PAYLINK", "REF-002");
    expect(result).not.toBeNull();
    expect(result!.claimed).toBe(true);
  });

  it("passes provider.in condition to findFirst for PAYLINK", async () => {
    wireTransactionStore({
      id: "tx-3",
      tenantId: "tenant-1",
      provider: "PAYLINK",
      providerReference: "REF-003",
      status: "PENDING",
    });

    await claimPaymentTransaction("PAYLINK", "REF-003");

    const findFirstCall = prismaMock.paymentTransaction.findFirst.mock.calls[0][0];
    expect(findFirstCall.where.provider).toEqual({ in: ["PAYLINK", "paylink"] });
  });

  it("uses exact provider match for non-PAYLINK providers", async () => {
    wireTransactionStore({
      id: "tx-4",
      tenantId: "tenant-1",
      provider: "MOYASAR",
      providerReference: "REF-004",
      status: "PENDING",
    });

    await claimPaymentTransaction("MOYASAR", "REF-004");

    const findFirstCall = prismaMock.paymentTransaction.findFirst.mock.calls[0][0];
    expect(findFirstCall.where.provider).toBe("MOYASAR");
  });
});

describe("Paylink dual-provider lookup — processPaymentCallback", () => {
  it("finds PAYLINK transaction stored with lowercase 'paylink'", async () => {
    wireTransactionStore({
      id: "tx-5",
      tenantId: "tenant-1",
      provider: "paylink",
      providerReference: "REF-005",
      invoiceId: "invoice-1",
      installmentId: null,
      planCode: null,
      expectedAmountMinor: 10000,
      expectedCurrency: "SAR",
      status: "PENDING",
    });

    const adapter = mockAdapter({ code: "PAYLINK" });
    const result = await processPaymentCallback({
      provider: "PAYLINK",
      providerReference: "REF-005",
      adapter,
    });

    expect(result.ok).toBe(true);
    expect(result.status).toBe("BUSINESS_PAYMENT_PENDING");
  });

  it("finds PAYLINK transaction stored with uppercase 'PAYLINK'", async () => {
    wireTransactionStore({
      id: "tx-6",
      tenantId: "tenant-1",
      provider: "PAYLINK",
      providerReference: "REF-006",
      invoiceId: "invoice-2",
      installmentId: null,
      planCode: null,
      expectedAmountMinor: 10000,
      expectedCurrency: "SAR",
      status: "PENDING",
    });

    const adapter = mockAdapter({ code: "PAYLINK" });
    const result = await processPaymentCallback({
      provider: "PAYLINK",
      providerReference: "REF-006",
      adapter,
    });

    expect(result.ok).toBe(true);
    expect(result.status).toBe("BUSINESS_PAYMENT_PENDING");
  });

  it("uses providerSearchCondition in processPaymentCallback findFirst", async () => {
    wireTransactionStore({
      id: "tx-7",
      tenantId: "tenant-1",
      provider: "PAYLINK",
      providerReference: "REF-007",
      invoiceId: null,
      installmentId: null,
      planCode: "pro",
      expectedAmountMinor: 299_00,
      expectedCurrency: "SAR",
      status: "PENDING",
    });

    const adapter = mockAdapter({ code: "PAYLINK" });
    await processPaymentCallback({
      provider: "PAYLINK",
      providerReference: "REF-007",
      adapter,
    });

    const findFirstCall = prismaMock.paymentTransaction.findFirst.mock.calls[0][0];
    expect(findFirstCall.where.provider).toEqual({ in: ["PAYLINK", "paylink"] });
  });
});
