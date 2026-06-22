// app/api/v1/tours/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantAndUser } from "@/lib/api-helpers";
import {
  forbiddenResponse,
  hasDatabaseRole,
  requireAuth,
  unauthorizedResponse,
} from "@/lib/api-auth-guard";
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
    const session = await requireAuth(request);
    if (!session) return unauthorizedResponse();
    if (!(await hasDatabaseRole(session, ["ADMIN", "SALES_MANAGER", "SALES_EMPLOYEE"]))) {
      return forbiddenResponse();
    }
    const { tenantId, userId } = session;

    const body = await request.json();
    const { leadId, offerId, opportunityId, unitId, assignedTo, startAt, endAt, location, attendees, notes } = body;

    if ((!leadId && !offerId) || !startAt || !location) {
      return NextResponse.json({ error: "معرف العميل أو العرض ووقت وموقع الجولة مطلوبين." }, { status: 400 });
    }

    const tour = await scheduleTour({
      tenantId,
      userId,
      actorId: userId,
      assignedTo: assignedTo || userId,
      leadId: leadId || "",
      offerId: offerId || undefined,
      opportunityId: opportunityId || undefined,
      unitId: unitId || undefined,
      location,
      startAt: new Date(startAt),
      endAt: endAt ? new Date(endAt) : new Date(new Date(startAt).getTime() + 60 * 60 * 1000),
      attendees: Number(attendees || 1),
      notes: notes || undefined,
      correlationId: request.headers.get("x-correlation-id") || undefined,
    });

    return NextResponse.json({ success: true, data: tour }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
