import { NextRequest, NextResponse } from "next/server";

import { getTenantAndUser } from "@/lib/api-helpers";
import {
  readSyncEventCursorWindow,
  readSyncEvents,
} from "@/lib/realtime/read-sync-events";
import {
  SYNC_EVENT_DEFAULT_PAGE_SIZE,
  SYNC_EVENT_MAX_PAGE_SIZE,
  serializeSyncEvent,
} from "@/lib/realtime/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
  Vary: "Cookie, Authorization",
};

function json(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: NO_STORE_HEADERS });
}

function parseCursor(raw: string | null): bigint {
  if (raw === null || raw === "") {
    return BigInt(0);
  }

  if (!/^\d+$/.test(raw)) {
    throw new Error("INVALID_CURSOR");
  }

  return BigInt(raw);
}

function parseLimit(raw: string | null): number {
  if (raw === null || raw === "") {
    return SYNC_EVENT_DEFAULT_PAGE_SIZE;
  }

  if (!/^\d+$/.test(raw)) {
    throw new Error("INVALID_LIMIT");
  }

  const limit = Number(raw);
  if (
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > SYNC_EVENT_MAX_PAGE_SIZE
  ) {
    throw new Error("INVALID_LIMIT");
  }

  return limit;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { tenantId, userId } = await getTenantAndUser(request);

  if (!tenantId || !userId) {
    return json({ error: "Unauthorized" }, 401);
  }

  const url = new URL(request.url);
  if (url.searchParams.has("tenantId") || url.searchParams.has("tenant_id")) {
    return json({ error: "tenantId must not be supplied by the client" }, 400);
  }

  let after: bigint;
  let limit: number;

  try {
    after = parseCursor(url.searchParams.get("after"));
    limit = parseLimit(url.searchParams.get("limit"));
  } catch {
    return json({ error: "Invalid sync cursor or limit" }, 400);
  }

  try {
    if (after > BigInt(0)) {
      const window = await readSyncEventCursorWindow(tenantId);
      if (
        window.oldestCursor !== null &&
        after < window.oldestCursor
      ) {
        return json({
          events: [],
          nextCursor: (window.newestCursor ?? after).toString(),
          hasMore: false,
          resetRequired: true,
        });
      }
    }

    const page = await readSyncEvents({ tenantId, after, limit });

    return json({
      events: page.events.map(serializeSyncEvent),
      nextCursor: page.nextCursor.toString(),
      hasMore: page.hasMore,
      resetRequired: false,
    });
  } catch (error) {
    console.error("sync events read failed", error);
    return json({ error: "Sync events unavailable" }, 500);
  }
}