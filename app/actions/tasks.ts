// app/actions/tasks.ts
"use server";

import { prisma } from "@/lib/prisma";
import { getActiveTenant } from "@/lib/tenant";
import { revalidatePath } from "next/cache";
import { sendWhatsAppNotification } from "@/lib/notifications";

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
    console.error("فشل جلب المهام:", error);
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
    console.error("فشل جلب قائمة العملاء:", error);
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
 * إنشاء مهمة جديدة ودمج التاريخ والوقت المفرّقين تلقائياً [1, 1.1.2]
 */
export async function createTaskAction(formData: FormData) {
  try {
    const tenant = await getActiveTenant();

    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const leadId = formData.get("leadId") as string;
    
    // استقبال حقل التاريخ المنفصل وحقل الوقت المنفصل
    const dueDateOnly = formData.get("dueDateOnly") as string; // مثل: 2026-05-26
    const dueTimeOnly = formData.get("dueTimeOnly") as string; // مثل: 14:30

    if (!title || !leadId || !dueDateOnly || !dueTimeOnly || !priority) {
      throw new Error("جميع الحقول التي تحتوى على (*) هي حقول إلزامية.");
    }

    const priority = formData.get("priority") as any;

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

    // دمج التاريخ والوقت في صيغة ISO صالحة ومقبولة للـ PostgreSQL [1.1.2]
    const combinedDueDate = new Date(`${dueDateOnly}T${dueTimeOnly}`);

    await prisma.task.create({
      data: {
        tenantId: tenant.id,
        leadId,
        assignedTo: lead.assignedTo,
        title,
        description: description || null,
        dueDate: combinedDueDate, // حفظ الموعد المدمج بنجاح
        priority,
        status: "PENDING",
      },
    });

    // إرسال الإشعار
    const salesPhone = "+966505123456";
    const templateName = "new_task_assignment";
    const formattedDate = combinedDueDate.toLocaleString('ar-SA');
    const variables = [title, lead.firstName, formattedDate];
    await sendWhatsAppNotification(salesPhone, templateName, variables);

    revalidatePath("/operations/tasks");
    return { success: true };

  } catch (error: any) {
    return { success: false, error: error.message };
  }
}