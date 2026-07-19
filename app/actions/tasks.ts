"use server";

import { revalidatePath } from "next/cache";

import { assertServerActionRole } from "@/lib/api-auth-guard";
import { writeAuditLog } from "@/lib/audit";
import { sendWhatsAppNotification } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { runWithTenantContext } from "@/lib/tenant-context";

const TASK_ROLES = [
  "ADMIN",
  "SALES_MANAGER",
  "SALES_EMPLOYEE",
] as const;

const TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;
type TaskPriority = (typeof TASK_PRIORITIES)[number];

class TaskInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TaskInputError";
  }
}

function taskActionError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : "";

  if (message === "UNAUTHORIZED") {
    return "يجب تسجيل الدخول أولاً.";
  }

  if (message === "FORBIDDEN") {
    return "لا تملك صلاحية تنفيذ هذه العملية.";
  }

  if (error instanceof TaskInputError) {
    return error.message;
  }

  console.error("[Tasks]", error);
  return fallback;
}

async function requireTaskSession() {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");

  const verified = await assertServerActionRole(session, TASK_ROLES);
  return {
    session: verified,
    tenantId: verified.tenantId,
  };
}

function normalizedText(value: FormDataEntryValue | null, maxLength: number) {
  return String(value || "").trim().slice(0, maxLength);
}

function parseTaskPriority(value: FormDataEntryValue | null): TaskPriority {
  const priority = String(value || "").trim().toUpperCase();

  if (!TASK_PRIORITIES.includes(priority as TaskPriority)) {
    throw new TaskInputError("أولوية المهمة غير صالحة.");
  }

  return priority as TaskPriority;
}

function parseTaskDueDate(formData: FormData): Date {
  const dueAt = normalizedText(formData.get("dueAt"), 64);

  if (dueAt) {
    const parsed = new Date(dueAt);
    if (Number.isNaN(parsed.getTime())) {
      throw new TaskInputError("تاريخ ووقت استحقاق المهمة غير صالحين.");
    }
    return parsed;
  }

  const dueDateOnly = normalizedText(formData.get("dueDateOnly"), 10);
  const dueTimeOnly = normalizedText(formData.get("dueTimeOnly"), 5);

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(dueDateOnly) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(dueTimeOnly)
  ) {
    throw new TaskInputError("تاريخ ووقت استحقاق المهمة غير صالحين.");
  }

  const parsed = new Date(`${dueDateOnly}T${dueTimeOnly}:00`);
  if (Number.isNaN(parsed.getTime())) {
    throw new TaskInputError("تاريخ ووقت استحقاق المهمة غير صالحين.");
  }

  return parsed;
}

function parseTaskForm(formData: FormData) {
  const title = normalizedText(formData.get("title"), 160);
  const description = normalizedText(formData.get("description"), 2000);
  const leadId = normalizedText(formData.get("leadId"), 80);
  const assignedTo = normalizedText(formData.get("assignedTo"), 80);
  const priority = parseTaskPriority(formData.get("priority"));
  const dueDate = parseTaskDueDate(formData);

  if (title.length < 2) {
    throw new TaskInputError("عنوان المهمة مطلوب ويجب أن يتكون من حرفين على الأقل.");
  }

  if (!leadId) {
    throw new TaskInputError("يجب اختيار عميل للمهمة.");
  }

  return {
    title,
    description: description || null,
    leadId,
    assignedTo: assignedTo || null,
    priority,
    dueDate,
  };
}

async function findTaskRelations(
  tenantId: string,
  leadId: string,
  requestedAssigneeId?: string | null,
) {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId, tenantId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      assignedTo: true,
      assignedUser: {
        select: {
          id: true,
          name: true,
          phone: true,
          isActive: true,
        },
      },
    },
  });

  if (!lead) {
    throw new TaskInputError("العميل غير موجود أو لا يتبع منشأتك.");
  }

  const assignedTo = String(requestedAssigneeId || lead.assignedTo || "").trim();
  if (!assignedTo) {
    throw new TaskInputError("يجب اختيار مسؤول للمهمة.");
  }

  let assignedUser =
    lead.assignedTo === assignedTo && lead.assignedUser?.isActive
      ? lead.assignedUser
      : null;

  if (!assignedUser) {
    assignedUser = await prisma.user.findFirst({
      where: {
        id: assignedTo,
        tenantId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        isActive: true,
      },
    });
  }

  if (!assignedUser) {
    throw new TaskInputError("المسؤول غير موجود أو غير نشط في منشأتك.");
  }

  return {
    lead,
    assignedTo,
    assignedUser,
  };
}

async function notifyAssignedUser(input: {
  tenantId: string;
  phone?: string | null;
  title: string;
  leadName: string;
  dueDate: Date;
}) {
  const phone = String(input.phone || "").trim();
  if (!phone) return;

  const pad = (part: number) => String(part).padStart(2, "0");
  const formattedDate = `${pad(input.dueDate.getDate())}/${pad(
    input.dueDate.getMonth() + 1,
  )}/${String(input.dueDate.getFullYear()).slice(-2)} ${pad(
    input.dueDate.getHours(),
  )}:${pad(input.dueDate.getMinutes())}`;
  await sendWhatsAppNotification(
    input.tenantId,
    phone,
    "new_task_assignment",
    [input.title, input.leadName, formattedDate],
  ).catch((error) => {
    console.warn("[Tasks] assignment notification failed", {
      code: error instanceof Error ? error.name : "UNKNOWN",
    });
  });
}

export async function getTasksAction(page = 1, limit = 50) {
  const safePage = Math.max(1, Number.isFinite(page) ? Math.trunc(page) : 1);
  const safeLimit = Math.min(
    100,
    Math.max(1, Number.isFinite(limit) ? Math.trunc(limit) : 50),
  );

  try {
    const { tenantId } = await requireTaskSession();

    return await runWithTenantContext({ tenantId }, async () => {
      const skip = (safePage - 1) * safeLimit;

      const [tasks, total] = await Promise.all([
        prisma.task.findMany({
          where: { tenantId },
          include: {
            lead: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
            assignedUser: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: [{ status: "asc" }, { dueDate: "asc" }],
          skip,
          take: safeLimit,
        }),
        prisma.task.count({ where: { tenantId } }),
      ]);

      return {
        success: true as const,
        data: tasks,
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.max(1, Math.ceil(total / safeLimit)),
      };
    });
  } catch (error) {
    return {
      success: false as const,
      data: [],
      page: safePage,
      limit: safeLimit,
      total: 0,
      totalPages: 1,
      error: taskActionError(error, "تعذر تحميل المهام."),
    };
  }
}

export async function getLeadsListAction() {
  try {
    const { tenantId } = await requireTaskSession();

    return await runWithTenantContext({ tenantId }, async () => {
      const [leads, users] = await Promise.all([
        prisma.lead.findMany({
          where: {
            tenantId,
            isArchived: false,
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            assignedTo: true,
            assignedUser: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
        }),
        prisma.user.findMany({
          where: {
            tenantId,
            isActive: true,
          },
          select: {
            id: true,
            name: true,
            role: true,
          },
          orderBy: { name: "asc" },
        }),
      ]);

      return {
        success: true as const,
        data: leads,
        users,
      };
    });
  } catch (error) {
    return {
      success: false as const,
      data: [],
      users: [],
      error: taskActionError(error, "تعذر تحميل خيارات المهمة."),
    };
  }
}

export async function toggleTaskStatusAction(
  taskId: string,
  _clientStatus?: string,
) {
  try {
    const { session, tenantId } = await requireTaskSession();
    const normalizedTaskId = String(taskId || "").trim();

    if (!normalizedTaskId) {
      throw new TaskInputError("معرف المهمة غير صالح.");
    }

    return await runWithTenantContext(
      { tenantId, userId: session.userId },
      async () => {
        const task = await prisma.task.findFirst({
          where: {
            id: normalizedTaskId,
            tenantId,
          },
          select: {
            id: true,
            status: true,
          },
        });

        if (!task) {
          throw new TaskInputError("المهمة غير موجودة أو لا تتبع منشأتك.");
        }

        const newStatus =
          task.status === "COMPLETED" ? "PENDING" : "COMPLETED";

        await prisma.task.update({
          where: {
            id: task.id,
            tenantId,
          },
          data: {
            status: newStatus,
            updatedBy: session.userId,
          },
        });

        await writeAuditLog({
          tenantId,
          userId: session.userId,
          action: "TASK_STATUS_CHANGED",
          tableName: "tasks",
          recordId: task.id,
          details: JSON.stringify({
            from: task.status,
            to: newStatus,
          }),
        });

        revalidatePath("/operations/tasks");
        return {
          success: true as const,
          status: newStatus,
        };
      },
    );
  } catch (error) {
    return {
      success: false as const,
      error: taskActionError(error, "تعذر تحديث حالة المهمة."),
    };
  }
}

export async function createTaskAction(formData: FormData) {
  try {
    const { session, tenantId } = await requireTaskSession();
    const input = parseTaskForm(formData);

    return await runWithTenantContext(
      { tenantId, userId: session.userId },
      async () => {
        const { lead, assignedTo, assignedUser } = await findTaskRelations(
          tenantId,
          input.leadId,
          input.assignedTo,
        );

        const task = await prisma.task.create({
          data: {
            tenantId,
            leadId: lead.id,
            assignedTo,
            title: input.title,
            description: input.description,
            dueDate: input.dueDate,
            priority: input.priority,
            status: "PENDING",
            createdBy: session.userId,
            updatedBy: session.userId,
          },
          include: {
            lead: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
            assignedUser: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });

        await writeAuditLog({
          tenantId,
          userId: session.userId,
          action: "TASK_CREATED",
          tableName: "tasks",
          recordId: task.id,
          details: JSON.stringify({
            leadId: lead.id,
            assignedTo,
            dueDate: input.dueDate.toISOString(),
            priority: input.priority,
          }),
        });

        await notifyAssignedUser({
          tenantId,
          phone: assignedUser.phone,
          title: input.title,
          leadName: [lead.firstName, lead.lastName].filter(Boolean).join(" "),
          dueDate: input.dueDate,
        });

        revalidatePath("/operations/tasks");
        return {
          success: true as const,
          task,
        };
      },
    );
  } catch (error) {
    return {
      success: false as const,
      error: taskActionError(error, "تعذر إنشاء المهمة."),
    };
  }
}

export async function updateTaskAction(formData: FormData) {
  try {
    const { session, tenantId } = await requireTaskSession();
    const taskId = normalizedText(formData.get("taskId"), 80);
    const input = parseTaskForm(formData);

    if (!taskId) {
      throw new TaskInputError("معرف المهمة غير صالح.");
    }

    return await runWithTenantContext(
      { tenantId, userId: session.userId },
      async () => {
        const existing = await prisma.task.findFirst({
          where: {
            id: taskId,
            tenantId,
          },
          select: {
            id: true,
            leadId: true,
            assignedTo: true,
            title: true,
            dueDate: true,
            priority: true,
          },
        });

        if (!existing) {
          throw new TaskInputError("المهمة غير موجودة أو لا تتبع منشأتك.");
        }

        const { lead, assignedTo } = await findTaskRelations(
          tenantId,
          input.leadId,
          input.assignedTo,
        );

        const task = await prisma.task.update({
          where: {
            id: existing.id,
            tenantId,
          },
          data: {
            leadId: lead.id,
            assignedTo,
            title: input.title,
            description: input.description,
            dueDate: input.dueDate,
            priority: input.priority,
            updatedBy: session.userId,
          },
          include: {
            lead: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
            assignedUser: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });

        await writeAuditLog({
          tenantId,
          userId: session.userId,
          action: "TASK_UPDATED",
          tableName: "tasks",
          recordId: existing.id,
          details: JSON.stringify({
            leadChanged: existing.leadId !== lead.id,
            assigneeChanged: existing.assignedTo !== assignedTo,
            dueDateChanged:
              existing.dueDate.toISOString() !== input.dueDate.toISOString(),
            priorityChanged: existing.priority !== input.priority,
            titleChanged: existing.title !== input.title,
          }),
        });

        revalidatePath("/operations/tasks");
        return {
          success: true as const,
          task,
        };
      },
    );
  } catch (error) {
    return {
      success: false as const,
      error: taskActionError(error, "تعذر تحديث المهمة."),
    };
  }
}
