// app/api/cron/billing/route.ts
// ⏰ Cron Job - فحص الاشتراكات المنتهية يومياً
// يُشغَّل تلقائياً عبر Vercel Cron أو Upstash QStash كل يوم في الفجر

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendAdminEmailAlert } from "@/lib/email";
import { sendSMSNotification } from "@/lib/notifications";

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
      renewedLeases: 0,
      expiredLeases: 0,
      growthWarnings: 0,
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
    // 3.5 معالجة عقود الاستئجار المنتهية للوكلاء المؤقتين
    // ===================================================
    const expiredLeases = await prisma.agentLease.findMany({
      where: {
        endDate: { lt: now }
      }
    });

    for (const lease of expiredLeases) {
      try {
        if (lease.autoRenewal) {
          // الخيار الأول (مضاعفة السعر): تجديد العقد لشهر آخر ومضاعفة السعر
          const newPrice = Number(lease.leasePrice) * 2;
          const newStartDate = new Date(now);
          const newEndDate = new Date();
          newEndDate.setDate(newStartDate.getDate() + 30);

          await prisma.agentLease.update({
            where: { id: lease.id },
            data: {
              startDate: newStartDate,
              endDate: newEndDate,
              leasePrice: newPrice
            }
          });

          // توثيق التجديد التلقائي في سجل التدقيق
          await prisma.auditLog.create({
            data: {
              tenantId: lease.tenantId,
              action: "AGENT_LEASE_AUTO_RENEWED",
              tableName: "agent_leases",
              recordId: lease.id,
              details: `تم تجديد عقد استئجار الوكيل ${lease.agentId} تلقائياً لمدة 30 يوماً إضافية بسعر مضاعف: ${newPrice} SAR.`
            }
          });

          results.renewedLeases++;
        } else {
          // الخيار الثاني والثالث: إرسال إشعار الترقية الإجبارية وإيقاف الصلاحية (الإيقاف يتم تلقائياً بانتهاء التاريخ)
          const alertMessage = `لقد انتهت فترة وكيلك المخصص (${lease.agentId}). لضمان استمرارية الأداء، يمكنك الترقية للباقة الأعلى (للحصول على الوكيل بشكل دائم) أو تجديد العقد الحالي بسعر مضاعف.`;
          
          // إرسال الإشعار النصي لجوال المدير
          const clientMobile = "+966557516311";
          await sendSMSNotification(clientMobile, alertMessage);

          // توثيق انتهاء العقد وإيقاف صلاحية الوكيل في سجل التدقيق
          await prisma.auditLog.create({
            data: {
              tenantId: lease.tenantId,
              action: "AGENT_LEASE_EXPIRED",
              tableName: "agent_leases",
              recordId: lease.id,
              details: `انتهى عقد استئجار الوكيل ${lease.agentId} وتم سحب الصلاحيات لعدم تفعيل التجديد التلقائي. تم إرسال تنبيه SMS للعميل.`
            }
          });

          results.expiredLeases++;
        }
      } catch (err: any) {
        results.errors.push(`فشل معالجة عقد استئجار الوكيل ${lease.agentId} للمنشأة ${lease.tenantId}: ${err.message}`);
      }
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

    for (const lease of leasesExpiringIn3Days) {
      try {
        const adminName = lease.tenant.users[0]?.name || "شريكنا العزيز";
        const platformName = lease.tenant.platformConnections[0]?.platform || "Meta Ads";
        const leadsCount = await prisma.lead.count({ where: { tenantId: lease.tenantId } });
        const plan = (lease.tenant.subscriptionPlan || "basic").toLowerCase();
        const powerPercent = plan === 'basic' ? '20' : '60';
        const agentName = lease.agentId;
        const cacReduction = "35";

        const messageText = `أهلاً ${adminName}، أقوم الآن بمراجعة دورية لأداء حملاتك عبر ${platformName}. بصفتي وكيلك الرقمي، من واجبي مشاركتك هذه الأرقام:

📉 حالة الأداء:
لقد نجحنا في جذب ${leadsCount} عميل محتمل هذا الشهر. ولكن لاحظت وجود فرص بيعية غير مكتملة بسبب تأخر المتابعة أو غياب الأتمتة المتقدمة.

💡 التحليل المنطقي:

فرصة ضائعة: بقاءك في هذه الباقة يعني أنك تكتفي بـ ${powerPercent}% فقط من قدرة المحرك التسويقي.

تكلفة التوقف: التخلي عن ${agentName} الآن سيؤدي إلى انقطاع تدفق العملاء المحتملين الذي بنيناه.

أقترح عليك خيارين للنمو:

الاستمرار بذكاء (تجديد استئجار الوكيل).

القفزة الاستراتيجية (الترقية للباقة الماسية لتفعيل كافة الوكلاء وإغلاق الفجوات البيعية).

بناءً على أرقامك، الترقية للماسة ستخفض تكلفة استحواذ العميل بنسبة ${cacReduction}%.

هل تود مني عرض سيناريو الأرباح المتوقع؟
[رابط: أريد رؤية السيناريو] ➔ https://${lease.tenant.subdomain}.orca.az-ez.pro/operations?tab=growth&action=view-scenario
[رابط: تمديد الاستئجار] ➔ https://${lease.tenant.subdomain}.orca.az-ez.pro/operations?tab=growth&action=renew-lease`;

        // إرسال الإشعار النصي لجوال المدير كقالب منصور
        const clientMobile = "+966557516311";
        await sendSMSNotification(clientMobile, messageText);

        // توثيق التنبيه في سجل التدقيق
        await prisma.auditLog.create({
          data: {
            tenantId: lease.tenantId,
            action: "MANSOUR_EXPIRY_ALERT_SENT",
            tableName: "agent_leases",
            recordId: lease.id,
            details: `أرسل الوكيل منصور رسالة تنبيه بقرب انتهاء عقد الوكيل ${lease.agentId} للعميل عبر الواتساب/SMS.`
          }
        });

      } catch (err: any) {
        results.errors.push(`فشل إرسال تنبيه منصور لعقد الوكيل ${lease.agentId} للمنشأة ${lease.tenantId}: ${err.message}`);
      }
    }

    // ===================================================
    // 3.8 نظام مراقبة النمو العالمي (Universal Growth Monitor)
    // ===================================================
    const activeTenants = await prisma.tenant.findMany({
      where: { isActive: true }
    });

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

        // جلب الإحصاءات الفعلية
        const staffCount = await prisma.user.count({ where: { tenantId: tenant.id } });
        const leadsCount = await prisma.lead.count({ where: { tenantId: tenant.id } });
        const projectsCount = await prisma.project.count({ where: { tenantId: tenant.id } });

        const staffUsage = staffCount / staffLimit;
        const leadsUsage = leadsCount / leadsLimit;
        const projectsUsage = projectsCount / projectsLimit;

        const maxUsage = Math.max(staffUsage, leadsUsage, projectsUsage);
        const triggerWarning = maxUsage >= 0.8;

        // تحديث حالة التحذير
        await prisma.tenant.update({
          where: { id: tenant.id },
          data: { growthWarning: triggerWarning }
        });

        if (triggerWarning) {
          results.growthWarnings++;
          const projectedDays = Math.max(1, Math.round((1 - maxUsage) * 15)) || 3;

          // قالب الرسالة الموحد (The Growth Template)
          const messageText = `أهلاً ${tenant.companyName || "شريكنا العزيز"}، بصفتي وكيلك الرقمي، لاحظت أننا استهلكنا 80% من سعة ${planNameAr} الحالية. إذا استمر هذا التدفق، سنصل للسقف المحدود خلال ${projectedDays} يوم.

💡 الحل الأذكى للنمو:

استئجار وكيل إضافي (400 ر.س): لاستيعاب الزيادة فوراً دون تغيير باقتك.

الترقية للباقة الأعلى: لرفع سعة النظام بالكامل (العملاء، المشاريع، الموظفين) وإنهاء أي قيود.

[زر: استئجار وكيل] ➔ https://${tenant.subdomain}.orca.az-ez.pro/operations?tab=agents
[زر: عرض تفاصيل الترقية] ➔ https://${tenant.subdomain}.orca.az-ez.pro/operations?tab=settings`;

          // إرسال تنبيه منصور للعميل
          const clientMobile = "+966557516311";
          await sendSMSNotification(clientMobile, messageText);

          // توثيق التفاعل في سجل التدقيق
          await prisma.auditLog.create({
            data: {
              tenantId: tenant.id,
              action: "GROWTH_MONITOR_ALERT_SENT",
              tableName: "tenants",
              recordId: tenant.id,
              details: `تم تفعيل تحذير النمو الموحد للعميل. سعة الاستهلاك تجاوزت 80% (سعة: ${Math.round(maxUsage * 100)}%). تم إرسال قالب المتابعة عبر منصور.`
            }
          });
        }
      } catch (err: any) {
        results.errors.push(`فشل تشغيل مراقب النمو للمنشأة ${tenant.id}: ${err.message}`);
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
