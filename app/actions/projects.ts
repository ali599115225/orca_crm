// app/actions/projects.ts
// Hardened: session + DB-backed role required for ALL mutations.
"use server";

import { prisma } from "@/lib/prisma";
import { getActiveTenant } from "@/lib/tenant";
import { getSession } from "@/lib/session";
import { assertServerActionRole } from "@/lib/api-auth-guard";
import { writeAuditLog } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { assertPlanLimit, PlanLimitError, logPlanBlockedAttempt } from "@/lib/plan-guard";

const PROJECT_READER_ROLES = ["ADMIN", "owner", "SALES_MANAGER", "SALES_EMPLOYEE", "rental_manager"] as const;
const PROJECT_WRITER_ROLES = ["ADMIN", "owner", "SALES_MANAGER"] as const;

async function requireProjectSession(writerRole = false) {
  const session = await getSession();
  if (!session) throw new Error("يجب تسجيل الدخول أولاً.");
  const verified = await assertServerActionRole(
    session,
    writerRole ? PROJECT_WRITER_ROLES : PROJECT_READER_ROLES
  );
  const tenant = await getActiveTenant();
  return { session: verified, tenant };
}

/**
 * جلب تفاصيل المشاريع مع حساب إحصائيات الحجوزات ونسب الإنجاز ديناميكياً من الوحدات
 */
export async function getDetailedProjectsAction(page = 1, limit = 50) {
  try {
    const { tenant } = await requireProjectSession(false);
    const skip = (page - 1) * limit;

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where: { tenantId: tenant.id },
        include: { units: { select: { id: true, status: true, priceSar: true } }, _count: { select: { leads: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.project.count({ where: { tenantId: tenant.id } }),
    ]);

    const data = projects.map((project) => {
      const units = project.units || [];
      const unitsTotal = units.length || project.unitsTotal || 0;
      const unitsSold = units.filter(u => u.status === "Sold").length;
      const unitsBooked = units.filter(u => u.status === "Hold").length;
      const prices = units.map(u => Number(u.priceSar)).filter(p => p > 0);
      const minPrice = prices.length > 0 ? Math.min(...prices) : (project.minPrice ? Number(project.minPrice) : 0);
      const maxPrice = prices.length > 0 ? Math.max(...prices) : (project.maxPrice ? Number(project.maxPrice) : 0);
      return {
        id: project.id,
        name: project.name,
        city: project.city,
        status: project.status,
        unitsTotal,
        unitsSold,
        unitsBooked,
        minPrice,
        maxPrice,
        progressPercent: unitsTotal > 0 ? Math.min(100, Math.round((unitsSold / unitsTotal) * 100)) : 0,
        createdAt: project.createdAt.toISOString(),
      };
    });

    return { data, page, limit, total, totalPages: Math.ceil(total / limit) };
  } catch (error) {
    console.error("فشل جلب تفاصيل المشاريع:", error);
    return { data: [], page, limit, total: 0, totalPages: 0 };
  }
}

/**
 * إنشاء مشروع عقاري جديد للمستأجر الحالي (عبر FormData التقليدي)
 */
export async function createProjectAction(formData: FormData) {
  try {
    const { session, tenant } = await requireProjectSession(true);

    const name = formData.get("name") as string;
    const city = formData.get("city") as string;
    const status = formData.get("status") as any;
    const unitsTotal = parseInt(formData.get("unitsTotal") as string) || 0;
    const minPrice = parseFloat(formData.get("minPrice") as string) || 0;
    const maxPrice = parseFloat(formData.get("maxPrice") as string) || 0;

    if (!name || !city || !status) {
      throw new Error("اسم المشروع، المدينة، والحالة حقول إلزامية.");
    }

    const newProject = await prisma.$transaction(async (tx) => {
      await assertPlanLimit({ tenantId: tenant.id, feature: "projects", tx });
      return tx.project.create({
        data: {
          tenantId: tenant.id,
          name,
          city,
          status,
          unitsTotal,
          unitsSold: 0,
          unitsBooked: 0,
          minPrice,
          maxPrice,
        },
        select: { id: true },
      });
    });

    await writeAuditLog({
      tenantId: tenant.id,
      userId: session.userId,
      action: "PROJECT_CREATED",
      tableName: "projects",
      recordId: newProject.id,
      details: JSON.stringify({ name, city, status }),
    });

    revalidatePath("/operations/projects");
    return { success: true };
  } catch (error: any) {
    if (error instanceof PlanLimitError) {
      await logPlanBlockedAttempt({ tenantId: "", error }).catch(() => {});
      return { success: false, error: error.message, code: error.code };
    }
    return { success: false, error: error.message };
  }
}

/**
 * إنشاء مشروع عقاري جديد للمستأجر الحالي (عن طريق استدعاء الكائنات المباشر)
 */
export async function createProjectActionDirect(data: {
  name: string;
  city: string;
  status: string;
  unitsTotal: number;
}) {
  try {
    const { session, tenant } = await requireProjectSession(true);

    const statusMap: Record<string, any> = {
      PLANNING: "PLANNING",
      UNDER_CONSTRUCTION: "UNDER_CONSTRUCTION",
      COMPLETED: "COMPLETED",
      SOLD_OUT: "SOLD_OUT",
      "مخطط له": "PLANNING",
      "قيد الإنشاء": "UNDER_CONSTRUCTION",
      مكتمل: "COMPLETED",
    };

    const dbStatus = statusMap[data.status] || "UNDER_CONSTRUCTION";

    const newProject = await prisma.$transaction(async (tx) => {
      await assertPlanLimit({ tenantId: tenant.id, feature: "projects", tx });
      return tx.project.create({
        data: {
          tenantId: tenant.id,
          name: data.name,
          city: data.city,
          status: dbStatus,
          unitsTotal: Number(data.unitsTotal) || 0,
          unitsSold: 0,
          unitsBooked: 0,
        },
      });
    });

    await writeAuditLog({
      tenantId: tenant.id,
      userId: session.userId,
      action: "PROJECT_CREATED",
      tableName: "projects",
      recordId: newProject.id,
      details: JSON.stringify({ name: data.name, city: data.city }),
    });

    revalidatePath("/operations/projects");
    return {
      success: true,
      data: {
        id: newProject.id,
        name: newProject.name,
        city: newProject.city,
        status: newProject.status,
        unitsTotal: newProject.unitsTotal,
        unitsSold: newProject.unitsSold,
        unitsBooked: newProject.unitsBooked,
        createdAt: newProject.createdAt.toISOString(),
      },
    };
  } catch (error: any) {
    if (error instanceof PlanLimitError) {
      await logPlanBlockedAttempt({ tenantId: "", error }).catch(() => {});
      return { success: false, error: error.message, code: error.code };
    }
    console.error("فشل إنشاء المشروع:", error);
    return { success: false, error: error.message };
  }
}

/**
 * جلب كافة الوحدات العقارية المرتبطة بمشروع محدد من جدول Unit
 */
export async function getProjectUnitsAction(projectId: string) {
  try {
    const { tenant } = await requireProjectSession(false);

    const project = await prisma.project.findFirst({
      where: { id: projectId, tenantId: tenant.id },
      select: { id: true },
    });
    if (!project) return [];

    const units = await prisma.unit.findMany({
      where: { projectId },
      orderBy: { unitNumber: "asc" },
    });

    return units.map(u => ({
      id: u.id,
      no: u.unitNumber,
      type: u.type || "شقة",
      area: u.area || "120 م²",
      price: Number(u.priceSar),
      status: u.status,
    }));
  } catch (error) {
    console.error("فشل جلب وحدات المشروع:", error);
    return [];
  }
}

/**
 * تغيير حالة حجز الوحدة العقارية في جدول Unit مع إعادة التحقق
 */
export async function toggleUnitStatusAction(unitId: string, currentStatus: string) {
  try {
    const { session, tenant } = await requireProjectSession(true);

    const unit = await prisma.unit.findFirst({
      where: { id: unitId, project: { tenantId: tenant.id } },
    });
    if (!unit) throw new Error("الوحدة غير موجودة أو لا تنتمي لمنشأتك.");

    const nextStatus = currentStatus === "Available" ? "Hold" : "Available";

    const updatedUnit = await prisma.unit.update({
      where: { id: unitId },
      data: { status: nextStatus },
    });

    await writeAuditLog({
      tenantId: tenant.id,
      userId: session.userId,
      action: "UNIT_STATUS_TOGGLED",
      tableName: "units",
      recordId: unitId,
      details: JSON.stringify({ from: currentStatus, to: nextStatus }),
    });

    revalidatePath("/operations/projects");
    return { success: true, status: updatedUnit.status };
  } catch (error: any) {
    console.error("فشل تعديل حالة الوحدة العقارية:", error);
    return { success: false, error: error.message };
  }
}
