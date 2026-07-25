import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

const authMocks = vi.hoisted(() => ({
  forbiddenResponse: vi.fn(() => new Response("forbidden", { status: 403 })),
  hasDatabaseRole: vi.fn(),
  requireAuth: vi.fn(),
  unauthorizedResponse: vi.fn(() => new Response("unauthorized", { status: 401 })),
}));

const tenantMocks = vi.hoisted(() => ({
  runWithTenantContext: vi.fn(
    async (
      _context: { tenantId: string; userId?: string },
      operation: () => unknown,
    ) => await operation(),
  ),
  setTenantContext: vi.fn(),
}));

vi.mock("@/lib/api-auth-guard", () => ({
  forbiddenResponse: authMocks.forbiddenResponse,
  hasDatabaseRole: authMocks.hasDatabaseRole,
  requireAuth: authMocks.requireAuth,
  unauthorizedResponse: authMocks.unauthorizedResponse,
}));

vi.mock("@/lib/session", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/tenant-context", () => ({
  runWithTenantContext: tenantMocks.runWithTenantContext,
  setTenantContext: tenantMocks.setTenantContext,
}));

import {
  EXEC_003_DATABASE_ROLES,
  EXEC_003_OPERATION_ASSIGNMENTS,
  EXEC_003_PERMISSION_ASSIGNMENTS,
  EXEC_003_PERMISSION_KEYS,
  exec003AssignmentForPermission,
  type Exec003PermissionKey,
} from "@/lib/auth/exec-003-permission-assignments";
import {
  assertExec003ServerActionPermission,
  effectiveRolesForExec003Permission,
  hasExec003DatabasePermission,
  requireExec003DatabasePermissionSession,
} from "@/lib/auth/exec-003-shared-guard";

const SESSION = Object.freeze({
  userId: "exec-003-user",
  tenantId: "exec-003-tenant",
  role: "ADMIN",
});

describe("EXEC-003 v2 frozen permission assignments", () => {
  it("freezes exactly 25 contracts and 32 method/action assignments", () => {
    expect(EXEC_003_PERMISSION_ASSIGNMENTS).toHaveLength(25);
    expect(EXEC_003_OPERATION_ASSIGNMENTS).toHaveLength(32);
    expect(EXEC_003_PERMISSION_KEYS).toHaveLength(32);
  });

  it("retains the exact contract sequence without manufacturing direct evidence", () => {
    expect(
      EXEC_003_PERMISSION_ASSIGNMENTS.map((contract) => contract.contractId),
    ).toEqual(
      Array.from(
        { length: 25 },
        (_, index) => `EXEC-003-C${String(index + 1).padStart(2, "0")}`,
      ),
    );

    const sourceCounts = new Map<string, number>();
    for (const contract of EXEC_003_PERMISSION_ASSIGNMENTS) {
      sourceCounts.set(
        contract.source,
        (sourceCounts.get(contract.source) ?? 0) + 1,
      );
    }
    expect([...sourceCounts.values()].filter((count) => count === 2)).toEqual([
      2,
    ]);
    expect(
      [...sourceCounts.values()].every((count) => count === 1 || count === 2),
    ).toBe(true);
  });

  it("registers one unique code-only permission key per operation", () => {
    const keys = EXEC_003_OPERATION_ASSIGNMENTS.map(
      (operation) => operation.permissionKey,
    );
    expect(new Set(keys).size).toBe(keys.length);
    expect(new Set(EXEC_003_PERMISSION_KEYS)).toEqual(new Set(keys));
  });

  it("never grants a progressive role outside the legacy allow set", () => {
    for (const operation of EXEC_003_OPERATION_ASSIGNMENTS) {
      const legacy = new Set(operation.legacyAllowedRoles);
      for (const role of operation.progressiveAllowedRoles) {
        expect(
          legacy.has(role),
          `${operation.permissionKey} adds legacy-denied role ${role}`,
        ).toBe(true);
      }
    }
  });

  it("keeps five non-shared operations fail-closed", () => {
    const nonShared = EXEC_003_OPERATION_ASSIGNMENTS.filter(
      (operation) => !operation.sharedGuardEligible,
    );
    expect(nonShared).toHaveLength(5);
    expect(
      nonShared.every(
        (operation) => operation.progressiveAllowedRoles.length === 0,
      ),
    ).toBe(true);
  });

  it("preserves signed and exact-claim classifications", () => {
    expect(
      exec003AssignmentForPermission("revenue.webhook.ingest"),
    ).toMatchObject({
      legacyGuardKind: "SIGNED_BOUNDARY",
      sharedGuardEligible: false,
    });
    expect(exec003AssignmentForPermission("leads.webhook.ingest")).toMatchObject({
      legacyGuardKind: "SIGNED_BOUNDARY",
      sharedGuardEligible: false,
    });
    expect(exec003AssignmentForPermission("system.logs.clear")).toMatchObject({
      legacyGuardKind: "SESSION_CLAIM_EXACT",
      legacyAllowedRoles: ["Admin"],
      sharedGuardEligible: false,
    });
  });

  it("uses only current database role literals", () => {
    expect(EXEC_003_DATABASE_ROLES).toEqual([
      "ADMIN",
      "SALES_MANAGER",
      "SALES_EMPLOYEE",
      "MARKETING",
      "READ_ONLY",
    ]);
  });
});

describe("EXEC-003 v2 effective role intersection", () => {
  it("computes effectiveAllow as legacy AND progressive", () => {
    expect(
      effectiveRolesForExec003Permission(
        ["ADMIN", "SALES_MANAGER", "MARKETING"],
        "contracts.cancel.execute",
      ),
    ).toEqual(["ADMIN", "SALES_MANAGER"]);
  });

  it("does not add a progressive role omitted by Legacy", () => {
    expect(
      effectiveRolesForExec003Permission(
        ["SALES_MANAGER"],
        "contracts.cancel.execute",
      ),
    ).toEqual(["SALES_MANAGER"]);
  });

  it("fails closed for unknown and non-shared keys", () => {
    for (const key of [
      "unknown.permission",
      "revenue.webhook.ingest",
      "system.logs.clear",
    ]) {
      expect(
        effectiveRolesForExec003Permission(
          [...EXEC_003_DATABASE_ROLES],
          key,
        ),
      ).toBeNull();
    }
  });
});

describe("EXEC-003 v2 shared database guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMocks.requireAuth.mockResolvedValue(SESSION);
    authMocks.hasDatabaseRole.mockResolvedValue(true);
  });

  it("returns 401 before role checks when authentication is missing", async () => {
    authMocks.requireAuth.mockResolvedValue(null);

    const result = await requireExec003DatabasePermissionSession(
      {} as NextRequest,
      [...EXEC_003_DATABASE_ROLES],
      "contracts.pdf.read",
    );

    expect(result.session).toBeNull();
    expect(result.error?.status).toBe(401);
    expect(authMocks.hasDatabaseRole).not.toHaveBeenCalled();
  });

  it("passes only the legacy/progressive intersection to database revalidation", async () => {
    await expect(
      hasExec003DatabasePermission(
        SESSION,
        ["ADMIN", "SALES_MANAGER", "MARKETING"],
        "contracts.cancel.execute",
      ),
    ).resolves.toBe(true);

    expect(authMocks.hasDatabaseRole).toHaveBeenCalledWith(SESSION, [
      "ADMIN",
      "SALES_MANAGER",
    ]);
  });

  it("returns 403 when the current database role is denied", async () => {
    authMocks.hasDatabaseRole.mockResolvedValue(false);

    const result = await requireExec003DatabasePermissionSession(
      {} as NextRequest,
      ["ADMIN", "SALES_MANAGER"],
      "contracts.cancel.execute",
    );

    expect(result.session).toBeNull();
    expect(result.error?.status).toBe(403);
  });

  it("fails closed before database lookup for a non-shared key", async () => {
    await expect(
      hasExec003DatabasePermission(
        SESSION,
        [...EXEC_003_DATABASE_ROLES],
        "revenue.webhook.ingest",
      ),
    ).resolves.toBe(false);
    expect(authMocks.hasDatabaseRole).not.toHaveBeenCalled();
  });
});

describe("EXEC-003 v2 strict Server Action guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMocks.hasDatabaseRole.mockResolvedValue(true);
  });

  it("allows only after current database role survives the intersection", async () => {
    await expect(
      assertExec003ServerActionPermission(
        SESSION,
        ["ADMIN", "SALES_MANAGER", "MARKETING"],
        "contracts.cancel.execute",
      ),
    ).resolves.toEqual(SESSION);

    expect(authMocks.hasDatabaseRole).toHaveBeenCalledWith(SESSION, [
      "ADMIN",
      "SALES_MANAGER",
    ]);
    expect(tenantMocks.setTenantContext).toHaveBeenCalledWith({
      tenantId: SESSION.tenantId,
      userId: SESSION.userId,
    });
  });

  it("does not provide a platform-owner bypass when the database denies", async () => {
    authMocks.hasDatabaseRole.mockResolvedValue(false);

    await expect(
      assertExec003ServerActionPermission(
        SESSION,
        [...EXEC_003_DATABASE_ROLES],
        "rentals.contracts.read",
      ),
    ).rejects.toThrow("FORBIDDEN:rentals.contracts.read");

    expect(tenantMocks.setTenantContext).not.toHaveBeenCalled();
  });

  it("rejects missing identity before database lookup", async () => {
    await expect(
      assertExec003ServerActionPermission(
        null,
        [...EXEC_003_DATABASE_ROLES],
        "rentals.contracts.read",
      ),
    ).rejects.toThrow("UNAUTHORIZED");
    expect(authMocks.hasDatabaseRole).not.toHaveBeenCalled();
  });

  it("rejects a non-shared key before database authorization", async () => {
    await expect(
      assertExec003ServerActionPermission(
        SESSION,
        [...EXEC_003_DATABASE_ROLES],
        "system.logs.clear",
      ),
    ).rejects.toThrow("FORBIDDEN:system.logs.clear");
    expect(authMocks.hasDatabaseRole).not.toHaveBeenCalled();
  });

  it("fails closed for a runtime-unknown permission key", async () => {
    await expect(
      assertExec003ServerActionPermission(
        SESSION,
        [...EXEC_003_DATABASE_ROLES],
        "unknown.permission" as Exec003PermissionKey,
      ),
    ).rejects.toThrow("FORBIDDEN:unknown.permission");
    expect(authMocks.hasDatabaseRole).not.toHaveBeenCalled();
  });
});
