import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  class MockNextRequest {
    url: string;
    method: string;
    _headers: Record<string, string>;
    constructor(url: string, init?: { method?: string; headers?: Record<string, string> }) {
      this.url = url;
      this.method = init?.method ?? "GET";
      this._headers = init?.headers ?? {};
    }
    get headers() {
      return {
        get: (key: string) => this._headers[key] ?? null,
      };
    }
  }

  class MockNextResponse {
    status: number;
    _body: unknown;
    constructor(body: unknown, init?: { status?: number }) {
      this._body = body;
      this.status = init?.status ?? 200;
    }
    static json(body: unknown, init?: { status?: number }) {
      return new MockNextResponse(body, init);
    }
    async json() {
      return this._body;
    }
  }

  return {
    MockNextRequest,
    MockNextResponse,
    requireDatabaseSession: vi.fn(),
    unitFindFirst: vi.fn(),
    favoriteFindFirst: vi.fn(),
    favoriteCreate: vi.fn(),
    favoriteDeleteMany: vi.fn(),
  };
});

vi.mock("next/server", () => ({
  NextRequest: mocks.MockNextRequest,
  NextResponse: mocks.MockNextResponse,
}));

vi.mock("@/lib/api-auth-guard", () => ({
  requireDatabaseSession: mocks.requireDatabaseSession,
  TENANT_ROLES: ["ADMIN", "SALES_MANAGER", "SALES_EMPLOYEE", "MARKETING", "READ_ONLY"],
  notFoundResponse: (request?: InstanceType<typeof mocks.MockNextRequest>) =>
    mocks.MockNextResponse.json(
      {
        code: "NOT_FOUND",
        requestId: request?.headers.get("x-request-id") ?? "unknown",
      },
      { status: 404 },
    ),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    unit: {
      findFirst: mocks.unitFindFirst,
    },
    userFavorite: {
      findFirst: mocks.favoriteFindFirst,
      create: mocks.favoriteCreate,
      deleteMany: mocks.favoriteDeleteMany,
    },
  },
}));

import {
  GET,
  POST,
} from "@/app/api/properties/[id]/favorites/route";

const SESSION = {
  userId: "user-a",
  tenantId: "tenant-a",
  role: "ADMIN",
};

const UNAUTHORIZED_RESPONSE = mocks.MockNextResponse.json(
  { code: "UNAUTHORIZED" },
  { status: 401 },
);

function request(method: "GET" | "POST") {
  return new mocks.MockNextRequest("http://localhost/api/properties/unit-1/favorites", {
    method,
    headers: { "x-request-id": "favorite-test" },
  });
}

describe("property favorites route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireDatabaseSession.mockResolvedValue({
      session: SESSION,
      error: null,
    });
    mocks.unitFindFirst.mockResolvedValue({ id: "unit-1" });
    mocks.favoriteFindFirst.mockResolvedValue(null);
    mocks.favoriteCreate.mockResolvedValue({ id: "fav-1" });
    mocks.favoriteDeleteMany.mockResolvedValue({ count: 1 });
  });

  it("creates a favorite inside the tenant", async () => {
    const response = await POST(request("POST") as any, {
      params: Promise.resolve({ id: "unit-1" }),
    });

    expect(response.status).toBe(200);
    expect(mocks.unitFindFirst).toHaveBeenCalledWith({
      where: { id: "unit-1", project: { tenantId: "tenant-a" } },
      select: { id: true },
    });
    expect(mocks.favoriteCreate).toHaveBeenCalledWith({
      data: {
        tenantId: "tenant-a",
        userId: "user-a",
        propertyId: "unit-1",
      },
    });
  });

  it("removes a favorite inside the tenant", async () => {
    mocks.favoriteFindFirst.mockResolvedValue({ id: "fav-1" });

    const response = await POST(request("POST") as any, {
      params: Promise.resolve({ id: "unit-1" }),
    });

    expect(response.status).toBe(200);
    expect(mocks.favoriteDeleteMany).toHaveBeenCalledWith({
      where: {
        id: "fav-1",
        tenantId: "tenant-a",
        userId: "user-a",
        propertyId: "unit-1",
      },
    });
    expect(mocks.favoriteCreate).not.toHaveBeenCalled();
  });

  it("returns favorite state inside the tenant", async () => {
    mocks.favoriteFindFirst.mockResolvedValue({ id: "fav-1" });

    const response = await GET(request("GET") as any, {
      params: Promise.resolve({ id: "unit-1" }),
    });

    expect(response.status).toBe(200);
    expect(await (response as any).json()).toEqual({
      propertyId: "unit-1",
      isFavorite: true,
    });
  });

  it("does not write or disclose a property from another tenant", async () => {
    mocks.unitFindFirst.mockResolvedValue(null);

    const postResponse = await POST(request("POST") as any, {
      params: Promise.resolve({ id: "unit-foreign" }),
    });
    const getResponse = await GET(request("GET") as any, {
      params: Promise.resolve({ id: "unit-foreign" }),
    });

    expect(postResponse.status).toBe(404);
    expect(getResponse.status).toBe(404);
    expect(mocks.favoriteCreate).not.toHaveBeenCalled();
    expect(mocks.favoriteDeleteMany).not.toHaveBeenCalled();
  });

  it("does not delete a favorite that belongs to another tenant", async () => {
    mocks.favoriteFindFirst.mockResolvedValue(null);

    const response = await POST(request("POST") as any, {
      params: Promise.resolve({ id: "unit-1" }),
    });

    expect(response.status).toBe(200);
    expect(mocks.favoriteDeleteMany).not.toHaveBeenCalled();
  });

  it("returns the auth error when the session is invalid", async () => {
    mocks.requireDatabaseSession.mockResolvedValue({
      session: null,
      error: UNAUTHORIZED_RESPONSE,
    });

    const response = await POST(request("POST") as any, {
      params: Promise.resolve({ id: "unit-1" }),
    });

    expect(response.status).toBe(401);
    expect(mocks.unitFindFirst).not.toHaveBeenCalled();
  });
});
