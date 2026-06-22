import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantAndUser } from "@/lib/api-helpers";
import { configurePaymentPlan, ensureDefaultPaymentPlan } from "@/lib/domain/transaction-spine";
import type { PaymentPlanTemplate } from "@/lib/domain/transaction-spine";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { tenantId } = await getTenantAndUser(request);
    if (!tenantId) return NextResponse.json({ error: "غير مصرح بالوصول." }, { status: 401 });
    const { id } = await params;

    const plan = await prisma.paymentPlan.findFirst({
      where: { tenantId, contractId: id },
    });
    if (!plan) return NextResponse.json({ error: "خطة الدفع غير موجودة." }, { status: 404 });

    return NextResponse.json({
      success: true,
      data: {
        id: plan.id,
        template: plan.template,
        status: plan.status,
        totalAmount: Number(plan.totalAmount),
        installmentCount: plan.installmentCount,
        schedule: plan.scheduleJson,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "تعذر جلب خطة الدفع.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { tenantId, userId } = await getTenantAndUser(request);
    if (!tenantId || !userId) return NextResponse.json({ error: "غير مصرح بالوصول." }, { status: 401 });
    const { id } = await params;
    const body = await request.json();
    const template = String(body.template || "") as PaymentPlanTemplate;

    const allowed = new Set<PaymentPlanTemplate>([
      "SINGLE_PAYMENT",
      "DEPOSIT_AND_BALANCE",
      "MONTHLY",
      "CUSTOM",
    ]);
    if (!allowed.has(template)) {
      return NextResponse.json({ error: "قالب خطة الدفع غير صالح." }, { status: 400 });
    }

    const result = await configurePaymentPlan({
      tenantId,
      userId,
      contractId: id,
      template,
      installmentCount: body.installmentCount == null ? undefined : Number(body.installmentCount),
      intervalDays: body.intervalDays == null ? undefined : Number(body.intervalDays),
      depositPercent: body.depositPercent == null ? undefined : Number(body.depositPercent),
      firstDueDate: body.firstDueDate,
      customInstallments: Array.isArray(body.customInstallments)
        ? body.customInstallments.map((item: any) => ({
            amountSar: Number(item.amountSar),
            dueDate: item.dueDate,
          }))
        : undefined,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: result.paymentPlan.id,
        template: result.paymentPlan.template,
        status: result.paymentPlan.status,
        totalAmount: Number(result.paymentPlan.totalAmount),
        installmentCount: result.paymentPlan.installmentCount,
        schedule: result.schedule.map((item) => ({
          installmentNumber: item.installmentNumber,
          amountSar: item.amountSar,
          dueDate: item.dueDate.toISOString().slice(0, 10),
        })),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "تعذر تحديث خطة الدفع.";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { tenantId, userId } = await getTenantAndUser(request);
    if (!tenantId || !userId) return NextResponse.json({ error: "غير مصرح بالوصول." }, { status: 401 });
    const { id } = await params;
    const plan = await ensureDefaultPaymentPlan({ tenantId, contractId: id, userId });
    return NextResponse.json({ success: true, data: plan });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "تعذر إنشاء خطة الدفع.";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
