// app/api/cron/installments/route.ts
// ⏰ Cron Job - الوكيل سند: فحص وتحصيل الأقساط العقارية يومياً
// يُشغَّل تلقائياً عبر Vercel Cron أو Upstash QStash كل يوم في الفجر

import { NextRequest, NextResponse } from "next/server";
import { runInstallmentAgentAction } from "@/app/actions/sanadAgent";

const CRON_SECRET = process.env.CRON_SECRET || "cron_secret_orca_2026";

export async function GET(request: NextRequest) {
  // التحقق من المصدر الموثوق للكرون
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runInstallmentAgentAction();
    if (result.success) {
      return NextResponse.json({
        success: true,
        timestamp: new Date().toISOString(),
        processedCount: result.processedCount,
        message: result.message,
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Installment Cron Job Exception:", error.message);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
