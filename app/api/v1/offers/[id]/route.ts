import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  runWithDatabaseSession,
  TENANT_WRITE_ROLES,
} from "@/lib/api-auth-guard";
import { writeAuditLog } from "@/lib/audit";

const ALLOWED = new Set([
  "PENDING",
  "SENT",
  "NEGOTIATION",
  "REJECTED",
  "EXPIRED",
]);

export async function PATCH(
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
        const status = String(body.status || "").trim().toUpperCase();

        if (!ALLOWED.has(status)) {
          return NextResponse.json(
            {
              success: false,
              error:
                "الحالة غير صالحة. قبول العرض يتم عبر إجراء التحويل إلى عقد.",
            },
            { status: 400 },
          );
        }

        const current = await prisma.offer.findFirst({
          where: { id, tenantId: session.tenantId },
          include: { contract: { select: { id: true } } },
        });

        if (!current) {
          return NextResponse.json(
            { success: false, error: "العرض غير موجود." },
            { status: 404 },
          );
        }
        if (current.contract || current.status === "ACCEPTED") {
          return NextResponse.json(
            {
              success: false,
              error: "العرض المقبول أو المحول إلى عقد لا يمكن إرجاعه.",
            },
            { status: 409 },
          );
        }

        const updated = await prisma.offer.updateMany({
          where: { id, tenantId: session.tenantId },
          data: {
            status,
            updatedBy: session.userId,
            auditLog: `Status changed from ${current.status} to ${status}`,
          },
        });

        if (updated.count !== 1) {
          return NextResponse.json(
            { success: false, error: "تعذر تحديث العرض." },
            { status: 409 },
          );
        }

        await writeAuditLog({
          tenantId: session.tenantId,
          userId: session.userId,
          action: "OFFER_STATUS_UPDATED",
          tableName: "offers",
          recordId: id,
          details: JSON.stringify({
            before: current.status,
            after: status,
          }),
        });

        return NextResponse.json({ success: true, data: { id, status } });
      } catch {
        return NextResponse.json(
          { success: false, error: "تعذر تحديث حالة العرض." },
          { status: 500 },
        );
      }
    },
  );
}
