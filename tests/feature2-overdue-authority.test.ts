import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  transaction: vi.fn(),
  ensureCorrelationId: vi.fn(() => "corr-overdue"),
  resolveDeal: vi.fn(),
  appendEvent: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    installment: {
      findMany: mocks.findMany,
    },
    $transaction: mocks.transaction,
  },
}));

vi.mock("@/lib/domain/deal-passport", () => ({
  ensureDealCorrelationId: mocks.ensureCorrelationId,
  resolveDealInTx: mocks.resolveDeal,
  appendDealEventInTx: mocks.appendEvent,
}));

import {
  markSaleInstallmentsOverdue,
} from "@/lib/domain/transaction-spine/overdue-authority";

const asOf = new Date("2026-09-24T00:00:00.000Z");

function candidate() {
  return {
    id: "installment-1",
    contractId: "contract-1",
    invoiceId: "invoice-1",
    paymentPlanId: "plan-1",
    installmentNumber: 2,
    amountSar: "500.00",
    dueDate: new Date("2026-09-20T00:00:00.000Z"),
    paymentStatus: "Pending",
  };
}

function createTx() {
  return {
    installment: {
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    contract: {
      findFirst: vi.fn().mockResolvedValue({
        version: 7,
      }),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({
        id: "audit-1",
      }),
    },
  };
}

describe("Feature 2 SALE overdue authority", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.findMany.mockResolvedValue([]);
    mocks.ensureCorrelationId.mockReturnValue("corr-overdue");
    mocks.resolveDeal.mockResolvedValue({
      passport: {
        id: "deal-1",
        status: "FINANCIALS_ACTIVE",
        lastEventId: "event-before",
      },
      created: false,
      skipped: false,
    });

    mocks.appendEvent.mockResolvedValue({
      passport: {
        id: "deal-1",
        status: "FINANCIALS_ACTIVE",
      },
      event: {
        id: "event-overdue",
      },
      idempotent: false,
      skipped: false,
    });
  });

  it("selects only SALE Pending past-due installments with zero completed allocation", async () => {
    const tx = createTx();

    mocks.transaction.mockImplementation(
      async (callback: any) => callback(tx),
    );

    await markSaleInstallmentsOverdue({
      tenantId: "tenant-1",
      asOf,
    });

    expect(mocks.findMany).toHaveBeenCalledWith({
      where: {
        tenantId: "tenant-1",
        paymentStatus: "Pending",
        dueDate: { lt: asOf },
        invoice: {
          is: {
            type: "SALE",
          },
        },
        payments: {
          none: {
            status: "COMPLETED",
          },
        },
      },
      select: {
        id: true,
        contractId: true,
        invoiceId: true,
        paymentPlanId: true,
        installmentNumber: true,
        amountSar: true,
        dueDate: true,
        paymentStatus: true,
      },
      orderBy: [
        { dueDate: "asc" },
        { installmentNumber: "asc" },
      ],
    });

    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("transitions Pending to Overdue once and emits AuditLog + installment.overdue", async () => {
    const tx = createTx();

    mocks.findMany.mockResolvedValue([candidate()]);
    mocks.transaction.mockImplementation(
      async (callback: any) => callback(tx),
    );

    const result = await markSaleInstallmentsOverdue({
      tenantId: "tenant-1",
      asOf,
    });

    expect(result.processedCount).toBe(1);

    expect(tx.installment.updateMany).toHaveBeenCalledWith({
      where: {
        id: "installment-1",
        tenantId: "tenant-1",
        paymentStatus: "Pending",
        dueDate: { lt: asOf },
        invoice: {
          is: {
            type: "SALE",
          },
        },
        payments: {
          none: {
            status: "COMPLETED",
          },
        },
      },
      data: {
        paymentStatus: "Overdue",
      },
    });

    expect(tx.auditLog.create).toHaveBeenCalledTimes(1);

    expect(mocks.appendEvent).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        tenantId: "tenant-1",
        dealId: "deal-1",
        eventType: "installment.overdue",
        idempotencyKey:
          "installment.overdue:installment-1:contract-v7",
        causationId: "event-before",
        entityType: "installment",
        entityId: "installment-1",
        projection: {
          contractId: "contract-1",
        },
        payload: {
          contractId: "contract-1",
          invoiceId: "invoice-1",
          paymentPlanId: "plan-1",
          installmentNumber: 2,
          contractVersion: 7,
        },
      }),
    );

    const eventInput = mocks.appendEvent.mock.calls[0][1];

    expect(eventInput.projection.status).toBeUndefined();
    expect(eventInput.beforeState.paymentStatus).toBe("Pending");
    expect(eventInput.afterState.paymentStatus).toBe("Overdue");
  });

  it("is idempotent when a second authoritative transition loses the Pending guard", async () => {
    const tx = createTx();

    mocks.findMany.mockResolvedValue([candidate()]);

    tx.installment.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });

    mocks.transaction.mockImplementation(
      async (callback: any) => callback(tx),
    );

    const first = await markSaleInstallmentsOverdue({
      tenantId: "tenant-1",
      asOf,
    });

    const second = await markSaleInstallmentsOverdue({
      tenantId: "tenant-1",
      asOf,
    });

    expect(first.processedCount).toBe(1);
    expect(second.processedCount).toBe(0);

    expect(tx.auditLog.create).toHaveBeenCalledTimes(1);
    expect(mocks.appendEvent).toHaveBeenCalledTimes(1);
  });

  it("does not write AuditLog or DealEvent when the guarded transition does not occur", async () => {
    const tx = createTx();

    mocks.findMany.mockResolvedValue([candidate()]);
    tx.installment.updateMany.mockResolvedValue({
      count: 0,
    });

    mocks.transaction.mockImplementation(
      async (callback: any) => callback(tx),
    );

    const result = await markSaleInstallmentsOverdue({
      tenantId: "tenant-1",
      asOf,
    });

    expect(result.processedCount).toBe(0);
    expect(tx.auditLog.create).not.toHaveBeenCalled();
    expect(mocks.appendEvent).not.toHaveBeenCalled();
  });

  it("uses the persisted contract version to distinguish a later overdue cycle", async () => {
    const tx = createTx();

    mocks.findMany
      .mockResolvedValueOnce([candidate()])
      .mockResolvedValueOnce([candidate()]);

    tx.installment.updateMany.mockResolvedValue({
      count: 1,
    });

    tx.contract.findFirst
      .mockResolvedValueOnce({
        version: 7,
      })
      .mockResolvedValueOnce({
        version: 8,
      });

    mocks.transaction.mockImplementation(
      async (callback: any) => callback(tx),
    );

    const first = await markSaleInstallmentsOverdue({
      tenantId: "tenant-1",
      asOf,
    });

    const second = await markSaleInstallmentsOverdue({
      tenantId: "tenant-1",
      asOf,
    });

    expect(first.processedCount).toBe(1);
    expect(second.processedCount).toBe(1);

    expect(mocks.appendEvent).toHaveBeenCalledTimes(2);

    expect(mocks.appendEvent).toHaveBeenNthCalledWith(
      1,
      tx,
      expect.objectContaining({
        eventType: "installment.overdue",
        idempotencyKey:
          "installment.overdue:installment-1:contract-v7",
      }),
    );

    expect(mocks.appendEvent).toHaveBeenNthCalledWith(
      2,
      tx,
      expect.objectContaining({
        eventType: "installment.overdue",
        idempotencyKey:
          "installment.overdue:installment-1:contract-v8",
      }),
    );
  });
});