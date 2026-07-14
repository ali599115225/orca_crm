import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  whatsAppContact: {
    findMany: vi.fn(),
  },
  whatsAppMessage: {
    findMany: vi.fn(),
  },
  lead: {
    findFirst: vi.fn(),
  },
}));

const getActiveTenantMock = vi.hoisted(() => vi.fn());
const getConnectionStatusMock = vi.hoisted(() => vi.fn());
const resolveConnectionMock = vi.hoisted(() => vi.fn());
const isMessagingEnabledMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/tenant", () => ({
  getActiveTenant: getActiveTenantMock,
}));

vi.mock("@/lib/whatsapp/connection-resolver", () => ({
  getConnectionStatus: getConnectionStatusMock,
  resolveConnection: resolveConnectionMock,
  isMessagingEnabled: isMessagingEnabledMock,
}));

vi.mock("@/lib/whatsapp/send-service", () => ({
  sendWhatsAppMessage: vi.fn(),
  WhatsAppSendError: class WhatsAppSendError extends Error {},
}));

vi.mock("@/app/actions/whatsapp-crm", () => ({
  logWhatsAppActivity: vi.fn(),
}));

vi.mock("@/lib/plan-guard", () => ({
  assertFeatureAccess: vi.fn(),
  PlanLimitError: class PlanLimitError extends Error {},
  logPlanBlockedAttempt: vi.fn(),
}));

vi.mock("@/lib/privacy-mask", () => ({
  hashPhone: vi.fn(() => "phone-hash"),
  redactPiiFromPayload: vi.fn((value: unknown) => value),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import {
  getCloudAPIStatusAction,
  getWhatsAppChatsAction,
} from "@/app/actions/whatsapp";

const TEST_TENANT = { id: "orca-test-tenant", companyName: "Test Co" };
const OTHER_TENANT = { id: "tenant-other", companyName: "Other Co" };

describe("WhatsApp actions — connection status and chat list", () => {
  beforeEach(() => {
    prismaMock.whatsAppContact.findMany.mockResolvedValue([]);
    prismaMock.whatsAppMessage.findMany.mockResolvedValue([]);
    prismaMock.lead.findFirst.mockResolvedValue(null);
  });

  it("reports test-mode status from the resolver without leaking credentials", async () => {
    getActiveTenantMock.mockResolvedValue(TEST_TENANT);
    getConnectionStatusMock.mockResolvedValue({
      configured: true,
      source: "orca-test-bridge",
      status: "test-mode",
      wabaId: "bridge-waba",
      phoneNumberId: "bridge-phone",
    });

    const result = await getCloudAPIStatusAction();

    expect(result).toMatchObject({
      configured: true,
      provider: "meta",
      source: "orca-test-bridge",
      status: "test-mode",
    });
    expect(result).not.toHaveProperty("accessToken");
  });

  it("reports disconnected when no source resolves", async () => {
    getActiveTenantMock.mockResolvedValue(OTHER_TENANT);
    getConnectionStatusMock.mockResolvedValue({
      configured: false,
      source: "none",
      status: "disconnected",
    });

    const result = await getCloudAPIStatusAction();

    expect(result).toMatchObject({
      configured: false,
      status: "disconnected",
    });
  });

  it("returns the test tenant's chats when the test bridge is valid", async () => {
    getActiveTenantMock.mockResolvedValue(TEST_TENANT);
    getConnectionStatusMock.mockResolvedValue({
      configured: true,
      source: "orca-test-bridge",
      status: "test-mode",
    });
    prismaMock.whatsAppContact.findMany.mockResolvedValue([
      {
        id: "contact-1",
        name: null,
        phone: "966500000001",
        leadId: null,
        lastMessageAt: new Date(),
        assignedUserId: null,
        assignedUserName: null,
        archived: false,
      },
    ]);

    const result = await getWhatsAppChatsAction();

    expect(result.success).toBe(true);
    expect(result.chats).toHaveLength(1);
    expect(prismaMock.whatsAppContact.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: TEST_TENANT.id, archived: false },
      }),
    );
  });

  it("keeps tenant history available with a warning when no provider is connected", async () => {
    getActiveTenantMock.mockResolvedValue(OTHER_TENANT);
    getConnectionStatusMock.mockResolvedValue({
      configured: false,
      provider: "none",
      source: "none",
      status: "disconnected",
    });

    const result = await getWhatsAppChatsAction();

    expect(result).toMatchObject({
      success: true,
      chats: [],
      provider: "none",
    });
    expect(result.warning).toBeTruthy();
    expect(prismaMock.whatsAppContact.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: OTHER_TENANT.id, archived: false },
      }),
    );
  });

  it("never queries another tenant's contacts under the test bridge", async () => {
    getActiveTenantMock.mockResolvedValue(TEST_TENANT);
    getConnectionStatusMock.mockResolvedValue({
      configured: true,
      source: "orca-test-bridge",
      status: "test-mode",
    });

    await getWhatsAppChatsAction();

    const calledWhere = prismaMock.whatsAppContact.findMany.mock.calls[0]?.[0]?.where;
    expect(calledWhere.tenantId).toBe(TEST_TENANT.id);
    expect(calledWhere.tenantId).not.toBe(OTHER_TENANT.id);
  });
});
