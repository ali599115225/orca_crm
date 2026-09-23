import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  contract: null as any,
  paymentPlan: null as any,
  invoices: [] as any[],
  installments: [] as any[],
  audits: [] as any[],
  snapshots: [] as any[],
  contractUpdates: 0,
  writes: [] as string[],
}));

const mockPrisma = vi.hoisted(() => {
  const tx: any = {
    contract: {
      findFirst: vi.fn(async () => state.contract),
      update: vi.fn(async ({ data }: any) => {
        state.contractUpdates += 1;
        state.writes.push("contract.update");
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
      findFirst: vi.fn(async ({ where }: any) =>
        state.snapshots.find(
          (row) =>
            row.tenantId === where.tenantId &&
            row.contractId === where.contractId &&
            row.snapshotType === where.snapshotType &&
            (where.contractVersion === undefined || row.contractVersion === where.contractVersion),
        ) || null,
      ),
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
vi.mock("@/lib/auth/exec-003-shared-guard", () => ({
  runWithExec003CookiePermission: async (_r: any, _roles: any, _p: any, handler: any) =>
    handler({ tenantId: "tenant-1", userId: "user-1" }),
  runWithExec003DatabasePermission: async (_r: any, _roles: any, _p: any, handler: any) =>
    handler({ tenantId: "tenant-1", userId: "user-1" }),
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
vi.mock("@/lib/domain/transaction-spine", async () => {
  const signModule = await import("@/lib/domain/transaction-spine/sign-contract");
  const constants = await import("@/lib/domain/transaction-spine/constants");
  return { signContract: signModule.signContract, CONTRACT_STATUS: constants.CONTRACT_STATUS };
});

import {
  SIGNATURE_EVIDENCE_REQUIRED,
  computeSignatureEvidenceHash,
  normalizeSignatureEvidence,
  signContract,
} from "@/lib/domain/transaction-spine/sign-contract";
import { POST as signRoute } from "@/app/api/v1/contracts/[id]/sign/route";
import { GET as pdfRoute } from "@/app/api/v1/contracts/[id]/pdf/route";

const evidence = {
  method: "in_person_wet_ink",
  signerName: "Buyer One",
  capturedAt: "2026-09-20T10:00:00.000Z",
  signerReference: "witness-sheet-7",
  attributes: { witness: "Agent A", location: { city: "Riyadh", branch: "HQ" } },
};

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
  state.snapshots = [];
  state.contractUpdates = 0;
  state.writes = [];
}

function sha256(text: string) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

describe("Contract Batch 2 — signature evidence", () => {
  beforeEach(resetState);

  it("1. rejects first signing without evidence (fail closed, no writes)", async () => {
    await expect(
      signContract({ tenantId: "tenant-1", userId: "user-1", contractId: "contract-1" }),
    ).rejects.toThrow(SIGNATURE_EVIDENCE_REQUIRED);
    expect(state.contractUpdates).toBe(0);
    expect(state.invoices).toHaveLength(0);
    expect(state.audits).toHaveLength(0);
  });

  it("1b. sign route rejects first signing without evidence before calling signContract", async () => {
    const request = new NextRequest("http://localhost/api/v1/contracts/contract-1/sign", {
      method: "POST",
      body: JSON.stringify({ confirm: true }),
    });
    const response = await signRoute(request, { params: Promise.resolve({ id: "contract-1" }) });
    expect(response.status).toBe(400);
    expect((await response.json()).code).toBe(SIGNATURE_EVIDENCE_REQUIRED);
    expect(mockPrisma.prisma.$transaction).not.toHaveBeenCalled();
  });

  it("2. accepts first signing with valid evidence", async () => {
    const result = await signContract({
      tenantId: "tenant-1",
      userId: "user-1",
      contractId: "contract-1",
      signatureEvidence: evidence,
    });
    expect(result.idempotent).toBe(false);
    expect(result.contract.status).toBe("SIGNED");
    expect(result.signatureEvidenceHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("3. canonical evidence produces a deterministic SHA-256 independent of key order", () => {
    const reordered = {
      attributes: { location: { branch: "HQ", city: "Riyadh" }, witness: "Agent A" },
      signerReference: "witness-sheet-7",
      capturedAt: new Date("2026-09-20T10:00:00.000Z"),
      signerName: "Buyer One",
      method: "IN_PERSON_WET_INK",
      ignored: undefined,
    } as any;
    const first = computeSignatureEvidenceHash(normalizeSignatureEvidence(evidence));
    const second = computeSignatureEvidenceHash(normalizeSignatureEvidence(reordered));
    expect(first).toBe(second);
    const expectedCanonical =
      '{"attributes":{"location":{"branch":"HQ","city":"Riyadh"},"witness":"Agent A"},' +
      '"capturedAt":"2026-09-20T10:00:00.000Z","method":"IN_PERSON_WET_INK",' +
      '"signerName":"Buyer One","signerReference":"witness-sheet-7"}';
    expect(first).toBe(sha256(expectedCanonical));
  });

  it("4. different meaningful evidence produces a different hash", () => {
    const base = computeSignatureEvidenceHash(normalizeSignatureEvidence(evidence));
    const changed = computeSignatureEvidenceHash(
      normalizeSignatureEvidence({ ...evidence, signerName: "Buyer Two" }),
    );
    expect(changed).not.toBe(base);
  });

  it("4b. evidence carrying secrets is rejected", () => {
    expect(() =>
      normalizeSignatureEvidence({ ...evidence, attributes: { otpToken: "123456" } }),
    ).toThrow("SIGNATURE_EVIDENCE_INVALID");
  });

  it("5. SIGN_CONTRACT audit stores the signatureEvidenceHash and no raw evidence", async () => {
    await signContract({
      tenantId: "tenant-1",
      userId: "user-1",
      contractId: "contract-1",
      signatureEvidence: evidence,
    });
    const signAudits = state.audits.filter((row) => row.action === "SIGN_CONTRACT");
    expect(signAudits).toHaveLength(1);
    const details = JSON.parse(signAudits[0].details);
    expect(details.contractId).toBe("contract-1");
    expect(details.signedAt).toBeTruthy();
    expect(details.signatureEvidenceHash).toBe(
      computeSignatureEvidenceHash(normalizeSignatureEvidence(evidence)),
    );
    expect(signAudits[0].details).not.toContain("witness-sheet-7");
    expect(signAudits[0].details).not.toContain("Agent A");
  });

  it("6/7. already-signed retry is idempotent and writes no new SIGN_CONTRACT audit", async () => {
    await signContract({
      tenantId: "tenant-1",
      userId: "user-1",
      contractId: "contract-1",
      signatureEvidence: evidence,
    });
    const updatesAfterFirst = state.contractUpdates;
    const invoicesAfterFirst = state.invoices.length;
    const installmentsAfterFirst = state.installments.length;

    const retry = await signContract({
      tenantId: "tenant-1",
      userId: "user-1",
      contractId: "contract-1",
    });
    expect(retry.idempotent).toBe(true);
    expect(state.contractUpdates).toBe(updatesAfterFirst);
    expect(state.invoices).toHaveLength(invoicesAfterFirst);
    expect(state.installments).toHaveLength(installmentsAfterFirst);
    expect(state.audits.filter((row) => row.action === "SIGN_CONTRACT")).toHaveLength(1);
    expect(state.audits.filter((row) => row.action === "ACTIVATE_SALE_FINANCIALS")).toHaveLength(1);
  });
});

describe("Batch 05B — signing writes one SIGNED_OPERATIONAL snapshot", () => {
  beforeEach(resetState);

  it("first signing creates exactly one snapshot inside the sign transaction; retry creates none", async () => {
    await signContract({
      tenantId: "tenant-1",
      userId: "user-1",
      contractId: "contract-1",
      signatureEvidence: evidence,
    });
    expect(state.snapshots).toHaveLength(1);
    const snapshot = state.snapshots[0];
    expect(snapshot.snapshotType).toBe("SIGNED_OPERATIONAL");
    expect(snapshot.contractVersion).toBe(2);
    expect(snapshot.draftId).toBeNull();
    expect(snapshot.templateVersionId).toBeNull();
    expect(snapshot.signatureEvidenceHash).toBe(
      computeSignatureEvidenceHash(normalizeSignatureEvidence(evidence)),
    );
    expect(snapshot.paymentPlanSnapshot.status).toBe("ACTIVE");

    await signContract({ tenantId: "tenant-1", userId: "user-1", contractId: "contract-1" });
    expect(state.snapshots).toHaveLength(1);
  });

  it("no snapshot is written when first signing is rejected for missing evidence", async () => {
    await expect(
      signContract({ tenantId: "tenant-1", userId: "user-1", contractId: "contract-1" }),
    ).rejects.toThrow(SIGNATURE_EVIDENCE_REQUIRED);
    expect(state.snapshots).toHaveLength(0);
  });
});

describe("Contract Batch 3 — PDF identity", () => {
  beforeEach(resetState);

  function pdfRequest() {
    return new NextRequest("http://localhost/api/v1/contracts/contract-1/pdf");
  }

  it("8. unsigned contract PDF fails closed", async () => {
    const response = await pdfRoute(pdfRequest(), { params: Promise.resolve({ id: "contract-1" }) });
    expect(response.status).toBe(409);
    expect(state.writes).toHaveLength(0);
  });

  it("9. signed PDF identity includes contractId, contractVersion, signedAt and signatureEvidenceHash", async () => {
    await signContract({
      tenantId: "tenant-1",
      userId: "user-1",
      contractId: "contract-1",
      signatureEvidence: evidence,
    });
    const signAudit = state.audits.find((row) => row.action === "SIGN_CONTRACT");
    mockPrisma.prisma.auditLog.findFirst.mockResolvedValue({ details: signAudit.details } as any);
    const writesBefore = state.writes.length;
    const hash = computeSignatureEvidenceHash(normalizeSignatureEvidence(evidence));

    const response = await pdfRoute(pdfRequest(), { params: Promise.resolve({ id: "contract-1" }) });
    expect(response.status).toBe(200);
    expect(response.headers.get("X-Contract-Id")).toBe("contract-1");
    expect(response.headers.get("X-Contract-Version")).toBe("2");
    expect(response.headers.get("X-Contract-Signed-At")).toBe(state.contract.signedAt.toISOString());
    expect(response.headers.get("X-Signature-Evidence-Hash")).toBe(hash);
    const html = await response.text();
    expect(html).toContain(hash);
    expect(state.writes.length).toBe(writesBefore);
  });
});
