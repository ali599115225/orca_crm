import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { getSessionMock, prismaMock } = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  prismaMock: {
    user: { findFirst: vi.fn() },
    tenant: { findFirst: vi.fn() },
  },
}));

vi.mock("@/lib/session", () => ({ getSession: () => getSessionMock() }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import {
  requireWhatsAppAccess,
  WHATSAPP_CONNECTION_ROLES,
  WHATSAPP_READ_ROLES,
  WHATSAPP_WRITE_ROLES,
} from "@/lib/whatsapp/access";
import { getTenantContext } from "@/lib/tenant-context";

beforeEach(() => {
  vi.clearAllMocks();
  getSessionMock.mockResolvedValue({
    tenantId: "tenant-1",
    userId: "user-1",
    role: "ADMIN",
  });
  prismaMock.user.findFirst.mockResolvedValue({ id: "user-1", role: "ADMIN" });
  prismaMock.tenant.findFirst.mockResolvedValue({ id: "tenant-1" });
});

describe("WhatsApp database-backed access boundary", () => {
  it("rejects a missing session before database access", async () => {
    getSessionMock.mockResolvedValue(null);

    await expect(requireWhatsAppAccess(WHATSAPP_READ_ROLES)).rejects.toThrow(
      "UNAUTHORIZED",
    );
    expect(prismaMock.user.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.tenant.findFirst).not.toHaveBeenCalled();
  });

  it("requires an active user in the same company scope", async () => {
    prismaMock.user.findFirst.mockResolvedValue(null);

    await expect(requireWhatsAppAccess(WHATSAPP_READ_ROLES)).rejects.toThrow(
      "FORBIDDEN",
    );
    expect(prismaMock.user.findFirst).toHaveBeenCalledWith({
      where: { id: "user-1", tenantId: "tenant-1", isActive: true },
      select: { id: true, role: true },
    });
  });

  it("requires an active company scope", async () => {
    prismaMock.tenant.findFirst.mockResolvedValue(null);

    await expect(requireWhatsAppAccess(WHATSAPP_READ_ROLES)).rejects.toThrow(
      "FORBIDDEN",
    );
  });

  it("uses the database role instead of a stale JWT role", async () => {
    getSessionMock.mockResolvedValue({
      tenantId: "tenant-1",
      userId: "user-1",
      role: "ADMIN",
    });
    prismaMock.user.findFirst.mockResolvedValue({
      id: "user-1",
      role: "READ_ONLY",
    });

    await expect(requireWhatsAppAccess(WHATSAPP_WRITE_ROLES)).rejects.toThrow(
      "FORBIDDEN",
    );
  });

  it("allows READ_ONLY to use read boundaries but not write boundaries", async () => {
    prismaMock.user.findFirst.mockResolvedValue({
      id: "user-1",
      role: "READ_ONLY",
    });

    await expect(requireWhatsAppAccess(WHATSAPP_READ_ROLES)).resolves.toMatchObject({
      role: "READ_ONLY",
    });
    await expect(requireWhatsAppAccess(WHATSAPP_WRITE_ROLES)).rejects.toThrow(
      "FORBIDDEN",
    );
  });

  it("allows SALES_EMPLOYEE writes but denies connection management", async () => {
    prismaMock.user.findFirst.mockResolvedValue({
      id: "user-1",
      role: "SALES_EMPLOYEE",
    });

    await expect(requireWhatsAppAccess(WHATSAPP_WRITE_ROLES)).resolves.toMatchObject({
      role: "SALES_EMPLOYEE",
    });
    await expect(
      requireWhatsAppAccess(WHATSAPP_CONNECTION_ROLES),
    ).rejects.toThrow("FORBIDDEN");
  });

  it("limits connection management to database ADMIN", async () => {
    prismaMock.user.findFirst.mockResolvedValue({
      id: "user-1",
      role: "SALES_MANAGER",
    });

    await expect(
      requireWhatsAppAccess(WHATSAPP_CONNECTION_ROLES),
    ).rejects.toThrow("FORBIDDEN");
  });

  it("returns immutable database-verified access", async () => {
    const access = await requireWhatsAppAccess(WHATSAPP_WRITE_ROLES);

    expect(access).toEqual({
      tenantId: "tenant-1",
      userId: "user-1",
      role: "ADMIN",
    });
    expect(Object.isFrozen(access)).toBe(true);
    expect(getTenantContext()).toBeNull();
  });

  it("allows a database ADMIN to manage the connection", async () => {
    await expect(
      requireWhatsAppAccess(WHATSAPP_CONNECTION_ROLES),
    ).resolves.toMatchObject({ role: "ADMIN" });
  });
});
