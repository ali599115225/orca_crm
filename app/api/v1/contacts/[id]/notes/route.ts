import { httpErrorResponse } from "@/lib/http-error-response";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  runWithDatabaseSession,
  TENANT_WRITE_ROLES,
} from "@/lib/api-auth-guard";
import { ErrorCode } from "@/lib/errors";
import { writeAuditLog } from "@/lib/audit";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return runWithDatabaseSession(
    request,
    TENANT_WRITE_ROLES,
    async (session) => {
      try {
        const { id } = await params;
        const body = await request.json();
        const note = String(body.note || "").trim();

        if (!note) {
          return NextResponse.json(
            { success: false, error: "محتوى الملاحظة مطلوب." },
            { status: 400 },
          );
        }

        const contact = await prisma.contact.findFirst({
          where: { id, tenantId: session.tenantId },
        });

        if (!contact) {
          return NextResponse.json(
            { success: false, error: "جهة الاتصال غير موجودة." },
            { status: 404 },
          );
        }

        const now = new Date().toISOString();
        const updatedContact = await prisma.contact.update({
          where: { id: contact.id },
          data: {
            notes: `${contact.notes || ""}\n[Note at ${now}]: ${note}`.trim(),
            updatedBy: session.userId,
            auditLog:
              `${contact.auditLog || ""}\nAdded note at ${now}`.trim(),
          },
        });

        if (contact.leadId) {
          await writeAuditLog({
            tenantId: session.tenantId,
            userId: session.userId,
            action: "LEAD_CONTACT_NOTE_ADDED",
            tableName: "leads",
            recordId: contact.leadId,
            details: JSON.stringify({ contactId: contact.id }),
          });
        }

        return NextResponse.json({
          success: true,
          data: updatedContact,
        });
      } catch (error: unknown) {
        return httpErrorResponse(
          request,
          ErrorCode.INTERNAL_ERROR,
          "POST /api/v1/contacts/[id]/notes failed",
          error,
          500,
        );
      }
    },
  );
}
