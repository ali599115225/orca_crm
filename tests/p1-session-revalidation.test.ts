/**
 * P1 — Session revalidation & tenant-context hardening.
 *
 * 1. Behavioral tests for requireDatabaseSession()
 * 2. Route-wiring regression checks for the five migrated files
 *
 * Does NOT modify any implementation file.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, it, expect, vi, beforeEach, type SpyInstance } from "vitest";
import { NextRequest } from "next/server";

// ============================================================================
// Mocks — must be hoisted before imports
// ============================================================================

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  decrypt: vi.fn(),
}));

const mockUserFindFirst = vi.fn();
const mockTenantFindFirst = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findFirst: (...args: unknown[]) => mockUserFindFirst(...args) },
    tenant: { findFirst: (...args: unknown[]) => mockTenantFindFirst(...args) },
  },
}));

// ============================================================================
// Subject-under-test imports (after mocks)
// ============================================================================

import { requireDatabaseSession, TENANT_ROLES } from "@/lib/api-auth-guard";
import { decrypt } from "@/lib/session";
import { cookies } from "next/headers";
import { tenantContext } from "@/lib/tenant-context";

// ============================================================================
// Test data
// ============================================================================

/** All Prisma tenant roles — preserves previous authenticated-route access. */
const ALLOWED = ["ADMIN", "SALES_MANAGER", "SALES_EMPLOYEE", "MARKETING", "READ_ONLY"] as const;

const VALID_SESSION = Object.freeze({
  userId: "user-active-1",
  tenantId: "tenant-active-1",
  role: "ADMIN",
});

const LOW_ROLE_SESSION = Object.freeze({
  userId: "user-low-role",
  tenantId: "tenant-active-1",
  role: "READ_ONLY",
});

// ============================================================================
// Helpers
// ============================================================================

function makeRequest(authHeader?: string): NextRequest {
  const headers: Record<string, string> = { "x-request-id": "p1-revalidation-test" };
  if (authHeader) headers["authorization"] = authHeader;
  return new NextRequest("http://localhost/api/p1-test", { headers });
}

function makeCookieStore(token?: string) {
  return {
    get: vi.fn(() => (token ? { value: token } : undefined)),
  };
}

/**
 * Parse the JSON body from a NextResponse (which is itself a Response object).
 */
async function parseBody(res: Response): Promise<Record<string, unknown>> {
  return JSON.parse(await res.text());
}

// ============================================================================
// 1. requireDatabaseSession — behavioral tests
// ============================================================================

describe("requireDatabaseSession", () => {
  let enterWithSpy: SpyInstance;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUserFindFirst.mockReset();
    mockTenantFindFirst.mockReset();
    enterWithSpy = vi.spyOn(tenantContext, "enterWith");

    // Default: no cookie, no Bearer header, no decrypt call
    vi.mocked(cookies).mockResolvedValue(makeCookieStore());
    vi.mocked(decrypt).mockReset();
  });

  // --------------------------------------------------------------------------
  // 1. missing or invalid session returns 401
  // --------------------------------------------------------------------------
  it("returns 401 when no session is provided (no cookie, no Bearer)", async () => {
    const result = await requireDatabaseSession(makeRequest(), ALLOWED);

    expect(result.session).toBeNull();
    expect(result.error).not.toBeNull();
    expect(result.error!.status).toBe(401);

    const body = await parseBody(result.error!);
    expect(body).toHaveProperty("code", "UNAUTHORIZED");
    expect(body).toHaveProperty("requestId", "p1-revalidation-test");
    // DB queries should NOT be reached when there is no JWT
    expect(mockUserFindFirst).not.toHaveBeenCalled();
    expect(mockTenantFindFirst).not.toHaveBeenCalled();
  });

  it("returns 401 when the JWT is invalid (decrypt returns null)", async () => {
    vi.mocked(decrypt).mockResolvedValue(null);

    const result = await requireDatabaseSession(makeRequest("Bearer invalid.token.here"), ALLOWED);

    expect(result.session).toBeNull();
    expect(result.error!.status).toBe(401);
    // DB queries must not run on an invalid JWT
    expect(mockUserFindFirst).not.toHaveBeenCalled();
  });

  // --------------------------------------------------------------------------
  // 2. valid JWT for a deleted user returns 403
  // --------------------------------------------------------------------------
  it("returns 403 when the user has been deleted from the database", async () => {
    vi.mocked(decrypt).mockResolvedValue(VALID_SESSION);
    mockUserFindFirst.mockResolvedValue(null);   // user deleted
    mockTenantFindFirst.mockResolvedValue({ id: "tenant-active-1" }); // tenant still exists

    const result = await requireDatabaseSession(makeRequest("Bearer valid.jwt.here"), ALLOWED);

    expect(result.session).toBeNull();
    expect(result.error!.status).toBe(403);
    expect(mockUserFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: VALID_SESSION.userId, tenantId: VALID_SESSION.tenantId } }),
    );
  });

  // --------------------------------------------------------------------------
  // 3. valid JWT for an inactive tenant returns 403
  // --------------------------------------------------------------------------
  it("returns 403 when the tenant is inactive", async () => {
    vi.mocked(decrypt).mockResolvedValue(VALID_SESSION);
    mockUserFindFirst.mockResolvedValue({ role: "ADMIN" });
    mockTenantFindFirst.mockResolvedValue(null); // inactive or missing

    const result = await requireDatabaseSession(makeRequest("Bearer valid.jwt.here"), ALLOWED);

    expect(result.session).toBeNull();
    expect(result.error!.status).toBe(403);
    expect(mockTenantFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: VALID_SESSION.tenantId, isActive: true } }),
    );
  });

  // --------------------------------------------------------------------------
  // 4. insufficient current database role returns 403
  // --------------------------------------------------------------------------
  it("returns 403 when the database role is not in allowedRoles", async () => {
    vi.mocked(decrypt).mockResolvedValue(LOW_ROLE_SESSION);
    mockUserFindFirst.mockResolvedValue({ role: "ROBOT" }); // role not in any Prisma enum
    mockTenantFindFirst.mockResolvedValue({ id: "tenant-active-1" });

    const result = await requireDatabaseSession(makeRequest("Bearer valid.jwt.here"), ALLOWED);

    expect(result.session).toBeNull();
    expect(result.error!.status).toBe(403);

    const body = await parseBody(result.error!);
    expect(body).toHaveProperty("code", "FORBIDDEN");
  });

  // --------------------------------------------------------------------------
  // 5. active user, active tenant, permitted role → succeeds
  // --------------------------------------------------------------------------
  it("returns session when user, tenant, and role all pass", async () => {
    vi.mocked(decrypt).mockResolvedValue(VALID_SESSION);
    mockUserFindFirst.mockResolvedValue({ role: "ADMIN" });
    mockTenantFindFirst.mockResolvedValue({ id: "tenant-active-1" });

    const result = await requireDatabaseSession(makeRequest("Bearer valid.jwt.here"), ALLOWED);

    expect(result.error).toBeNull();
    expect(result.session).toEqual(VALID_SESSION);
    expect(result.session!.tenantId).toBe("tenant-active-1");
  });

  // --------------------------------------------------------------------------
  // 6. authorization uses the database role, not the JWT role
  // --------------------------------------------------------------------------
  it("rejects when JWT claims ADMIN but DB has a non-enum role", async () => {
    vi.mocked(decrypt).mockResolvedValue({ ...VALID_SESSION, role: "ADMIN" }); // JWT claims ADMIN
    mockUserFindFirst.mockResolvedValue({ role: "ROBOT" }); // DB returns unrecognised role
    mockTenantFindFirst.mockResolvedValue({ id: "tenant-active-1" });

    const result = await requireDatabaseSession(makeRequest("Bearer valid.jwt.here"), ALLOWED);

    expect(result.session).toBeNull();
    expect(result.error!.status).toBe(403);
  });

  it("succeeds when JWT says READ_ONLY but DB says ADMIN", async () => {
    vi.mocked(decrypt).mockResolvedValue({ ...LOW_ROLE_SESSION, role: "READ_ONLY" }); // JWT claims low
    mockUserFindFirst.mockResolvedValue({ role: "ADMIN" }); // DB reality
    mockTenantFindFirst.mockResolvedValue({ id: "tenant-active-1" });

    const result = await requireDatabaseSession(makeRequest("Bearer valid.jwt.here"), ALLOWED);

    expect(result.error).toBeNull();
    expect(result.session).toBeTruthy();
  });

  // --------------------------------------------------------------------------
  // 7. tenantContext.enterWith is called only after successful validation
  // --------------------------------------------------------------------------
  it("calls tenantContext.enterWith on success", async () => {
    vi.mocked(decrypt).mockResolvedValue(VALID_SESSION);
    mockUserFindFirst.mockResolvedValue({ role: "ADMIN" });
    mockTenantFindFirst.mockResolvedValue({ id: "tenant-active-1" });

    enterWithSpy.mockClear();
    await requireDatabaseSession(makeRequest("Bearer valid.jwt.here"), ALLOWED);

    expect(enterWithSpy).toHaveBeenCalledOnce();
    expect(enterWithSpy).toHaveBeenCalledWith({
      tenantId: VALID_SESSION.tenantId,
      userId: VALID_SESSION.userId,
    });
  });

  // --------------------------------------------------------------------------
  // 8. tenantContext is not initialized after failed validation
  // --------------------------------------------------------------------------
  it("does NOT call tenantContext.enterWith on missing JWT", async () => {
    enterWithSpy.mockClear();
    await requireDatabaseSession(makeRequest(), ALLOWED);
    expect(enterWithSpy).not.toHaveBeenCalled();
  });

  it("does NOT call tenantContext.enterWith on deleted user", async () => {
    vi.mocked(decrypt).mockResolvedValue(VALID_SESSION);
    mockUserFindFirst.mockResolvedValue(null);
    mockTenantFindFirst.mockResolvedValue({ id: "tenant-active-1" });

    enterWithSpy.mockClear();
    await requireDatabaseSession(makeRequest("Bearer valid.jwt.here"), ALLOWED);
    expect(enterWithSpy).not.toHaveBeenCalled();
  });

  it("does NOT call tenantContext.enterWith on inactive tenant", async () => {
    vi.mocked(decrypt).mockResolvedValue(VALID_SESSION);
    mockUserFindFirst.mockResolvedValue({ role: "ADMIN" });
    mockTenantFindFirst.mockResolvedValue(null);

    enterWithSpy.mockClear();
    await requireDatabaseSession(makeRequest("Bearer valid.jwt.here"), ALLOWED);
    expect(enterWithSpy).not.toHaveBeenCalled();
  });

  it("does NOT call tenantContext.enterWith on insufficient role", async () => {
    vi.mocked(decrypt).mockResolvedValue(LOW_ROLE_SESSION);
    mockUserFindFirst.mockResolvedValue({ role: "ROBOT" }); // unrecognised role
    mockTenantFindFirst.mockResolvedValue({ id: "tenant-active-1" });

    enterWithSpy.mockClear();
    await requireDatabaseSession(makeRequest("Bearer valid.jwt.here"), ALLOWED);
    expect(enterWithSpy).not.toHaveBeenCalled();
  });
});

// ============================================================================
// 2. Route-wiring regression checks
// ============================================================================

/**
 * Read a route file and return its source lines.
 */
function readRoute(relativePath: string): string[] {
  const full = path.join(process.cwd(), relativePath);
  return fs.readFileSync(full, "utf8").split(/\r?\n/);
}

/**
 * Handler patterns we look for:
 *   export async function GET( ... )
 *   export async function POST( ... )
 *   export async function PUT( ... )
 *   export async function DELETE( ... )
 */
const HANDLER_RE = /^export async function (GET|POST|PUT|DELETE)\s*\(/;

describe("Route-wiring regression: tasks", () => {
  const FILE = "app/api/tasks/route.ts";
  const source = readRoute(FILE);

  it("imports requireDatabaseSession from api-auth-guard", () => {
    expect(source.some((l) => l.includes('requireDatabaseSession') && l.includes('api-auth-guard'))).toBe(true);
  });

  it("does NOT define authenticateRequest", () => {
    expect(source.some((l) => /^\s*async function authenticateRequest/.test(l))).toBe(false);
  });

  it("does NOT import decrypt directly", () => {
    expect(source.some((l) => l.includes('from "@/lib/session"'))).toBe(false);
  });

  it("does NOT import cookies from next/headers", () => {
    expect(source.some((l) => l.includes('from "next/headers"'))).toBe(false);
  });

  it("every handler calls requireDatabaseSession", () => {
    const handlers = source.filter((l) => HANDLER_RE.test(l));
    expect(handlers.length).toBeGreaterThanOrEqual(4); // GET, POST, PUT, DELETE

    const requireCalls = source.filter((l) => l.includes("requireDatabaseSession(request"));
    expect(requireCalls.length).toBe(handlers.length);
  });
});

describe("Route-wiring regression: projects (collection)", () => {
  const FILE = "app/api/projects/route.ts";
  const source = readRoute(FILE);

  it("imports requireDatabaseSession", () => {
    expect(source.some((l) => l.includes('requireDatabaseSession') && l.includes('api-auth-guard'))).toBe(true);
  });

  it("does NOT define authenticateRequest", () => {
    expect(source.some((l) => /^\s*async function authenticateRequest/.test(l))).toBe(false);
  });

  it("does NOT import decrypt", () => {
    expect(source.some((l) => l.includes('from "@/lib/session"'))).toBe(false);
  });

  it("does NOT import cookies from next/headers", () => {
    expect(source.some((l) => l.includes('from "next/headers"'))).toBe(false);
  });

  it("every handler calls requireDatabaseSession", () => {
    const handlers = source.filter((l) => HANDLER_RE.test(l));
    expect(handlers.length).toBeGreaterThanOrEqual(4); // GET, POST, PUT, DELETE

    const requireCalls = source.filter((l) => l.includes("requireDatabaseSession(request"));
    expect(requireCalls.length).toBe(handlers.length);
  });
});

describe("Route-wiring regression: projects (by id)", () => {
  const FILE = "app/api/projects/[id]/route.ts";
  const source = readRoute(FILE);

  it("imports requireDatabaseSession", () => {
    expect(source.some((l) => l.includes('requireDatabaseSession') && l.includes('api-auth-guard'))).toBe(true);
  });

  it("does NOT define authenticateRequest", () => {
    expect(source.some((l) => /^\s*async function authenticateRequest/.test(l))).toBe(false);
  });

  it("does NOT import decrypt", () => {
    expect(source.some((l) => l.includes('from "@/lib/session"'))).toBe(false);
  });

  it("does NOT import cookies", () => {
    expect(source.some((l) => l.includes('from "next/headers"'))).toBe(false);
  });

  it("every handler calls requireDatabaseSession", () => {
    const handlers = source.filter((l) => HANDLER_RE.test(l));
    expect(handlers.length).toBeGreaterThanOrEqual(3); // GET, PUT, DELETE

    const requireCalls = source.filter((l) => l.includes("requireDatabaseSession("));
    expect(requireCalls.length).toBe(handlers.length);
  });
});

describe("Route-wiring regression: properties (collection)", () => {
  const FILE = "app/api/properties/route.ts";
  const source = readRoute(FILE);

  it("imports requireDatabaseSession", () => {
    expect(source.some((l) => l.includes('requireDatabaseSession') && l.includes('api-auth-guard'))).toBe(true);
  });

  it("does NOT define authenticateRequest", () => {
    expect(source.some((l) => /^\s*async function authenticateRequest/.test(l))).toBe(false);
  });

  it("does NOT import decrypt", () => {
    expect(source.some((l) => l.includes('from "@/lib/session"'))).toBe(false);
  });

  it("does NOT import cookies", () => {
    expect(source.some((l) => l.includes('from "next/headers"'))).toBe(false);
  });

  it("every handler calls requireDatabaseSession", () => {
    const handlers = source.filter((l) => HANDLER_RE.test(l));
    expect(handlers.length).toBeGreaterThanOrEqual(2); // GET, POST

    const requireCalls = source.filter((l) => l.includes("requireDatabaseSession(request"));
    expect(requireCalls.length).toBe(handlers.length);
  });
});

describe("Route-wiring regression: properties (by id)", () => {
  const FILE = "app/api/properties/[id]/route.ts";
  const source = readRoute(FILE);

  it("imports requireDatabaseSession", () => {
    expect(source.some((l) => l.includes('requireDatabaseSession') && l.includes('api-auth-guard'))).toBe(true);
  });

  it("does NOT define authenticateRequest", () => {
    expect(source.some((l) => /^\s*async function authenticateRequest/.test(l))).toBe(false);
  });

  it("does NOT import decrypt", () => {
    expect(source.some((l) => l.includes('from "@/lib/session"'))).toBe(false);
  });

  it("does NOT import cookies", () => {
    expect(source.some((l) => l.includes('from "next/headers"'))).toBe(false);
  });

  it("every handler calls requireDatabaseSession", () => {
    const handlers = source.filter((l) => HANDLER_RE.test(l));
    expect(handlers.length).toBeGreaterThanOrEqual(3); // GET, PUT, DELETE

    const requireCalls = source.filter((l) => l.includes("requireDatabaseSession("));
    expect(requireCalls.length).toBe(handlers.length);
  });
});

/**
 * Confirm that removed patterns do not exist in any of the five files.
 */
describe("Cross-file regression: no stale authenticateRequest or old imports", () => {
  const FILES = [
    "app/api/tasks/route.ts",
    "app/api/projects/route.ts",
    "app/api/projects/[id]/route.ts",
    "app/api/properties/route.ts",
    "app/api/properties/[id]/route.ts",
  ] as const;

  for (const file of FILES) {
    it(`${file} is free of stale patterns`, () => {
      const source = fs.readFileSync(path.join(process.cwd(), file), "utf8");
      // No top-level async function authenticateRequest
      expect(source).not.toMatch(/^\s*async function authenticateRequest\s*\(/m);
      // No direct decrypt import from session
      expect(source).not.toContain('from "@/lib/session"');
      // No direct cookies import from next/headers (unless it's next/headers itself in test)
      expect(source).not.toContain('from "next/headers"');
      // Must import from api-auth-guard
      expect(source).toContain("requireDatabaseSession");
    });
  }
});

/**
 * Verify the shared TENANT_ROLES constant includes all Prisma-enum roles.
 */
describe("TENANT_ROLES shared constant", () => {
  it("includes all five Prisma enum roles", () => {
    expect(TENANT_ROLES).toEqual(
      expect.arrayContaining(["ADMIN", "SALES_MANAGER", "SALES_EMPLOYEE", "MARKETING", "READ_ONLY"]),
    );
  });

  it("contains no duplicate entries", () => {
    expect(new Set(TENANT_ROLES).size).toBe(TENANT_ROLES.length);
  });

  it("is the same reference used by every route handler", () => {
    // All five route files import { requireDatabaseSession, TENANT_ROLES }
    // and call requireDatabaseSession(request, TENANT_ROLES)
    const FILES = [
      "app/api/tasks/route.ts",
      "app/api/projects/route.ts",
      "app/api/projects/[id]/route.ts",
      "app/api/properties/route.ts",
      "app/api/properties/[id]/route.ts",
    ];

    for (const file of FILES) {
      const source = fs.readFileSync(path.join(process.cwd(), file), "utf8");
      expect(source).toContain("TENANT_ROLES");
      // No file-local role constants remain
      expect(source).not.toMatch(/const \w+_ROLES = \[/);
    }
  });
});
