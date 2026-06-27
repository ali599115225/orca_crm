// app/api/v1/leads/[id]/move/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantAndUser } from "@/lib/api-helpers";
import { LeadStatus } from "@prisma/client";
import { ErrorCode, publicError } from "@/lib/errors";

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
    const { toStage } = body;

    if (!toStage) {
      return NextResponse.json({ error: "المرحلة المستهدفة (toStage) مطلوبة." }, { status: 400 });
    }

    // Map string stages to Prisma LeadStatus Enums to maintain compatibility
    let statusEnum: LeadStatus = "NEW";
    switch (toStage.toLowerCase()) {
      case "new":
        statusEnum = "NEW";
        break;
      case "contacted":
        statusEnum = "CONTACTED";
        break;
      case "qualified":
        statusEnum = "VISIT_SCHEDULED";
        break;
      case "tour scheduled":
      case "tour_scheduled":
        statusEnum = "VISIT_SCHEDULED";
        break;
      case "offer sent":
      case "offer_sent":
        statusEnum = "OFFER_MADE";
        break;
      case "negotiation":
        statusEnum = "RESERVED";
        break;
      case "closed":
        statusEnum = "CONTRACT_SIGNED";
        break;
    }

    // Fetch the lead first to check existence and tenancy
    const lead = await prisma.lead.findFirst({
      where: { id, tenantId },
    });

    if (!lead) {
      return NextResponse.json({ error: "العميل المحتمل غير موجود." }, { status: 404 });
    }

    const updatedLead = await prisma.lead.update({
      where: { id },
      data: {
        stage: toStage,
        status: statusEnum,
        updatedBy: userId || null,
        auditLog: `${lead.auditLog || ""}\nMoved to stage ${toStage} at ${new Date().toISOString()}`.trim(),
      },
    });

    // 1. Audit Log Entry
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: userId || null,
        action: "MOVE_LEAD",
        tableName: "leads",
        recordId: lead.id,
        details: `Moved lead ${lead.firstName} from ${lead.stage || "N/A"} to ${toStage}`,
      },
    });

    // 2. Telemetry Log
    await prisma.telemetryEvent.create({
      data: {
        tenantId,
        eventType: "lead.movedStage",
        eventDataJson: JSON.stringify({ leadId: lead.id, fromStage: lead.stage, toStage }),
        createdBy: userId || null,
      },
    });

    // 3. Automation Alert: if lead becomes Hot (e.g. stage Closed or score high) trigger notification
    if (lead.leadScore >= 75 || toStage.toLowerCase() === "negotiation") {
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
    return NextResponse.json({ error: publicError(ErrorCode.INTERNAL_ERROR, "PATCH /api/v1/leads/[id]/move failed", error).messageAr }, { status: 500 });
  }
}
