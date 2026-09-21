import { NextRequest, NextResponse } from "next/server";
import {
  runWithDatabaseSession,
  TENANT_WRITE_ROLES,
} from "@/lib/api-auth-guard";
import { prisma } from "@/lib/prisma";
import { scheduleTour } from "@/lib/domain/transaction-spine";
import { writeAuditLog } from "@/lib/audit";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return runWithDatabaseSession(
    request,
    TENANT_WRITE_ROLES,
    async (session) => {
      try {
        const { id } = await params;
        const body = await request.json();
        const startAt = new Date(body.startAt);
        const durationMinutes = Math.min(
          240,
          Math.max(15, Number(body.durationMinutes || 45)),
        );

        if (Number.isNaN(startAt.getTime())) {
          return NextResponse.json(
            { success: false, error: "موعد الجولة غير صالح." },
            { status: 400 },
          );
        }
        if (startAt.getTime() <= Date.now()) {
          return NextResponse.json(
            { success: false, error: "يجب اختيار موعد مستقبلي." },
            { status: 400 },
          );
        }

        const offer = await prisma.offer.findFirst({
          where: { id, tenantId: session.tenantId },
          include: {
            opportunity: {
              select: {
                id: true,
                leadId: true,
              },
            },
            unit: {
              select: {
                id: true,
                unitNumber: true,
                city: true,
                district: true,
                project: { select: { name: true } },
              },
            },
          },
        });

        if (!offer?.unit) {
          return NextResponse.json(
            {
              success: false,
              error: "لا يمكن جدولة جولة لعرض غير مرتبط بوحدة.",
            },
            { status: 409 },
          );
        }

        const location = [
          offer.unit.project.name,
          offer.unit.unitNumber,
          offer.unit.city,
          offer.unit.district,
        ]
          .filter(Boolean)
          .join(" · ");

        const tour = await scheduleTour({
          tenantId: session.tenantId,
          userId: session.userId,
          leadId: offer.opportunity.leadId,
          opportunityId: offer.opportunity.id,
          unitId: offer.unit.id,
          offerId: offer.id,
          assignedTo: session.userId,
          startAt,
          endAt: new Date(startAt.getTime() + durationMinutes * 60_000),
          attendees: Math.min(
            20,
            Math.max(1, Number(body.attendees || 1)),
          ),
          location,
          notes:
            typeof body.notes === "string"
              ? body.notes.trim().slice(0, 1500)
              : undefined,
          correlationId:
            request.headers.get("x-correlation-id") || undefined,
        });

        await writeAuditLog({
          tenantId: session.tenantId,
          userId: session.userId,
          action: "OFFER_TOUR_SCHEDULED",
          tableName: "offers",
          recordId: offer.id,
          details: JSON.stringify({
            tourId: tour.id,
            startAt: tour.startAt,
          }),
        });

        return NextResponse.json(
          { success: true, data: tour },
          { status: 201 },
        );
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "تعذر جدولة الجولة.";
        return NextResponse.json(
          { success: false, error: message },
          { status: 400 },
        );
      }
    },
  );
}
