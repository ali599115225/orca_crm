import { NextRequest, NextResponse } from "next/server";
import type { LeadStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ErrorCode } from "@/lib/errors";
import { httpErrorResponse } from "@/lib/http-error-response";
import { runWithDatabaseSession } from "@/lib/api-auth-guard";
import { LEADS_WRITER_ROLES, legacyStageToStatus } from "@/lib/leads/model";

// Single official mapping: the ambiguous legacy "closed" is rejected.
// The legacy `stage` column is never written; `status` is authoritative.

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return runWithDatabaseSession(request, LEADS_WRITER_ROLES, async (session) => {
    try {
      const { id } = await params;
      const body = await request.json();
      const requested = String(body.toStage || body.status || "").trim();

      if (!requested) {
        return NextResponse.json(
          { error: "الحالة المستهدفة مطلوبة." },
          { status: 400 },
        );
      }

      if (requested.toLowerCase() === "closed") {
        return NextResponse.json(
          { error: "قيمة (closed) غامضة؛ اطلب WON أو LOST صراحةً." },
          { status: 400 },
        );
      }

      const statusEnum = legacyStageToStatus(requested);
      if (!statusEnum) {
        return NextResponse.json(
          { error: "قيمة الحالة غير معتمدة." },
          { status: 400 },
        );
      }

      const lead = await prisma.lead.findFirst({
        where: { id, tenantId: session.tenantId },
      });

      if (!lead) {
        return NextResponse.json(
          { error: "العميل المحتمل غير موجود." },
          { status: 404 },
        );
      }

      const updatedLead = await prisma.lead.update({
        where: { id, tenantId: session.tenantId },
        data: {
          status: statusEnum as LeadStatus,
          updatedBy: session.userId,
        },
      });

      await prisma.auditLog.create({
        data: {
          tenantId: session.tenantId,
          userId: session.userId,
          action: "LEAD_STATUS_UPDATED",
          tableName: "leads",
          recordId: lead.id,
          details: JSON.stringify({
            from: lead.status,
            to: statusEnum,
            via: "move-api",
          }),
        },
      });

      await prisma.telemetryEvent.create({
        data: {
          tenantId: session.tenantId,
          eventType: "lead.statusChanged",
          eventDataJson: JSON.stringify({
            leadId: lead.id,
            from: lead.status,
            to: statusEnum,
          }),
          createdBy: session.userId,
        },
      });

      if (lead.leadScore >= 75 || statusEnum === "NEGOTIATION") {
        await prisma.agentTelemetryLog
          .create({
            data: {
              tenantId: session.tenantId,
              agentId: "ManagerAlert",
              actionType: "Hot_Lead_Escalation",
              logMessageAr: `«تنبيه عاجل: تم ترقية حالة العميل ${lead.firstName} إلى درجة جدية عالية بنجاح»`,
              severity: "Warning",
            },
          })
          .catch(() => {});
      }

      return NextResponse.json({ success: true, data: updatedLead });
    } catch (error: unknown) {
      return httpErrorResponse(
        request,
        ErrorCode.INTERNAL_ERROR,
        "PATCH /api/v1/leads/[id]/move failed",
        error,
        500,
      );
    }
  });
}
