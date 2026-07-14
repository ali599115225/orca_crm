import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const {
  mockSession,
  mockWriteAuditLog,
  prismaMock,
} = vi.hoisted(() => {
  const mockSession = vi.fn();
  const mockWriteAuditLog = vi.fn();
  const prismaMock = {
    ticket: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
  };
  return { mockSession, mockWriteAuditLog, prismaMock };
});

vi.mock("@/lib/session", () => ({ getSession: () => mockSession() }));
vi.mock("@/lib/api-auth-guard", () => ({
  TENANT_ROLES: ["ADMIN", "SALES_MANAGER", "SALES_EMPLOYEE", "MARKETING", "READ_ONLY"],
  assertServerActionRole: vi.fn(async (session: any) => session),
}));
vi.mock("@/lib/audit", () => ({
  writeAuditLog: (...args: any[]) => mockWriteAuditLog(...args),
}));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/tenant-context", () => ({
  runWithTenantContext: (_ctx: any, operation: () => unknown) => operation(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { createTicketAction } from "@/app/actions/helpdesk";

const SESSION = {
  userId: "user-1",
  tenantId: "tenant-1",
  role: "ADMIN",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockSession.mockResolvedValue(SESSION);
  prismaMock.ticket.create.mockResolvedValue({
    id: "ticket-1",
    title: "استفسار",
    description: "أحتاج إلى مساعدة فنية",
    status: "OPEN",
    aiResponse: null,
    createdAt: new Date("2026-07-13T00:00:00.000Z"),
    updatedAt: new Date("2026-07-13T00:00:00.000Z"),
  });
  mockWriteAuditLog.mockResolvedValue(undefined);
});

describe("helpdesk ticket creation", () => {
  it("creates a real open ticket without fabricating an AI response", async () => {
    const formData = new FormData();
    formData.set("title", "استفسار");
    formData.set("description", "أحتاج إلى مساعدة فنية");

    const result = await createTicketAction(formData);

    expect(result.success).toBe(true);
    if (!result.success) {
      throw new Error(result.error);
    }
    expect(result.ticket.aiResponse).toBeNull();
    expect(prismaMock.ticket.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: "tenant-1",
        status: "OPEN",
        aiResponse: null,
      }),
    });
  });

  it("does not claim payment, DNS, escalation, or provider success", async () => {
    const formData = new FormData();
    formData.set("title", "مشكلة في الاشتراك");
    formData.set("description", "أريد ترقية باقة وربط نطاق والدفع");

    const result = await createTicketAction(formData);
    expect(result.success).toBe(true);
    if (!result.success) {
      throw new Error(result.error);
    }
    const response = result.ticket.aiResponse || "";

    expect(response).toBe("");
    expect(response).not.toContain("مدى");
    expect(response).not.toContain("فيزا");
    expect(response).not.toContain("STC Pay");
    expect(response).not.toContain("cname.vercel-dns.com");
    expect(response).not.toContain("تم إرسال تنبيه");
  });
});
