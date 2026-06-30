import { NextRequest, NextResponse } from "next/server";
import {
  forbiddenResponse,
  hasDatabaseRole,
  requireAuth,
  unauthorizedResponse,
} from "@/lib/api-auth-guard";
import { updateTourStatus } from "@/lib/domain/transaction-spine";
import type { UpdateTourStatusInput } from "@/lib/domain/transaction-spine";

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
  try {
    const { id } = await params;
    const session = await requireAuth(request);
    if (!session) return unauthorizedResponse(request);
    if (!(await hasDatabaseRole(session, ["ADMIN", "SALES_MANAGER", "SALES_EMPLOYEE"]))) {
      return forbiddenResponse(request);
    }
    const { tenantId, userId } = session;

    const body = await request.json();
    const status = String(body.status || "").toUpperCase();
    if (!ALLOWED.has(status)) {
      return NextResponse.json(
        { error: "الحالة المستهدفة غير صالحة." },
        { status: 400 },
      );
    }

    const result = await updateTourStatus({
      tenantId,
      userId,
      tourId: id,
      status: status as UpdateTourStatusInput["status"],
      correlationId: request.headers.get("x-correlation-id") || undefined,
    });

    return NextResponse.json({
      success: true,
      data: result.tour,
      followUpCreated: result.followUpCreated,
      taskId: result.taskId,
      idempotent: result.idempotent,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "تعذر تحديث الجولة.";
    const status = message.includes("not found") ? 404 : 400;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
