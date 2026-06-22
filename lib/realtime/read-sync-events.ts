import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  SYNC_EVENT_DEFAULT_PAGE_SIZE,
  SYNC_EVENT_MAX_PAGE_SIZE,
  type StoredSyncEvent,
  type SyncEventPage,
} from "@/lib/realtime/types";

type SyncEventReader = Pick<Prisma.TransactionClient, "$queryRaw">;

export interface ReadSyncEventsInput {
  tenantId: string;
  after?: bigint;
  limit?: number;
}

export async function readSyncEvents(
  input: ReadSyncEventsInput,
  db: SyncEventReader = prisma as unknown as SyncEventReader,
): Promise<SyncEventPage> {
  const tenantId = input.tenantId.trim();
  if (!tenantId) {
    throw new Error("tenantId is required");
  }

  const after = input.after ?? BigInt(0);
  if (after < BigInt(0)) {
    throw new Error("after cursor must be non-negative");
  }

  const requestedLimit = input.limit ?? SYNC_EVENT_DEFAULT_PAGE_SIZE;
  const limit = Math.min(
    Math.max(Math.trunc(requestedLimit), 1),
    SYNC_EVENT_MAX_PAGE_SIZE,
  );

  const rows = await db.$queryRaw<StoredSyncEvent[]>(Prisma.sql`
    SELECT
      "id",
      "cursor",
      "tenant_id" AS "tenantId",
      "topic",
      "event_type" AS "eventType",
      "aggregate_type" AS "aggregateType",
      "aggregate_id" AS "aggregateId",
      "aggregate_version" AS "aggregateVersion",
      "source_event_id" AS "sourceEventId",
      "idempotency_key" AS "idempotencyKey",
      "payload",
      "created_at" AS "createdAt",
      "expires_at" AS "expiresAt"
    FROM "sync_events"
    WHERE "tenant_id" = ${tenantId}
      AND "cursor" > ${after}
      AND "expires_at" > NOW()
    ORDER BY "cursor" ASC
    LIMIT ${limit + 1}
  `);

  const hasMore = rows.length > limit;
  const events = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = events.length > 0 ? events[events.length - 1].cursor : after;

  return { events, nextCursor, hasMore };
}