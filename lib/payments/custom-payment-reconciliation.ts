import "server-only";
import {
  createHmac,
  timingSafeEqual,
} from "node:crypto";
import { prisma, rawPrisma } from "@/lib/prisma";
import {
  completePaymentTransaction,
  failPaymentTransaction,
  PAYMENT_STATUS,
} from "@/lib/domain/transaction-spine";
import { createCustomPaymentProvider } from "@/lib/payments/providers/custom-payment";
import { getPaymentProviderRuntimeByConnectionId } from "@/lib/revenue-integrity/trust-gates";

const FINAL_FAILURES = new Set([
  "FAILED",
  "CANCELLED",
  "CANCELED",
  "REVERSED",
  "DECLINED",
  "EXPIRED",
  "VOIDED",
]);

export function signCustomPaymentCallback(
  transactionId: string,
  connectionId: string,
  secret: string,
): string {
  if (!secret) {
    throw new Error(
      "CUSTOM_PAYMENT_WEBHOOK_SECRET_REQUIRED",
    );
  }

  return createHmac("sha256", secret)
    .update(`${transactionId}:${connectionId}`)
    .digest("hex");
}

export function verifyCustomPaymentCallbackSignature(
  transactionId: string,
  connectionId: string,
  secret: string,
  signature: string,
): boolean {
  try {
    const expected = Buffer.from(
      signCustomPaymentCallback(
        transactionId,
        connectionId,
        secret,
      ),
      "hex",
    );
    const received = Buffer.from(
      String(signature || "").replace(
        /^sha256=/i,
        "",
      ),
      "hex",
    );

    return (
      expected.length === received.length &&
      expected.length > 0 &&
      timingSafeEqual(expected, received)
    );
  } catch {
    return false;
  }
}

export async function reconcileCustomPayment(input: {
  transactionId: string;
  connectionId: string;
  source: "RETURN" | "WEBHOOK";
}) {
  const payment =
    await rawPrisma.paymentTransaction.findFirst({
      where: {
        id: input.transactionId,
        provider: "CUSTOM_PAYMENT",
      },
    });

  if (!payment) {
    throw new Error(
      "CUSTOM_PAYMENT_TRANSACTION_NOT_FOUND",
    );
  }

  const runtime =
    await getPaymentProviderRuntimeByConnectionId(
      input.connectionId,
    );

  if (
    runtime.provider !== "CUSTOM_PAYMENT" ||
    runtime.tenantId !== payment.tenantId
  ) {
    throw new Error(
      "CUSTOM_PAYMENT_TENANT_OR_CONNECTION_MISMATCH",
    );
  }

  if (
    payment.status === PAYMENT_STATUS.COMPLETED
  ) {
    return {
      status: "already_completed",
      transactionId: payment.id,
      idempotent: true,
    };
  }

  if (!payment.providerReference) {
    throw new Error(
      "CUSTOM_PAYMENT_PROVIDER_REFERENCE_MISSING",
    );
  }

  const adapter = createCustomPaymentProvider({
    baseUrl: runtime.baseUrl,
    credentials: runtime.credentials,
  });

  const verified = await adapter.verifyPayment(
    payment.providerReference,
  );
  const status = String(
    verified.providerStatus || "UNKNOWN",
  ).toUpperCase();

  if (verified.paid) {
    try {
      const completed =
        await completePaymentTransaction({
          transactionId: payment.id,
          tenantId: payment.tenantId,
          amountMinorUnits:
            verified.amountMinorUnits,
          currency: verified.currency,
          providerStatus: status,
          rawPayload: verified.rawPayload,
          actorType: "PROVIDER",
          correlationId:
            `custom-payment:${input.source.toLowerCase()}:` +
            `${payment.id}:${payment.providerReference}`,
        });

      return {
        status: completed.idempotent
          ? "already_completed"
          : "completed",
        transactionId: payment.id,
        idempotent: completed.idempotent,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      await prisma.auditLog.create({
        data: {
          tenantId: payment.tenantId,
          userId: null,
          action: "EXEC008_PAYMENT_COMPLETION_DENIED",
          tableName: "payment_transactions",
          recordId: payment.id,
          details: JSON.stringify({
            transactionId: payment.id,
            provider: payment.provider,
            providerReference: payment.providerReference,
            source: input.source,
            providerStatus: status,
            error: errorMessage,
          }),
        },
      });

      throw error;
    }
  }

  if (FINAL_FAILURES.has(status)) {
    await failPaymentTransaction({
      transactionId: payment.id,
      tenantId: payment.tenantId,
      providerStatus: status,
      reason:
        `Custom payment final status: ${status}`,
      rawPayload: verified.rawPayload,
    });

    return {
      status: "failed",
      transactionId: payment.id,
      idempotent: false,
    };
  }

  await prisma.paymentTransaction.updateMany({
    where: {
      id: payment.id,
      tenantId: payment.tenantId,
      provider: "CUSTOM_PAYMENT",
      status: {
        not: PAYMENT_STATUS.COMPLETED,
      },
    },
    data: {
      status: PAYMENT_STATUS.PROCESSING,
      gatewayStatus: status,
      rawPayload: verified.rawPayload as any,
      webhookReceivedAt:
        input.source === "WEBHOOK"
          ? new Date()
          : undefined,
      paidAt: null,
      lastError: null,
    },
  });

  return {
    status: "pending",
    transactionId: payment.id,
    idempotent: false,
  };
}
