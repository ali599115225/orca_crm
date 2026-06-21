// app/api/v1/contracts/issue/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantAndUser } from "@/lib/api-helpers";
import { issueContract } from "@/lib/domain/transaction-spine";

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

    if (!clientId) {
      return NextResponse.json({ error: "معرف العميل مطلوب." }, { status: 400 });
    }
    if (!propertyId) {
      return NextResponse.json({ error: "معرف الوحدة العقارية مطلوب." }, { status: 400 });
    }
    if (!amount || Number(amount) <= 0) {
      return NextResponse.json({ error: "قيمة العقد يجب أن تكون رقمية وأكبر من الصفر." }, { status: 400 });
    }

    const contract = await issueContract({
      tenantId,
      userId: userId || "",
      clientId,
      propertyId,
      amount: Number(amount),
    });

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
