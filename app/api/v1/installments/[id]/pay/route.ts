import { NextRequest, NextResponse } from "next/server";
import { getTenantAndUser } from "@/lib/api-helpers";
import { recordPayment } from "@/lib/domain/transaction-spine";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: installmentId } = await params;
    const { tenantId, userId } = await getTenantAndUser(request);
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID missing." }, { status: 400 });
    }

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

    if (userId) {
      const user = await (await import("@/lib/prisma")).prisma.user.findFirst({
        where: { id: userId, tenantId },
        select: { role: true },
      });
      if (!user || !["ADMIN", "SALES_MANAGER"].includes(user.role)) {
        return NextResponse.json({ error: "Insufficient permissions." }, { status: 403 });
      }
    }

    const result = await recordPayment({
      tenantId,
      userId: userId || "",
      installmentId,
      amount: Number(amount),
      method,
      idempotencyKey,
    });

    const statusCode = result.idempotent ? 200 : 201;
    return NextResponse.json({
      success: true,
      data: result.payment,
      idempotent: result.idempotent,
    }, { status: statusCode });
  } catch (error: any) {
    const status = error.message?.includes("not found") || error.message?.includes("Insufficient")
      ? error.message?.includes("Insufficient") ? 403 : 404
      : error.message?.includes("exceeds") ? 422 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}
