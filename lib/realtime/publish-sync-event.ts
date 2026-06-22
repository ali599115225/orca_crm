import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { assertSyncTopic } from "@/lib/realtime/topics";
import {
  SYNC_EVENT_MAX_PAYLOAD_BYTES,
  SYNC_EVENT_RETENTION_DAYS,
  type PublishSyncEventInput,
  type StoredSyncEvent,
  type SyncEventPayload,
} from "@/lib/realtime/types";

type SyncEventWriter = Pick<Prisma.TransactionClient, "$queryRaw">;

const ALLOWED_PAYLOAD_KEYS = new Set<keyof SyncEventPayload>([
  "changedFields",
  "status",
  "previousStatus",
  "source",
  "actorUserId",
  "relatedIds",
]);

function requireNonEmpty(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${field} is required`);
  }
  return normalized;
}

function normalizeOptional(value: string | null | undefined): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function assertStringArray(
  value: unknown,
  field: string,
  maxItems: number,
): asserts value is string[] {
  if (!Array.isArray(value) || value.length > maxItems) {
    throw new Error(`${field} must be a string array with at most ${maxItems} items`);
  }

  for (const item of value) {
    if (typeof item !== "string" || item.length === 0 || item.length > 128) {
      throw new Error(`${field} contains an invalid item`);
    }
  }
}

function normalizePayload(input: PublishSyncEventInput): Prisma.InputJsonObject {
  const payload = input.payload ?? {};
  const payloadRecord = payload as Record<string, unknown>;

  for (const key of Object.keys(payloadRecord)) {
    if (!ALLOWED_PAYLOAD_KEYS.has(key as keyof SyncEventPayload)) {
      throw new Error(`sync event payload key is not allowed: ${key}`);
    }
  }

  for (const key of ["status", "previousStatus", "source", "actorUserId"] as const) {
    const value = payload[key];
    if (value !== undefined && (typeof value !== "string" || value.length > 256)) {
      throw new Error(`${key} must be a string with at most 256 characters`);
    }
  }

  if (payload.changedFields !== undefined) {
    assertStringArray(payload.changedFields, "changedFields", 50);
  }

  if (payload.relatedIds !== undefined) {
    assertStringArray(payload.relatedIds, "relatedIds", 100);
  }

  const serialized = JSON.stringify(payload);
  const bytes = Buffer.byteLength(serialized, "utf8");

  if (bytes > SYNC_EVENT_MAX_PAYLOAD_BYTES) {
    throw new Error(
      `sync event payload exceeds ${SYNC_EVENT_MAX_PAYLOAD_BYTES} bytes`,
    );
  }

  return payload as Prisma.InputJsonObject;
}

export async function publishSyncEvent(
  input: PublishSyncEventInput,
  db: SyncEventWriter = prisma as unknown as SyncEventWriter,
): Promise<StoredSyncEvent> {
  const tenantId = requireNonEmpty(input.tenantId, "tenantId");
  const topic = requireNonEmpty(input.topic, "topic");
  const eventType = requireNonEmpty(input.eventType, "eventType");
  const aggregateType = requireNonEmpty(input.aggregateType, "aggregateType");
  const aggregateId = requireNonEmpty(input.aggregateId, "aggregateId");
  const idempotencyKey = requireNonEmpty(
    input.idempotencyKey,
    "idempotencyKey",
  );
  const sourceEventId = normalizeOptional(input.sourceEventId);

  assertSyncTopic(topic);

  if (
    input.aggregateVersion !== undefined &&
    input.aggregateVersion !== null &&
    (!Number.isInteger(input.aggregateVersion) || input.aggregateVersion < 0)
  ) {
    throw new Error("aggregateVersion must be a non-negative integer");
  }

  const payload = normalizePayload(input);
  const expiresAt = new Date(
    Date.now() + SYNC_EVENT_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  );

  const rows = await db.$queryRaw<StoredSyncEvent[]>(Prisma.sql`
    INSERT INTO "sync_events" (
      "id",
      "tenant_id",
      "topic",
      "event_type",
      "aggregate_type",
      "aggregate_id",
      "aggregate_version",
      "source_event_id",
      "idempotency_key",
      "payload",
      "expires_at"
    )
    VALUES (
      ${randomUUID()},
      ${tenantId},
      ${topic},
      ${eventType},
      ${aggregateType},
      ${aggregateId},
      ${input.aggregateVersion ?? null},
      ${sourceEventId},
      ${idempotencyKey},
      CAST(${JSON.stringify(payload)} AS jsonb),
      ${expiresAt}
    )
    ON CONFLICT ("tenant_id", "idempotency_key")
    DO UPDATE SET "idempotency_key" = EXCLUDED."idempotency_key"
    WHERE
      "sync_events"."topic" = EXCLUDED."topic"
      AND "sync_events"."event_type" = EXCLUDED."event_type"
      AND "sync_events"."aggregate_type" = EXCLUDED."aggregate_type"
      AND "sync_events"."aggregate_id" = EXCLUDED."aggregate_id"
      AND "sync_events"."aggregate_version"
        IS NOT DISTINCT FROM EXCLUDED."aggregate_version"
      AND "sync_events"."source_event_id"
        IS NOT DISTINCT FROM EXCLUDED."source_event_id"
      AND "sync_events"."payload" = EXCLUDED."payload"
    RETURNING
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
  `);

  const event = rows[0];
  if (!event) {
    throw new Error("SYNC_EVENT_IDEMPOTENCY_COLLISION");
  }

  return event;
}