/**
 * P1-B — Tenant mutation defense-in-depth & authentication migration.
 *
 * 1. Verifies the three targeted v1 route handlers include `tenantId`
 *    in the Prisma mutation where clause (update / delete), even when a
 *    prior `findFirst` ownership lookup is performed.
 * 2. Verifies all three routes have migrated from authenticateRequest /
 *    decrypt / cookies to requireDatabaseSession + TENANT_ROLES.
 *
 * These tests treat the additions as defense in depth — the findFirst
 * already protects against cross-tenant mutation, but the where clause
 * on the write operation provides a second layer.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// ============================================================================
// Hoisted mocks
// ============================================================================

const mocks = vi.hoisted(() => ({
  requireDatabaseSession: vi.fn<
    () => Promise<{ session: { userId: string; tenantId: string; role: string } | null; error: NextResponse | null }>
  >(),
  leaseFindFirst: vi.fn(),
  leaseUpdate: vi.fn(),
  zatcaQueueFindFirst: vi.fn(),
  zatcaQueueUpdate: vi.fn(),
  zatcaDeviceFindFirst: vi.fn(),
  zatcaDeviceDelete: vi.fn(),
  isRetryable: vi.fn(),
  isExpired: vi.fn(),
}));

vi.mock("@/lib/api-auth-guard", () => ({
  requireDatabaseSession: mocks.requireDatabaseSession,
  TENANT_ROLES: ["ADMIN", "SALES_MANAGER", "SALES_EMPLOYEE", "MARKETING", "READ_ONLY"],
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    rentalLease: {
      findFirst: mocks.leaseFindFirst,
      update: mocks.leaseUpdate,
    },
    zatcaQueue: {
      findFirst: mocks.zatcaQueueFindFirst,
      update: mocks.zatcaQueueUpdate,
    },
    zatcaDevice: {
      findFirst: mocks.zatcaDeviceFindFirst,
      delete: mocks.zatcaDeviceDelete,
    },
  },
}));

vi.mock("@/lib/zatca/queue", () => ({
  isRetryable: mocks.isRetryable,
  isExpired: mocks.isExpired,
}));

// ============================================================================
// Subject imports
// ============================================================================

import { PUT as updateLease } from "@/app/api/v1/leases/route";
import { POST as retryQueue } from "@/app/api/v1/zatca/queue/[id]/retry/route";
import { DELETE as deleteDevice } from "@/app/api/v1/zatca/device/[id]/route";

// ============================================================================
// Helpers
// ============================================================================

const SESSION = Object.freeze({
  userId: "user-a",
  tenantId: "tenant-a",
  role: "ADMIN",
});

const ANOTHER_TENANT_ID = "tenant-b";

/** Shared 401 error response used by the mocks when auth is denied. */
const UNAUTHORIZED_RESPONSE = NextResponse.json({ error: "Unauthorized" }, { status: 401 });

function jsonRequest(url: string, method: string, body?: unknown): NextRequest {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-request-id": "p1-tenant-mutation-hardening",
  };
  if (body) {
    return new NextRequest(url, { method, headers, body: JSON.stringify(body) });
  }
  return new NextRequest(url, { method, headers });
}

// ============================================================================
// Tests
// ============================================================================

describe("P1-B tenant mutation hardening", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // All three routes now call requireDatabaseSession.
    // Default mock: authenticated as SESSION.
    mocks.requireDatabaseSession.mockResolvedValue({ session: SESSION, error: null });
  });

  // --------------------------------------------------------------------------
  // leases/route.ts — PUT (update)
  // --------------------------------------------------------------------------

  describe("PUT /api/v1/leases (update)", () => {
    const LEASE_ID = "lease-1";
    const validBody = { id: LEASE_ID, status: "terminated", financialRef: "REF-001" };

    it("includes tenantId in the update where clause on success", async () => {
      mocks.leaseFindFirst.mockResolvedValue({ id: LEASE_ID, tenantId: SESSION.tenantId });
      mocks.leaseUpdate.mockResolvedValue({ id: LEASE_ID, status: "terminated" });

      const response = await updateLease(jsonRequest("http://localhost/api/v1/leases", "PUT", validBody));

      expect(response.status).toBe(200);
      expect(mocks.leaseUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: LEASE_ID, tenantId: SESSION.tenantId },
        }),
      );
    });

    it("returns 404 when the lease belongs to another tenant", async () => {
      mocks.leaseFindFirst.mockResolvedValue(null); // scoped findFirst won't see cross-tenant

      const response = await updateLease(jsonRequest("http://localhost/api/v1/leases", "PUT", validBody));

      expect(response.status).toBe(404);
      expect(mocks.leaseUpdate).not.toHaveBeenCalled();
    });

    it("never calls the mutation when the lease is not found", async () => {
      mocks.leaseFindFirst.mockResolvedValue(null);

      await updateLease(jsonRequest("http://localhost/api/v1/leases", "PUT", validBody));

      expect(mocks.leaseUpdate).not.toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // zatca/queue/[id]/retry — POST (update)
  // --------------------------------------------------------------------------

  describe("POST /api/v1/zatca/queue/[id]/retry", () => {
    const QUEUE_ID = "queue-1";

    it("includes tenantId in the update where clause on success", async () => {
      mocks.zatcaQueueFindFirst.mockResolvedValue({
        id: QUEUE_ID,
        tenantId: SESSION.tenantId,
        status: "FAILED",
        retryCount: 1,
        maxRetries: 3,
      });
      mocks.isRetryable.mockReturnValue(true);
      mocks.isExpired.mockReturnValue(false);
      mocks.zatcaQueueUpdate.mockResolvedValue({ id: QUEUE_ID });

      const response = await retryQueue(
        jsonRequest(`http://localhost/api/v1/zatca/queue/${QUEUE_ID}/retry`, "POST"),
        { params: Promise.resolve({ id: QUEUE_ID }) },
      );

      expect(response.status).toBe(200);
      expect(mocks.zatcaQueueUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: QUEUE_ID, tenantId: SESSION.tenantId },
        }),
      );
    });

    it("returns 404 when the queue item belongs to another tenant", async () => {
      mocks.zatcaQueueFindFirst.mockResolvedValue(null);

      const response = await retryQueue(
        jsonRequest(`http://localhost/api/v1/zatca/queue/${QUEUE_ID}/retry`, "POST"),
        { params: Promise.resolve({ id: QUEUE_ID }) },
      );

      expect(response.status).toBe(404);
      expect(mocks.zatcaQueueUpdate).not.toHaveBeenCalled();
    });

    it("never calls the mutation for a non-retryable queue item", async () => {
      mocks.zatcaQueueFindFirst.mockResolvedValue({
        id: QUEUE_ID,
        tenantId: SESSION.tenantId,
        status: "PENDING",
        retryCount: 0,
        maxRetries: 3,
      });
      mocks.isRetryable.mockReturnValue(false);

      const response = await retryQueue(
        jsonRequest(`http://localhost/api/v1/zatca/queue/${QUEUE_ID}/retry`, "POST"),
        { params: Promise.resolve({ id: QUEUE_ID }) },
      );

      expect(response.status).toBe(400);
      expect(mocks.zatcaQueueUpdate).not.toHaveBeenCalled();
    });

    it("returns 401 when not authenticated", async () => {
      mocks.requireDatabaseSession.mockResolvedValue({ session: null, error: UNAUTHORIZED_RESPONSE });

      const response = await retryQueue(
        jsonRequest(`http://localhost/api/v1/zatca/queue/${QUEUE_ID}/retry`, "POST"),
        { params: Promise.resolve({ id: QUEUE_ID }) },
      );

      expect(response.status).toBe(401);
      expect(mocks.zatcaQueueUpdate).not.toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // zatca/device/[id] — DELETE
  // --------------------------------------------------------------------------

  describe("DELETE /api/v1/zatca/device/[id]", () => {
    const DEVICE_ID = "device-1";

    it("includes tenantId in the delete where clause on success", async () => {
      mocks.zatcaDeviceFindFirst.mockResolvedValue({
        id: DEVICE_ID,
        tenantId: SESSION.tenantId,
      });
      mocks.zatcaDeviceDelete.mockResolvedValue({ id: DEVICE_ID });

      const response = await deleteDevice(
        jsonRequest(`http://localhost/api/v1/zatca/device/${DEVICE_ID}`, "DELETE"),
        { params: Promise.resolve({ id: DEVICE_ID }) },
      );

      expect(response.status).toBe(200);
      expect(mocks.zatcaDeviceDelete).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: DEVICE_ID, tenantId: SESSION.tenantId },
        }),
      );
    });

    it("returns 404 when the device belongs to another tenant", async () => {
      mocks.zatcaDeviceFindFirst.mockResolvedValue(null);

      const response = await deleteDevice(
        jsonRequest(`http://localhost/api/v1/zatca/device/${DEVICE_ID}`, "DELETE"),
        { params: Promise.resolve({ id: DEVICE_ID }) },
      );

      expect(response.status).toBe(404);
      expect(mocks.zatcaDeviceDelete).not.toHaveBeenCalled();
    });

    it("returns 401 when not authenticated", async () => {
      mocks.requireDatabaseSession.mockResolvedValue({ session: null, error: UNAUTHORIZED_RESPONSE });

      const response = await deleteDevice(
        jsonRequest(`http://localhost/api/v1/zatca/device/${DEVICE_ID}`, "DELETE"),
        { params: Promise.resolve({ id: DEVICE_ID }) },
      );

      expect(response.status).toBe(401);
      expect(mocks.zatcaDeviceDelete).not.toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // Cross-route: each mutation uses tenantId from session, not hard-coded
  // --------------------------------------------------------------------------

  describe("defense-in-depth: mutation uses session tenantId, not another tenant's", () => {
    it("leases update uses the authenticated session tenantId", async () => {
      mocks.leaseFindFirst.mockResolvedValue({ id: "lease-1", tenantId: SESSION.tenantId });
      mocks.leaseUpdate.mockResolvedValue({ id: "lease-1" });

      await updateLease(jsonRequest("http://localhost/api/v1/leases", "PUT", { id: "lease-1", status: "active" }));

      expect(mocks.leaseUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "lease-1", tenantId: SESSION.tenantId },
        }),
      );
      // Ensure it does NOT use another tenant's ID or a hard-coded value
      expect(mocks.leaseUpdate).not.toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: ANOTHER_TENANT_ID }),
        }),
      );
    });

    it("queue retry uses the authenticated session tenantId", async () => {
      mocks.zatcaQueueFindFirst.mockResolvedValue({
        id: "queue-1", tenantId: SESSION.tenantId,
        status: "FAILED", retryCount: 1, maxRetries: 3,
      });
      mocks.isRetryable.mockReturnValue(true);
      mocks.isExpired.mockReturnValue(false);
      mocks.zatcaQueueUpdate.mockResolvedValue({ id: "queue-1" });

      await retryQueue(
        jsonRequest("http://localhost/api/v1/zatca/queue/queue-1/retry", "POST"),
        { params: Promise.resolve({ id: "queue-1" }) },
      );

      expect(mocks.zatcaQueueUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "queue-1", tenantId: SESSION.tenantId },
        }),
      );
    });

    it("device delete uses the authenticated session tenantId", async () => {
      mocks.zatcaDeviceFindFirst.mockResolvedValue({ id: "device-1", tenantId: SESSION.tenantId });
      mocks.zatcaDeviceDelete.mockResolvedValue({ id: "device-1" });

      await deleteDevice(
        jsonRequest("http://localhost/api/v1/zatca/device/device-1", "DELETE"),
        { params: Promise.resolve({ id: "device-1" }) },
      );

      expect(mocks.zatcaDeviceDelete).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "device-1", tenantId: SESSION.tenantId },
        }),
      );
    });
  });
});

// ============================================================================
// Regression: route files import requireDatabaseSession + TENANT_ROLES
// and no longer import authenticateRequest / decrypt / cookies / next/headers
// ============================================================================

const HANDLER_RE = /^export async function (GET|POST|PUT|DELETE)\s*\(/;

function readRoute(relativePath: string): string[] {
  const full = path.join(process.cwd(), relativePath);
  return fs.readFileSync(full, "utf8").split(/\r?\n/);
}

describe("Import regression: leases route", () => {
  const FILE = "app/api/v1/leases/route.ts";
  const source = readRoute(FILE);

  it("imports requireDatabaseSession from api-auth-guard", () => {
    expect(source.some((l) => l.includes("requireDatabaseSession") && l.includes("api-auth-guard"))).toBe(true);
  });

  it("imports TENANT_ROLES from api-auth-guard", () => {
    expect(source.some((l) => l.includes("TENANT_ROLES") && l.includes("api-auth-guard"))).toBe(true);
  });

  it("no longer imports authenticateRequest", () => {
    expect(source.some((l) => l.includes("authenticateRequest"))).toBe(false);
  });

  it("no longer imports decrypt from session", () => {
    expect(source.some((l) => l.includes('from "@/lib/session"'))).toBe(false);
  });

  it("no longer imports cookies from next/headers", () => {
    expect(source.some((l) => l.includes('from "next/headers"'))).toBe(false);
  });

  it("every handler calls requireDatabaseSession", () => {
    const handlers = source.filter((l) => HANDLER_RE.test(l));
    expect(handlers.length).toBeGreaterThanOrEqual(3); // GET, POST, PUT

    const requireCalls = source.filter((l) => l.includes("requireDatabaseSession(request"));
    expect(requireCalls.length).toBe(handlers.length);
  });
});

describe("Import regression: queue retry route", () => {
  const FILE = "app/api/v1/zatca/queue/[id]/retry/route.ts";
  const source = readRoute(FILE);

  it("imports requireDatabaseSession from api-auth-guard", () => {
    expect(source.some((l) => l.includes("requireDatabaseSession") && l.includes("api-auth-guard"))).toBe(true);
  });

  it("imports TENANT_ROLES from api-auth-guard", () => {
    expect(source.some((l) => l.includes("TENANT_ROLES") && l.includes("api-auth-guard"))).toBe(true);
  });

  it("no longer imports authenticateRequest", () => {
    expect(source.some((l) => l.includes("authenticateRequest"))).toBe(false);
  });

  it("every handler calls requireDatabaseSession", () => {
    const handlers = source.filter((l) => HANDLER_RE.test(l));
    expect(handlers.length).toBeGreaterThanOrEqual(1); // POST

    const requireCalls = source.filter((l) => l.includes("requireDatabaseSession(request"));
    expect(requireCalls.length).toBe(handlers.length);
  });
});

describe("Import regression: device delete route", () => {
  const FILE = "app/api/v1/zatca/device/[id]/route.ts";
  const source = readRoute(FILE);

  it("imports requireDatabaseSession from api-auth-guard", () => {
    expect(source.some((l) => l.includes("requireDatabaseSession") && l.includes("api-auth-guard"))).toBe(true);
  });

  it("imports TENANT_ROLES from api-auth-guard", () => {
    expect(source.some((l) => l.includes("TENANT_ROLES") && l.includes("api-auth-guard"))).toBe(true);
  });

  it("no longer imports authenticateRequest", () => {
    expect(source.some((l) => l.includes("authenticateRequest"))).toBe(false);
  });

  it("every handler calls requireDatabaseSession", () => {
    const handlers = source.filter((l) => HANDLER_RE.test(l));
    expect(handlers.length).toBeGreaterThanOrEqual(1); // DELETE

    const requireCalls = source.filter((l) => l.includes("requireDatabaseSession(request"));
    expect(requireCalls.length).toBe(handlers.length);
  });
});
