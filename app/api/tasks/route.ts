// app/api/tasks/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/session";
import { cookies } from "next/headers";

async function authenticateRequest(request: NextRequest) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session_token")?.value;
  if (sessionToken) {
    const payload = await decrypt(sessionToken);
    if (payload && payload.tenantId) return payload;
  }

  const authHeader = request.headers.get("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    const payload = await decrypt(token);
    if (payload && payload.tenantId) return payload;
  }

  return null;
}

/**
 * GET /api/tasks - جلب المهام لجميع المبيعات للشركة الحالية
 */
export async function GET(request: NextRequest) {
  const session = await authenticateRequest(request);
  if (!session) {
    return NextResponse.json({ error: "غير مصرح بالوصول" }, { status: 401 });
  }

  try {
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
      orderBy: { dueDate: "asc" }
    });

    return NextResponse.json({ success: true, data: tasks });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/tasks - إنشاء وتكليف مهمة متابعة جديدة
 */
export async function POST(request: NextRequest) {
  const session = await authenticateRequest(request);
  if (!session) {
    return NextResponse.json({ error: "غير مصرح بالوصول" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, description, leadId, dueDate, priority } = body;

    if (!title || !leadId || !dueDate || !priority) {
      return NextResponse.json({ success: false, error: "حقول العنوان، العميل، التاريخ، والأولوية إلزامية." }, { status: 400 });
    }

    // التحقق من صلاحية العميل ومستشاره المكلف
    const lead = await prisma.lead.findUnique({
      where: { id: leadId, tenantId: session.tenantId },
      select: { assignedTo: true }
    });

    if (!lead || !lead.assignedTo) {
      return NextResponse.json({ success: false, error: "العميل المرتبط بالمهمة غير موجود أو غير مسند لمستشار مبيعات." }, { status: 400 });
    }

    const newTask = await prisma.task.create({
      data: {
        tenant: { connect: { id: session.tenantId } },
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
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * PUT /api/tasks - تحديث حالة المهمة أو تعديل تفاصيلها
 */
export async function PUT(request: NextRequest) {
  const session = await authenticateRequest(request);
  if (!session) {
    return NextResponse.json({ error: "غير مصرح بالوصول" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, title, description, dueDate, priority, status } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "معرّف المهمة (id) مطلوب للتعديل." }, { status: 400 });
    }

    // التحقق من ملكية المهمة للشركة
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
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/tasks - حذف المهمة المجدولة نهائياً
 */
export async function DELETE(request: NextRequest) {
  const session = await authenticateRequest(request);
  if (!session) {
    return NextResponse.json({ error: "غير مصرح بالوصول" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "معرّف المهمة (id) مطلوب للحذف." }, { status: 400 });
    }

    // التحقق من ملكية المهمة قبل الحذف
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
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
