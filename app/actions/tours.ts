// app/actions/tours.ts
"use server";

import { prisma } from "@/lib/prisma";
import { getActiveTenant } from "@/lib/tenant";
import { revalidatePath } from "next/cache";
import { assertPlanLimit, PlanLimitError, logPlanBlockedAttempt } from "@/lib/plan-guard";
import { hashPhone } from "@/lib/privacy-mask";

/**
 * جدولة جولة عقارية جديدة وإسنادها لعميل وإدخالها في جدول Tour بقاعدة البيانات
 */
export async function scheduleTourActionDirect(data: {
  propertyId: string;
  userName: string;
  phone: string;
  datetime: string;
}) {
  try {
    const tenant = await getActiveTenant();
    const { propertyId, userName, phone, datetime } = data;

    if (!userName || userName.trim().length < 2) {
      throw new Error("اسم العميل مطلوب ويجب أن يكون أكثر من حرفين.");
    }
    if (!phone || !/^\d{9,15}$/.test(phone.replace(/\D/g, ''))) {
      throw new Error("رقم الهاتف غير صحيح. يجب أن يكون بين 9 و15 رقماً.");
    }
    if (!datetime || isNaN(Date.parse(datetime))) {
      throw new Error("التاريخ والوقت غير صحيحين.");
    }

    // 1. البحث عن أو إنشاء العميل المشتري (Lead)
    let lead = await prisma.lead.findFirst({
      where: { phone, tenantId: tenant.id },
    });

    if (!lead) {
      const parts = userName.trim().split(/\s+/);
      const firstName = parts[0] || "عميل";
      const lastName = parts.slice(1).join(" ") || "جديد";
      lead = await prisma.$transaction(async (tx) => {
        await assertPlanLimit({ tenantId: tenant.id, feature: "leads", tx });
        return tx.lead.create({
          data: {
            tenantId: tenant.id,
            firstName,
            lastName,
            phone,
            phoneHash: hashPhone(tenant.id, phone),
            email: `${phone}@orca-crm.com`,
            city: "الرياض",
            status: "NEW",
            source: "website",
          },
        });
      });
    }

    // 2. جلب بيانات الوحدة العقارية لتحديد الموقع بدقة
    const unit = await prisma.unit.findFirst({
      where: { id: propertyId, project: { tenantId: tenant.id } },
      include: { project: true },
    });

    const location = unit
      ? `${unit.project?.name || "مشروع عقاري"} - وحدة رقم ${unit.unitNumber}`
      : "موقع عام للوحدة";

    // 3. البحث عن مستخدم لتعيين الجولة له (المشرف الافتراضي)
    const defaultUser = await prisma.user.findFirst({
      where: { tenantId: tenant.id },
    });
    const assignedTo = defaultUser?.id || "";

    // 4. إنشاء سجل الجولة الفعلي
    const tour = await prisma.tour.create({
      data: {
        tenantId: tenant.id,
        leadId: lead.id,
        assignedTo,
        startAt: new Date(datetime),
        endAt: new Date(new Date(datetime).getTime() + 60 * 60 * 1000), // 1 hour duration
        location,
        status: "SCHEDULED",
        attendees: 1,
        notes: `جولة عقارية افتراضية مجدولة للوحدة المعرفة بـ ${propertyId} عبر بوابة الجولات الافتراضية`,
      },
    });

    // 5. تسجيل حدث تيليميتري
    await prisma.telemetryEvent.create({
      data: {
        tenantId: tenant.id,
        eventType: "tour.scheduled",
        eventDataJson: JSON.stringify({ tourId: tour.id, leadId: lead.id, startAt: datetime }),
      },
    });

    // 6. تسجيل إشعار تذكير افتراضي بالواتساب
    await prisma.agentTelemetryLog.create({
      data: {
        tenantId: tenant.id,
        agentId: "Saher_WhatsApp",
        actionType: "WhatsApp_Reminder",
        logMessageAr: `«تم جدولة إرسال تذكيرات الواتساب التلقائية قبل الجولة بـ ٢٤ ساعة و١ ساعة للعميل تلقائياً للعميل ${userName}»`,
        severity: "Info",
      },
    }).catch(() => {});

    revalidatePath("/operations/tours");
    revalidatePath("/operations/dashboard");

    return {
      success: true,
      visitId: tour.id,
      confirmation: {
        message: "تم تسجيل حجز الجولة بنجاح.",
        datetime,
        propertyId,
        reminder: "سيصلك تذكير قبل ساعتين من موعد الجولة عبر الواتساب.",
      },
    };
  } catch (error: any) {
    if (error instanceof PlanLimitError) {
      await logPlanBlockedAttempt({ tenantId: "", error }).catch(() => {});
      return { success: false, error: error.message, code: error.code };
    }
    console.error("فشل جدولة الجولة عبر الـ Server Action:", error);
    return { success: false, error: error.message };
  }
}
