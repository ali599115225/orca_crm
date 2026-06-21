// app/api/v1/opportunities/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantAndUser } from "@/lib/api-helpers";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await getTenantAndUser(request);
    if (!tenantId) {
      return NextResponse.json({ error: "معرف المنشأة مفقود." }, { status: 400 });
    }

    const opportunities = await prisma.opportunity.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ success: true, data: opportunities });
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
    const { leadId, value, probability, closeDate, unitId } = body;

    if (!leadId || !value) {
      return NextResponse.json({ error: "معرف العميل وقيمة الصفقة مطلوبان." }, { status: 400 });
    }

    if (unitId && !UUID_REGEX.test(unitId)) {
      return NextResponse.json({ error: "معرف الوحدة يجب أن يكون UUID صالحًا." }, { status: 400 });
    }

    const lead = await prisma.lead.findFirst({
      where: { id: leadId, tenantId },
    });
    if (!lead) {
      return NextResponse.json({ error: "العميل غير موجود أو لا يتبع منشأتك." }, { status: 403 });
    }

    if (unitId) {
      const unit = await prisma.unit.findFirst({
        where: { id: unitId, project: { tenantId } },
      });
      if (!unit) {
        return NextResponse.json({ error: "الوحدة غير موجودة أو لا تتبع منشأتك." }, { status: 403 });
      }
    }

    const opp = await prisma.opportunity.create({
      data: {
        tenantId,
        leadId,
        value: Number(value),
        probability: Number(probability || 50),
        closeDate: closeDate ? new Date(closeDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: "OPEN",
        unitId: unitId || null,
        createdBy: userId || null,
        updatedBy: userId || null,
      },
    });

    await prisma.telemetryEvent.create({
      data: {
        tenantId,
        eventType: "opportunity.created",
        eventDataJson: JSON.stringify({ opportunityId: opp.id, leadId, unitId, value }),
        createdBy: userId || null,
      },
    });

    return NextResponse.json({ success: true, data: opp }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
