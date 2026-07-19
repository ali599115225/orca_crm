import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireAccessMock, sendMock, featureMock, prismaMock } = vi.hoisted(
  () => ({
    requireAccessMock: vi.fn(),
    sendMock: vi.fn(),
    featureMock: vi.fn(),
    prismaMock: {
      whatsAppContact: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
      },
      whatsAppMessage: { findMany: vi.fn() },
      lead: { findFirst: vi.fn() },
      user: { findMany: vi.fn(), findFirst: vi.fn() },
      tenant: { findUnique: vi.fn(), update: vi.fn() },
    },
  }),
);

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/whatsapp/access", () => ({
  WHATSAPP_READ_ROLES: ["ADMIN", "READ_ONLY"],
  WHATSAPP_WRITE_ROLES: ["ADMIN"],
  WHATSAPP_CONNECTION_ROLES: ["ADMIN"],
  requireWhatsAppAccess: (...args: unknown[]) => requireAccessMock(...args),
}));
vi.mock("@/lib/whatsapp/send-service", () => ({
  sendWhatsAppMessage: (...args: unknown[]) => sendMock(...args),
}));
vi.mock("@/lib/whatsapp/connection-resolver", () => ({
  getConnectionStatus: vi.fn(),
}));
vi.mock("@/lib/plan-guard", () => ({
  assertFeatureAccess: (...args: unknown[]) => featureMock(...args),
  PlanLimitError: class PlanLimitError extends Error {},
  logPlanBlockedAttempt: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import {
  archiveChatAction,
  assignChatAction,
  sendWhatsAppMessageAction,
  toggleWhatsAppConnectionAction,
} from "@/app/actions/whatsapp";

beforeEach(() => {
  vi.clearAllMocks();
  requireAccessMock.mockRejectedValue(new Error("FORBIDDEN"));
});

describe("WhatsApp actions authorize before side effects", () => {
  it("does not validate features or call the provider when send access fails", async () => {
    const result = await sendWhatsAppMessageAction("966500000001", "test");

    expect(result.success).toBe(false);
    expect(featureMock).not.toHaveBeenCalled();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("does not mutate connection state when ADMIN access fails", async () => {
    await toggleWhatsAppConnectionAction(true);

    expect(featureMock).not.toHaveBeenCalled();
    expect(prismaMock.tenant.update).not.toHaveBeenCalled();
  });

  it("does not read or mutate chats when write access fails", async () => {
    await archiveChatAction("contact-1");
    await assignChatAction("contact-1", "user-2");

    expect(prismaMock.whatsAppContact.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.whatsAppContact.update).not.toHaveBeenCalled();
    expect(prismaMock.user.findFirst).not.toHaveBeenCalled();
  });
});
