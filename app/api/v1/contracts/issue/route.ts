// app/api/v1/contracts/issue/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantAndUser } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await getTenantAndUser(request);
    if (!tenantId) {
      return NextResponse.json({ error: "معرف المنشأة مفقود." }, { status: 400 });
    }

    // 1. جلب العملاء المستثمرين الفعليين (Leads)
    const leads = await prisma.lead.findMany({
      where: { tenantId },
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
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        phone: true,
      },
    });

    // دمج العملاء في مصفوفة موحدة للواجهة
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
        project: { tenantId },
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

    return NextResponse.json({
      success: true,
      clients,
      properties: availableProperties,
    });
  } catch (error: any) {
    console.error("Failed to query clients and properties for ContractWizard:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId, userId } = await getTenantAndUser(request);
    if (!tenantId) {
      return NextResponse.json({ error: "معرف المنشأة مفقود." }, { status: 400 });
    }

    const body = await request.json();
    const { clientId, propertyId, amount } = body;

    // 1. التحقق من صحة المعطيات الممررة
    if (!clientId) {
      return NextResponse.json({ error: "معرف العميل مطلوب." }, { status: 400 });
    }
    if (!propertyId) {
      return NextResponse.json({ error: "معرف الوحدة العقارية مطلوب." }, { status: 400 });
    }
    if (!amount || Number(amount) <= 0) {
      return NextResponse.json({ error: "قيمة العقد يجب أن تكون رقمية وأكبر من الصفر." }, { status: 400 });
    }

    // 2. التحقق من وجود العميل وجلب بياناته
    let buyerName = "";
    let buyerPhone = "";

    const lead = await prisma.lead.findFirst({
      where: { id: clientId, tenantId },
    });

    if (lead) {
      buyerName = `${lead.firstName} ${lead.lastName || ""}`.trim();
      buyerPhone = lead.phone;
    } else {
      const contact = await prisma.contact.findFirst({
        where: { id: clientId, tenantId },
      });
      if (contact) {
        buyerName = contact.name;
        buyerPhone = contact.phone;
      } else {
        return NextResponse.json({ error: "العميل المحدد غير موجود في النظام." }, { status: 404 });
      }
    }

    // 3. التحقق من وجود الوحدة العقارية وجاهزيتها
    const unit = await prisma.unit.findFirst({
      where: {
        id: propertyId,
        project: { tenantId },
      },
      include: {
        contract: true,
      },
    });

    if (!unit) {
      return NextResponse.json({ error: "الوحدة العقارية المحددة غير موجودة." }, { status: 404 });
    }

    if (unit.contract) {
      return NextResponse.json({ error: "هذه الوحدة العقارية متعاقد عليها بالفعل بموجب عقد قائم." }, { status: 400 });
    }

    // 4. إجراء المعاملة الذرية (Prisma Transaction) لحفظ العقد وتحديث الوحدة
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
      // ب. تحديث حالة الوحدة إلى sold
      prisma.unit.update({
        where: { id: propertyId },
        data: { status: "Sold" },
      }),
      // ج. تسجيل حدث الأمن والمراقبة
      prisma.auditLog.create({
        data: {
          tenantId,
          userId: userId || null,
          action: "CREATE_CONTRACT",
          tableName: "contracts",
          recordId: propertyId, // unique per unit/contract
          details: `Issued new sales contract for unit ${unit.unitNumber} to client ${buyerName} worth ${amount} SAR`,
        },
      }),
      // د. تسجيل حدث تيليميتري للنظام
      prisma.telemetryEvent.create({
        data: {
          tenantId,
          eventType: "contract.issued",
          eventDataJson: JSON.stringify({
            unitId: propertyId,
            unitNumber: unit.unitNumber,
            buyerName,
            amount,
          }),
          createdBy: userId || null,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      contract: {
        id: contract.id,
        buyerName: contract.buyerName,
        buyerPhone: contract.buyerPhone,
        totalVolumeSar: Number(contract.totalVolumeSar),
        signedAt: contract.signedAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Failed to issue new contract:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
