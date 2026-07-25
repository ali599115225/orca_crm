import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

const authMocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
}));
const bootstrapMocks = vi.hoisted(() => ({
  findUserEmail: vi.fn(),
  findUserRole: vi.fn(),
  findTenantActive: vi.fn(),
}));
const databaseState = vi.hoisted(() => ({
  userPresent: true,
  userTenantId: "tenant-1",
  role: "ADMIN",
  tenantActive: true,
}));
const sessionMocks = vi.hoisted(() => ({ getSession: vi.fn() }));
const tenantContextMocks = vi.hoisted(() => ({
  runWithTenantContext: vi.fn(
    async (_context: unknown, operation: () => unknown) => await operation(),
  ),
  setTenantContext: vi.fn(),
}));
const prismaMocks = vi.hoisted(() => ({
  paymentPlanFindFirst: vi.fn(),
  invoiceFindFirst: vi.fn(),
  rentalLeaseFindFirst: vi.fn(),
  tenantFindFirst: vi.fn(),
  paymentTransactionFindFirst: vi.fn(),
  paymentTransactionCreate: vi.fn(),
  paymentTransactionUpdate: vi.fn(),
  transaction: vi.fn(),
  txTenantUpdate: vi.fn(),
  txAuditCreate: vi.fn(),
}));
const domainMocks = vi.hoisted(() => ({
  signContract: vi.fn(),
  configurePaymentPlan: vi.fn(),
  ensureDefaultPaymentPlan: vi.fn(),
  restructurePaymentPlan: vi.fn(),
}));
const serviceMocks = vi.hoisted(() => ({
  writeAuditLog: vi.fn(),
  rateLimit: vi.fn(),
  encryptSecret: vi.fn(),
  calculateVat: vi.fn(),
  buildQrPayload: vi.fn(),
  encodeQrCode: vi.fn(),
  generateQrImage: vi.fn(),
  formatInvoiceLabel: vi.fn(),
  redactPiiFromPayload: vi.fn((value: unknown) => value),
}));

vi.mock("@/lib/system-prisma-boundary", () => ({
  authBootstrapFindUserEmail: bootstrapMocks.findUserEmail,
  authBootstrapFindUserRole: bootstrapMocks.findUserRole,
  authBootstrapFindTenantActive: bootstrapMocks.findTenantActive,
}));
vi.mock("@/lib/api-auth-guard", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api-auth-guard")>();
  return { ...actual, requireAuth: authMocks.requireAuth };
});
vi.mock("@/lib/session", () => ({ getSession: sessionMocks.getSession }));
vi.mock("@/lib/tenant-context", () => ({
  runWithTenantContext: tenantContextMocks.runWithTenantContext,
  setTenantContext: tenantContextMocks.setTenantContext,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    paymentPlan: { findFirst: prismaMocks.paymentPlanFindFirst },
    invoice: { findFirst: prismaMocks.invoiceFindFirst },
    rentalLease: { findFirst: prismaMocks.rentalLeaseFindFirst },
    tenant: { findFirst: prismaMocks.tenantFindFirst },
    paymentTransaction: {
      findFirst: prismaMocks.paymentTransactionFindFirst,
      create: prismaMocks.paymentTransactionCreate,
      update: prismaMocks.paymentTransactionUpdate,
    },
    $transaction: prismaMocks.transaction,
  },
}));
vi.mock("@/lib/domain/transaction-spine", () => ({
  RESTRUCTURE_MODE: {
    REDUCE_INSTALLMENT: "REDUCE_INSTALLMENT",
    REDUCE_TERM: "REDUCE_TERM",
  },
  signContract: domainMocks.signContract,
  configurePaymentPlan: domainMocks.configurePaymentPlan,
  ensureDefaultPaymentPlan: domainMocks.ensureDefaultPaymentPlan,
  restructurePaymentPlan: domainMocks.restructurePaymentPlan,
}));
vi.mock("@/lib/audit", () => ({ writeAuditLog: serviceMocks.writeAuditLog }));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: serviceMocks.rateLimit }));
vi.mock("@/lib/secret-encryption", () => ({ encryptSecret: serviceMocks.encryptSecret }));
vi.mock("@/lib/vat/engine", () => ({ calculateVat: serviceMocks.calculateVat }));
vi.mock("@/lib/zatca/qr", () => ({
  buildQrPayload: serviceMocks.buildQrPayload,
  encodeQrCode: serviceMocks.encodeQrCode,
  generateQrImage: serviceMocks.generateQrImage,
  formatInvoiceLabel: serviceMocks.formatInvoiceLabel,
}));
vi.mock("@/lib/privacy-mask", () => ({
  redactPiiFromPayload: serviceMocks.redactPiiFromPayload,
}));

import { POST as requestFinance } from "@/app/api/properties/[id]/request-finance/route";
import { POST as issueContractInvoice } from "@/app/api/v1/contracts/[id]/invoices/route";
import {
  GET as readPaymentPlan,
  PUT as updatePaymentPlan,
  POST as createPaymentPlan,
} from "@/app/api/v1/contracts/[id]/payment-plan/route";
import { POST as restructurePaymentPlanRoute } from "@/app/api/v1/contracts/[id]/restructure/route";
import { POST as signContractRoute } from "@/app/api/v1/contracts/[id]/sign/route";
import { POST as createPaylink } from "@/app/api/v1/invoices/[id]/paylink/create/route";
import { POST as createLeaseInvoice } from "@/app/api/v1/leases/[id]/invoices/route";
import {
  GET as readLeadsWebhookSettings,
  POST as rotateLeadsWebhookSecret,
} from "@/app/api/v1/settings/leads-webhook/route";

const SESSION = Object.freeze({
  userId: "user-1",
  tenantId: "tenant-1",
  role: "ADMIN",
});

function req(url: string, method = "GET", body?: unknown): NextRequest {
  return new NextRequest(url, {
    method,
    headers: {
      authorization: "Bearer test-token",
      "content-type": "application/json",
      "x-request-id": "exec-003-p0-behavior",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  databaseState.userPresent = true;
  databaseState.userTenantId = SESSION.tenantId;
  databaseState.role = "ADMIN";
  databaseState.tenantActive = true;

  authMocks.requireAuth.mockResolvedValue(SESSION);
  sessionMocks.getSession.mockResolvedValue(SESSION);
  bootstrapMocks.findUserEmail.mockResolvedValue(null);
  bootstrapMocks.findUserRole.mockImplementation(
    async (userId: string, tenantId: string) => {
      if (!databaseState.userPresent) return null;
      if (userId !== SESSION.userId) return null;
      if (tenantId !== databaseState.userTenantId) return null;
      return { role: databaseState.role };
    },
  );
  bootstrapMocks.findTenantActive.mockImplementation(async (tenantId: string) =>
    databaseState.tenantActive && tenantId === SESSION.tenantId
      ? { id: tenantId }
      : null,
  );

  serviceMocks.writeAuditLog.mockResolvedValue(undefined);
  serviceMocks.rateLimit.mockResolvedValue({ allowed: true });
  serviceMocks.encryptSecret.mockReturnValue("encrypted-secret");
  prismaMocks.paymentPlanFindFirst.mockResolvedValue(null);
  prismaMocks.invoiceFindFirst.mockResolvedValue(null);
  prismaMocks.rentalLeaseFindFirst.mockResolvedValue(null);
  prismaMocks.tenantFindFirst.mockResolvedValue({
    leadsWebhookKeyId: "key-1",
    leadsWebhookSecretUpdatedAt: new Date("2026-07-25T00:00:00Z"),
  });
  prismaMocks.transaction.mockImplementation(
    async (operation: (tx: unknown) => unknown) =>
      await operation({
        tenant: { update: prismaMocks.txTenantUpdate },
        auditLog: { create: prismaMocks.txAuditCreate },
      }),
  );
  prismaMocks.txTenantUpdate.mockResolvedValue({});
  prismaMocks.txAuditCreate.mockResolvedValue({});
  domainMocks.signContract.mockResolvedValue({
    contract: { id: "contract-1", status: "SIGNED", signedAt: new Date() },
    invoice: { id: "invoice-1" },
    paymentPlan: { id: "plan-1" },
    installments: [],
    idempotent: false,
  });
  domainMocks.configurePaymentPlan.mockResolvedValue({
    paymentPlan: {
      id: "plan-1",
      template: "MONTHLY",
      status: "ACTIVE",
      totalAmount: 1000,
      installmentCount: 1,
    },
    schedule: [
      {
        installmentNumber: 1,
        amountSar: 1000,
        dueDate: new Date("2026-08-01"),
      },
    ],
  });
  domainMocks.ensureDefaultPaymentPlan.mockResolvedValue({ id: "plan-1" });
  domainMocks.restructurePaymentPlan.mockResolvedValue({
    idempotent: false,
    payment: { id: "payment-1", status: "COMPLETED" },
  });
});

afterEach(() => {
  delete process.env.PAYLINK_FALLBACK_MOBILE;
  delete process.env.PAYLINK_BASE_URL;
  delete process.env.NEXT_PUBLIC_APP_URL;
});

describe("EXEC-003 P0 contract-level behavior", () => {
  it("DIRECT_BEHAVIORAL EXEC-003-C01-O01 denies before audit when the database role is rejected", async () => {
    databaseState.userPresent = false;
    const response = await requestFinance(
      req("http://localhost/api/properties/property-1/request-finance", "POST", {
        loanParams: { price: 500000 },
      }),
      { params: Promise.resolve({ id: "property-1" }) },
    );
    expect(response.status).toBe(403);
    expect(serviceMocks.writeAuditLog).not.toHaveBeenCalled();
  });

  it("DIRECT_BEHAVIORAL EXEC-003-C01-O01 reaches the audit boundary after authorization", async () => {
    const response = await requestFinance(
      req("http://localhost/api/properties/property-1/request-finance", "POST", {
        loanParams: { price: 500000 },
        contactInfo: { phone: "0500000000" },
      }),
      { params: Promise.resolve({ id: "property-1" }) },
    );
    expect(response.status).toBe(200);
    expect(serviceMocks.writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: SESSION.tenantId,
        userId: SESSION.userId,
        recordId: "property-1",
      }),
    );
  });

  it("DIRECT_BEHAVIORAL EXEC-003-C04-O02 keeps invoice issuance Cookie-only", async () => {
    sessionMocks.getSession.mockResolvedValue(null);
    const response = await issueContractInvoice(
      req("http://localhost/api/v1/contracts/contract-1/invoices", "POST"),
      { params: Promise.resolve({ id: "contract-1" }) },
    );
    expect(response.status).toBe(401);
    expect(authMocks.requireAuth).not.toHaveBeenCalled();
    expect(domainMocks.signContract).not.toHaveBeenCalled();
  });

  it("DIRECT_BEHAVIORAL EXEC-003-C04-O02 reaches invoice issuance after Cookie authorization", async () => {
    const response = await issueContractInvoice(
      req("http://localhost/api/v1/contracts/contract-1/invoices", "POST"),
      { params: Promise.resolve({ id: "contract-1" }) },
    );
    expect(response.status).toBe(200);
    expect(domainMocks.signContract).toHaveBeenCalledWith({
      tenantId: SESSION.tenantId,
      userId: SESSION.userId,
      contractId: "contract-1",
    });
  });

  it("DIRECT_BEHAVIORAL EXEC-003-C05-O01 denies payment-plan read before Prisma", async () => {
    databaseState.userPresent = false;
    const response = await readPaymentPlan(
      req("http://localhost/api/v1/contracts/contract-1/payment-plan"),
      { params: Promise.resolve({ id: "contract-1" }) },
    );
    expect(response.status).toBe(403);
    expect(prismaMocks.paymentPlanFindFirst).not.toHaveBeenCalled();
  });

  it("DIRECT_BEHAVIORAL EXEC-003-C05-O01 reaches the tenant-scoped payment-plan read", async () => {
    const response = await readPaymentPlan(
      req("http://localhost/api/v1/contracts/contract-1/payment-plan"),
      { params: Promise.resolve({ id: "contract-1" }) },
    );
    expect(response.status).toBe(404);
    expect(prismaMocks.paymentPlanFindFirst).toHaveBeenCalledWith({
      where: { tenantId: SESSION.tenantId, contractId: "contract-1" },
    });
  });

  it("DIRECT_BEHAVIORAL EXEC-003-C05-O02 denies update before the domain mutation", async () => {
    databaseState.role = "READ_ONLY";
    const response = await updatePaymentPlan(
      req("http://localhost/api/v1/contracts/contract-1/payment-plan", "PUT", {
        template: "MONTHLY",
      }),
      { params: Promise.resolve({ id: "contract-1" }) },
    );
    expect(response.status).toBe(403);
    expect(domainMocks.configurePaymentPlan).not.toHaveBeenCalled();
  });

  it("DIRECT_BEHAVIORAL EXEC-003-C05-O02 reaches payment-plan update after authorization", async () => {
    const response = await updatePaymentPlan(
      req("http://localhost/api/v1/contracts/contract-1/payment-plan", "PUT", {
        template: "MONTHLY",
      }),
      { params: Promise.resolve({ id: "contract-1" }) },
    );
    expect(response.status).toBe(200);
    expect(domainMocks.configurePaymentPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: SESSION.tenantId,
        userId: SESSION.userId,
        contractId: "contract-1",
      }),
    );
  });

  it("DIRECT_BEHAVIORAL EXEC-003-C05-O03 denies creation before the domain mutation", async () => {
    databaseState.role = "READ_ONLY";
    const response = await createPaymentPlan(
      req("http://localhost/api/v1/contracts/contract-1/payment-plan", "POST"),
      { params: Promise.resolve({ id: "contract-1" }) },
    );
    expect(response.status).toBe(403);
    expect(domainMocks.ensureDefaultPaymentPlan).not.toHaveBeenCalled();
  });

  it("DIRECT_BEHAVIORAL EXEC-003-C05-O03 reaches payment-plan creation after authorization", async () => {
    const response = await createPaymentPlan(
      req("http://localhost/api/v1/contracts/contract-1/payment-plan", "POST"),
      { params: Promise.resolve({ id: "contract-1" }) },
    );
    expect(response.status).toBe(200);
    expect(domainMocks.ensureDefaultPaymentPlan).toHaveBeenCalledWith({
      tenantId: SESSION.tenantId,
      userId: SESSION.userId,
      contractId: "contract-1",
    });
  });

  it("DIRECT_BEHAVIORAL EXEC-003-C06-O01 rejects Bearer-only access on restructure", async () => {
    sessionMocks.getSession.mockResolvedValue(null);
    const response = await restructurePaymentPlanRoute(
      req("http://localhost/api/v1/contracts/contract-1/restructure", "POST", {
        mode: "REDUCE_TERM",
        prepaymentAmount: 1000,
      }),
      { params: Promise.resolve({ id: "contract-1" }) },
    );
    expect(response.status).toBe(401);
    expect(domainMocks.restructurePaymentPlan).not.toHaveBeenCalled();
  });

  it("DIRECT_BEHAVIORAL EXEC-003-C06-O01 reaches restructuring after Cookie authorization", async () => {
    const response = await restructurePaymentPlanRoute(
      req("http://localhost/api/v1/contracts/contract-1/restructure", "POST", {
        mode: "REDUCE_TERM",
        prepaymentAmount: 1000,
        idempotencyKey: "idem-1",
      }),
      { params: Promise.resolve({ id: "contract-1" }) },
    );
    expect(response.status).toBe(200);
    expect(domainMocks.restructurePaymentPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: SESSION.tenantId,
        userId: SESSION.userId,
        contractId: "contract-1",
      }),
    );
  });

  it("DIRECT_BEHAVIORAL EXEC-003-C07-O01 denies signing before the domain operation", async () => {
    databaseState.role = "READ_ONLY";
    const response = await signContractRoute(
      req("http://localhost/api/v1/contracts/contract-1/sign", "POST", {
        confirm: true,
      }),
      { params: Promise.resolve({ id: "contract-1" }) },
    );
    expect(response.status).toBe(403);
    expect(domainMocks.signContract).not.toHaveBeenCalled();
  });

  it("DIRECT_BEHAVIORAL EXEC-003-C07-O01 reaches signing after authorization", async () => {
    const response = await signContractRoute(
      req("http://localhost/api/v1/contracts/contract-1/sign", "POST", {
        confirm: true,
      }),
      { params: Promise.resolve({ id: "contract-1" }) },
    );
    expect(response.status).toBe(200);
    expect(domainMocks.signContract).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: SESSION.tenantId,
        userId: SESSION.userId,
        contractId: "contract-1",
      }),
    );
  });

  it("DIRECT_BEHAVIORAL EXEC-003-C08-O01 returns 401 before Paylink configuration", async () => {
    authMocks.requireAuth.mockResolvedValue(null);
    const response = await createPaylink(
      req("http://localhost/api/v1/invoices/invoice-1/paylink/create", "POST"),
      { params: Promise.resolve({ id: "invoice-1" }) },
    );
    expect(response.status).toBe(401);
    expect(prismaMocks.invoiceFindFirst).not.toHaveBeenCalled();
  });

  it("DIRECT_BEHAVIORAL EXEC-003-C08-O01 returns 403 when Legacy database roles deny", async () => {
    databaseState.role = "READ_ONLY";
    const response = await createPaylink(
      req("http://localhost/api/v1/invoices/invoice-1/paylink/create", "POST"),
      { params: Promise.resolve({ id: "invoice-1" }) },
    );
    expect(response.status).toBe(403);
    expect(prismaMocks.invoiceFindFirst).not.toHaveBeenCalled();
  });

  it("DIRECT_BEHAVIORAL EXEC-003-C08-O01 reaches the tenant-scoped invoice lookup after authorization", async () => {
    process.env.PAYLINK_FALLBACK_MOBILE = "0500000000";
    const response = await createPaylink(
      req("http://localhost/api/v1/invoices/invoice-1/paylink/create", "POST"),
      { params: Promise.resolve({ id: "invoice-1" }) },
    );
    expect(response.status).toBe(404);
    expect(prismaMocks.invoiceFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "invoice-1", tenantId: SESSION.tenantId },
      }),
    );
  });

  it("DIRECT_BEHAVIORAL EXEC-003-C10-O01 keeps lease invoice creation Cookie-only", async () => {
    sessionMocks.getSession.mockResolvedValue(null);
    const response = await createLeaseInvoice(
      req("http://localhost/api/v1/leases/lease-1/invoices", "POST", {
        subtotal: "1000",
        dueDate: "2026-08-01",
      }),
      { params: Promise.resolve({ id: "lease-1" }) },
    );
    expect(response.status).toBe(401);
    expect(prismaMocks.rentalLeaseFindFirst).not.toHaveBeenCalled();
  });

  it("DIRECT_BEHAVIORAL EXEC-003-C10-O01 reaches the tenant-scoped lease lookup", async () => {
    const response = await createLeaseInvoice(
      req("http://localhost/api/v1/leases/lease-1/invoices", "POST", {
        subtotal: "1000",
        dueDate: "2026-08-01",
      }),
      { params: Promise.resolve({ id: "lease-1" }) },
    );
    expect(response.status).toBe(404);
    expect(prismaMocks.rentalLeaseFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "lease-1", tenantId: SESSION.tenantId },
      }),
    );
  });

  it("DIRECT_BEHAVIORAL EXEC-003-C11-O01 enforces ADMIN before reading webhook settings", async () => {
    databaseState.role = "SALES_MANAGER";
    const response = await readLeadsWebhookSettings(
      req("http://localhost/api/v1/settings/leads-webhook"),
    );
    expect(response.status).toBe(403);
    expect(prismaMocks.tenantFindFirst).not.toHaveBeenCalled();
  });

  it("DIRECT_BEHAVIORAL EXEC-003-C11-O01 reaches the tenant-scoped settings read", async () => {
    const response = await readLeadsWebhookSettings(
      req("http://localhost/api/v1/settings/leads-webhook"),
    );
    expect(response.status).toBe(200);
    expect(prismaMocks.tenantFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: SESSION.tenantId, isActive: true },
      }),
    );
  });

  it("DIRECT_BEHAVIORAL EXEC-003-C11-O02 denies credential rotation before the transaction", async () => {
    databaseState.role = "SALES_MANAGER";
    const response = await rotateLeadsWebhookSecret(
      req("http://localhost/api/v1/settings/leads-webhook", "POST"),
    );
    expect(response.status).toBe(403);
    expect(prismaMocks.transaction).not.toHaveBeenCalled();
  });

  it("DIRECT_BEHAVIORAL EXEC-003-C11-O02 reaches credential rotation only after ADMIN authorization", async () => {
    const response = await rotateLeadsWebhookSecret(
      req("http://localhost/api/v1/settings/leads-webhook", "POST"),
    );
    expect(response.status).toBe(200);
    expect(prismaMocks.transaction).toHaveBeenCalledOnce();
    expect(prismaMocks.txTenantUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: SESSION.tenantId } }),
    );
    expect(prismaMocks.txAuditCreate).toHaveBeenCalled();
  });
});
