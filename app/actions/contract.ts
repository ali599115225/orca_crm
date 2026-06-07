// app/actions/contract.ts
"use server";

import { prisma } from "@/lib/prisma";
import { getActiveTenant } from "@/lib/tenant";
import { revalidatePath } from "next/cache";

export async function saveContractTermsAction(terms: string) {
  try {
    const tenant = await getActiveTenant();
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { contractTerms: terms },
    });
    revalidatePath("/operations");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * جلب بيانات العملاء والوحدات الشاغرة المتاحة للتعاقد من قاعدة البيانات
 */
export async function getContractWizardDataAction() {
  try {
    const tenant = await getActiveTenant();

    // 1. جلب العملاء المستثمرين الفعليين (Leads)
    const leads = await prisma.lead.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
      },
    });

    // 2. جلب جهات الاتصال البديلة (Contacts) لشمولية الفهرس
    const contacts = await prisma.contact.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        phone: true,
      },
    });

    // دمج العملاء في مصفوفة موحدة
    const clients = [
      ...leads.map((l) => ({
        id: l.id,
        name: `${l.firstName} ${l.lastName || ""}`.trim(),
        phone: l.phone,
        type: "lead",
      })),
      ...contacts.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        type: "contact",
      })),
    ];

    // 3. جلب الوحدات العقارية غير المرتبطة بعقود مسبقة
    const units = await prisma.unit.findMany({
      where: {
        project: { tenantId: tenant.id },
      },
      include: {
        project: {
          select: { name: true },
        },
        contract: true,
      },
      orderBy: [
        { project: { name: "asc" } },
        { unitNumber: "asc" },
      ],
    });

    const availableProperties = units
      .filter((u) => !u.contract)
      .map((u) => ({
        id: u.id,
        unitNumber: u.unitNumber,
        priceSar: Number(u.priceSar),
        status: u.status,
        projectName: u.project?.name || "مشروع عام",
      }));

    return {
      success: true,
      clients,
      properties: availableProperties,
    };
  } catch (error: any) {
    console.error("فشل جلب بيانات معالج العقود:", error);
    return { success: false, error: error.message, clients: [], properties: [] };
  }
}

/**
 * إصدار عقد مبيعات حقيقي وربطه بالعميل والوحدة العقارية بشكل ذري وآمن
 */
export async function issueContractActionDirect(data: {
  clientId: string;
  propertyId: string;
  amount: number;
}) {
  try {
    const tenant = await getActiveTenant();
    const { clientId, propertyId, amount } = data;

    // 1. التحقق من صحة المعطيات الممررة
    if (!clientId) throw new Error("معرف العميل مطلوب.");
    if (!propertyId) throw new Error("معرف الوحدة العقارية مطلوب.");
    if (!amount || Number(amount) <= 0) {
      throw new Error("قيمة العقد يجب أن تكون رقمية وأكبر من الصفر.");
    }

    // 2. التحقق من وجود العميل وجلب بياناته
    let buyerName = "";
    let buyerPhone = "";

    const lead = await prisma.lead.findFirst({
      where: { id: clientId, tenantId: tenant.id },
    });

    if (lead) {
      buyerName = `${lead.firstName} ${lead.lastName || ""}`.trim();
      buyerPhone = lead.phone;
    } else {
      const contact = await prisma.contact.findFirst({
        where: { id: clientId, tenantId: tenant.id },
      });
      if (contact) {
        buyerName = contact.name;
        buyerPhone = contact.phone;
      } else {
        throw new Error("العميل المحدد غير موجود في النظام أو لا ينتمي لمنشأتك.");
      }
    }

    // 3. التحقق من وجود الوحدة العقارية وجاهزيتها
    const unit = await prisma.unit.findFirst({
      where: {
        id: propertyId,
        project: { tenantId: tenant.id },
      },
      include: {
        contract: true,
      },
    });

    if (!unit) throw new Error("الوحدة العقارية المحددة غير موجودة.");
    if (unit.contract) {
      throw new Error("هذه الوحدة العقارية متعاقد عليها بالفعل بموجب عقد قائم.");
    }

    // 4. إجراء المعاملة الذرية (Prisma Transaction) لحفظ العقد وتحديث حالة الوحدة
    const [contract] = await prisma.$transaction([
      // أ. إنشاء سجل العقد الجديد
      prisma.contract.create({
        data: {
          unitId: propertyId,
          buyerName,
          buyerPhone,
          totalVolumeSar: Number(amount),
        },
      }),
      // ب. تحديث حالة الوحدة إلى Sold
      prisma.unit.update({
        where: { id: propertyId },
        data: { status: "Sold" },
      }),
      // ج. تسجيل حدث الأمن والمراقبة
      prisma.auditLog.create({
        data: {
          tenantId: tenant.id,
          action: "CREATE_CONTRACT",
          tableName: "contracts",
          recordId: propertyId,
          details: `Issued new sales contract for unit ${unit.unitNumber} to client ${buyerName} worth ${amount} SAR`,
        },
      }),
      // د. تسجيل حدث تيليميتري للنظام
      prisma.telemetryEvent.create({
        data: {
          tenantId: tenant.id,
          eventType: "contract.issued",
          eventDataJson: JSON.stringify({
            unitId: propertyId,
            unitNumber: unit.unitNumber,
            buyerName,
            amount,
          }),
        },
      }),
    ]);

    revalidatePath("/operations/dashboard");
    revalidatePath("/operations/properties");

    return {
      success: true,
      contract: {
        id: contract.id,
        buyerName: contract.buyerName,
        buyerPhone: contract.buyerPhone,
        totalVolumeSar: Number(contract.totalVolumeSar),
        signedAt: contract.signedAt.toISOString(),
      },
    };
  } catch (error: any) {
    console.error("فشل إصدار العقد عبر الـ Server Action:", error);
    return { success: false, error: error.message };
  }
}
