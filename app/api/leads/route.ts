// app/api/leads/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/session";
import { cookies } from "next/headers";

/**
 * دالة مصادقة الطلب من الكوكيز أو الهيدر للـ API الخارجية
 */
async function authenticateRequest(request: NextRequest) {
  // 1. التحقق من الكوكيز (للجلسات المتصفحية)
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session_token")?.value;
  if (sessionToken) {
    const payload = await decrypt(sessionToken);
    if (payload && payload.tenantId) return payload;
  }

  // 2. التحقق من Authorization Header (لأنظمة الربط الخارجي)
  const authHeader = request.headers.get("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    const payload = await decrypt(token);
    if (payload && payload.tenantId) return payload;
  }

  return null;
}

/**
 * GET /api/leads - جلب جميع العملاء التابعين للشركة الحالية
 */
export async function GET(request: NextRequest) {
  const session = await authenticateRequest(request);
  if (!session) {
    return NextResponse.json({ error: "غير مصرح بالوصول" }, { status: 401 });
  }

  try {
    const leads = await prisma.lead.findMany({
      where: { tenantId: session.tenantId },
      include: {
        project: {
          select: { name: true, city: true }
        },
        assignedUser: {
          select: { name: true, email: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({ success: true, data: leads });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/leads - إنشاء عميل محتعل جديد مع فحص التكرار الصارم والربط الآمن
 */
export async function POST(request: NextRequest) {
  const session = await authenticateRequest(request);
  if (!session) {
    return NextResponse.json({ error: "غير مصرح بالوصول" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { firstName, lastName, phone, city, source, projectId, assignedTo } = body;

    // التحقق من الحقول الإلزامية
    if (!firstName || !phone) {
      return NextResponse.json({ success: false, error: "الاسم الأول ورقم الجوال حقول إلزامية." }, { status: 400 });
    }

    // التحقق من تكرار الهاتف لمنع تضارب المبيعات للـ SaaS
    const isDuplicate = await prisma.lead.findFirst({
      where: {
        tenantId: session.tenantId,
        phone: phone,
      },
    });

    if (isDuplicate) {
      return NextResponse.json({ 
        success: false, 
        error: `رقم الجوال ${phone} مسجل مسبقاً باسم العميل (${isDuplicate.firstName} ${isDuplicate.lastName || ""})` 
      }, { status: 409 });
    }

    // إنشاء السجل بصيغة الربط العلائقي connect الآمنة
    const newLead = await prisma.lead.create({
      data: {
        tenant: {
          connect: { id: session.tenantId }
        },
        firstName,
        lastName: lastName || null,
        phone,
        city: city || "الرياض",
        source: source || "إعلانات خارجية API",
        status: "NEW",
        project: projectId ? {
          connect: { id: projectId }
        } : undefined,
        assignedUser: assignedTo ? {
          connect: { id: assignedTo }
        } : undefined,
      },
    });

    return NextResponse.json({ success: true, data: newLead }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * PUT /api/leads - تحديث بيانات العميل أو نقل حالته بقمع المبيعات
 */
export async function PUT(request: NextRequest) {
  const session = await authenticateRequest(request);
  if (!session) {
    return NextResponse.json({ error: "غير مصرح بالوصول" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, status, firstName, lastName, phone, city, projectId, assignedTo } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "معرف العميل (id) مطلوب لتحديث البيانات." }, { status: 400 });
    }

    // التحقق من ملكية العميل للشركة أولاً
    const existingLead = await prisma.lead.findFirst({
      where: { id, tenantId: session.tenantId }
    });

    if (!existingLead) {
      return NextResponse.json({ success: false, error: "العميل غير موجود أو لا تملك الصلاحية لتعديله." }, { status: 404 });
    }

    // تحديث البيانات
    const updatedLead = await prisma.lead.update({
      where: { id },
      data: {
        status: status || undefined,
        firstName: firstName || undefined,
        lastName: lastName !== undefined ? lastName : undefined,
        phone: phone || undefined,
        city: city || undefined,
        project: projectId ? { connect: { id: projectId } } : (projectId === null ? { disconnect: true } : undefined),
        assignedUser: assignedTo ? { connect: { id: assignedTo } } : (assignedTo === null ? { disconnect: true } : undefined),
      }
    });

    return NextResponse.json({ success: true, data: updatedLead });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/leads - حذف العميل نهائياً من النظام
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
      return NextResponse.json({ success: false, error: "معرف العميل (id) مطلوب للحذف." }, { status: 400 });
    }

    // التحقق من ملكية العميل للشركة أولاً قبل الحذف
    const existingLead = await prisma.lead.findFirst({
      where: { id, tenantId: session.tenantId }
    });

    if (!existingLead) {
      return NextResponse.json({ success: false, error: "العميل غير موجود أو لا تملك الصلاحية لحذفه." }, { status: 404 });
    }

    await prisma.lead.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: "تم حذف العميل بنجاح." });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
