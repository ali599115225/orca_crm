import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

const authMocks = vi.hoisted(() => ({
  assertServerActionRole: vi.fn(),
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
}));

vi.mock("@/lib/api-auth-guard", () => ({
  assertServerActionRole: authMocks.assertServerActionRole,
  forbiddenResponse: authMocks.forbiddenResponse,
  hasDatabaseRole: authMocks.hasDatabaseRole,
  requireAuth: authMocks.requireAuth,
  unauthorizedResponse: authMocks.unauthorizedResponse,
}));

vi.mock("@/lib/tenant-context", () => ({
  runWithTenantContext: tenantMocks.runWithTenantContext,
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

const FROZEN_SOURCES = [
  "app/api/properties/[id]/request-finance/route.ts",
  "app/api/revenue-integrity/webhook/[provider]/route.ts",
  "app/api/v1/contracts/[id]/cancel/route.ts",
  "app/api/v1/contracts/[id]/invoices/route.ts",
  "app/api/v1/contracts/[id]/payment-plan/route.ts",
  "app/api/v1/contracts/[id]/restructure/route.ts",
  "app/api/v1/contracts/[id]/sign/route.ts",
  "app/api/v1/invoices/[id]/paylink/create/route.ts",
  "app/api/v1/leads/webhook/route.ts",
  "app/api/v1/leases/[id]/invoices/route.ts",
  "app/api/v1/settings/leads-webhook/route.ts",
  "app/api/v1/accounting/journal-entries/[id]/route.ts",
  "app/api/v1/accounting/seed/route.ts",
  "app/api/v1/automation/workflows/route.ts",
  "app/api/v1/maintenance/route.ts",
  "app/api/v1/maintenance/[id]/route.ts",
  "app/actions/aiClient.ts",
  "app/actions/logs.ts",
  "app/actions/logs.ts",
  "app/api/v1/accounting/payables/route.ts",
  "app/api/v1/contracts/[id]/pdf/route.ts",
  "app/api/v1/invoices/[id]/paylink/status/route.ts",
  "app/api/v1/invoices/[id]/pdf/route.ts",
  "app/api/v1/invoices/[id]/qr/route.ts",
  "app/actions/rentals.ts",
] as const;

describe("EXEC-003 v2 frozen permission assignments", () => {
  it("freezes exactly 25 contracts and 32 method/action assignments", () => {
    expect(EXEC_003_PERMISSION_ASSIGNMENTS).toHaveLength(25);
    expect(EXEC_003_OPERATION_ASSIGNMENTS).toHaveLength(32);
    expect(EXEC_003_PERMISSION_KEYS).toHaveLength(32);
  });

  it("retains the exact frozen source order, including both log actions", () => {
    expect(
      EXEC_003_PERMISSION_ASSIGNMENTS.map((contract) => contract.source),
    ).toEqual(FROZEN_SOURCES);
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

  it("keeps non-shared boundaries and exact-claim actions fail-closed", () => {
    const nonShared = EXEC_003_OPERATION_ASSIGNMENTS.filter(
      (operation) => !operation.sharedGuardEligible,
    );
    expect(nonShared).toHaveLength(5);
    expect(
      nonShared.every(
        (operation) => operation.progressiveAllowedRoles.length === 0,
      ),
    ).toBe(true);

    expect(exec003AssignmentForPermission("revenue.webhook.ingest")).toMatchObject({
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

  it("does not add a progressive role that the caller legacy set omitted", () => {
    expect(
      effectiveRolesForExec003Permission(
        ["SALES_MANAGER"],
        "contracts.cancel.execute",
      ),
    ).toEqual(["SALES_MANAGER"]);
  });

  it("fails closed for unknown and non-shared permission keys", () => {
    expect(
      effectiveRolesForExec003Permission(
        [...EXEC_003_DATABASE_ROLES],
        "unknown.permission",
      ),
    ).toBeNull();
    expect(
      effectiveRolesForExec003Permission(
        [...EXEC_003_DATABASE_ROLES],
        "revenue.webhook.ingest",
      ),
    ).toBeNull();
    expect(
      effectiveRolesForExec003Permission(
        [...EXEC_003_DATABASE_ROLES],
        "system.logs.clear",
      ),
    ).toBeNull();
  });
});

describe("EXEC-003 v2 shared database guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMocks.requireAuth.mockResolvedValue(SESSION);
    authMocks.hasDatabaseRole.mockResolvedValue(true);
    authMocks.assertServerActionRole.mockResolvedValue(SESSION);
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

  it("passes only the legacy/progressive intersection to database role revalidation", async () => {
    const allowed = await hasExec003DatabasePermission(
      SESSION,
      ["ADMIN", "SALES_MANAGER", "MARKETING"],
      "contracts.cancel.execute",
    );

    expect(allowed).toBe(true);
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
    const allowed = await hasExec003DatabasePermission(
      SESSION,
      [...EXEC_003_DATABASE_ROLES],
      "revenue.webhook.ingest",
    );

    expect(allowed).toBe(false);
    expect(authMocks.hasDatabaseRole).not.toHaveBeenCalled();
  });

  it("preserves legacy server-action role semantics for a known key", async () => {
    await expect(
      assertExec003ServerActionPermission(
        SESSION,
        ["ADMIN", "SALES_MANAGER", "MARKETING"],
        "contracts.cancel.execute",
      ),
    ).resolves.toEqual(SESSION);

    expect(authMocks.assertServerActionRole).toHaveBeenCalledWith(SESSION, [
      "ADMIN",
      "SALES_MANAGER",
    ]);
  });

  it("rejects a non-shared server-action key before legacy authorization", async () => {
    await expect(
      assertExec003ServerActionPermission(
        SESSION,
        [...EXEC_003_DATABASE_ROLES],
        "system.logs.clear",
      ),
    ).rejects.toThrow("FORBIDDEN:system.logs.clear");

    expect(authMocks.assertServerActionRole).not.toHaveBeenCalled();
  });

  it("fails closed for a runtime-unknown permission key", async () => {
    await expect(
      assertExec003ServerActionPermission(
        SESSION,
        [...EXEC_003_DATABASE_ROLES],
        "unknown.permission" as Exec003PermissionKey,
      ),
    ).rejects.toThrow("FORBIDDEN:unknown.permission");

    expect(authMocks.assertServerActionRole).not.toHaveBeenCalled();
  });
});
