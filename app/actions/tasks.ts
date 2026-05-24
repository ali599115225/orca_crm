// app/actions/tasks.ts
"use server";

import { prisma } from "@/lib/prisma";
import { getActiveTenant } from "@/lib/tenant";
import { revalidatePath } from "next/cache";
import { sendWhatsAppNotification } from "@/lib/notifications"; // استدعاء محرك الإشعارات

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
      orderBy: { dueDate: "asc" },
    });
  } catch (error) {
    console.error("فشل جلب المهام والخطوات المجدولة:", error);
    return [];
  }
}

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

export async function toggleTaskStatusAction(taskId: string, currentStatus: string) {
  try {
    const tenant = await getActiveTenant();
    const newStatus = currentStatus === "COMPLETED" ? "PENDING" : "COMPLETED";

    await prisma.task.update({
      where: {
        id: taskId,
        tenantId: tenant.id,
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
 * إنشاء مهمة جديدة وإرسال تنبيه واتساب فوري لمستشار المبيعات المكلف [1.2.1]
 */
export async function createTaskAction(formData: FormData) {
  try {
    const tenant = await getActiveTenant();

    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const leadId = formData.get("leadId") as string;
    const dueDateVal = formData.get("dueDate") as string;
    const priority = formData.get("priority") as any;

    if (!title || !leadId || !dueDateVal || !priority) {
      throw new Error("جميع الحقول التي تحتوى على (*) هي حقول إلزامية.");
    }

    const lead = await prisma.lead.findUnique({
      where: { id: leadId, tenantId: tenant.id },
      select: { 
        firstName: true, 
        assignedTo: true 
      },
    });

    if (!lead || !lead.assignedTo) {
      throw new Error("العميل المختار غير مسند لمستشار مبيعات ليتم تكليفه بهذه المهمة.");
    }

    const task = await prisma.task.create({
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

    // 🚀 الإجراء: إرسال تنبيه واتساب فوري للمستشار ببيانات المهمة وتفاصيل العميل [1.2.1]
    const salesPhone = "+966505123456"; // رقم تجريبي
    const templateName = "new_task_assignment";
    const formattedDate = new Date(dueDateVal).toLocaleString('ar-SA');
    const variables = [title, lead.firstName, formattedDate];
    await sendWhatsAppNotification(salesPhone, templateName, variables);

    revalidatePath("/operations/tasks");
    return { success: true };

  } catch (error: any) {
    return { success: false, error: error.message };
  }
}