import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  contract: null as any,
  amendments: [] as any[],
  snapshots: [] as any[],
  dealPassports: [] as any[],
  dealEvents: [] as any[],
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
      findFirst: vi.fn(async ({ where }: any) =>
        state.snapshots.find((row) => row.id === where.id && row.tenantId === where.tenantId) || null,
      ),
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

import { canonicalSha256 } from "@/lib/domain/transaction-spine/signed-contract-snapshot";
import {
  AMENDMENT_APPROVAL_CONTRACT_MISMATCH,
  AMENDMENT_APPROVAL_CONTRACT_NOT_ELIGIBLE,
  AMENDMENT_APPROVAL_CONTRACT_NOT_FOUND,
  AMENDMENT_APPROVAL_IDEMPOTENCY_KEY_CONTENT_CONFLICT,
  AMENDMENT_APPROVAL_NOT_DRAFT,
  AMENDMENT_APPROVAL_NOT_FOUND,
  AMENDMENT_APPROVAL_SELF_APPROVAL_REJECTED,
  AMENDMENT_APPROVAL_SOURCE_SNAPSHOT_DIGEST_MISMATCH,
  AMENDMENT_APPROVAL_SOURCE_SNAPSHOT_INVALID,
  AMENDMENT_APPROVAL_SOURCE_SNAPSHOT_MISSING,
  AMENDMENT_APPROVAL_STALE_VERSION,
  approveAmendmentDraft,
} from "@/lib/domain/transaction-spine/amendment-approval";

const TENANT = "tenant-1";
const CONTRACT_ID = "contract-1";
const CREATOR = "user-creator";
const APPROVER = "user-approver";

const STRUCTURED_FACTS = { contract: { id: CONTRACT_ID, version: 3 } };
const PAYMENT_PLAN_SNAPSHOT = { id: "plan-1", installments: [] };

function validDigest(contractVersion = 3) {
  return canonicalSha256({
    tenantId: TENANT,
    contractId: CONTRACT_ID,
    contractVersion,
    snapshotType: "AMENDMENT_SOURCE",
    structuredFacts: STRUCTURED_FACTS,
    paymentPlanSnapshot: PAYMENT_PLAN_SNAPSHOT,
  });
}

function resetState() {
  state.contract = {
    id: CONTRACT_ID,
    tenantId: TENANT,
    status: "SIGNED",
    version: 3,
    spineVersion: 2,
    legacyFinancial: false,
  };
  state.snapshots = [
    {
      id: "snapshot-1",
      tenantId: TENANT,
      contractId: CONTRACT_ID,
      contractVersion: 3,
      snapshotType: "AMENDMENT_SOURCE",
      structuredFacts: STRUCTURED_FACTS,
      paymentPlanSnapshot: PAYMENT_PLAN_SNAPSHOT,
      digest: validDigest(3),
    },
  ];
  state.amendments = [
    {
      id: "amendment-1",
      tenantId: TENANT,
      contractId: CONTRACT_ID,
      sourceContractVersion: 3,
      sourceSnapshotId: "snapshot-1",
      title: "Reschedule",
      reason: "Buyer request",
      status: "DRAFT",
      createdBy: CREATOR,
      approvedBy: null,
      approvedAt: null,
    },
  ];
  state.dealPassports = [
    { id: "deal-1", tenantId: TENANT, contractId: CONTRACT_ID, status: "FINANCIALS_ACTIVE", version: 5, lastSequence: 5 },
  ];
  state.dealEvents = [];
  state.eventSeq = 0;
}

function baseInput(overrides: Record<string, unknown> = {}) {
  return {
    tenantId: TENANT,
    userId: APPROVER,
    contractId: CONTRACT_ID,
    amendmentId: "amendment-1",
    idempotencyKey: "approve-key-1",
    ...overrides,
  };
}

describe("Feature 3 — approveAmendmentDraft", () => {
  beforeEach(resetState);

  it("1. successful approval: DRAFT -> APPROVED, approvedBy/approvedAt persisted, amendment.approved appended exactly once", async () => {
    const result = await approveAmendmentDraft(baseInput());
    expect(result.idempotent).toBe(false);
    expect(result.amendment.status).toBe("APPROVED");
    expect(result.amendment.approvedBy).toBe(APPROVER);
    expect(result.amendment.approvedAt).toBeInstanceOf(Date);
    expect(state.dealEvents.filter((e) => e.eventType === "amendment.approved")).toHaveLength(1);
  });

  it("2. self-approval is rejected (createdBy === approving userId)", async () => {
    await expect(
      approveAmendmentDraft(baseInput({ userId: CREATOR })),
    ).rejects.toMatchObject({ code: AMENDMENT_APPROVAL_SELF_APPROVAL_REJECTED });
    expect(state.amendments[0].status).toBe("DRAFT");
  });

  it("3. foreign tenant is rejected as contract-not-found", async () => {
    await expect(
      approveAmendmentDraft(baseInput({ tenantId: "tenant-2" })),
    ).rejects.toMatchObject({ code: AMENDMENT_APPROVAL_CONTRACT_NOT_FOUND });
  });

  it("3b. foreign contractId (amendment belongs to a different contract) is rejected", async () => {
    state.amendments[0].contractId = "contract-other";
    await expect(approveAmendmentDraft(baseInput())).rejects.toMatchObject({
      code: AMENDMENT_APPROVAL_CONTRACT_MISMATCH,
    });
  });

  it("3c. unknown amendmentId is rejected", async () => {
    await expect(
      approveAmendmentDraft(baseInput({ amendmentId: "does-not-exist" })),
    ).rejects.toMatchObject({ code: AMENDMENT_APPROVAL_NOT_FOUND });
  });

  it("4. non-DRAFT amendment is rejected", async () => {
    state.amendments[0].status = "APPROVED";
    await expect(approveAmendmentDraft(baseInput())).rejects.toMatchObject({
      code: AMENDMENT_APPROVAL_NOT_DRAFT,
    });
  });

  it("5. stale Contract.version (changed since DRAFT creation) is rejected", async () => {
    state.contract.version = 4; // drifted away from amendment.sourceContractVersion = 3
    await expect(approveAmendmentDraft(baseInput())).rejects.toMatchObject({
      code: AMENDMENT_APPROVAL_STALE_VERSION,
    });
  });

  it("5b. contract no longer eligible (e.g. legacyFinancial flipped) is rejected", async () => {
    state.contract.legacyFinancial = true;
    await expect(approveAmendmentDraft(baseInput())).rejects.toMatchObject({
      code: AMENDMENT_APPROVAL_CONTRACT_NOT_ELIGIBLE,
    });
  });

  it("6. missing source snapshot is rejected", async () => {
    state.snapshots = [];
    await expect(approveAmendmentDraft(baseInput())).rejects.toMatchObject({
      code: AMENDMENT_APPROVAL_SOURCE_SNAPSHOT_MISSING,
    });
  });

  it("6b. mismatched source snapshot identity (wrong contractId) is rejected", async () => {
    state.snapshots[0].contractId = "contract-other";
    await expect(approveAmendmentDraft(baseInput())).rejects.toMatchObject({
      code: AMENDMENT_APPROVAL_SOURCE_SNAPSHOT_INVALID,
    });
  });

  it("7. tampered source snapshot digest is rejected", async () => {
    state.snapshots[0].structuredFacts = { ...STRUCTURED_FACTS, tampered: true };
    // digest left stale/unchanged relative to the now-tampered facts
    await expect(approveAmendmentDraft(baseInput())).rejects.toMatchObject({
      code: AMENDMENT_APPROVAL_SOURCE_SNAPSHOT_DIGEST_MISMATCH,
    });
  });

  it("8. same-key replay succeeds idempotently", async () => {
    const first = await approveAmendmentDraft(baseInput());
    const replay = await approveAmendmentDraft(baseInput());
    expect(replay.idempotent).toBe(true);
    expect(replay.amendment.id).toBe(first.amendment.id);
    expect(state.dealEvents.filter((e) => e.eventType === "amendment.approved")).toHaveLength(1);
  });

  it("9. same key with a different approver fails closed", async () => {
    await approveAmendmentDraft(baseInput());
    // Reset the amendment back to DRAFT is not possible/legit; a second
    // distinct approver reusing the same raw key on the same amendment must
    // fail closed because the requestDigest binds approvedBy.
    await expect(
      approveAmendmentDraft(baseInput({ userId: "user-other-approver" })),
    ).rejects.toMatchObject({ code: AMENDMENT_APPROVAL_IDEMPOTENCY_KEY_CONTENT_CONFLICT });
  });

  it("10. concurrent/state-transition guard: a second approval attempt after the first already flipped status fails with NOT_DRAFT once idempotency no longer shields it", async () => {
    await approveAmendmentDraft(baseInput());
    // Different idempotency key -> bypasses the idempotent-replay path,
    // must be caught by the DRAFT-status guard (and the updateMany
    // count-based defensive check) instead.
    await expect(
      approveAmendmentDraft(baseInput({ idempotencyKey: "approve-key-2" })),
    ).rejects.toMatchObject({ code: AMENDMENT_APPROVAL_NOT_DRAFT });
  });

  it("11. DealPassport.status is preserved (amendment.approved is unmapped/informational)", async () => {
    await approveAmendmentDraft(baseInput());
    const passport = state.dealPassports.find((p) => p.id === "deal-1");
    expect(passport.status).toBe("FINANCIALS_ACTIVE");
  });

  it("12. no financial mutation and no AMENDMENT_RESULT snapshot occurs", async () => {
    await approveAmendmentDraft(baseInput());
    // The mock never defines any write method for invoice/installment/
    // paymentPlan, and contractSnapshot exposes only findFirst (no create)
    // — an attempted AMENDMENT_RESULT write would have thrown.
    expect(state.snapshots).toHaveLength(1);
    expect(state.snapshots.some((s) => s.snapshotType === "AMENDMENT_RESULT")).toBe(false);
  });

  it("13. Contract.version is not incremented by approval", async () => {
    await approveAmendmentDraft(baseInput());
    expect(state.contract.version).toBe(3);
  });
});
