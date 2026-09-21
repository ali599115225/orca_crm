import { NextRequest, NextResponse } from "next/server";

import { rateLimit } from "@/lib/rate-limit";
import { reconcileStaleHeartbeats } from "@/lib/sentinel/heartbeat";

export async function GET(request: NextRequest) {
  const CRON_SECRET = process.env.CRON_SECRET;
  if (!CRON_SECRET) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = await rateLimit("cron:sentinel-heartbeats", 1, 300000);
  if (!rl.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: "Rate limited",
        retryAfter: Math.ceil(rl.resetIn / 1000),
      },
      { status: 429 },
    );
  }

  try {
    const result = await reconcileStaleHeartbeats();
    if (!result.success) {
      return NextResponse.json(result, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Sentinel heartbeat reconciliation cron failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Sentinel heartbeat reconciliation failed",
      },
      { status: 500 },
    );
  }
}
