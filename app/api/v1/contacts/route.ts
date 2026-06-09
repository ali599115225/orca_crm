// app/api/v1/contacts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantAndUser } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await getTenantAndUser(request);
    if (!tenantId) {
      return NextResponse.json({ error: "معرف المنشأة مفقود." }, { status: 400 });
    }

    const contacts = await prisma.contact.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ success: true, data: contacts });
  } catch (error: any) {
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
    const { leadId, name, phone, email, preferredContactTime, budgetRange, notes } = body;

    if (!name || !phone) {
      return NextResponse.json({ error: "الاسم ورقم الهاتف مطلوبان." }, { status: 400 });
    }

    const contact = await prisma.contact.create({
      data: {
        tenantId,
        leadId: leadId || null,
        name,
        phone,
        email: email || null,
        preferredContactTime: preferredContactTime || null,
        budgetRange: budgetRange || null,
        notes: notes || null,
        createdBy: userId || null,
        updatedBy: userId || null,
      },
    });

    // Generate AI Summary Simulation automatically
    const summaryText = `العميل المهتم ${name} يفضل الاتصال في ${preferredContactTime || "أي وقت"}. الميزانية المقدرة: ${budgetRange || "غير محددة"}.`;
    
    // Log Telemetry
    await prisma.telemetryEvent.create({
      data: {
        tenantId,
        eventType: "contact.created",
        eventDataJson: JSON.stringify({ contactId: contact.id, leadId, summary: summaryText }),
        createdBy: userId || null,
      },
    });

    return NextResponse.json({ success: true, data: contact, summary: summaryText }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
