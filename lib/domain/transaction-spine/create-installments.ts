import { prisma } from "@/lib/prisma";
import { assertTenantOwnership } from "./validate-tenant";
import type { CreateInstallmentsInput } from "./types";

export async function createInstallments(input: CreateInstallmentsInput) {
  const {
    tenantId,
    userId,
    invoiceId,
    count,
    startDate,
    intervalDays = 30,
  } = input;

  if (!Number.isInteger(count) || count < 1 || count > 120) {
    throw new Error("Installment count must be between 1 and 120.");
  }

  await assertTenantOwnership(
    tenantId,
    "invoice",
    invoiceId,
    "Invoice not found in this tenant.",
  );

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, tenantId },
    include: { contract: true, installments: true },
  });
  if (!invoice) throw new Error("Invoice not found.");
  if (invoice.type === "SALE") {
    throw new Error("Sale installments are activated from the contract payment plan.");
  }
  if (!invoice.contract) {
    throw new Error("Invoice must be linked to a contract to create installments.");
  }
  if (invoice.installments.length > 0) {
    throw new Error("Invoice already has installments.");
  }

  const totalMinor = Math.round(Number(invoice.totalAmount) * 100);
  const baseMinor = Math.floor(totalMinor / count);
  const remainder = totalMinor - baseMinor * count;

  return prisma.$transaction(async (tx) => {
    const created = [];
    for (let index = 0; index < count; index += 1) {
      const dueDate = new Date(startDate);
      dueDate.setUTCDate(dueDate.getUTCDate() + index * intervalDays);
      const amountMinor = baseMinor + (index < remainder ? 1 : 0);

      created.push(
        await tx.installment.create({
          data: {
            tenantId,
            contractId: invoice.contract!.id,
            invoiceId,
            installmentNumber: index + 1,
            amountSar: amountMinor / 100,
            dueDate,
            paymentStatus: "Pending",
          },
        }),
      );
    }

    await tx.auditLog.create({
      data: {
        tenantId,
        userId: userId || null,
        action: "CREATE_INSTALLMENTS",
        tableName: "installments",
        recordId: invoiceId,
        details: JSON.stringify({ invoiceId, count }),
      },
    });

    return created;
  });
}
