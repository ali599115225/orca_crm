// app/actions/tours.ts
"use server";

import { prisma } from "@/lib/prisma";
import { getActiveTenant } from "@/lib/tenant";
import { revalidatePath } from "next/cache";
import { assertPlanLimit, PlanLimitError, logPlanBlockedAttempt } from "@/lib/plan-guard";
import { hashPhone } from "@/lib/privacy-mask";

export type TourListItem = {
  id: string;
  startAt: string;
  endAt: string | null;
  location: string;
  status: string;
  attendees: number | null;
  notes: string | null;
  leadName: string;
  assignedToName: string;
  createdAt: string | null;
};

export type TourStats = {
  today: number;
  upcoming: number;
  completed: number;
  needsFollowUp: number;
};

export type GetToursActionResult =
  | {
      success: true;
      data: {
        tours: TourListItem[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
        stats: TourStats;
      };
    }
  | { success: false; error: string };

function sanitizePage(page: number) {
  const parsed = Number(page);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.floor(parsed);
}

function sanitizeLimit(limit: number) {
  const parsed = Number(limit);
  if (!Number.isFinite(parsed) || parsed < 1) return 10;
  return Math.min(Math.floor(parsed), 200);
}

function fullLeadName(lead: any) {
  const first = String(lead?.firstName || "").trim();
  const last = String(lead?.lastName || "").trim();
  const joined = `${first} ${last}`.trim();
  return joined || "غير محدد";
}

function fullUserName(user: any) {
  const explicitName = String(user?.name || "").trim();
  if (explicitName) return explicitName;

  const first = String(user?.firstName || "").trim();
  const last = String(user?.lastName || "").trim();
  const joined = `${first} ${last}`.trim();
  if (joined) return joined;

  const email = String(user?.email || "").trim();
  return email || "غير معين";
}

function toIso(value: unknown) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export async function getToursAction(
  filters?: {
    search?: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
  },
  page = 1,
  limit = 10
): Promise<GetToursActionResult> {
  try {
    const tenant = await getActiveTenant();
    const safePage = sanitizePage(page);
    const safeLimit = sanitizeLimit(limit);
    const skip = (safePage - 1) * safeLimit;

    const search = String(filters?.search || "").trim();
    const status = String(filters?.status || "").trim();
    const fromDate = String(filters?.fromDate || "").trim();
    const toDate = String(filters?.toDate || "").trim();

    const where: any = { tenantId: tenant.id };

    if (status) {
      where.status = status;
    }

    if (fromDate || toDate) {
      where.startAt = {};
      if (fromDate) {
        const from = new Date(`${fromDate}T00:00:00`);
        if (!Number.isNaN(from.getTime())) where.startAt.gte = from;
      }
      if (toDate) {
        const to = new Date(`${toDate}T23:59:59.999`);
        if (!Number.isNaN(to.getTime())) where.startAt.lte = to;
      }
      if (Object.keys(where.startAt).length === 0) delete where.startAt;
    }

    if (search) {
      const matchingLeads = await prisma.lead.findMany({
        where: {
          tenantId: tenant.id,
          OR: [
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
            { phone: { contains: search, mode: "insensitive" } },
          ],
        },
      });

      const leadIds = matchingLeads.map((lead) => lead.id);
      where.OR = [
        { location: { contains: search, mode: "insensitive" } },
        { notes: { contains: search, mode: "insensitive" } },
        ...(leadIds.length > 0 ? [{ leadId: { in: leadIds } }] : []),
      ];
    }

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(todayStart.getDate() + 1);

    const [tours, total, today, upcoming, completed, needsFollowUp] = await Promise.all([
      prisma.tour.findMany({
        where,
        orderBy: { startAt: "desc" },
        skip,
        take: safeLimit,
      }),
      prisma.tour.count({ where }),
      prisma.tour.count({
        where: {
          tenantId: tenant.id,
          startAt: { gte: todayStart, lt: tomorrowStart },
        },
      }),
      prisma.tour.count({
        where: {
          tenantId: tenant.id,
          status: "SCHEDULED",
          startAt: { gte: now },
        },
      }),
      prisma.tour.count({
        where: {
          tenantId: tenant.id,
          status: "COMPLETED",
        },
      }),
      prisma.tour.count({
        where: {
          tenantId: tenant.id,
          status: { in: ["CANCELLED", "NO_SHOW", "FOLLOW_UP"] },
        },
      }),
    ]);

    const leadIds = Array.from(new Set(tours.map((tour: any) => tour.leadId).filter(Boolean)));
    const userIds = Array.from(new Set(tours.map((tour: any) => tour.assignedTo).filter(Boolean)));

    const [leads, users] = await Promise.all([
      leadIds.length > 0
        ? prisma.lead.findMany({ where: { tenantId: tenant.id, id: { in: leadIds as string[] } } })
        : Promise.resolve([]),
      userIds.length > 0
        ? prisma.user.findMany({ where: { tenantId: tenant.id, id: { in: userIds as string[] } } })
        : Promise.resolve([]),
    ]);

    const leadNameById = new Map(leads.map((lead: any) => [lead.id, fullLeadName(lead)]));
    const userNameById = new Map(users.map((user: any) => [user.id, fullUserName(user)]));

    const list: TourListItem[] = tours.map((tour: any) => ({
      id: tour.id,
      startAt: toIso(tour.startAt) || "",
      endAt: toIso(tour.endAt),
      location: String(tour.location || "غير محدد"),
      status: String(tour.status || "SCHEDULED"),
      attendees: typeof tour.attendees === "number" ? tour.attendees : null,
      notes: tour.notes ? String(tour.notes) : null,
      leadName: tour.leadId ? leadNameById.get(tour.leadId) || "غير محدد" : "غير محدد",
      assignedToName: tour.assignedTo ? userNameById.get(tour.assignedTo) || "غير معين" : "غير معين",
      createdAt: toIso((tour as any).createdAt),
    }));

    return {
      success: true,
      data: {
        tours: list,
        pagination: {
          page: safePage,
          limit: safeLimit,
          total,
          totalPages: Math.ceil(total / safeLimit),
        },
        stats: {
          today,
          upcoming,
          completed,
          needsFollowUp,
        },
      },
    };
  } catch (error: any) {
    console.error("فشل جلب الجولات العقارية:", error);
    return { success: false, error: error?.message || "تعذر تحميل الجولات العقارية" };
  }
}

/**
 * جدولة جولة عقارية جديدة وإسنادها لعميل وإدخالها في جدول Tour بقاعدة البيانات.
 * يدعم الاستدعاء القديم عبر propertyId، ويدعم جدولة مباشرة بموقع نصي من صفحة الجولات.
 */
export async function scheduleTourActionDirect(data: {
  propertyId?: string;
  location?: string;
  userName: string;
  phone: string;
  datetime: string;
}) {
  let tenantIdForLog = "";

  try {
    const tenant = await getActiveTenant();
    tenantIdForLog = tenant.id;

    const propertyId = String(data.propertyId || "").trim();
    const locationInput = String(data.location || "").trim();
    const userName = String(data.userName || "").trim();
    const phone = String(data.phone || "").trim();
    const datetime = String(data.datetime || "").trim();

    if (!userName || userName.length < 2) {
      throw new Error("اسم العميل مطلوب ويجب أن يكون أكثر من حرفين.");
    }
    if (!phone || !/^\d{9,15}$/.test(phone.replace(/\D/g, ""))) {
      throw new Error("رقم الهاتف غير صحيح. يجب أن يكون بين 9 و15 رقماً.");
    }
    if (!datetime || Number.isNaN(Date.parse(datetime))) {
      throw new Error("التاريخ والوقت غير صحيحين.");
    }
    if (!propertyId && !locationInput) {
      throw new Error("موقع الجولة أو الوحدة مطلوب.");
    }

    let lead = await prisma.lead.findFirst({
      where: { phone, tenantId: tenant.id },
    });

    if (!lead) {
      const parts = userName.split(/\s+/);
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

    const unit = propertyId
      ? await prisma.unit.findFirst({
          where: { id: propertyId, project: { tenantId: tenant.id } },
          include: { project: true },
        })
      : null;

    const location = locationInput || (unit ? `${unit.project?.name || "مشروع عقاري"} - وحدة رقم ${unit.unitNumber}` : "موقع الجولة");

    const defaultUser = await prisma.user.findFirst({ where: { tenantId: tenant.id } });
    const assignedTo = defaultUser?.id || "";
    const startAt = new Date(datetime);
    const endAt = new Date(startAt.getTime() + 60 * 60 * 1000);

    const tour = await prisma.tour.create({
      data: {
        tenantId: tenant.id,
        leadId: lead.id,
        assignedTo,
        startAt,
        endAt,
        location,
        status: "SCHEDULED",
        attendees: 1,
        notes: "جولة عقارية مجدولة من صفحة الجولات.",
      },
    });

    await prisma.telemetryEvent
      .create({
        data: {
          tenantId: tenant.id,
          eventType: "tour.scheduled",
          eventDataJson: JSON.stringify({ tourId: tour.id, leadId: lead.id, startAt: datetime }),
        },
      })
      .catch(() => {});

    await prisma.agentTelemetryLog
      .create({
        data: {
          tenantId: tenant.id,
          agentId: "Saher_WhatsApp",
          actionType: "WhatsApp_Reminder",
          logMessageAr: `تم جدولة جولة عقارية للعميل ${userName}.`,
          severity: "Info",
        },
      })
      .catch(() => {});

    revalidatePath("/operations/tours");
    revalidatePath("/operations/dashboard");

    return {
      success: true,
      visitId: tour.id,
      confirmation: {
        message: "تم تسجيل حجز الجولة بنجاح.",
        datetime,
        reminder: "سيظهر الموعد ضمن قائمة الجولات العقارية.",
      },
    };
  } catch (error: any) {
    if (error instanceof PlanLimitError) {
      await logPlanBlockedAttempt({ tenantId: tenantIdForLog, error }).catch(() => {});
      return { success: false, error: error.message, code: error.code };
    }
    console.error("فشل جدولة الجولة عبر Server Action:", error);
    return { success: false, error: error?.message || "تعذر جدولة الجولة" };
  }
}
