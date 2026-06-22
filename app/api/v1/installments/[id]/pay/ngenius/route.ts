import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getTenantAndUser } from "@/lib/api-helpers";
import { ngeniusProvider } from "@/lib/payments/providers/ngenius";
import {
  CONTRACT_STATUS,
  INSTALLMENT_STATUS,
  PAYMENT_STATUS,
} from "@/lib/domain/transaction-spine";

function idempotencyHash(tenantId: string, installmentId: string, amountMinor: number) {
  return createHash("sha256")
    .update(`${tenantId}:NGENIUS:${installmentId}:${amountMinor}`)
    .digest("hex");
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { tenantId, userId } = await getTenantAndUser(request);
    if (!tenantId || !userId) {
      return NextResponse.json({ error: "غير مصرح بالوصول." }, { status: 401 });
    }
    const { id } = await params;

    const installment = await prisma.installment.findFirst({
      where: { id, tenantId },
      include: {
        contract: { select: { id: true, status: true, spineVersion: true, legacyFinancial: true } },
        invoice: { select: { id: true, status: true } },
        payments: {
          where: { status: PAYMENT_STATUS.COMPLETED },
          select: { netAmount: true },
        },
      },
    });

    if (!installment) {
      return NextResponse.json({ error: "القسط غير موجود." }, { status: 404 });
    }
    if (installment.contract.legacyFinancial || installment.contract.spineVersion < 2) {
      return NextResponse.json({ error: "العقد التاريخي للعرض فقط ولا يقبل دفعات جديدة." }, { status: 409 });
    }
    if (installment.contract.status !== CONTRACT_STATUS.SIGNED) {
      return NextResponse.json({ error: "لا يمكن تحصيل قسط قبل توقيع العقد." }, { status: 409 });
    }
    if (!installment.invoiceId || !installment.invoice) {
      return NextResponse.json({ error: "القسط غير مرتبط بفاتورة بيع." }, { status: 409 });
    }
    if (installment.paymentStatus === INSTALLMENT_STATUS.PAID) {
      return NextResponse.json({ error: "القسط مدفوع بالكامل." }, { status: 409 });
    }

    const paidAmount = installment.payments.reduce(
      (sum, payment) => sum + Number(payment.netAmount),
      0,
    );
    const remainingAmount = Math.round(
      (Number(installment.amountSar) - paidAmount + Number.EPSILON) * 100,
    ) / 100;
    const amountMinor = Math.round(remainingAmount * 100);
    if (amountMinor <= 0) {
      return NextResponse.json({ error: "لا يوجد رصيد متبقٍ لهذا القسط." }, { status: 409 });
    }

    const active = await prisma.paymentTransaction.findFirst({
      where: {
        tenantId,
        installmentId: installment.id,
        provider: "NGENIUS",
        status: { in: [PAYMENT_STATUS.PENDING, PAYMENT_STATUS.PROCESSING] },
      },
      orderBy: { createdAt: "desc" },
    });
    if (active?.paymentUrl) {
      return NextResponse.json({
        success: true,
        redirectUrl: active.paymentUrl,
        transactionId: active.id,
        idempotent: true,
      });
    }

    const key = idempotencyHash(tenantId, installment.id, amountMinor);
    let transaction = active || (await prisma.paymentTransaction.findFirst({
      where: { tenantId, idempotencyKey: key },
      orderBy: { createdAt: "desc" },
    }));

    if (!transaction) {
      try {
        transaction = await prisma.paymentTransaction.create({
          data: {
            tenantId,
            invoiceId: installment.invoiceId,
            installmentId: installment.id,
            amount: remainingAmount,
            fee: 0,
            netAmount: remainingAmount,
            currency: "SAR",
            method: "ngenius",
            status: PAYMENT_STATUS.PROCESSING,
            provider: "NGENIUS",
            idempotencyKey: key,
            planCode: `installment:${installment.id}`,
            expectedAmountMinor: amountMinor,
            expectedCurrency: "SAR",
            paidAt: null,
          },
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          transaction = await prisma.paymentTransaction.findFirst({
            where: { tenantId, idempotencyKey: key },
          });
        } else {
          throw error;
        }
      }
    }
    if (!transaction) throw new Error("تعذر إنشاء معاملة الدفع.");

    await prisma.paymentTransaction.update({
      where: { id: transaction.id },
      data: {
        status: PAYMENT_STATUS.PROCESSING,
        lastError: null,
        failureReason: null,
        expectedAmountMinor: amountMinor,
        expectedCurrency: "SAR",
      },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://orca.az-ez.pro";
    try {
      const order = await ngeniusProvider.createPayment({
        tenantId,
        planCode: `installment:${installment.id}`,
        amountMinorUnits: amountMinor,
        currency: "SAR",
        description: `ORCA installment ${installment.installmentNumber}`,
        callbackUrl: `${appUrl}/operations/rental?payment=return&transactionId=${encodeURIComponent(transaction.id)}`,
        metadata: {
          internalTransactionId: transaction.id,
          installmentId: installment.id,
          invoiceId: installment.invoiceId,
        },
      });

      const updated = await prisma.paymentTransaction.update({
        where: { id: transaction.id },
        data: {
          status: PAYMENT_STATUS.PENDING,
          providerReference: order.providerReference,
          providerTransactionId: order.providerReference,
          paymentUrl: order.redirectUrl,
          gatewayStatus: order.providerStatus,
          rawPayload: order.rawPayload as any,
          paidAt: null,
        },
      });

      await prisma.auditLog.create({
        data: {
          tenantId,
          userId,
          action: "CREATE_NGENIUS_INSTALLMENT_PAYMENT",
          tableName: "payment_transactions",
          recordId: updated.id,
          details: JSON.stringify({
            installmentId: installment.id,
            invoiceId: installment.invoiceId,
            amountMinor,
            providerReference: order.providerReference,
          }),
        },
      });

      return NextResponse.json({
        success: true,
        redirectUrl: order.redirectUrl,
        transactionId: updated.id,
        idempotent: false,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "N-Genius payment creation failed";
      await prisma.paymentTransaction.update({
        where: { id: transaction.id },
        data: {
          status: PAYMENT_STATUS.FAILED,
          paidAt: null,
          failureReason: message.slice(0, 2000),
          lastError: message.slice(0, 2000),
        },
      });
      throw error;
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "فشل إنشاء رابط الدفع.";
    return NextResponse.json({ success: false, error: message }, { status: 503 });
  }
}
