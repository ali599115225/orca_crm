import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// ── المراقبات يجب تعريفها داخل factory لتجنب hoisting error ──────────────────
vi.mock("@/lib/prisma", () => {
  const executeRawMock = vi.fn();
  const findManyMock = vi.fn();
  return {
    rawPrisma: {
      tenant: { findMany: findManyMock },
      revenueModelVersion: { findFirst: vi.fn() },
      revenueDomainEvent: { findFirst: vi.fn() },
      revenueOutboxMessage: { findMany: vi.fn().mockResolvedValue([]) },
      $executeRaw: executeRawMock,
    },
  };
});

vi.mock("@/lib/revenue-integrity/radar", () => ({
  evaluateRevenueLeakRadar: vi.fn().mockResolvedValue({ detected: 0, resolved: 0 }),
}));

vi.mock("@/lib/revenue-integrity/events", () => ({
  processRevenueOutbox: vi.fn().mockResolvedValue({ delivered: 0, retry: 0, deadLetter: 0 }),
}));

vi.mock("@/lib/revenue-integrity/predictive", () => ({
  trainPredictiveModel: vi.fn(),
  scoreOpenOpportunities: vi.fn(),
}));

// ── استيراد المسار بعد إعداد جميع المراقبات ─────────────────────────────────
import { GET } from "@/app/api/cron/revenue-integrity/route";
import { rawPrisma } from "@/lib/prisma";
import { trainPredictiveModel, scoreOpenOpportunities } from "@/lib/revenue-integrity/predictive";

// ── ثوابت ───────────────────────────────────────────────────────────────────
const TENANT_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const TENANT_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const MODEL_A = "cccccccc-cccc-cccc-cccc-cccccccccccc";
const MODEL_B = "dddddddd-dddd-dddd-dddd-dddddddddddd";
const SECRET = "test-cron-secret-xyz";

// ── مساعد بناء الطلب ─────────────────────────────────────────────────────────
function makeRequest(token?: string): NextRequest {
  return new NextRequest("http://localhost/api/cron/revenue-integrity", {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
}

// ── الإعداد المشترك ──────────────────────────────────────────────────────────
beforeEach(() => {
  vi.stubEnv("CRON_SECRET", SECRET);

  // مستأجر واحد افتراضي
  vi.mocked(rawPrisma.tenant.findMany).mockResolvedValue([{ id: TENANT_A }] as any);

  // لا يوجد تدريب سابق → يجب تشغيل التدريب
  vi.mocked(rawPrisma.revenueDomainEvent.findFirst).mockResolvedValue(null);
  vi.mocked(rawPrisma.revenueModelVersion.findFirst).mockResolvedValue(null);

  vi.mocked(trainPredictiveModel).mockResolvedValue({
    id: MODEL_A,
    version: 1,
    status: "ACTIVE",
  } as any);
  vi.mocked(scoreOpenOpportunities).mockResolvedValue({ scored: 5, status: "ACTIVE" } as any);

  vi.mocked(rawPrisma.$executeRaw).mockResolvedValue(1 as any);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

// ────────────────────────────────────────────────────────────────────────────
describe("cron-metadata-integrity", () => {

  // TC-1: الحقول الموجودة تبقى — التحقق أن الـ JSON المدمج يحتوي weeklyBucket فقط
  it("TC-1: passes weeklyBucket as merged JSON — not a full metadata replacement", async () => {
    await GET(makeRequest(SECRET));

    expect(rawPrisma.$executeRaw).toHaveBeenCalledOnce();

    const callArgs = vi.mocked(rawPrisma.$executeRaw).mock.calls[0] as unknown[];
    // callArgs[0] = TemplateStringsArray, callArgs[1..n] = المعاملات المُقيَّدة
    const boundValues = callArgs.slice(1) as unknown[];

    // يجب أن تحتوي إحدى القيم على JSON يشتمل weeklyBucket وفقط weeklyBucket
    const jsonArg = boundValues.find(
      (v) => typeof v === "string" && v.includes("weeklyBucket"),
    ) as string | undefined;

    expect(jsonArg).toBeDefined();
    const parsed = JSON.parse(jsonArg!);
    expect(parsed).toHaveProperty("weeklyBucket");
    expect(Object.keys(parsed)).toEqual(["weeklyBucket"]);
  });

  // TC-2: عملية SQL تستخدم || (merge) وليس استبدال مباشر
  it("TC-2: SQL uses JSONB merge operator — existing weeklyBucket updated without deleting other fields", async () => {
    await GET(makeRequest(SECRET));

    const sqlTemplate = vi.mocked(rawPrisma.$executeRaw).mock.calls[0][0] as TemplateStringsArray;
    const sqlString = sqlTemplate.join("?");

    expect(sqlString).toMatch(/COALESCE\s*\(\s*metadata/i);
    expect(sqlString).toMatch(/\|\|/); // JSONB merge operator
  });

  // TC-3: COALESCE يتعامل مع metadata=null
  it("TC-3: COALESCE handles null metadata — becomes object with weeklyBucket", async () => {
    await GET(makeRequest(SECRET));

    const sqlTemplate = vi.mocked(rawPrisma.$executeRaw).mock.calls[0][0] as TemplateStringsArray;
    const sqlString = sqlTemplate.join("?");

    // يجب احتواء COALESCE(metadata, '{}'::jsonb)
    expect(sqlString).toMatch(/COALESCE\s*\(\s*metadata\s*,\s*'\{\}'/i);
  });

  // TC-4: عزل المستأجر — كل مستأجر يحصل على استدعاء منفصل بـ tenant_id خاص به
  it("TC-4: each tenant gets isolated $executeRaw call with its own tenant_id", async () => {
    vi.mocked(rawPrisma.tenant.findMany).mockResolvedValue([
      { id: TENANT_A },
      { id: TENANT_B },
    ] as any);
    vi.mocked(rawPrisma.revenueDomainEvent.findFirst).mockResolvedValue(null);
    vi.mocked(trainPredictiveModel)
      .mockResolvedValueOnce({ id: MODEL_A, version: 1, status: "ACTIVE" } as any)
      .mockResolvedValueOnce({ id: MODEL_B, version: 1, status: "ACTIVE" } as any);

    await GET(makeRequest(SECRET));

    expect(rawPrisma.$executeRaw).toHaveBeenCalledTimes(2);

    const calls = vi.mocked(rawPrisma.$executeRaw).mock.calls as unknown[][];
    const tenantIdsUsed = calls.map((callArgs) =>
      (callArgs.slice(1) as unknown[]).find(
        (v) => v === TENANT_A || v === TENANT_B,
      ),
    );

    expect(tenantIdsUsed).toContain(TENANT_A);
    expect(tenantIdsUsed).toContain(TENANT_B);
    // لا يجب أن يكون الاستدعاءان لنفس المستأجر
    expect(tenantIdsUsed[0]).not.toEqual(tenantIdsUsed[1]);
  });

  // TC-5: شرط WHERE يُقيِّد aggregateType و aggregateId — الأحداث الأخرى لا تُمس
  it("TC-5: WHERE clause binds aggregateType=RevenueModelVersion and aggregateId — non-matching events unaffected", async () => {
    await GET(makeRequest(SECRET));

    const callArgs = vi.mocked(rawPrisma.$executeRaw).mock.calls[0] as unknown[];
    const boundValues = callArgs.slice(1) as unknown[];

    expect(boundValues).toContain("RevenueModelVersion");
    expect(boundValues).toContain(MODEL_A);

    const sqlTemplate = callArgs[0] as TemplateStringsArray;
    const sqlString = sqlTemplate.join("?");
    expect(sqlString).toMatch(/aggregate_type\s*=/i);
    expect(sqlString).toMatch(/aggregate_id\s*=/i);
  });

  // TC-6: الطلبات غير المصرح بها تُرفض — المصادقة لم تتغير
  it("TC-6: unauthorized requests are rejected — cron authentication unchanged", async () => {
    // طلب بدون token
    const missingToken = await GET(makeRequest());
    expect(missingToken.status).toBe(401);
    const bodyMissing = await missingToken.json();
    expect(bodyMissing).toMatchObject({ ok: false, error: "UNAUTHORIZED" });
    expect(rawPrisma.$executeRaw).not.toHaveBeenCalled();

    vi.clearAllMocks();
    vi.mocked(rawPrisma.$executeRaw).mockResolvedValue(0 as any);

    // طلب بـ token خاطئ
    const wrongToken = await GET(makeRequest("completely-wrong-secret"));
    expect(wrongToken.status).toBe(401);
    const bodyWrong = await wrongToken.json();
    expect(bodyWrong).toMatchObject({ ok: false, error: "UNAUTHORIZED" });
    expect(rawPrisma.$executeRaw).not.toHaveBeenCalled();
  });
});
