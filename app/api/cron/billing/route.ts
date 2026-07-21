import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { getLegacySaasCapability } from "@/lib/platform-operating-model";

/**
 * Compatibility endpoint for the retired SaaS subscription billing schedule.
 *
 * Authentication and rate limiting remain in place while deployed schedules
 * drain, but the endpoint performs no database mutation, provider call,
 * password change, notification, lease renewal, or subscription processing.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 },
    );
  }

  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = await rateLimit("cron:billing", 1, 300_000);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  return NextResponse.json({
    success: true,
    skipped: true,
    ...getLegacySaasCapability("BILLING_CRON"),
    message:
      "SaaS subscription billing automation is disabled for the single-company platform.",
  });
}
