import type { Prisma } from "@prisma/client";

import type { SyncTopic } from "@/lib/realtime/topics";

export const SYNC_EVENT_RETENTION_DAYS = 14;
export const SYNC_EVENT_MAX_PAYLOAD_BYTES = 8 * 1024;
export const SYNC_EVENT_DEFAULT_PAGE_SIZE = 100;
export const SYNC_EVENT_MAX_PAGE_SIZE = 500;

export type SyncEventPayload = {
  changedFields?: string[];
  status?: string;
  previousStatus?: string;
  source?: string;
  actorUserId?: string;
  relatedIds?: string[];
};

export interface PublishSyncEventInput {
  tenantId: string;
  topic: SyncTopic;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  aggregateVersion?: number | null;
  sourceEventId?: string | null;
  idempotencyKey: string;
  payload?: SyncEventPayload;
}

export interface StoredSyncEvent {
  id: string;
  cursor: bigint;
  tenantId: string;
  topic: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  aggregateVersion: number | null;
  sourceEventId: string | null;
  idempotencyKey: string;
  payload: Prisma.JsonValue;
  createdAt: Date;
  expiresAt: Date;
}

export interface SerializedSyncEvent
  extends Omit<StoredSyncEvent, "cursor" | "createdAt" | "expiresAt"> {
  cursor: string;
  createdAt: string;
  expiresAt: string;
}

export interface SyncEventPage {
  events: StoredSyncEvent[];
  nextCursor: bigint;
  hasMore: boolean;
}

export function serializeSyncEvent(event: StoredSyncEvent): SerializedSyncEvent {
  return {
    ...event,
    cursor: event.cursor.toString(),
    createdAt: event.createdAt.toISOString(),
    expiresAt: event.expiresAt.toISOString(),
  };
}