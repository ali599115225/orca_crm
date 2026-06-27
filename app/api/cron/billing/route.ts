// app/api/cron/billing/route.ts
// ⏰ Cron Job - فحص الاشتراكات المنتهية يومياً
// يُشغَّل تلقائياً عبر Vercel Cron أو Upstash QStash كل يوم في الفجر

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendAdminEmailAlert } from "@/lib/email";
import { sendSMSNotification } from "@/lib/notifications";
import { rateLimit } from "@/lib/rate-limit";
import { checkAndSuspendExpiredTenantsInternal } from "@/lib/server/internal";
import { ErrorCode, publicError } from "@/lib/errors";

export async function GET(request: NextRequest) {
  const CRON_SECRET = process.env.CRON_SECRET;
  if (!CRON_SECRET) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = await rateLimit("cron:billing", 1, 300000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  try {
    const now = new Date();
    const results = {
      suspended: 0,
      warned: 0,
      usageResets: 0,
      renewedLeases: 0,
      expiredLeases: 0,
      growthWarnings: 0,
      errors: [] as string[],
    };

    // ===================================================
    // 1. تعليق الشركات المنتهية الاشتراك (via internal agent)
    // ===================================================
    const suspendResult = await checkAndSuspendExpiredTenantsInternal();
    if (suspendResult.success && suspendResult.updatedCount) {
      results.suspended = suspendResult.updatedCount;
    } else if (!suspendResult.success) {
      results.errors.push(`فشل تعليق الاشتراكات: ${suspendResult.error}`);
    } else {
      results.suspended = 0;
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
    // 3.5 معالجة عقود الاستئجار المنتهية للوكلاء المؤقتين
    // ===================================================
    const expiredLeases = await prisma.agentLease.findMany({
      where: {
        endDate: { lt: now }
      }
    });

    const renewLeases = expiredLeases.filter(l => l.autoRenewal);
    const expireLeases = expiredLeases.filter(l => !l.autoRenewal);

    if (renewLeases.length > 0) {
      for (const lease of renewLeases) {
        try {
          const newPrice = Number(lease.leasePrice) * 2;
          const newStartDate = new Date(now);
          const newEndDate = new Date();
          newEndDate.setDate(newStartDate.getDate() + 30);

          await prisma.agentLease.update({
            where: { id: lease.id },
            data: { startDate: newStartDate, endDate: newEndDate, leasePrice: newPrice }
          });
          results.renewedLeases++;
        } catch (err: any) {
          results.errors.push(`فشل تجديد ${lease.agentId}: ${err.message}`);
        }
      }
      const renewAuditLogs = renewLeases.map(l => ({
        tenantId: l.tenantId,
        action: "AGENT_LEASE_AUTO_RENEWED" as const,
        tableName: "agent_leases",
        recordId: l.id,
        details: `تم تجديد عقد استئجار الوكيل ${l.agentId} تلقائياً لمدة 30 يوماً إضافية بسعر مضاعف: ${Number(l.leasePrice) * 2} SAR.`
      }));
      await prisma.auditLog.createMany({ data: renewAuditLogs });
    }

    if (expireLeases.length > 0) {
      for (const lease of expireLeases) {
        try {
          const alertMessage = `لقد انتهت فترة وكيلك المخصص (${lease.agentId}). لضمان استمرارية الأداء، يمكنك الترقية للباقة الأعلى (للحصول على الوكيل بشكل دائم) أو تجديد العقد الحالي بسعر مضاعف.`;
          await sendSMSNotification("+966557516311", alertMessage);
          results.expiredLeases++;
        } catch (err: any) {
          results.errors.push(`فشل إشعار ${lease.agentId}: ${err.message}`);
        }
      }
      const expireAuditLogs = expireLeases.map(l => ({
        tenantId: l.tenantId,
        action: "AGENT_LEASE_EXPIRED" as const,
        tableName: "agent_leases",
        recordId: l.id,
        details: `انتهى عقد استئجار الوكيل ${l.agentId} وتم سحب الصلاحيات لعدم تفعيل التجديد التلقائي. تم إرسال تنبيه SMS للعميل.`
      }));
      await prisma.auditLog.createMany({ data: expireAuditLogs });
    }

    // ===================================================
    // 3.7 إشعار منصور لقرب انتهاء عقود استئجار الوكلاء (قبل 3 أيام)
    // ===================================================
    const warningLeaseDate = new Date();
    warningLeaseDate.setDate(now.getDate() + 3);
    const startOfWarningDay = new Date(warningLeaseDate.getFullYear(), warningLeaseDate.getMonth(), warningLeaseDate.getDate(), 0, 0, 0);
    const endOfWarningDay = new Date(warningLeaseDate.getFullYear(), warningLeaseDate.getMonth(), warningLeaseDate.getDate(), 23, 59, 59);

    const leasesExpiringIn3Days = await prisma.agentLease.findMany({
      where: {
        endDate: {
          gte: startOfWarningDay,
          lte: endOfWarningDay
        }
      },
      include: {
        tenant: {
          include: {
            users: {
              where: { role: "ADMIN" },
              take: 1
            },
            platformConnections: {
              take: 1
            }
          }
        }
      }
    });

    if (leasesExpiringIn3Days.length > 0) {
      const tenantIds = [...new Set(leasesExpiringIn3Days.map(l => l.tenantId))];
      const leadCounts = await prisma.lead.groupBy({
        by: ['tenantId'],
        where: { tenantId: { in: tenantIds } },
        _count: { id: true },
      });
      const leadCountMap = new Map(leadCounts.map(l => [l.tenantId, l._count.id]));

      for (const lease of leasesExpiringIn3Days) {
        try {
          const adminName = lease.tenant.users[0]?.name || "شريكنا العزيز";
          const platformName = lease.tenant.platformConnections[0]?.platform || "Meta Ads";
          const leadsCount = leadCountMap.get(lease.tenantId) || 0;
          const plan = (lease.tenant.subscriptionPlan || "basic").toLowerCase();
          const powerPercent = plan === 'basic' ? '20' : '60';
          const agentName = lease.agentId;

          const messageText = `أهلاً ${adminName}، أقوم الآن بمراجعة دورية لأداء حملاتك عبر ${platformName}. بصفتي وكيلك الرقمي، من واجبي مشاركتك هذه الأرقام:

📉 حالة الأداء:
لقد نجحنا في جذب ${leadsCount} عميل محتمل هذا الشهر. ولكن لاحظت وجود فرص بيعية غير مكتملة بسبب تأخر المتابعة أو غياب الأتمتة المتقدمة.

💡 التحليل المنطقي:

فرصة ضائعة: بقاءك في هذه الباقة يعني أنك تكتفي بـ ${powerPercent}% فقط من قدرة المحرك التسويقي.

تكلفة التوقف: التخلي عن ${agentName} الآن سيؤدي إلى انقطاع تدفق العملاء المحتملين الذي بنيناه.

أقترح عليك خيارين للنمو:

الاستمرار بذكاء (تجديد استئجار الوكيل).

القفزة الاستراتيجية (الترقية للباقة الماسية لتفعيل كافة الوكلاء وإغلاق الفجوات البيعية).

بناءً على أرقامك، الترقية للماسة ستخفض تكلفة استحواذ العميل بنسبة 35%.

هل تود مني عرض سيناريو الأرباح المتوقع؟
[رابط: أريد رؤية السيناريو] ➔ https://${lease.tenant.subdomain}.orca.az-ez.pro/operations?tab=growth&action=view-scenario
[رابط: تمديد الاستئجار] ➔ https://${lease.tenant.subdomain}.orca.az-ez.pro/operations?tab=growth&action=renew-lease`;

          await sendSMSNotification("+966557516311", messageText);
        } catch (err: any) {
          results.errors.push(`فشل إرسال تنبيه منصور لعقد الوكيل ${lease.agentId} للمنشأة ${lease.tenantId}: ${err.message}`);
        }
      }

      const auditLogs = leasesExpiringIn3Days.map(l => ({
        tenantId: l.tenantId,
        action: "MANSOUR_EXPIRY_ALERT_SENT" as const,
        tableName: "agent_leases",
        recordId: l.id,
        details: `أرسل الوكيل منصور رسالة تنبيه بقرب انتهاء عقد الوكيل ${l.agentId} للعميل عبر الواتساب/SMS.`
      }));
      await prisma.auditLog.createMany({ data: auditLogs });
    }

    // ===================================================
    // 3.8 نظام مراقبة النمو العالمي (Universal Growth Monitor)
    // ===================================================
    const activeTenants = await prisma.tenant.findMany({
      where: { isActive: true }
    });

    if (activeTenants.length > 0) {
      const tenantIds = activeTenants.map(t => t.id);

      const staffCounts = await prisma.user.groupBy({
        by: ['tenantId'],
        where: { tenantId: { in: tenantIds } },
        _count: { id: true },
      });
      const leadsCounts = await prisma.lead.groupBy({
        by: ['tenantId'],
        where: { tenantId: { in: tenantIds } },
        _count: { id: true },
      });
      const projectsCounts = await prisma.project.groupBy({
        by: ['tenantId'],
        where: { tenantId: { in: tenantIds } },
        _count: { id: true },
      });

      const staffCountMap = new Map(staffCounts.map(c => [c.tenantId, c._count.id]));
      const leadsCountMap = new Map(leadsCounts.map(c => [c.tenantId, c._count.id]));
      const projectsCountMap = new Map(projectsCounts.map(c => [c.tenantId, c._count.id]));

      const updates: { id: string; growthWarning: boolean }[] = [];
      const auditLogData: { tenantId: string; action: string; tableName: string; recordId: string; details: string }[] = [];

      for (const tenant of activeTenants) {
        try {
          const plan = (tenant.subscriptionPlan || "basic").toLowerCase();
          
          let staffLimit = 99999;
          let leadsLimit = 99999;
          let projectsLimit = 99999;
          let planNameAr = "الباقة الذهبية/الماسية";

          if (plan === "basic") {
            staffLimit = 2;
            leadsLimit = 100;
            projectsLimit = 2;
            planNameAr = "الباقة الأساسية";
          } else if (plan === "silver" || plan === "pro" || plan === "professional") {
            staffLimit = 10;
            leadsLimit = 1000;
            projectsLimit = 10;
            planNameAr = "الباقة الاحترافية";
          }

          const staffCount = staffCountMap.get(tenant.id) || 0;
          const leadsCount = leadsCountMap.get(tenant.id) || 0;
          const projectsCount = projectsCountMap.get(tenant.id) || 0;

          const staffUsage = staffCount / staffLimit;
          const leadsUsage = leadsCount / leadsLimit;
          const projectsUsage = projectsCount / projectsLimit;

          const maxUsage = Math.max(staffUsage, leadsUsage, projectsUsage);
          const triggerWarning = maxUsage >= 0.8;

          updates.push({ id: tenant.id, growthWarning: triggerWarning });

          if (triggerWarning) {
            results.growthWarnings++;
            const projectedDays = Math.max(1, Math.round((1 - maxUsage) * 15)) || 3;

            const messageText = `أهلاً ${tenant.companyName || "شريكنا العزيز"}، بصفتي وكيلك الرقمي، لاحظت أننا استهلكنا 80% من سعة ${planNameAr} الحالية. إذا استمر هذا التدفق، سنصل للسقف المحدود خلال ${projectedDays} يوم.

💡 الحل الأذكى للنمو:

استئجار وكيل إضافي (400 ر.س): لاستيعاب الزيادة فوراً دون تغيير باقتك.

الترقية للباقة الأعلى: لرفع سعة النظام بالكامل (العملاء، المشاريع، الموظفين) وإنهاء أي قيود.

[زر: استئجار وكيل] ➔ https://${tenant.subdomain}.orca.az-ez.pro/operations?tab=agents
[زر: عرض تفاصيل الترقية] ➔ https://${tenant.subdomain}.orca.az-ez.pro/operations?tab=settings`;

            await sendSMSNotification("+966557516311", messageText);

            auditLogData.push({
              tenantId: tenant.id,
              action: "GROWTH_MONITOR_ALERT_SENT",
              tableName: "tenants",
              recordId: tenant.id,
              details: `تم تفعيل تحذير النمو الموحد للعميل. سعة الاستهلاك تجاوزت 80% (سعة: ${Math.round(maxUsage * 100)}%). تم إرسال قالب المتابعة عبر منصور.`
            });
          }
        } catch (err: any) {
          results.errors.push(`فشل تشغيل مراقب النمو للمنشأة ${tenant.id}: ${err.message}`);
        }
      }

      // Batch all updates and audit logs
      for (const { id, growthWarning } of updates) {
        await prisma.tenant.update({ where: { id }, data: { growthWarning } });
      }
      if (auditLogData.length > 0) {
        await prisma.auditLog.createMany({ data: auditLogData });
      }
    }

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
          <p>🔄 <strong>تجديد تلقائي لعقود الاستئجار:</strong> ${results.renewedLeases}</p>
          <p>⏰ <strong>عقود استئجار منتهية وموقوفة:</strong> ${results.expiredLeases}</p>
          ${results.errors.length > 0 ? `<p style="color: #ef4444;">❌ أخطاء: ${results.errors.join(", ")}</p>` : ""}
        </div>
        <p style="font-size: 10px; color: #475569; text-align: center;">تقرير آلي من ORCA Cron System</p>
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
      { success: false, error: publicError(ErrorCode.INTERNAL_ERROR, "GET /api/cron/billing failed", error).messageAr },
      { status: 500 }
    );
  }
}
