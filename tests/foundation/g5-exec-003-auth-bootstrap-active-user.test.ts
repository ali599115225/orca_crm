import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const databaseState = vi.hoisted(() => ({
  userPresent: true,
  userActive: true,
  userId: "user-1",
  tenantId: "tenant-1",
  role: "ADMIN",
  tenantActive: true,
}));
const rawMocks = vi.hoisted(() => ({
  userFindFirst: vi.fn(),
  userFindUnique: vi.fn(),
  tenantFindFirst: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  rawPrisma: {
    user: {
      findFirst: rawMocks.userFindFirst,
      findUnique: rawMocks.userFindUnique,
    },
    tenant: { findFirst: rawMocks.tenantFindFirst },
  },
}));
vi.mock("@/lib/tenant-context", () => ({
  runWithTenantContext: vi.fn(
    async (_context: unknown, operation: () => unknown) => await operation(),
  ),
  setTenantContext: vi.fn(),
}));

import {
  authBootstrapFindTenantActive,
  authBootstrapFindUserRole,
} from "@/lib/system-prisma-boundary";
import { hasDatabaseRole } from "@/lib/api-auth-guard";

const SESSION = Object.freeze({
  userId: "user-1",
  tenantId: "tenant-1",
  role: "ADMIN",
});

beforeEach(() => {
  vi.clearAllMocks();
  databaseState.userPresent = true;
  databaseState.userActive = true;
  databaseState.userId = SESSION.userId;
  databaseState.tenantId = SESSION.tenantId;
  databaseState.role = "ADMIN";
  databaseState.tenantActive = true;

  rawMocks.userFindFirst.mockImplementation(
    async ({ where }: { where: Record<string, unknown> }) => {
      if (!databaseState.userPresent) return null;
      if (where.id !== databaseState.userId) return null;
      if (where.tenantId !== databaseState.tenantId) return null;
      if (where.isActive === true && !databaseState.userActive) return null;
      return { role: databaseState.role };
    },
  );
  rawMocks.userFindUnique.mockResolvedValue(null);
  rawMocks.tenantFindFirst.mockImplementation(
    async ({ where }: { where: Record<string, unknown> }) =>
      databaseState.tenantActive &&
      where.id === databaseState.tenantId &&
      where.isActive === true
        ? { id: databaseState.tenantId }
        : null,
  );
});

describe("EXEC-003 AUTH_BOOTSTRAP active-user boundary", () => {
  it("AUTH_BOOTSTRAP_ACTIVE_USER_FILTER queries the user with isActive true", async () => {
    await expect(
      authBootstrapFindUserRole(SESSION.userId, SESSION.tenantId),
    ).resolves.toEqual({ role: "ADMIN" });

    expect(rawMocks.userFindFirst).toHaveBeenCalledWith({
      where: {
        id: SESSION.userId,
        tenantId: SESSION.tenantId,
        isActive: true,
      },
      select: { role: true },
    });
  });

  it("DATABASE_RBAC_ACTIVE_USER_DENIAL rejects an inactive user", async () => {
    databaseState.userActive = false;

    await expect(hasDatabaseRole(SESSION, ["ADMIN"])).resolves.toBe(false);
    expect(rawMocks.userFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isActive: true }),
      }),
    );
  });

  it("rejects a missing user", async () => {
    databaseState.userPresent = false;
    await expect(hasDatabaseRole(SESSION, ["ADMIN"])).resolves.toBe(false);
  });

  it("rejects a tenant mismatch", async () => {
    databaseState.tenantId = "tenant-2";
    await expect(hasDatabaseRole(SESSION, ["ADMIN"])).resolves.toBe(false);
  });

  it("rejects an inactive tenant", async () => {
    databaseState.tenantActive = false;
    await expect(hasDatabaseRole(SESSION, ["ADMIN"])).resolves.toBe(false);
  });

  it("rejects a disallowed current role", async () => {
    databaseState.role = "READ_ONLY";
    await expect(hasDatabaseRole(SESSION, ["ADMIN"])).resolves.toBe(false);
  });

  it("allows an active user in the active tenant with an allowed role", async () => {
    await expect(hasDatabaseRole(SESSION, ["ADMIN"])).resolves.toBe(true);
    await expect(
      authBootstrapFindTenantActive(SESSION.tenantId),
    ).resolves.toEqual({ id: SESSION.tenantId });
  });
});
