import { beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";

vi.mock("server-only", () => ({}));

const {
  mockSession,
  mockWriteAuditLog,
  mockSendEmail,
  mockSendSMS,
  mockSendWhatsApp,
  prismaMock,
} = vi.hoisted(() => {
  const mockSession = vi.fn();
  const mockWriteAuditLog = vi.fn();
  const mockSendEmail = vi.fn();
  const mockSendSMS = vi.fn();
  const mockSendWhatsApp = vi.fn();
  const prismaMock = {
    ticket: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    auditLog: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  };
  return {
    mockSession,
    mockWriteAuditLog,
    mockSendEmail,
    mockSendSMS,
    mockSendWhatsApp,
    prismaMock,
  };
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
vi.mock("@/lib/email", () => ({
  sendEmail: (...args: any[]) => mockSendEmail(...args),
}));
vi.mock("@/lib/notifications", () => ({
  sendSMSNotification: (...args: any[]) => mockSendSMS(...args),
  sendWhatsAppNotification: (...args: any[]) => mockSendWhatsApp(...args),
}));
vi.mock("@/lib/tenant-context", () => ({
  runWithTenantContext: (_ctx: any, operation: () => unknown) => operation(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { createTicketAction, closeTicketAction } from "@/app/actions/helpdesk";

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
  prismaMock.ticket.update.mockResolvedValue({
    id: "ticket-1",
    title: "استفسار",
    description: "أحتاج إلى مساعدة فنية",
    status: "CLOSED",
    aiResponse: null,
    createdAt: new Date("2026-07-13T00:00:00.000Z"),
    updatedAt: new Date("2026-07-13T00:00:00.000Z"),
  });
  prismaMock.auditLog.findFirst.mockResolvedValue({
    details: JSON.stringify({
      channel: "EMAIL",
      email: "customer@example.com",
      phone: "0500000000",
    }),
  });
  prismaMock.auditLog.create.mockResolvedValue({ id: "audit-1" });
  mockWriteAuditLog.mockResolvedValue(undefined);
  mockSendEmail.mockResolvedValue({ success: true });
  mockSendSMS.mockResolvedValue({ success: true });
  mockSendWhatsApp.mockResolvedValue({ success: true });
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

  it("persists customer destination on TICKET_CREATED", async () => {
    const formData = new FormData();
    formData.set("title", "استفسار");
    formData.set("description", "أحتاج إلى مساعدة فنية");
    formData.set("email", "customer@example.com");
    formData.set("phone", "0500000000");
    formData.set("channel", "EMAIL");

    const result = await createTicketAction(formData);
    expect(result.success).toBe(true);
    expect(mockWriteAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "TICKET_CREATED",
        details: JSON.stringify({
          title: "استفسار",
          email: "customer@example.com",
          phone: "0500000000",
          channel: "EMAIL",
        }),
      }),
    );
  });

  it("close invokes channel send when destination exists", async () => {
    const result = await closeTicketAction("ticket-1");
    expect(result.success).toBe(true);
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "tenant-1",
        to: "customer@example.com",
      }),
    );
  });

  it("close fails closed when destination is missing", async () => {
    prismaMock.auditLog.findFirst.mockResolvedValue({ details: "{}" });
    const result = await closeTicketAction("ticket-1");
    expect(result.success).toBe(false);
    expect(String((result as { error?: string }).error)).toContain("وجهة العميل");
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("returns channel config error instead of silent success", async () => {
    mockSendEmail.mockResolvedValue({
      success: false,
      code: "EMAIL_PROVIDER_NOT_CONFIGURED",
    });
    const result = await closeTicketAction("ticket-1");
    expect(result.success).toBe(false);
    expect(String((result as { error?: string }).error)).toContain(
      "EMAIL_PROVIDER_NOT_CONFIGURED",
    );
  });
});

describe("helpdesk destination UI", () => {
  it("collects destination fields and posts them on create", () => {
    const view = fs.readFileSync("components/views/HelpdeskView.tsx", "utf8");
    expect(view).toContain('formData.append("email", newEmail.trim())');
    expect(view).toContain('formData.append("phone", newPhone.trim())');
    expect(view).toContain('formData.append("channel", newChannel)');
  });
});
