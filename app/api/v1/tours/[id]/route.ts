import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  runWithDatabaseSession,
  TENANT_WRITE_ROLES,
} from "@/lib/api-auth-guard";
import { writeAuditLog } from "@/lib/audit";

export async function PATCH(
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
        const current = await prisma.tour.findFirst({
          where: { id, tenantId: session.tenantId },
        });

        if (!current) {
          return NextResponse.json(
            { success: false, error: "الجولة غير موجودة." },
            { status: 404 },
          );
        }
        if (!["SCHEDULED", "FOLLOW_UP"].includes(current.status)) {
          return NextResponse.json(
            {
              success: false,
              error: "لا يمكن تعديل موعد جولة مغلقة.",
            },
            { status: 409 },
          );
        }

        const startAt = body.startAt
          ? new Date(body.startAt)
          : current.startAt;
        const durationMinutes = body.durationMinutes
          ? Math.min(240, Math.max(15, Number(body.durationMinutes)))
          : Math.max(
              15,
              Math.round(
                (current.endAt.getTime() - current.startAt.getTime()) /
                  60_000,
              ),
            );
        const endAt = new Date(
          startAt.getTime() + durationMinutes * 60_000,
        );

        if (Number.isNaN(startAt.getTime()) || endAt <= startAt) {
          return NextResponse.json(
            { success: false, error: "موعد الجولة غير صالح." },
            { status: 400 },
          );
        }

        const assignedTo =
          typeof body.assignedTo === "string" && body.assignedTo
            ? body.assignedTo
            : current.assignedTo;

        const assigned = await prisma.user.findFirst({
          where: {
            id: assignedTo,
            tenantId: session.tenantId,
            isActive: true,
          },
          select: { id: true },
        });
        if (!assigned) {
          return NextResponse.json(
            { success: false, error: "الموظف المسؤول غير صالح." },
            { status: 400 },
          );
        }

        const update = await prisma.tour.updateMany({
          where: { id, tenantId: session.tenantId },
          data: {
            startAt,
            endAt,
            assignedTo,
            attendees:
              body.attendees === undefined
                ? current.attendees
                : Math.min(
                    20,
                    Math.max(1, Number(body.attendees || 1)),
                  ),
            notes:
              body.notes === undefined
                ? current.notes
                : String(body.notes || "").trim().slice(0, 1500) || null,
            updatedBy: session.userId,
          },
        });

        if (update.count !== 1) {
          return NextResponse.json(
            { success: false, error: "تعذر تحديث الجولة." },
            { status: 409 },
          );
        }

        await writeAuditLog({
          tenantId: session.tenantId,
          userId: session.userId,
          action: "TOUR_RESCHEDULED",
          tableName: "tours",
          recordId: id,
          details: JSON.stringify({
            before: {
              startAt: current.startAt,
              endAt: current.endAt,
              assignedTo: current.assignedTo,
            },
            after: { startAt, endAt, assignedTo },
          }),
        });

        return NextResponse.json({
          success: true,
          data: { id, startAt, endAt, assignedTo },
        });
      } catch {
        return NextResponse.json(
          { success: false, error: "تعذر تحديث الجولة." },
          { status: 500 },
        );
      }
    },
  );
}
