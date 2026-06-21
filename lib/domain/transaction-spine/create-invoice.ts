import { prisma } from "@/lib/prisma";
import { assertTenantOwnership } from "./validate-tenant";
import { calculateVat } from "@/lib/vat/engine";
import type { CreateInvoiceInput } from "./types";

export async function createInvoice(input: CreateInvoiceInput) {
  const { tenantId, userId, type, contractId, leaseId, subtotal, vatRate = 15, vatType = "STANDARD", dueDate } = input;

  if (!contractId && !leaseId) throw new Error("Invoice must be linked to a contract or a lease.");
  if (contractId && leaseId) throw new Error("Invoice cannot be linked to both a contract and a lease.");
  if (subtotal <= 0) throw new Error("Subtotal must be positive.");

  if (contractId) await assertTenantOwnership(tenantId, "contract", contractId, "Contract not found in this tenant.");
  if (leaseId) {
    const lease = await prisma.rentalLease.findFirst({ where: { id: leaseId, tenantId } });
    if (!lease) throw new Error("Lease not found in this tenant.");
  }

  const vat = calculateVat(subtotal, vatType);

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new Error("Tenant not found.");

  const invoiceNumber = tenant.nextInvoiceNumber;

  const invoice = await prisma.$transaction(async (tx) => {
    await tx.tenant.update({
      where: { id: tenantId },
      data: { nextInvoiceNumber: { increment: 1 } },
    });

    const created = await tx.invoice.create({
      data: {
        tenantId,
        type,
        contractId: contractId || null,
        leaseId: leaseId || null,
        invoiceNumber,
        invoicePrefix: tenant.invoicePrefix,
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
        action: "CREATE_INVOICE",
        tableName: "invoices",
        recordId: created.id,
        details: JSON.stringify({ type, contractId, leaseId, subtotal, totalAmount: vat.totalAmount }),
      },
    });

    return created;
  });

  return invoice;
}
