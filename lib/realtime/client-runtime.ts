export const REALTIME_SYNC_EVENT = "orca:realtime-sync";
export const REALTIME_SYNC_CHANNEL = "orca:realtime-sync:v1";

export interface ClientSyncEvent extends Record<string, unknown> {
  cursor: string;
  topic: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
}

export interface ClientSyncPage {
  events: ClientSyncEvent[];
  nextCursor: string;
  hasMore: boolean;
  resetRequired: boolean;
}

export interface RealtimePeer {
  id: string;
  visible: boolean;
  lastSeenAt: number;
}

function isCursor(value: unknown): value is string {
  return typeof value === "string" && /^\d+$/.test(value);
}

export function compareCursor(left: string, right: string): number {
  const leftValue = BigInt(left);
  const rightValue = BigInt(right);
  if (leftValue < rightValue) return -1;
  if (leftValue > rightValue) return 1;
  return 0;
}

export function maxCursor(left: string, right: string): string {
  return compareCursor(left, right) >= 0 ? left : right;
}

export function filterEventsAfter(
  events: ClientSyncEvent[],
  cursor: string,
): ClientSyncEvent[] {
  return events.filter((event) => compareCursor(event.cursor, cursor) > 0);
}

export function selectRealtimeLeader(
  peers: Iterable<RealtimePeer>,
  now: number,
  ttlMs: number,
): string | null {
  const eligible = Array.from(peers)
    .filter((peer) => peer.visible && now - peer.lastSeenAt <= ttlMs)
    .sort((left, right) => left.id.localeCompare(right.id));

  return eligible[0]?.id ?? null;
}

export function retryDelayMs(failureCount: number): number {
  const normalized = Math.max(1, Math.trunc(failureCount));
  return Math.min(2_000 * 2 ** (normalized - 1), 30_000);
}

export function parseClientSyncPage(value: unknown): ClientSyncPage {
  if (!value || typeof value !== "object") {
    throw new Error("Invalid sync response");
  }

  const candidate = value as Record<string, unknown>;
  if (
    !Array.isArray(candidate.events) ||
    !isCursor(candidate.nextCursor) ||
    typeof candidate.hasMore !== "boolean" ||
    typeof candidate.resetRequired !== "boolean"
  ) {
    throw new Error("Invalid sync response");
  }

  const events = candidate.events.map((entry) => {
    if (!entry || typeof entry !== "object") {
      throw new Error("Invalid sync event");
    }

    const event = entry as Record<string, unknown>;
    if (
      !isCursor(event.cursor) ||
      typeof event.topic !== "string" ||
      typeof event.eventType !== "string" ||
      typeof event.aggregateType !== "string" ||
      typeof event.aggregateId !== "string"
    ) {
      throw new Error("Invalid sync event");
    }

    return event as ClientSyncEvent;
  });

  for (let index = 1; index < events.length; index += 1) {
    if (compareCursor(events[index - 1].cursor, events[index].cursor) >= 0) {
      throw new Error("Sync events must be strictly ordered");
    }
  }

  return {
    events,
    nextCursor: candidate.nextCursor,
    hasMore: candidate.hasMore,
    resetRequired: candidate.resetRequired,
  };
}