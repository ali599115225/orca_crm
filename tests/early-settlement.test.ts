import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const mocks = vi.hoisted(() => ({
  contractFindFirst: vi.fn(),
  paymentFindFirst: vi.fn(),
  paymentCount: vi.fn(),
  auditFindFirst: vi.fn(),
  assertTenantOwnership: vi.fn(),
  recordPayment: vi.fn(),
  ensureCorrelationId: vi.fn(() => "corr-1"),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    contract: {
      findFirst: mocks.contractFindFirst,
    },
    paymentTransaction: {
      findFirst: mocks.paymentFindFirst,
      count: mocks.paymentCount,
    },
    auditLog: {
      findFirst: mocks.auditFindFirst,
    },
  },
}));

vi.mock(
  "@/lib/domain/transaction-spine/validate-tenant",
  () => ({
    assertTenantOwnership:
      mocks.assertTenantOwnership,
  }),
);

vi.mock(
  "@/lib/domain/transaction-spine/record-payment",
  () => ({
    recordPayment: mocks.recordPayment,
  }),
);

vi.mock("@/lib/domain/deal-passport", () => ({
  ensureDealCorrelationId:
    mocks.ensureCorrelationId,
}));

import {
  calculateEarlySettlementAmount,
  deriveEarlySettlementPaymentIdempotencyKey,
  earlySettlePaymentPlan,
} from "@/lib/domain/transaction-spine/early-settlement";

function source(relativePath: string): string {
  return fs.readFileSync(
    path.join(process.cwd(), relativePath),
    "utf8",
  );
}

function contractSnapshot(
  paymentPlanStatus = "ACTIVE",
) {
  return {
    id: "contract-1",
    tenantId: "tenant-1",
    legacyFinancial: false,
    spineVersion: 2,
    status: "SIGNED",
    paymentPlan: {
      id: "plan-1",
      status: paymentPlanStatus,
    },
    invoices: [
      {
        id: "invoice-1",
        type: "SALE",
        totalAmount: 1000,
        paymentTransactions: [],
      },
    ],
  };
}

function completedReplayPayment(
  reason = "Close contract",
) {
  return {
    id: "payment-1",
    tenantId: "tenant-1",
    invoiceId: "invoice-1",
    installmentId: null,
    netAmount: 1000,
    method: "EARLY_SETTLEMENT",
    planCode: "EARLY_SETTLEMENT",
    status: "COMPLETED",
    rawPayload: {
      operation: "EARLY_SETTLEMENT",
      reason,
      contractId: "contract-1",
    },
  };
}

function completedReplayAudit(
  reason = "Close contract",
) {
  return {
    id: "audit-1",
    tenantId: "tenant-1",
    action: "EARLY_SETTLEMENT_COMPLETED",
    tableName: "payment_plans",
    recordId: "plan-1",
    details: JSON.stringify({
      contractId: "contract-1",
      invoiceId: "invoice-1",
      paymentTransactionId: "payment-1",
      reason,
      settledAmount: 1000,
    }),
    createdAt: new Date(),
  };
}

describe("Early settlement", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.assertTenantOwnership.mockResolvedValue(
      undefined,
    );

    mocks.contractFindFirst.mockResolvedValue(
      contractSnapshot("ACTIVE"),
    );

    mocks.paymentFindFirst.mockResolvedValue(null);
    mocks.paymentCount.mockResolvedValue(0);

    mocks.auditFindFirst.mockResolvedValue(null);

    mocks.recordPayment.mockResolvedValue({
      payment: {
        id: "payment-new",
        invoiceId: "invoice-1",
        netAmount: 1000,
        method: "EARLY_SETTLEMENT",
        planCode: "EARLY_SETTLEMENT",
        status: "COMPLETED",
      },
      idempotent: false,
    });

    mocks.ensureCorrelationId.mockReturnValue(
      "corr-1",
    );
  });

  it("calculates the exact remaining invoice balance", () => {
    expect(
      calculateEarlySettlementAmount(
        1_000_000,
        275_000,
      ),
    ).toBe(725_000);

    expect(
      calculateEarlySettlementAmount(100, 99.99),
    ).toBe(0.01);
  });

  it("never returns a negative settlement amount", () => {
    expect(
      calculateEarlySettlementAmount(100, 120),
    ).toBe(0);
  });

  it("derives the exact persisted recordPayment idempotency hash", () => {
    const inner = createHash("sha256")
      .update(
        "tenant-1:contract-1:EARLY_SETTLEMENT:key-1",
      )
      .digest("hex");

    const expected = createHash("sha256")
      .update(`tenant-1:${inner}`)
      .digest("hex");

    expect(
      deriveEarlySettlementPaymentIdempotencyKey(
        "tenant-1",
        "contract-1",
        "key-1",
      ),
    ).toBe(expected);
  });

  it("executes a new command only after replay lookup misses", async () => {
    const result = await earlySettlePaymentPlan({
      tenantId: "tenant-1",
      userId: "user-1",
      contractId: "contract-1",
      reason: "Close contract",
      idempotencyKey: "key-1",
    });

    expect(mocks.paymentFindFirst).toHaveBeenCalledTimes(1);

    expect(mocks.recordPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "tenant-1",
        invoiceId: "invoice-1",
        amount: 1000,
        method: "EARLY_SETTLEMENT",
        planCode: "EARLY_SETTLEMENT",
        metadata: {
          operation: "EARLY_SETTLEMENT",
          reason: "Close contract",
          contractId: "contract-1",
        },
      }),
    );

    expect(result.idempotent).toBe(false);
  });

  it("replays the same completed settlement before requiring ACTIVE plan", async () => {
    mocks.contractFindFirst.mockResolvedValue(
      contractSnapshot("COMPLETED"),
    );

    mocks.paymentFindFirst.mockResolvedValue(
      completedReplayPayment(),
    );

    mocks.auditFindFirst.mockResolvedValue(
      completedReplayAudit(),
    );

    const result = await earlySettlePaymentPlan({
      tenantId: "tenant-1",
      userId: "user-1",
      contractId: "contract-1",
      reason: "Close contract",
      idempotencyKey: "key-1",
    });

    expect(result).toMatchObject({
      settlementAmount: 1000,
      idempotent: true,
    });

    expect(result.payment.id).toBe("payment-1");

    expect(mocks.paymentCount).not.toHaveBeenCalled();
    expect(mocks.recordPayment).not.toHaveBeenCalled();
  });

  it("fails closed when the same key conflicts with completed command metadata", async () => {
    mocks.contractFindFirst.mockResolvedValue(
      contractSnapshot("COMPLETED"),
    );

    mocks.paymentFindFirst.mockResolvedValue(
      completedReplayPayment("Original reason"),
    );

    await expect(
      earlySettlePaymentPlan({
        tenantId: "tenant-1",
        userId: "user-1",
        contractId: "contract-1",
        reason: "Different reason",
        idempotencyKey: "key-1",
      }),
    ).rejects.toThrow(
      "Idempotency key conflicts",
    );

    expect(mocks.recordPayment).not.toHaveBeenCalled();
  });

  it("fails closed when the matching prior payment is still in progress", async () => {
    mocks.paymentFindFirst.mockResolvedValue({
      ...completedReplayPayment(),
      status: "PENDING",
      rawPayload: null,
    });

    await expect(
      earlySettlePaymentPlan({
        tenantId: "tenant-1",
        userId: "user-1",
        contractId: "contract-1",
        reason: "Close contract",
        idempotencyKey: "key-1",
      }),
    ).rejects.toThrow(
      "still in progress",
    );

    expect(mocks.recordPayment).not.toHaveBeenCalled();
  });

  it("does not treat FAILED or REVIEW_REQUIRED attempts as successful replay", async () => {
    for (const status of [
      "FAILED",
      "REVIEW_REQUIRED",
    ]) {
      mocks.paymentFindFirst.mockResolvedValue({
        ...completedReplayPayment(),
        status,
      });

      await expect(
        earlySettlePaymentPlan({
          tenantId: "tenant-1",
          userId: "user-1",
          contractId: "contract-1",
          reason: "Close contract",
          idempotencyKey: "key-1",
        }),
      ).rejects.toThrow(
        "not a completed replay",
      );
    }
  });

  it("rejects a genuinely new command against an already completed plan", async () => {
    mocks.contractFindFirst.mockResolvedValue(
      contractSnapshot("COMPLETED"),
    );

    mocks.paymentFindFirst.mockResolvedValue(null);

    await expect(
      earlySettlePaymentPlan({
        tenantId: "tenant-1",
        userId: "user-1",
        contractId: "contract-1",
        reason: "New settlement",
        idempotencyKey: "new-key",
      }),
    ).rejects.toThrow(
      "Only active payment plans can be settled early.",
    );

    expect(mocks.recordPayment).not.toHaveBeenCalled();
  });

  it("requires durable settlement audit evidence for a completed replay", async () => {
    mocks.contractFindFirst.mockResolvedValue(
      contractSnapshot("COMPLETED"),
    );

    mocks.paymentFindFirst.mockResolvedValue(
      completedReplayPayment(),
    );

    mocks.auditFindFirst.mockResolvedValue(null);

    await expect(
      earlySettlePaymentPlan({
        tenantId: "tenant-1",
        userId: "user-1",
        contractId: "contract-1",
        reason: "Close contract",
        idempotencyKey: "key-1",
      }),
    ).rejects.toThrow(
      "evidence is incomplete or conflicting",
    );

    expect(mocks.recordPayment).not.toHaveBeenCalled();
  });

  it("keeps settlement amount server-owned and finalizes in reconciliation", () => {
    const command = source(
      "lib/domain/transaction-spine/early-settlement.ts",
    );

    const route = source(
      "app/api/v1/contracts/[id]/early-settlement/route.ts",
    );

    const reconciliation = source(
      "lib/domain/transaction-spine/payment-reconciliation.ts",
    );

    expect(route).not.toContain("body.amount");

    expect(command).toContain(
      "calculateEarlySettlementAmount",
    );

    expect(command).toContain(
      "PAYMENT_METHOD.EARLY_SETTLEMENT",
    );

    expect(reconciliation).toContain(
      'action: "EARLY_SETTLEMENT_COMPLETED"',
    );

    expect(reconciliation).toContain(
      'eventType: "payment_plan.early_settled"',
    );

    expect(reconciliation).toContain(
      "INSTALLMENT_STATUS.CANCELLED",
    );

    expect(reconciliation).toContain(
      "Payment exceeds the invoice remaining balance.",
    );
  });

  it("prevents full settlement through the restructure command", () => {
    const restructure = source(
      "lib/domain/transaction-spine/restructure-payment-plan.ts",
    );

    expect(restructure).toContain(
      "Use the dedicated early settlement command.",
    );
  });
});