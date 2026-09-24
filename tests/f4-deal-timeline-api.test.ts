import fs from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authState = vi.hoisted(() => ({
  session: { userId: "user-1", tenantId: "tenant-1", role: "ADMIN" } as any,
  authenticated: true,
  forbidden: false,
  capturedPermission: null as any,
  capturedRoles: null as any,
}));

const dbState = vi.hoisted(() => ({
  contracts: [] as Array<{ id: string; tenantId: string }>,
  dealPassports: [] as Array<{
    id: string;
    tenantId: string;
    contractId: string | null;
    opportunityId: string | null;
    status: string;
    lastSequence: number;
  }>,
  dealEvents: [] as Array<{
    id: string;
    tenantId: string;
    dealId: string;
    sequence: number;
    eventType: string;
    eventVersion: number;
    idempotencyKey: string;
    correlationId: string;
    causationId: string | null;
    actorType: string;
    actorId: string | null;
    entityType: string | null;
    entityId: string | null;
    beforeState: any;
    afterState: any;
    payload: any;
    occurredAt: Date;
    createdAt: Date;
  }>,
  spies: {
    contractFindFirst: vi.fn(),
    dealPassportFindFirst: vi.fn(),
    dealEventFindMany: vi.fn(),
  },
}));

vi.mock("@/lib/auth/exec-003-shared-guard", () => ({
  runWithExec003DatabasePermission: vi.fn(
    async (request: NextRequest, roles: readonly string[], permissionKey: string, operation: any) => {
      authState.capturedPermission = permissionKey;
      authState.capturedRoles = roles;
      if (!authState.authenticated) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (authState.forbidden) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return operation(authState.session);
    },
  ),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    contract: {
      findFirst: vi.fn(async (args: any) => {
        dbState.spies.contractFindFirst(args);
        const { where } = args;
        return (
          dbState.contracts.find(
            (c) => c.id === where.id && c.tenantId === where.tenantId,
          ) || null
        );
      }),
    },
    dealPassport: {
      findFirst: vi.fn(async (args: any) => {
        dbState.spies.dealPassportFindFirst(args);
        const { where } = args;
        return (
          dbState.dealPassports.find(
            (p) =>
              p.tenantId === where.tenantId &&
              p.contractId === where.contractId,
          ) || null
        );
      }),
    },
    dealEvent: {
      findMany: vi.fn(async (query: any) => {
        dbState.spies.dealEventFindMany(query);
        const { where, orderBy, take } = query;
        let matched = dbState.dealEvents.filter((e) => {
          if (e.tenantId !== where.tenantId) return false;
          if (e.dealId !== where.dealId) return false;
          if (where.sequence?.gt !== undefined && !(e.sequence > where.sequence.gt)) {
            return false;
          }
          return true;
        });

        if (orderBy?.sequence === "asc") {
          matched.sort((a, b) => a.sequence - b.sequence);
        } else if (orderBy?.sequence === "desc") {
          matched.sort((a, b) => b.sequence - a.sequence);
        }

        if (typeof take === "number") {
          matched = matched.slice(0, take);
        }

        return matched;
      }),
    },
  },
}));

import { GET } from "@/app/api/v1/contracts/[id]/timeline/route";
import {
  EXEC_003_DATABASE_ROLES,
  EXEC_003_PERMISSION_KEYS,
  exec003AssignmentForPermission,
} from "@/lib/auth/exec-003-permission-assignments";

function makeGetRequest(contractId: string, query: string = ""): NextRequest {
  const url = `http://localhost/api/v1/contracts/${contractId}/timeline${query}`;
  return new NextRequest(url, {
    method: "GET",
  });
}

describe("F4-B4 Contract Timeline API Endpoint", () => {
  beforeEach(() => {
    authState.session = { userId: "user-1", tenantId: "tenant-1", role: "ADMIN" };
    authState.authenticated = true;
    authState.forbidden = false;
    authState.capturedPermission = null;
    authState.capturedRoles = null;

    dbState.contracts = [];
    dbState.dealPassports = [];
    dbState.dealEvents = [];
    dbState.spies.contractFindFirst.mockClear();
    dbState.spies.dealPassportFindFirst.mockClear();
    dbState.spies.dealEventFindMany.mockClear();
  });

  it("verifies permissions: contracts.read is registered in exec-003 with ALL_TENANT_ROLES", () => {
    expect(EXEC_003_PERMISSION_KEYS).toContain("contracts.read");
    const assignment = exec003AssignmentForPermission("contracts.read");
    expect(assignment).toBeTruthy();
    expect(assignment?.routeOrContract).toBe("/api/v1/contracts/[id]/timeline");
    expect(assignment?.permissionKey).toBe("contracts.read");
    expect(assignment?.legacyAllowedRoles).toEqual(EXEC_003_DATABASE_ROLES);
    expect(assignment?.progressiveAllowedRoles).toEqual(EXEC_003_DATABASE_ROLES);
  });

  it("returns 200 with full timeline read model on successful query", async () => {
    dbState.contracts = [{ id: "c-1", tenantId: "tenant-1" }];
    dbState.dealPassports = [
      {
        id: "dp-1",
        tenantId: "tenant-1",
        contractId: "c-1",
        opportunityId: "opp-1",
        status: "FINANCIALS_ACTIVE",
        lastSequence: 2,
      },
    ];
    dbState.dealEvents = [
      {
        id: "ev-1",
        tenantId: "tenant-1",
        dealId: "dp-1",
        sequence: 1,
        eventType: "contract.issued",
        eventVersion: 1,
        idempotencyKey: "idem-secret-1",
        correlationId: "corr-1",
        causationId: null,
        actorType: "USER",
        actorId: "usr-1",
        entityType: "contract",
        entityId: "c-1",
        beforeState: null,
        afterState: null,
        payload: { note: "First event" },
        occurredAt: new Date("2026-09-24T10:00:00Z"),
        createdAt: new Date("2026-09-24T10:00:00Z"),
      },
      {
        id: "ev-2",
        tenantId: "tenant-1",
        dealId: "dp-1",
        sequence: 2,
        eventType: "financials.activated",
        eventVersion: 1,
        idempotencyKey: "idem-secret-2",
        correlationId: "corr-2",
        causationId: "ev-1",
        actorType: "SYSTEM",
        actorId: null,
        entityType: "payment_plan",
        entityId: "pp-1",
        beforeState: null,
        afterState: null,
        payload: { note: "Second event" },
        occurredAt: new Date("2026-09-24T11:00:00Z"),
        createdAt: new Date("2026-09-24T11:00:00Z"),
      },
    ];

    const req = makeGetRequest("c-1");
    const res = await GET(req, { params: Promise.resolve({ id: "c-1" }) });

    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body).toEqual({
      contractId: "c-1",
      dealId: "dp-1",
      opportunityId: "opp-1",
      dealStatus: "FINANCIALS_ACTIVE",
      lastSequence: 2,
      events: expect.any(Array),
      page: {
        afterSequence: 0,
        nextCursor: null,
        hasMore: false,
      },
    });

    expect(body.events).toHaveLength(2);
    expect(body.events[0].sequence).toBe(1);
    expect(body.events[1].sequence).toBe(2);

    // Verify idempotencyKey is NEVER exposed in the API response
    expect(body.events[0]).not.toHaveProperty("idempotencyKey");
    expect(body.events[1]).not.toHaveProperty("idempotencyKey");

    // Verify auth guard was executed with contracts.read
    expect(authState.capturedPermission).toBe("contracts.read");
    expect(authState.capturedRoles).toEqual(EXEC_003_DATABASE_ROLES);
  });

  it("returns 200 with empty timeline when existing contract has no DealPassport", async () => {
    dbState.contracts = [{ id: "c-empty", tenantId: "tenant-1" }];
    dbState.dealPassports = [];
    dbState.dealEvents = [];

    const req = makeGetRequest("c-empty");
    const res = await GET(req, { params: Promise.resolve({ id: "c-empty" }) });

    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body).toEqual({
      contractId: "c-empty",
      dealId: null,
      opportunityId: null,
      dealStatus: null,
      lastSequence: 0,
      events: [],
      page: {
        afterSequence: 0,
        nextCursor: null,
        hasMore: false,
      },
    });
  });

  it("returns 404 when contract does not exist or belongs to another tenant", async () => {
    // Contract exists under tenant-other, but session is tenant-1
    dbState.contracts = [{ id: "c-foreign", tenantId: "tenant-other" }];

    const req = makeGetRequest("c-foreign");
    const res = await GET(req, { params: Promise.resolve({ id: "c-foreign" }) });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain("Contract not found");
  });

  it("returns 401 when request is unauthenticated", async () => {
    authState.authenticated = false;

    const req = makeGetRequest("c-1");
    const res = await GET(req, { params: Promise.resolve({ id: "c-1" }) });

    expect(res.status).toBe(401);
  });

  it("returns 403 when user lacks required permission/role", async () => {
    authState.forbidden = true;

    const req = makeGetRequest("c-1");
    const res = await GET(req, { params: Promise.resolve({ id: "c-1" }) });

    expect(res.status).toBe(403);
  });

  it("parses valid afterSequence and limit integers and passes them to read model", async () => {
    dbState.contracts = [{ id: "c-paged", tenantId: "tenant-1" }];
    dbState.dealPassports = [
      {
        id: "dp-paged",
        tenantId: "tenant-1",
        contractId: "c-paged",
        opportunityId: null,
        status: "OPEN",
        lastSequence: 5,
      },
    ];
    dbState.dealEvents = Array.from({ length: 5 }, (_, i) => ({
      id: `ev-${i + 1}`,
      tenantId: "tenant-1",
      dealId: "dp-paged",
      sequence: i + 1,
      eventType: `event.${i + 1}`,
      eventVersion: 1,
      idempotencyKey: `k-${i + 1}`,
      correlationId: `corr-${i + 1}`,
      causationId: null,
      actorType: "USER",
      actorId: null,
      entityType: "contract",
      entityId: "c-paged",
      beforeState: null,
      afterState: null,
      payload: {},
      occurredAt: new Date(),
      createdAt: new Date(),
    }));

    const req = makeGetRequest("c-paged", "?afterSequence=2&limit=2");
    const res = await GET(req, { params: Promise.resolve({ id: "c-paged" }) });

    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.events.map((e: any) => e.sequence)).toEqual([3, 4]);
    expect(body.page).toEqual({
      afterSequence: 2,
      nextCursor: 4,
      hasMore: true,
    });
  });

  it("rejects invalid afterSequence with 400", async () => {
    dbState.contracts = [{ id: "c-test", tenantId: "tenant-1" }];

    for (const invalid of ["-1", "1.5", "abc", "NaN", "", " "]) {
      const req = makeGetRequest("c-test", `?afterSequence=${encodeURIComponent(invalid)}`);
      const res = await GET(req, { params: Promise.resolve({ id: "c-test" }) });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("Invalid afterSequence");
    }
  });

  it("rejects invalid limit with 400", async () => {
    dbState.contracts = [{ id: "c-test", tenantId: "tenant-1" }];

    for (const invalid of ["0", "-5", "101", "5.5", "xyz", "", " "]) {
      const req = makeGetRequest("c-test", `?limit=${encodeURIComponent(invalid)}`);
      const res = await GET(req, { params: Promise.resolve({ id: "c-test" }) });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("Invalid limit");
    }
  });

  it("verifies source architecture: no new /deals route created", () => {
    const dealsRoutePath = path.join(process.cwd(), "app/api/v1/deals");
    expect(fs.existsSync(dealsRoutePath)).toBe(false);
  });
});
