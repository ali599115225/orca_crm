import { httpErrorResponse } from "@/lib/http-error-response";
// app/api/v1/tasks/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantAndUser } from "@/lib/api-helpers";
import { Priority } from "@prisma/client";
import { ErrorCode } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await getTenantAndUser(request);
    if (!tenantId) {
      return NextResponse.json({ error: "معرف المنشأة مفقود." }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const assignee = searchParams.get("assignee");

    const tasks = await prisma.task.findMany({
      where: {
        tenantId,
        ...(assignee ? { assignedTo: assignee } : {}),
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
  } catch (error: any) {
    return httpErrorResponse(request, ErrorCode.INTERNAL_ERROR, "GET /api/v1/tasks failed", error, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId, userId } = await getTenantAndUser(request);
    if (!tenantId) {
      return NextResponse.json({ error: "معرف المنشأة مفقود." }, { status: 400 });
    }

    const body = await request.json();
    const { leadId, title, description, dueDate, priority } = body;

    if (!leadId || !title) {
      return NextResponse.json({ error: "معرف العميل وعنوان المهمة مطلوبان." }, { status: 400 });
    }

    const lead = await prisma.lead.findFirst({
      where: { id: leadId, tenantId },
    });
    if (!lead) {
      return NextResponse.json({ error: "العميل غير موجود أو لا يتبع منشأتك." }, { status: 403 });
    }

    let priorityEnum: Priority = "MEDIUM";
    if (priority === "HIGH") priorityEnum = "HIGH";
    if (priority === "LOW") priorityEnum = "LOW";

    const task = await prisma.task.create({
      data: {
        tenantId,
        leadId,
        assignedTo: userId || (await prisma.user.findFirst({ where: { tenantId } }))?.id || "",
        title,
        description: description || null,
        dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 24 * 60 * 60 * 1000), // Default 24 hours
        priority: priorityEnum,
        status: "PENDING",
        createdBy: userId || null,
        updatedBy: userId || null,
      },
    });

    return NextResponse.json({ success: true, data: task }, { status: 201 });
  } catch (error: any) {
    return httpErrorResponse(request, ErrorCode.INTERNAL_ERROR, "POST /api/v1/tasks failed", error, 500);
  }
}
