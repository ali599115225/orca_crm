import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const prismaMock = vi.hoisted(() => ({
  tenant: {
    findUnique: vi.fn(),
  },
  whatsAppPlatformSettings: {
    findUnique: vi.fn(),
  },
  whatsAppConnection: {
    findUnique: vi.fn(),
  },
  whatsAppCredential: {
    findFirst: vi.fn(),
  },
  whatsAppPhoneNumber: {
    findFirst: vi.fn(),
  },
}));

const decryptTokenMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/whatsapp/credential-service", () => ({
  decryptToken: decryptTokenMock,
}));

import {
  getWhatsAppControls,
  resolveConnection,
} from "@/lib/whatsapp/connection-resolver";

describe("WhatsApp connection resolver", () => {
  beforeEach(() => {
    prismaMock.tenant.findUnique.mockResolvedValue({
      isActive: true,
      messagingDisabled: false,
      automationDisabled: false,
    });
    prismaMock.whatsAppPlatformSettings.findUnique.mockResolvedValue({
      whatsappMessagingDisabled: false,
      whatsappAutomationDisabled: false,
    });
    prismaMock.whatsAppConnection.findUnique.mockResolvedValue(null);
    prismaMock.whatsAppCredential.findFirst.mockResolvedValue(null);
    prismaMock.whatsAppPhoneNumber.findFirst.mockResolvedValue(null);
    decryptTokenMock.mockReturnValue("decrypted-token");

    delete process.env.ORCA_WHATSAPP_TEST_TENANT_ID;
    delete process.env.WHATSAPP_ACCESS_TOKEN;
    delete process.env.WHATSAPP_PHONE_NUMBER_ID;
    delete process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
  });

  afterEach(() => {
    delete process.env.ORCA_WHATSAPP_TEST_TENANT_ID;
    delete process.env.WHATSAPP_ACCESS_TOKEN;
    delete process.env.WHATSAPP_PHONE_NUMBER_ID;
    delete process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
  });

  it("resolves an active tenant-owned connection", async () => {
    prismaMock.whatsAppConnection.findUnique.mockResolvedValue({
      id: "connection-1",
      tenantId: "tenant-1",
      status: "ACTIVE",
      wabaId: "waba-1",
    });
    prismaMock.whatsAppCredential.findFirst.mockResolvedValue({
      id: "credential-1",
      encryptedValue: "aa",
      iv: "bb",
      authTag: "cc",
      algorithm: "AES-256-GCM",
      keyVersion: 1,
    });
    prismaMock.whatsAppPhoneNumber.findFirst.mockResolvedValue({
      phoneNumberId: "phone-number-1",
      wabaId: "waba-1",
    });

    await expect(resolveConnection("tenant-1")).resolves.toEqual({
      source: "tenant-connection",
      tenantId: "tenant-1",
      connectionId: "connection-1",
      phoneNumberId: "phone-number-1",
      wabaId: "waba-1",
      accessToken: "decrypted-token",
    });
  });

  it("allows the ORCA bridge only for the exact test tenant", async () => {
    process.env.ORCA_WHATSAPP_TEST_TENANT_ID = "orca-test-tenant";
    process.env.WHATSAPP_ACCESS_TOKEN = "bridge-token";
    process.env.WHATSAPP_PHONE_NUMBER_ID = "bridge-phone";
    process.env.WHATSAPP_BUSINESS_ACCOUNT_ID = "bridge-waba";

    await expect(
      resolveConnection("orca-test-tenant"),
    ).resolves.toMatchObject({
      source: "orca-test-bridge",
      tenantId: "orca-test-tenant",
      phoneNumberId: "bridge-phone",
      wabaId: "bridge-waba",
    });

    await expect(
      resolveConnection("customer-tenant"),
    ).rejects.toMatchObject({
      code: "WHATSAPP_NOT_CONNECTED",
    });
  });

  it("fails closed when platform messaging is disabled", async () => {
    prismaMock.whatsAppPlatformSettings.findUnique.mockResolvedValue({
      whatsappMessagingDisabled: true,
      whatsappAutomationDisabled: false,
    });

    await expect(
      resolveConnection("tenant-1"),
    ).rejects.toMatchObject({
      code: "WHATSAPP_MESSAGING_DISABLED",
    });
  });

  it("separates messaging and automation kill switches", async () => {
    prismaMock.tenant.findUnique.mockResolvedValue({
      isActive: true,
      messagingDisabled: false,
      automationDisabled: true,
    });

    await expect(
      getWhatsAppControls("tenant-1"),
    ).resolves.toMatchObject({
      messagingEnabled: true,
      automationEnabled: false,
    });
  });
});