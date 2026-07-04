import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const {
  mockIsDedicatedCopy,
  prismaMock,
  mockSendEmail,
} = vi.hoisted(() => {
  const mockIsDedicatedCopy = vi.fn();
  const prismaMock = {
    $queryRaw: vi.fn().mockResolvedValue(undefined),
    ticket: { count: vi.fn() },
    tenant: { count: vi.fn(), findMany: vi.fn() },
  };
  const mockSendEmail = vi.fn().mockResolvedValue(undefined);
  return { mockIsDedicatedCopy, prismaMock, mockSendEmail };
});

vi.mock("@/lib/deployment-license", () => ({
  isDedicatedCopyDeployment: () => mockIsDedicatedCopy(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

vi.mock("@/lib/agents/access", () => ({
  requirePlatformOwnerAccess: vi.fn(),
}));

vi.mock("@/lib/email", () => ({
  sendAdminEmailAlert: (...args: any[]) => mockSendEmail(...args),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { saherTrackSystemErrorsAction } from "@/app/actions/errorAgent";

function setDedicatedCopy(isDedicated: boolean) {
  mockIsDedicatedCopy.mockReturnValue(isDedicated);
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.DATABASE_URL = "postgresql://user:pass@host/db?sslmode=verify-full";
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("saherTrackSystemErrorsAction — DEDICATED_COPY wording", () => {
  it("uses 'مراقبة الدعم الفني' in DEDICATED_COPY when open tickets exist", async () => {
    setDedicatedCopy(true);
    prismaMock.ticket.count.mockResolvedValue(3);
    prismaMock.tenant.count.mockResolvedValue(5);
    prismaMock.tenant.findMany.mockResolvedValue([]);

    const report = await saherTrackSystemErrorsAction();

    const ticketRec = report.recommendations.find((r) => r.includes("معالجة استفسارات العملاء"));
    expect(ticketRec).toBeDefined();
    expect(ticketRec).toContain("مراقبة الدعم الفني");
    expect(ticketRec).not.toContain("مراقبة الدعم والاشتراكات");
  });

  it("uses 'مراقبة الدعم والاشتراكات' in SAAS when open tickets exist", async () => {
    setDedicatedCopy(false);
    prismaMock.ticket.count.mockResolvedValue(3);
    prismaMock.tenant.count.mockResolvedValue(5);
    prismaMock.tenant.findMany.mockResolvedValue([]);

    const report = await saherTrackSystemErrorsAction();

    const ticketRec = report.recommendations.find((r) => r.includes("معالجة استفسارات العملاء"));
    expect(ticketRec).toBeDefined();
    expect(ticketRec).toContain("مراقبة الدعم والاشتراكات");
  });

  it("uses 'مراجعة تهيئة سعة الوكلاء التشغيلية' in DEDICATED_COPY for WhatsApp anomaly", async () => {
    setDedicatedCopy(true);
    prismaMock.ticket.count.mockResolvedValue(0);
    prismaMock.tenant.count.mockResolvedValue(5);
    prismaMock.tenant.findMany.mockResolvedValue([{ id: "t1" }]);

    const report = await saherTrackSystemErrorsAction();

    const waRec = report.recommendations.find((r) => r.includes("سعة الوكلاء"));
    expect(waRec).toBeDefined();
    expect(waRec).toContain("مراجعة تهيئة سعة الوكلاء التشغيلية");
    expect(waRec).not.toContain("ترقية باقة الوكلاء");
  });

  it("uses 'ترقية باقة الوكلاء' in SAAS for WhatsApp anomaly", async () => {
    setDedicatedCopy(false);
    prismaMock.ticket.count.mockResolvedValue(0);
    prismaMock.tenant.count.mockResolvedValue(5);
    prismaMock.tenant.findMany.mockResolvedValue([{ id: "t1" }]);

    const report = await saherTrackSystemErrorsAction();

    const waRec = report.recommendations.find((r) => r.includes("ترقية باقة الوكلاء"));
    expect(waRec).toBeDefined();
    expect(waRec).toContain("ترقية باقة الوكلاء");
  });

  it("uses 'حسابات المنشآت' in DEDICATED_COPY when anomaly check throws", async () => {
    setDedicatedCopy(true);
    prismaMock.ticket.count.mockResolvedValue(0);
    prismaMock.tenant.count.mockRejectedValue(new Error("DB error"));

    const report = await saherTrackSystemErrorsAction();

    const anomaly = report.anomalies.find((a) => a.includes("تعذر فحص"));
    expect(anomaly).toBeDefined();
    expect(anomaly).toContain("المنشآت");
    expect(anomaly).not.toContain("المشتركين");
  });

  it("uses 'حسابات المشتركين' in SAAS when anomaly check throws", async () => {
    setDedicatedCopy(false);
    prismaMock.ticket.count.mockResolvedValue(0);
    prismaMock.tenant.count.mockRejectedValue(new Error("DB error"));

    const report = await saherTrackSystemErrorsAction();

    const anomaly = report.anomalies.find((a) => a.includes("تعذر فحص"));
    expect(anomaly).toBeDefined();
    expect(anomaly).toContain("المشتركين");
  });
});
