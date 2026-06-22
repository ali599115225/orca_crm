import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { publishSyncEvent } from "@/lib/realtime/publish-sync-event";
import { SYNC_TOPICS } from "@/lib/realtime/topics";
import type { StoredSyncEvent } from "@/lib/realtime/types";

function storedEvent(): StoredSyncEvent {
  return {
    id: "event-1",
    cursor: BigInt(1),
    tenantId: "tenant-1",
    topic: SYNC_TOPICS.TASKS,
    eventType: "task.updated",
    aggregateType: "task",
    aggregateId: "task-1",
    aggregateVersion: 1,
    sourceEventId: null,
    idempotencyKey: "task-1:v1",
    payload: {},
    createdAt: new Date("2026-06-22T00:00:00.000Z"),
    expiresAt: new Date("2026-07-06T00:00:00.000Z"),
  };
}

describe("realtime foundation", () => {
  const queryRaw = vi.fn();

  beforeEach(() => {
    queryRaw.mockReset();
  });

  it("publishes an allowed invalidation payload", async () => {
    queryRaw.mockResolvedValue([storedEvent()]);

    const result = await publishSyncEvent(
      {
        tenantId: "tenant-1",
        topic: SYNC_TOPICS.TASKS,
        eventType: "task.updated",
        aggregateType: "task",
        aggregateId: "task-1",
        aggregateVersion: 1,
        idempotencyKey: "task-1:v1",
        payload: {
          changedFields: ["status"],
          status: "DONE",
          actorUserId: "user-1",
        },
      },
      { $queryRaw: queryRaw } as never,
    );

    expect(result.id).toBe("event-1");
    expect(queryRaw).toHaveBeenCalledTimes(1);
  });

  it("rejects payload keys that could carry arbitrary content", async () => {
    await expect(
      publishSyncEvent(
        {
          tenantId: "tenant-1",
          topic: SYNC_TOPICS.EMAIL,
          eventType: "email.created",
          aggregateType: "email",
          aggregateId: "email-1",
          idempotencyKey: "email-1",
          payload: { body: "sensitive content" } as never,
        },
        { $queryRaw: queryRaw } as never,
      ),
    ).rejects.toThrow("payload key is not allowed");

    expect(queryRaw).not.toHaveBeenCalled();
  });

  it("rejects unsupported topics before writing", async () => {
    await expect(
      publishSyncEvent(
        {
          tenantId: "tenant-1",
          topic: "unknown" as never,
          eventType: "unknown",
          aggregateType: "entity",
          aggregateId: "entity-1",
          idempotencyKey: "entity-1",
        },
        { $queryRaw: queryRaw } as never,
      ),
    ).rejects.toThrow("Unsupported sync topic");

    expect(queryRaw).not.toHaveBeenCalled();
  });

  it("fails closed when an idempotency key collides with different content", async () => {
    queryRaw.mockResolvedValue([]);

    await expect(
      publishSyncEvent(
        {
          tenantId: "tenant-1",
          topic: SYNC_TOPICS.TASKS,
          eventType: "task.updated",
          aggregateType: "task",
          aggregateId: "task-2",
          idempotencyKey: "reused-key",
        },
        { $queryRaw: queryRaw } as never,
      ),
    ).rejects.toThrow("SYNC_EVENT_IDEMPOTENCY_COLLISION");
  });
});