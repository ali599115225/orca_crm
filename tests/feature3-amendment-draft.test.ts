import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  contract: null as any,
  amendments: [] as any[],
  snapshots: [] as any[],
  dealPassports: [] as any[],
  dealEvents: [] as any[],
  amendmentSeq: 0,
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
    },
    contractSnapshot: {
      create: vi.fn(async ({ data }: any) => {
        state.snapshotSeq += 1;
        const row = { id: `snapshot-${state.snapshotSeq}`, issuedAt: new Date(), ...data };
        state.snapshots.push(row);
        return row;
      }),
      findFirst: vi.fn(async ({ where }: any) =>
        state.snapshots.find((row) => row.id === where.id && row.tenantId === where.tenantId) || null,
      ),
    },
    contractAmendment: {
      create: vi.fn(async ({ data }: any) => {
        state.amendmentSeq += 1;
        const row = { id: `amendment-${state.amendmentSeq}`, createdAt: new Date(), updatedAt: new Date(), ...data };
        state.amendments.push(row);
        return row;
      }),
      findFirst: vi.fn(async ({ where }: any) =>
        state.amendments.find((row) => row.id === where.id && row.tenantId === where.tenantId) || null,
      ),
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
  AMENDMENT_CONTRACT_NOT_ELIGIBLE,
  AMENDMENT_CONTRACT_NOT_FOUND,
  AMENDMENT_IDEMPOTENCY_KEY_CONTENT_CONFLICT,
  AMENDMENT_PAYMENT_PLAN_REQUIRED,
  AMENDMENT_PROPOSAL_DUPLICATE_INSTALLMENT,
  AMENDMENT_PROPOSAL_FOREIGN_INSTALLMENT,
  AMENDMENT_PROPOSAL_INSTALLMENT_NUMBER_MISMATCH,
  AMENDMENT_PROPOSAL_MISSING_INSTALLMENT,
  AMENDMENT_PROPOSAL_ZERO_DELTA_VIOLATION,
  AMENDMENT_SALE_INVOICE_REQUIRED,
  buildAmendmentSourceSnapshot,
  createAmendmentDraft,
} from "@/lib/domain/transaction-spine/amendment-draft";
import type { CreateAmendmentDraftInput } from "@/lib/domain/transaction-spine/types";

const TENANT = "tenant-1";
const CONTRACT_ID = "contract-1";

function installment(overrides: Record<string, unknown> = {}) {
  return {
    id: `inst-${Math.random().toString(36).slice(2, 8)}`,
    installmentNumber: 1,
    amountSar: 1000,
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // future
    paymentStatus: "Pending",
    payments: [],
    ...overrides,
  };
}

function baseContract(overrides: Record<string, unknown> = {}) {
  const inst1 = installment({ id: "inst-1", installmentNumber: 1, amountSar: 1000 });
  const inst2 = installment({ id: "inst-2", installmentNumber: 2, amountSar: 1000 });
  return {
    id: CONTRACT_ID,
    tenantId: TENANT,
    status: "SIGNED",
    version: 3,
    spineVersion: 2,
    legacyFinancial: false,
    totalVolumeSar: 2000,
    vatType: "STANDARD",
    vatRate: 15,
    invoices: [
      {
        id: "invoice-1",
        invoiceNumber: 1,
        invoicePrefix: "INV",
        subtotal: 1739.13,
        vatAmount: 260.87,
        totalAmount: 2000,
        status: "unpaid",
        installments: [inst1, inst2],
      },
    ],
    paymentPlan: {
      id: "plan-1",
      template: "MONTHLY",
      status: "ACTIVE",
      totalAmount: 2000,
      scheduleJson: [],
      installmentCount: 2,
      version: 1,
      activatedAt: new Date("2026-01-01T00:00:00.000Z"),
      lastAmendedAt: null,
    },
    ...overrides,
  };
}

function resetState() {
  state.contract = baseContract();
  state.amendments = [];
  state.snapshots = [];
  state.dealPassports = [{ id: "deal-1", tenantId: TENANT, contractId: CONTRACT_ID, status: "FINANCIALS_ACTIVE", version: 5, lastSequence: 5 }];
  state.dealEvents = [];
  state.amendmentSeq = 0;
  state.snapshotSeq = 0;
  state.eventSeq = 0;
}

function baseInput(overrides: Partial<CreateAmendmentDraftInput> = {}): CreateAmendmentDraftInput {
  return {
    tenantId: TENANT,
    userId: "user-1",
    contractId: CONTRACT_ID,
    title: "Reschedule remaining installments",
    reason: "Buyer requested later due dates",
    changesJson: {
      proposedSchedule: [
        { installmentId: "inst-1", installmentNumber: 1, amountSar: 1000, dueDate: "2026-11-01" },
        { installmentId: "inst-2", installmentNumber: 2, amountSar: 1000, dueDate: "2026-12-01" },
      ],
    },
    idempotencyKey: "test-key-1",
    ...overrides,
  };
}

describe("Feature 3 — createAmendmentDraft", () => {
  beforeEach(resetState);

  it("1. successful atomic draft: creates AMENDMENT_SOURCE snapshot + ContractAmendment DRAFT + amendment.created", async () => {
    const result = await createAmendmentDraft(baseInput());
    expect(result.idempotent).toBe(false);
    expect(result.amendment.status).toBe("DRAFT");
    expect(result.amendment.sourceContractVersion).toBe(3);
    expect(state.snapshots).toHaveLength(1);
    expect(state.amendments).toHaveLength(1);
    expect(state.dealEvents.filter((e) => e.eventType === "amendment.created")).toHaveLength(1);
  });

  it("2. required snapshot fields", async () => {
    await createAmendmentDraft(baseInput());
    const snapshot = state.snapshots[0];
    expect(snapshot.snapshotType).toBe("AMENDMENT_SOURCE");
    expect(snapshot.contractId).toBe(CONTRACT_ID);
    expect(snapshot.contractVersion).toBe(3);
    expect(snapshot.draftId).toBeNull();
    expect(snapshot.templateVersionId).toBeNull();
    expect(snapshot.signatureEvidenceHash).toBeNull();
    expect(snapshot.signedAt).toBeNull();
    expect(snapshot.clauseSnapshot).toEqual([]);
    expect(snapshot.approvalSnapshot).toEqual({});
  });

  it("3. deterministic source digest: identical facts produce identical digest, independent of a wall-clock capture instant", () => {
    const contract = baseContract();
    const invoice = contract.invoices[0];
    const first = buildAmendmentSourceSnapshot({ tenantId: TENANT, contract, invoice, paymentPlan: contract.paymentPlan });
    const second = buildAmendmentSourceSnapshot({ tenantId: TENANT, contract, invoice, paymentPlan: contract.paymentPlan });
    expect(first.digest).toBe(second.digest);
    expect(first.digest).toMatch(/^[0-9a-f]{64}$/);
  });

  it("4. exactly one SALE invoice required (zero invoices rejected)", async () => {
    state.contract = baseContract({ invoices: [] });
    await expect(createAmendmentDraft(baseInput())).rejects.toMatchObject({ code: AMENDMENT_SALE_INVOICE_REQUIRED });
  });

  it("4b. exactly one SALE invoice required (multiple invoices rejected)", async () => {
    const c = baseContract();
    state.contract = baseContract({ invoices: [...c.invoices, { ...c.invoices[0], id: "invoice-2" }] });
    await expect(createAmendmentDraft(baseInput())).rejects.toMatchObject({ code: AMENDMENT_SALE_INVOICE_REQUIRED });
  });

  it("5. existing PaymentPlan required", async () => {
    state.contract = baseContract({ paymentPlan: null });
    await expect(createAmendmentDraft(baseInput())).rejects.toMatchObject({ code: AMENDMENT_PAYMENT_PLAN_REQUIRED });
  });

  it("6. tenant isolation: foreign tenant is rejected as contract-not-found", async () => {
    await expect(
      createAmendmentDraft(baseInput({ tenantId: "tenant-2" })),
    ).rejects.toMatchObject({ code: AMENDMENT_CONTRACT_NOT_FOUND });
  });

  it("7. SIGNED/spineVersion/legacyFinancial guards", async () => {
    state.contract = baseContract({ status: "PENDING_SIGNATURE" });
    await expect(createAmendmentDraft(baseInput())).rejects.toMatchObject({ code: AMENDMENT_CONTRACT_NOT_ELIGIBLE });

    resetState();
    state.contract = baseContract({ spineVersion: 1 });
    await expect(createAmendmentDraft(baseInput())).rejects.toMatchObject({ code: AMENDMENT_CONTRACT_NOT_ELIGIBLE });

    resetState();
    state.contract = baseContract({ legacyFinancial: true });
    await expect(createAmendmentDraft(baseInput())).rejects.toMatchObject({ code: AMENDMENT_CONTRACT_NOT_ELIGIBLE });
  });

  it("8. future-only eligibility: a past-due installment is not a valid proposal target (foreign)", async () => {
    const pastInst = installment({ id: "inst-past", installmentNumber: 1, amountSar: 1000, dueDate: new Date(Date.now() - 86400000) });
    const futureInst = installment({ id: "inst-future", installmentNumber: 2, amountSar: 1000, dueDate: new Date(Date.now() + 86400000) });
    state.contract = baseContract({
      invoices: [{ ...baseContract().invoices[0], installments: [pastInst, futureInst] }],
    });
    await expect(
      createAmendmentDraft(
        baseInput({
          changesJson: {
            proposedSchedule: [
              { installmentId: "inst-past", installmentNumber: 1, amountSar: 1000, dueDate: "2026-11-01" },
            ],
          },
        }),
      ),
    ).rejects.toMatchObject({ code: AMENDMENT_PROPOSAL_FOREIGN_INSTALLMENT });
  });

  it("9. a partially/fully paid installment is locked, not a proposal target (foreign)", async () => {
    const paidInst = installment({
      id: "inst-paid",
      installmentNumber: 1,
      amountSar: 1000,
      payments: [{ status: "COMPLETED", netAmount: 500 }],
    });
    const eligibleInst = installment({ id: "inst-eligible", installmentNumber: 2, amountSar: 1000 });
    state.contract = baseContract({
      invoices: [{ ...baseContract().invoices[0], installments: [paidInst, eligibleInst] }],
    });
    await expect(
      createAmendmentDraft(
        baseInput({
          changesJson: {
            proposedSchedule: [
              { installmentId: "inst-paid", installmentNumber: 1, amountSar: 1000, dueDate: "2026-11-01" },
            ],
          },
        }),
      ),
    ).rejects.toMatchObject({ code: AMENDMENT_PROPOSAL_FOREIGN_INSTALLMENT });
  });

  it("9b. a real eligible installmentId with a fabricated/mismatched installmentNumber is rejected", async () => {
    await expect(
      createAmendmentDraft(
        baseInput({
          changesJson: {
            proposedSchedule: [
              // inst-1's real installmentNumber is 1 — 999 is fabricated.
              { installmentId: "inst-1", installmentNumber: 999, amountSar: 1000, dueDate: "2026-11-01" },
              { installmentId: "inst-2", installmentNumber: 2, amountSar: 1000, dueDate: "2026-12-01" },
            ],
          },
        }),
      ),
    ).rejects.toMatchObject({ code: AMENDMENT_PROPOSAL_INSTALLMENT_NUMBER_MISMATCH });
    expect(state.amendments).toHaveLength(0);
    expect(state.snapshots).toHaveLength(0);
  });

  it("10. duplicate installment id in the proposal is rejected", async () => {
    await expect(
      createAmendmentDraft(
        baseInput({
          changesJson: {
            proposedSchedule: [
              { installmentId: "inst-1", installmentNumber: 1, amountSar: 1000, dueDate: "2026-11-01" },
              { installmentId: "inst-1", installmentNumber: 1, amountSar: 1000, dueDate: "2026-11-02" },
            ],
          },
        }),
      ),
    ).rejects.toMatchObject({ code: AMENDMENT_PROPOSAL_DUPLICATE_INSTALLMENT });
  });

  it("11. missing eligible installment from the proposal is rejected (not a full bijection)", async () => {
    await expect(
      createAmendmentDraft(
        baseInput({
          changesJson: {
            proposedSchedule: [
              { installmentId: "inst-1", installmentNumber: 1, amountSar: 2000, dueDate: "2026-11-01" },
            ],
          },
        }),
      ),
    ).rejects.toMatchObject({ code: AMENDMENT_PROPOSAL_MISSING_INSTALLMENT });
  });

  it("12. zero-delta minor-unit validation: off by one cent is rejected", async () => {
    await expect(
      createAmendmentDraft(
        baseInput({
          changesJson: {
            proposedSchedule: [
              { installmentId: "inst-1", installmentNumber: 1, amountSar: 1000.01, dueDate: "2026-11-01" },
              { installmentId: "inst-2", installmentNumber: 2, amountSar: 999.99, dueDate: "2026-12-01" },
            ],
          },
        }),
      ),
    ).resolves.toBeTruthy(); // 1000.01 + 999.99 == 2000.00 exactly -> still zero net delta, must PASS

    resetState();
    await expect(
      createAmendmentDraft(
        baseInput({
          changesJson: {
            proposedSchedule: [
              { installmentId: "inst-1", installmentNumber: 1, amountSar: 1000.01, dueDate: "2026-11-01" },
              { installmentId: "inst-2", installmentNumber: 2, amountSar: 1000, dueDate: "2026-12-01" },
            ],
          },
        }),
      ),
    ).rejects.toMatchObject({ code: AMENDMENT_PROPOSAL_ZERO_DELTA_VIOLATION });
  });

  it("13. normalized-order replay succeeds idempotently regardless of proposal array order", async () => {
    const first = await createAmendmentDraft(baseInput());
    expect(first.idempotent).toBe(false);

    const reordered = await createAmendmentDraft(
      baseInput({
        changesJson: {
          proposedSchedule: [
            { installmentId: "inst-2", installmentNumber: 2, amountSar: 1000, dueDate: "2026-12-01" },
            { installmentId: "inst-1", installmentNumber: 1, amountSar: 1000, dueDate: "2026-11-01" },
          ],
        },
      }),
    );
    expect(reordered.idempotent).toBe(true);
    expect(reordered.amendment.id).toBe(first.amendment.id);
    expect(state.amendments).toHaveLength(1);
    expect(state.snapshots).toHaveLength(1);
    expect(state.dealEvents.filter((e) => e.eventType === "amendment.created")).toHaveLength(1);
  });

  it("14. same key with different content fails closed", async () => {
    await createAmendmentDraft(baseInput());
    await expect(
      createAmendmentDraft(baseInput({ title: "A completely different amendment title" })),
    ).rejects.toMatchObject({ code: AMENDMENT_IDEMPOTENCY_KEY_CONTENT_CONFLICT });
    expect(state.amendments).toHaveLength(1);
  });

  it("15. DealPassport.status is preserved (amendment.created is unmapped/informational)", async () => {
    await createAmendmentDraft(baseInput());
    const passport = state.dealPassports.find((p) => p.id === "deal-1");
    expect(passport.status).toBe("FINANCIALS_ACTIVE");
  });

  it("16. no contract/invoice/plan/installment monetary mutation occurs", async () => {
    await createAmendmentDraft(baseInput());
    // The mock never defines .update/.updateMany for contract/invoice/
    // installment/paymentPlan models at all — if the command attempted any
    // such mutation, this call would have thrown rather than resolved.
    expect(state.contract.paymentPlan.totalAmount).toBe(2000);
    expect(state.contract.invoices[0].totalAmount).toBe(2000);
    expect(state.contract.invoices[0].installments[0].amountSar).toBe(1000);
    expect(state.contract.invoices[0].installments[1].amountSar).toBe(1000);
  });
});
