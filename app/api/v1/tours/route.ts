// app/api/v1/tours/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantAndUser } from "@/lib/api-helpers";
import { scheduleTour } from "@/lib/domain/transaction-spine";

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

    const agentId = assignedTo || userId || (await prisma.user.findFirst({ where: { tenantId } }))?.id || "";

    const tour = await scheduleTour({
      tenantId,
      userId: agentId,
      leadId,
      location,
      startAt: new Date(startAt),
      endAt: endAt ? new Date(endAt) : new Date(new Date(startAt).getTime() + 60 * 60 * 1000),
      attendees: Number(attendees || 1),
      notes: notes || undefined,
    });

    return NextResponse.json({ success: true, data: tour }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
