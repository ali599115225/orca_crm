// app/api/v1/opportunities/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantAndUser } from "@/lib/api-helpers";

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
    const { leadId, value, probability, closeDate, linkedUnitIds } = body;

    if (!leadId || !value) {
      return NextResponse.json({ error: "معرف العميل وقيمة الصفقة مطلوبان." }, { status: 400 });
    }

    const opp = await prisma.opportunity.create({
      data: {
        tenantId,
        leadId,
        value: Number(value),
        probability: Number(probability || 50),
        closeDate: closeDate ? new Date(closeDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days
        status: "OPEN",
        linkedUnitIds: Array.isArray(linkedUnitIds) ? linkedUnitIds.join(",") : linkedUnitIds || "",
        createdBy: userId || null,
        updatedBy: userId || null,
      },
    });

    // Log telemetry event
    await prisma.telemetryEvent.create({
      data: {
        tenantId,
        eventType: "opportunity.created",
        eventDataJson: JSON.stringify({ opportunityId: opp.id, leadId, value }),
        createdBy: userId || null,
      },
    });

    return NextResponse.json({ success: true, data: opp }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
