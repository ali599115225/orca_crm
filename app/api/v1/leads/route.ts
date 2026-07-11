import { NextRequest, NextResponse } from "next/server";
import type { LeadStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ErrorCode } from "@/lib/errors";
import { httpErrorResponse } from "@/lib/http-error-response";
import { runWithDatabaseSession } from "@/lib/api-auth-guard";
import {
  LEADS_READER_ROLES,
  LEADS_WRITER_ROLES,
  isLeadStatus,
  legacyStageToStatus,
} from "@/lib/leads/model";
import { createLeadCore } from "@/lib/leads/service";

// `status` is the single source of truth. The legacy `stage` column is never
// written; a legacy ?stage= query is translated through the shared mapping.

export async function GET(request: NextRequest) {
  return runWithDatabaseSession(request, LEADS_READER_ROLES, async (session) => {
    try {
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
          tenantId: session.tenantId,
          ...(includeArchived ? {} : { isArchived: false }),
          ...(statusFilter ? { status: statusFilter } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      });

      return NextResponse.json({ success: true, data: leads });
    } catch (error: unknown) {
      return httpErrorResponse(
        request,
        ErrorCode.INTERNAL_ERROR,
        "GET /api/v1/leads failed",
        error,
        500,
      );
    }
  });
}

export async function POST(request: NextRequest) {
  return runWithDatabaseSession(request, LEADS_WRITER_ROLES, async (session) => {
    try {
      const body = await request.json();
      const {
        firstName,
        lastName,
        phone,
        email,
        city,
        source,
        projectId,
        assignedTo,
      } = body;

      const result = await createLeadCore({
        tenant: { id: session.tenantId },
        actor: { userId: session.userId, role: session.role },
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
          result.code === "FORBIDDEN"
            ? 403
            : result.code === "NOT_FOUND"
              ? 404
              : 400;
        return NextResponse.json(
          { success: false, error: result.error, code: result.code },
          { status: statusCode },
        );
      }

      const lead = await prisma.lead.findFirst({
        where: { id: result.leadId, tenantId: session.tenantId },
      });

      // Non-critical side effects remain outside the creation transaction.
      await prisma.telemetryEvent
        .create({
          data: {
            tenantId: session.tenantId,
            eventType: "lead.created",
            eventDataJson: JSON.stringify({ leadId: result.leadId }),
            createdBy: session.userId,
          },
        })
        .catch(() => {});

      await prisma.task
        .create({
          data: {
            tenantId: session.tenantId,
            leadId: result.leadId,
            assignedTo: session.userId,
            title: `تواصل ترحيبي مع العميل: ${String(firstName || "").trim()}`,
            dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
            priority: "MEDIUM",
            status: "PENDING",
          },
        })
        .catch(() => {});

      return NextResponse.json({ success: true, data: lead }, { status: 201 });
    } catch (error: unknown) {
      return httpErrorResponse(
        request,
        ErrorCode.INTERNAL_ERROR,
        "POST /api/v1/leads failed",
        error,
        500,
      );
    }
  });
}
