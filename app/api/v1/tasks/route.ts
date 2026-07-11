import { httpErrorResponse } from "@/lib/http-error-response";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  runWithDatabaseSession,
  TENANT_ROLES,
  TENANT_WRITE_ROLES,
} from "@/lib/api-auth-guard";
import { Priority } from "@prisma/client";
import { ErrorCode } from "@/lib/errors";
import { writeAuditLog } from "@/lib/audit";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  return runWithDatabaseSession(request, TENANT_ROLES, async (session) => {
    try {
      const { searchParams } = new URL(request.url);
      const assignee = searchParams.get("assignee");
      const leadId = searchParams.get("leadId");

      if (leadId && !UUID_REGEX.test(leadId)) {
        return NextResponse.json(
          { success: false, error: "معرف العميل غير صالح." },
          { status: 400 },
        );
      }

      const tasks = await prisma.task.findMany({
        where: {
          tenantId: session.tenantId,
          ...(assignee ? { assignedTo: assignee } : {}),
          ...(leadId ? { leadId } : {}),
        },
        orderBy: { dueDate: "asc" },
        include: {
          lead: {
            select: { firstName: true, lastName: true },
          },
        },
        take: 100,
      });

      return NextResponse.json({ success: true, data: tasks });
    } catch (error: unknown) {
      return httpErrorResponse(
        request,
        ErrorCode.INTERNAL_ERROR,
        "GET /api/v1/tasks failed",
        error,
        500,
      );
    }
  });
}

export async function POST(request: NextRequest) {
  return runWithDatabaseSession(
    request,
    TENANT_WRITE_ROLES,
    async (session) => {
      try {
        const body = await request.json();
        const { leadId, title, description, dueDate, priority } = body;

        if (!leadId || !title) {
          return NextResponse.json(
            {
              success: false,
              error: "معرف العميل وعنوان المهمة مطلوبان.",
            },
            { status: 400 },
          );
        }

        if (!UUID_REGEX.test(leadId)) {
          return NextResponse.json(
            { success: false, error: "معرف العميل غير صالح." },
            { status: 400 },
          );
        }

        const lead = await prisma.lead.findFirst({
          where: { id: leadId, tenantId: session.tenantId },
          select: { id: true },
        });
        if (!lead) {
          return NextResponse.json(
            {
              success: false,
              error: "العميل غير موجود أو لا يتبع منشأتك.",
            },
            { status: 404 },
          );
        }

        let priorityEnum: Priority = "MEDIUM";
        if (priority === "HIGH") priorityEnum = "HIGH";
        if (priority === "LOW") priorityEnum = "LOW";

        const parsedDueDate = dueDate
          ? new Date(dueDate)
          : new Date(Date.now() + 24 * 60 * 60 * 1000);
        if (Number.isNaN(parsedDueDate.getTime())) {
          return NextResponse.json(
            { success: false, error: "تاريخ استحقاق المهمة غير صالح." },
            { status: 400 },
          );
        }

        const task = await prisma.task.create({
          data: {
            tenantId: session.tenantId,
            leadId,
            assignedTo: session.userId,
            title: String(title).trim(),
            description: description ? String(description).trim() : null,
            dueDate: parsedDueDate,
            priority: priorityEnum,
            status: "PENDING",
            createdBy: session.userId,
            updatedBy: session.userId,
          },
        });

        await writeAuditLog({
          tenantId: session.tenantId,
          userId: session.userId,
          action: "LEAD_TASK_CREATED",
          tableName: "leads",
          recordId: leadId,
          details: JSON.stringify({ taskId: task.id }),
        });

        return NextResponse.json(
          { success: true, data: task },
          { status: 201 },
        );
      } catch (error: unknown) {
        return httpErrorResponse(
          request,
          ErrorCode.INTERNAL_ERROR,
          "POST /api/v1/tasks failed",
          error,
          500,
        );
      }
    },
  );
}
