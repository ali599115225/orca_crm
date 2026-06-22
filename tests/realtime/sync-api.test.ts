import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/api-helpers", () => ({
  getTenantAndUser: vi.fn(),
}));

vi.mock("@/lib/realtime/read-sync-events", () => ({
  readSyncEvents: vi.fn(),
  readSyncEventCursorWindow: vi.fn(),
}));

import { getTenantAndUser } from "@/lib/api-helpers";
import {
  readSyncEventCursorWindow,
  readSyncEvents,
} from "@/lib/realtime/read-sync-events";
import { GET } from "@/app/api/v1/sync/events/route";

const authMock = vi.mocked(getTenantAndUser);
const readMock = vi.mocked(readSyncEvents);
const windowMock = vi.mocked(readSyncEventCursorWindow);

describe("tenant-scoped sync API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({
      tenantId: "tenant-a",
      userId: "user-a",
    } as never);
    windowMock.mockResolvedValue({
      oldestCursor: BigInt(1),
      newestCursor: BigInt(9),
    });
  });

  it("rejects unauthenticated requests", async () => {
    authMock.mockResolvedValue({ tenantId: null, userId: null } as never);

    const response = await GET(
      new NextRequest("http://localhost/api/v1/sync/events"),
    );

    expect(response.status).toBe(401);
    expect(readMock).not.toHaveBeenCalled();
  });

  it("rejects a client-supplied tenant identifier", async () => {
    const response = await GET(
      new NextRequest(
        "http://localhost/api/v1/sync/events?tenantId=tenant-b",
      ),
    );

    expect(response.status).toBe(400);
    expect(readMock).not.toHaveBeenCalled();
  });

  it("reads only with the authenticated tenant and serializes cursors", async () => {
    readMock.mockResolvedValue({
      events: [
        {
          id: "event-1",
          cursor: BigInt(8),
          tenantId: "tenant-a",
          topic: "tasks",
          eventType: "task.updated",
          aggregateType: "task",
          aggregateId: "task-1",
          aggregateVersion: 2,
          sourceEventId: null,
          idempotencyKey: "task-1:v2",
          payload: { status: "DONE" },
          createdAt: new Date("2026-06-22T00:00:00.000Z"),
          expiresAt: new Date("2026-07-06T00:00:00.000Z"),
        },
      ],
      nextCursor: BigInt(8),
      hasMore: false,
    });

    const response = await GET(
      new NextRequest(
        "http://localhost/api/v1/sync/events?after=7&limit=100",
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(readMock).toHaveBeenCalledWith({
      tenantId: "tenant-a",
      after: BigInt(7),
      limit: 100,
    });
    expect(body.nextCursor).toBe("8");
    expect(body.events[0].cursor).toBe("8");
    expect(body.resetRequired).toBe(false);
  });

  it("rejects malformed cursors and limits", async () => {
    const badCursor = await GET(
      new NextRequest("http://localhost/api/v1/sync/events?after=-1"),
    );
    const badLimit = await GET(
      new NextRequest("http://localhost/api/v1/sync/events?limit=501"),
    );

    expect(badCursor.status).toBe(400);
    expect(badLimit.status).toBe(400);
    expect(readMock).not.toHaveBeenCalled();
  });

  it("requires a reset when the requested cursor predates retained events", async () => {
    windowMock.mockResolvedValue({
      oldestCursor: BigInt(20),
      newestCursor: BigInt(30),
    });

    const response = await GET(
      new NextRequest("http://localhost/api/v1/sync/events?after=10"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      events: [],
      nextCursor: "30",
      hasMore: false,
      resetRequired: true,
    });
    expect(readMock).not.toHaveBeenCalled();
  });
});