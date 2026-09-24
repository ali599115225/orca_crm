import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  contract: null as any,
  amendments: [] as any[],
  snapshots: [] as any[],
  paymentTransactions: [] as any[],
  dealPassports: [] as any[],
  dealEvents: [] as any[],
  snapshotSeq: 0,
  eventSeq: 0,
}));

const mockPrisma = vi.hoisted(() => {
  const tx: any = {
    contract: {
      findFirst: vi.fn(async ({ where }: any) =>
        state.contract && state.contract.id === where.id && state.contract.tenantId === where.tenantId
          ? state.contract
          : null,
      ),
      updateMany: vi.fn(async ({ where, data }: any) => {
        if (!state.contract || state.contract.id !== where.id || state.contract.tenantId !== where.tenantId) {
          return { count: 0 };
        }
        if (where.version !== undefined && state.contract.version !== where.version) {
          return { count: 0 };
        }
        if (data.version?.increment) {
          state.contract.version += data.version.increment;
        }
        return { count: 1 };
      }),
    },
    contractSnapshot: {
      findFirst: vi.fn(async ({ where }: any) =>
        state.snapshots.find((row) => row.id === where.id && row.tenantId === where.tenantId) || null,
      ),
      create: vi.fn(async ({ data }: any) => {
        state.snapshotSeq += 1;
        const row = { id: `snapshot-${state.snapshotSeq}`, ...data };
        state.snapshots.push(row);
        return row;
      }),
    },
    contractAmendment: {
      findFirst: vi.fn(async ({ where }: any) =>
        state.amendments.find((row) => row.id === where.id && row.tenantId === where.tenantId) || null,
      ),
      updateMany: vi.fn(async ({ where, data }: any) => {
        const row = state.amendments.find(
          (item) => item.id === where.id && item.tenantId === where.tenantId && item.status === where.status,
        );
        if (!row) return { count: 0 };
        Object.assign(row, data);
        return { count: 1 };
      }),
    },
    installment: {
      updateMany: vi.fn(async ({ where, data }: any) => {
        const invoice = state.contract?.invoices?.[0];
        if (!invoice) return { count: 0 };
        const inst = (invoice.installments || []).find((i: any) => i.id === where.id);
        if (!inst) return { count: 0 };
        if (data.amountSar !== undefined) inst.amountSar = data.amountSar;
        if (data.dueDate !== undefined) inst.dueDate = data.dueDate;
        if (data.paymentStatus !== undefined) inst.paymentStatus = data.paymentStatus;
        return { count: 1 };
      }),
      findMany: vi.fn(async ({ where }: any) => {
        const invoice = state.contract?.invoices?.[0];
        if (!invoice) return [];
        return (invoice.installments || []).filter((i: any) => {
          if (where.paymentStatus?.not && i.paymentStatus === where.paymentStatus.not) return false;
          return true;
        });
      }),
    },
    paymentPlan: {
      findFirst: vi.fn(async ({ where }: any) =>
        state.contract?.paymentPlan && state.contract.id === where.contractId ? state.contract.paymentPlan : null,
      ),
      updateMany: vi.fn(async ({ where, data }: any) => {
        const plan = state.contract?.paymentPlan;
        if (!plan || plan.id !== where.id) return { count: 0 };
        if (data.version?.increment) plan.version += data.version.increment;
        if (data.scheduleJson !== undefined) plan.scheduleJson = data.scheduleJson;
        if (data.installmentCount !== undefined) plan.installmentCount = data.installmentCount;
        if (data.lastAmendedAt !== undefined) plan.lastAmendedAt = data.lastAmendedAt;
        return { count: 1 };
      }),
    },
    paymentTransaction: {
      count: vi.fn(async ({ where }: any) => {
        return state.paymentTransactions.filter((p) => {
          if (where.tenantId && p.tenantId !== where.tenantId) return false;
          if (where.invoiceId && p.invoiceId !== where.invoiceId) return false;
          if (where.status?.in && !where.status.in.includes(p.status)) return false;
          return true;
        }).length;
      }),
      findMany: vi.fn(async ({ where }: any) => {
        return state.paymentTransactions.filter((p) => {
          if (where.tenantId && p.tenantId !== where.tenantId) return false;
          if (where.invoiceId && p.invoiceId !== where.invoiceId) return false;
          if (where.status && p.status !== where.status) return false;
          return true;
        });
      }),
    },
    dealPassport: {
      findMany: vi.fn(async ({ where }: any) =>
        state.dealPassports.filter(
          (row) =>
            row.tenantId === where.tenantId &&
            (where.OR || []).some((clause: any) =>
              (clause.opportunityId && clause.opportunityId === row.opportunityId) ||
              (clause.contractId && clause.contractId === row.contractId),
            ),
        ),
      ),
      create: vi.fn(async ({ data }: any) => {
        const row = { id: `deal-${state.dealPassports.length + 1}`, createdAt: new Date(), ...data };
        state.dealPassports.push(row);
        return row;
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const row = state.dealPassports.find((item) => item.id === where.id);
        if (!row) throw new Error("deal passport not found");
        Object.assign(row, data);
        return row;
      }),
      findUnique: vi.fn(async ({ where }: any) =>
        state.dealPassports.find((row) => row.id === where.id) || null,
      ),
    },
    dealEvent: {
      findFirst: vi.fn(async ({ where }: any) => {
        if (where.idempotencyKey !== undefined) {
          return (
            state.dealEvents.find(
              (row) => row.tenantId === where.tenantId && row.idempotencyKey === where.idempotencyKey,
            ) || null
          );
        }
        return (
          state.dealEvents.find(
            (row) => row.id === where.id && row.tenantId === where.tenantId && row.dealId === where.dealId,
          ) || null
        );
      }),
      create: vi.fn(async ({ data }: any) => {
        state.eventSeq += 1;
        const row = { id: `event-${state.eventSeq}`, createdAt: new Date(), ...data };
        state.dealEvents.push(row);
        return row;
      }),
    },
  };
  return {
    tx,
    prisma: {
      ...tx,
      $transaction: vi.fn(async (fn: any) => fn(tx)),
    },
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma.prisma }));
vi.mock("@/lib/realtime/publish-sync-event", () => ({
  publishSyncEvent: async () => undefined,
}));

import {
  AMENDMENT_APPLY_APPROVAL_EVIDENCE_MISSING,
  AMENDMENT_APPLY_CONCURRENT_CONFLICT,
  AMENDMENT_APPLY_CONTRACT_MISMATCH,
  AMENDMENT_APPLY_CONTRACT_NOT_ELIGIBLE,
  AMENDMENT_APPLY_CONTRACT_NOT_FOUND,
  AMENDMENT_APPLY_IDEMPOTENCY_KEY_CONTENT_CONFLICT,
  AMENDMENT_APPLY_IDEMPOTENCY_KEY_TYPE_MISMATCH,
  AMENDMENT_APPLY_LIVE_SOURCE_DRIFT,
  AMENDMENT_APPLY_NOT_APPROVED,
  AMENDMENT_APPLY_NOT_FOUND,
  AMENDMENT_APPLY_PAYMENT_PLAN_REQUIRED,
  AMENDMENT_APPLY_PENDING_PAYMENTS_EXIST,
  AMENDMENT_APPLY_PROPOSAL_DUPLICATE_INSTALLMENT,
  AMENDMENT_APPLY_PROPOSAL_FOREIGN_INSTALLMENT,
  AMENDMENT_APPLY_PROPOSAL_INSTALLMENT_NUMBER_MISMATCH,
  AMENDMENT_APPLY_PROPOSAL_INVALID,
  AMENDMENT_APPLY_PROPOSAL_MISSING_INSTALLMENT,
  AMENDMENT_APPLY_PROPOSAL_ZERO_DELTA_VIOLATION,
  AMENDMENT_APPLY_SALE_INVOICE_REQUIRED,
  AMENDMENT_APPLY_SOURCE_SNAPSHOT_DIGEST_MISMATCH,
  AMENDMENT_APPLY_SOURCE_SNAPSHOT_INVALID,
  AMENDMENT_APPLY_SOURCE_SNAPSHOT_MISSING,
  AMENDMENT_APPLY_STALE_VERSION,
  AMENDMENT_APPLY_UNALLOCATED_COMPLETED_PAYMENT,
  applyAmendment,
  verifyAmendmentResultSnapshotDigest,
} from "@/lib/domain/transaction-spine/amendment-apply";
import { buildAmendmentSourceSnapshot } from "@/lib/domain/transaction-spine/amendment-draft";
import {
  EXEC_003_OPERATION_ASSIGNMENTS,
  EXEC_003_PERMISSION_KEYS,
  exec003AssignmentForPermission,
} from "@/lib/auth/exec-003-permission-assignments";

const TENANT = "tenant-1";
const CONTRACT_ID = "contract-1";
const INVOICE_ID = "invoice-1";
const PLAN_ID = "plan-1";
const CREATOR = "user-creator";
const APPROVER = "user-approver";
const APPLIER = "user-applier";

function installment(overrides: Record<string, unknown> = {}) {
  return {
    id: "inst-1",
    installmentNumber: 1,
    amountSar: 1000,
    dueDate: new Date(Date.now() + 30 * 86400000),
    paymentStatus: "Pending",
    payments: [],
    ...overrides,
  };
}

function baseContract(overrides: Record<string, unknown> = {}) {
  const inst1 = installment({ id: "inst-1", installmentNumber: 1, amountSar: 1000, dueDate: new Date(Date.now() + 30 * 86400000) });
  const inst2 = installment({ id: "inst-2", installmentNumber: 2, amountSar: 1000, dueDate: new Date(Date.now() + 60 * 86400000) });
  return {
    id: CONTRACT_ID,
    tenantId: TENANT,
    status: "SIGNED",
    version: 1,
    spineVersion: 2,
    legacyFinancial: false,
    totalVolumeSar: 2000,
    vatType: "STANDARD",
    vatRate: 15,
    invoices: [
      {
        id: INVOICE_ID,
        type: "SALE",
        invoiceNumber: "INV-001",
        invoicePrefix: "INV",
        subtotal: 1739.13,
        vatAmount: 260.87,
        totalAmount: 2000,
        status: "unpaid",
        installments: [inst1, inst2],
      },
    ],
    paymentPlan: {
      id: PLAN_ID,
      template: "CUSTOM",
      status: "ACTIVE",
      totalAmount: 2000,
      scheduleJson: [
        { installmentNumber: 1, amountSar: 1000, dueDate: inst1.dueDate.toISOString() },
        { installmentNumber: 2, amountSar: 1000, dueDate: inst2.dueDate.toISOString() },
      ],
      installmentCount: 2,
      version: 1,
      activatedAt: new Date(),
      lastAmendedAt: null,
    },
    ...overrides,
  };
}

function resetState() {
  state.contract = baseContract();
  state.paymentTransactions = [];

  const sourceBuilt = buildAmendmentSourceSnapshot({
    tenantId: TENANT,
    contract: state.contract,
    invoice: state.contract.invoices[0],
    paymentPlan: state.contract.paymentPlan,
  });

  state.snapshots = [
    {
      id: "snapshot-source-1",
      tenantId: TENANT,
      contractId: CONTRACT_ID,
      contractVersion: 1,
      snapshotType: "AMENDMENT_SOURCE",
      structuredFacts: sourceBuilt.structuredFacts,
      paymentPlanSnapshot: sourceBuilt.paymentPlanSnapshot,
      digest: sourceBuilt.digest,
    },
  ];

  state.amendments = [
    {
      id: "amendment-1",
      tenantId: TENANT,
      contractId: CONTRACT_ID,
      sourceContractVersion: 1,
      sourceSnapshotId: "snapshot-source-1",
      resultingSnapshotId: null,
      title: "Reschedule balance",
      reason: "Buyer cashflow",
      status: "APPROVED",
      approvedBy: APPROVER,
      approvedAt: new Date(Date.now() - 3600000),
      createdBy: CREATOR,
      changesJson: {
        proposedSchedule: [
          {
            installmentId: "inst-1",
            installmentNumber: 1,
            amountSar: 1200,
            dueDate: new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10),
          },
          {
            installmentId: "inst-2",
            installmentNumber: 2,
            amountSar: 800,
            dueDate: new Date(Date.now() + 75 * 86400000).toISOString().slice(0, 10),
          },
        ],
      },
    },
  ];

  state.dealPassports = [
    {
      id: "deal-1",
      tenantId: TENANT,
      contractId: CONTRACT_ID,
      status: "FINANCIALS_ACTIVE",
      version: 3,
      lastSequence: 3,
    },
  ];
  state.dealEvents = [];
  state.snapshotSeq = 1;
  state.eventSeq = 0;
}

function baseInput(overrides: Record<string, unknown> = {}) {
  return {
    tenantId: TENANT,
    userId: APPLIER,
    contractId: CONTRACT_ID,
    amendmentId: "amendment-1",
    idempotencyKey: "apply-key-1",
    ...overrides,
  };
}

describe("Feature 3 — applyAmendment", () => {
  beforeEach(resetState);

  it("1. successful atomic apply: APPROVED -> APPLIED, increments versions, updates installments, creates AMENDMENT_RESULT snapshot, appends DealEvent with status preserved", async () => {
    const result = await applyAmendment(baseInput());

    expect(result.idempotent).toBe(false);
    expect(result.amendment.status).toBe("APPLIED");
    expect(result.amendment.resultingSnapshotId).toBeTruthy();

    expect(result.contract.version).toBe(2);
    expect(state.contract.version).toBe(2);

    expect(result.paymentPlan?.version).toBe(2);
    expect(state.contract.paymentPlan.version).toBe(2);
    expect(state.contract.paymentPlan.lastAmendedAt).toBeInstanceOf(Date);

    // Installments updated
    const inst1 = state.contract.invoices[0].installments[0];
    const inst2 = state.contract.invoices[0].installments[1];
    expect(inst1.amountSar).toBe(1200);
    expect(inst2.amountSar).toBe(800);
    expect(inst1.paymentStatus).toBe("Pending"); // preserved
    expect(inst2.paymentStatus).toBe("Pending"); // preserved

    // Snapshot verified
    const resultSnap = state.snapshots.find((s) => s.id === result.resultingSnapshot.id);
    expect(resultSnap).toBeTruthy();
    expect(resultSnap.snapshotType).toBe("AMENDMENT_RESULT");
    expect(resultSnap.contractVersion).toBe(2);
    expect(resultSnap.approvalSnapshot).toMatchObject({
      amendmentId: "amendment-1",
      sourceSnapshotId: "snapshot-source-1",
      sourceContractVersion: 1,
      approvedBy: APPROVER,
      appliedBy: APPLIER,
    });
    expect(resultSnap.issuedAt).toBeInstanceOf(Date);

    // Read-side verification passes
    expect(() => verifyAmendmentResultSnapshotDigest(resultSnap)).not.toThrow();

    // DealEvent appended
    const applyEvents = state.dealEvents.filter((e) => e.eventType === "amendment.applied");
    expect(applyEvents).toHaveLength(1);
    expect(applyEvents[0].afterState.status).toBe("APPLIED");
    expect(applyEvents[0].afterState.contractVersion).toBe(2);
    expect(applyEvents[0].payload.appliedBy).toBe(APPLIER);

    // DealPassport status preserved
    const passport = state.dealPassports.find((p) => p.id === "deal-1");
    expect(passport.status).toBe("FINANCIALS_ACTIVE");
  });

  it("2. replay with same key succeeds idempotently with zero new writes", async () => {
    const first = await applyAmendment(baseInput());
    const eventCountBefore = state.dealEvents.length;
    const snapCountBefore = state.snapshots.length;

    const replay = await applyAmendment(baseInput());

    expect(replay.idempotent).toBe(true);
    expect(replay.amendment.id).toBe(first.amendment.id);
    expect(replay.resultingSnapshot.id).toBe(first.resultingSnapshot.id);
    expect(state.dealEvents).toHaveLength(eventCountBefore);
    expect(state.snapshots).toHaveLength(snapCountBefore);
  });

  it("3. idempotency conflict with different caller fails closed", async () => {
    await applyAmendment(baseInput());
    await expect(
      applyAmendment(baseInput({ userId: "different-user" })),
    ).rejects.toMatchObject({ code: AMENDMENT_APPLY_IDEMPOTENCY_KEY_CONTENT_CONFLICT });
  });

  it("4. idempotency key type mismatch fails closed", async () => {
    state.dealEvents.push({
      id: "ev-other",
      tenantId: TENANT,
      eventType: "contract.signed",
      entityType: "contract",
      idempotencyKey: "hashed-key-conflict",
    });
    // Use an input that generates this key
    const hashedConflict = "hashed-key-conflict";
    vi.spyOn(mockPrisma.tx.dealEvent, "findFirst").mockResolvedValueOnce({
      id: "ev-other",
      tenantId: TENANT,
      eventType: "contract.signed",
      entityType: "contract",
    });

    await expect(applyAmendment(baseInput())).rejects.toMatchObject({
      code: AMENDMENT_APPLY_IDEMPOTENCY_KEY_TYPE_MISMATCH,
    });
  });

  it("5. tenant isolation: foreign tenant is rejected as contract-not-found", async () => {
    await expect(
      applyAmendment(baseInput({ tenantId: "tenant-other" })),
    ).rejects.toMatchObject({ code: AMENDMENT_APPLY_CONTRACT_NOT_FOUND });
  });

  it("6. foreign contractId on amendment is rejected", async () => {
    state.amendments[0].contractId = "contract-other";
    await expect(applyAmendment(baseInput())).rejects.toMatchObject({
      code: AMENDMENT_APPLY_CONTRACT_MISMATCH,
    });
  });

  it("7. unknown amendmentId is rejected", async () => {
    await expect(
      applyAmendment(baseInput({ amendmentId: "does-not-exist" })),
    ).rejects.toMatchObject({ code: AMENDMENT_APPLY_NOT_FOUND });
  });

  it("8. DRAFT status is rejected", async () => {
    state.amendments[0].status = "DRAFT";
    await expect(applyAmendment(baseInput())).rejects.toMatchObject({
      code: AMENDMENT_APPLY_NOT_APPROVED,
    });
  });

  it("9. already APPLIED amendment is rejected", async () => {
    state.amendments[0].status = "APPLIED";
    await expect(applyAmendment(baseInput())).rejects.toMatchObject({
      code: AMENDMENT_APPLY_NOT_APPROVED,
    });
  });

  it("10. missing approval evidence (null approvedBy / approvedAt) is rejected", async () => {
    state.amendments[0].approvedBy = null;
    await expect(applyAmendment(baseInput())).rejects.toMatchObject({
      code: AMENDMENT_APPLY_APPROVAL_EVIDENCE_MISSING,
    });
  });

  it("11. stale Contract.version is rejected", async () => {
    state.contract.version = 2; // drifted away from amendment.sourceContractVersion = 1
    await expect(applyAmendment(baseInput())).rejects.toMatchObject({
      code: AMENDMENT_APPLY_STALE_VERSION,
    });
  });

  it("12. contract not eligible (e.g. legacyFinancial=true) is rejected", async () => {
    state.contract.legacyFinancial = true;
    await expect(applyAmendment(baseInput())).rejects.toMatchObject({
      code: AMENDMENT_APPLY_CONTRACT_NOT_ELIGIBLE,
    });
  });

  it("13. missing active PaymentPlan is rejected", async () => {
    state.contract.paymentPlan.status = "CANCELLED";
    await expect(applyAmendment(baseInput())).rejects.toMatchObject({
      code: AMENDMENT_APPLY_PAYMENT_PLAN_REQUIRED,
    });
  });

  it("14. missing SALE invoice is rejected", async () => {
    state.contract.invoices = [];
    await expect(applyAmendment(baseInput())).rejects.toMatchObject({
      code: AMENDMENT_APPLY_SALE_INVOICE_REQUIRED,
    });
  });

  it("15. missing source snapshot is rejected", async () => {
    state.snapshots = [];
    await expect(applyAmendment(baseInput())).rejects.toMatchObject({
      code: AMENDMENT_APPLY_SOURCE_SNAPSHOT_MISSING,
    });
  });

  it("16. invalid source snapshot identity is rejected", async () => {
    state.snapshots[0].contractId = "contract-other";
    await expect(applyAmendment(baseInput())).rejects.toMatchObject({
      code: AMENDMENT_APPLY_SOURCE_SNAPSHOT_INVALID,
    });
  });

  it("17. tampered source snapshot digest is rejected", async () => {
    state.snapshots[0].digest = "tampered-digest";
    await expect(applyAmendment(baseInput())).rejects.toMatchObject({
      code: AMENDMENT_APPLY_SOURCE_SNAPSHOT_DIGEST_MISMATCH,
    });
  });

  it("18. live source drift: installment amount changed before apply is rejected", async () => {
    state.contract.invoices[0].installments[0].amountSar = 1500;
    await expect(applyAmendment(baseInput())).rejects.toMatchObject({
      code: AMENDMENT_APPLY_LIVE_SOURCE_DRIFT,
    });
  });

  it("19. live source drift: future dueDate changed before apply is rejected", async () => {
    state.contract.invoices[0].installments[0].dueDate = new Date(Date.now() + 40 * 86400000);
    await expect(applyAmendment(baseInput())).rejects.toMatchObject({
      code: AMENDMENT_APPLY_LIVE_SOURCE_DRIFT,
    });
  });

  it("20. live source drift: paymentStatus changed before apply is rejected", async () => {
    state.contract.invoices[0].installments[0].paymentStatus = "Partial";
    await expect(applyAmendment(baseInput())).rejects.toMatchObject({
      code: AMENDMENT_APPLY_LIVE_SOURCE_DRIFT,
    });
  });

  it("21. live source drift: PaymentPlan.version changed before apply is rejected", async () => {
    state.contract.paymentPlan.version = 2;
    await expect(applyAmendment(baseInput())).rejects.toMatchObject({
      code: AMENDMENT_APPLY_LIVE_SOURCE_DRIFT,
    });
  });

  it("22. live source drift: PaymentPlan.scheduleJson changed before apply is rejected", async () => {
    state.contract.paymentPlan.scheduleJson = [];
    await expect(applyAmendment(baseInput())).rejects.toMatchObject({
      code: AMENDMENT_APPLY_LIVE_SOURCE_DRIFT,
    });
  });

  it("23. live source drift: invoice totalAmount changed before apply is rejected", async () => {
    state.contract.invoices[0].totalAmount = 2500;
    await expect(applyAmendment(baseInput())).rejects.toMatchObject({
      code: AMENDMENT_APPLY_LIVE_SOURCE_DRIFT,
    });
  });

  it("24. live source drift: completed allocated payment occurred before apply is rejected", async () => {
    state.contract.invoices[0].installments[0].payments = [
      { status: "COMPLETED", netAmount: 500 },
    ];
    await expect(applyAmendment(baseInput())).rejects.toMatchObject({
      code: AMENDMENT_APPLY_LIVE_SOURCE_DRIFT,
    });
  });

  it("25. invoice-level unallocated completed payment (installmentId = null) is rejected", async () => {
    state.paymentTransactions.push({
      id: "pt-unallocated",
      tenantId: TENANT,
      invoiceId: INVOICE_ID,
      installmentId: null,
      netAmount: 500,
      status: "COMPLETED",
    });
    await expect(applyAmendment(baseInput())).rejects.toMatchObject({
      code: AMENDMENT_APPLY_UNALLOCATED_COMPLETED_PAYMENT,
    });
  });

  it("26. payment transactions sum != installment paidAmount sum is rejected", async () => {
    state.paymentTransactions.push({
      id: "pt-1",
      tenantId: TENANT,
      invoiceId: INVOICE_ID,
      installmentId: "inst-1",
      netAmount: 500,
      status: "COMPLETED",
    });
    // Installment's payments array not matching
    await expect(applyAmendment(baseInput())).rejects.toMatchObject({
      code: AMENDMENT_APPLY_UNALLOCATED_COMPLETED_PAYMENT,
    });
  });

  it("27. in-flight pending/processing payment transactions are rejected", async () => {
    state.paymentTransactions.push({
      id: "pt-pending",
      tenantId: TENANT,
      invoiceId: INVOICE_ID,
      installmentId: "inst-1",
      netAmount: 500,
      status: "PENDING",
    });
    await expect(applyAmendment(baseInput())).rejects.toMatchObject({
      code: AMENDMENT_APPLY_PENDING_PAYMENTS_EXIST,
    });
  });

  it("28. zero-delta halala violation in proposal is rejected", async () => {
    state.amendments[0].changesJson.proposedSchedule[0].amountSar = 1200.01;
    // Re-sync source snapshot so drift check passes, exposing the zero-delta check
    const sourceBuilt = buildAmendmentSourceSnapshot({
      tenantId: TENANT,
      contract: state.contract,
      invoice: state.contract.invoices[0],
      paymentPlan: state.contract.paymentPlan,
    });
    state.snapshots[0].digest = sourceBuilt.digest;
    state.snapshots[0].structuredFacts = sourceBuilt.structuredFacts;
    state.snapshots[0].paymentPlanSnapshot = sourceBuilt.paymentPlanSnapshot;

    await expect(applyAmendment(baseInput())).rejects.toMatchObject({
      code: AMENDMENT_APPLY_PROPOSAL_ZERO_DELTA_VIOLATION,
    });
  });

  it("29. duplicate installment in proposal is rejected", async () => {
    state.amendments[0].changesJson.proposedSchedule = [
      { installmentId: "inst-1", installmentNumber: 1, amountSar: 1000, dueDate: "2026-12-01" },
      { installmentId: "inst-1", installmentNumber: 1, amountSar: 1000, dueDate: "2026-12-02" },
    ];
    await expect(applyAmendment(baseInput())).rejects.toMatchObject({
      code: AMENDMENT_APPLY_PROPOSAL_DUPLICATE_INSTALLMENT,
    });
  });

  it("30. foreign installment in proposal is rejected", async () => {
    state.amendments[0].changesJson.proposedSchedule = [
      { installmentId: "inst-foreign", installmentNumber: 1, amountSar: 1000, dueDate: "2026-12-01" },
      { installmentId: "inst-2", installmentNumber: 2, amountSar: 1000, dueDate: "2026-12-02" },
    ];
    await expect(applyAmendment(baseInput())).rejects.toMatchObject({
      code: AMENDMENT_APPLY_PROPOSAL_FOREIGN_INSTALLMENT,
    });
  });

  it("31. missing installment in proposal is rejected", async () => {
    state.amendments[0].changesJson.proposedSchedule = [
      { installmentId: "inst-1", installmentNumber: 1, amountSar: 2000, dueDate: "2026-12-01" },
    ];
    await expect(applyAmendment(baseInput())).rejects.toMatchObject({
      code: AMENDMENT_APPLY_PROPOSAL_MISSING_INSTALLMENT,
    });
  });

  it("32. installmentNumber mismatch in proposal is rejected", async () => {
    state.amendments[0].changesJson.proposedSchedule = [
      { installmentId: "inst-1", installmentNumber: 99, amountSar: 1200, dueDate: "2026-12-01" },
      { installmentId: "inst-2", installmentNumber: 2, amountSar: 800, dueDate: "2026-12-02" },
    ];
    await expect(applyAmendment(baseInput())).rejects.toMatchObject({
      code: AMENDMENT_APPLY_PROPOSAL_INSTALLMENT_NUMBER_MISMATCH,
    });
  });

  it("33. malformed changesJson is rejected", async () => {
    state.amendments[0].changesJson = null as any;
    await expect(applyAmendment(baseInput())).rejects.toMatchObject({
      code: AMENDMENT_APPLY_PROPOSAL_INVALID,
    });
  });

  it("34. concurrent conflict when Contract update count != 1 fails closed", async () => {
    vi.spyOn(mockPrisma.tx.contract, "updateMany").mockResolvedValueOnce({ count: 0 });
    await expect(applyAmendment(baseInput())).rejects.toMatchObject({
      code: AMENDMENT_APPLY_CONCURRENT_CONFLICT,
    });
  });

  it("35. EXEC-003 permission registry and role authorization verification", () => {
    expect(EXEC_003_PERMISSION_KEYS).toContain("contracts.amendment.apply");

    const assignment = exec003AssignmentForPermission("contracts.amendment.apply");
    expect(assignment).toBeTruthy();
    expect(assignment?.contractId).toBe("EXEC-003-C30");
    expect(assignment?.legacyAllowedRoles).toEqual(["ADMIN", "SALES_MANAGER"]);
    expect(assignment?.progressiveAllowedRoles).toEqual(["ADMIN", "SALES_MANAGER"]);

    for (const deniedRole of ["SALES_EMPLOYEE", "MARKETING", "READ_ONLY"]) {
      expect(assignment?.legacyAllowedRoles).not.toContain(deniedRole);
    }

    const op = EXEC_003_OPERATION_ASSIGNMENTS.find(
      (entry) => entry.contractId === "EXEC-003-C30" && entry.permissionKey === "contracts.amendment.apply",
    );
    expect(op).toBeTruthy();
    expect(op?.routeOrContract).toBe("/api/v1/contracts/[id]/amendments/[amendmentId]/apply");
  });
});
