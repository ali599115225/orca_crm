// app/api/cron/installments/route.ts
// ⏰ Cron Job - الوكيل سند: فحص وتحصيل الأقساط العقارية يومياً
// يُشغَّل تلقائياً عبر Vercel Cron أو Upstash QStash كل يوم في الفجر

import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { runInstallmentAgentInternal } from "@/lib/server/internal";
import { rateLimit } from "@/lib/rate-limit";
import { recordHeartbeat } from "@/lib/sentinel/heartbeat";

function isAuthorizedCronRequest(authHeader: string | null, secret: string): boolean {
  if (!authHeader?.startsWith("Bearer ")) return false;

  const expected = `Bearer ${secret}`;
  const providedBuffer = Buffer.from(authHeader);
  const expectedBuffer = Buffer.from(expected);
  const length = Math.max(providedBuffer.length, expectedBuffer.length);
  const provided = Buffer.alloc(length);
  const expectedValue = Buffer.alloc(length);

  providedBuffer.copy(provided);
  expectedBuffer.copy(expectedValue);

  return providedBuffer.length === expectedBuffer.length && timingSafeEqual(provided, expectedValue);
}

export async function GET(request: NextRequest) {
  const CRON_SECRET = process.env.CRON_SECRET;
  if (!CRON_SECRET?.trim()) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  const authHeader = request.headers.get("authorization");
  if (!isAuthorizedCronRequest(authHeader, CRON_SECRET)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const rl = await rateLimit("cron:sanad-installments", 1, 300000, true);
  if (!rl.allowed) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  try {
    const result = await runInstallmentAgentInternal();
    if (result.success) {
      try {
        const heartbeat = await recordHeartbeat({ serviceId: "CRON_SANAD_INSTALLMENTS" });
        if (!heartbeat.success) {
          console.error("Cron heartbeat failed:", heartbeat.error);
        }
      } catch (heartbeatError) {
        console.error("Cron heartbeat failed:", heartbeatError);
      }

      return NextResponse.json({
        ok: true,
        processed: result.processedCount ?? 0,
        failed: 0,
      });
    }

    console.error("Installment Cron Job failed");
    return NextResponse.json({ ok: false }, { status: 500 });
  } catch (error: any) {
    console.error("Installment Cron Job Exception");
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
