// app/actions/projects.ts
"use server";

import { prisma } from "@/lib/prisma";
import { getActiveTenant } from "@/lib/tenant";
import { revalidatePath } from "next/cache";

/**
 * جلب تفاصيل المشاريع مع حساب إحصائيات الحجوزات ونسب الإنجاز ديناميكياً من الوحدات
 */
export async function getDetailedProjectsAction() {
  try {
    const tenant = await getActiveTenant();
    
    const projects = await prisma.project.findMany({
      where: { tenantId: tenant.id },
      include: {
        units: {
          select: {
            id: true,
            status: true,
            priceSar: true,
          }
        },
        _count: {
          select: { leads: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // تحويل قيم الـ Decimal وقيم الإحصائيات لتكون آمنة للإرسال عبر الشبكة
    return projects.map((project) => {
      const units = project.units || [];
      const unitsTotal = units.length || project.unitsTotal || 0;
      const unitsSold = units.filter(u => u.status === "Sold").length;
      const unitsBooked = units.filter(u => u.status === "Hold").length;
      
      const prices = units.map(u => Number(u.priceSar)).filter(p => p > 0);
      const minPrice = prices.length > 0 ? Math.min(...prices) : (project.minPrice ? Number(project.minPrice) : 0);
      const maxPrice = prices.length > 0 ? Math.max(...prices) : (project.maxPrice ? Number(project.maxPrice) : 0);

      // نسبة الإنجاز بناءً على المبيعات كمعيار للوحة
      const progressPercent = unitsTotal > 0 ? Math.min(100, Math.round((unitsSold / unitsTotal) * 100)) : 0;

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
        progressPercent,
        createdAt: project.createdAt.toISOString(),
      };
    });
  } catch (error) {
    console.error("فشل جلب تفاصيل المشاريع:", error);
    return [];
  }
}

/**
 * إنشاء مشروع عقاري جديد للمستأجر الحالي (عبر FormData التقليدي)
 */
export async function createProjectAction(formData: FormData) {
  try {
    const tenant = await getActiveTenant();
    
    const name = formData.get("name") as string;
    const city = formData.get("city") as string;
    const status = formData.get("status") as any; // PLANNING, UNDER_CONSTRUCTION, COMPLETED, SOLD_OUT
    const unitsTotal = parseInt(formData.get("unitsTotal") as string) || 0;
    const minPrice = parseFloat(formData.get("minPrice") as string) || 0;
    const maxPrice = parseFloat(formData.get("maxPrice") as string) || 0;

    if (!name || !city || !status) {
      throw new Error("اسم المشروع، المدينة، والحالة حقول إلزامية.");
    }

    await prisma.project.create({
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
    });

    revalidatePath("/operations/projects");
    return { success: true };

  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * إنشاء مشروع عقاري جديد للمستأجر الحالي (عن طريق استدعاء الكائنات المباشر)
 */
export async function createProjectActionDirect(data: { name: string; city: string; status: string; unitsTotal: number }) {
  try {
    const tenant = await getActiveTenant();
    
    const statusMap: Record<string, any> = {
      'PLANNING': 'PLANNING',
      'UNDER_CONSTRUCTION': 'UNDER_CONSTRUCTION',
      'COMPLETED': 'COMPLETED',
      'SOLD_OUT': 'SOLD_OUT',
      'مخطط له': 'PLANNING',
      'قيد الإنشاء': 'UNDER_CONSTRUCTION',
      'مكتمل': 'COMPLETED'
    };

    const dbStatus = statusMap[data.status] || 'UNDER_CONSTRUCTION';

    const newProject = await prisma.project.create({
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

    revalidatePath("/operations/projects");
    return { success: true, data: {
      id: newProject.id,
      name: newProject.name,
      city: newProject.city,
      status: newProject.status,
      unitsTotal: newProject.unitsTotal,
      unitsSold: newProject.unitsSold,
      unitsBooked: newProject.unitsBooked,
      createdAt: newProject.createdAt.toISOString()
    }};

  } catch (error: any) {
    console.error("فشل إنشاء المشروع:", error);
    return { success: false, error: error.message };
  }
}

/**
 * جلب كافة الوحدات العقارية المرتبطة بمشروع محدد من جدول Unit
 */
export async function getProjectUnitsAction(projectId: string) {
  try {
    const units = await prisma.unit.findMany({
      where: { projectId },
      orderBy: { unitNumber: "asc" }
    });

    return units.map(u => ({
      id: u.id,
      no: u.unitNumber,
      type: u.type || 'شقة',
      area: u.area || '120 م²',
      price: Number(u.priceSar),
      status: u.status, // Available, Hold, Sold
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
    const nextStatus = currentStatus === 'Available' ? 'Hold' : 'Available';
    
    const updatedUnit = await prisma.unit.update({
      where: { id: unitId },
      data: { status: nextStatus }
    });

    revalidatePath("/operations/projects");
    return { success: true, status: updatedUnit.status };
  } catch (error: any) {
    console.error("فشل تعديل حالة الوحدة العقارية:", error);
    return { success: false, error: error.message };
  }
}
