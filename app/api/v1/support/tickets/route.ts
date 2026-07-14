import { NextRequest, NextResponse } from "next/server";

import {
  runWithDatabaseSession,
  TENANT_ROLES,
} from "@/lib/api-auth-guard";
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

function cleanText(value: unknown, maxLength: number) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function serializeTicket(ticket: {
  id: string;
  title: string;
  description: string;
  status: string;
  aiResponse: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: ticket.id,
    title: ticket.title,
    description: ticket.description,
    status: ticket.status,
    aiResponse: ticket.aiResponse,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
  };
}

export async function GET(request: NextRequest) {
  return runWithDatabaseSession(request, TENANT_ROLES, async (session) => {
    try {
      const tickets = await prisma.ticket.findMany({
        where: { tenantId: session.tenantId },
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
        take: 200,
      });

      return NextResponse.json({
        success: true,
        data: tickets.map(serializeTicket),
      });
    } catch (error) {
      return httpErrorResponse(
        request,
        ErrorCode.INTERNAL_ERROR,
        "GET /api/v1/support/tickets failed",
        error,
        500,
      );
    }
  });
}

export async function POST(request: NextRequest) {
  return runWithDatabaseSession(
    request,
    HELPDESK_WRITE_ROLES,
    async (session) => {
      try {
        const body = await request.json();
        const title = cleanText(body.title, 160);
        const description = cleanText(body.description, 5000);

        if (title.length < 3 || description.length < 5) {
          return NextResponse.json(
            {
              success: false,
              error: "عنوان التذكرة وتفاصيلها مطلوبة.",
            },
            { status: 400 },
          );
        }

        const ticket = await prisma.ticket.create({
          data: {
            tenantId: session.tenantId,
            title,
            description,
            status: "OPEN",
            aiResponse: null,
          },
        });

        await writeAuditLog({
          tenantId: session.tenantId,
          userId: session.userId,
          action: "TICKET_CREATED",
          tableName: "tickets",
          recordId: ticket.id,
          details: JSON.stringify({ title }),
        });

        return NextResponse.json(
          {
            success: true,
            data: serializeTicket(ticket),
          },
          { status: 201 },
        );
      } catch (error) {
        return httpErrorResponse(
          request,
          ErrorCode.INTERNAL_ERROR,
          "POST /api/v1/support/tickets failed",
          error,
          500,
        );
      }
    },
  );
}
