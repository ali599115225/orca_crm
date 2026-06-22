import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { redactPiiFromPayload } from "@/lib/privacy-mask";
import { ErrorCode, publicError } from "@/lib/errors";
import { ngeniusProvider } from "@/lib/payments/providers/ngenius";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 64 * 1024;

function clean(value: unknown, max = 200): string {
  return typeof value === "string"
    ? value.replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, max)
    : "";
}

function requestIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

function amountMatches(webhookAmount: unknown, expectedMinor: number): boolean {
  const amount = Number(webhookAmount);
  if (!Number.isFinite(amount) || amount <= 0 || expectedMinor <= 0) return false;
  return Math.round(amount) === expectedMinor;
}

export async function POST(request: NextRequest) {
  const limit = await rateLimit(
    `ngenius:webhook:ip:${requestIp(request)}`,
    60,
    60_000,
    true,
  );
  if (!limit.allowed) {
    return NextResponse.json(
      publicError(ErrorCode.RATE_LIMITED, "N-Genius webhook rate limited"),
      { status: 429 },
    );
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return NextResponse.json(
      publicError(ErrorCode.BAD_REQUEST, "N-Genius body too large"),
      { status: 413 },
    );
  }

  try {
    const rawBody = await request.text();
    if (Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) {
      return NextResponse.json(
        publicError(ErrorCode.BAD_REQUEST, "N-Genius body too large"),
        { status: 413 },
      );
    }

    const parsed = JSON.parse(rawBody);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return NextResponse.json(
        publicError(ErrorCode.BAD_REQUEST, "N-Genius body invalid"),
        { status: 400 },
      );
    }

    const body = parsed as Record<string, unknown>;
    const orderId = clean(body.id || body.orderId);
    const status = clean(body.status, 40).toUpperCase();

    if (!orderId) {
      return NextResponse.json(
        publicError(ErrorCode.WEBHOOK_INVALID, "N-Genius webhook missing order id"),
        { status: 400 },
      );
    }

    const payment = await prisma.paymentTransaction.findFirst({
      where: { provider: "NGENIUS", providerReference: orderId },
    });

    if (!payment) {
      return NextResponse.json(
        publicError(ErrorCode.NOT_FOUND, "N-Genius transaction not found"),
        { status: 404 },
      );
    }

    if (payment.status === "COMPLETED") {
      return NextResponse.json({ status: "already_processed" });
    }

    const orderStatus = await ngeniusProvider.verifyPayment(orderId);
    if (!orderStatus.paid) {
      await prisma.$transaction(async (tx) => {
        await tx.paymentTransaction.update({
          where: { id: payment.id },
          data: {
            status: "FAILED",
            gatewayStatus: status,
            rawPayload: redactPiiFromPayload(body) as never,
            webhookReceivedAt: new Date(),
            failureReason: `Order status: ${status}`,
          },
        });

        if (payment.installmentId) {
          await tx.installment.updateMany({
            where: { id: payment.installmentId, tenantId: payment.tenantId },
            data: { paymentStatus: "Pending" },
          });
        }

        await tx.auditLog.create({
          data: {
            tenantId: payment.tenantId,
            userId: null,
            action: "NGENIUS_PAYMENT_FAILED",
            tableName: "payment_transactions",
            recordId: payment.id,
            details: `N-Genius payment status: ${status}`,
          },
        });
      });
      return NextResponse.json({ status: "recorded" });
    }

    const expectedMinor =
      payment.expectedAmountMinor > 0
        ? payment.expectedAmountMinor
        : Math.round(Number(payment.amount) * 100);

    if (!amountMatches(orderStatus.amountMinorUnits, expectedMinor)) {
      return NextResponse.json(
        publicError(ErrorCode.WEBHOOK_INVALID, "N-Genius amount mismatch"),
        { status: 400 },
      );
    }

    const currency = (orderStatus.currency || "SAR").toUpperCase();
    if (currency !== (payment.expectedCurrency || "SAR").toUpperCase()) {
      return NextResponse.json(
        publicError(ErrorCode.WEBHOOK_INVALID, "N-Genius currency mismatch"),
        { status: 400 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const current = await tx.paymentTransaction.findFirst({
        where: { id: payment.id, tenantId: payment.tenantId },
      });

      if (!current || current.status === "COMPLETED") {
        return { alreadyProcessed: true } as const;
      }

      if (payment.installmentId) {
        const installment = await tx.installment.findFirst({
          where: { id: payment.installmentId, tenantId: payment.tenantId },
        });

        if (!installment) {
          throw new Error("N-Genius installment missing");
        }

        if (installment.paymentStatus === "Paid") {
          await tx.paymentTransaction.update({
            where: { id: payment.id },
            data: {
              status: "REVIEW_REQUIRED",
              gatewayStatus: "completed",
              rawPayload: redactPiiFromPayload(body) as never,
              webhookReceivedAt: new Date(),
              lastError: "INSTALLMENT_ALREADY_PAID",
            },
          });
          return { reviewRequired: true } as const;
        }

        const installmentAmount = Number(installment.amountSar);
        const paymentAmount = Number(payment.amount);
        const isFullyPaid = paymentAmount >= installmentAmount;

        await tx.installment.updateMany({
          where: { id: installment.id, tenantId: payment.tenantId },
          data: { paymentStatus: isFullyPaid ? "Paid" : "Partial" },
        });
      }

      await tx.paymentTransaction.update({
        where: { id: payment.id },
        data: {
          status: "COMPLETED",
          gatewayStatus: "completed",
          gatewayRef: orderId,
          paidAt: new Date(),
          processedAt: new Date(),
          webhookReceivedAt: new Date(),
          rawPayload: redactPiiFromPayload(body) as never,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: payment.tenantId,
          userId: null,
          action: "NGENIUS_PAYMENT_RECEIVED",
          tableName: "payment_transactions",
          recordId: payment.id,
          details: `N-Genius payment confirmed for order ${orderId}`,
        },
      });

      return { processed: true, id: payment.id } as const;
    });

    if ("alreadyProcessed" in result) {
      return NextResponse.json({ status: "already_processed" });
    }
    if ("reviewRequired" in result) {
      return NextResponse.json({ status: "review_required" });
    }
    return NextResponse.json({ status: "processed", id: result.id });
  } catch (error: unknown) {
    return NextResponse.json(
      publicError(ErrorCode.INTERNAL_ERROR, "N-Genius webhook failed", error),
      { status: 500 },
    );
  }
}
