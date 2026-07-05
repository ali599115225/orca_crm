import { httpErrorResponse } from "@/lib/http-error-response";
// app/api/v1/leads/[id]/move/route.ts
// Single official mapping (lib/leads/model): the ambiguous legacy "closed"
// is rejected — callers must request WON or LOST explicitly. The legacy
// `stage` column is no longer written; `status` is the source of truth.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantAndUser } from "@/lib/api-helpers";
import { ErrorCode } from "@/lib/errors";
import { legacyStageToStatus } from "@/lib/leads/model";
import type { LeadStatus } from "@prisma/client";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { tenantId, userId } = await getTenantAndUser(request);
    if (!tenantId) {
      return NextResponse.json({ error: "معرف المنشأة مفقود." }, { status: 400 });
    }

    const body = await request.json();
    const requested = String(body.toStage || body.status || "").trim();

    if (!requested) {
      return NextResponse.json({ error: "الحالة المستهدفة مطلوبة." }, { status: 400 });
    }

    if (requested.toLowerCase() === "closed") {
      return NextResponse.json(
        { error: "قيمة (closed) غامضة؛ اطلب WON أو LOST صراحةً." },
        { status: 400 },
      );
    }

    const statusEnum = legacyStageToStatus(requested);
    if (!statusEnum) {
      return NextResponse.json({ error: "قيمة الحالة غير معتمدة." }, { status: 400 });
    }

    const lead = await prisma.lead.findFirst({
      where: { id, tenantId },
    });

    if (!lead) {
      return NextResponse.json({ error: "العميل المحتمل غير موجود." }, { status: 404 });
    }

    const updatedLead = await prisma.lead.update({
      where: { id, tenantId },
      data: {
        status: statusEnum as LeadStatus,
        updatedBy: userId || null,
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: userId || null,
        action: "LEAD_STATUS_UPDATED",
        tableName: "leads",
        recordId: lead.id,
        details: JSON.stringify({ from: lead.status, to: statusEnum, via: "move-api" }),
      },
    });

    await prisma.telemetryEvent.create({
      data: {
        tenantId,
        eventType: "lead.statusChanged",
        eventDataJson: JSON.stringify({ leadId: lead.id, from: lead.status, to: statusEnum }),
        createdBy: userId || null,
      },
    });

    if (lead.leadScore >= 75 || statusEnum === "NEGOTIATION") {
      await prisma.agentTelemetryLog.create({
        data: {
          tenantId,
          agentId: "ManagerAlert",
          actionType: "Hot_Lead_Escalation",
          logMessageAr: `«تنبيه عاجل: تم ترقية حالة العميل ${lead.firstName} إلى درجة جدية عالية بنجاح»`,
          severity: "Warning",
        },
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, data: updatedLead });
  } catch (error: any) {
    return httpErrorResponse(request, ErrorCode.INTERNAL_ERROR, "PATCH /api/v1/leads/[id]/move failed", error, 500);
  }
}
