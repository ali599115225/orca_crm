import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  contract: null as any,
  paymentPlan: null as any,
  invoices: [] as any[],
  installments: [] as any[],
  signatories: [] as any[],
  drafts: [] as any[],
  approvals: [] as any[],
  snapshots: [] as any[],
  documents: [] as any[],
  deliveries: [] as any[],
  dealPassports: [] as any[],
  dealEvents: [] as any[],
  audits: [] as any[],
  appendedInputs: [] as any[],
  eventSeq: 0,
  signatorySeq: 0,
  shouldFailGeneratedEvent: false,
}));

const tenantContext = vi.hoisted(() => ({
  current: { tenantId: "tenant-1", userId: "user-1" },
}));

const sendEmailMock = vi.hoisted(() => vi.fn());

const mockPrisma = vi.hoisted(() => {
  const tx: any = {
    contract: {
      findFirst: vi.fn(async ({ where }: any = {}) => {
        if (!state.contract) return null;
        if (where?.id !== undefined && state.contract.id !== where.id) return null;
        if (where?.tenantId !== undefined && state.contract.tenantId !== where.tenantId) return null;
        return state.contract;
      }),
      update: vi.fn(async ({ data }: any) => {
        state.contract = {
          ...state.contract,
          status: data.status ?? state.contract.status,
          signedAt: data.signedAt ?? state.contract.signedAt,
          reservationExpiresAt: null,
          version: state.contract.version + 1,
        };
        return state.contract;
      }),
    },
    contractDraft: {
      findFirst: vi.fn(async ({ where }: any = {}) => {
        return (
          state.drafts.find((row) => {
            if (where.id !== undefined && row.id !== where.id) return false;
            if (where.tenantId !== undefined && row.tenantId !== where.tenantId) return false;
            if (where.contractId !== undefined && row.contractId !== where.contractId) return false;
            if (where.status !== undefined && row.status !== where.status) return false;
            return true;
          }) || null
        );
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const row = state.drafts.find((item) => item.id === where.id);
        if (row) Object.assign(row, data);
        return row;
      }),
    },
    contractApproval: {
      findFirst: vi.fn(async ({ where }: any = {}) => {
        const approval = state.approvals.find((row) => {
          if (where.id !== undefined && row.id !== where.id) return false;
          if (where.tenantId !== undefined && row.tenantId !== where.tenantId) return false;
          if (where.draftId !== undefined && row.draftId !== where.draftId) return false;
          if (where.status !== undefined && row.status !== where.status) return false;
          return true;
        });
        if (!approval) return null;
        const draft = state.drafts.find((d) => d.id === approval.draftId);
        return {
          ...approval,
          draft: draft ? { status: draft.status, contractId: draft.contractId } : null,
        };
      }),
      create: vi.fn(async ({ data }: any) => {
        const row = {
          id: `appr-${state.approvals.length + 1}`,
          requestedAt: new Date(),
          ...data,
        };
        state.approvals.push(row);
        return row;
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const row = state.approvals.find((item) => item.id === where.id);
        if (!row) throw new Error("approval not found");
        Object.assign(row, data);
        return row;
      }),
    },
    contractSnapshot: {
      findFirst: vi.fn(async ({ where }: any = {}) => {
        return (
          state.snapshots.find((row) => {
            if (where.id !== undefined && row.id !== where.id) return false;
            if (where.tenantId !== undefined && row.tenantId !== where.tenantId) return false;
            if (where.draftId !== undefined && row.draftId !== where.draftId) return false;
            if (where.contractId !== undefined && row.contractId !== where.contractId) return false;
            if (where.snapshotType !== undefined && row.snapshotType !== where.snapshotType) return false;
            return true;
          }) || null
        );
      }),
      create: vi.fn(async ({ data }: any) => {
        const row = {
          id: `snap-${state.snapshots.length + 1}`,
          createdAt: new Date(),
          ...data,
        };
        state.snapshots.push(row);
        return row;
      }),
    },
    contractSignatory: {
      findFirst: vi.fn(async ({ where }: any = {}) => {
        return (
          state.signatories.find((row) => {
            if (where.id !== undefined && row.id !== where.id) return false;
            if (where.tenantId !== undefined && row.tenantId !== where.tenantId) return false;
            if (where.contractId !== undefined && row.contractId !== where.contractId) return false;
            return true;
          }) || null
        );
      }),
      findMany: vi.fn(async ({ where }: any = {}) => {
        return state.signatories.filter((row) => {
          if (where.tenantId !== undefined && row.tenantId !== where.tenantId) return false;
          if (where.contractId !== undefined && row.contractId !== where.contractId) return false;
          if (where.required !== undefined && row.required !== where.required) return false;
          return true;
        });
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const row = state.signatories.find((item) => item.id === where.id);
        if (!row) throw new Error("signatory not found");
        Object.assign(row, data);
        return row;
      }),
      create: vi.fn(async ({ data }: any) => {
        state.signatorySeq += 1;
        const row = { id: `sig-${state.signatorySeq}`, ...data };
        state.signatories.push(row);
        return row;
      }),
    },
    document: {
      create: vi.fn(async ({ data }: any) => {
        const row = {
          id: `doc-${state.documents.length + 1}`,
          createdAt: new Date(),
          ...data,
        };
        state.documents.push(row);
        return row;
      }),
    },
    contractDelivery: {
      create: vi.fn(async ({ data }: any) => {
        const row = {
          id: `del-${state.deliveries.length + 1}`,
          createdAt: new Date(),
          ...data,
        };
        state.deliveries.push(row);
        return row;
      }),
      updateMany: vi.fn(async ({ where, data }: any) => {
        let count = 0;
        for (const del of state.deliveries) {
          if (where.id !== undefined && del.id !== where.id) continue;
          if (where.tenantId !== undefined && del.tenantId !== where.tenantId) continue;
          if (where.contractId !== undefined && del.contractId !== where.contractId) continue;
          if (where.status !== undefined && del.status !== where.status) continue;
          Object.assign(del, data);
          count++;
        }
        return { count };
      }),
    },
    dealPassport: {
      findMany: vi.fn(async ({ where }: any) => {
        return state.dealPassports.filter(
          (row) =>
            row.tenantId === where.tenantId &&
            (where.OR || []).some(
              (clause: any) =>
                (clause.opportunityId && clause.opportunityId === row.opportunityId) ||
                (clause.contractId && clause.contractId === row.contractId),
            ),
        );
      }),
      create: vi.fn(async ({ data }: any) => {
        const row = {
          id: `deal-${state.dealPassports.length + 1}`,
          createdAt: new Date(),
          status: "OPEN",
          version: 0,
          lastSequence: 0,
          lastEventId: null,
          lastEventAt: null,
          opportunityId: null,
          contractId: null,
          currentOfferId: null,
          closedAt: null,
          ...data,
        };
        state.dealPassports.push(row);
        return row;
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const row = state.dealPassports.find((item) => item.id === where.id);
        if (!row) throw new Error("deal passport not found");
        if (data.version?.increment) {
          row.version += data.version.increment;
        }
        if (data.lastSequence?.increment) {
          row.lastSequence += data.lastSequence.increment;
        }
        for (const [key, value] of Object.entries(data)) {
          if (key === "version" || key === "lastSequence") continue;
          row[key] = value;
        }
        return { ...row };
      }),
      findUnique: vi.fn(async ({ where }: any) => {
        return state.dealPassports.find((row) => row.id === where.id) || null;
      }),
    },
    dealEvent: {
      findFirst: vi.fn(async ({ where }: any) => {
        if (where.idempotencyKey !== undefined) {
          return (
            state.dealEvents.find(
              (row) =>
                row.tenantId === where.tenantId &&
                row.idempotencyKey === where.idempotencyKey,
            ) || null
          );
        }
        if (where.id !== undefined) {
          return (
            state.dealEvents.find(
              (row) =>
                row.id === where.id &&
                row.tenantId === where.tenantId &&
                row.dealId === where.dealId,
            ) || null
          );
        }
        return null;
      }),
      create: vi.fn(async ({ data }: any) => {
        state.eventSeq += 1;
        const row = {
          id: `event-${state.eventSeq}`,
          createdAt: new Date(),
          ...data,
        };
        state.dealEvents.push(row);
        return row;
      }),
    },
    invoice: {
      findMany: vi.fn(async ({ where }: any = {}) => {
        return state.invoices.filter((row) => {
          if (where.tenantId !== undefined && row.tenantId !== where.tenantId) return false;
          if (where.contractId !== undefined && row.contractId !== where.contractId) return false;
          if (where.type !== undefined && row.type !== where.type) return false;
          return true;
        });
      }),
      create: vi.fn(async ({ data }: any) => {
        const invoice = { id: `inv-${state.invoices.length + 1}`, ...data };
        state.invoices.push(invoice);
        return invoice;
      }),
    },
    installment: {
      findMany: vi.fn(async () => state.installments),
      create: vi.fn(async ({ data }: any) => {
        const installment = { id: `inst-${state.installments.length + 1}`, vatAmount: null, ...data };
        state.installments.push(installment);
        return installment;
      }),
      updateMany: vi.fn(async () => ({ count: 0 })),
    },
    paymentPlan: {
      findFirst: vi.fn(async () => state.paymentPlan),
      updateMany: vi.fn(async ({ data }: any) => {
        if (state.paymentPlan) state.paymentPlan = { ...state.paymentPlan, ...data };
        return { count: 1 };
      }),
    },
    tenant: {
      update: vi.fn(async () => ({ nextInvoiceNumber: 2, invoicePrefix: "INV" })),
    },
    unit: { update: vi.fn(async () => ({})) },
    lead: { update: vi.fn(async () => ({})) },
    opportunity: { update: vi.fn(async () => ({})) },
    telemetryEvent: { create: vi.fn(async () => ({})) },
    auditLog: {
      create: vi.fn(async ({ data }: any) => {
        state.audits.push(data);
        return data;
      }),
      findFirst: vi.fn(async () => null),
    },
    journalEntry: { findFirst: vi.fn(async () => null) },
  };

  return {
    tx,
    prisma: {
      ...tx,
      contract: {
        ...tx.contract,
        findFirst: vi.fn(async (args: any) => {
          if (args?.select?.spineVersion) {
            return state.contract
              ? { spineVersion: state.contract.spineVersion, legacyFinancial: state.contract.legacyFinancial }
              : null;
          }
          return tx.contract.findFirst(args);
        }),
      },
      contractApproval: tx.contractApproval,
      contractSnapshot: tx.contractSnapshot,
      $transaction: vi.fn(async (fn: any) => {
        const backup = {
          documents: [...state.documents],
          deliveries: [...state.deliveries],
          dealEvents: [...state.dealEvents],
          dealPassports: state.dealPassports.map((p) => ({ ...p })),
        };
        try {
          return await fn(tx);
        } catch (err) {
          state.documents = backup.documents;
          state.deliveries = backup.deliveries;
          state.dealEvents = backup.dealEvents;
          state.dealPassports = backup.dealPassports;
          throw err;
        }
      }),
    },
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma.prisma }));
vi.mock("@/lib/realtime/publish-sync-event", () => ({
  publishSyncEvent: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/accounting", () => ({
  seedChartOfAccounts: async () => undefined,
  findAccountByCode: async (_tenantId: string, code: string) => ({ id: `acct-${code}` }),
  postInvoiceEntry: async () => undefined,
}));
vi.mock("@/lib/vat/engine", () => ({
  calculateVat: (amount: number) => ({ vatAmount: amount * 0.15, totalAmount: amount * 1.15 }),
}));
vi.mock("@/lib/domain/transaction-spine/validate-tenant", () => ({
  assertTenantOwnership: async () => undefined,
  assertTenantOwnershipInTx: async () => undefined,
}));

vi.mock("@/lib/tenant-context", () => ({
  requireTenantContext: vi.fn(() => tenantContext.current),
}));

vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn((...args: any[]) => sendEmailMock(...args)),
}));

vi.mock("@/lib/domain/transaction-spine/signed-contract-document", () => ({
  renderSignedContractDocument: vi.fn((snapshot: any) => ({
    html: "<html>Signed Contract</html>",
    identity: {
      contractId: snapshot.contractId,
      signedAt: snapshot.signedAt instanceof Date ? snapshot.signedAt.toISOString() : String(snapshot.signedAt),
    },
    label: "Contract-Document-1",
  })),
}));

vi.mock("@/lib/domain/deal-passport/append-event", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/domain/deal-passport/append-event")>();
  return {
    ...actual,
    appendDealEventInTx: vi.fn(async (tx: any, input: any) => {
      if (state.shouldFailGeneratedEvent && input.eventType === "contract.document.generated") {
        throw new Error("Simulated generated event persistence failure");
      }
      state.appendedInputs.push(input);
      return actual.appendDealEventInTx(tx, input);
    }),
  };
});

vi.mock("@/lib/domain/contract-finance/canonical-snapshot-assembler", () => ({
  assembleCanonicalContractSnapshotWithTx: vi.fn(async (_tx: any, { tenantId, draftId }: any) => {
    const draft = state.drafts.find((d: any) => d.id === draftId && d.tenantId === tenantId);
    return {
      tenantId,
      draftId,
      templateVersionId: "tpl-1",
      contractId: draft?.contractId ?? null,
      sourceContentJson: {},
      structuredFacts: {},
      clauseSnapshot: {},
      paymentPlanSnapshot: {},
      approvalSnapshot: {},
    };
  }),
}));

vi.mock("@/lib/domain/contract-finance/contract-renderer", () => ({
  renderCanonicalContract: vi.fn(() => "rendered contract text"),
}));

import {
  requestContractApproval,
  decideContractApproval,
} from "@/lib/domain/contract-finance/contract-draft-service";
import { issueCanonicalApprovedContractSnapshot } from "@/lib/domain/contract-finance/contract-snapshot-issuance-service";
import { signContractSignatory } from "@/lib/domain/transaction-spine/sign-contract";
import { sendContractDocument } from "@/lib/domain/transaction-spine/send-contract-document";

const TENANT = "tenant-1";
const CONTRACT_ID = "contract-1";

function setupPassport(contractId = CONTRACT_ID, status = "CONTRACT_ISSUED") {
  const passport = {
    id: `deal-pass-1`,
    tenantId: TENANT,
    status,
    version: 1,
    lastSequence: 1,
    lastEventId: "event-init",
    lastEventAt: new Date(),
    opportunityId: null,
    contractId,
    currentOfferId: null,
    closedAt: null,
    createdAt: new Date(),
  };
  state.dealPassports.push(passport);
  state.dealEvents.push({
    id: "event-init",
    tenantId: TENANT,
    dealId: passport.id,
    sequence: 1,
    eventType: "contract.issued",
    eventVersion: 1,
    idempotencyKey: `init:${passport.id}`,
    correlationId: "init-corr",
    actorType: "SYSTEM",
    occurredAt: new Date(),
    payload: {},
  });
  state.eventSeq = 1;
  return passport;
}

function setupContractAndSignatories() {
  state.contract = {
    id: CONTRACT_ID,
    tenantId: TENANT,
    status: "PENDING_SIGNATURE",
    spineVersion: 2,
    legacyFinancial: false,
    version: 1,
    totalVolumeSar: 100000,
    vatType: "STANDARD",
    vatRate: 15,
    unitId: "unit-1",
    offerId: null,
    leadId: null,
    unit: { unitNumber: "A-1", type: "APARTMENT", area: 100, city: "Riyadh", district: "Olaya" },
    tenant: { companyName: "Dev Co", vatNumber: "300", commercialRegistry: "101", nationalAddress: "Riyadh" },
    offer: null,
    paymentPlan: null,
  };

  state.paymentPlan = {
    id: "plan-1",
    tenantId: TENANT,
    contractId: CONTRACT_ID,
    status: "PENDING",
    scheduleJson: [
      {
        installmentNumber: 1,
        amountSar: 115000,
        dueDate: new Date("2026-10-01"),
      },
    ],
  };

  const draft = {
    id: "draft-approved-1",
    tenantId: TENANT,
    contractId: CONTRACT_ID,
    status: "APPROVED",
    approvals: [{ id: "appr-pre", status: "APPROVED" }],
  };
  state.drafts.push(draft);

  const snapshot = {
    id: "snap-issued-1",
    tenantId: TENANT,
    draftId: draft.id,
    contractId: CONTRACT_ID,
    snapshotType: "ISSUED",
    digest: "digest-existing-1",
  };
  state.snapshots.push(snapshot);
}

function setupSignedContractAndDeliverySnapshot() {
  const signedAt = new Date("2026-09-24T12:00:00.000Z");
  state.contract = {
    id: CONTRACT_ID,
    tenantId: TENANT,
    status: "SIGNED",
    spineVersion: 2,
    legacyFinancial: false,
    version: 2,
    totalVolumeSar: 100000,
    vatType: "STANDARD",
    vatRate: 15,
    signedAt,
    unitId: "unit-1",
    offerId: null,
    leadId: null,
  };

  const operationalSignedSnapshot = {
    id: "snap-signed-op-1",
    tenantId: TENANT,
    contractId: CONTRACT_ID,
    snapshotType: "SIGNED_OPERATIONAL",
    contractVersion: 1,
    signedAt: signedAt.toISOString(),
    digest: "digest-signed-1",
  };
  state.snapshots.push(operationalSignedSnapshot);
}

describe("F4 Canonical DealEvent Emitters & Lifecycle", () => {
  beforeEach(() => {
    tenantContext.current = { tenantId: TENANT, userId: "user-1" };
    sendEmailMock.mockReset();
    state.contract = null;
    state.paymentPlan = null;
    state.invoices = [];
    state.installments = [];
    state.signatories = [];
    state.drafts = [];
    state.approvals = [];
    state.snapshots = [];
    state.documents = [];
    state.deliveries = [];
    state.dealPassports = [];
    state.dealEvents = [];
    state.audits = [];
    state.appendedInputs = [];
    state.eventSeq = 0;
    state.signatorySeq = 0;
    state.shouldFailGeneratedEvent = false;
  });

  describe("A. requestContractApproval", () => {
    it("emits contract.approval.requested when draft has contractId", async () => {
      setupPassport();
      const draft = {
        id: "draft-1",
        tenantId: TENANT,
        contractId: CONTRACT_ID,
        status: "DRAFT",
      };
      state.drafts.push(draft);

      const approval = await requestContractApproval({
        tenantId: TENANT,
        draftId: draft.id,
        requestedBy: "user-1",
        reason: "Need discount approval",
        riskTier: "TIER_1",
      });

      const events = state.dealEvents.filter(
        (e) => e.eventType === "contract.approval.requested",
      );
      expect(events).toHaveLength(1);
      expect(events[0].idempotencyKey).toBe(
        `contract.approval.requested:${approval.id}`,
      );
      expect(events[0].payload).toMatchObject({
        draftId: draft.id,
        approvalId: approval.id,
        riskTier: "TIER_1",
      });

      const appendInput = state.appendedInputs.find(
        (i) => i.eventType === "contract.approval.requested",
      );
      expect(appendInput).toBeDefined();
      expect(appendInput!.projection).toEqual({ contractId: CONTRACT_ID });
      expect(appendInput!.projection?.status).toBeUndefined();

      const passport = state.dealPassports.find((p) => p.contractId === CONTRACT_ID);
      expect(passport?.status).toBe("CONTRACT_ISSUED");
    });

    it("does NOT emit contract.approval.requested when draft contractId is null", async () => {
      const draft = {
        id: "draft-unbound",
        tenantId: TENANT,
        contractId: null,
        status: "DRAFT",
      };
      state.drafts.push(draft);

      await requestContractApproval({
        tenantId: TENANT,
        draftId: draft.id,
        requestedBy: "user-1",
        reason: "Unbound draft approval",
        riskTier: "TIER_1",
      });

      const events = state.dealEvents.filter(
        (e) => e.eventType === "contract.approval.requested",
      );
      expect(events).toHaveLength(0);
      expect(state.dealPassports).toHaveLength(0);
    });
  });

  describe("B. decideContractApproval", () => {
    it("emits contract.approval.approved when decision is APPROVED and draft has contractId", async () => {
      setupPassport();
      const draft = {
        id: "draft-2",
        tenantId: TENANT,
        contractId: CONTRACT_ID,
        status: "APPROVAL_PENDING",
      };
      state.drafts.push(draft);

      const approval = {
        id: "appr-2",
        tenantId: TENANT,
        draftId: draft.id,
        status: "PENDING",
        requestedBy: "user-1",
        requestedAt: new Date(),
        reason: "Review",
        evidenceJson: {},
      };
      state.approvals.push(approval);

      await decideContractApproval({
        tenantId: TENANT,
        approvalId: approval.id,
        decidedBy: "manager-1",
        decision: "APPROVED",
        reason: "Looks good",
      });

      const events = state.dealEvents.filter(
        (e) => e.eventType === "contract.approval.approved",
      );
      expect(events).toHaveLength(1);
      expect(events[0].idempotencyKey).toBe(
        `contract.approval.approved:${approval.id}`,
      );
      expect(events[0].payload).toMatchObject({
        draftId: draft.id,
        approvalId: approval.id,
        decision: "APPROVED",
      });

      const appendInput = state.appendedInputs.find(
        (i) => i.eventType === "contract.approval.approved",
      );
      expect(appendInput).toBeDefined();
      expect(appendInput!.projection).toEqual({ contractId: CONTRACT_ID });
      expect(appendInput!.projection?.status).toBeUndefined();

      const passport = state.dealPassports.find((p) => p.contractId === CONTRACT_ID);
      expect(passport?.status).toBe("CONTRACT_ISSUED");
    });

    it("emits contract.approval.rejected when decision is REJECTED and draft has contractId", async () => {
      setupPassport();
      const draft = {
        id: "draft-3",
        tenantId: TENANT,
        contractId: CONTRACT_ID,
        status: "APPROVAL_PENDING",
      };
      state.drafts.push(draft);

      const approval = {
        id: "appr-3",
        tenantId: TENANT,
        draftId: draft.id,
        status: "PENDING",
        requestedBy: "user-1",
        requestedAt: new Date(),
        reason: "Review discount",
        evidenceJson: {},
      };
      state.approvals.push(approval);

      await decideContractApproval({
        tenantId: TENANT,
        approvalId: approval.id,
        decidedBy: "manager-1",
        decision: "REJECTED",
        reason: "Discount too steep",
      });

      const events = state.dealEvents.filter(
        (e) => e.eventType === "contract.approval.rejected",
      );
      expect(events).toHaveLength(1);
      expect(events[0].idempotencyKey).toBe(
        `contract.approval.rejected:${approval.id}`,
      );
      expect(events[0].payload).toMatchObject({
        draftId: draft.id,
        approvalId: approval.id,
        decision: "REJECTED",
      });

      const appendInput = state.appendedInputs.find(
        (i) => i.eventType === "contract.approval.rejected",
      );
      expect(appendInput).toBeDefined();
      expect(appendInput!.projection).toEqual({ contractId: CONTRACT_ID });
      expect(appendInput!.projection?.status).toBeUndefined();

      const passport = state.dealPassports.find((p) => p.contractId === CONTRACT_ID);
      expect(passport?.status).toBe("CONTRACT_ISSUED");
    });

    it("does NOT emit any event when draft has null contractId", async () => {
      const draft = {
        id: "draft-unbound-decide",
        tenantId: TENANT,
        contractId: null,
        status: "APPROVAL_PENDING",
      };
      state.drafts.push(draft);

      const approval = {
        id: "appr-unbound",
        tenantId: TENANT,
        draftId: draft.id,
        status: "PENDING",
        requestedBy: "user-1",
        requestedAt: new Date(),
      };
      state.approvals.push(approval);

      await decideContractApproval({
        tenantId: TENANT,
        approvalId: approval.id,
        decidedBy: "manager-1",
        decision: "APPROVED",
      });

      expect(state.dealEvents).toHaveLength(0);
      expect(state.dealPassports).toHaveLength(0);
    });
  });

  describe("C. issueCanonicalApprovedContractSnapshot", () => {
    it("emits contract.snapshot.created with causation, beforeState: null, and afterState", async () => {
      setupPassport();
      const draft = {
        id: "draft-snap-1",
        tenantId: TENANT,
        contractId: CONTRACT_ID,
        status: "APPROVED",
      };
      state.drafts.push(draft);

      const snapshot = await issueCanonicalApprovedContractSnapshot({
        tenantId: TENANT,
        draftId: draft.id,
        createdBy: "user-snap",
      });

      const events = state.dealEvents.filter(
        (e) => e.eventType === "contract.snapshot.created",
      );
      expect(events).toHaveLength(1);
      expect(events[0].idempotencyKey).toBe(
        `contract.snapshot.created:${snapshot.id}`,
      );
      expect(events[0].payload).toMatchObject({
        snapshotId: snapshot.id,
        draftId: draft.id,
        contractId: CONTRACT_ID,
        digest: snapshot.digest,
      });

      const appendInput = state.appendedInputs.find(
        (i) => i.eventType === "contract.snapshot.created",
      );
      expect(appendInput).toBeDefined();
      expect(appendInput!.correlationId).toMatch(/^contract-snapshot:/);
      expect(appendInput!.causationId).toBe("event-init");
      expect(appendInput!.beforeState).toBeNull();
      expect(appendInput!.afterState).toEqual({
        snapshotType: "ISSUED",
        digest: snapshot.digest,
      });
      expect(appendInput!.projection).toEqual({ contractId: CONTRACT_ID });
      expect(appendInput!.projection?.status).toBeUndefined();

      const passport = state.dealPassports.find((p) => p.contractId === CONTRACT_ID);
      expect(passport?.status).toBe("CONTRACT_ISSUED");
    });

    it("does NOT emit on replay of existing snapshot with identical digest", async () => {
      setupPassport();
      const draft = {
        id: "draft-snap-2",
        tenantId: TENANT,
        contractId: CONTRACT_ID,
        status: "APPROVED",
      };
      state.drafts.push(draft);

      // First issuance
      const first = await issueCanonicalApprovedContractSnapshot({
        tenantId: TENANT,
        draftId: draft.id,
        createdBy: "user-snap",
      });

      const initialEventsCount = state.dealEvents.filter(
        (e) => e.eventType === "contract.snapshot.created",
      ).length;
      expect(initialEventsCount).toBe(1);

      // Replay
      const second = await issueCanonicalApprovedContractSnapshot({
        tenantId: TENANT,
        draftId: draft.id,
        createdBy: "user-snap",
      });

      expect(second.id).toBe(first.id);
      const afterReplayCount = state.dealEvents.filter(
        (e) => e.eventType === "contract.snapshot.created",
      ).length;
      expect(afterReplayCount).toBe(1);
    });

    it("does NOT emit when draft contractId is null", async () => {
      const draft = {
        id: "draft-snap-unbound",
        tenantId: TENANT,
        contractId: null,
        status: "APPROVED",
      };
      state.drafts.push(draft);

      await issueCanonicalApprovedContractSnapshot({
        tenantId: TENANT,
        draftId: draft.id,
        createdBy: "user-snap",
      });

      expect(state.dealEvents).toHaveLength(0);
      expect(state.dealPassports).toHaveLength(0);
    });
  });

  describe("D. invoice.issued", () => {
    it("emits invoice.issued with exact beforeState, afterState, payload, and NO currency field", async () => {
      setupPassport();
      setupContractAndSignatories();

      const signatory = {
        id: "sig-1",
        tenantId: TENANT,
        contractId: CONTRACT_ID,
        role: "BUYER",
        required: true,
        status: "PENDING",
        signerReference: "lead-1",
      };
      state.signatories.push(signatory);

      const result = await signContractSignatory({
        tenantId: TENANT,
        userId: "user-signer",
        contractId: CONTRACT_ID,
        signatoryId: signatory.id,
        signatureEvidence: {
          method: "OTP_SMS",
          signerName: "Buyer Bob",
          capturedAt: new Date(),
        },
      });

      expect(result.finalized).toBe(true);

      const invoiceEvents = state.dealEvents.filter((e) => e.eventType === "invoice.issued");
      expect(invoiceEvents).toHaveLength(1);
      expect(invoiceEvents[0].idempotencyKey).toBe(`invoice.issued:${result.invoice.id}`);

      const appendInput = state.appendedInputs.find(
        (i) => i.eventType === "invoice.issued",
      );
      expect(appendInput).toBeDefined();

      const signedEvent = state.dealEvents.find((e) => e.eventType === "contract.signed");
      expect(appendInput!.causationId).toBe(signedEvent!.id);

      expect(appendInput!.beforeState).toEqual({
        invoiceExists: false,
      });

      expect(appendInput!.afterState).toEqual({
        invoiceExists: true,
        invoiceId: result.invoice.id,
        invoiceNumber: result.invoice.invoiceNumber,
        status: result.invoice.status,
      });

      expect(appendInput!.payload).toEqual({
        invoiceId: result.invoice.id,
        invoiceNumber: result.invoice.invoiceNumber,
        invoicePrefix: result.invoice.invoicePrefix,
        type: result.invoice.type,
        totalAmount: Number(result.invoice.totalAmount),
        contractId: CONTRACT_ID,
      });

      // Assert NO currency in payload or afterState
      expect((appendInput!.payload as any).currency).toBeUndefined();
      expect(JSON.stringify(appendInput!.payload)).not.toContain("currency");
      expect(JSON.stringify(appendInput!.payload)).not.toContain("TRY");

      expect(appendInput!.projection).toEqual({ contractId: CONTRACT_ID });
      expect(appendInput!.projection?.status).toBeUndefined();

      const passport = state.dealPassports.find((p) => p.contractId === CONTRACT_ID);
      expect(passport?.status).toBe("FINANCIALS_ACTIVE");
    });

    it("does NOT emit invoice.issued when contract signing reuses existing invoice", async () => {
      setupPassport();
      setupContractAndSignatories();

      const existingInvoice = {
        id: "existing-inv-1",
        tenantId: TENANT,
        contractId: CONTRACT_ID,
        type: "SALE",
        invoiceNumber: 1,
        invoicePrefix: "INV",
        totalAmount: 115000,
        subtotal: 100000,
        vatRate: 15,
        vatAmount: 15000,
        status: "UNPAID",
      };
      state.invoices.push(existingInvoice);

      const signatory = {
        id: "sig-reuse",
        tenantId: TENANT,
        contractId: CONTRACT_ID,
        role: "BUYER",
        required: true,
        status: "PENDING",
      };
      state.signatories.push(signatory);

      const result = await signContractSignatory({
        tenantId: TENANT,
        userId: "user-signer",
        contractId: CONTRACT_ID,
        signatoryId: signatory.id,
        signatureEvidence: {
          method: "OTP_SMS",
          signerName: "Buyer Bob",
          capturedAt: new Date(),
        },
      });

      expect(result.finalized).toBe(true);
      expect(result.invoice.id).toBe("existing-inv-1");

      const invoiceEvents = state.dealEvents.filter((e) => e.eventType === "invoice.issued");
      expect(invoiceEvents).toHaveLength(0);

      const signedEvents = state.dealEvents.filter((e) => e.eventType === "contract.signed");
      const financialsEvents = state.dealEvents.filter((e) => e.eventType === "financials.activated");
      expect(signedEvents).toHaveLength(1);
      expect(financialsEvents).toHaveLength(1);
    });

    it("relative placement: occurs strictly after contract.signed and before financials.activated", async () => {
      setupPassport();
      setupContractAndSignatories();

      const signatory = {
        id: "sig-placement",
        tenantId: TENANT,
        contractId: CONTRACT_ID,
        role: "BUYER",
        required: true,
        status: "PENDING",
      };
      state.signatories.push(signatory);

      await signContractSignatory({
        tenantId: TENANT,
        userId: "user-signer",
        contractId: CONTRACT_ID,
        signatoryId: signatory.id,
        signatureEvidence: {
          method: "OTP_SMS",
          signerName: "Buyer Bob",
          capturedAt: new Date(),
        },
      });

      const types = state.dealEvents.map((e) => e.eventType);
      const signatoryIndex = types.indexOf("signatory.signed");
      const signedIndex = types.indexOf("contract.signed");
      const invoiceIndex = types.indexOf("invoice.issued");
      const financialsIndex = types.indexOf("financials.activated");

      expect(signatoryIndex).toBeLessThan(signedIndex);
      expect(signedIndex).toBeLessThan(invoiceIndex);
      expect(invoiceIndex).toBeLessThan(financialsIndex);

      const signedSeq = state.dealEvents[signedIndex].sequence;
      const invoiceSeq = state.dealEvents[invoiceIndex].sequence;
      const financialsSeq = state.dealEvents[financialsIndex].sequence;

      expect(signedSeq).toBeLessThan(invoiceSeq);
      expect(invoiceSeq).toBeLessThan(financialsSeq);
    });
  });

  describe("E. signatory.signed", () => {
    it("emits signatory.signed with exact beforeState, afterState, causation, and signedAt in payload", async () => {
      setupPassport();
      setupContractAndSignatories();

      const signatory = {
        id: "sig-transition-1",
        tenantId: TENANT,
        contractId: CONTRACT_ID,
        role: "BUYER",
        required: true,
        status: "PENDING",
        signerReference: "lead-42",
      };
      state.signatories.push(signatory);

      await signContractSignatory({
        tenantId: TENANT,
        userId: "user-signer",
        contractId: CONTRACT_ID,
        signatoryId: signatory.id,
        signatureEvidence: {
          method: "OTP_SMS",
          signerName: "Alice Buyer",
          capturedAt: new Date(),
        },
      });

      const sigEvents = state.dealEvents.filter((e) => e.eventType === "signatory.signed");
      expect(sigEvents).toHaveLength(1);
      expect(sigEvents[0].idempotencyKey).toBe(`signatory.signed:${signatory.id}`);

      const appendInput = state.appendedInputs.find(
        (i) => i.eventType === "signatory.signed",
      );
      expect(appendInput).toBeDefined();
      expect(appendInput!.causationId).toBe("event-init");
      expect(appendInput!.beforeState).toEqual({
        status: "PENDING",
      });
      expect(appendInput!.afterState).toEqual({
        status: "SIGNED",
        signatureEvidenceHash: expect.any(String),
      });
      expect(appendInput!.payload).toEqual({
        signatoryId: signatory.id,
        contractId: CONTRACT_ID,
        role: "BUYER",
        signerReference: "lead-42",
        signedAt: expect.any(String),
      });

      // method and signatureEvidenceHash must not be in payload
      expect((appendInput!.payload as any).method).toBeUndefined();
      expect((appendInput!.payload as any).signatureEvidenceHash).toBeUndefined();

      expect(appendInput!.projection).toEqual({ contractId: CONTRACT_ID });
      expect(appendInput!.projection?.status).toBeUndefined();
    });

    it("does NOT emit signatory.signed on replay of already-SIGNED signatory", async () => {
      setupPassport();
      setupContractAndSignatories();

      const signatory = {
        id: "sig-replay-1",
        tenantId: TENANT,
        contractId: CONTRACT_ID,
        role: "BUYER",
        required: true,
        status: "PENDING",
      };
      state.signatories.push(signatory);

      const evidence = {
        method: "OTP_SMS",
        signerName: "Alice Buyer",
        capturedAt: new Date("2026-09-24T12:00:00Z"),
      };

      // First signature
      await signContractSignatory({
        tenantId: TENANT,
        userId: "user-signer",
        contractId: CONTRACT_ID,
        signatoryId: signatory.id,
        signatureEvidence: evidence,
      });

      const firstCount = state.dealEvents.filter((e) => e.eventType === "signatory.signed").length;
      expect(firstCount).toBe(1);

      // Replay identical evidence
      await signContractSignatory({
        tenantId: TENANT,
        userId: "user-signer",
        contractId: CONTRACT_ID,
        signatoryId: signatory.id,
        signatureEvidence: evidence,
      });

      const secondCount = state.dealEvents.filter((e) => e.eventType === "signatory.signed").length;
      expect(secondCount).toBe(1);
    });

    it("multi-sign scenario: each signatory gets distinct signatory.signed event with unique sequence", async () => {
      setupPassport();
      setupContractAndSignatories();

      const sig1 = {
        id: "sig-multi-1",
        tenantId: TENANT,
        contractId: CONTRACT_ID,
        role: "BUYER",
        required: true,
        status: "PENDING",
      };
      const sig2 = {
        id: "sig-multi-2",
        tenantId: TENANT,
        contractId: CONTRACT_ID,
        role: "CO_BUYER",
        required: true,
        status: "PENDING",
      };
      state.signatories.push(sig1, sig2);

      // First signer
      const r1 = await signContractSignatory({
        tenantId: TENANT,
        userId: "user-1",
        contractId: CONTRACT_ID,
        signatoryId: sig1.id,
        signatureEvidence: { method: "OTP_SMS", signerName: "Signer 1", capturedAt: new Date() },
      });
      expect(r1.finalized).toBe(false);

      const sig1Events = state.dealEvents.filter((e) => e.eventType === "signatory.signed");
      expect(sig1Events).toHaveLength(1);
      expect(sig1Events[0].idempotencyKey).toBe(`signatory.signed:${sig1.id}`);

      // Contract not signed yet
      expect(state.dealEvents.filter((e) => e.eventType === "contract.signed")).toHaveLength(0);

      // Second signer completes required set
      const r2 = await signContractSignatory({
        tenantId: TENANT,
        userId: "user-2",
        contractId: CONTRACT_ID,
        signatoryId: sig2.id,
        signatureEvidence: { method: "OTP_SMS", signerName: "Signer 2", capturedAt: new Date() },
      });
      expect(r2.finalized).toBe(true);

      const allSigEvents = state.dealEvents.filter((e) => e.eventType === "signatory.signed");
      expect(allSigEvents).toHaveLength(2);
      expect(allSigEvents[1].idempotencyKey).toBe(`signatory.signed:${sig2.id}`);
      expect(allSigEvents[0].sequence).toBeLessThan(allSigEvents[1].sequence);

      // Finalized events occurred after both signatories signed
      const signedEvent = state.dealEvents.find((e) => e.eventType === "contract.signed");
      expect(allSigEvents[1].sequence).toBeLessThan(signedEvent!.sequence);
    });
  });

  describe("H. F4-B5 Document Events", () => {
    it("1. successful preparation: Document READY + Delivery PENDING + exactly one contract.document.generated", async () => {
      setupPassport(CONTRACT_ID, "FINANCIALS_ACTIVE");
      setupSignedContractAndDeliverySnapshot();

      sendEmailMock.mockResolvedValueOnce({
        success: true,
        provider: "RESEND",
        providerMessageId: "msg-resend-1",
      });

      const res = await sendContractDocument({
        tenantId: TENANT,
        userId: "user-1",
        ownerName: "Owner One",
        contractId: CONTRACT_ID,
        recipient: "buyer@example.com",
      });

      expect(res.status).toBe("SENT");
      expect(state.documents).toHaveLength(1);
      expect(state.documents[0].status).toBe("READY");

      const generatedEvents = state.dealEvents.filter(
        (e) => e.eventType === "contract.document.generated",
      );
      expect(generatedEvents).toHaveLength(1);
      expect(generatedEvents[0].idempotencyKey).toBe(
        `contract.document.generated:${state.documents[0].id}`,
      );

      const appendInput = state.appendedInputs.find(
        (i) => i.eventType === "contract.document.generated",
      );
      expect(appendInput).toBeDefined();
      expect(appendInput!.correlationId).toMatch(/^contract-document:/);
      expect(appendInput!.causationId).toBe("event-init");
      expect(appendInput!.entityType).toBe("document");
      expect(appendInput!.entityId).toBe(state.documents[0].id);
      expect(appendInput!.actorId).toBe("user-1");
      expect(appendInput!.beforeState).toBeNull();
      expect(appendInput!.afterState).toEqual({
        documentStatus: "READY",
        deliveryStatus: "PENDING",
      });
      expect(appendInput!.payload).toEqual({
        contractId: CONTRACT_ID,
        documentId: state.documents[0].id,
        deliveryId: state.deliveries[0].id,
        snapshotId: "snap-signed-op-1",
        checksumSha256: state.documents[0].checksumSha256,
        channel: "EMAIL",
      });
      expect(appendInput!.projection).toEqual({ contractId: CONTRACT_ID });
      expect(appendInput!.projection?.status).toBeUndefined();

      // Ensure NO document content and NO recipient email in DealEvent payload
      const payloadStr = JSON.stringify(appendInput!.payload);
      expect(payloadStr).not.toContain("buyer@example.com");
      expect(payloadStr).not.toContain("<html>");
    });

    it("2. generated event failure: initial transaction rolls back", async () => {
      setupPassport(CONTRACT_ID, "FINANCIALS_ACTIVE");
      setupSignedContractAndDeliverySnapshot();

      state.shouldFailGeneratedEvent = true;

      await expect(
        sendContractDocument({
          tenantId: TENANT,
          userId: "user-1",
          ownerName: "Owner One",
          contractId: CONTRACT_ID,
          recipient: "buyer@example.com",
        }),
      ).rejects.toThrow("Simulated generated event persistence failure");

      // Verify rollback: no document or delivery persisted
      expect(state.documents).toHaveLength(0);
      expect(state.deliveries).toHaveLength(0);
      expect(
        state.dealEvents.filter((e) => e.eventType === "contract.document.generated"),
      ).toHaveLength(0);
      expect(sendEmailMock).not.toHaveBeenCalled();
    });

    it("3 & 4. provider accepted: PENDING -> SENT and contract.document.sent in same persistence transaction with causationId = generatedEventId", async () => {
      setupPassport(CONTRACT_ID, "FINANCIALS_ACTIVE");
      setupSignedContractAndDeliverySnapshot();

      sendEmailMock.mockResolvedValueOnce({
        success: true,
        provider: "RESEND",
        providerMessageId: "msg-resend-accepted",
      });

      const res = await sendContractDocument({
        tenantId: TENANT,
        userId: "user-1",
        ownerName: "Owner One",
        contractId: CONTRACT_ID,
        recipient: "buyer@example.com",
      });

      expect(res.status).toBe("SENT");
      expect(state.deliveries[0].status).toBe("SENT");

      const sentEvents = state.dealEvents.filter((e) => e.eventType === "contract.document.sent");
      expect(sentEvents).toHaveLength(1);

      const generatedEvent = state.dealEvents.find(
        (e) => e.eventType === "contract.document.generated",
      );
      expect(generatedEvent).toBeDefined();

      const appendInput = state.appendedInputs.find((i) => i.eventType === "contract.document.sent");
      expect(appendInput).toBeDefined();
      expect(appendInput!.idempotencyKey).toBe(`contract.document.sent:${res.id}`);
      expect(appendInput!.causationId).toBe(generatedEvent!.id);
      expect(appendInput!.entityType).toBe("document");
      expect(appendInput!.entityId).toBe(res.documentId);
      expect(appendInput!.actorId).toBe("user-1");
      expect(appendInput!.beforeState).toEqual({
        deliveryStatus: "PENDING",
      });
      expect(appendInput!.afterState).toEqual({
        deliveryStatus: "SENT",
        provider: "RESEND",
        providerReference: "msg-resend-accepted",
      });
      expect(appendInput!.payload).toEqual({
        contractId: CONTRACT_ID,
        documentId: res.documentId,
        deliveryId: res.id,
        snapshotId: res.snapshotId,
        channel: "EMAIL",
        provider: "RESEND",
        providerReference: "msg-resend-accepted",
        providerAccepted: true,
      });
      expect(appendInput!.projection).toEqual({ contractId: CONTRACT_ID });
      expect(appendInput!.projection?.status).toBeUndefined();
    });

    it("5. provider rejection: Delivery FAILED and no contract.document.sent", async () => {
      setupPassport(CONTRACT_ID, "FINANCIALS_ACTIVE");
      setupSignedContractAndDeliverySnapshot();

      sendEmailMock.mockResolvedValueOnce({
        success: false,
        code: "SMTP_REJECTED",
      });

      const res = await sendContractDocument({
        tenantId: TENANT,
        userId: "user-1",
        ownerName: "Owner One",
        contractId: CONTRACT_ID,
        recipient: "buyer@example.com",
      });

      expect(res.status).toBe("FAILED");
      expect(state.deliveries[0].status).toBe("FAILED");

      // Generated event exists
      expect(
        state.dealEvents.filter((e) => e.eventType === "contract.document.generated"),
      ).toHaveLength(1);

      // Sent event MUST NOT exist
      expect(
        state.dealEvents.filter((e) => e.eventType === "contract.document.sent"),
      ).toHaveLength(0);
    });

    it("6. provider throw: Delivery remains PENDING and no contract.document.sent", async () => {
      setupPassport(CONTRACT_ID, "FINANCIALS_ACTIVE");
      setupSignedContractAndDeliverySnapshot();

      sendEmailMock.mockRejectedValueOnce(new Error("Socket network timeout"));

      await expect(
        sendContractDocument({
          tenantId: TENANT,
          userId: "user-1",
          ownerName: "Owner One",
          contractId: CONTRACT_ID,
          recipient: "buyer@example.com",
        }),
      ).rejects.toThrow();

      // Delivery remains PENDING
      expect(state.deliveries[0].status).toBe("PENDING");

      // Generated event exists
      expect(
        state.dealEvents.filter((e) => e.eventType === "contract.document.generated"),
      ).toHaveLength(1);

      // Sent event MUST NOT exist
      expect(
        state.dealEvents.filter((e) => e.eventType === "contract.document.sent"),
      ).toHaveLength(0);
    });

    it("7 & 8. both document events: projection has contractId only, status preserved, exact keys", async () => {
      const passport = setupPassport(CONTRACT_ID, "FINANCIALS_ACTIVE");
      setupSignedContractAndDeliverySnapshot();

      sendEmailMock.mockResolvedValueOnce({
        success: true,
        provider: "RESEND",
        providerMessageId: "msg-exact-keys",
      });

      const res = await sendContractDocument({
        tenantId: TENANT,
        userId: "user-1",
        ownerName: "Owner One",
        contractId: CONTRACT_ID,
        recipient: "buyer@example.com",
      });

      expect(passport.status).toBe("FINANCIALS_ACTIVE");

      const genInput = state.appendedInputs.find(
        (i) => i.eventType === "contract.document.generated",
      );
      const sentInput = state.appendedInputs.find(
        (i) => i.eventType === "contract.document.sent",
      );

      expect(genInput!.idempotencyKey).toBe(`contract.document.generated:${res.documentId}`);
      expect(sentInput!.idempotencyKey).toBe(`contract.document.sent:${res.id}`);

      expect(genInput!.projection).toEqual({ contractId: CONTRACT_ID });
      expect(genInput!.projection?.status).toBeUndefined();

      expect(sentInput!.projection).toEqual({ contractId: CONTRACT_ID });
      expect(sentInput!.projection?.status).toBeUndefined();
    });

    it("9. no delivered/read event semantics", async () => {
      setupPassport(CONTRACT_ID, "FINANCIALS_ACTIVE");
      setupSignedContractAndDeliverySnapshot();

      sendEmailMock.mockResolvedValueOnce({
        success: true,
        provider: "RESEND",
        providerMessageId: "msg-123",
      });

      await sendContractDocument({
        tenantId: TENANT,
        userId: "user-1",
        ownerName: "Owner One",
        contractId: CONTRACT_ID,
        recipient: "buyer@example.com",
      });

      const eventTypes = state.dealEvents.map((e) => e.eventType);
      expect(eventTypes).not.toContain("contract.document.delivered");
      expect(eventTypes).not.toContain("contract.document.read");
      expect(eventTypes).not.toContain("document.delivered");
      expect(eventTypes).not.toContain("document.read");
    });
  });

  describe("F. Status preservation across all 6 informational events", () => {
    it("all 6 informational events preserve DealPassport.status", async () => {
      const passport = setupPassport(CONTRACT_ID, "CONTRACT_ISSUED");

      const draft = {
        id: "draft-status-test",
        tenantId: TENANT,
        contractId: CONTRACT_ID,
        status: "DRAFT",
      };
      state.drafts.push(draft);

      // 1. contract.approval.requested
      const appr = await requestContractApproval({
        tenantId: TENANT,
        draftId: draft.id,
        requestedBy: "u1",
        reason: "Test",
        riskTier: "TIER_1",
      });
      expect(passport.status).toBe("CONTRACT_ISSUED");

      // 2. contract.approval.rejected (tested on separate approval)
      const draftReject = {
        id: "draft-reject-status",
        tenantId: TENANT,
        contractId: CONTRACT_ID,
        status: "APPROVAL_PENDING",
      };
      state.drafts.push(draftReject);
      const apprReject = {
        id: "appr-reject-test",
        tenantId: TENANT,
        draftId: draftReject.id,
        status: "PENDING",
        requestedBy: "u1",
        requestedAt: new Date(),
      };
      state.approvals.push(apprReject);

      await decideContractApproval({
        tenantId: TENANT,
        approvalId: apprReject.id,
        decidedBy: "mgr1",
        decision: "REJECTED",
      });
      expect(passport.status).toBe("CONTRACT_ISSUED");

      // 3. contract.approval.approved
      await decideContractApproval({
        tenantId: TENANT,
        approvalId: appr.id,
        decidedBy: "mgr2",
        decision: "APPROVED",
      });
      expect(passport.status).toBe("CONTRACT_ISSUED");

      // 4. contract.snapshot.created
      await issueCanonicalApprovedContractSnapshot({
        tenantId: TENANT,
        draftId: draft.id,
        createdBy: "u1",
      });
      expect(passport.status).toBe("CONTRACT_ISSUED");

      // Setup for signing
      setupContractAndSignatories();
      const sig1 = {
        id: "sig-part-1",
        tenantId: TENANT,
        contractId: CONTRACT_ID,
        role: "BUYER",
        required: true,
        status: "PENDING",
      };
      const sig2 = {
        id: "sig-part-2",
        tenantId: TENANT,
        contractId: CONTRACT_ID,
        role: "CO_BUYER",
        required: true,
        status: "PENDING",
      };
      state.signatories.push(sig1, sig2);

      // 5. signatory.signed (partial signing, passport still not finalized)
      await signContractSignatory({
        tenantId: TENANT,
        userId: "u1",
        contractId: CONTRACT_ID,
        signatoryId: sig1.id,
        signatureEvidence: { method: "OTP_SMS", signerName: "S1", capturedAt: new Date() },
      });
      expect(passport.status).toBe("CONTRACT_ISSUED");

      // 6. invoice.issued: complete signing
      await signContractSignatory({
        tenantId: TENANT,
        userId: "u2",
        contractId: CONTRACT_ID,
        signatoryId: sig2.id,
        signatureEvidence: { method: "OTP_SMS", signerName: "S2", capturedAt: new Date() },
      });

      // Verify each of the 6 informational events had no projection.status
      const informationalTypes = [
        "contract.approval.requested",
        "contract.approval.approved",
        "contract.approval.rejected",
        "contract.snapshot.created",
        "signatory.signed",
        "invoice.issued",
      ];

      for (const eventType of informationalTypes) {
        const input = state.appendedInputs.find((i) => i.eventType === eventType);
        expect(input, `Expected appended input for ${eventType}`).toBeDefined();
        expect(input!.projection?.status, `Expected projection.status undefined for ${eventType}`).toBeUndefined();
      }
    });
  });

  describe("G. Sequence ordering integrity", () => {
    it("assigns strictly increasing sequences across the event stream", async () => {
      setupPassport();
      setupContractAndSignatories();

      const draft = {
        id: "draft-seq-1",
        tenantId: TENANT,
        contractId: CONTRACT_ID,
        status: "DRAFT",
      };
      state.drafts.push(draft);

      // Step 1: approval requested
      const appr = await requestContractApproval({
        tenantId: TENANT,
        draftId: draft.id,
        requestedBy: "u1",
        reason: "Seq test",
        riskTier: "TIER_1",
      });

      // Step 2: approval approved
      await decideContractApproval({
        tenantId: TENANT,
        approvalId: appr.id,
        decidedBy: "mgr1",
        decision: "APPROVED",
      });

      // Step 3: snapshot created
      await issueCanonicalApprovedContractSnapshot({
        tenantId: TENANT,
        draftId: draft.id,
        createdBy: "u1",
      });

      // Step 4 & 5: signatory signed + contract signing completion
      const sig = {
        id: "sig-seq-1",
        tenantId: TENANT,
        contractId: CONTRACT_ID,
        role: "BUYER",
        required: true,
        status: "PENDING",
      };
      state.signatories.push(sig);

      await signContractSignatory({
        tenantId: TENANT,
        userId: "u1",
        contractId: CONTRACT_ID,
        signatoryId: sig.id,
        signatureEvidence: { method: "OTP_SMS", signerName: "Signer", capturedAt: new Date() },
      });

      const sequences = state.dealEvents.map((e) => e.sequence);
      expect(sequences.length).toBeGreaterThanOrEqual(6);

      for (let i = 1; i < sequences.length; i++) {
        expect(sequences[i]).toBeGreaterThan(sequences[i - 1]);
      }
    });
  });
});
