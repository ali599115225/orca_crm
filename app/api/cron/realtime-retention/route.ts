import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { purgeExpiredSyncEvents } from "@/lib/realtime/purge-sync-events";
import { recordHeartbeat } from "@/lib/sentinel/heartbeat";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const PURGE_BATCH_SIZE = 5_000;

function secretsEqual(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");

  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(actualBuffer, expectedBuffer);
}

function isAuthorized(request: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return false;
  }

  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return false;
  }

  return secretsEqual(authorization.slice("Bearer ".length), expected);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      {
        status: 401,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  try {
    const deleted = await purgeExpiredSyncEvents(PURGE_BATCH_SIZE);

    try {
      const heartbeat = await recordHeartbeat({ serviceId: "CRON_REALTIME_RETENTION" });
      if (!heartbeat.success) {
        console.error("Cron heartbeat failed:", heartbeat.error);
      }
    } catch (heartbeatError) {
      console.error("Cron heartbeat failed:", heartbeatError);
    }

    return NextResponse.json(
      {
        deleted,
        batchSize: PURGE_BATCH_SIZE,
        timestamp: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("realtime retention purge failed", error);
    return NextResponse.json(
      { error: "Retention purge failed" },
      {
        status: 500,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
