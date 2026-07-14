import { NextRequest, NextResponse } from "next/server";

import { runWithDatabaseSession } from "@/lib/api-auth-guard";
import { writeAuditLog } from "@/lib/audit";
import { ErrorCode } from "@/lib/errors";
import { httpErrorResponse } from "@/lib/http-error-response";
import { prisma } from "@/lib/prisma";

const HELPDESK_WRITE_ROLES = [
  "ADMIN",
  "SALES_MANAGER",
  "SALES_EMPLOYEE",
  "MARKETING",
] as const;

const ALLOWED_STATUSES = new Set(["OPEN", "CLOSED"]);

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return runWithDatabaseSession(
    request,
    HELPDESK_WRITE_ROLES,
    async (session) => {
      try {
        const { id } = await params;
        const body = await request.json();
        const status = String(body.status || "").trim().toUpperCase();

        if (!ALLOWED_STATUSES.has(status)) {
          return NextResponse.json(
            {
              success: false,
              error: "حالة التذكرة غير صالحة.",
            },
            { status: 400 },
          );
        }

        const existing = await prisma.ticket.findFirst({
          where: {
            id,
            tenantId: session.tenantId,
          },
          select: { id: true },
        });

        if (!existing) {
          return NextResponse.json(
            {
              success: false,
              error: "التذكرة غير موجودة.",
            },
            { status: 404 },
          );
        }

        const ticket = await prisma.ticket.update({
          where: {
            id,
            tenantId: session.tenantId,
          },
          data: { status },
        });

        await writeAuditLog({
          tenantId: session.tenantId,
          userId: session.userId,
          action: status === "CLOSED" ? "TICKET_CLOSED" : "TICKET_REOPENED",
          tableName: "tickets",
          recordId: id,
        });

        return NextResponse.json({
          success: true,
          data: {
            ...ticket,
            createdAt: ticket.createdAt.toISOString(),
            updatedAt: ticket.updatedAt.toISOString(),
          },
        });
      } catch (error) {
        return httpErrorResponse(
          request,
          ErrorCode.INTERNAL_ERROR,
          "PUT /api/v1/support/tickets/[id] failed",
          error,
          500,
        );
      }
    },
  );
}
