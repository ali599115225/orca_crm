import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  guard: vi.fn(),
  applyDatabaseInitialization: vi.fn(),
}));

vi.mock("@/lib/api-auth-guard", () => ({
  requireSuperAdminInDev: mocks.guard,
}));

vi.mock("@/lib/system-prisma-boundary", () => ({
  applyDatabaseInitialization: mocks.applyDatabaseInitialization,
}));

import { POST } from "@/app/api/db-init/route";

function request() {
  return new NextRequest("http://localhost/api/db-init", {
    method: "POST",
  });
}

describe("R02 database initialization boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.guard.mockResolvedValue(null);
    mocks.applyDatabaseInitialization.mockResolvedValue(15);
  });

  it("does not invoke initialization when authorization fails", async () => {
    mocks.guard.mockResolvedValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    );

    const response = await POST(request());

    expect(response.status).toBe(403);
    expect(mocks.applyDatabaseInitialization).not.toHaveBeenCalled();
  });

  it("invokes the narrow initialization capability", async () => {
    const response = await POST(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      appliedStatements: 15,
    });
    expect(mocks.applyDatabaseInitialization).toHaveBeenCalledOnce();
  });

  it("returns 500 when initialization fails", async () => {
    mocks.applyDatabaseInitialization.mockRejectedValue(
      new Error("initialization failed"),
    );

    const response = await POST(request());

    expect(response.status).toBe(500);
  });

  it("keeps raw Prisma and SQL outside the route", () => {
    const root = process.cwd();
    const routeSource = fs.readFileSync(
      path.join(root, "app/api/db-init/route.ts"),
      "utf8",
    );
    const boundarySource = fs.readFileSync(
      path.join(root, "lib/system-prisma-boundary.ts"),
      "utf8",
    );

    expect(routeSource).not.toMatch(/\brawPrisma\b/);
    expect(routeSource).not.toMatch(/\$(?:query|execute)RawUnsafe/);
    expect(routeSource).toContain("applyDatabaseInitialization");

    expect(boundarySource).toContain(
      "export async function applyDatabaseInitialization",
    );
    expect(boundarySource).toContain("Prisma.sql`");
    expect(boundarySource).not.toContain(
      'module: "app/api/db-init/route.ts"',
    );
  });
});
