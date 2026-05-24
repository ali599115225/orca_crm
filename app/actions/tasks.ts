// app/actions/tasks.ts
"use server";

import { prisma } from "@/lib/prisma";
import { getActiveTenant } from "@/lib/tenant";
import { revalidatePath } from "next/cache";

/**
 * جلب جميع المهام المجدولة للشركة العقارية الحالية مع بيانات العميل والموظف
 */
export async function getTasksAction() {
  try {
    const tenant = await getActiveTenant();
    
    return await prisma.task.findMany({
      where: { tenantId: tenant.id },
      include: {
        lead: {
          select: {
            firstName: true,
            lastName: true,
            phone: true,
          }
        },
        assignedUser: {
          select: {
            name: true,
          }
        }
      },
      orderBy: { dueDate: "asc" }, // الترتيب حسب الأقرب للاستحقاق
    });
  } catch (error) {
    console.error("فشل جلب المهام والخطوات المجدولة:", error);
    return [];
  }
}

/**
 * جلب قائمة العملاء المحتملين لتعبئة قائمة اختيار العميل عند إنشاء مهمة جديدة
 */
export async function getLeadsListAction() {
  try {
    const tenant = await getActiveTenant();
    return await prisma.lead.findMany({
      where: { tenantId: tenant.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
    });
  } catch (error) {
    console.error("فشل جلب قائمة العملاء للمهام:", error);
    return [];
  }
}

/**
 * تبديل حالة المهمة بين معلقة ومكتملة بشكل فوري في قاعدة البيانات
 */
export async function toggleTaskStatusAction(taskId: string, currentStatus: string) {
  try {
    const tenant = await getActiveTenant();
    const newStatus = currentStatus === "COMPLETED" ? "PENDING" : "COMPLETED";

    await prisma.task.update({
      where: {
        id: taskId,
        tenantId: tenant.id, // فحص أمان SaaS للتأكد من انتماء المهمة للشركة الحالية
      },
      data: {
        status: newStatus,
      },
    });

    revalidatePath("/operations/tasks");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * إنشاء مهمة ومتابعة جديدة للعميل وتكليف الموظف المسؤول عنه آلياً
 */
export async function createTaskAction(formData: FormData) {
  try {
    const tenant = await getActiveTenant();

    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const leadId = formData.get("leadId") as string;
    const dueDateVal = formData.get("dueDate") as string;
    const priority = formData.get("priority") as any; // LOW, MEDIUM, HIGH

    if (!title || !leadId || !dueDateVal || !priority) {
      throw new Error("جميع الحقول التي تحتوى على (*) هي حقول إلزامية.");
    }

    // جلب الموظف المسند إليه هذا العميل محلياً لتكليفه بالمهمة تلقائياً
    const lead = await prisma.lead.findUnique({
      where: { id: leadId, tenantId: tenant.id },
      select: { assignedTo: true },
    });

    if (!lead || !lead.assignedTo) {
      throw new Error("العميل المختار غير مسند لمستشار مبيعات ليتم تكليفه بهذه المهمة.");
    }

    await prisma.task.create({
      data: {
        tenantId: tenant.id,
        leadId,
        assignedTo: lead.assignedTo,
        title,
        description: description || null,
        dueDate: new Date(dueDateVal),
        priority,
        status: "PENDING",
      },
    });

    revalidatePath("/operations/tasks");
    return { success: true };

  } catch (error: any) {
    return { success: false, error: error.message };
  }
}