import { NextRequest, NextResponse } from "next/server";

import {
  runWithDatabaseSession,
  TENANT_ROLES,
} from "@/lib/api-auth-guard";
import { ErrorCode } from "@/lib/errors";
import { httpErrorResponse } from "@/lib/http-error-response";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { sendSMSNotification, sendWhatsAppNotification } from "@/lib/notifications";

const HELPDESK_WRITE_ROLES = [
  "ADMIN",
  "SALES_MANAGER",
  "SALES_EMPLOYEE",
  "MARKETING",
] as const;

type StoredReply = {
  message?: unknown;
  sender?: unknown;
};

function parseReply(details: string | null) {
  try {
    const parsed = JSON.parse(details || "{}") as StoredReply;
    const message = String(parsed.message || "").trim();
    if (!message) return null;

    return {
      message,
      sender: parsed.sender === "SUPPORT" || parsed.sender === "AI"
        ? parsed.sender
        : "CLIENT",
    } as const;
  } catch {
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return runWithDatabaseSession(request, TENANT_ROLES, async (session) => {
    try {
      const { id } = await params;
      const ticket = await prisma.ticket.findFirst({
        where: {
          id,
          tenantId: session.tenantId,
        },
        select: { id: true },
      });

      if (!ticket) {
        return NextResponse.json(
          {
            success: false,
            error: "التذكرة غير موجودة.",
          },
          { status: 404 },
        );
      }

      const records = await prisma.auditLog.findMany({
        where: {
          tenantId: session.tenantId,
          tableName: "tickets",
          recordId: id,
          action: "TICKET_REPLIED",
        },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          userId: true,
          details: true,
          createdAt: true,
        },
      });

      const replies = records.flatMap((record) => {
        const parsed = parseReply(record.details);
        if (!parsed) return [];

        return [{
          id: record.id,
          message: parsed.message,
          sender: parsed.sender,
          createdAt: record.createdAt.toISOString(),
        }];
      });

      return NextResponse.json({
        success: true,
        data: replies,
      });
    } catch (error) {
      return httpErrorResponse(
        request,
        ErrorCode.INTERNAL_ERROR,
        "GET /api/v1/support/tickets/[id]/reply failed",
        error,
        500,
      );
    }
  });
}

export async function POST(
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
        const message = String(body.message || "")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 4000);

        if (message.length < 2) {
          return NextResponse.json(
            {
              success: false,
              error: "نص الرد مطلوب.",
            },
            { status: 400 },
          );
        }

        const ticket = await prisma.ticket.findFirst({
          where: {
            id,
            tenantId: session.tenantId,
          },
          select: {
            id: true,
            status: true,
            title: true,
          },
        });

        if (!ticket) {
          return NextResponse.json(
            {
              success: false,
              error: "التذكرة غير موجودة.",
            },
            { status: 404 },
          );
        }

        if (ticket.status === "CLOSED") {
          return NextResponse.json(
            {
              success: false,
              error: "أعد فتح التذكرة قبل إضافة رد جديد.",
            },
            { status: 409 },
          );
        }

        const created = await prisma.auditLog.findFirst({
          where: {
            tenantId: session.tenantId,
            tableName: "tickets",
            recordId: id,
            action: "TICKET_CREATED",
          },
          orderBy: { createdAt: "asc" },
          select: { details: true },
        });
        let destination: { email?: string; phone?: string; channel?: string } = {};
        try {
          destination = JSON.parse(created?.details || "{}");
        } catch {
          destination = {};
        }
        const channel = String(destination.channel || "").toUpperCase();
        const email = String(destination.email || "").trim();
        const phone = String(destination.phone || "").trim();
        if (channel === "EMAIL") {
          if (!email) {
            return NextResponse.json(
              { success: false, error: "وجهة العميل غير موجودة." },
              { status: 409 },
            );
          }
          const sent = await sendEmail({
            tenantId: session.tenantId,
            to: email,
            subject: `Ticket reply: ${ticket.title}`,
            htmlBody: message,
          });
          if (!sent.success) {
            return NextResponse.json(
              {
                success: false,
                error: sent.code || sent.error || "EMAIL_PROVIDER_NOT_CONFIGURED",
              },
              { status: 409 },
            );
          }
        } else if (channel === "SMS") {
          if (!phone) {
            return NextResponse.json(
              { success: false, error: "وجهة العميل غير موجودة." },
              { status: 409 },
            );
          }
          const sent = await sendSMSNotification(phone, message, {
            tenantId: session.tenantId,
            ticketId: id,
          });
          if (!sent.success) {
            return NextResponse.json(
              { success: false, error: sent.error || "SMS_NOT_CONFIGURED" },
              { status: 409 },
            );
          }
        } else if (channel === "WHATSAPP") {
          if (!phone) {
            return NextResponse.json(
              { success: false, error: "وجهة العميل غير موجودة." },
              { status: 409 },
            );
          }
          try {
            const sent = await sendWhatsAppNotification(
              session.tenantId,
              phone,
              "support_ticket_update",
              [message],
            );
            if (!sent.success) {
              return NextResponse.json(
                {
                  success: false,
                  error:
                    sent.errorCode || sent.error || "WHATSAPP_NOT_CONFIGURED",
                },
                { status: 409 },
              );
            }
          } catch (error) {
            const code =
              error && typeof error === "object" && "code" in error
                ? String((error as { code?: string }).code)
                : error instanceof Error
                  ? error.message
                  : "WHATSAPP_NOT_CONFIGURED";
            return NextResponse.json(
              { success: false, error: code || "WHATSAPP_NOT_CONFIGURED" },
              { status: 409 },
            );
          }
        } else {
          return NextResponse.json(
            { success: false, error: "وجهة العميل غير موجودة." },
            { status: 409 },
          );
        }

        const record = await prisma.auditLog.create({
          data: {
            tenantId: session.tenantId,
            userId: session.userId,
            action: "TICKET_REPLIED",
            tableName: "tickets",
            recordId: id,
            details: JSON.stringify({
              message,
              sender: "CLIENT",
            }),
          },
          select: {
            id: true,
            createdAt: true,
          },
        });

        return NextResponse.json(
          {
            success: true,
            data: {
              id: record.id,
              message,
              sender: "CLIENT",
              createdAt: record.createdAt.toISOString(),
            },
          },
          { status: 201 },
        );
      } catch (error) {
        return httpErrorResponse(
          request,
          ErrorCode.INTERNAL_ERROR,
          "POST /api/v1/support/tickets/[id]/reply failed",
          error,
          500,
        );
      }
    },
  );
}
