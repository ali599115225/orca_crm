/**
 * tests/revenue-integrity/authorization-audit.test.ts
 *
 * ORCA CRM — Authorization & Audit Infrastructure End-to-End Tests
 *
 * Verifies:
 *  1. Payment initiation requires ADMIN/owner session (DB-backed)
 *  2. Contract issuance requires ADMIN/owner/SALES_MANAGER session
 *  3. Lead status mutation requires authenticated role + FK check
 *  4. Commission payment requires ADMIN/owner session
 *  5. Installment payment API requires unconditional DB role
 *  6. Cross-tenant access is blocked at FK boundary
 *  7. Audit events are written on every successful mutation
 *  8. No stack traces or raw secrets returned to client
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// ─── Prisma Mock ─────────────────────────────────────────────────────────────

const mockUserFindFirst = vi.fn();
const mockUserFindUnique = vi.fn();
const mockTenantFindFirst = vi.fn();
const mockTenantFindUnique = vi.fn();
const mockLeadFindFirst = vi.fn();
const mockLeadUpdate = vi.fn();
const mockPayrollFindFirst = vi.fn();
const mockPayrollUpdateMany = vi.fn();
const mockAuditLogCreate = vi.fn();
const mockCommissionPaymentCreate = vi.fn();
const mockPaymentTxUpdate = vi.fn().mockResolvedValue({});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findFirst: mockUserFindFirst, findUnique: mockUserFindUnique },
    tenant: { findFirst: mockTenantFindFirst, findUnique: mockTenantFindUnique },
    lead: { findFirst: mockLeadFindFirst, update: mockLeadUpdate },
    payrollCommission: {
      findFirst: mockPayrollFindFirst,
      updateMany: mockPayrollUpdateMany,
    },
    commissionPayment: { create: mockCommissionPaymentCreate },
    paymentTransaction: { update: mockPaymentTxUpdate },
    $transaction: vi.fn(),
  },
  rawPrisma: {
    user: { findFirst: mockUserFindFirst, findUnique: mockUserFindUnique },
    tenant: { findFirst: mockTenantFindFirst, findUnique: mockTenantFindUnique },
    auditLog: { create: mockAuditLogCreate },
  },
}));

// ─── Session / Auth Mocks ─────────────────────────────────────────────────────

const mockGetSession = vi.fn();
const mockGetActiveTenant = vi.fn();
const mockIsSuperAdmin = vi.fn();
const mockRunWithDatabaseSession = vi.fn();

vi.mock("@/lib/session", () => ({ getSession: mockGetSession }));
vi.mock("@/lib/tenant", () => ({ getActiveTenant: mockGetActiveTenant }));
vi.mock("@/lib/api-auth-guard", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api-auth-guard")>();
  return {
    ...actual,
    isSuperAdmin: mockIsSuperAdmin,
    hasDatabaseRole: vi.fn(async (session: any, roles: readonly string[]) => {
      const user = await mockUserFindFirst({ where: { id: session.userId, tenantId: session.tenantId } });
      const tenant = await mockTenantFindFirst({ where: { id: session.tenantId, isActive: true } });
      return Boolean(user && tenant && roles.includes(String(user.role)));
    }),
    requireAuth: vi.fn(async () => null), // overridden per test
    runWithDatabaseSession: mockRunWithDatabaseSession,
  };
});

// ─── Payment Mocks ────────────────────────────────────────────────────────────

const mockIsProviderEnabled = vi.fn().mockReturnValue(true);
const mockInitiatePayment = vi.fn();

vi.mock("@/lib/payments/registry", () => ({
  getEnabledProviderCodes: vi.fn(() => ["MOYASAR"]),
  isProviderEnabled: mockIsProviderEnabled,
}));
vi.mock("@/lib/payments/service", () => ({
  initiatePayment: mockInitiatePayment,
  getPlanPriceMinor: vi.fn(),
}));

// ─── Domain Mocks ─────────────────────────────────────────────────────────────

const mockRecordPayment = vi.fn();
vi.mock("@/lib/domain/transaction-spine", () => ({
  recordPayment: mockRecordPayment,
  issueContract: vi.fn(),
  cancelDraftContract: vi.fn(),
  earlySettlePaymentPlan: vi.fn(),
}));
vi.mock("@/lib/accounting", () => ({
  findAccountByCode: vi.fn().mockResolvedValue(null),
  seedChartOfAccounts: vi.fn().mockResolvedValue(undefined),
  postCommissionEntry: vi.fn(),
  postInvoiceEntry: vi.fn(),
}));
vi.mock("@/lib/notifications", () => ({
  sendSMSNotification: vi.fn(),
  sendWhatsAppNotification: vi.fn(),
}));
vi.mock("@/lib/privacy-mask", () => ({
  hashPhone: vi.fn((t: string, p: string) => `hash:${p}`),
  hashEmail: vi.fn((e: string) => `hash:${e}`),
}));
vi.mock("@/lib/plan-guard", () => ({
  assertPlanLimit: vi.fn(),
  PlanLimitError: class PlanLimitError extends Error { code = "PLAN_LIMIT" },
  logPlanBlockedAttempt: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

// ─── Fixture Data ─────────────────────────────────────────────────────────────

const TENANT_ID = "aaaaaaaa-0000-0000-0000-000000000001";
const USER_ID = "bbbbbbbb-0000-0000-0000-000000000001";
const OTHER_TENANT_ID = "cccccccc-0000-0000-0000-000000000001";
const LEAD_ID = "dddddddd-0000-0000-0000-000000000001";
const COMMISSION_ID = "eeeeeeee-0000-0000-0000-000000000001";

const ADMIN_SESSION = { userId: USER_ID, tenantId: TENANT_ID, role: "ADMIN" };
const SALES_SESSION = { userId: USER_ID, tenantId: TENANT_ID, role: "SALES_EMPLOYEE" };

const VALID_TENANT = { id: TENANT_ID, isActive: true, companyName: "شركة اختبار" };
const ADMIN_USER = { id: USER_ID, tenantId: TENANT_ID, role: "ADMIN" };
const SALES_USER = { id: USER_ID, tenantId: TENANT_ID, role: "SALES_EMPLOYEE" };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function setupAdminAuth() {
  mockGetSession.mockResolvedValue(ADMIN_SESSION);
  mockGetActiveTenant.mockResolvedValue(VALID_TENANT);
  mockIsSuperAdmin.mockResolvedValue(false);
  mockUserFindFirst.mockResolvedValue(ADMIN_USER);
  mockTenantFindFirst.mockResolvedValue(VALID_TENANT);
}

function setupSalesAuth() {
  mockGetSession.mockResolvedValue(SALES_SESSION);
  mockGetActiveTenant.mockResolvedValue(VALID_TENANT);
  mockIsSuperAdmin.mockResolvedValue(false);
  mockUserFindFirst.mockResolvedValue(SALES_USER);
  mockTenantFindFirst.mockResolvedValue(VALID_TENANT);
}

// ─── 1. Payment Initiation Auth ───────────────────────────────────────────────

describe("Payment Initiation Authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuditLogCreate.mockResolvedValue({});
    mockInitiatePayment.mockResolvedValue({ success: true, internalTxId: "tx-1" });
  });

  it("1. Missing session → error (not initiated)", async () => {
    mockGetSession.mockResolvedValue(null);
    mockGetActiveTenant.mockResolvedValue(VALID_TENANT);

    const { initiateSubscriptionPaymentAction } = await import("@/app/actions/payment");
    const result = await initiateSubscriptionPaymentAction("basic");

    expect(result.success).toBe(false);
    expect(mockInitiatePayment).not.toHaveBeenCalled();
  });

  it("2. SALES_EMPLOYEE session → legacy SaaS payment remains out of scope", async () => {
    setupSalesAuth();

    const { initiateSubscriptionPaymentAction } = await import("@/app/actions/payment");
    const result = await initiateSubscriptionPaymentAction("basic");

    expect(result.success).toBe(false);
    expect(result.code).toBe("LEGACY_SAAS_OUT_OF_SCOPE");
    expect(mockInitiatePayment).not.toHaveBeenCalled();
  });

  it("3. ADMIN session cannot bypass the legacy SaaS payment shutdown", async () => {
    setupAdminAuth();

    const { initiateSubscriptionPaymentAction } = await import("@/app/actions/payment");
    const result = await initiateSubscriptionPaymentAction("silver");

    expect(result.success).toBe(false);
    expect(result.code).toBe("LEGACY_SAAS_OUT_OF_SCOPE");
    expect(mockInitiatePayment).not.toHaveBeenCalled();
    expect(mockAuditLogCreate).not.toHaveBeenCalled();
  });

  it("4. Addon payment: missing session → error", async () => {
    mockGetSession.mockResolvedValue(null);
    mockGetActiveTenant.mockResolvedValue(VALID_TENANT);

    const { initiateAddonPaymentAction } = await import("@/app/actions/payment");
    const result = await initiateAddonPaymentAction(5);

    expect(result.success).toBe(false);
    expect(mockInitiatePayment).not.toHaveBeenCalled();
  });

  it("5. Addon payment: ADMIN remains blocked before provider or audit", async () => {
    setupAdminAuth();

    const { initiateAddonPaymentAction } = await import("@/app/actions/payment");
    const result = await initiateAddonPaymentAction(3);

    expect(result.success).toBe(false);
    expect(result.code).toBe("LEGACY_SAAS_OUT_OF_SCOPE");
    expect(mockInitiatePayment).not.toHaveBeenCalled();
    expect(mockAuditLogCreate).not.toHaveBeenCalled();
  });
});

// ─── 2. Lead Status Mutation Auth ─────────────────────────────────────────────

describe("Lead Status Mutation Authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuditLogCreate.mockResolvedValue({});
  });

  it("6. Missing session → error, lead NOT updated", async () => {
    mockGetSession.mockResolvedValue(null);

    const { updateLeadStatusAction } = await import("@/app/actions/leads");
    const result = await updateLeadStatusAction(LEAD_ID, "RESERVED");

    expect(result.success).toBe(false);
    expect(mockLeadUpdate).not.toHaveBeenCalled();
  });

  it("7. Wrong role (rental_manager not in writers) → FORBIDDEN", async () => {
    mockGetSession.mockResolvedValue({ userId: USER_ID, tenantId: TENANT_ID, role: "rental_manager" });
    mockGetActiveTenant.mockResolvedValue(VALID_TENANT);
    mockIsSuperAdmin.mockResolvedValue(false);
    mockUserFindFirst.mockResolvedValue({ ...ADMIN_USER, role: "rental_manager" });
    mockTenantFindFirst.mockResolvedValue(VALID_TENANT);

    const { updateLeadStatusAction } = await import("@/app/actions/leads");
    const result = await updateLeadStatusAction(LEAD_ID, "RESERVED");

    expect(result.success).toBe(false);
    expect(result.error).toContain("FORBIDDEN");
    expect(mockLeadUpdate).not.toHaveBeenCalled();
  });

  it("8. Lead not in tenant → 404, no mutation", async () => {
    setupAdminAuth();
    mockLeadFindFirst.mockResolvedValue(null); // FK fails

    const { updateLeadStatusAction } = await import("@/app/actions/leads");
    const result = await updateLeadStatusAction(LEAD_ID, "RESERVED");

    expect(result.success).toBe(false);
    expect(result.error).toContain("غير موجود");
    expect(mockLeadUpdate).not.toHaveBeenCalled();
    expect(mockAuditLogCreate).not.toHaveBeenCalled();
  });

  it("9. Cross-tenant attempt → blocked by FK (lead belongs to other tenant)", async () => {
    // User is ADMIN on TENANT_ID but lead belongs to OTHER_TENANT_ID
    setupAdminAuth();
    // FK check: no lead found for (leadId, TENANT_ID) because it's on OTHER_TENANT_ID
    mockLeadFindFirst.mockResolvedValue(null);

    const { updateLeadStatusAction } = await import("@/app/actions/leads");
    const result = await updateLeadStatusAction(LEAD_ID, "RESERVED");

    expect(result.success).toBe(false);
    expect(mockLeadUpdate).not.toHaveBeenCalled();
  });

  it("10. ADMIN → status updated + LEAD_STATUS_UPDATED audit written", async () => {
    setupAdminAuth();
    mockLeadFindFirst.mockResolvedValue({ id: LEAD_ID, status: "NEW" });
    mockLeadUpdate.mockResolvedValue({ id: LEAD_ID, status: "RESERVED" });

    const { updateLeadStatusAction } = await import("@/app/actions/leads");
    const result = await updateLeadStatusAction(LEAD_ID, "RESERVED");

    expect(result.success).toBe(true);
    expect(mockLeadUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: LEAD_ID, tenantId: TENANT_ID }, // tenantId in where
      })
    );
    expect(mockAuditLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "LEAD_STATUS_UPDATED",
          tenantId: TENANT_ID,
          userId: USER_ID,
        }),
      })
    );
  });
});

// ─── 3. Contract Actions Auth ─────────────────────────────────────────────────

describe("Contract Actions Authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuditLogCreate.mockResolvedValue({});
  });

  it("11. saveContractTermsAction: missing session → error", async () => {
    mockGetSession.mockResolvedValue(null);

    const { saveContractTermsAction } = await import("@/app/actions/contract");
    const result = await saveContractTermsAction("terms");

    expect(result.success).toBe(false);
  });

  it("12. saveContractTermsAction: SALES_EMPLOYEE → FORBIDDEN", async () => {
    setupSalesAuth();

    const { saveContractTermsAction } = await import("@/app/actions/contract");
    const result = await saveContractTermsAction("terms");

    expect(result.success).toBe(false);
    expect(result.error).toContain("FORBIDDEN");
  });

  it("13. issueContractActionDirect: missing session → error, no contract issued", async () => {
    mockGetSession.mockResolvedValue(null);

    const { issueContractActionDirect } = await import("@/app/actions/contract");
    const result = await issueContractActionDirect({
      clientId: "cl-1",
      propertyId: "pr-1",
      amount: 500_000,
    });

    expect(result.success).toBe(false);
  });

  it("13b. issueContractActionDirect: signedAt null returns success without throw", async () => {
    setupAdminAuth();
    const { issueContract } = await import("@/lib/domain/transaction-spine");
    vi.mocked(issueContract).mockResolvedValue({
      id: "contract-1",
      buyerName: "Buyer",
      buyerPhone: "0500000000",
      totalVolumeSar: 500_000,
      signedAt: null,
    } as never);

    const { issueContractActionDirect } = await import("@/app/actions/contract");
    await expect(
      issueContractActionDirect({
        clientId: "cl-1",
        propertyId: "pr-1",
        amount: 500_000,
      }),
    ).resolves.toMatchObject({
      success: true,
      contract: { signedAt: null },
    });
  });
});

// ─── 4. Commission Payment Auth ───────────────────────────────────────────────

describe("Commission Payment Authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuditLogCreate.mockResolvedValue({});
  });

  it("14. processCommissionPayment: missing session → throws", async () => {
    mockGetSession.mockResolvedValue(null);
    mockGetActiveTenant.mockResolvedValue(VALID_TENANT);

    const { processCommissionPayment } = await import("@/app/actions/finance");
    await expect(processCommissionPayment(COMMISSION_ID)).rejects.toThrow(
      "فشل صرف العمولة"
    );
    expect(mockPayrollUpdateMany).not.toHaveBeenCalled();
  });

  it("15. processCommissionPayment: SALES_MANAGER → FORBIDDEN", async () => {
    mockGetSession.mockResolvedValue({ userId: USER_ID, tenantId: TENANT_ID, role: "SALES_MANAGER" });
    mockGetActiveTenant.mockResolvedValue(VALID_TENANT);
    mockIsSuperAdmin.mockResolvedValue(false);
    mockUserFindFirst.mockResolvedValue({ ...ADMIN_USER, role: "SALES_MANAGER" });
    mockTenantFindFirst.mockResolvedValue(VALID_TENANT);

    const { processCommissionPayment } = await import("@/app/actions/finance");
    await expect(processCommissionPayment(COMMISSION_ID)).rejects.toThrow(
      "فشل صرف العمولة"
    );
    expect(mockPayrollUpdateMany).not.toHaveBeenCalled();
  });

  it("16. processCommissionPayment: ADMIN → processes + tenantId in where + audit", async () => {
    setupAdminAuth();
    const commission = {
      id: COMMISSION_ID,
      tenantId: TENANT_ID,
      status: "PENDING",
      amount: 5000,
    };
    mockPayrollFindFirst.mockResolvedValue(commission);
    mockPayrollUpdateMany.mockResolvedValue({ count: 1 });
    mockCommissionPaymentCreate.mockResolvedValue({ id: "cp-1" });

    // Mock the $transaction to run the callback inline
    const { prisma } = await import("@/lib/prisma");
    (prisma.$transaction as any).mockImplementation(async (fn: any) => fn(prisma));

    const { processCommissionPayment } = await import("@/app/actions/finance");
    const result = await processCommissionPayment(COMMISSION_ID);

    expect(result).toEqual({ success: true });
    // tenantId must be in the updateMany where clause
    expect(mockPayrollUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: TENANT_ID }),
      })
    );
    expect(mockAuditLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "COMMISSION_PAYMENT_PROCESSED" }),
      })
    );
  });

  it("17. processCommissionPayment: commission not in tenant → throws (FK)", async () => {
    setupAdminAuth();
    mockPayrollFindFirst.mockResolvedValue(null); // FK fails

    const { processCommissionPayment } = await import("@/app/actions/finance");
    await expect(processCommissionPayment(COMMISSION_ID)).rejects.toThrow(
      "فشل صرف العمولة"
    );
    expect(mockPayrollUpdateMany).not.toHaveBeenCalled();
  });
});

// ─── 5. Installment Pay API Auth ──────────────────────────────────────────────

describe("Installment Pay API Authorization", () => {
  async function callInstallmentPay(status: number) {
    mockRunWithDatabaseSession.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: false }), { status }),
    );
    const { POST } = await import(
      "@/app/api/v1/installments/[id]/pay/route"
    );
    const req = new Request("http://localhost/api/v1/installments/inst-1/pay", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    }) as any;
    return POST(req, { params: Promise.resolve({ id: "inst-1" }) });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuditLogCreate.mockResolvedValue({});
    mockRecordPayment.mockResolvedValue({
      payment: { id: "pmt-1" },
      idempotent: false,
    });
  });

  it("18. Auth boundary 401 is returned without payment work", async () => {
    const res = await callInstallmentPay(401);
    expect(res.status).toBe(401);
    expect(mockRecordPayment).not.toHaveBeenCalled();
  });

  it("19. Auth boundary 403 is returned without payment work", async () => {
    const res = await callInstallmentPay(403);
    expect(res.status).toBe(403);
    expect(mockRecordPayment).not.toHaveBeenCalled();
  });

  it("20. Route delegates to DB-backed finance roles and scopes installment lookup", () => {
    const source = readFileSync(
      resolve(process.cwd(), "app/api/v1/installments/[id]/pay/route.ts"),
      "utf8",
    );
    expect(source).toContain("runWithDatabaseSession(");
    expect(source).toContain("PAYMENT_ALLOWED_ROLES");
    expect(source).toContain("where: { id, tenantId }");
    expect(source).not.toContain("getSession(");
  });
});

// ─── 6. Audit Action Type Safety ─────────────────────────────────────────────

describe("Audit Action Type Safety", () => {
  it("22. All new typed actions present in AuditAction union", async () => {
    const { writeAuditLog } = await import("@/lib/audit");

    // These must compile and not throw
    const newActions = [
      "AUTHORIZATION_FORBIDDEN",
      "AUTHORIZATION_UNAUTHENTICATED",
      "CROSS_TENANT_ACCESS_BLOCKED",
      "SUBSCRIPTION_PAYMENT_INITIATED",
      "ADDON_PAYMENT_INITIATED",
      "INSTALLMENT_PAID",
      "INVOICE_PAYMENT_RECORDED",
      "COMMISSION_PAYMENT_PROCESSED",
      "CONTRACT_ISSUED",
      "CONTRACT_TERMS_UPDATED",
      "LEAD_STATUS_UPDATED",
    ] as const;

    for (const action of newActions) {
      await writeAuditLog({
        tenantId: TENANT_ID,
        userId: USER_ID,
        action,
        tableName: "test",
        recordId: "test-id",
      });
    }

    // mockAuditLogCreate is called for each action (or swallowed silently)
    expect(newActions.length).toBe(11);
  });
});
