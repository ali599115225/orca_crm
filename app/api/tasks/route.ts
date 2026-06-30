import { httpErrorResponse } from "@/lib/http-error-response";
// app/api/tasks/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDatabaseSession, TENANT_ROLES } from "@/lib/api-auth-guard";
import { ErrorCode } from "@/lib/errors";

/**
 * GET /api/tasks - جلب المهام لجميع المبيعات للشركة الحالية
 */
export async function GET(request: NextRequest) {
  const auth = await requireDatabaseSession(request, TENANT_ROLES);
  if (auth.error) return auth.error;

  try {
    const session = auth.session;
    const tasks = await prisma.task.findMany({
      where: { tenantId: session.tenantId },
      include: {
        lead: {
          select: { firstName: true, lastName: true, phone: true }
        },
        assignedUser: {
          select: { name: true }
        }
      },
      orderBy: { dueDate: "asc" },
      take: 100,
    });

    return NextResponse.json({ success: true, data: tasks });
  } catch (error: any) {
    return httpErrorResponse(request, ErrorCode.INTERNAL_ERROR, "GET /api/tasks failed", error, 500);
  }
}

/**
 * POST /api/tasks - إنشاء وتكليف مهمة متابعة جديدة
 */
export async function POST(request: NextRequest) {
  const auth = await requireDatabaseSession(request, TENANT_ROLES);
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const { title, description, leadId, dueDate, priority } = body;

    if (!title || !leadId || !dueDate || !priority) {
      return NextResponse.json({ success: false, error: "حقول العنوان، العميل، التاريخ، والأولوية إلزامية." }, { status: 400 });
    }

    // التحقق من صلاحية العميل ومستشاره المكلف
    const session = auth.session;
    const lead = await prisma.lead.findUnique({
      where: { id: leadId, tenantId: session.tenantId },
      select: { assignedTo: true }
    });

    if (!lead || !lead.assignedTo) {
      return NextResponse.json({ success: false, error: "العميل المرتبط بالمهمة غير موجود أو غير مسند لمستشار مبيعات." }, { status: 400 });
    }

    const newTask = await prisma.task.create({
      data: {
        tenant: { connect: { id: session.tenantId as string } },
        lead: { connect: { id: leadId } },
        assignedUser: { connect: { id: lead.assignedTo } },
        title,
        description: description || null,
        dueDate: new Date(dueDate),
        priority,
        status: "PENDING",
      }
    });

    return NextResponse.json({ success: true, data: newTask }, { status: 201 });
  } catch (error: any) {
    return httpErrorResponse(request, ErrorCode.INTERNAL_ERROR, "POST /api/tasks failed", error, 500);
  }
}

/**
 * PUT /api/tasks - تحديث حالة المهمة أو تعديل تفاصيلها
 */
export async function PUT(request: NextRequest) {
  const auth = await requireDatabaseSession(request, TENANT_ROLES);
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const { id, title, description, dueDate, priority, status } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "معرّف المهمة (id) مطلوب للتعديل." }, { status: 400 });
    }

    // التحقق من ملكية المهمة للشركة
    const session = auth.session;
    const existingTask = await prisma.task.findFirst({
      where: { id, tenantId: session.tenantId }
    });

    if (!existingTask) {
      return NextResponse.json({ success: false, error: "المهمة غير موجودة أو لا تملك صلاحية الوصول لتعديلها." }, { status: 404 });
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        title: title || undefined,
        description: description !== undefined ? description : undefined,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        priority: priority || undefined,
        status: status || undefined,
      }
    });

    return NextResponse.json({ success: true, data: updatedTask });
  } catch (error: any) {
    return httpErrorResponse(request, ErrorCode.INTERNAL_ERROR, "PUT /api/tasks failed", error, 500);
  }
}

/**
 * DELETE /api/tasks - حذف المهمة المجدولة نهائياً
 */
export async function DELETE(request: NextRequest) {
  const auth = await requireDatabaseSession(request, TENANT_ROLES);
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "معرّف المهمة (id) مطلوب للحذف." }, { status: 400 });
    }

    // التحقق من ملكية المهمة قبل الحذف
    const session = auth.session;
    const existingTask = await prisma.task.findFirst({
      where: { id, tenantId: session.tenantId }
    });

    if (!existingTask) {
      return NextResponse.json({ success: false, error: "المهمة غير موجودة أو لا تملك صلاحية حذفها." }, { status: 404 });
    }

    await prisma.task.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: "تم حذف مهمة المتابعة بنجاح." });
  } catch (error: any) {
    return httpErrorResponse(request, ErrorCode.INTERNAL_ERROR, "DELETE /api/tasks failed", error, 500);
  }
}
