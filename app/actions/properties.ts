// app/actions/properties.ts
"use server";

import { prisma } from "@/lib/prisma";
import { getActiveTenant } from "@/lib/tenant";
import { revalidatePath } from "next/cache";

/**
 * جلب العقارات والوحدات التابعة للشركاء والمشاريع الخاصة بالمنشأة الحالية
 */
export async function getPropertiesAction(filters?: { search?: string; status?: string; projectId?: string }) {
  try {
    const tenant = await getActiveTenant();

    const where: any = {
      project: {
        tenantId: tenant.id,
      },
    };

    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.projectId) {
      where.projectId = filters.projectId;
    }

    const units = await prisma.unit.findMany({
      where,
      include: {
        project: {
          select: { id: true, name: true },
        },
        contract: {
          select: { id: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    let list = units.map((u) => ({
      id: u.id,
      sku: u.unitNumber,
      type: u.type || "شقة سكنية",
      project: u.project?.name || "",
      projectId: u.projectId,
      area: u.area || "120 م²",
      price: Number(u.priceSar),
      priceStr: Number(u.priceSar).toLocaleString() + " ر.س",
      status: u.status as "Available" | "Hold" | "Sold",
      desc: u.description || "",
      media: Array.isArray(u.media) ? (u.media as string[]) : [],
      docs: Array.isArray(u.docs) ? (u.docs as string[]) : [],
      events: Array.isArray(u.events) ? (u.events as any[]) : [],
      handovers: Array.isArray(u.handovers) ? (u.handovers as any[]) : [],
      contractId: u.contract?.id || undefined,
      beds: u.beds || 3,
      city: u.city || "الرياض",
      district: u.district || "غير محدد",
      agentName: u.agentName || "غير معين",
      lat: u.lat || 24.7,
      lng: u.lng || 46.7,
      createdAt: u.createdAt,
    }));

    if (filters?.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (u) =>
          u.sku.toLowerCase().includes(q) ||
          u.type.toLowerCase().includes(q) ||
          u.project.toLowerCase().includes(q)
      );
    }

    return list;
  } catch (error) {
    console.error("فشل جلب العقارات والوحدات:", error);
    return [];
  }
}

/**
 * إنشاء وحدة عقارية جديدة في جدول Unit وربطها بمشروع محدد للمستأجر
 */
export async function createUnitActionDirect(data: {
  projectId: string;
  unitNumber: string;
  priceSar: number;
  type: string;
  area: string;
  description?: string;
}) {
  try {
    const tenant = await getActiveTenant();

    // التحقق من أن المشروع ينتمي للمنشأة
    const project = await prisma.project.findFirst({
      where: { id: data.projectId, tenantId: tenant.id },
    });

    if (!project) {
      throw new Error("المشروع العقاري المحدد غير موجود أو لا ينتمي لشركتك.");
    }

    const newUnit = await prisma.unit.create({
      data: {
        tenantId: tenant.id,
        projectId: data.projectId,
        unitNumber: data.unitNumber,
        floorPosition: 0,
        priceSar: data.priceSar,
        type: data.type || "شقة سكنية",
        area: data.area || "120 م²",
        description: data.description || "وحدة سكنية مضافة حديثاً إلى مستودع العقارات.",
        status: "Available",
        events: [
          {
            id: `ev_new_${Date.now()}`,
            type: "إدراج الوحدة",
            at: new Date().toISOString().split("T")[0],
            note: "تم إدراج الوحدة بنجاح في نظام إدارة العقارات",
          },
        ],
        handovers: [],
        media: [],
        docs: [],
      },
      include: {
        project: { select: { id: true, name: true } },
      },
    });

    revalidatePath("/operations/properties");
    return {
      success: true,
      data: {
        id: newUnit.id,
        sku: newUnit.unitNumber,
        type: newUnit.type || "شقة سكنية",
        project: newUnit.project?.name || "",
        projectId: newUnit.projectId,
        area: newUnit.area || "120 م²",
        price: Number(newUnit.priceSar),
        priceStr: Number(newUnit.priceSar).toLocaleString() + " ر.س",
        status: newUnit.status as "Available" | "Hold" | "Sold",
        desc: newUnit.description || "",
        media: [],
        docs: [],
        events: newUnit.events as any[],
        handovers: [],
      },
    };
  } catch (error: any) {
    console.error("فشل إنشاء الوحدة العقارية:", error);
    return { success: false, error: error.message };
  }
}

/**
 * حجز وحدة عقارية وإصدار عقد بيع حقيقي في قاعدة البيانات كعملية ذرية واحدة
 */
export async function bookUnitActionDirect(data: {
  unitId: string;
  clientId: string;
  offerPrice: number;
  bookingDate: string;
}) {
  try {
    const tenant = await getActiveTenant();

    let buyerName = "";
    let buyerPhone = "";

    // محاولة جلب بيانات العميل من جدول Leads
    const lead = await prisma.lead.findFirst({
      where: { id: data.clientId, tenantId: tenant.id },
    });

    if (lead) {
      buyerName = `${lead.firstName} ${lead.lastName || ""}`.trim();
      buyerPhone = lead.phone;
    } else {
      // محاولة الجلب من جدول Contacts
      const contact = await prisma.contact.findFirst({
        where: { id: data.clientId, tenantId: tenant.id },
      });
      if (contact) {
        buyerName = contact.name;
        buyerPhone = contact.phone;
      } else {
        // Fallback إذا كان مدخلاً نصياً مباشراً
        buyerName = data.clientId;
        buyerPhone = "0500000000";
      }
    }

    // التحقق من الوحدة
    const unit = await prisma.unit.findFirst({
      where: { id: data.unitId, project: { tenantId: tenant.id } },
      include: { contract: true },
    });

    if (!unit) {
      throw new Error("الوحدة العقارية المحددة غير موجودة.");
    }
    if (unit.contract) {
      throw new Error("هذه الوحدة متعاقد عليها بالفعل بموجب عقد قائم.");
    }

    const bookingDateObj = data.bookingDate ? new Date(data.bookingDate) : new Date();

    // إعداد قائمة الأحداث الجديدة للوحدة
    const newEvent = {
      id: `ev_bk_${Date.now()}`,
      type: "إنشاء حجز وعقد",
      at: bookingDateObj.toISOString().split("T")[0],
      note: `حجز للعميل المعرف بـ ${buyerName} بقيمة تعاقدية ${data.offerPrice.toLocaleString()} ر.س`,
    };

    const updatedEvents = Array.isArray(unit.events) ? [...unit.events, newEvent] : [newEvent];

    // المعاملة الذرية (Prisma Transaction)
    const [contract] = await prisma.$transaction([
      // 1. إنشاء سجل العقد الجديد مع ربطه بالوحدة
      prisma.contract.create({
        data: {
          tenantId: tenant.id,
          unitId: data.unitId,
          buyerName,
          buyerPhone,
          totalVolumeSar: data.offerPrice,
          signedAt: bookingDateObj,
        },
      }),
      // 2. تحديث حالة الوحدة إلى Sold وإضافة الحدث
      prisma.unit.update({
        where: { id: data.unitId },
        data: {
          status: "Sold",
          events: updatedEvents,
        },
      }),
      // 3. كتابة سجل تدقيق
      prisma.auditLog.create({
        data: {
          tenantId: tenant.id,
          action: "CREATE_CONTRACT",
          tableName: "contracts",
          recordId: data.unitId,
          details: `Issued sales contract for unit ${unit.unitNumber} to client ${buyerName} worth ${data.offerPrice} SAR`,
        },
      }),
    ]);

    revalidatePath("/operations/properties");
    return { success: true, contractId: contract.id };
  } catch (error: any) {
    console.error("فشل إتمام حجز الوحدة والعقد:", error);
    return { success: false, error: error.message };
  }
}

/**
 * توثيق محضر معاينة وتسليم الوحدة (Handover) وحفظ البيانات في الحقل المخصص بجدول Unit
 */
export async function completeHandoverActionDirect(data: {
  unitId: string;
  handoverDate: string;
  checklist: string;
  photoUrl: string;
}) {
  try {
    const tenant = await getActiveTenant();

    const unit = await prisma.unit.findFirst({
      where: { id: data.unitId, project: { tenantId: tenant.id } },
    });

    if (!unit) {
      throw new Error("الوحدة العقارية المحددة غير موجودة.");
    }

    const hoId = `ho_${Date.now()}`;
    const dateObj = new Date(data.handoverDate);
    const visibleDateStr = `${String(dateObj.getDate()).padStart(2, "0")}/${String(
      dateObj.getMonth() + 1
    ).padStart(2, "0")}/${dateObj.getFullYear()}`;

    const newHandover = {
      id: hoId,
      scheduledAt: visibleDateStr,
      status: "Completed",
      checklist: data.checklist,
      media: [data.photoUrl],
      completedAt: new Date().toISOString(),
    };

    const newEvent = {
      id: `ev_ho_${Date.now()}`,
      type: "إتمام معاينة والتسليم النهائي",
      at: data.handoverDate,
      note: "تم تسليم الوحدة وإمضاء محضر الاستلام الخالي من الملاحظات والعيوب مسبقاً",
    };

    const updatedHandovers = Array.isArray(unit.handovers) ? [...unit.handovers, newHandover] : [newHandover];
    const updatedEvents = Array.isArray(unit.events) ? [...unit.events, newEvent] : [newEvent];

    await prisma.unit.update({
      where: { id: data.unitId },
      data: {
        handovers: updatedHandovers,
        events: updatedEvents,
      },
    });

    revalidatePath("/operations/properties");
    return { success: true, handoverId: hoId };
  } catch (error: any) {
    console.error("فشل إتمام تسليم الوحدة:", error);
    return { success: false, error: error.message };
  }
}

/**
 * تحديث حالة الوحدة العقارية في قاعدة البيانات مباشرة (مثل الحجز المؤقت الفوري)
 */
export async function updateUnitStatusAction(unitId: string, status: string) {
  try {
    const tenant = await getActiveTenant();

    // التحقق من أن الوحدة تابعة للمستأجر
    const unit = await prisma.unit.findFirst({
      where: { id: unitId, project: { tenantId: tenant.id } }
    });

    if (!unit) throw new Error("الوحدة غير موجودة أو لا تملك الصلاحية للوصول إليها.");

    const updatedUnit = await prisma.unit.update({
      where: { id: unitId },
      data: { status }
    });

    revalidatePath("/operations/properties");
    return { success: true, status: updatedUnit.status };
  } catch (error: any) {
    console.error("فشل تحديث حالة الوحدة:", error);
    return { success: false, error: error.message };
  }
}

