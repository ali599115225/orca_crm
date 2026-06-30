import { httpErrorResponse } from "@/lib/http-error-response";
// app/api/v1/contacts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantAndUser } from "@/lib/api-helpers";
import { hashPhone, hashEmail } from "@/lib/privacy-mask";
import { ErrorCode } from "@/lib/errors";

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
    return httpErrorResponse(request, ErrorCode.INTERNAL_ERROR, "GET /api/v1/contacts failed", error, 500);
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

    if (leadId) {
      const lead = await prisma.lead.findFirst({
        where: { id: leadId, tenantId },
      });
      if (!lead) {
        return NextResponse.json({ error: "العميل غير موجود أو لا يتبع منشأتك." }, { status: 403 });
      }
    }

    const contact = await prisma.contact.create({
      data: {
        tenantId,
        leadId: leadId || null,
        name,
        phone,
        phoneHash: hashPhone(tenantId, phone),
        email: email || null,
        emailHash: email ? hashEmail(email, tenantId) : null,
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
    return httpErrorResponse(request, ErrorCode.INTERNAL_ERROR, "POST /api/v1/contacts failed", error, 500);
  }
}
