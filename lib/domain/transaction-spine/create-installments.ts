import { prisma } from "@/lib/prisma";
import { assertTenantOwnership } from "./validate-tenant";
import type { CreateInstallmentsInput } from "./types";

export async function createInstallments(input: CreateInstallmentsInput) {
  const { tenantId, userId, invoiceId, count, startDate, intervalDays = 30 } = input;

  if (count < 1 || count > 120) throw new Error("Installment count must be between 1 and 120.");

  await assertTenantOwnership(tenantId, "invoice", invoiceId, "Invoice not found in this tenant.");

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, tenantId },
    include: { contract: true },
  });

  if (!invoice) throw new Error("Invoice not found.");
  if (!invoice.contract) throw new Error("Invoice must be linked to a contract to create installments.");

  const contract = invoice.contract;
  const totalAmount = Number(invoice.totalAmount);
  const installmentAmount = Math.floor((totalAmount / count) * 100) / 100;
  const lastInstallmentAmount = totalAmount - installmentAmount * (count - 1);

  const contractInstallments = await prisma.installment.findMany({
    where: { contractId: contract.id, tenantId },
    orderBy: { installmentNumber: "asc" },
  });

  const results = await prisma.$transaction(async (tx) => {
    const created = [];

    for (let i = 0; i < count; i++) {
      const dueDate = new Date(startDate);
      dueDate.setDate(dueDate.getDate() + i * intervalDays);

      const amount = i === count - 1 ? lastInstallmentAmount : installmentAmount;

      const installment = await tx.installment.create({
        data: {
          tenantId,
          contractId: contract.id,
          invoiceId,
          installmentNumber: contractInstallments.length + i + 1,
          amountSar: amount,
          dueDate,
          paymentStatus: "Pending",
        },
      });

      created.push(installment);
    }

    await tx.auditLog.create({
      data: {
        tenantId,
        userId: userId || null,
        action: "CREATE_INSTALLMENTS",
        tableName: "installments",
        recordId: invoiceId,
        details: JSON.stringify({ invoiceId, count, totalAmount }),
      },
    });

    return created;
  });

  return results;
}
