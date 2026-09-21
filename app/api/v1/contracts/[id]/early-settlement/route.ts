import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantAndUser } from "@/lib/api-helpers";
import { earlySettlePaymentPlan } from "@/lib/domain/transaction-spine";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { tenantId, userId } = await getTenantAndUser(request);
    if (!tenantId || !userId) {
      return NextResponse.json({ error: "غير مصرح بالوصول." }, { status: 401 });
    }

    const user = await prisma.user.findFirst({
      where: { id: userId, tenantId, isActive: true },
      select: { role: true },
    });
    if (!user || !["ADMIN", "SALES_MANAGER"].includes(user.role)) {
      return NextResponse.json(
        { error: "السداد المبكر يتطلب صلاحية مدير مبيعات أو مدير نظام." },
        { status: 403 },
      );
    }

    const { id } = await params;
    const body = await request.json();

    const result = await earlySettlePaymentPlan({
      tenantId,
      userId,
      actorId: userId,
      contractId: id,
      reason: String(body.reason || ""),
      idempotencyKey: String(body.idempotencyKey || ""),
    });

    return NextResponse.json({
      success: true,
      idempotent: result.idempotent,
      data: {
        paymentId: result.payment.id,
        paymentStatus: result.payment.status,
        settlementAmount: result.settlementAmount,
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "تعذر تنفيذ السداد المبكر.";
    const status =
      message.includes("not found") || message.includes("غير موجود")
        ? 404
        : message.includes("read-only") ||
            message.includes("signed") ||
            message.includes("active payment") ||
            message.includes("Only active")
          ? 409
          : 400;

    return NextResponse.json({ success: false, error: message }, { status });
  }
}