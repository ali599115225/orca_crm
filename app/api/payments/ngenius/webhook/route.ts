import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ngeniusProvider } from "@/lib/payments/providers/ngenius";
import {
  completePaymentTransaction,
  failPaymentTransaction,
  PAYMENT_STATUS,
} from "@/lib/domain/transaction-spine";

const FINAL_FAILURES = new Set(["FAILED", "CANCELLED", "CANCELED", "REVERSED", "DECLINED"]);

function extractOrderReference(body: any): string {
  return String(
    body?.id ||
      body?.orderId ||
      body?.orderReference ||
      body?.reference ||
      body?.event?.id ||
      body?.data?.id ||
      "",
  ).trim();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const providerReference = extractOrderReference(body);
    if (!providerReference) {
      return NextResponse.json({ error: "N-Genius order reference is missing." }, { status: 400 });
    }

    const payment = await prisma.paymentTransaction.findFirst({
      where: { provider: "NGENIUS", providerReference },
    });
    if (!payment) {
      return NextResponse.json({ error: "Payment transaction not found." }, { status: 404 });
    }
    if (payment.status === PAYMENT_STATUS.COMPLETED) {
      return NextResponse.json({ success: true, status: "already_completed" });
    }

    const verified = await ngeniusProvider.verifyPayment(providerReference);
    const status = verified.providerStatus.toUpperCase();

    if (verified.paid) {
      const result = await completePaymentTransaction({
        transactionId: payment.id,
        tenantId: payment.tenantId,
        amountMinorUnits: verified.amountMinorUnits,
        currency: verified.currency,
        providerStatus: status,
        rawPayload: verified.rawPayload,
      });
      return NextResponse.json({
        success: true,
        status: result.idempotent ? "already_completed" : "completed",
      });
    }

    if (FINAL_FAILURES.has(status)) {
      await failPaymentTransaction({
        transactionId: payment.id,
        tenantId: payment.tenantId,
        providerStatus: status,
        reason: `N-Genius final status: ${status}`,
        rawPayload: verified.rawPayload,
      });
      return NextResponse.json({ success: true, status: "failed" });
    }

    await prisma.paymentTransaction.updateMany({
      where: {
        id: payment.id,
        tenantId: payment.tenantId,
        status: { not: PAYMENT_STATUS.COMPLETED },
      },
      data: {
        status: PAYMENT_STATUS.PROCESSING,
        gatewayStatus: status,
        webhookReceivedAt: new Date(),
        rawPayload: verified.rawPayload as any,
        paidAt: null,
        lastError: null,
      },
    });

    return NextResponse.json({ success: true, status: "pending" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Webhook processing failed.";
    console.error("[N-Genius webhook]", message);
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({ success: true, provider: "NGENIUS" });
}
