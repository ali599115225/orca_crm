import { prisma } from "@/lib/prisma";
import { assertTenantOwnership } from "./validate-tenant";
import { calculateVat } from "@/lib/vat/engine";
import { signContract } from "./sign-contract";
import type { CreateInvoiceInput } from "./types";

export async function createInvoice(input: CreateInvoiceInput) {
  const {
    tenantId,
    userId,
    type,
    contractId,
    leaseId,
    subtotal,
    vatRate = 15,
    vatType = "STANDARD",
    dueDate,
  } = input;

  if (type === "SALE") {
    if (!contractId) throw new Error("Sale invoice requires a contract.");
    const result = await signContract({ tenantId, userId, contractId });
    return result.invoice;
  }

  if (!leaseId || contractId) {
    throw new Error("Rental invoice must reference one lease and no sale contract.");
  }
  if (!Number.isFinite(subtotal) || subtotal <= 0) {
    throw new Error("Subtotal must be positive.");
  }

  const lease = await prisma.rentalLease.findFirst({
    where: { id: leaseId, tenantId },
  });
  if (!lease) throw new Error("Lease not found in this tenant.");

  const vat = calculateVat(subtotal, vatType);

  return prisma.$transaction(async (tx) => {
    const counter = await tx.tenant.update({
      where: { id: tenantId },
      data: { nextInvoiceNumber: { increment: 1 } },
      select: { nextInvoiceNumber: true, invoicePrefix: true },
    });

    const invoice = await tx.invoice.create({
      data: {
        tenantId,
        type: "RENTAL",
        leaseId,
        contractId: null,
        invoiceNumber: counter.nextInvoiceNumber - 1,
        invoicePrefix: counter.invoicePrefix,
        issueDate: new Date(),
        dueDate,
        subtotal,
        vatRate,
        vatAmount: vat.vatAmount,
        totalAmount: vat.totalAmount,
        status: "unpaid",
      },
    });

    await tx.auditLog.create({
      data: {
        tenantId,
        userId: userId || null,
        action: "CREATE_RENTAL_INVOICE",
        tableName: "invoices",
        recordId: invoice.id,
        details: JSON.stringify({
          leaseId,
          subtotal,
          totalAmount: vat.totalAmount,
        }),
      },
    });

    return invoice;
  });
}
