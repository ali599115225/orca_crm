// app/actions/errorAgent.ts
"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { sendAdminEmailAlert } from "@/lib/email";
import { checkAndSuspendExpiredTenantsInternal } from "@/lib/server/internal";
import { revalidatePath } from "next/cache";

/**
 * تقرير أداء وفحص النظام الشامل بواسطة الوكيل "ساهر"
 */
export interface DiagnosticsReport {
  timestamp: string;
  databaseStatus: "HEALTHY" | "ERROR";
  databaseError: string | null;
  sslMode: string;
  openTicketsCount: number;
  expiredTenantsCount: number;
  totalTenantsCount: number;
  anomalies: string[];
  recommendations: string[];
}

/**
 * 🤖 الوكيل ساهر (Watchdog & Error Tracker)
 * يقوم بفحص صحة النظام، الأخطاء، سلامة اتصال قاعدة البيانات، وتنبيه الإدارة بالبريد الإلكتروني
 */
export async function saherTrackSystemErrorsAction(): Promise<DiagnosticsReport> {
  const anomalies: string[] = [];
  const recommendations: string[] = [];
  let dbStatus: "HEALTHY" | "ERROR" = "HEALTHY";
  let dbError: string | null = null;
  let openTicketsCount = 0;
  let expiredTenantsSuspended = 0;
  let totalTenantsCount = 0;

  try {
    // 1. فحص الاتصال بقاعدة البيانات وسرعة الاستجابة
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const latency = Date.now() - start;
    
    if (latency > 500) {
      anomalies.push(`⚠️ بطء في استجابة قاعدة البيانات السحابية: زمن الاستجابة ${latency} ملي ثانية.`);
      recommendations.push("مراقبة أداء Neon أو ترقية سعة خادم قاعدة البيانات في Neon.");
    }
  } catch (error: any) {
    dbStatus = "ERROR";
    dbError = error.message;
    anomalies.push(`🚨 فشل الاتصال بقاعدة البيانات السحابية: ${error.message}`);
    recommendations.push("التحقق من حالة DATABASE_URL في متغيرات البيئة واستجابة خوادم Neon.");
  }

  // 2. التحقق من سلامة وضع الـ SSL في الاتصال لمنع الاختراق أو التحذيرات
  const dbUrl = process.env.DATABASE_URL || "";
  let sslMode = "غير محدد";
  if (dbUrl.includes("sslmode=")) {
    const match = dbUrl.match(/sslmode=([^&]+)/);
    sslMode = match ? match[1] : "غير محدد";
  }

  if (sslMode !== "verify-full") {
    anomalies.push(`⚠️ وضع الاتصال SSL بقاعدة البيانات هو (${sslMode}). غير آمن بالكامل ويسبب تحذيرات.`);
    recommendations.push("تعديل قيمة DATABASE_URL لتستخدم sslmode=verify-full لحماية قنوات نقل البيانات.");
  }

  // 3. فحص التذاكر المفتوحة (التي تمثل أخطاء ومشاكل يواجهها المطورون)
  try {
    openTicketsCount = await prisma.ticket.count({
      where: { status: "OPEN" }
    });

    if (openTicketsCount > 0) {
      anomalies.push(`📢 يوجد عدد ${openTicketsCount} تذاكر دعم فني مفتوحة ولم يتم حلها بعد.`);
      recommendations.push("الدخول إلى صفحة 'مراقبة الدعم والاشتراكات' لمعالجة استفسارات العملاء.");
    }
  } catch (e) {
    anomalies.push("❌ تعذر الاستعلام عن تذاكر الدعم الفني.");
  }

  // 4. تشغيل الوكيل "سند" لفحص وتعليق الاشتراكات المنتهية آلياً
  try {
    const suspendResult = await checkAndSuspendExpiredTenantsInternal();
    if (suspendResult.success && suspendResult.updatedCount) {
      expiredTenantsSuspended = suspendResult.updatedCount;
      anomalies.push(`⚡ الوكيل سند: تم رصد وإيقاف عدد ${expiredTenantsSuspended} شركات عقارية منتهية الاشتراك اليوم.`);
      recommendations.push("إشعار هذه الشركات بالدفع لتنشيط سحابتهم مرة أخرى.");
    }
  } catch (e) {
    anomalies.push("❌ تعذر تشغيل فحص الاشتراكات التابع للوكيل سند.");
  }

  // 5. فحص شذوذ البيانات (Anomalies Check)
  try {
    totalTenantsCount = await prisma.tenant.count();
    
    // رصد الشركات التي بها خاصية الواتساب مفعلة ولكن سعة وكلائها الإضافية 0
    const activeTenantsWithWhatsApp = await prisma.tenant.findMany({
      where: { whatsappConnected: true, extraAgents: 0 }
    });

    if (activeTenantsWithWhatsApp.length > 0) {
      anomalies.push(`🔍 رصد عدد ${activeTenantsWithWhatsApp.length} شركات متصلة بالواتساب ولكن سعة وكلائها صفر.`);
      recommendations.push("اقتراح ترقية باقة الوكلاء لهذه الشركات لزيادة سرعة استجابة المحادثات.");
    }
  } catch (e) {
    anomalies.push("❌ تعذر فحص شذوذ حسابات المشتركين.");
  }

  // إذا لم يتم العثور على مشاكل
  if (anomalies.length === 0) {
    anomalies.push("✅ لا توجد أي أخطاء أو مشاكل مرصودة في النظام حالياً.");
    recommendations.push("النظام يعمل بكفاءة 100% ولا توجد توصيات إضافية.");
  }

  const report: DiagnosticsReport = {
    timestamp: new Date().toLocaleString("ar-SA", { timeZone: "Asia/Riyadh" }),
    databaseStatus: dbStatus,
    databaseError: dbError,
    sslMode,
    openTicketsCount,
    expiredTenantsCount: expiredTenantsSuspended,
    totalTenantsCount,
    anomalies,
    recommendations
  };

  // 6. إشعار المالك والمسؤول عبر البريد الإلكتروني فوراً بتقرير ساهر
  const emailSubject = `🔍 تقرير فحص الأخطاء وصحة النظام - الوكيل ساهر`;
  const anomaliesListHtml = report.anomalies.map(a => `<li style="margin-bottom: 8px; color: ${a.includes('🚨') || a.includes('🚨') ? '#ef4444' : '#b45309'};">${a}</li>`).join("");
  const recommendationsListHtml = report.recommendations.map(r => `<li style="margin-bottom: 6px; color: #1e293b;">${r}</li>`).join("");

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right; padding: 25px; background-color: #f8fafc; border-radius: 16px;">
      <h2 style="color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; font-weight: 900;">
        🤖 الوكيل ساهر: فحص صحة النظام والأخطاء التشغيلية
      </h2>
      <p style="font-size: 13px; color: #64748b;">تاريخ الفحص: ${report.timestamp} (بتوقيت الرياض)</p>
      
      <div style="margin: 20px 0; background: #ffffff; padding: 15px; border-radius: 12px; border: 1px solid #e2e8f0;">
        <h4 style="margin-top: 0; color: #334155;">📊 مؤشرات النظام الأساسية:</h4>
        <ul style="list-style-type: none; padding-right: 0;">
          <li>🔒 <strong>حالة قاعدة البيانات:</strong> <span style="color: ${dbStatus === 'HEALTHY' ? '#10b981' : '#ef4444'}; font-weight: bold;">${dbStatus === 'HEALTHY' ? 'سليمة ومتصلة' : 'فشل اتصال'}</span></li>
          <li>🛡️ <strong>وضع تشفير SSL:</strong> ${sslMode}</li>
          <li>🎟️ <strong>تذاكر الدعم المفتوحة:</strong> ${openTicketsCount} تذكرة</li>
          <li>🏢 <strong>الشركات الكلية بالسحابة:</strong> ${totalTenantsCount} شركة</li>
        </ul>
      </div>

      <div style="margin: 20px 0;">
        <h4 style="color: #ef4444; margin-bottom: 8px;">🚨 الأخطاء والشواذ المرصودة:</h4>
        <ul style="padding-right: 20px;">
          ${anomaliesListHtml}
        </ul>
      </div>

      <div style="margin: 20px 0; background: #f0fdf4; padding: 15px; border-radius: 12px; border: 1px solid #bbf7d0;">
        <h4 style="color: #16a34a; margin-top: 0; margin-bottom: 8px;">💡 التوصيات المقترحة من الوكيل ساهر:</h4>
        <ul style="padding-right: 20px; margin-bottom: 0;">
          ${recommendationsListHtml}
        </ul>
      </div>
      
      <p style="font-size: 11px; color: #94a3b8; margin-top: 30px; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 10px;">
        تم توليد وإرسال هذا التنبيه آلياً بواسطة الوكيل الذكي ساهر لمنصة أوركا العقارية.
      </p>
    </div>
  `;

  await sendAdminEmailAlert(emailSubject, emailHtml);

  return report;
}

/**
 * ⚡ تشغيل جميع الوكلاء في النظام بالتوازي
 */
export async function runAllSystemAgentsAction() {
  try {
    const session = await getSession();
    if (!session) throw new Error("يجب تسجيل الدخول كمسؤول أولاً.");

    const isSuperAdmin = session.email === "ali.orca@outlook.sa" || session.email === "elite.orca@outlook.sa";
    if (!isSuperAdmin) throw new Error("غير مصرح لك بتشغيل الوكلاء.");

    // 1. تشغيل الوكيل ساهر لتتبع الأخطاء وفحص جدار الأمان وقاعدة البيانات
    const saherReport = await saherTrackSystemErrorsAction();

    // 2. إعادة تنشيط ذاكرة التخزين
    revalidatePath("/operations");

    return {
      success: true,
      message: "تم تفعيل وتشغيل جميع الوكلاء بنجاح وإرسال تقرير فحص الأخطاء للمشرفين العامين.",
      report: saherReport,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}
