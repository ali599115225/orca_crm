import { Priority } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import {
  runWithDatabaseSession,
  TENANT_ROLES,
  TENANT_WRITE_ROLES,
} from "@/lib/api-auth-guard";
import { writeAuditLog } from "@/lib/audit";
import { ErrorCode } from "@/lib/errors";
import { httpErrorResponse } from "@/lib/http-error-response";
import { prisma } from "@/lib/prisma";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const TASK_PRIORITIES = new Set<Priority>(["LOW", "MEDIUM", "HIGH"]);

export async function GET(request: NextRequest) {
  return runWithDatabaseSession(request, TENANT_ROLES, async (session) => {
    try {
      const { searchParams } = new URL(request.url);
      const assignee = searchParams.get("assignee")?.trim() || "";
      const leadId = searchParams.get("leadId")?.trim() || "";

      if (leadId && !UUID_REGEX.test(leadId)) {
        return NextResponse.json(
          { success: false, error: "معرف العميل غير صالح." },
          { status: 400 },
        );
      }

      if (assignee && !UUID_REGEX.test(assignee)) {
        return NextResponse.json(
          { success: false, error: "معرف المسؤول غير صالح." },
          { status: 400 },
        );
      }

      const tasks = await prisma.task.findMany({
        where: {
          tenantId: session.tenantId,
          ...(assignee ? { assignedTo: assignee } : {}),
          ...(leadId ? { leadId } : {}),
        },
        orderBy: [{ status: "asc" }, { dueDate: "asc" }],
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
        const leadId = String(body.leadId || "").trim();
        const requestedAssignee = String(body.assignedTo || "").trim();
        const title = String(body.title || "").trim();
        const description = String(body.description || "").trim();
        const rawPriority = String(body.priority || "MEDIUM")
          .trim()
          .toUpperCase();
        const dueDate = new Date(body.dueDate);

        if (!leadId || title.length < 2) {
          return NextResponse.json(
            {
              success: false,
              error: "العميل وعنوان المهمة مطلوبان.",
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

        if (requestedAssignee && !UUID_REGEX.test(requestedAssignee)) {
          return NextResponse.json(
            { success: false, error: "معرف المسؤول غير صالح." },
            { status: 400 },
          );
        }

        if (!TASK_PRIORITIES.has(rawPriority as Priority)) {
          return NextResponse.json(
            { success: false, error: "أولوية المهمة غير صالحة." },
            { status: 400 },
          );
        }

        if (Number.isNaN(dueDate.getTime())) {
          return NextResponse.json(
            {
              success: false,
              error: "تاريخ استحقاق المهمة غير صالح.",
            },
            { status: 400 },
          );
        }

        const lead = await prisma.lead.findFirst({
          where: {
            id: leadId,
            tenantId: session.tenantId,
            isArchived: false,
          },
          select: {
            id: true,
            assignedTo: true,
          },
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

        const assignedTo = requestedAssignee || lead.assignedTo || "";
        if (!assignedTo) {
          return NextResponse.json(
            {
              success: false,
              error: "يجب اختيار مسؤول للمهمة.",
            },
            { status: 409 },
          );
        }

        const assignedUser = await prisma.user.findFirst({
          where: {
            id: assignedTo,
            tenantId: session.tenantId,
            isActive: true,
          },
          select: { id: true },
        });

        if (!assignedUser) {
          return NextResponse.json(
            {
              success: false,
              error: "المسؤول غير موجود أو غير نشط في منشأتك.",
            },
            { status: 404 },
          );
        }

        const task = await prisma.task.create({
          data: {
            tenantId: session.tenantId,
            leadId: lead.id,
            assignedTo,
            title: title.slice(0, 160),
            description: description
              ? description.slice(0, 2000)
              : null,
            dueDate,
            priority: rawPriority as Priority,
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
          tenantId: session.tenantId,
          userId: session.userId,
          action: "TASK_CREATED",
          tableName: "tasks",
          recordId: task.id,
          details: JSON.stringify({
            leadId: lead.id,
            assignedTo,
            dueDate: dueDate.toISOString(),
            priority: rawPriority,
          }),
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
