import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  appendDealEventInTx,
  ensureDealCorrelationId,
  resolveDealInTx,
} from "@/lib/domain/deal-passport";
import type { DealPassportStatus } from "@/lib/domain/deal-passport";
import type { UpdateTourStatusInput } from "./types";

const ALLOWED_STATUSES = new Set([
  "SCHEDULED",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
  "FOLLOW_UP",
]);

function passportStatusForTour(status: UpdateTourStatusInput["status"]): DealPassportStatus {
  if (status === "COMPLETED") return "TOUR_COMPLETED";
  if (status === "CANCELLED") return "TOUR_CANCELLED";
  if (status === "NO_SHOW") return "TOUR_NO_SHOW";
  if (status === "FOLLOW_UP") return "TOUR_FOLLOW_UP";
  return "TOUR_SCHEDULED";
}

export async function updateTourStatus(input: UpdateTourStatusInput) {
  const {
    tenantId,
    userId,
    tourId,
    status,
    actorId,
    correlationId: requestedCorrelationId,
  } = input;
  if (!userId) throw new Error("Authenticated user is required.");
  if (!ALLOWED_STATUSES.has(status)) throw new Error("Unsupported tour status.");

  const eventActorId = actorId || userId;
  const correlationId = ensureDealCorrelationId(
    requestedCorrelationId,
    "tour-status",
  );

  return prisma.$transaction(
    async (tx) => {
      const tour = await tx.tour.findFirst({
        where: { id: tourId, tenantId },
      });
      if (!tour) throw new Error("Tour not found in this tenant.");

      if (tour.status === status) {
        return {
          tour,
          followUpCreated: false,
          taskId: null as string | null,
          idempotent: true,
        };
      }

      const updatedTour = await tx.tour.update({
        where: { id: tour.id },
        data: {
          status,
          updatedBy: userId,
          auditLog:
            `${tour.auditLog || ""}\nUpdated status from ${tour.status} to ${status} at ${new Date().toISOString()}`.trim(),
        },
      });

      let taskId: string | null = null;
      if (status === "COMPLETED") {
        const task = await tx.task.create({
          data: {
            tenantId,
            leadId: tour.leadId,
            assignedTo: tour.assignedTo,
            title: "متابعة العميل وإرسال عرض السعر بعد إتمام الجولة العقارية الميدانية",
            dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
            priority: "HIGH",
            status: "PENDING",
          },
        });
        taskId = task.id;

        await tx.lead.updateMany({
          where: { id: tour.leadId, tenantId },
          data: { status: "VISITED", updatedBy: userId },
        });
      }

      if (tour.opportunityId) {
        const deal = await resolveDealInTx(tx, {
          tenantId,
          opportunityId: tour.opportunityId,
          actorId: eventActorId,
          correlationId,
        });
        if (deal.passport) {
          await appendDealEventInTx(tx, {
            tenantId,
            dealId: deal.passport.id,
            eventType: "tour.status_changed",
            idempotencyKey: `tour.status:${tour.id}:${tour.updatedAt.toISOString()}:${status}`,
            correlationId,
            causationId: deal.passport.lastEventId || null,
            actorId: eventActorId,
            entityType: "tour",
            entityId: tour.id,
            beforeState: { status: String(tour.status) },
            afterState: { status },
            payload: { taskId },
            projection: {
              opportunityId: tour.opportunityId,
              currentOfferId: tour.offerId || undefined,
              status: passportStatusForTour(status),
            },
          });
        }
      }

      await tx.telemetryEvent.create({
        data: {
          tenantId,
          eventType: "tour.statusChanged",
          eventDataJson: JSON.stringify({ tourId: tour.id, status }),
          createdBy: userId,
        },
      });

      return {
        tour: updatedTour,
        followUpCreated: Boolean(taskId),
        taskId,
        idempotent: false,
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}
