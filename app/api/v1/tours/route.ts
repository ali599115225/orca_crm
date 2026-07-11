import { httpErrorResponse } from "@/lib/http-error-response";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  runWithDatabaseSession,
  TENANT_ROLES,
  TENANT_WRITE_ROLES,
} from "@/lib/api-auth-guard";
import { scheduleTour } from "@/lib/domain/transaction-spine";
import { ErrorCode } from "@/lib/errors";
import { writeAuditLog } from "@/lib/audit";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  return runWithDatabaseSession(request, TENANT_ROLES, async (session) => {
    try {
      const { searchParams } = new URL(request.url);
      const agentId = searchParams.get("agentId");
      const leadId = searchParams.get("leadId");

      if (leadId && !UUID_REGEX.test(leadId)) {
        return NextResponse.json(
          { success: false, error: "معرف العميل غير صالح." },
          { status: 400 },
        );
      }

      const tours = await prisma.tour.findMany({
        where: {
          tenantId: session.tenantId,
          ...(agentId ? { assignedTo: agentId } : {}),
          ...(leadId ? { leadId } : {}),
        },
        orderBy: { startAt: "asc" },
      });

      return NextResponse.json({ success: true, data: tours });
    } catch (error: unknown) {
      return httpErrorResponse(
        request,
        ErrorCode.INTERNAL_ERROR,
        "GET /api/v1/tours failed",
        error,
        500,
      );
    }
  });
}

export async function POST(request: NextRequest) {
  return runWithDatabaseSession(
    request,
    TENANT_WRITE_ROLES,
    async (session) => {
      try {
        const body = await request.json();
        const {
          leadId,
          offerId,
          opportunityId,
          unitId,
          assignedTo,
          startAt,
          endAt,
          location,
          attendees,
          notes,
        } = body;

        if ((!leadId && !offerId) || !startAt || !location) {
          return NextResponse.json(
            {
              success: false,
              error: "معرف العميل أو العرض ووقت وموقع الجولة مطلوبون.",
            },
            { status: 400 },
          );
        }

        const parsedStartAt = new Date(startAt);
        const parsedEndAt = endAt
          ? new Date(endAt)
          : new Date(parsedStartAt.getTime() + 60 * 60 * 1000);

        if (
          Number.isNaN(parsedStartAt.getTime()) ||
          Number.isNaN(parsedEndAt.getTime())
        ) {
          return NextResponse.json(
            { success: false, error: "وقت الجولة غير صالح." },
            { status: 400 },
          );
        }

        const tour = await scheduleTour({
          tenantId: session.tenantId,
          userId: session.userId,
          actorId: session.userId,
          assignedTo: assignedTo || session.userId,
          leadId: leadId || "",
          offerId: offerId || undefined,
          opportunityId: opportunityId || undefined,
          unitId: unitId || undefined,
          location: String(location).trim(),
          startAt: parsedStartAt,
          endAt: parsedEndAt,
          attendees: Number(attendees || 1),
          notes: notes || undefined,
          correlationId:
            request.headers.get("x-correlation-id") || undefined,
        });

        await writeAuditLog({
          tenantId: session.tenantId,
          userId: session.userId,
          action: "LEAD_TOUR_SCHEDULED",
          tableName: "leads",
          recordId: tour.leadId,
          details: JSON.stringify({
            tourId: tour.id,
            opportunityId: tour.opportunityId,
            offerId: tour.offerId,
            unitId: tour.unitId,
          }),
        });

        return NextResponse.json(
          { success: true, data: tour },
          { status: 201 },
        );
      } catch (error: unknown) {
        return httpErrorResponse(
          request,
          ErrorCode.INTERNAL_ERROR,
          "POST /api/v1/tours failed",
          error,
          500,
        );
      }
    },
  );
}
