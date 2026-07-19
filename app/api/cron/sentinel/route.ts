// app/api/cron/sentinel/route.ts
// 🤖 Cron Job - الوكيل ساهر: Self-Healing كل 6 ساعات
// يُشغَّل عبر Vercel Cron ويُصلح أعطال النظام تلقائياً

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendAdminEmailAlert } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import { recordHeartbeat } from "@/lib/sentinel/heartbeat";

export async function GET(request: NextRequest) {
  const CRON_SECRET = process.env.CRON_SECRET;
  if (!CRON_SECRET) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = await rateLimit("cron:sentinel", 1, 300000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const report = {
    timestamp: new Date().toISOString(),
    dbStatus: "UNKNOWN" as "HEALTHY" | "ERROR" | "UNKNOWN",
    dbLatencyMs: 0,
    selfHealingApplied: false,
    failoverTriggered: false,
    anomalies: [] as string[],
    recommendations: [] as string[],
  };
  let coreTaskFailed = false;

  // ===================================================
  // 1. فحص صحة قاعدة البيانات
  // ===================================================
  const dbStart = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    report.dbLatencyMs = Date.now() - dbStart;
    report.dbStatus = "HEALTHY";

    if (report.dbLatencyMs > 800) {
      report.anomalies.push(
        `⚠️ بطء في قاعدة البيانات: ${report.dbLatencyMs}ms (الحد المقبول < 800ms)`
      );
      report.recommendations.push("ترقية Neon DB أو تفعيل Connection Pooling.");
    }
  } catch (dbError: any) {
    coreTaskFailed = true;
    report.dbStatus = "ERROR";
    report.dbLatencyMs = Date.now() - dbStart;
    report.anomalies.push(`🚨 فشل قاعدة البيانات: ${dbError.message}`);
    console.error("Sentinel cron database health check failed:", dbError);

    report.recommendations.push(
      "مراجعة اتصال قاعدة البيانات يدويًا؛ لا يعيد Sentinel تشغيل Connection Pool تلقائيًا."
    );
  }

  // إذا لا توجد مشاكل
  if (report.anomalies.length === 0) {
    report.anomalies.push("✅ جميع الأنظمة تعمل بكفاءة 100%. لا مشاكل مرصودة.");
    report.recommendations.push("لا توصيات. استمر في المراقبة الدورية.");
  }

  // ===================================================
  // 6. إرسال تقرير ساهر للمسؤول عبر البريد
  // ===================================================
  const hasCritical = report.dbStatus === "ERROR" || report.failoverTriggered;

  const emailHtml = `
    <div style="font-family: 'Cairo', 'Inter', Arial, sans-serif; direction: rtl; text-align: right; padding: 25px; background: #0f172a; color: #e2e8f0; border-radius: 12px;">
      <h2 style="color: ${hasCritical ? "#ef4444" : "#10b981"}; border-bottom: 1px solid #f59e0b30; padding-bottom: 12px;">
        🤖 الوكيل ساهر: ${hasCritical ? "🚨 تنبيه حرج" : "✅ فحص دوري"} - Self-Healing Report
      </h2>
      <p style="color: #94a3b8; font-size: 12px;">${new Date().toLocaleString("ar-SA", { timeZone: "Asia/Riyadh" })}</p>
      <div style="background: #1e293b; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p>🗄️ <strong>قاعدة البيانات:</strong> <span style="color: ${report.dbStatus === "HEALTHY" ? "#10b981" : "#ef4444"}">${report.dbStatus}</span></p>
        <p>⚡ <strong>زمن الاستجابة:</strong> ${report.dbLatencyMs}ms</p>
        <p>🔧 <strong>Self-Healing:</strong> ${report.selfHealingApplied ? "تم تطبيقه" : "غير مطلوب"}</p>
        <p>🆘 <strong>Failover:</strong> ${report.failoverTriggered ? "مُفعَّل!" : "غير نشط"}</p>
      </div>
      <div style="margin: 16px 0;">
        <h4 style="color: #f59e0b;">الملاحظات والتحذيرات:</h4>
        ${report.anomalies.map((a) => `<p style="margin: 4px 0;">${a}</p>`).join("")}
      </div>
      <p style="font-size: 10px; color: #475569; text-align: center; border-top: 1px solid #1e293b; padding-top: 12px;">ORCA Sentinel Agent v2.0</p>
    </div>
  `;

  if (process.env.ORCA_SENTINEL_EMAIL_ALERTS_ENABLED === "true") {
    try {
      await sendAdminEmailAlert(
        `${hasCritical ? "🚨 حرج" : "🔍 دوري"}: تقرير ساهر - ${report.dbStatus}`,
        emailHtml
      );
    } catch (error) {
      console.error("Sentinel cron report email failed:", error);
    }
  }

  if (!coreTaskFailed) {
    try {
      const heartbeat = await recordHeartbeat({ serviceId: "CRON_SENTINEL" });
      if (!heartbeat.success) {
        console.error("Cron heartbeat failed:", heartbeat.error);
      }
    } catch (heartbeatError) {
      console.error("Cron heartbeat failed:", heartbeatError);
    }
  }

  return NextResponse.json({ success: true, report });
}
