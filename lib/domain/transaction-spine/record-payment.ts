import { prisma } from "@/lib/prisma";
import { assertTenantOwnership } from "./validate-tenant";
import {
  postPaymentEntry,
  findAccountByCode,
  seedChartOfAccounts,
} from "@/lib/accounting";
import type { RecordPaymentInput } from "./types";

export async function recordPayment(input: RecordPaymentInput) {
  const { tenantId, userId, invoiceId, installmentId, amount, method, idempotencyKey } = input;

  if (!invoiceId && !installmentId) throw new Error("Payment must reference an invoice or installment.");
  if (amount <= 0) throw new Error("Payment amount must be positive.");
  if (!idempotencyKey) throw new Error("Idempotency key is required.");

  await seedChartOfAccounts(tenantId);

  if (invoiceId) await assertTenantOwnership(tenantId, "invoice", invoiceId, "Invoice not found in this tenant.");
  if (installmentId) await assertTenantOwnership(tenantId, "installment", installmentId, "Installment not found in this tenant.");

  const result = await prisma.$transaction(async (tx) => {
    const idempotencyHash = `${tenantId}:${idempotencyKey}`;

    const existingPayment = await tx.paymentTransaction.findFirst({
      where: {
        tenantId,
        idempotencyKey: idempotencyHash,
        status: "COMPLETED",
      },
    });

    if (existingPayment) {
      return { payment: existingPayment, idempotent: true };
    }

    let invoice = null;
    let installment = null;

    if (invoiceId) {
      invoice = await tx.invoice.findFirst({
        where: { id: invoiceId, tenantId },
      });
      if (!invoice) throw new Error("Invoice not found.");
      if (invoice.status === "paid") throw new Error("Invoice is already fully paid.");
    }

    if (installmentId) {
      installment = await tx.installment.findFirst({
        where: { id: installmentId, tenantId },
      });
      if (!installment) throw new Error("Installment not found.");
      if (installment.paymentStatus === "Paid") throw new Error("Installment is already paid.");

      const installmentAmount = Number(installment.amountSar);
      if (amount > installmentAmount) {
        throw new Error(`Payment amount (${amount}) exceeds installment amount (${installmentAmount}).`);
      }
    }

    if (invoice && !installment) {
      const invoiceTotal = Number(invoice.totalAmount);
      const paidSoFar = await tx.paymentTransaction.findMany({
        where: { invoiceId, tenantId, status: "COMPLETED" },
        select: { netAmount: true },
      });
      const totalPaid = paidSoFar.reduce((sum, p) => sum + Number(p.netAmount), 0);
      const remaining = invoiceTotal - totalPaid;

      if (amount > remaining) {
        throw new Error(`Payment amount (${amount}) exceeds remaining balance (${remaining}).`);
      }
    }

    const payment = await tx.paymentTransaction.create({
      data: {
        tenantId,
        invoiceId: invoiceId || null,
        installmentId: installmentId || null,
        amount,
        fee: 0,
        netAmount: amount,
        currency: "SAR",
        method,
        status: "PENDING",
        provider: "MANUAL",
        idempotencyKey: idempotencyHash,
        paidAt: new Date(),
      },
    });

    const receipt = await tx.receipt.create({
      data: {
        tenantId,
        invoiceId: invoiceId || "",
        amount,
        paymentMethod: method,
        status: "COMPLETED",
      },
    });

    if (invoice) {
      const paidSoFar = await tx.paymentTransaction.findMany({
        where: { invoiceId: invoice.id, tenantId, status: "COMPLETED" },
        select: { netAmount: true },
      });
      const totalPaid = paidSoFar.reduce((sum, p) => sum + Number(p.netAmount), 0) + amount;
      const invoiceTotal = Number(invoice.totalAmount);

      const isFullyPaid = totalPaid >= invoiceTotal;

      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          status: isFullyPaid ? "paid" : "partial",
          paidAt: isFullyPaid ? new Date() : undefined,
          paymentMethod: method,
          paymentRef: receipt.id,
        },
      });
    }

    if (installment) {
      const installmentAmount = Number(installment.amountSar);
      const isFullyPaid = amount >= installmentAmount;

      await tx.installment.update({
        where: { id: installment.id },
        data: {
          paymentStatus: isFullyPaid ? "Paid" : "Partial",
        },
      });
    }

    const cashAccount = await findAccountByCode(tenantId, "1.1.1");
    const receivableAccount = await findAccountByCode(tenantId, "1.1.3");
    if (cashAccount && receivableAccount) {
      await postPaymentEntry(tenantId, receipt.id, amount, cashAccount.id, receivableAccount.id);
    }

    const completedPayment = await tx.paymentTransaction.update({
      where: { id: payment.id },
      data: { status: "COMPLETED" },
    });

    await tx.auditLog.create({
      data: {
        tenantId,
        userId: userId || null,
        action: "RECORD_PAYMENT",
        tableName: "payment_transactions",
        recordId: completedPayment.id,
        details: JSON.stringify({ invoiceId, installmentId, amount, method, idempotencyKey }),
      },
    });

    await tx.telemetryEvent.create({
      data: {
        tenantId,
        eventType: "payment.recorded",
        eventDataJson: JSON.stringify({ paymentId: completedPayment.id, invoiceId, installmentId, amount }),
        createdBy: userId,
      },
    }).catch(() => {});

    return { payment: completedPayment, idempotent: false };
  });

  return result;
}
