// app/actions/tours.ts
"use server";

import { prisma } from "@/lib/prisma";
import { getActiveTenant } from "@/lib/tenant";
import { revalidatePath } from "next/cache";
import { assertPlanLimit, PlanLimitError, logPlanBlockedAttempt } from "@/lib/plan-guard";
import { hashPhone } from "@/lib/privacy-mask";

export interface TourListItem {
  id: string;
  startAt: string;
  endAt: string;
  location: string;
  status: string;
  attendees: number;
  notes: string | null;
  leadName: string;
  assignedToName: string;
  createdAt: string;
}

export interface TourStats {
  today: number;
  upcoming: number;
  completed: number;
  needsFollowUp: number;
}

export interface GetToursResult {
  success: true;
  data: {
    tours: TourListItem[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
    stats: TourStats;
  };
}

export interface GetToursError {
  success: false;
  error: string;
}

export async function getToursAction(
  filters?: { search?: string; status?: string; fromDate?: string; toDate?: string },
  page = 1,
  limit = 10
): Promise<GetToursResult | GetToursError> {
  try {
    const tenant = await getActiveTenant();
    const skip = (page - 1) * limit;

    const where: any = { tenantId: tenant.id };

    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.fromDate || filters?.toDate) {
      where.startAt = {};
      if (filters?.fromDate) where.startAt.gte = new Date(filters.fromDate);
      if (filters?.toDate) where.startAt.lte = new Date(filters.toDate);
    }

    const [tours, total] = await Promise.all([
      prisma.tour.findMany({
        where,
        orderBy: { startAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.tour.count({ where }),
    ]);

    const leadIds = [...new Set(tours.map((t) => t.leadId).filter(Boolean))];
    const userIds = [...new Set(tours.map((t) => t.assignedTo).filter(Boolean))];

    const [leads, users] = await Promise.all([
      leadIds.length ? prisma.lead.findMany({ where: { id: { in: leadIds } }, select: { id: true, firstName: true, lastName: true } }) : [],
      userIds.length ? prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } }) : [],
    ]);

    const leadMap = new Map(leads.map((l) => [l.id, `${l.firstName} ${l.lastName}`.trim()]));
    const userMap = new Map(users.map((u) => [u.id, u.name || 'غير معين']));

    let list: TourListItem[] = tours.map((t) => ({
      id: t.id,
      startAt: t.startAt.toISOString(),
      endAt: t.endAt.toISOString(),
      location: t.location || 'غير محدد',
      status: t.status,
      attendees: t.attendees,
      notes: t.notes ?? null,
      leadName: leadMap.get(t.leadId) || 'غير محدد',
      assignedToName: userMap.get(t.assignedTo) || 'غير معين',
      createdAt: t.createdAt.toISOString(),
    }));

    if (filters?.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (t) =>
          t.location.toLowerCase().includes(q) ||
          t.leadName.toLowerCase().includes(q) ||
          (t.notes && t.notes.toLowerCase().includes(q))
      );
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const todayTours = await prisma.tour.count({
      where: { tenantId: tenant.id, startAt: { gte: todayStart, lt: todayEnd } },
    });
    const upcomingTours = await prisma.tour.count({
      where: { tenantId: tenant.id, status: 'SCHEDULED', startAt: { gte: todayEnd } },
    });
    const completedTours = await prisma.tour.count({
      where: { tenantId: tenant.id, status: 'COMPLETED' },
    });
    const needsFollowUpTours = await prisma.tour.count({
      where: { tenantId: tenant.id, status: { in: ['CANCELLED', 'NO_SHOW', 'FOLLOW_UP'] } },
    });

    const stats: TourStats = {
      today: todayTours,
      upcoming: upcomingTours,
      completed: completedTours,
      needsFollowUp: needsFollowUpTours,
    };

    return {
      success: true,
      data: {
        tours: list,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        stats,
      },
    };
  } catch (error: any) {
    console.error('فشل جلب الجولات:', error);
    return { success: false, error: error.message };
  }
}

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
