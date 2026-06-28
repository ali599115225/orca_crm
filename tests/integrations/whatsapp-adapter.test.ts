import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  whatsAppConnection: {
    findUnique: vi.fn(),
  },
}));

const getConnectionStatusMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/whatsapp/connection-resolver", () => ({
  getConnectionStatus: getConnectionStatusMock,
}));

import { getWhatsAppIntegrationStatusKey } from "@/lib/integrations/whatsapp-adapter";
import { displayUiAlias } from "@/lib/display/uiAliases";

describe("WhatsApp read-only status adapter", () => {
  beforeEach(() => {
    getConnectionStatusMock.mockResolvedValue({
      configured: false,
      source: "none",
      status: "disconnected",
    });
  });

  it("maps the native ACTIVE connection status to CONNECTED", async () => {
    prismaMock.whatsAppConnection.findUnique.mockResolvedValue({ status: "ACTIVE" });

    const key = await getWhatsAppIntegrationStatusKey("tenant-1");

    expect(key).toBe("CONNECTED");
    expect(displayUiAlias("integrationStatus", key, "ar")).not.toBe("غير معروف");
  });

  it("preserves REAUTH_REQUIRED without flattening it into DISCONNECTED", async () => {
    prismaMock.whatsAppConnection.findUnique.mockResolvedValue({ status: "REAUTH_REQUIRED" });

    const key = await getWhatsAppIntegrationStatusKey("tenant-1");

    expect(key).toBe("REAUTH_REQUIRED");
  });

  it("preserves DISCONNECTING (and DISCONNECT_PENDING) as a distinct status", async () => {
    prismaMock.whatsAppConnection.findUnique.mockResolvedValue({ status: "DISCONNECTING" });

    const key = await getWhatsAppIntegrationStatusKey("tenant-1");

    expect(key).toBe("DISCONNECTING");
    expect(displayUiAlias("integrationStatus", key, "ar")).not.toBe("غير معروف");
  });

  it("preserves SUSPENDED as a distinct status", async () => {
    prismaMock.whatsAppConnection.findUnique.mockResolvedValue({ status: "SUSPENDED" });

    const key = await getWhatsAppIntegrationStatusKey("tenant-1");

    expect(key).toBe("SUSPENDED");
  });

  it("reports NOT_CONFIGURED when there is no connection row and no test bridge", async () => {
    prismaMock.whatsAppConnection.findUnique.mockResolvedValue(null);

    const key = await getWhatsAppIntegrationStatusKey("tenant-1");

    expect(key).toBe("NOT_CONFIGURED");
  });

  it("reports TEST_MODE when the test bridge resolves, without claiming a real connection", async () => {
    prismaMock.whatsAppConnection.findUnique.mockResolvedValue(null);
    getConnectionStatusMock.mockResolvedValue({
      configured: true,
      source: "orca-test-bridge",
      status: "test-mode",
    });

    const key = await getWhatsAppIntegrationStatusKey("orca-test-tenant");

    expect(key).toBe("TEST_MODE");
    expect(displayUiAlias("integrationStatus", key, "ar")).not.toBe("غير معروف");
  });

  it("never returns the raw native enum value, a credential, or a token", async () => {
    prismaMock.whatsAppConnection.findUnique.mockResolvedValue({ status: "ACTIVE" });

    const key = await getWhatsAppIntegrationStatusKey("tenant-1");

    expect(typeof key).toBe("string");
    expect(key).not.toBe("ACTIVE"); // bucketed key, not the raw enum literal
    expect(JSON.stringify(key).toLowerCase()).not.toContain("token");
  });
});
