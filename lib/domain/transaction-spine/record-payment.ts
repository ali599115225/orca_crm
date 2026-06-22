import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertTenantOwnership } from "./validate-tenant";
import { completePaymentTransaction } from "./payment-reconciliation";
import { PAYMENT_STATUS } from "./constants";
import type { RecordPaymentInput } from "./types";

function hashIdempotencyKey(tenantId: string, key: string): string {
  return createHash("sha256").update(`${tenantId}:${key}`).digest("hex");
}

export async function recordPayment(input: RecordPaymentInput) {
  const {
    tenantId,
    userId,
    invoiceId,
    installmentId,
    amount,
    method,
    idempotencyKey,
  } = input;

  if (!invoiceId && !installmentId) {
    throw new Error("Payment must reference an invoice or installment.");
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Payment amount must be positive.");
  }
  if (!idempotencyKey?.trim()) throw new Error("Idempotency key is required.");

  if (invoiceId) {
    await assertTenantOwnership(
      tenantId,
      "invoice",
      invoiceId,
      "Invoice not found in this tenant.",
    );
  }
  if (installmentId) {
    await assertTenantOwnership(
      tenantId,
      "installment",
      installmentId,
      "Installment not found in this tenant.",
    );
  }

  const keyHash = hashIdempotencyKey(tenantId, idempotencyKey.trim());
  const existing = await prisma.paymentTransaction.findFirst({
    where: { tenantId, idempotencyKey: keyHash },
  });
  if (existing) {
    return { payment: existing, idempotent: true };
  }

  const installment = installmentId
    ? await prisma.installment.findFirst({
        where: { id: installmentId, tenantId },
      })
    : null;
  const resolvedInvoiceId = invoiceId || installment?.invoiceId || null;
  if (!resolvedInvoiceId) {
    throw new Error("Payment target is not linked to an invoice.");
  }

  const invoice = await prisma.invoice.findFirst({
    where: { id: resolvedInvoiceId, tenantId },
  });
  if (!invoice) throw new Error("Invoice not found.");
  if (invoice.status === "paid") throw new Error("Invoice is already paid.");

  const targetIdFilter = installmentId
    ? { installmentId }
    : { invoiceId: resolvedInvoiceId };
  const completed = await prisma.paymentTransaction.aggregate({
    where: {
      tenantId,
      ...targetIdFilter,
      status: PAYMENT_STATUS.COMPLETED,
    },
    _sum: { netAmount: true },
  });
  const targetTotal = installment
    ? Number(installment.amountSar)
    : Number(invoice.totalAmount);
  const remaining = targetTotal - Number(completed._sum.netAmount || 0);
  if (amount > remaining + 0.01) {
    throw new Error("Payment amount exceeds the remaining balance.");
  }

  let payment;
  try {
    payment = await prisma.paymentTransaction.create({
      data: {
        tenantId,
        invoiceId: resolvedInvoiceId,
        installmentId: installmentId || null,
        amount,
        fee: 0,
        netAmount: amount,
        currency: "SAR",
        method,
        status: PAYMENT_STATUS.PENDING,
        provider: "MANUAL",
        idempotencyKey: keyHash,
        expectedAmountMinor: Math.round(amount * 100),
        expectedCurrency: "SAR",
        paidAt: null,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const duplicate = await prisma.paymentTransaction.findFirst({
        where: { tenantId, idempotencyKey: keyHash },
      });
      if (duplicate) return { payment: duplicate, idempotent: true };
    }
    throw error;
  }

  const completedPayment = await completePaymentTransaction({
    transactionId: payment.id,
    tenantId,
    amountMinorUnits: Math.round(amount * 100),
    currency: "SAR",
    providerStatus: "MANUAL_CONFIRMED",
    actorUserId: userId,
  });

  return { payment: completedPayment.payment, idempotent: false };
}
