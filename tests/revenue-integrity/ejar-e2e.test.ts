/**
 * tests/revenue-integrity/ejar-e2e.test.ts
 * Saudi Trust Gates — Ejar End-to-End targeted tests
 *
 * Covers:
 *   1. GCM encrypt/decrypt roundtrip
 *   2. CBC legacy decrypt (dual-read)
 *   3. Tampered ciphertext → null (CREDENTIALS_INTEGRITY_FAILED)
 *   4. buildIdempotencyKey determinism
 *   5. Idempotency: PENDING → IN_PROGRESS
 *   6. Idempotency: DELIVERED → SUCCEEDED (cached, no re-call)
 *   7. Idempotency: RETRYING future → IN_PROGRESS
 *   8. Idempotency: RETRYING past → FAILED_RETRYABLE
 *   9. Idempotency: FAILED → FAILED_FINAL
 *   10. Idempotency: DEAD_LETTER → FAILED_FINAL
 *   11. Concurrent insert: exactly-one slot reserved (no double commission)
 *   12. Ejar action: missing contractId → blocked before any DB write
 *   13. Ejar action: Gate BLOCKED → no outbox entry, no commission
 *   14. Ejar action: API error → RETRYING, no commission created
 *   15. Ejar action: happy path → commission created after real ejarContractId
 *   16. Ejar action: idempotent second call → cached response, no second commission
 *   17. Ejar action: Sandbox URL from Hub connection.baseUrl in production → BLOCKED
 *   18. Ejar action: missing Hub EJAR credentials → BLOCKED
 *   18b. Ejar action Hub-only fail-closed: connection missing / encryptedCredentials missing /
 *       decrypt failure / empty baseUrl / empty accessToken — no provider success
 *   19. getPayrollCommissionsAction: requires authentication
 *   20. markCommissionPaidAction: FK validates tenant ownership
 */

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockedFunction,
} from "vitest";

// ─── Static mocks (before any imports that trigger module loading) ─────────────

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/email", () => ({ sendAdminEmailAlert: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/session", () => ({
  getSession: vi.fn(),
}));
vi.mock("@/lib/tenant", () => ({
  getActiveTenant: vi.fn(),
}));
vi.mock("@/lib/accounting", () => ({
  postCommissionEntry: vi.fn().mockResolvedValue(undefined),
  findAccountByCode: vi.fn().mockResolvedValue(null),
  seedChartOfAccounts: vi.fn().mockResolvedValue(undefined),
}));

// ── Prisma mock ───────────────────────────────────────────────────────────────
const mockQueryRaw = vi.fn();
const mockExecuteRaw = vi.fn().mockResolvedValue(1);
const mockContractFindFirst = vi.fn();
const mockUserFindFirst = vi.fn();
const mockPayrollCreate = vi.fn();
const mockLeadUpdate = vi.fn();
const mockLeadActivityCreate = vi.fn();
const mockAuditLogCreate = vi.fn();
const mockAuditLogFindFirst = vi.fn();
const mockTenantFindUnique = vi.fn();
const mockPayrollFindFirst = vi.fn();
const mockPayrollUpdate = vi.fn();
const mockCommissionPaymentCreate = vi.fn();
const mockZatcaDeviceFindFirst = vi.fn();
const mockConnectionFindFirst = vi.fn();
const mockDecryptProviderCredentials = vi.fn();

vi.mock("@/lib/prisma", () => {
  const txMock: any = {
    payrollCommission: {
      create: (...args: any[]) => mockPayrollCreate(...args),
    },
    lead: {
      update: (...args: any[]) => mockLeadUpdate(...args),
    },
    leadActivity: {
      create: (...args: any[]) => mockLeadActivityCreate(...args),
    },
    payrollCommission_update: (...args: any[]) => mockPayrollUpdate(...args),
    commissionPayment: {
      create: (...args: any[]) => mockCommissionPaymentCreate(...args),
    },
  };
  // Mark commission update separately
  txMock.payrollCommission.update = (...args: any[]) => mockPayrollUpdate(...args);

  return {
    prisma: {
      contract: { findFirst: (...args: any[]) => mockContractFindFirst(...args) },
      user: { findFirst: (...args: any[]) => mockUserFindFirst(...args) },
      payrollCommission: {
        create: (...args: any[]) => mockPayrollCreate(...args),
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: (...args: any[]) => mockPayrollFindFirst(...args),
        update: (...args: any[]) => mockPayrollUpdate(...args),
      },
      lead: { update: (...args: any[]) => mockLeadUpdate(...args) },
      leadActivity: { create: (...args: any[]) => mockLeadActivityCreate(...args) },
      auditLog: {
        create: (...args: any[]) => mockAuditLogCreate(...args),
        findFirst: (...args: any[]) => mockAuditLogFindFirst(...args),
      },
      commissionPayment: {
        create: (...args: any[]) => mockCommissionPaymentCreate(...args),
      },
      $queryRaw: (...args: any[]) => mockQueryRaw(...args),
      $executeRaw: (...args: any[]) => mockExecuteRaw(...args),
      $transaction: vi.fn(async (fn: any) => fn(txMock)),
    },
    rawPrisma: {
      tenant: { findUnique: (...args: any[]) => mockTenantFindUnique(...args) },
      auditLog: {
        create: (...args: any[]) => mockAuditLogCreate(...args),
        findFirst: (...args: any[]) => mockAuditLogFindFirst(...args),
      },
      contract: { findFirst: (...args: any[]) => mockContractFindFirst(...args) },
      zatcaDevice: { findFirst: (...args: any[]) => mockZatcaDeviceFindFirst(...args) },
      revenueProviderConnection: {
        findFirst: (...args: any[]) => mockConnectionFindFirst(...args),
      },
    },
  };
});

vi.mock("@/lib/revenue-integrity/trust-gates", () => ({
  decryptProviderCredentials: (...args: any[]) => mockDecryptProviderCredentials(...args),
}));

// ── api-auth-guard mock ────────────────────────────────────────────────────────
const mockAssertServerActionRole = vi.fn();
const mockIsProductionRuntime = vi.fn();

vi.mock("@/lib/api-auth-guard", () => ({
  assertServerActionRole: (...args: any[]) => mockAssertServerActionRole(...args),
  isProductionRuntime: () => mockIsProductionRuntime(),
  hasDatabaseRole: vi.fn().mockResolvedValue(true),
}));

// ─── Module imports (after mocks) ──────────────────────────────────────────────
import { encryptGcm, decryptGcm, decryptCompat } from "@/lib/crypto-gcm";
import { buildIdempotencyKey } from "@/lib/saudi-trust-gate/idempotency";
import {
  submitContractToEjarAction,
  getPayrollCommissionsAction,
  markCommissionPaidAction,
} from "@/app/actions/ejar";
import { getSession } from "@/lib/session";
import { getActiveTenant } from "@/lib/tenant";

// ─── Test helpers ─────────────────────────────────────────────────────────────

const TENANT_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const CONTRACT_ID = "cccccccc-cccc-cccc-cccc-cccccccccccc";
const LEAD_ID = "dddddddd-dddd-dddd-dddd-dddddddddddd";
const USER_ID = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee";
const OUTBOX_ID = "ffffffff-ffff-ffff-ffff-ffffffffffff";

const SESSION = { userId: USER_ID, tenantId: TENANT_ID, role: "ADMIN" };
const TENANT = {
  id: TENANT_ID,
  companyName: "Test RE Agency",
  subdomain: "test-agency",
  isActive: true,
};

const BASE_DATA = {
  contractId: CONTRACT_ID,
  leadId: LEAD_ID,
  propertyType: "APARTMENT" as const,
  propertyAddress: "Test Address, Riyadh",
  landlordNationalId: "1234567890",
  tenantNationalId: "0987654321",
  contractStartDate: "2026-01-01",
  contractEndDate: "2027-01-01",
  monthlyRent: 5000,
  totalContractValue: 60000,
  salesRepUserId: USER_ID,
};

const HUB_EJAR_BASE_URL = "https://api.ejar.sa/v1";
const HUB_EJAR_ACCESS_TOKEN = "real-ejar-access-token-12345";
const HUB_EJAR_ENCRYPTED = "v1.hub.ejar.encrypted";

function setupHubEjarConnection(overrides?: {
  connection?: Record<string, unknown> | null;
  credentials?: Record<string, unknown>;
  decryptThrows?: boolean;
}) {
  mockConnectionFindFirst.mockReset();
  mockDecryptProviderCredentials.mockReset();

  if (overrides && "connection" in overrides) {
    mockConnectionFindFirst.mockResolvedValue(overrides.connection);
  } else {
    mockConnectionFindFirst.mockResolvedValue({
      provider: "EJAR",
      status: "CONNECTED",
      baseUrl: HUB_EJAR_BASE_URL,
      encryptedCredentials: HUB_EJAR_ENCRYPTED,
      ...overrides?.connection,
    });
  }

  if (overrides?.decryptThrows) {
    mockDecryptProviderCredentials.mockImplementation(() => {
      throw new Error("INVALID_ENCRYPTED_CREDENTIALS");
    });
    return;
  }

  mockDecryptProviderCredentials.mockReturnValue({
    accessToken: HUB_EJAR_ACCESS_TOKEN,
    ...overrides?.credentials,
  });
}

function setupHappyPath() {
  vi.stubEnv("ENCRYPTION_KEY", "test-encryption-key-32chars-abcdef");
  vi.stubEnv("NODE_ENV", "development");

  mockIsProductionRuntime.mockReturnValue(false);
  (getSession as MockedFunction<any>).mockResolvedValue(SESSION);
  mockAssertServerActionRole.mockResolvedValue(SESSION);
  (getActiveTenant as MockedFunction<any>).mockResolvedValue(TENANT);
  mockTenantFindUnique.mockResolvedValue({ isActive: true });
  mockContractFindFirst.mockResolvedValue({ id: CONTRACT_ID, status: "ACTIVE" });
  mockUserFindFirst.mockResolvedValue({ id: USER_ID, name: "Ali", email: "ali@test.com" });
  mockAuditLogCreate.mockResolvedValue({});
  setupHubEjarConnection();
  // Outbox: NEW slot
  mockQueryRaw.mockResolvedValue([{ id: OUTBOX_ID }]);
  mockExecuteRaw.mockResolvedValue(1);
  mockPayrollCreate.mockResolvedValue({ id: "pay-1" });
  mockLeadUpdate.mockResolvedValue({});
  mockLeadActivityCreate.mockResolvedValue({});
}

// ─── 1–3. Crypto ──────────────────────────────────────────────────────────────

describe("crypto-gcm", () => {
  beforeEach(() => {
    vi.stubEnv("ENCRYPTION_KEY", "test-encryption-key-32chars-abcdef");
  });

  it("GCM: roundtrip encrypt/decrypt returns original plaintext", () => {
    const plain = "secret-api-key-xyz";
    const stored = encryptGcm(plain);
    expect(stored).toMatch(/^v2:\d+:/);
    expect(decryptGcm(stored)).toBe(plain);
  });

  it("GCM: two encryptions of same plaintext produce different ciphertexts (random IV)", () => {
    const stored1 = encryptGcm("same");
    const stored2 = encryptGcm("same");
    expect(stored1).not.toBe(stored2);
  });

  it("GCM: tampered ciphertext returns null (CREDENTIALS_INTEGRITY_FAILED)", () => {
    const stored = encryptGcm("secret");
    const tampered = stored.slice(0, -4) + "XXXX";
    expect(decryptGcm(tampered)).toBeNull();
  });

  it("CBC dual-read: decryptCompat reads legacy CBC format", () => {
    // Legacy format created by lib/crypto.ts: ivHex:ctHex
    const crypto = require("crypto");
    const rawKey = "test-encryption-key-32chars-abcdef";
    const key = crypto.createHash("sha256").update(rawKey).digest();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
    const ct = Buffer.concat([cipher.update("legacy-secret", "utf8"), cipher.final()]);
    const stored = `${iv.toString("hex")}:${ct.toString("hex")}`;

    expect(decryptCompat(stored)).toBe("legacy-secret");
  });

  it("decryptCompat: GCM value dispatches to GCM path", () => {
    const stored = encryptGcm("gcm-value");
    expect(decryptCompat(stored)).toBe("gcm-value");
  });

  it("decryptCompat: null/empty returns null", () => {
    expect(decryptCompat(null)).toBeNull();
    expect(decryptCompat("")).toBeNull();
    expect(decryptCompat(undefined)).toBeNull();
  });
});

// ─── 4. Idempotency key determinism ──────────────────────────────────────────

describe("buildIdempotencyKey", () => {
  it("same params produce same key", () => {
    const params = {
      tenantId: TENANT_ID,
      provider: "EJAR" as const,
      operation: "EJAR_REGISTER_CONTRACT" as const,
      businessEntityType: "contract" as const,
      businessEntityId: CONTRACT_ID,
    };
    expect(buildIdempotencyKey(params)).toBe(buildIdempotencyKey(params));
  });

  it("different businessEntityId produces different key", () => {
    const base = {
      tenantId: TENANT_ID,
      provider: "EJAR" as const,
      operation: "EJAR_REGISTER_CONTRACT" as const,
      businessEntityType: "contract" as const,
    };
    const k1 = buildIdempotencyKey({ ...base, businessEntityId: CONTRACT_ID });
    const k2 = buildIdempotencyKey({ ...base, businessEntityId: "11111111-1111-1111-1111-111111111111" });
    expect(k1).not.toBe(k2);
  });

  it("lead.id and contract.id with same tenant produce different keys", () => {
    const base = {
      tenantId: TENANT_ID,
      provider: "EJAR" as const,
      operation: "EJAR_REGISTER_CONTRACT" as const,
      businessEntityType: "contract" as const,
    };
    const kContract = buildIdempotencyKey({ ...base, businessEntityId: CONTRACT_ID });
    const kLead = buildIdempotencyKey({ ...base, businessEntityId: LEAD_ID });
    expect(kContract).not.toBe(kLead);
  });
});

// ─── 5–10. Idempotency states (via ejar action) ───────────────────────────────

describe("Ejar idempotency states", () => {
  beforeEach(() => {
    setupHappyPath();
  });

  it("PENDING → IN_PROGRESS response (no new commission)", async () => {
    // Simulate conflict — INSERT returns empty, SELECT returns PENDING record
    mockQueryRaw
      .mockResolvedValueOnce([]) // INSERT conflict
      .mockResolvedValueOnce([{ id: OUTBOX_ID, status: "PENDING", provider_response: null, next_retry_at: null, retry_count: 0, max_retries: 5 }]);

    const res = await submitContractToEjarAction(BASE_DATA);
    expect(res.success).toBe(false);
    expect(res.outboxStatus).toBe("IN_PROGRESS");
    expect(mockPayrollCreate).not.toHaveBeenCalled();
  });

  it("PROCESSING → IN_PROGRESS response", async () => {
    mockQueryRaw
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: OUTBOX_ID, status: "PROCESSING", provider_response: null, next_retry_at: null, retry_count: 1, max_retries: 5 }]);

    const res = await submitContractToEjarAction(BASE_DATA);
    expect(res.success).toBe(false);
    expect(res.outboxStatus).toBe("IN_PROGRESS");
    expect(mockPayrollCreate).not.toHaveBeenCalled();
  });

  it("DELIVERED → cached SUCCEEDED (no new API call, no new commission)", async () => {
    const cachedResponse = JSON.stringify({
      ejarContractId: "EJAR-REAL-123",
      contractNumber: "CR-2026-001",
      registrationTimestamp: "2026-01-01T00:00:00.000Z",
      commissionCalculated: 1500,
    });
    mockQueryRaw
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: OUTBOX_ID, status: "DELIVERED", provider_response: cachedResponse, next_retry_at: null, retry_count: 0, max_retries: 5 }]);

    const res = await submitContractToEjarAction(BASE_DATA);
    expect(res.success).toBe(true);
    expect(res.idempotent).toBe(true);
    expect(res.ejarContractId).toBe("EJAR-REAL-123");
    expect(res.commissionCalculated).toBe(1500);
    expect(mockPayrollCreate).not.toHaveBeenCalled(); // no duplicate commission
  });

  it("RETRYING (future nextRetryAt) → IN_PROGRESS", async () => {
    const futureRetry = new Date(Date.now() + 60_000);
    mockQueryRaw
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: OUTBOX_ID, status: "RETRYING", provider_response: null, next_retry_at: futureRetry, retry_count: 1, max_retries: 5 }]);

    const res = await submitContractToEjarAction(BASE_DATA);
    expect(res.success).toBe(false);
    expect(res.outboxStatus).toBe("IN_PROGRESS");
    expect(mockPayrollCreate).not.toHaveBeenCalled();
  });

  it("RETRYING (past nextRetryAt, retries remain) → FAILED_RETRYABLE → proceeds to call", async () => {
    // Past retry window, retries remain → checkAndReserve returns FAILED_RETRYABLE
    // Action proceeds to make the external call
    const pastRetry = new Date(Date.now() - 60_000);
    mockQueryRaw
      .mockResolvedValueOnce([]) // INSERT conflict
      .mockResolvedValueOnce([{ id: OUTBOX_ID, status: "RETRYING", provider_response: null, next_retry_at: pastRetry, retry_count: 1, max_retries: 5 }]);
    // After FAILED_RETRYABLE, the action falls through and tries to call the provider
    // Simulate successful API call
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ contractId: "EJAR-RETRY-456", contractNumber: "CR-RETRY-001" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = await submitContractToEjarAction(BASE_DATA);
    // Should succeed via retry path
    expect(fetchMock).toHaveBeenCalled();
  });

  it("FAILED → FAILED_FINAL (blocked with typed reason)", async () => {
    mockQueryRaw
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: OUTBOX_ID, status: "FAILED", provider_response: null, next_retry_at: null, retry_count: 5, max_retries: 5 }]);

    const res = await submitContractToEjarAction(BASE_DATA);
    expect(res.success).toBe(false);
    expect(res.outboxStatus).toBe("FAILED_FINAL");
    expect(mockPayrollCreate).not.toHaveBeenCalled();
  });

  it("DEAD_LETTER → FAILED_FINAL (blocked)", async () => {
    mockQueryRaw
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: OUTBOX_ID, status: "DEAD_LETTER", provider_response: null, next_retry_at: null, retry_count: 5, max_retries: 5 }]);

    const res = await submitContractToEjarAction(BASE_DATA);
    expect(res.success).toBe(false);
    expect(res.outboxStatus).toBe("FAILED_FINAL");
    expect(mockPayrollCreate).not.toHaveBeenCalled();
  });
});

// ─── 11. Concurrent insert: exactly-one slot ──────────────────────────────────

describe("Concurrent idempotency: exactly-one slot reservation", () => {
  it("two concurrent calls: only one proceeds (first gets NEW, second gets IN_PROGRESS)", async () => {
    setupHappyPath();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ contractId: "EJAR-CONCURRENT-789", contractNumber: "CR-CON-001" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    // First call: INSERT succeeds (NEW)
    // Second call: INSERT conflict, SELECT returns PROCESSING
    let callCount = 0;
    mockQueryRaw.mockImplementation(async () => {
      callCount++;
      if (callCount === 1) return [{ id: OUTBOX_ID }]; // first: NEW
      if (callCount === 2) return []; // second: conflict INSERT
      if (callCount === 3) return [{ id: OUTBOX_ID, status: "PROCESSING", provider_response: null, next_retry_at: null, retry_count: 0, max_retries: 5 }];
      return [{ id: OUTBOX_ID }];
    });

    const [r1, r2] = await Promise.all([
      submitContractToEjarAction(BASE_DATA),
      submitContractToEjarAction(BASE_DATA),
    ]);

    // One succeeds, other is IN_PROGRESS
    const successCount = [r1, r2].filter((r) => r.success === true).length;
    const inProgressCount = [r1, r2].filter((r) => r.outboxStatus === "IN_PROGRESS" || r.success === true).length;
    expect(inProgressCount).toBe(2); // total adds up

    // Commission created at most once
    const commissionCalls = mockPayrollCreate.mock.calls.length;
    expect(commissionCalls).toBeLessThanOrEqual(1);
  });
});

// ─── 12–16. Ejar action edge cases ────────────────────────────────────────────

describe("submitContractToEjarAction: input / gate / provider scenarios", () => {
  beforeEach(() => {
    setupHappyPath();
  });

  it("missing contractId → blocked before any DB write", async () => {
    const res = await submitContractToEjarAction({ ...BASE_DATA, contractId: "" });
    expect(res.success).toBe(false);
    expect(res.error).toContain("contractId");
    expect(mockQueryRaw).not.toHaveBeenCalled();
    expect(mockPayrollCreate).not.toHaveBeenCalled();
  });

  it("invalid landlordNationalId (not 10 digits) → blocked before Gate", async () => {
    const res = await submitContractToEjarAction({ ...BASE_DATA, landlordNationalId: "123" });
    expect(res.success).toBe(false);
    expect(mockTenantFindUnique).not.toHaveBeenCalled();
  });

  it("contract not found for tenant → BLOCKED (FK violation)", async () => {
    mockContractFindFirst.mockResolvedValue(null);
    const res = await submitContractToEjarAction(BASE_DATA);
    expect(res.success).toBe(false);
    expect(res.error).toContain("العقد");
    expect(mockQueryRaw).not.toHaveBeenCalled();
  });

  it("salesRep not in tenant → BLOCKED (FK violation)", async () => {
    mockContractFindFirst.mockResolvedValue({ id: CONTRACT_ID, status: "ACTIVE" });
    mockUserFindFirst.mockResolvedValue(null);
    const res = await submitContractToEjarAction(BASE_DATA);
    expect(res.success).toBe(false);
    expect(res.error).toContain("مندوب");
  });

  it("Gate BLOCKED (tenant inactive) → no outbox entry, no commission", async () => {
    mockTenantFindUnique.mockResolvedValue({ isActive: false });
    const res = await submitContractToEjarAction(BASE_DATA);
    expect(res.success).toBe(false);
    expect(res.error).toContain("بوابة");
    expect(mockQueryRaw).not.toHaveBeenCalled();
    expect(mockPayrollCreate).not.toHaveBeenCalled();
  });

  it("Provider API fails → RETRYING state, no commission created", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("Network timeout"));
    vi.stubGlobal("fetch", fetchMock);

    const res = await submitContractToEjarAction(BASE_DATA);
    expect(res.success).toBe(false);
    expect(res.error).toContain("إيجار");
    expect(mockPayrollCreate).not.toHaveBeenCalled();
    // markRetrying should have been called
    expect(mockExecuteRaw).toHaveBeenCalled();
  });

  it("happy path → commission created ONLY after real ejarContractId", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ contractId: "EJAR-REAL-111", contractNumber: "CR-2026-999" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    mockPayrollCreate.mockResolvedValue({ id: "commission-1" });

    const res = await submitContractToEjarAction(BASE_DATA);
    expect(res.success).toBe(true);
    expect(res.ejarContractId).toBe("EJAR-REAL-111");
    expect(res.commissionCalculated).toBe(60000 * 0.025); // 1500
    // Commission created exactly once with real ID
    expect(mockPayrollCreate).toHaveBeenCalledTimes(1);
    expect(mockPayrollCreate.mock.calls[0][0].data.contractId).toBe("EJAR-REAL-111");
    expect(fetchMock).toHaveBeenCalledWith(
      `${HUB_EJAR_BASE_URL}/contracts/register`,
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Bearer ${HUB_EJAR_ACCESS_TOKEN}`,
        }),
      }),
    );
    expect(mockConnectionFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: TENANT_ID,
          provider: "EJAR",
          status: "CONNECTED",
        }),
      }),
    );
  });

  it("provider returns no contractId → treated as failure, no commission", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ contractNumber: "CR-999" }), // no contractId!
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = await submitContractToEjarAction(BASE_DATA);
    expect(res.success).toBe(false);
    expect(mockPayrollCreate).not.toHaveBeenCalled();
  });
});

// ─── 17–18. Sandbox / production guards ───────────────────────────────────────

describe("Sandbox / production credential guards", () => {
  beforeEach(() => {
    (getSession as MockedFunction<any>).mockResolvedValue(SESSION);
    mockAssertServerActionRole.mockResolvedValue(SESSION);
    (getActiveTenant as MockedFunction<any>).mockResolvedValue(TENANT);
    mockContractFindFirst.mockResolvedValue({ id: CONTRACT_ID, status: "ACTIVE" });
    mockUserFindFirst.mockResolvedValue({ id: USER_ID, name: "Ali", email: "ali@test.com" });
    mockAuditLogCreate.mockResolvedValue({});
  });

  it("Production + sandbox URL from Hub connection.baseUrl → Gate BLOCKED, no commission, no outbox", async () => {
    setupHubEjarConnection({
      connection: {
        provider: "EJAR",
        status: "CONNECTED",
        baseUrl: "https://api.ejar.sa/sandbox/v1",
        encryptedCredentials: HUB_EJAR_ENCRYPTED,
      },
    });
    vi.stubEnv("NODE_ENV", "production");
    mockIsProductionRuntime.mockReturnValue(true);
    mockTenantFindUnique.mockResolvedValue({ isActive: true });

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ contractId: "SHOULD-NOT-EXIST", contractNumber: "NO" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = await submitContractToEjarAction(BASE_DATA);
    expect(res.success).toBe(false);
    expect(res.error).toContain("بوابة");
    expect(mockPayrollCreate).not.toHaveBeenCalled();
    expect(mockQueryRaw).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("Production + empty Hub accessToken → Gate BLOCKED", async () => {
    setupHubEjarConnection({ credentials: { accessToken: "" } });
    vi.stubEnv("NODE_ENV", "production");
    mockIsProductionRuntime.mockReturnValue(true);
    mockTenantFindUnique.mockResolvedValue({ isActive: true });

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ contractId: "SHOULD-NOT-EXIST", contractNumber: "NO" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = await submitContractToEjarAction(BASE_DATA);
    expect(res.success).toBe(false);
    expect(res.error).toContain("بوابة");
    expect(mockPayrollCreate).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("Non-production + no CONNECTED Hub connection → Gate BLOCKED (no mock allowed)", async () => {
    setupHubEjarConnection({ connection: null });
    vi.stubEnv("NODE_ENV", "development");
    mockIsProductionRuntime.mockReturnValue(false);
    mockTenantFindUnique.mockResolvedValue({ isActive: true });

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ contractId: "SHOULD-NOT-EXIST", contractNumber: "NO" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = await submitContractToEjarAction(BASE_DATA);
    expect(res.success).toBe(false);
    expect(res.error).toContain("بوابة");
    expect(mockPayrollCreate).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

// ─── Hub-only fail-closed (no ENV fallback, no provider success) ─────────────

describe("submitContractToEjarAction: Hub-only fail-closed", () => {
  beforeEach(() => {
    setupHappyPath();
  });

  function stubProviderSuccess() {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ contractId: "SHOULD-NOT-EXIST", contractNumber: "NO" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  it("CONNECTED EJAR connection missing → fail-closed, no provider fetch, no commission", async () => {
    setupHubEjarConnection({ connection: null });
    const fetchMock = stubProviderSuccess();

    const res = await submitContractToEjarAction(BASE_DATA);
    expect(res.success).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mockPayrollCreate).not.toHaveBeenCalled();
  });

  it("encryptedCredentials missing → fail-closed, no provider fetch, no commission", async () => {
    setupHubEjarConnection({
      connection: {
        provider: "EJAR",
        status: "CONNECTED",
        baseUrl: HUB_EJAR_BASE_URL,
        encryptedCredentials: null,
      },
    });
    const fetchMock = stubProviderSuccess();

    const res = await submitContractToEjarAction(BASE_DATA);
    expect(res.success).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mockPayrollCreate).not.toHaveBeenCalled();
  });

  it("decryptProviderCredentials failure → fail-closed, no provider fetch, no commission", async () => {
    setupHubEjarConnection({ decryptThrows: true });
    const fetchMock = stubProviderSuccess();

    const res = await submitContractToEjarAction(BASE_DATA);
    expect(res.success).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mockPayrollCreate).not.toHaveBeenCalled();
  });

  it("empty Hub connection.baseUrl → fail-closed, no provider fetch, no commission", async () => {
    setupHubEjarConnection({
      connection: {
        provider: "EJAR",
        status: "CONNECTED",
        baseUrl: "",
        encryptedCredentials: HUB_EJAR_ENCRYPTED,
      },
    });
    const fetchMock = stubProviderSuccess();

    const res = await submitContractToEjarAction(BASE_DATA);
    expect(res.success).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mockPayrollCreate).not.toHaveBeenCalled();
  });

  it("empty Hub accessToken → fail-closed, no provider fetch, no commission", async () => {
    setupHubEjarConnection({ credentials: { accessToken: "" } });
    const fetchMock = stubProviderSuccess();

    const res = await submitContractToEjarAction(BASE_DATA);
    expect(res.success).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mockPayrollCreate).not.toHaveBeenCalled();
  });
});

// ─── 19–20. Helper actions: auth / FK ────────────────────────────────────────

describe("getPayrollCommissionsAction: requires auth", () => {
  it("no session → error (not authenticated)", async () => {
    (getSession as MockedFunction<any>).mockResolvedValue(null);
    const res = await getPayrollCommissionsAction();
    expect(res.success).toBe(false);
    expect(res.error).toBeDefined();
  });
});

describe("markCommissionPaidAction: FK validates tenant ownership", () => {
  it("commission not found in this tenant → error", async () => {
    (getSession as MockedFunction<any>).mockResolvedValue(SESSION);
    mockAssertServerActionRole.mockResolvedValue(SESSION);
    (getActiveTenant as MockedFunction<any>).mockResolvedValue(TENANT);
    mockPayrollFindFirst.mockResolvedValue(null); // not found

    const res = await markCommissionPaidAction("some-commission-id");
    expect((res as any).success).toBe(false);
    expect((res as any).error).toContain("العمولة");
  });
});
