import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const ROOT = resolve(__dirname, "../..");
const w1Schema = readFileSync(resolve(ROOT, "prisma/w1-contract-finance.prisma"), "utf8");
const legacySchema = readFileSync(resolve(ROOT, "prisma/schema.prisma"), "utf8");

function modelBlock(source: string, model: string): string {
  const match = source.match(new RegExp(`model ${model} \\{[\\s\\S]*?\\n\\}`));
  if (!match) throw new Error(`model ${model} not found`);
  return match[0];
}

describe("R1 — ContractSignatory has a real tenant-scoped Contract relation", () => {
  it("declares fields [tenantId, contractId] -> references [tenantId, id] with onDelete Restrict", () => {
    const block = modelBlock(w1Schema, "ContractSignatory");
    expect(block).toMatch(
      /contract\s+Contract\s+@relation\(fields: \[tenantId, contractId\], references: \[tenantId, id\], onDelete: Restrict\)/,
    );
  });

  it("Contract carries the matching back-relation in the legacy schema", () => {
    const block = modelBlock(legacySchema, "Contract");
    expect(block).toMatch(/signatories\s+ContractSignatory\[\]/);
  });
});

describe("R12 — ContractDraft has a real, unique canonical link to Contract", () => {
  it("declares a nullable Contract relation on [tenantId, contractId] -> [tenantId, id]", () => {
    const block = modelBlock(w1Schema, "ContractDraft");
    expect(block).toMatch(
      /contract\s+Contract\?\s+@relation\(fields: \[tenantId, contractId\], references: \[tenantId, id\], onDelete: Restrict\)/,
    );
  });

  it("enforces @@unique([tenantId, contractId]) so a contract can be canonically bound to at most one draft", () => {
    const block = modelBlock(w1Schema, "ContractDraft");
    expect(block).toMatch(/@@unique\(\[tenantId, contractId\]/);
  });

  it("Contract carries the matching ContractDraft back-relation in the legacy schema", () => {
    const block = modelBlock(legacySchema, "Contract");
    expect(block).toMatch(/drafts\s+ContractDraft\[\]/);
  });
});

const state = vi.hoisted(() => ({
  contract: null as any,
  paymentPlan: null as any,
  invoices: [] as any[],
  installments: [] as any[],
  audits: [] as any[],
  snapshots: [] as any[],
  signatories: [] as any[],
  drafts: [] as any[],
  approvals: [] as any[],
  contractUpdates: 0,
  signatorySeq: 0,
}));

const mockPrisma = vi.hoisted(() => {
  const tx: any = {
    contract: {
      findFirst: vi.fn(async ({ where }: any = {}) => {
        if (!state.contract) return null;
        if (where?.id !== undefined && state.contract.id !== where.id) return null;
        if (where?.tenantId !== undefined && state.contract.tenantId !== where.tenantId) return null;
        return state.contract;
      }),
      create: vi.fn(async ({ data }: any) => {
        // Mirrors Prisma column defaults not set explicitly by
        // _createContractInTx (version, vatType, vatRate) plus the
        // relation-shaped fields the mocked tx.contract.findFirst assumes
        // elsewhere in this suite (unit/tenant/offer), since this mock does
        // not honor Prisma `select`/`include`.
        state.contract = {
          id: "contract-1",
          version: 1,
          vatType: "STANDARD",
          vatRate: 15,
          unit: { unitNumber: "A-1", type: "APARTMENT", area: 120, city: "Riyadh", district: "Olaya" },
          tenant: { companyName: "ORCA Dev", vatNumber: "300", commercialRegistry: "101", nationalAddress: "Riyadh" },
          offer: null,
          installments: [],
          paymentPlan: null,
          ...data,
        };
        return state.contract;
      }),
      update: vi.fn(async ({ data }: any) => {
        state.contractUpdates += 1;
        state.contract = {
          ...state.contract,
          status: data.status,
          signedAt: data.signedAt,
          reservationExpiresAt: null,
          version: state.contract.version + 1,
        };
        return state.contract;
      }),
    },
    contractSignatory: {
      findFirst: vi.fn(async ({ where }: any) =>
        state.signatories.find(
          (row) => row.id === where.id && row.tenantId === where.tenantId,
        ) || null,
      ),
      findMany: vi.fn(async ({ where }: any) =>
        state.signatories.filter(
          (row) =>
            row.tenantId === where.tenantId &&
            row.contractId === where.contractId &&
            (where.required === undefined || row.required === where.required),
        ),
      ),
      update: vi.fn(async ({ where, data }: any) => {
        const row = state.signatories.find((item) => item.id === where.id);
        if (!row) throw new Error("signatory not found");
        Object.assign(row, data);
        return row;
      }),
      create: vi.fn(async ({ data }: any) => {
        state.signatorySeq += 1;
        const row = { id: `sig-auto-${state.signatorySeq}`, ...data };
        state.signatories.push(row);
        return row;
      }),
      deleteMany: vi.fn(async ({ where }: any) => {
        const before = state.signatories.length;
        state.signatories = state.signatories.filter(
          (row) => !(row.tenantId === where.tenantId && row.contractId === where.contractId),
        );
        return { count: before - state.signatories.length };
      }),
    },
    contractDraft: {
      findFirst: vi.fn(async ({ where }: any) =>
        state.drafts.find(
          (row) =>
            row.id === where.id ||
            (row.tenantId === where.tenantId &&
              row.contractId === where.contractId &&
              (where.status === undefined || row.status === where.status)),
        ) || null,
      ),
      update: vi.fn(async ({ where, data }: any) => {
        const row = state.drafts.find((item) => item.id === where.id);
        if (row) Object.assign(row, data);
        return row;
      }),
    },
    contractApproval: {
      findFirst: vi.fn(async ({ where }: any) =>
        state.approvals.find((row) => row.id === where.id && row.tenantId === where.tenantId) || null,
      ),
      update: vi.fn(async ({ where, data }: any) => {
        const row = state.approvals.find((item) => item.id === where.id);
        if (!row) throw new Error("approval not found");
        Object.assign(row, data);
        return row;
      }),
    },
    invoice: {
      findMany: vi.fn(async () => state.invoices),
      create: vi.fn(async ({ data }: any) => {
        const invoice = { id: `invoice-${state.invoices.length + 1}`, ...data };
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
    tenant: {
      update: vi.fn(async () => ({ nextInvoiceNumber: 2, invoicePrefix: "INV" })),
    },
    journalEntry: { findFirst: vi.fn(async () => null) },
    paymentPlan: {
      updateMany: vi.fn(async ({ data }: any) => {
        state.paymentPlan = { ...state.paymentPlan, ...data };
        return { count: 1 };
      }),
      findFirst: vi.fn(async () => state.paymentPlan),
    },
    auditLog: {
      create: vi.fn(async ({ data }: any) => {
        state.audits.push(data);
        return data;
      }),
      findFirst: vi.fn(async () => null),
    },
    contractSnapshot: {
      findFirst: vi.fn(async ({ where }: any) => {
        if (where.draftId !== undefined) {
          return (
            state.snapshots.find(
              (row) =>
                row.tenantId === where.tenantId &&
                row.draftId === where.draftId &&
                row.snapshotType === where.snapshotType,
            ) || null
          );
        }
        return (
          state.snapshots.find(
            (row) =>
              row.tenantId === where.tenantId &&
              row.contractId === where.contractId &&
              row.snapshotType === where.snapshotType &&
              (where.contractVersion === undefined || row.contractVersion === where.contractVersion),
          ) || null
        );
      }),
      create: vi.fn(async ({ data }: any) => {
        const row = { id: `snapshot-${state.snapshots.length + 1}`, issuedAt: new Date(), ...data };
        state.snapshots.push(row);
        return row;
      }),
    },
    unit: { update: vi.fn(async () => ({})) },
    lead: { update: vi.fn(async () => ({})) },
    opportunity: { update: vi.fn(async () => ({})) },
    telemetryEvent: { create: vi.fn(async () => ({})) },
  };
  return {
    tx,
    prisma: {
      ...tx,
      contract: {
        ...tx.contract,
        findFirst: vi.fn(async (args: any) =>
          args?.select?.spineVersion
            ? { spineVersion: 2, legacyFinancial: false }
            : state.contract,
        ),
      },
      $transaction: vi.fn(async (fn: any) => fn(tx)),
    },
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma.prisma }));
vi.mock("@/lib/domain/deal-passport", () => ({
  ensureDealCorrelationId: () => "corr-1",
  resolveDealInTx: async () => ({ passport: null }),
  appendDealEventInTx: async () => ({ event: null }),
}));
vi.mock("@/lib/accounting", () => ({
  seedChartOfAccounts: async () => undefined,
  findAccountByCode: async (_tenantId: string, code: string) => ({ id: `acct-${code}` }),
  postInvoiceEntry: async () => undefined,
}));
vi.mock("@/lib/privacy-mask", () => ({
  hashPhone: (_tenantId: string, phone: string) => `hashed:${phone}`,
}));
vi.mock("@/lib/vat/engine", () => ({
  calculateVat: (amount: number) => ({ vatAmount: amount * 0.15, totalAmount: amount * 1.15 }),
}));
vi.mock("@/lib/domain/transaction-spine/validate-tenant", () => ({
  assertTenantOwnership: async () => undefined,
  assertTenantOwnershipInTx: async () => undefined,
}));
vi.mock("@/lib/domain/transaction-spine/payment-plan", () => ({
  ensureDefaultPaymentPlanInTx: async () => state.paymentPlan,
  parsePaymentSchedule: (value: any[]) =>
    value.map((item, index) => ({
      installmentNumber: index + 1,
      amountSar: Number(item.amountSar),
      dueDate: new Date(item.dueDate),
    })),
}));
const runWithExec003DatabasePermissionMock = vi.hoisted(() =>
  vi.fn(async (_r: any, _roles: any, _p: any, handler: any) =>
    handler({ tenantId: "tenant-1", userId: "user-1" }),
  ),
);
vi.mock("@/lib/auth/exec-003-shared-guard", () => ({
  runWithExec003DatabasePermission: runWithExec003DatabasePermissionMock,
}));
vi.mock("@/lib/auth/exec-003-permission-assignments", () => ({ EXEC_003_DATABASE_ROLES: [] }));
vi.mock("@/lib/api-auth-guard", () => ({ CONTRACT_WRITE_ROLES: [] }));
vi.mock("@/lib/http-error-response", async () => {
  const { NextResponse } = await import("next/server");
  return {
    httpErrorResponse: (_r: any, _c: any, _m: any, error: unknown, status = 500) =>
      NextResponse.json({ error: String((error as Error)?.message || error) }, { status }),
  };
});

import {
  ContractSignatoryError,
  CONTRACT_MULTI_SIGN_AMBIGUOUS,
  CONTRACT_SIGNATORY_CONFIG_EMPTY,
  CONTRACT_SIGNATORY_CONFIG_LOCKED,
  CONTRACT_SIGNATORY_CONFIG_NOT_PENDING,
  CONTRACT_SIGNATORY_CONFIG_NO_REQUIRED,
  CONTRACT_SIGNATORY_EVIDENCE_CONFLICT,
  CONTRACT_SIGNATORY_NOT_FOUND,
  CONTRACT_SIGNATORY_ZERO_REQUIRED_ROWS,
  computeSignatureEvidenceHash,
  configureContractSignatories,
  normalizeSignatureEvidence,
  signContract,
  signContractSignatory,
} from "@/lib/domain/transaction-spine/sign-contract";
import { decideContractApproval } from "@/lib/domain/contract-finance/contract-draft-service";
import { _createContractInTx } from "@/lib/domain/transaction-spine/issue-contract";
import { POST as signatorySignRoute } from "@/app/api/v1/contracts/[id]/signatories/[signatoryId]/sign/route";
import { PUT as signatoriesConfigRoute } from "@/app/api/v1/contracts/[id]/signatories/route";

const signatoriesConfigRouteSource = readFileSync(
  resolve(ROOT, "app/api/v1/contracts/[id]/signatories/route.ts"),
  "utf8",
);

function evidenceFor(name: string) {
  return {
    method: "IN_PERSON_WET_INK",
    signerName: name,
    capturedAt: "2026-09-24T10:00:00.000Z",
  };
}

function hashFor(name: string) {
  return computeSignatureEvidenceHash(normalizeSignatureEvidence(evidenceFor(name)));
}

function pendingContract(overrides: Record<string, unknown> = {}) {
  return {
    id: "contract-1",
    tenantId: "tenant-1",
    unitId: "unit-1",
    leadId: null,
    offerId: null,
    offer: null,
    buyerName: "Buyer One",
    buyerPhone: "0500000000",
    totalVolumeSar: 1000,
    acceptedAt: new Date("2026-09-01T00:00:00.000Z"),
    reservationExpiresAt: null,
    signedAt: null,
    status: "PENDING_SIGNATURE",
    version: 1,
    spineVersion: 2,
    vatType: "STANDARD",
    vatRate: 15,
    paymentPlan: null,
    unit: { unitNumber: "A-1", type: "APARTMENT", area: 120, city: "Riyadh", district: "Olaya" },
    tenant: { companyName: "ORCA Dev", vatNumber: "300", commercialRegistry: "101", nationalAddress: "Riyadh" },
    installments: [],
    ...overrides,
  };
}

function signatoryRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "sig-1",
    tenantId: "tenant-1",
    contractId: "contract-1",
    role: "BUYER",
    required: true,
    status: "PENDING",
    signerReference: null,
    signatureEvidenceHash: null,
    signedAt: null,
    ...overrides,
  };
}

function resetState() {
  state.contract = pendingContract();
  state.paymentPlan = {
    id: "plan-1",
    tenantId: "tenant-1",
    contractId: "contract-1",
    template: "SINGLE_PAYMENT",
    status: "DRAFT",
    totalAmount: 1150,
    scheduleJson: [{ amountSar: 1150, dueDate: "2026-10-01T00:00:00.000Z" }],
    installmentCount: 1,
    activatedAt: null,
    version: 1,
  };
  state.invoices = [];
  state.installments = [];
  state.audits = [];
  state.snapshots = [
    {
      id: "issued-snapshot-1",
      tenantId: "tenant-1",
      draftId: "draft-1",
      contractId: null,
      contractVersion: null,
      snapshotType: "ISSUED",
      digest: "issued-digest",
    },
  ];
  state.drafts = [
    {
      id: "draft-1",
      tenantId: "tenant-1",
      contractId: "contract-1",
      status: "APPROVED",
      approvals: [{ status: "APPROVED" }],
    },
  ];
  state.signatories = [];
  state.approvals = [];
  state.contractUpdates = 0;
  state.signatorySeq = 0;
}

function twoRequiredSignatories() {
  state.signatories = [
    signatoryRow({ id: "sig-required-1", role: "BUYER" }),
    signatoryRow({ id: "sig-required-2", role: "SELLER" }),
  ];
}

async function signSignatory(signatoryId: string, name: string) {
  return signContractSignatory({
    tenantId: "tenant-1",
    userId: "user-1",
    contractId: "contract-1",
    signatoryId,
    signatureEvidence: evidenceFor(name),
  });
}

describe("Batch 1A — per-signatory persistence and partial signing", () => {
  beforeEach(resetState);

  it("A. first required signer signs while another remains: signer SIGNED, contract stays PENDING_SIGNATURE, no financial activation, no snapshot", async () => {
    twoRequiredSignatories();
    const result = await signSignatory("sig-required-1", "Buyer One");

    expect(result.finalized).toBe(false);
    expect(result.signatoryStatus).toBe("SIGNED");
    expect(state.signatories.find((r) => r.id === "sig-required-1")?.status).toBe("SIGNED");
    expect(state.signatories.find((r) => r.id === "sig-required-2")?.status).toBe("PENDING");
    expect(state.contract.status).toBe("PENDING_SIGNATURE");
    expect(state.contractUpdates).toBe(0);
    expect(state.invoices).toHaveLength(0);
    expect(state.installments).toHaveLength(0);
    expect(state.snapshots.filter((s) => s.snapshotType === "SIGNED_OPERATIONAL")).toHaveLength(0);
    expect(state.audits.filter((a) => a.action === "SIGN_CONTRACT")).toHaveLength(0);
  });

  it("B. last required signer signs: contract SIGNED, finalization occurs exactly once", async () => {
    twoRequiredSignatories();
    await signSignatory("sig-required-1", "Buyer One");
    const result = await signSignatory("sig-required-2", "Seller One");

    expect(result.finalized).toBe(true);
    expect(state.contract.status).toBe("SIGNED");
    expect(state.contractUpdates).toBe(1);
    expect(state.invoices).toHaveLength(1);
    expect(state.audits.filter((a) => a.action === "SIGN_CONTRACT")).toHaveLength(1);
    const snapshot = state.snapshots.find((s) => s.snapshotType === "SIGNED_OPERATIONAL");
    expect(snapshot).toBeTruthy();
  });

  it("C. optional unsigned signer does not block finalization", async () => {
    state.signatories = [
      signatoryRow({ id: "sig-required-1", role: "BUYER" }),
      signatoryRow({ id: "sig-optional-1", role: "WITNESS", required: false }),
    ];
    const result = await signSignatory("sig-required-1", "Buyer One");

    expect(result.finalized).toBe(true);
    expect(state.contract.status).toBe("SIGNED");
    expect(state.signatories.find((r) => r.id === "sig-optional-1")?.status).toBe("PENDING");
  });

  it("D. same signer + same evidence replay is idempotent", async () => {
    state.signatories = [signatoryRow({ id: "sig-required-1", role: "BUYER" })];
    const first = await signSignatory("sig-required-1", "Buyer One");
    const updatesAfterFirst = state.contractUpdates;
    const invoicesAfterFirst = state.invoices.length;
    const snapshotsAfterFirst = state.snapshots.length;
    const auditsAfterFirst = state.audits.filter((a) => a.action === "SIGN_CONTRACT").length;

    const second = await signSignatory("sig-required-1", "Buyer One");

    expect(first.finalized).toBe(true);
    expect(second.finalized).toBe(true);
    if (second.finalized) expect(second.idempotent).toBe(true);
    expect(state.contractUpdates).toBe(updatesAfterFirst);
    expect(state.invoices).toHaveLength(invoicesAfterFirst);
    expect(state.snapshots).toHaveLength(snapshotsAfterFirst);
    expect(state.audits.filter((a) => a.action === "SIGN_CONTRACT")).toHaveLength(auditsAfterFirst);
  });

  it("E. same signer + conflicting evidence fails closed", async () => {
    state.signatories = [signatoryRow({ id: "sig-required-1", role: "BUYER" })];
    await signSignatory("sig-required-1", "Buyer One");

    await expect(signSignatory("sig-required-1", "Someone Else")).rejects.toMatchObject({
      code: CONTRACT_SIGNATORY_EVIDENCE_CONFLICT,
    });
  });

  it("F. unknown signatory is rejected", async () => {
    state.signatories = [signatoryRow({ id: "sig-required-1", role: "BUYER" })];
    await expect(signSignatory("does-not-exist", "Buyer One")).rejects.toMatchObject({
      code: CONTRACT_SIGNATORY_NOT_FOUND,
    });
  });

  it("G. wrong-contract signatory is rejected", async () => {
    state.signatories = [
      signatoryRow({ id: "sig-other-contract", contractId: "contract-2", role: "BUYER" }),
    ];
    await expect(signSignatory("sig-other-contract", "Buyer One")).rejects.toThrow();
  });

  it("H. foreign-tenant signatory is rejected the same way as unknown", async () => {
    state.signatories = [
      signatoryRow({ id: "sig-foreign", tenantId: "tenant-2", role: "BUYER" }),
    ];
    await expect(signSignatory("sig-foreign", "Buyer One")).rejects.toMatchObject({
      code: CONTRACT_SIGNATORY_NOT_FOUND,
    });
  });

  it("I. concurrent/final replay does not duplicate financial activation or snapshot", async () => {
    state.signatories = [signatoryRow({ id: "sig-required-1", role: "BUYER" })];
    await signSignatory("sig-required-1", "Buyer One");
    const invoicesAfter = state.invoices.length;
    const snapshotsAfter = state.snapshots.length;

    await signSignatory("sig-required-1", "Buyer One");

    expect(state.invoices).toHaveLength(invoicesAfter);
    expect(state.snapshots).toHaveLength(snapshotsAfter);
  });

  it("J/K. snapshot and invoice/installments are created only at final completion, not on the partial step", async () => {
    twoRequiredSignatories();
    await signSignatory("sig-required-1", "Buyer One");
    expect(state.snapshots.filter((s) => s.snapshotType === "SIGNED_OPERATIONAL")).toHaveLength(0);
    expect(state.invoices).toHaveLength(0);
    expect(state.installments).toHaveLength(0);

    await signSignatory("sig-required-2", "Seller One");
    expect(state.snapshots.filter((s) => s.snapshotType === "SIGNED_OPERATIONAL")).toHaveLength(1);
    expect(state.invoices).toHaveLength(1);
    expect(state.installments.length).toBeGreaterThan(0);
  });

  it("L. approval boundary absent blocks canonical new signing", async () => {
    state.drafts = [];
    state.signatories = [signatoryRow({ id: "sig-required-1", role: "BUYER" })];
    await expect(signSignatory("sig-required-1", "Buyer One")).rejects.toMatchObject({
      code: "W1_APPROVAL_BOUNDARY_NOT_ESTABLISHED",
    });
    expect(state.contractUpdates).toBe(0);
    expect(state.snapshots.filter((s) => s.snapshotType === "SIGNED_OPERATIONAL")).toHaveLength(0);
  });

  it("L2. approval lifecycle not finalized blocks canonical new signing", async () => {
    state.drafts = [
      { id: "draft-1", tenantId: "tenant-1", contractId: "contract-1", status: "APPROVED", approvals: [{ status: "PENDING" }] },
    ];
    state.signatories = [signatoryRow({ id: "sig-required-1", role: "BUYER" })];
    await expect(signSignatory("sig-required-1", "Buyer One")).rejects.toMatchObject({
      code: "W1_APPROVAL_BOUNDARY_LIFECYCLE_INCOMPLETE",
    });
  });

  it("L3. approved draft without an issued canonical snapshot blocks canonical new signing", async () => {
    state.snapshots = [];
    state.signatories = [signatoryRow({ id: "sig-required-1", role: "BUYER" })];
    await expect(signSignatory("sig-required-1", "Buyer One")).rejects.toMatchObject({
      code: "W1_APPROVAL_BOUNDARY_SNAPSHOT_MISSING",
    });
  });

  it("N. single required signatory reproduces existing single-sign behavior", async () => {
    state.signatories = [signatoryRow({ id: "sig-required-1", role: "BUYER" })];
    const result = await signSignatory("sig-required-1", "Buyer One");
    expect(result.finalized).toBe(true);
    if (result.finalized) {
      expect(result.contract.status).toBe("SIGNED");
      expect(result.invoice.id).toBeTruthy();
      expect(result.paymentPlan.id).toBeTruthy();
    }
  });

  it("O. SIGNED legacy contract with zero signatory rows remains valid with no backfill/write", async () => {
    state.contract = pendingContract({ status: "SIGNED", signedAt: new Date("2026-09-01T00:00:00.000Z"), version: 3 });
    state.signatories = [];

    const result = await signContract({ tenantId: "tenant-1", userId: "user-1", contractId: "contract-1" });

    expect(result.idempotent).toBe(true);
    expect(state.contractUpdates).toBe(0);
    expect(state.signatories).toHaveLength(0);
  });

  it("P. final snapshot proof changes if the canonical required-signature-set evidence changes", async () => {
    twoRequiredSignatories();
    await signSignatory("sig-required-1", "Buyer One");
    await signSignatory("sig-required-2", "Seller One");
    const firstDigest = state.snapshots.find((s) => s.snapshotType === "SIGNED_OPERATIONAL")?.digest;
    const firstHash = state.snapshots.find((s) => s.snapshotType === "SIGNED_OPERATIONAL")?.signatureEvidenceHash;

    resetState();
    twoRequiredSignatories();
    await signSignatory("sig-required-1", "Buyer One");
    await signSignatory("sig-required-2", "A Different Seller");
    const secondDigest = state.snapshots.find((s) => s.snapshotType === "SIGNED_OPERATIONAL")?.digest;
    const secondHash = state.snapshots.find((s) => s.snapshotType === "SIGNED_OPERATIONAL")?.signatureEvidenceHash;

    expect(firstDigest).toBeTruthy();
    expect(secondDigest).toBeTruthy();
    expect(secondDigest).not.toBe(firstDigest);
    expect(secondHash).not.toBe(firstHash);
  });

  it("multi-sign snapshot binds the full required set, not just the last signer's hash", async () => {
    twoRequiredSignatories();
    await signSignatory("sig-required-1", "Buyer One");
    await signSignatory("sig-required-2", "Seller One");
    const snapshot = state.snapshots.find((s) => s.snapshotType === "SIGNED_OPERATIONAL");
    expect(snapshot.signatureEvidenceHash).not.toBe(hashFor("Seller One"));
    expect(snapshot.structuredFacts.contract.requiredSignatureSet).toHaveLength(2);
  });

  it("R2. PENDING_SIGNATURE + zero ContractSignatory rows: legacy /sign fails closed (no fallback to the old whole-contract engine)", async () => {
    state.signatories = [];
    await expect(
      signContract({
        tenantId: "tenant-1",
        userId: "user-1",
        contractId: "contract-1",
        signatureEvidence: evidenceFor("Buyer One"),
      }),
    ).rejects.toMatchObject({ code: "CONTRACT_LEGACY_SIGNING_BLOCKED" });
    expect(state.contractUpdates).toBe(0);
    expect(state.invoices).toHaveLength(0);
    expect(state.snapshots.filter((s) => s.snapshotType === "SIGNED_OPERATIONAL")).toHaveLength(0);
  });

  it("R2b. PENDING_SIGNATURE with only already-SIGNED / optional rows (no applicable candidate): legacy /sign fails closed", async () => {
    state.signatories = [
      signatoryRow({ id: "sig-optional-1", role: "WITNESS", required: false }),
    ];
    await expect(
      signContract({
        tenantId: "tenant-1",
        userId: "user-1",
        contractId: "contract-1",
        signatureEvidence: evidenceFor("Buyer One"),
      }),
    ).rejects.toMatchObject({ code: "CONTRACT_LEGACY_SIGNING_BLOCKED" });
    expect(state.contractUpdates).toBe(0);
  });

  it("R3. SIGNED + zero ContractSignatory rows remains valid legacy history (no backfill, no mutation, no synthetic signer)", async () => {
    state.contract = pendingContract({
      status: "SIGNED",
      signedAt: new Date("2026-09-01T00:00:00.000Z"),
      version: 3,
    });
    state.signatories = [];

    const result = await signContract({ tenantId: "tenant-1", userId: "user-1", contractId: "contract-1" });

    expect(result.idempotent).toBe(true);
    expect(state.contractUpdates).toBe(0);
    expect(state.signatories).toHaveLength(0);
    expect(state.snapshots.filter((s) => s.snapshotType === "SIGNED_OPERATIONAL")).toHaveLength(0);
  });

  it("R4. legacy /sign route (compatibility wrapper) delegates to the canonical service for a single unambiguous signatory", async () => {
    state.signatories = [signatoryRow({ id: "sig-required-1", role: "BUYER" })];
    const result: any = await signContract({
      tenantId: "tenant-1",
      userId: "user-1",
      contractId: "contract-1",
      signatureEvidence: evidenceFor("Buyer One"),
    });
    expect(result.contract.status).toBe("SIGNED");
    expect(state.signatories[0].status).toBe("SIGNED");
  });

  it("R5. legacy /sign endpoint fails closed rather than guessing among multiple candidate signatories", async () => {
    twoRequiredSignatories();
    await expect(
      signContract({
        tenantId: "tenant-1",
        userId: "user-1",
        contractId: "contract-1",
        signatureEvidence: evidenceFor("Whoever"),
      }),
    ).rejects.toMatchObject({ code: CONTRACT_MULTI_SIGN_AMBIGUOUS });
    expect(state.contractUpdates).toBe(0);
  });

  it("canonical per-signatory route returns finalized:false for a partial signature and 200 for completion", async () => {
    twoRequiredSignatories();
    const partialRequest = new NextRequest(
      "http://localhost/api/v1/contracts/contract-1/signatories/sig-required-1/sign",
      { method: "POST", body: JSON.stringify({ signatureEvidence: evidenceFor("Buyer One") }) },
    );
    const partialResponse = await signatorySignRoute(partialRequest, {
      params: Promise.resolve({ id: "contract-1", signatoryId: "sig-required-1" }),
    });
    expect(partialResponse.status).toBe(200);
    const partialBody = await partialResponse.json();
    expect(partialBody.data.finalized).toBe(false);
    expect(partialBody.data.contractStatus).toBe("PENDING_SIGNATURE");

    const finalRequest = new NextRequest(
      "http://localhost/api/v1/contracts/contract-1/signatories/sig-required-2/sign",
      { method: "POST", body: JSON.stringify({ signatureEvidence: evidenceFor("Seller One") }) },
    );
    const finalResponse = await signatorySignRoute(finalRequest, {
      params: Promise.resolve({ id: "contract-1", signatoryId: "sig-required-2" }),
    });
    expect(finalResponse.status).toBe(200);
    const finalBody = await finalResponse.json();
    expect(finalBody.data.finalized).toBe(true);
    expect(finalBody.data.contractStatus).toBe("SIGNED");
  });

  it("route rejects an unknown signatory with 404", async () => {
    state.signatories = [signatoryRow({ id: "sig-required-1", role: "BUYER" })];
    const request = new NextRequest(
      "http://localhost/api/v1/contracts/contract-1/signatories/missing/sign",
      { method: "POST", body: JSON.stringify({ signatureEvidence: evidenceFor("Buyer One") }) },
    );
    const response = await signatorySignRoute(request, {
      params: Promise.resolve({ id: "contract-1", signatoryId: "missing" }),
    });
    expect(response.status).toBe(404);
  });
});

describe("1-3. default single-sign compatibility at the shared contract-creation boundary", () => {
  beforeEach(resetState);

  it("1. creates exactly one default required BUYER signatory when an operational Contract is created", async () => {
    state.signatories = [];
    const contract = await _createContractInTx(mockPrisma.tx, {
      tenantId: "tenant-1",
      userId: "user-1",
      unitId: "unit-1",
      leadId: "lead-1",
      buyerName: "Buyer One",
      buyerPhone: "0500000000",
      totalVolumeSar: 1000,
    });

    const created = state.signatories.filter((row) => row.contractId === contract.id);
    expect(created).toHaveLength(1);
    expect(created[0].role).toBe("BUYER");
    expect(created[0].required).toBe(true);
    expect(created[0].status).toBe("PENDING");
    expect(created[0].tenantId).toBe("tenant-1");
  });

  it("2. leadId becomes the default signatory's signerReference when available", async () => {
    state.signatories = [];
    const contract = await _createContractInTx(mockPrisma.tx, {
      tenantId: "tenant-1",
      userId: "user-1",
      unitId: "unit-1",
      leadId: "lead-42",
      buyerName: "Buyer One",
      buyerPhone: "0500000000",
      totalVolumeSar: 1000,
    });
    const created = state.signatories.find((row) => row.contractId === contract.id);
    expect(created?.signerReference).toBe("lead-42");
  });

  it("3. null leadId (Contact-sourced buyer) is allowed for the default single signer", async () => {
    state.signatories = [];
    const contract = await _createContractInTx(mockPrisma.tx, {
      tenantId: "tenant-1",
      userId: "user-1",
      unitId: "unit-1",
      leadId: null,
      buyerName: "Buyer One",
      buyerPhone: "0500000000",
      totalVolumeSar: 1000,
    });
    const created = state.signatories.find((row) => row.contractId === contract.id);
    expect(created?.signerReference).toBeNull();
    expect(created?.required).toBe(true);
  });

  it("14. the default BUYER signatory remains compatible with the legacy /sign wrapper (single-sign behavior preserved)", async () => {
    state.signatories = [];
    await _createContractInTx(mockPrisma.tx, {
      tenantId: "tenant-1",
      userId: "user-1",
      unitId: "unit-1",
      leadId: "lead-1",
      buyerName: "Buyer One",
      buyerPhone: "0500000000",
      totalVolumeSar: 1000,
    });

    const result: any = await signContract({
      tenantId: "tenant-1",
      userId: "user-1",
      contractId: "contract-1",
      signatureEvidence: evidenceFor("Buyer One"),
    });
    expect(result.contract.status).toBe("SIGNED");
    expect(state.signatories.find((row) => row.role === "BUYER")?.status).toBe("SIGNED");
  });
});

describe("4-9. PUT /contracts/{id}/signatories — configuration domain logic", () => {
  beforeEach(resetState);

  it("4. rejects an empty signatories array", async () => {
    await expect(
      configureContractSignatories({ tenantId: "tenant-1", userId: "user-1", contractId: "contract-1", signatories: [] }),
    ).rejects.toMatchObject({ code: CONTRACT_SIGNATORY_CONFIG_EMPTY });
    expect(state.signatories).toHaveLength(0);
  });

  it("5. rejects an all-optional set (no required=true row)", async () => {
    await expect(
      configureContractSignatories({
        tenantId: "tenant-1",
        userId: "user-1",
        contractId: "contract-1",
        signatories: [{ role: "WITNESS", required: false }],
      }),
    ).rejects.toMatchObject({ code: CONTRACT_SIGNATORY_CONFIG_NO_REQUIRED });
    expect(state.signatories).toHaveLength(0);
  });

  it("6. accepts a multi-sign set containing at least one required entry", async () => {
    const result = await configureContractSignatories({
      tenantId: "tenant-1",
      userId: "user-1",
      contractId: "contract-1",
      signatories: [
        { role: "BUYER", required: true },
        { role: "SELLER", required: true },
        { role: "WITNESS", required: false, signerReference: "witness-1" },
      ],
    });
    expect(result.signatories).toHaveLength(3);
    expect(result.signatories.every((row: any) => typeof row.id === "string" && row.id.length > 0)).toBe(true);
    expect(state.signatories).toHaveLength(3);
  });

  it("7. configuration atomically replaces the previous unsigned set", async () => {
    await configureContractSignatories({
      tenantId: "tenant-1",
      userId: "user-1",
      contractId: "contract-1",
      signatories: [{ role: "BUYER", required: true }],
    });
    const firstIds = state.signatories.map((row) => row.id);

    await configureContractSignatories({
      tenantId: "tenant-1",
      userId: "user-1",
      contractId: "contract-1",
      signatories: [
        { role: "BUYER", required: true },
        { role: "SELLER", required: true },
      ],
    });

    expect(state.signatories).toHaveLength(2);
    expect(state.signatories.some((row) => firstIds.includes(row.id))).toBe(false);
  });

  it("8. configuration is rejected once any signatory has already signed", async () => {
    state.signatories = [signatoryRow({ id: "sig-required-1", status: "SIGNED" })];
    await expect(
      configureContractSignatories({
        tenantId: "tenant-1",
        userId: "user-1",
        contractId: "contract-1",
        signatories: [{ role: "BUYER", required: true }],
      }),
    ).rejects.toMatchObject({ code: CONTRACT_SIGNATORY_CONFIG_LOCKED });
    expect(state.signatories).toHaveLength(1);
  });

  it("8b. configuration is rejected once the contract is no longer PENDING_SIGNATURE", async () => {
    state.contract = pendingContract({ status: "SIGNED", signedAt: new Date() });
    await expect(
      configureContractSignatories({
        tenantId: "tenant-1",
        userId: "user-1",
        contractId: "contract-1",
        signatories: [{ role: "BUYER", required: true }],
      }),
    ).rejects.toMatchObject({ code: CONTRACT_SIGNATORY_CONFIG_NOT_PENDING });
  });

  it("9. foreign-tenant configuration request is rejected (contract not found for that tenant)", async () => {
    await expect(
      configureContractSignatories({
        tenantId: "tenant-2",
        userId: "user-1",
        contractId: "contract-1",
        signatories: [{ role: "BUYER", required: true }],
      }),
    ).rejects.toThrow();
    expect(state.signatories).toHaveLength(0);
  });
});

describe("10-11. approval-before-write placement and the defensive zero-required guard", () => {
  beforeEach(resetState);

  it("10. approval boundary invalid + first-of-two-required signer attempts to sign -> no ContractSignatory write occurs", async () => {
    state.drafts = [];
    twoRequiredSignatories();
    await expect(signSignatory("sig-required-1", "Buyer One")).rejects.toMatchObject({
      code: "W1_APPROVAL_BOUNDARY_NOT_ESTABLISHED",
    });
    expect(state.signatories.find((row) => row.id === "sig-required-1")?.status).toBe("PENDING");
    expect(state.signatories.find((row) => row.id === "sig-required-1")?.signatureEvidenceHash).toBeNull();
  });

  it("11. zero required rows at signing time fails closed (never vacuous finalization)", async () => {
    state.signatories = [signatoryRow({ id: "sig-optional-1", role: "WITNESS", required: false })];
    await expect(signSignatory("sig-optional-1", "Witness One")).rejects.toMatchObject({
      code: CONTRACT_SIGNATORY_ZERO_REQUIRED_ROWS,
    });
    expect(state.contractUpdates).toBe(0);
  });

  it("13. unique approved draft + issued ISSUED snapshot passes the approval boundary and allows finalization", async () => {
    // resetState() already seeds one APPROVED draft + one ISSUED snapshot for it.
    state.signatories = [signatoryRow({ id: "sig-required-1", role: "BUYER" })];
    const result = await signSignatory("sig-required-1", "Buyer One");
    expect(result.finalized).toBe(true);
  });
});

describe("EXEC-003 permission registry — contracts.signatories.configure", () => {
  it("1. is registered in the EXEC-003 permission-key registry with the exact CONTRACT_WRITE_ROLES role set", async () => {
    const actual = await vi.importActual<
      typeof import("@/lib/auth/exec-003-permission-assignments")
    >("@/lib/auth/exec-003-permission-assignments");

    expect(actual.EXEC_003_PERMISSION_KEYS).toContain("contracts.signatories.configure");
    const assignment = actual.exec003AssignmentForPermission("contracts.signatories.configure");
    expect(assignment).toBeTruthy();
    expect(assignment?.legacyAllowedRoles).toEqual(["ADMIN", "SALES_MANAGER"]);
    expect(assignment?.progressiveAllowedRoles).toEqual(["ADMIN", "SALES_MANAGER"]);
  });

  it("2. ADMIN is among the authorized roles", async () => {
    const actual = await vi.importActual<
      typeof import("@/lib/auth/exec-003-permission-assignments")
    >("@/lib/auth/exec-003-permission-assignments");
    const assignment = actual.exec003AssignmentForPermission("contracts.signatories.configure");
    expect(assignment?.legacyAllowedRoles).toContain("ADMIN");
  });

  it("3. SALES_MANAGER is among the authorized roles", async () => {
    const actual = await vi.importActual<
      typeof import("@/lib/auth/exec-003-permission-assignments")
    >("@/lib/auth/exec-003-permission-assignments");
    const assignment = actual.exec003AssignmentForPermission("contracts.signatories.configure");
    expect(assignment?.legacyAllowedRoles).toContain("SALES_MANAGER");
  });

  it("4. roles outside CONTRACT_WRITE_ROLES are not silently granted (exactly two roles, no wildcard, no broader set)", async () => {
    const actual = await vi.importActual<
      typeof import("@/lib/auth/exec-003-permission-assignments")
    >("@/lib/auth/exec-003-permission-assignments");
    const assignment = actual.exec003AssignmentForPermission("contracts.signatories.configure");
    expect(assignment?.legacyAllowedRoles).toHaveLength(2);
    for (const role of ["SALES_EMPLOYEE", "MARKETING", "READ_ONLY"]) {
      expect(assignment?.legacyAllowedRoles).not.toContain(role);
    }
  });
});

describe("PUT /contracts/{id}/signatories — route wiring", () => {
  beforeEach(() => {
    resetState();
    runWithExec003DatabasePermissionMock.mockClear();
  });

  function putRequest(body: unknown) {
    return new NextRequest("http://localhost/api/v1/contracts/contract-1/signatories", {
      method: "PUT",
      body: JSON.stringify(body),
    });
  }

  it("5. invokes the EXEC-003 permission guard with the exact key contracts.signatories.configure", async () => {
    await signatoriesConfigRoute(putRequest({ signatories: [{ role: "BUYER", required: true }] }), {
      params: Promise.resolve({ id: "contract-1" }),
    });
    expect(runWithExec003DatabasePermissionMock).toHaveBeenCalledTimes(1);
    expect(runWithExec003DatabasePermissionMock.mock.calls[0][2]).toBe(
      "contracts.signatories.configure",
    );
  });

  it("6. delegates to configureContractSignatories (same observable effect as calling the domain function directly)", async () => {
    const response = await signatoriesConfigRoute(
      putRequest({
        signatories: [
          { role: "BUYER", required: true },
          { role: "SELLER", required: true },
        ],
      }),
      { params: Promise.resolve({ id: "contract-1" }) },
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.signatories).toHaveLength(2);
    expect(state.signatories).toHaveLength(2);
    expect(state.signatories.every((row) => row.tenantId === "tenant-1" && row.contractId === "contract-1")).toBe(
      true,
    );
  });

  it("7. the route source contains no second copy of signatory configuration logic (no direct Prisma/tx mutation)", () => {
    expect(signatoriesConfigRouteSource).not.toMatch(/tx\.contractSignatory\.(create|deleteMany|update)/);
    expect(signatoriesConfigRouteSource).not.toMatch(/prisma\.\$transaction/);
    expect(signatoriesConfigRouteSource).toContain("configureContractSignatories(");
  });

  it("8. malformed body (signatories not an array) fails closed with no write", async () => {
    const response = await signatoriesConfigRoute(putRequest({ signatories: "not-an-array" }), {
      params: Promise.resolve({ id: "contract-1" }),
    });
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(state.signatories).toHaveLength(0);
  });

  it("8b. malformed body (missing signatories key) fails closed with no write", async () => {
    const response = await signatoriesConfigRoute(putRequest({}), {
      params: Promise.resolve({ id: "contract-1" }),
    });
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(state.signatories).toHaveLength(0);
  });
});

describe("Q. self-approval guard on the existing ContractApproval decision flow", () => {
  beforeEach(resetState);

  it("rejects a decision where requestedBy === decidedBy", async () => {
    state.drafts = [
      { id: "draft-1", tenantId: "tenant-1", contractId: "contract-1", status: "APPROVAL_PENDING", approvals: [] },
    ];
    state.approvals = [
      {
        id: "approval-1",
        tenantId: "tenant-1",
        status: "PENDING",
        draftId: "draft-1",
        reason: null,
        evidenceJson: null,
        requestedBy: "user-1",
        requestedAt: new Date(),
        draft: { status: "APPROVAL_PENDING" },
      },
    ];

    await expect(
      decideContractApproval({
        tenantId: "tenant-1",
        approvalId: "approval-1",
        decision: "APPROVED",
        decidedBy: "user-1",
      }),
    ).rejects.toMatchObject({ code: "W1_APPROVAL_SELF_APPROVAL_REJECTED" });
    expect(state.approvals[0].status).toBe("PENDING");
  });

  it("allows a decision where requestedBy !== decidedBy", async () => {
    state.drafts = [
      { id: "draft-1", tenantId: "tenant-1", contractId: "contract-1", status: "APPROVAL_PENDING", approvals: [] },
    ];
    state.approvals = [
      {
        id: "approval-1",
        tenantId: "tenant-1",
        status: "PENDING",
        draftId: "draft-1",
        reason: null,
        evidenceJson: null,
        requestedBy: "user-1",
        requestedAt: new Date(),
        draft: { status: "APPROVAL_PENDING" },
      },
    ];

    const decided = await decideContractApproval({
      tenantId: "tenant-1",
      approvalId: "approval-1",
      decision: "APPROVED",
      decidedBy: "user-2",
    });
    expect(decided.status).toBe("APPROVED");
  });
});
