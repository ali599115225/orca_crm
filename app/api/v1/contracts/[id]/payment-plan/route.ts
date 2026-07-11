import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  CONTRACT_WRITE_ROLES,
  TENANT_ROLES,
  runWithDatabaseSession,
} from "@/lib/api-auth-guard";
import {
  configurePaymentPlan,
  ensureDefaultPaymentPlan,
} from "@/lib/domain/transaction-spine";
import type { PaymentPlanTemplate } from "@/lib/domain/transaction-spine";
import { ErrorCode } from "@/lib/errors";
import { httpErrorResponse } from "@/lib/http-error-response";

const ALLOWED_TEMPLATES = new Set<PaymentPlanTemplate>([
  "SINGLE_PAYMENT",
  "DEPOSIT_AND_BALANCE",
  "MONTHLY",
  "CUSTOM",
]);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return runWithDatabaseSession(request, TENANT_ROLES, async (session) => {
    try {
      const { id } = await params;
      const plan = await prisma.paymentPlan.findFirst({
        where: { tenantId: session.tenantId, contractId: id },
      });

      if (!plan) {
        return NextResponse.json(
          { success: false, error: "خطة الدفع غير موجودة." },
          { status: 404 },
        );
      }

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
      return httpErrorResponse(
        request,
        ErrorCode.INTERNAL_ERROR,
        "GET /api/v1/contracts/:id/payment-plan failed",
        error,
      );
    }
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return runWithDatabaseSession(request, CONTRACT_WRITE_ROLES, async (session) => {
    try {
      const { id } = await params;
      const body = await request.json();
      const template = String(body.template || "") as PaymentPlanTemplate;

      if (!ALLOWED_TEMPLATES.has(template)) {
        return NextResponse.json(
          { success: false, error: "قالب خطة الدفع غير صالح." },
          { status: 400 },
        );
      }

      const customInstallments: Array<{ amountSar: number; dueDate: string }> | undefined =
        Array.isArray(body.customInstallments)
        ? body.customInstallments.map((item: unknown) => {
            const value =
              typeof item === "object" && item !== null
                ? (item as Record<string, unknown>)
                : {};
            return {
              amountSar: Number(value.amountSar),
              dueDate: typeof value.dueDate === "string" ? value.dueDate : "",
            };
          })
        : undefined;

      if (
        customInstallments?.some(
          (item) =>
            !Number.isFinite(item.amountSar) ||
            item.amountSar <= 0 ||
            item.dueDate.trim().length === 0,
        )
      ) {
        return NextResponse.json(
          { success: false, error: "تفاصيل الأقساط المخصصة غير صالحة." },
          { status: 400 },
        );
      }

      const result = await configurePaymentPlan({
        tenantId: session.tenantId,
        userId: session.userId,
        contractId: id,
        template,
        installmentCount:
          body.installmentCount == null ? undefined : Number(body.installmentCount),
        intervalDays:
          body.intervalDays == null ? undefined : Number(body.intervalDays),
        depositPercent:
          body.depositPercent == null ? undefined : Number(body.depositPercent),
        firstDueDate: body.firstDueDate,
        customInstallments,
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
      return httpErrorResponse(
        request,
        ErrorCode.INTERNAL_ERROR,
        "PUT /api/v1/contracts/:id/payment-plan failed",
        error,
      );
    }
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return runWithDatabaseSession(request, CONTRACT_WRITE_ROLES, async (session) => {
    try {
      const { id } = await params;
      const plan = await ensureDefaultPaymentPlan({
        tenantId: session.tenantId,
        contractId: id,
        userId: session.userId,
      });
      return NextResponse.json({ success: true, data: plan });
    } catch (error: unknown) {
      return httpErrorResponse(
        request,
        ErrorCode.INTERNAL_ERROR,
        "POST /api/v1/contracts/:id/payment-plan failed",
        error,
      );
    }
  });
}
