import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  contract: null as any,
  paymentPlan: null as any,
  invoices: [] as any[],
  installments: [] as any[],
  audits: [] as any[],
  snapshots: [] as any[],
  signCalls: [] as any[],
}));

const mockPrisma = vi.hoisted(() => {
  const tx: any = {
    contract: {
      findFirst: vi.fn(async () => state.contract),
      update: vi.fn(async ({ data }: any) => {
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
    tenant: { update: vi.fn(async () => ({ nextInvoiceNumber: 2, invoicePrefix: "INV" })) },
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
    },
    contractSnapshot: {
      findFirst: vi.fn(async ({ where }: any) =>
        state.snapshots.find(
          (row) =>
            row.tenantId === where.tenantId &&
            row.contractId === where.contractId &&
            row.snapshotType === where.snapshotType &&
            row.contractVersion === where.contractVersion,
        ) || null,
      ),
      create: vi.fn(async ({ data }: any) => {
        const row = { id: `snapshot-${state.snapshots.length + 1}`, ...data };
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
}));
vi.mock("@/lib/auth/exec-003-permission-assignments", () => ({ EXEC_003_DATABASE_ROLES: [] }));
vi.mock("@/lib/domain/transaction-spine", async () => {
  const signModule = await import("@/lib/domain/transaction-spine/sign-contract");
  return {
    signContract: async (input: any) => {
      state.signCalls.push(input);
      return signModule.signContract(input);
    },
  };
});

import { signContract } from "@/lib/domain/transaction-spine/sign-contract";
import {
  CONTRACT_SIGNATURE_REQUIRED,
  createInvoice,
} from "@/lib/domain/transaction-spine/create-invoice";
import { REQUIRED_TENANT_MODELS } from "@/lib/tenant-model-policy";
import { POST as issueInvoiceRoute } from "@/app/api/v1/contracts/[id]/invoices/route";

const root = resolve(__dirname, "../..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

const evidence = {
  method: "IN_PERSON_WET_INK",
  signerName: "Buyer One",
  capturedAt: "2026-09-20T10:00:00.000Z",
};

function resetState() {
  state.contract = {
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
    unit: null,
    tenant: null,
  };
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
  state.signCalls = [];
}

const saleInvoiceInput = {
  tenantId: "tenant-1",
  userId: "user-1",
  type: "SALE" as const,
  contractId: "contract-1",
  subtotal: 1000,
  dueDate: new Date("2026-10-01T00:00:00.000Z"),
};

function issueRequest() {
  return new NextRequest("http://localhost/api/v1/contracts/contract-1/invoices", { method: "POST" });
}

async function signExplicitly() {
  await signContract({
    tenantId: "tenant-1",
    userId: "user-1",
    contractId: "contract-1",
    signatureEvidence: evidence,
  });
}

const signAudits = () => state.audits.filter((row) => row.action === "SIGN_CONTRACT");

describe("Runtime follow-up — invoicing never performs a first signing", () => {
  beforeEach(resetState);

  it("1. createInvoice rejects an unsigned contract before signContract runs", async () => {
    await expect(createInvoice(saleInvoiceInput)).rejects.toThrow(CONTRACT_SIGNATURE_REQUIRED);
    expect(mockPrisma.prisma.$transaction).not.toHaveBeenCalled();
    expect(state.contract.status).toBe("PENDING_SIGNATURE");
    expect(state.invoices).toHaveLength(0);
    expect(signAudits()).toHaveLength(0);
    expect(state.snapshots).toHaveLength(0);
  });

  it("2. invoice API rejects an unsigned contract with CONTRACT_SIGNATURE_REQUIRED", async () => {
    const response = await issueInvoiceRoute(issueRequest(), { params: Promise.resolve({ id: "contract-1" }) });
    expect(response.status).toBe(409);
    expect((await response.json()).code).toBe(CONTRACT_SIGNATURE_REQUIRED);
    expect(state.signCalls).toHaveLength(0);
    expect(mockPrisma.prisma.$transaction).not.toHaveBeenCalled();
    expect(state.contract.status).toBe("PENDING_SIGNATURE");
  });

  it("3. neither path supplies signature evidence", async () => {
    await signExplicitly();
    await issueInvoiceRoute(issueRequest(), { params: Promise.resolve({ id: "contract-1" }) });
    expect(state.signCalls).toHaveLength(1);
    expect(state.signCalls[0].signatureEvidence).toBeUndefined();
    for (const path of [
      "lib/domain/transaction-spine/create-invoice.ts",
      "app/api/v1/contracts/[id]/invoices/route.ts",
    ]) {
      expect(read(path)).not.toMatch(/signatureEvidence/);
    }
  });

  it("4/5/6. signed contract continues the invoice flow without duplicate signing, audit or snapshot", async () => {
    await signExplicitly();
    expect(signAudits()).toHaveLength(1);
    expect(state.snapshots).toHaveLength(1);
    const versionAfterSign = state.contract.version;

    const invoice = await createInvoice(saleInvoiceInput);
    expect(invoice.id).toBe(state.invoices[0].id);

    const response = await issueInvoiceRoute(issueRequest(), { params: Promise.resolve({ id: "contract-1" }) });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.invoiceId).toBe(state.invoices[0].id);
    expect(body.data.idempotent).toBe(true);

    expect(state.invoices).toHaveLength(1);
    expect(state.contract.version).toBe(versionAfterSign);
    expect(signAudits()).toHaveLength(1);
    expect(state.snapshots).toHaveLength(1);
    expect(state.snapshots[0].snapshotType).toBe("SIGNED_OPERATIONAL");
  });
});

describe("Runtime follow-up — ContractDelivery tenant policy", () => {
  it("7. ContractDelivery is a required tenant model", () => {
    expect(REQUIRED_TENANT_MODELS).toContain("ContractDelivery");
    expect(REQUIRED_TENANT_MODELS).toHaveLength(109);
  });

  it("8/9/10. no runtime ContractDelivery write and no outbox/audit delivery ledger in touched paths", () => {
    const touched = [
      "lib/domain/transaction-spine/create-invoice.ts",
      "app/api/v1/contracts/[id]/invoices/route.ts",
      "lib/tenant-model-policy.ts",
    ].map(read).join("\n");
    expect(touched).not.toMatch(/contractDelivery\s*\.\s*(create|update|upsert|delete)/);
    expect(touched).not.toMatch(/governmentOutbox|GovernmentOutbox\s*\./);
    expect(touched).not.toMatch(/auditLog[\s\S]{0,80}DELIVER/i);
  });
});
