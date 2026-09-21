import { httpErrorResponse } from "@/lib/http-error-response";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  runWithDatabaseSession,
  TENANT_ROLES,
  TENANT_WRITE_ROLES,
} from "@/lib/api-auth-guard";
import { hashPhone, hashEmail } from "@/lib/privacy-mask";
import { ErrorCode } from "@/lib/errors";
import { writeAuditLog } from "@/lib/audit";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  return runWithDatabaseSession(request, TENANT_ROLES, async (session) => {
    try {
      const leadId = new URL(request.url).searchParams.get("leadId");
      if (leadId && !UUID_REGEX.test(leadId)) {
        return NextResponse.json(
          { success: false, error: "معرف العميل غير صالح." },
          { status: 400 },
        );
      }

      const contacts = await prisma.contact.findMany({
        where: {
          tenantId: session.tenantId,
          ...(leadId ? { leadId } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      });

      return NextResponse.json({ success: true, data: contacts });
    } catch (error: unknown) {
      return httpErrorResponse(
        request,
        ErrorCode.INTERNAL_ERROR,
        "GET /api/v1/contacts failed",
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
        const {
          leadId,
          name,
          phone,
          email,
          preferredContactTime,
          budgetRange,
          notes,
        } = body;

        if (!name || !phone) {
          return NextResponse.json(
            { success: false, error: "الاسم ورقم الهاتف مطلوبان." },
            { status: 400 },
          );
        }

        if (leadId && !UUID_REGEX.test(leadId)) {
          return NextResponse.json(
            { success: false, error: "معرف العميل غير صالح." },
            { status: 400 },
          );
        }

        if (leadId) {
          const lead = await prisma.lead.findFirst({
            where: { id: leadId, tenantId: session.tenantId },
            select: { id: true },
          });
          if (!lead) {
            return NextResponse.json(
              {
                success: false,
                error: "العميل غير موجود أو لا يتبع منشأتك.",
              },
              { status: 404 },
            );
          }
        }

        const contact = await prisma.contact.create({
          data: {
            tenantId: session.tenantId,
            leadId: leadId || null,
            name,
            phone,
            phoneHash: hashPhone(session.tenantId, phone),
            email: email || null,
            emailHash: email
              ? hashEmail(email, session.tenantId)
              : null,
            preferredContactTime: preferredContactTime || null,
            budgetRange: budgetRange || null,
            notes: notes || null,
            createdBy: session.userId,
            updatedBy: session.userId,
          },
        });

        const summaryText = `العميل المهتم ${name} يفضل الاتصال في ${
          preferredContactTime || "أي وقت"
        }. الميزانية المقدرة: ${budgetRange || "غير محددة"}.`;

        await prisma.telemetryEvent.create({
          data: {
            tenantId: session.tenantId,
            eventType: "contact.created",
            eventDataJson: JSON.stringify({
              contactId: contact.id,
              leadId,
              summary: summaryText,
            }),
            createdBy: session.userId,
          },
        });

        if (leadId) {
          await writeAuditLog({
            tenantId: session.tenantId,
            userId: session.userId,
            action: "LEAD_CONTACT_CREATED",
            tableName: "leads",
            recordId: leadId,
            details: JSON.stringify({ contactId: contact.id }),
          });
        }

        return NextResponse.json(
          { success: true, data: contact, summary: summaryText },
          { status: 201 },
        );
      } catch (error: unknown) {
        return httpErrorResponse(
          request,
          ErrorCode.INTERNAL_ERROR,
          "POST /api/v1/contacts failed",
          error,
          500,
        );
      }
    },
  );
}
