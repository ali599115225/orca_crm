import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  queryRaw: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRaw: mocks.queryRaw,
  },
}));

import { GET as getDeployment } from "@/app/api/health/deployment/route";
import { GET as getLiveness } from "@/app/api/health/live/route";
import { GET as getReadiness } from "@/app/api/health/ready/route";

function makeRequest(path: string, requestId?: string): NextRequest {
  const headers: Record<string, string> = {};
  if (requestId) {
    headers["x-request-id"] = requestId;
  }
  return new NextRequest(`http://localhost${path}`, { headers });
}

describe("GET /api/health/deployment", () => {
  it("returns 200 with the expected contract", async () => {
    const response = await getDeployment();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toHaveProperty("status", "ok");
    expect(body).toHaveProperty("service", "orca-crm");
    expect(body).toHaveProperty("environment");
    expect(body).toHaveProperty("commit");
    expect(body).toHaveProperty("timestamp");
    expect(response.headers.get("Cache-Control")).toMatch(/no-store/);
  });
});

describe("GET /api/health/live", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 without invoking Prisma", async () => {
    const response = await getLiveness(makeRequest("/api/health/live", "test-req-id"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toHaveProperty("status", "ok");
    expect(body).toHaveProperty("timestamp");
    expect(mocks.queryRaw).not.toHaveBeenCalled();
  });

  it("includes x-request-id in the response header", async () => {
    const response = await getLiveness(makeRequest("/api/health/live", "custom-req-id"));

    expect(response.headers.get("x-request-id")).toBe("custom-req-id");
  });

  it("sets Cache-Control to no-store", async () => {
    const response = await getLiveness(makeRequest("/api/health/live"));

    expect(response.headers.get("Cache-Control")).toMatch(/no-store/);
  });

  it("generates a request ID when none is provided", async () => {
    const response = await getLiveness(makeRequest("/api/health/live"));
    const requestId = response.headers.get("x-request-id");

    expect(requestId).toBeTruthy();
    expect(requestId?.length).toBeGreaterThanOrEqual(8);
  });
});

describe("GET /api/health/ready", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 when the database responds", async () => {
    mocks.queryRaw.mockResolvedValue([{ "1": 1 }]);

    const response = await getReadiness(makeRequest("/api/health/ready", "test-req-id"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toHaveProperty("status", "ok");
    expect(body).toHaveProperty("timestamp");
    expect(mocks.queryRaw).toHaveBeenCalled();
  });

  it("returns 503 when the database is unavailable", async () => {
    mocks.queryRaw.mockRejectedValue(new Error("Connection refused"));

    const response = await getReadiness(makeRequest("/api/health/ready", "fail-req-id"));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toHaveProperty("success", false);
    expect(body).toHaveProperty("code", "SERVICE_UNAVAILABLE");
    expect(mocks.queryRaw).toHaveBeenCalled();
  });

  it("does not expose database error text in the response body", async () => {
    mocks.queryRaw.mockRejectedValue(
      new Error("Connection refused to database with password=secret123"),
    );

    const response = await getReadiness(makeRequest("/api/health/ready"));
    const body = await response.json();

    expect(response.status).toBe(503);
    const bodyStr = JSON.stringify(body);
    expect(bodyStr).not.toContain("secret123");
    expect(bodyStr).not.toContain("Connection refused");
    expect(bodyStr).not.toContain("password");
  });

  it("includes the same request ID in header and body on failure", async () => {
    mocks.queryRaw.mockRejectedValue(new Error("DB down"));

    const response = await getReadiness(
      makeRequest("/api/health/ready", "consistent-req-id"),
    );
    const body = await response.json();

    expect(response.headers.get("x-request-id")).toBe("consistent-req-id");
    expect(body.requestId).toBe("consistent-req-id");
  });

  it("sets Cache-Control to no-store on success", async () => {
    mocks.queryRaw.mockResolvedValue([{ "1": 1 }]);

    const response = await getReadiness(makeRequest("/api/health/ready"));

    expect(response.headers.get("Cache-Control")).toMatch(/no-store/);
  });

  it("sets Cache-Control to no-store on failure", async () => {
    mocks.queryRaw.mockRejectedValue(new Error("DB down"));

    const response = await getReadiness(makeRequest("/api/health/ready"));

    expect(response.headers.get("Cache-Control")).toMatch(/no-store/);
  });
});
