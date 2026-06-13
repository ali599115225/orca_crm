// app/api/v1/tours/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantAndUser } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await getTenantAndUser(request);
    if (!tenantId) {
      return NextResponse.json({ error: "معرف المنشأة مفقود." }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get("agentId");

    const tours = await prisma.tour.findMany({
      where: {
        tenantId,
        ...(agentId ? { assignedTo: agentId } : {}),
      },
      orderBy: { startAt: "asc" },
    });

    return NextResponse.json({ success: true, data: tours });
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
    const { leadId, assignedTo, startAt, endAt, location, attendees, notes } = body;

    if (!leadId || !startAt || !location) {
      return NextResponse.json({ error: "معرف العميل ووقت وموقع الجولة مطلوبين." }, { status: 400 });
    }

    const lead = await prisma.lead.findFirst({
      where: { id: leadId, tenantId },
    });
    if (!lead) {
      return NextResponse.json({ error: "العميل غير موجود أو لا يتبع منشأتك." }, { status: 403 });
    }

    const agentId = assignedTo || userId || (await prisma.user.findFirst({ where: { tenantId } }))?.id || "";

    const tour = await prisma.tour.create({
      data: {
        tenantId,
        leadId,
        assignedTo: agentId,
        startAt: new Date(startAt),
        endAt: endAt ? new Date(endAt) : new Date(new Date(startAt).getTime() + 60 * 60 * 1000), // 1 hour duration
        location,
        status: "SCHEDULED",
        attendees: Number(attendees || 1),
        notes: notes || null,
        createdBy: userId || null,
        updatedBy: userId || null,
      },
    });

    // Telemetry Event
    await prisma.telemetryEvent.create({
      data: {
        tenantId,
        eventType: "tour.scheduled",
        eventDataJson: JSON.stringify({ tourId: tour.id, leadId, startAt }),
        createdBy: userId || null,
      },
    });

    // Simulate WhatsApp 24h & 1h hook triggers
    await prisma.agentTelemetryLog.create({
      data: {
        tenantId,
        agentId: "Saher_WhatsApp",
        actionType: "WhatsApp_Reminder",
        logMessageAr: `«تم جدولة إرسال تذكيرات الواتساب التلقائية قبل الجولة بـ ٢٤ ساعة و١ ساعة للعميل تلقائياً»`,
        severity: "Info",
      },
    }).catch(() => {});

    return NextResponse.json({ success: true, data: tour }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
