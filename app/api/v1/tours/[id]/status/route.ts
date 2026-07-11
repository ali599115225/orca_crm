import { NextRequest, NextResponse } from "next/server";
import {
  runWithDatabaseSession,
  TENANT_WRITE_ROLES,
} from "@/lib/api-auth-guard";
import { updateTourStatus } from "@/lib/domain/transaction-spine";
import type { UpdateTourStatusInput } from "@/lib/domain/transaction-spine";
import { writeAuditLog } from "@/lib/audit";

const ALLOWED = new Set([
  "SCHEDULED",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
  "FOLLOW_UP",
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
        const status = String(body.status || "").toUpperCase();

        if (!ALLOWED.has(status)) {
          return NextResponse.json(
            { success: false, error: "الحالة المستهدفة غير صالحة." },
            { status: 400 },
          );
        }

        const result = await updateTourStatus({
          tenantId: session.tenantId,
          userId: session.userId,
          tourId: id,
          status: status as UpdateTourStatusInput["status"],
          correlationId:
            request.headers.get("x-correlation-id") || undefined,
        });

        if (!result.idempotent) {
          await writeAuditLog({
            tenantId: session.tenantId,
            userId: session.userId,
            action: "LEAD_TOUR_STATUS_UPDATED",
            tableName: "leads",
            recordId: result.tour.leadId,
            details: JSON.stringify({
              tourId: result.tour.id,
              status: result.tour.status,
              taskId: result.taskId,
            }),
          });
        }

        return NextResponse.json({
          success: true,
          data: result.tour,
          followUpCreated: result.followUpCreated,
          taskId: result.taskId,
          idempotent: result.idempotent,
        });
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "تعذر تحديث الجولة.";
        const status = /not found/i.test(message) ? 404 : 400;
        return NextResponse.json(
          { success: false, error: message },
          { status },
        );
      }
    },
  );
}
