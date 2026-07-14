import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  runWithDatabaseSession,
  TENANT_ROLES,
  TENANT_WRITE_ROLES,
} from "@/lib/api-auth-guard";
import { scheduleTour } from "@/lib/domain/transaction-spine";
import { ErrorCode } from "@/lib/errors";
import { httpErrorResponse } from "@/lib/http-error-response";
import { writeAuditLog } from "@/lib/audit";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

export async function GET(request: NextRequest) {
  return runWithDatabaseSession(request, TENANT_ROLES, async (session) => {
    try {
      const searchParams = new URL(request.url).searchParams;
      const leadId = searchParams.get("leadId");

      if (leadId && !UUID_REGEX.test(leadId)) {
        return NextResponse.json(
          { success: false, error: "معرف العميل غير صالح." },
          { status: 400 },
        );
      }

      const [tours, leads, units, offers, users] = await Promise.all([
        prisma.tour.findMany({
          where: {
            tenantId: session.tenantId,
            ...(leadId ? { leadId } : {}),
          },
          include: {
            lead: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
                status: true,
              },
            },
            opportunity: {
              select: { id: true, status: true, probability: true },
            },
            unit: {
              select: {
                id: true,
                unitNumber: true,
                status: true,
                tourType: true,
                tourUrl: true,
                city: true,
                district: true,
                project: { select: { id: true, name: true } },
              },
            },
            assignedUser: { select: { id: true, name: true } },
            offer: {
              select: {
                id: true,
                status: true,
                price: true,
                validUntil: true,
              },
            },
          },
          orderBy: { startAt: "asc" },
          take: 250,
        }),
        leadId
          ? Promise.resolve([])
          : prisma.lead.findMany({
          where: { tenantId: session.tenantId, isArchived: false },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            status: true,
          },
          orderBy: { updatedAt: "desc" },
          take: 150,
        }),
        leadId
          ? Promise.resolve([])
          : prisma.unit.findMany({
          where: {
            tenantId: session.tenantId,
            status: { in: ["Available", "Hold", "Reserved"] },
          },
          select: {
            id: true,
            unitNumber: true,
            status: true,
            tourType: true,
            tourUrl: true,
            city: true,
            district: true,
            project: { select: { id: true, name: true } },
          },
          orderBy: { updatedAt: "desc" },
          take: 150,
        }),
        leadId
          ? Promise.resolve([])
          : prisma.offer.findMany({
          where: {
            tenantId: session.tenantId,
            status: { in: ["PENDING", "SENT", "NEGOTIATION"] },
            unitId: { not: null },
          },
          include: {
            opportunity: {
              select: {
                id: true,
                lead: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
            unit: {
              select: {
                id: true,
                unitNumber: true,
                project: { select: { name: true } },
              },
            },
          },
          orderBy: { updatedAt: "desc" },
          take: 100,
        }),
        leadId
          ? Promise.resolve([])
          : prisma.user.findMany({
          where: { tenantId: session.tenantId, isActive: true },
          select: { id: true, name: true, role: true },
          orderBy: { name: "asc" },
        }),
      ]);

      const now = new Date();
      const rows = tours.map((tour) => ({
        id: tour.id,
        status: tour.status,
        startAt: tour.startAt.toISOString(),
        endAt: tour.endAt.toISOString(),
        location: tour.location,
        attendees: tour.attendees,
        notes: tour.notes,
        leadId: tour.lead.id,
        customerName: [tour.lead.firstName, tour.lead.lastName]
          .filter(Boolean)
          .join(" "),
        customerPhone: tour.lead.phone,
        leadStatus: tour.lead.status,
        opportunityId: tour.opportunity?.id || null,
        opportunityStatus: tour.opportunity?.status || null,
        probability: tour.opportunity?.probability || null,
        unitId: tour.unit?.id || null,
        unitNumber: tour.unit?.unitNumber || "—",
        unitStatus: tour.unit?.status || null,
        projectName: tour.unit?.project.name || "—",
        city: tour.unit?.city || null,
        district: tour.unit?.district || null,
        virtualTourType: tour.unit?.tourType || null,
        virtualTourUrl: tour.unit?.tourUrl || null,
        assignedTo: tour.assignedUser.id,
        assignedName: tour.assignedUser.name,
        offerId: tour.offer?.id || null,
        offerStatus: tour.offer?.status || null,
        offerPrice: tour.offer ? Number(tour.offer.price) : null,
      }));

      const pendingStatuses = new Set(["SCHEDULED", "FOLLOW_UP"]);
      const stats = {
        total: rows.length,
        today: rows.filter(
          (row) =>
            pendingStatuses.has(row.status) &&
            sameDay(new Date(row.startAt), now),
        ).length,
        upcoming: rows.filter(
          (row) =>
            pendingStatuses.has(row.status) &&
            new Date(row.startAt).getTime() > now.getTime(),
        ).length,
        completed: rows.filter((row) => row.status === "COMPLETED").length,
        noShow: rows.filter((row) => row.status === "NO_SHOW").length,
        followUp: rows.filter((row) => row.status === "FOLLOW_UP").length,
      };

      return NextResponse.json({
        success: true,
        data: rows,
        stats,
        options: {
          leads: leads.map((lead) => ({
            id: lead.id,
            name: [lead.firstName, lead.lastName]
              .filter(Boolean)
              .join(" "),
            phone: lead.phone,
            status: lead.status,
          })),
          units: units.map((unit) => ({
            id: unit.id,
            unitNumber: unit.unitNumber,
            status: unit.status,
            projectName: unit.project.name,
            city: unit.city,
            district: unit.district,
            virtualTourType: unit.tourType,
            virtualTourUrl: unit.tourUrl,
          })),
          offers: offers
            .filter((offer) => Boolean(offer.unit))
            .map((offer) => ({
              id: offer.id,
              status: offer.status,
              opportunityId: offer.opportunity.id,
              leadId: offer.opportunity.lead.id,
              customerName: [
                offer.opportunity.lead.firstName,
                offer.opportunity.lead.lastName,
              ]
                .filter(Boolean)
                .join(" "),
              unitId: offer.unit!.id,
              unitNumber: offer.unit!.unitNumber,
              projectName: offer.unit!.project.name,
            })),
          users: users.map((user) => ({
            id: user.id,
            name: user.name,
            role: user.role,
          })),
        },
      });
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
        let leadId = String(body.leadId || "").trim();
        let unitId = String(body.unitId || "").trim() || undefined;
        let opportunityId =
          String(body.opportunityId || "").trim() || undefined;
        const offerId = String(body.offerId || "").trim() || undefined;
        const assignedTo =
          String(body.assignedTo || "").trim() || session.userId;
        const startAt = new Date(body.startAt);
        const durationMinutes = Math.min(
          240,
          Math.max(15, Number(body.durationMinutes || 45)),
        );
        const attendees = Math.min(
          20,
          Math.max(1, Number(body.attendees || 1)),
        );

        if (offerId) {
          if (!UUID_REGEX.test(offerId)) {
            return NextResponse.json(
              { success: false, error: "العرض المرتبط غير صالح." },
              { status: 400 },
            );
          }
          const offer = await prisma.offer.findFirst({
            where: { id: offerId, tenantId: session.tenantId },
            include: {
              opportunity: { select: { id: true, leadId: true } },
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
                error: "العرض غير مرتبط بوحدة قابلة للجولة.",
              },
              { status: 409 },
            );
          }
          leadId = offer.opportunity.leadId;
          opportunityId = offer.opportunity.id;
          unitId = offer.unit.id;
        }

        if (!UUID_REGEX.test(leadId)) {
          return NextResponse.json(
            { success: false, error: "العميل المرتبط غير صالح." },
            { status: 400 },
          );
        }
        if (unitId && !UUID_REGEX.test(unitId)) {
          return NextResponse.json(
            { success: false, error: "الوحدة المرتبطة غير صالحة." },
            { status: 400 },
          );
        }
        if (Number.isNaN(startAt.getTime()) || startAt.getTime() <= Date.now()) {
          return NextResponse.json(
            { success: false, error: "يجب اختيار موعد مستقبلي صالح." },
            { status: 400 },
          );
        }

        let location =
          typeof body.location === "string"
            ? body.location.trim().slice(0, 500)
            : "";

        if (unitId && !location) {
          const unit = await prisma.unit.findFirst({
            where: { id: unitId, tenantId: session.tenantId },
            select: {
              unitNumber: true,
              city: true,
              district: true,
              project: { select: { name: true } },
            },
          });
          if (!unit) {
            return NextResponse.json(
              { success: false, error: "الوحدة غير موجودة." },
              { status: 404 },
            );
          }
          location = [
            unit.project.name,
            unit.unitNumber,
            unit.city,
            unit.district,
          ]
            .filter(Boolean)
            .join(" · ");
        }

        if (!location) {
          return NextResponse.json(
            { success: false, error: "موقع الجولة مطلوب." },
            { status: 400 },
          );
        }

        const tour = await scheduleTour({
          tenantId: session.tenantId,
          userId: session.userId,
          leadId,
          opportunityId,
          unitId,
          offerId,
          assignedTo,
          startAt,
          endAt: new Date(startAt.getTime() + durationMinutes * 60_000),
          attendees,
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
          action: "TOUR_SCHEDULED_FROM_BOARD",
          tableName: "tours",
          recordId: tour.id,
          details: JSON.stringify({
            leadId,
            unitId: unitId || null,
            offerId: offerId || null,
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
