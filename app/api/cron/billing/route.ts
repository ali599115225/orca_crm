// app/api/cron/billing/route.ts
// ⏰ Cron Job - فحص الاشتراكات المنتهية يومياً
// يُشغَّل تلقائياً عبر Vercel Cron أو Upstash QStash كل يوم في الفجر

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendAdminEmailAlert } from "@/lib/email";

// مفتاح التحقق من طلبات Cron (يُخزَّن في Vercel env vars)
const CRON_SECRET = process.env.CRON_SECRET || "cron_secret_orca_2026";

export async function GET(request: NextRequest) {
  // التحقق من المصدر الموثوق
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const results = {
      suspended: 0,
      warned: 0,
      usageResets: 0,
      errors: [] as string[],
    };

    // ===================================================
    // 1. تعليق الشركات المنتهية الاشتراك
    // ===================================================
    const expiredTenants = await prisma.tenant.findMany({
      where: {
        isActive: true,
        subscriptionExpiresAt: { lt: now },
      },
      include: {
        users: { where: { role: "ADMIN" }, take: 1 },
      },
    });

    for (const tenant of expiredTenants) {
      try {
        await prisma.tenant.update({
          where: { id: tenant.id },
          data: { isActive: false, paymentStatus: "UNPAID" },
        });
        results.suspended++;
      } catch (err: any) {
        results.errors.push(`فشل تعليق ${tenant.companyName}: ${err.message}`);
      }
    }

    // ===================================================
    // 2. تحذير الشركات التي ستنتهي خلال 3 أيام
    // ===================================================
    const warningDate = new Date();
    warningDate.setDate(now.getDate() + 3);

    const expiringTenants = await prisma.tenant.findMany({
      where: {
        isActive: true,
        subscriptionExpiresAt: {
          gte: now,
          lte: warningDate,
        },
      },
    });

    for (const tenant of expiringTenants) {
      results.warned++;
    }

    // ===================================================
    // 3. إعادة تعيين عدادات الاستخدام الشهرية
    // ===================================================
    const resetMeters = await prisma.usageMeter.updateMany({
      where: { resetAt: { lte: now } },
      data: {
        usageValue: 0,
        resetAt: new Date(now.getFullYear(), now.getMonth() + 1, 1),
      },
    });
    results.usageResets = resetMeters.count;

    // ===================================================
    // 4. إرسال تقرير يومي للمشرف
    // ===================================================
    const emailHtml = `
      <div style="font-family: 'Cairo', 'Inter', Arial, sans-serif; direction: rtl; text-align: right; padding: 25px; background: #0f172a; color: #e2e8f0; border-radius: 12px;">
        <h2 style="color: #f59e0b; border-bottom: 1px solid #f59e0b30; padding-bottom: 12px;">
          ⏰ تقرير Cron Job اليومي - الوكيل سند
        </h2>
        <p style="color: #94a3b8; font-size: 12px;">وقت التشغيل: ${now.toLocaleString("ar-SA", { timeZone: "Asia/Riyadh" })}</p>
        <div style="background: #1e293b; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p>🚫 <strong>شركات معلقة:</strong> ${results.suspended}</p>
          <p>⚠️ <strong>شركات تحذيرية (تنتهي خلال 3 أيام):</strong> ${results.warned}</p>
          <p>🔄 <strong>عدادات استخدام تمت إعادة تعيينها:</strong> ${results.usageResets}</p>
          ${results.errors.length > 0 ? `<p style="color: #ef4444;">❌ أخطاء: ${results.errors.join(", ")}</p>` : ""}
        </div>
        <p style="font-size: 10px; color: #475569; text-align: center;">تقرير آلي من ORCA CRM Cron System</p>
      </div>
    `;

    await sendAdminEmailAlert("⏰ تقرير Cron اليومي - سند", emailHtml);

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      ...results,
    });
  } catch (error: any) {
    console.error("Cron Job Error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
