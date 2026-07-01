import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  paymentPlanFindFirst: vi.fn(),
  paymentPlanUpdateMany: vi.fn(),
  paymentPlanCreate: vi.fn(),
  paymentPlanDeleteMany: vi.fn(),
  contractFindFirst: vi.fn(),
  contractDeleteMany: vi.fn(),
  contractUpdateMany: vi.fn(),
  unitUpdateMany: vi.fn(),
  auditLogCreate: vi.fn(),
  txPaymentPlanFindFirst: vi.fn(),
  txPaymentPlanUpdateMany: vi.fn(),
  txPaymentPlanCreate: vi.fn(),
  txPaymentPlanDeleteMany: vi.fn(),
  txPaymentPlanFindFirstOrThrow: vi.fn(),
  txContractFindFirst: vi.fn(),
  txContractDeleteMany: vi.fn(),
  txContractUpdateMany: vi.fn(),
  txInstallmentUpdateMany: vi.fn(),
  txInstallmentDeleteMany: vi.fn(),
  txInstallmentFindMany: vi.fn(),
  txInstallmentCount: vi.fn(),
  txAuditLogCreate: vi.fn(),
  txTelemetryEventCreate: vi.fn(),
  txPaymentTransactionCount: vi.fn(),
  txDealPassportFindFirst: vi.fn(),
  txDealEventFindFirst: vi.fn(),
  txDealEventCreate: vi.fn(),
}));

const TX = {
  paymentPlan: {
    findFirst: mocks.txPaymentPlanFindFirst,
    updateMany: mocks.txPaymentPlanUpdateMany,
    create: mocks.txPaymentPlanCreate,
    deleteMany: mocks.txPaymentPlanDeleteMany,
    findFirstOrThrow: mocks.txPaymentPlanFindFirstOrThrow,
  },
  contract: {
    findFirst: mocks.txContractFindFirst,
    deleteMany: mocks.txContractDeleteMany,
    updateMany: mocks.txContractUpdateMany,
  },
  installment: {
    updateMany: mocks.txInstallmentUpdateMany,
    deleteMany: mocks.txInstallmentDeleteMany,
    findMany: mocks.txInstallmentFindMany,
    count: mocks.txInstallmentCount,
  },
  auditLog: {
    create: mocks.txAuditLogCreate,
  },
  telemetryEvent: {
    create: mocks.txTelemetryEventCreate,
  },
  paymentTransaction: {
    count: mocks.txPaymentTransactionCount,
  },
  dealPassport: {
    findFirst: mocks.txDealPassportFindFirst,
  },
  dealEvent: {
    findFirst: mocks.txDealEventFindFirst,
    create: mocks.txDealEventCreate,
  },
};

vi.mock("@/lib/prisma", () => ({
  prisma: {
    paymentPlan: {
      findFirst: mocks.paymentPlanFindFirst,
      updateMany: mocks.paymentPlanUpdateMany,
      create: mocks.paymentPlanCreate,
      deleteMany: mocks.paymentPlanDeleteMany,
    },
    contract: {
      findFirst: mocks.contractFindFirst,
      deleteMany: mocks.contractDeleteMany,
      updateMany: mocks.contractUpdateMany,
    },
    unit: {
      updateMany: mocks.unitUpdateMany,
    },
    auditLog: {
      create: mocks.auditLogCreate,
    },
    $transaction: vi.fn(async (fn: any) => fn(TX)),
  },
}));

vi.mock("@/lib/vat/engine", () => ({
  calculateVat: (amount: number) => ({
    subtotal: amount,
    vatAmount: amount * 0.15,
    totalAmount: amount * 1.15,
  }),
}));

import {
  configurePaymentPlan,
  ensureDefaultPaymentPlan,
} from "@/lib/domain/transaction-spine/payment-plan";

const TENANT_A = "tenant-a";
const TENANT_B = "tenant-b";
const CONTRACT_ID = "contract-1";
const USER_ID = "user-a";

describe("R01-E PaymentPlan mutation isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.txTelemetryEventCreate.mockReturnValue({ catch: () => {} });
  });

  describe("configurePaymentPlan", () => {
    it("enforces tenantId on the payment plan find-first before upsert", async () => {
      mocks.contractFindFirst.mockResolvedValue({
        id: CONTRACT_ID,
        tenantId: TENANT_A,
        totalVolumeSar: 100000,
        vatType: "STANDARD",
        status: "PENDING_SIGNATURE",
        spineVersion: 2,
        legacyFinancial: false,
        invoices: [],
      });
      mocks.txContractFindFirst.mockResolvedValue({
        id: CONTRACT_ID,
        tenantId: TENANT_A,
        totalVolumeSar: 100000,
        vatType: "STANDARD",
        status: "PENDING_SIGNATURE",
        spineVersion: 2,
        legacyFinancial: false,
        invoices: [],
      });
      mocks.txPaymentPlanFindFirst.mockResolvedValue(null);
      mocks.txPaymentPlanCreate.mockResolvedValue({
        id: "plan-1",
        tenantId: TENANT_A,
        contractId: CONTRACT_ID,
      });
      mocks.txAuditLogCreate.mockResolvedValue({});

      await configurePaymentPlan({
        tenantId: TENANT_A,
        userId: USER_ID,
        contractId: CONTRACT_ID,
        template: "SINGLE_PAYMENT",
      });

      expect(mocks.txPaymentPlanFindFirst).toHaveBeenCalledWith({
        where: { contractId: CONTRACT_ID, tenantId: TENANT_A },
      });
    });

    it("creates the payment plan with the caller tenantId", async () => {
      mocks.contractFindFirst.mockResolvedValue({
        id: CONTRACT_ID,
        tenantId: TENANT_A,
        totalVolumeSar: 100000,
        vatType: "STANDARD",
        status: "PENDING_SIGNATURE",
        spineVersion: 2,
        legacyFinancial: false,
        invoices: [],
      });
      mocks.txContractFindFirst.mockResolvedValue({
        id: CONTRACT_ID,
        tenantId: TENANT_A,
        totalVolumeSar: 100000,
        vatType: "STANDARD",
        status: "PENDING_SIGNATURE",
        spineVersion: 2,
        legacyFinancial: false,
        invoices: [],
      });
      mocks.txPaymentPlanFindFirst.mockResolvedValue(null);
      mocks.txPaymentPlanCreate.mockResolvedValue({ id: "plan-1" });
      mocks.txAuditLogCreate.mockResolvedValue({});

      await configurePaymentPlan({
        tenantId: TENANT_A,
        userId: USER_ID,
        contractId: CONTRACT_ID,
        template: "SINGLE_PAYMENT",
      });

      expect(mocks.txPaymentPlanCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tenantId: TENANT_A }),
        }),
      );
    });

    it("updates with tenantId in the where clause when a plan exists", async () => {
      mocks.contractFindFirst.mockResolvedValue({
        id: CONTRACT_ID,
        tenantId: TENANT_A,
        totalVolumeSar: 100000,
        vatType: "STANDARD",
        status: "PENDING_SIGNATURE",
        spineVersion: 2,
        legacyFinancial: false,
        invoices: [],
      });
      mocks.txContractFindFirst.mockResolvedValue({
        id: CONTRACT_ID,
        tenantId: TENANT_A,
        totalVolumeSar: 100000,
        vatType: "STANDARD",
        status: "PENDING_SIGNATURE",
        spineVersion: 2,
        legacyFinancial: false,
        invoices: [],
      });
      mocks.txPaymentPlanFindFirst.mockResolvedValue({ id: "plan-1", tenantId: TENANT_A });
      mocks.txPaymentPlanUpdateMany.mockResolvedValue({ count: 1 });
      mocks.txPaymentPlanFindFirstOrThrow.mockResolvedValue({ id: "plan-1", tenantId: TENANT_A });
      mocks.txAuditLogCreate.mockResolvedValue({});

      await configurePaymentPlan({
        tenantId: TENANT_A,
        userId: USER_ID,
        contractId: CONTRACT_ID,
        template: "MONTHLY",
        installmentCount: 6,
      });

      expect(mocks.txPaymentPlanUpdateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: "plan-1", tenantId: TENANT_A }),
        }),
      );
    });
  });

  describe("ensureDefaultPaymentPlan", () => {
    it("includes tenantId when checking for existing plan", async () => {
      mocks.contractFindFirst.mockResolvedValue({
        id: CONTRACT_ID,
        tenantId: TENANT_A,
        totalVolumeSar: 100000,
        vatType: "STANDARD",
        acceptedAt: new Date(),
        spineVersion: 2,
        legacyFinancial: false,
      });
      mocks.txContractFindFirst.mockResolvedValue({
        id: CONTRACT_ID,
        tenantId: TENANT_A,
        totalVolumeSar: 100000,
        vatType: "STANDARD",
        acceptedAt: new Date(),
        spineVersion: 2,
        legacyFinancial: false,
      });
      mocks.txPaymentPlanFindFirst.mockResolvedValue({ id: "plan-existing" });

      await ensureDefaultPaymentPlan({
        tenantId: TENANT_A,
        contractId: CONTRACT_ID,
        userId: USER_ID,
      });

      expect(mocks.txPaymentPlanFindFirst).toHaveBeenCalledWith({
        where: { contractId: CONTRACT_ID, tenantId: TENANT_A },
      });
    });
  });
});
