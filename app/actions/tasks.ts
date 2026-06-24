// app/actions/tasks.ts
// Hardened: session + DB-backed role required for all mutations.
"use server";

import { prisma } from "@/lib/prisma";
import { getActiveTenant } from "@/lib/tenant";
import { getSession } from "@/lib/session";
import { assertServerActionRole } from "@/lib/api-auth-guard";
import { writeAuditLog } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { sendWhatsAppNotification } from "@/lib/notifications";

const TASK_ROLES = ["ADMIN", "owner", "SALES_MANAGER", "SALES_EMPLOYEE", "rental_manager"] as const;

async function requireTaskSession() {
  const session = await getSession();
  if (!session) throw new Error("يجب تسجيل الدخول أولاً.");
  const verified = await assertServerActionRole(session, TASK_ROLES);
  const tenant = await getActiveTenant();
  return { session: verified, tenant };
}

export async function getTasksAction(page = 1, limit = 50) {
  try {
    const { tenant } = await requireTaskSession();
    const skip = (page - 1) * limit;

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where: { tenantId: tenant.id },
        include: {
          lead: { select: { firstName: true, lastName: true, phone: true } },
          assignedUser: { select: { name: true } },
        },
        orderBy: { dueDate: "asc" },
        skip,
        take: limit,
      }),
      prisma.task.count({ where: { tenantId: tenant.id } }),
    ]);

    return { data: tasks, page, limit, total, totalPages: Math.ceil(total / limit) };
  } catch (error) {
    console.error("فشل جلب المهام:", error);
    return { data: [], page, limit, total: 0, totalPages: 0 };
  }
}

export async function getLeadsListAction() {
  try {
    const { tenant } = await requireTaskSession();
    return await prisma.lead.findMany({
      where: { tenantId: tenant.id },
      select: { id: true, firstName: true, lastName: true },
    });
  } catch (error) {
    console.error("فشل جلب قائمة العملاء:", error);
    return [];
  }
}

export async function toggleTaskStatusAction(taskId: string, currentStatus: string) {
  try {
    const { session, tenant } = await requireTaskSession();
    const newStatus = currentStatus === "COMPLETED" ? "PENDING" : "COMPLETED";

    await prisma.task.update({
      where: { id: taskId, tenantId: tenant.id },
      data: { status: newStatus },
    });

    await writeAuditLog({
      tenantId: tenant.id,
      userId: session.userId,
      action: "TASK_STATUS_CHANGED",
      tableName: "tasks",
      recordId: taskId,
      details: JSON.stringify({ from: currentStatus, to: newStatus }),
    });

    revalidatePath("/operations/tasks");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * إنشاء مهمة جديدة ودمج التاريخ والوقت المفرّقين تلقائياً
 */
export async function createTaskAction(formData: FormData) {
  try {
    const { session, tenant } = await requireTaskSession();

    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const leadId = formData.get("leadId") as string;
    const dueDateOnly = formData.get("dueDateOnly") as string;
    const dueTimeOnly = formData.get("dueTimeOnly") as string;
    const priority = formData.get("priority") as any;

    if (!title || !leadId || !dueDateOnly || !dueTimeOnly || !priority) {
      throw new Error("جميع الحقول التي تحتوى على (*) هي حقول إلزامية.");
    }

    const lead = await prisma.lead.findUnique({
      where: { id: leadId, tenantId: tenant.id },
      select: { firstName: true, assignedTo: true },
    });

    if (!lead || !lead.assignedTo) {
      throw new Error("العميل المختار غير مسند لمستشار مبيعات ليتم تكليفه بهذه المهمة.");
    }

    const combinedDueDate = new Date(`${dueDateOnly}T${dueTimeOnly}`);

    const task = await prisma.task.create({
      data: {
        tenant: { connect: { id: tenant.id } },
        lead: { connect: { id: leadId } },
        assignedUser: { connect: { id: lead.assignedTo } },
        title,
        description: description || null,
        dueDate: combinedDueDate,
        priority,
        status: "PENDING",
        createdBy: session.userId,
      },
    });

    await writeAuditLog({
      tenantId: tenant.id,
      userId: session.userId,
      action: "TASK_CREATED",
      tableName: "tasks",
      recordId: task.id,
      details: JSON.stringify({ title, leadId, dueDate: combinedDueDate.toISOString() }),
    });

    // إرسال الإشعار (non-blocking)
    const salesPhone = "+966505123456";
    const templateName = "new_task_assignment";
    const formattedDate = combinedDueDate.toLocaleString("ar-SA");
    const variables = [title, lead.firstName, formattedDate];
    await sendWhatsAppNotification(tenant.id, salesPhone, templateName, variables).catch(() => {});

    revalidatePath("/operations/tasks");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
