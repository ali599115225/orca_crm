import { httpErrorResponse } from "@/lib/http-error-response";
// app/api/v1/leads/route.ts
// `status` is the single source of truth. The legacy `stage` column is
// never written; a legacy ?stage= query param is translated to a status
// filter through the single shared mapping in lib/leads/model.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantAndUser } from "@/lib/api-helpers";
import { ErrorCode } from "@/lib/errors";
import { PlanLimitError } from "@/lib/plan-guard";
import { isLeadStatus, legacyStageToStatus } from "@/lib/leads/model";
import { createLeadCore } from "@/lib/leads/service";
import type { LeadStatus } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await getTenantAndUser(request);
    if (!tenantId) {
      return NextResponse.json({ error: "معرف المنشأة مفقود." }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status");
    const legacyStageParam = searchParams.get("stage");
    const includeArchived = searchParams.get("includeArchived") === "true";

    let statusFilter: LeadStatus | null = null;
    if (statusParam && isLeadStatus(statusParam)) {
      statusFilter = statusParam as LeadStatus;
    } else if (legacyStageParam) {
      const mapped = legacyStageToStatus(legacyStageParam);
      if (mapped) statusFilter = mapped as LeadStatus;
    }

    const leads = await prisma.lead.findMany({
      where: {
        tenantId,
        ...(includeArchived ? {} : { isArchived: false }),
        ...(statusFilter ? { status: statusFilter } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ success: true, data: leads });
  } catch (error: any) {
    return httpErrorResponse(request, ErrorCode.INTERNAL_ERROR, "GET /api/v1/leads failed", error, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId, userId, userRole } = await getTenantAndUser(request);
    if (!tenantId) {
      return NextResponse.json({ error: "معرف المنشأة مفقود." }, { status: 400 });
    }

    const body = await request.json();
    const { firstName, lastName, phone, email, city, source, projectId, assignedTo } = body;

    const result = await createLeadCore({
      tenant: { id: tenantId },
      actor: userId ? { userId, role: userRole || "" } : null,
      input: {
        firstName: String(firstName || "").trim(),
        lastName: String(lastName || "").trim() || null,
        phone: String(phone || "").trim(),
        email: String(email || "").trim() || null,
        city: String(city || "").trim() || null,
        source: String(source || "").trim() || null,
        projectId: String(projectId || "").trim() || null,
        assignedTo: String(assignedTo || "").trim() || null,
      },
    });

    if (!result.success) {
      const statusCode =
        result.code === "FORBIDDEN" ? 403 : result.code === "PLAN_LIMIT" ? 403 : 400;
      return NextResponse.json(
        { success: false, error: result.error, code: result.code },
        { status: statusCode },
      );
    }

    const lead = await prisma.lead.findFirst({
      where: { id: result.leadId, tenantId },
    });

    // Non-critical side effects (outside the creation transaction).
    await prisma.telemetryEvent
      .create({
        data: {
          tenantId,
          eventType: "lead.created",
          eventDataJson: JSON.stringify({ leadId: result.leadId }),
          createdBy: userId || null,
        },
      })
      .catch(() => {});

    if (userId) {
      await prisma.task
        .create({
          data: {
            tenantId,
            leadId: result.leadId,
            assignedTo: userId,
            title: `تواصل ترحيبي مع العميل: ${String(firstName || "").trim()}`,
            dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
            priority: "MEDIUM",
            status: "PENDING",
          },
        })
        .catch(() => {});
    }

    return NextResponse.json({ success: true, data: lead }, { status: 201 });
  } catch (error: any) {
    if (error instanceof PlanLimitError) {
      return NextResponse.json(error.toJSON(), { status: 403 });
    }
    return httpErrorResponse(request, ErrorCode.INTERNAL_ERROR, "POST /api/v1/leads failed", error, 500);
  }
}
