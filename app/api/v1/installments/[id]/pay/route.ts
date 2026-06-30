import { httpErrorResponse } from "@/lib/http-error-response";
// app/api/v1/installments/[id]/pay/route.ts
// Hardened: unconditional role check + audit. Role check no longer conditional on userId.
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, hasDatabaseRole, forbiddenResponse, unauthorizedResponse } from "@/lib/api-auth-guard";
import { writeAuditLog } from "@/lib/audit";
import { recordPayment } from "@/lib/domain/transaction-spine";
import { ErrorCode } from "@/lib/errors";

const INSTALLMENT_PAY_ROLES = ["ADMIN", "SALES_MANAGER"] as const;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ── Auth: unconditional — both session AND DB role required ───────────────
    const session = await requireAuth(request);
    if (!session) return unauthorizedResponse(request);

    const allowed = await hasDatabaseRole(session, INSTALLMENT_PAY_ROLES);
    if (!allowed) return forbiddenResponse(request);

    const { id: installmentId } = await params;
    const body = await request.json();
    const { amount, method, idempotencyKey } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount." }, { status: 400 });
    }
    if (!method) {
      return NextResponse.json({ error: "Payment method is required." }, { status: 400 });
    }
    if (!idempotencyKey) {
      return NextResponse.json({ error: "Idempotency key is required." }, { status: 400 });
    }

    const result = await recordPayment({
      tenantId: session.tenantId,
      userId: session.userId,
      installmentId,
      amount: Number(amount),
      method,
      idempotencyKey,
    });

    // ── Audit ──────────────────────────────────────────────────────────────
    await writeAuditLog({
      tenantId: session.tenantId,
      userId: session.userId,
      action: "INSTALLMENT_PAID",
      tableName: "installments",
      recordId: installmentId,
      details: JSON.stringify({ amount, method, idempotent: result.idempotent }),
    });

    const statusCode = result.idempotent ? 200 : 201;
    return NextResponse.json(
      {
        success: true,
        data: result.payment,
        idempotent: result.idempotent,
      },
      { status: statusCode }
    );
  } catch (error: any) {
    const status = error.message?.includes("not found")
      ? 404
      : error.message?.includes("Insufficient")
      ? 403
      : error.message?.includes("exceeds")
      ? 422
      : 500;
    return httpErrorResponse(request, ErrorCode.INTERNAL_ERROR, "POST /api/v1/installments/[id]/pay failed", error);
  }
}
