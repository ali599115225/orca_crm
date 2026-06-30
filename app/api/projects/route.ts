import { httpErrorResponse } from "@/lib/http-error-response";
// app/api/projects/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/session";
import { cookies } from "next/headers";
import { rateLimit } from "@/lib/rate-limit";
import { tenantContext } from "@/lib/tenant-context";
import { assertPlanLimit, PlanLimitError, logPlanBlockedAttempt } from "@/lib/plan-guard";
import { ErrorCode } from "@/lib/errors";

async function authenticateRequest(request: NextRequest) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session_token")?.value;
  if (sessionToken) {
    const payload = await decrypt(sessionToken);
    if (payload && payload.tenantId) {
      tenantContext.enterWith({ tenantId: payload.tenantId as string, userId: (payload.userId as string) || undefined });
      return payload;
    }
  }

  const authHeader = request.headers.get("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    const payload = await decrypt(token);
    if (payload && payload.tenantId) {
      tenantContext.enterWith({ tenantId: payload.tenantId as string, userId: (payload.userId as string) || undefined });
      return payload;
    }
  }

  return null;
}

/**
 * GET /api/projects - جلب قائمة المشاريع العقارية للشركة الحالية
 */
export async function GET(request: NextRequest) {
  const session = await authenticateRequest(request);
  if (!session) {
    return NextResponse.json({ error: "غير مصرح بالوصول" }, { status: 401 });
  }

    const rl = await rateLimit(`projects:${session.tenantId}`);
    if (!rl.allowed) {
    return NextResponse.json({ error: "طلبات كثيرة جداً. حاول لاحقاً.", retryAfter: Math.ceil(rl.resetIn / 1000) }, { status: 429 });
  }

  try {
    const projects = await prisma.project.findMany({
      where: { tenantId: session.tenantId as string },
      include: {
        _count: {
          select: { leads: true }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const formattedProjects = projects.map(p => ({
      ...p,
      minPrice: p.minPrice ? Number(p.minPrice) : null,
      maxPrice: p.maxPrice ? Number(p.maxPrice) : null,
    }));

    return NextResponse.json({ success: true, data: formattedProjects });
  } catch (error: any) {
    return httpErrorResponse(request, ErrorCode.INTERNAL_ERROR, "GET /api/projects failed", error, 500);
  }
}

/**
 * POST /api/projects - إنشاء مشروع عقاري جديد وربطه بالـ Tenant
 */
export async function POST(request: NextRequest) {
  const session = await authenticateRequest(request);
  if (!session) {
    return NextResponse.json({ error: "غير مصرح بالوصول" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, city, status, unitsTotal, minPrice, maxPrice } = body;

    if (!name || !city || !status) {
      return NextResponse.json({ success: false, error: "حقول الاسم، المدينة، وحالة المشروع إلزامية." }, { status: 400 });
    }

    const newProject = await prisma.$transaction(async (tx) => {
      await assertPlanLimit({ tenantId: session.tenantId as string, feature: "projects", tx });
      return tx.project.create({
        data: {
          tenant: {
            connect: { id: session.tenantId as string }
          },
          name,
          city,
          status,
          unitsTotal: parseInt(unitsTotal) || 0,
          unitsSold: 0,
          unitsBooked: 0,
          minPrice: minPrice ? parseFloat(minPrice) : null,
          maxPrice: maxPrice ? parseFloat(maxPrice) : null,
        }
      });
    });

    return NextResponse.json({ success: true, data: newProject }, { status: 201 });
  } catch (error: any) {
    if (error instanceof PlanLimitError) {
      await logPlanBlockedAttempt({ tenantId: session.tenantId as string, error }).catch(() => {});
      return NextResponse.json(error.toJSON(), { status: 403 });
    }
    return httpErrorResponse(request, ErrorCode.INTERNAL_ERROR, "POST /api/projects failed", error, 500);
  }
}

/**
 * PUT /api/projects - تعديل بيانات مشروع عقاري موجود
 */
export async function PUT(request: NextRequest) {
  const session = await authenticateRequest(request);
  if (!session) {
    return NextResponse.json({ error: "غير مصرح بالوصول" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, name, city, status, unitsTotal, unitsSold, unitsBooked, minPrice, maxPrice } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "معرّف المشروع (id) مطلوب لإتمام التعديل." }, { status: 400 });
    }

    // التحقق من ملكية المشروع للمستأجر
    const existingProject = await prisma.project.findFirst({
      where: { id, tenantId: session.tenantId as string }
    });

    if (!existingProject) {
      return NextResponse.json({ success: false, error: "المشروع العقاري غير موجود أو لا تملك صلاحية الوصول لتعديله." }, { status: 404 });
    }

    const updatedProject = await prisma.project.update({
      where: { id },
      data: {
        name: name || undefined,
        city: city || undefined,
        status: status || undefined,
        unitsTotal: unitsTotal !== undefined ? parseInt(unitsTotal) : undefined,
        unitsSold: unitsSold !== undefined ? parseInt(unitsSold) : undefined,
        unitsBooked: unitsBooked !== undefined ? parseInt(unitsBooked) : undefined,
        minPrice: minPrice !== undefined ? (minPrice ? parseFloat(minPrice) : null) : undefined,
        maxPrice: maxPrice !== undefined ? (maxPrice ? parseFloat(maxPrice) : null) : undefined,
      }
    });

    return NextResponse.json({ success: true, data: updatedProject });
  } catch (error: any) {
    return httpErrorResponse(request, ErrorCode.INTERNAL_ERROR, "PUT /api/projects failed", error, 500);
  }
}

/**
 * DELETE /api/projects - حذف مشروع عقاري نهائياً
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
      return NextResponse.json({ success: false, error: "معرّف المشروع (id) مطلوب للحذف." }, { status: 400 });
    }

    // التحقق من ملكية المشروع للمستأجر قبل الحذف
    const existingProject = await prisma.project.findFirst({
      where: { id, tenantId: session.tenantId as string }
    });

    if (!existingProject) {
      return NextResponse.json({ success: false, error: "المشروع غير موجود أو لا تملك صلاحية حذفه." }, { status: 404 });
    }

    await prisma.project.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: "تم حذف المشروع العقاري بنجاح من قاعدة البيانات." });
  } catch (error: any) {
    return httpErrorResponse(request, ErrorCode.INTERNAL_ERROR, "DELETE /api/projects failed", error, 500);
  }
}
