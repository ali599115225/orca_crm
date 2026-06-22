import { prisma } from "@/lib/prisma";
import { assertTenantOwnership } from "./validate-tenant";
import { _createContractInTx } from "./issue-contract";
import { calculateVat } from "@/lib/vat/engine";
import type { AcceptOfferInput } from "./types";

type Tx = any;

async function ensureSaleFinancialsInTx(
  tx: Tx,
  input: {
    tenantId: string;
    userId: string;
    offerId: string;
    offerPrice: number;
    contractId: string;
  },
) {
  const { tenantId, userId, offerId, offerPrice, contractId } = input;

  const existingSaleInvoices = await tx.invoice.findMany({
    where: {
      tenantId,
      contractId,
      type: "SALE",
    },
    orderBy: { createdAt: "asc" },
  });

  if (existingSaleInvoices.length > 1) {
    throw new Error("Contract has more than one SALE invoice.");
  }

  let invoice = existingSaleInvoices[0] || null;
  let invoiceCreated = false;
  let installmentCreated = false;
  let installmentLinked = false;

  if (!invoice) {
    const vat = calculateVat(offerPrice, "STANDARD");
    const tenantCounter = await tx.tenant.update({
      where: { id: tenantId },
      data: { nextInvoiceNumber: { increment: 1 } },
      select: {
        nextInvoiceNumber: true,
        invoicePrefix: true,
      },
    });

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    invoice = await tx.invoice.create({
      data: {
        tenantId,
        type: "SALE",
        contractId,
        invoiceNumber: tenantCounter.nextInvoiceNumber - 1,
        invoicePrefix: tenantCounter.invoicePrefix,
        issueDate: new Date(),
        dueDate,
        subtotal: offerPrice,
        vatRate: 15,
        vatAmount: vat.vatAmount,
        totalAmount: vat.totalAmount,
        status: "unpaid",
      },
    });
    invoiceCreated = true;
  }

  const contractInstallments = await tx.installment.findMany({
    where: {
      tenantId,
      contractId,
    },
    orderBy: { installmentNumber: "asc" },
  });

  let invoiceInstallments = contractInstallments.filter(
    (item: any) => item.invoiceId === invoice.id,
  );

  if (contractInstallments.length === 0) {
    const installment = await tx.installment.create({
      data: {
        tenantId,
        contractId,
        invoiceId: invoice.id,
        installmentNumber: 1,
        amountSar: Number(invoice.totalAmount),
        dueDate: invoice.dueDate,
        paymentStatus: "Pending",
      },
    });

    invoiceInstallments = [installment];
    installmentCreated = true;
  } else if (invoiceInstallments.length === 0) {
    const unlinkedInstallments = contractInstallments.filter(
      (item: any) => item.invoiceId === null,
    );

    if (
      contractInstallments.length === 1 &&
      unlinkedInstallments.length === 1
    ) {
      const installment = await tx.installment.update({
        where: { id: unlinkedInstallments[0].id },
        data: { invoiceId: invoice.id },
      });

      invoiceInstallments = [installment];
      installmentLinked = true;
    } else {
      throw new Error(
        "Contract installments cannot be linked to the SALE invoice safely.",
      );
    }
  }

  if (invoiceCreated || installmentCreated || installmentLinked) {
    await tx.auditLog.create({
      data: {
        tenantId,
        userId,
        action: "REPAIR_SALE_FINANCIAL_SPINE",
        tableName: "contracts",
        recordId: contractId,
        details: JSON.stringify({
          offerId,
          contractId,
          invoiceId: invoice.id,
          invoiceCreated,
          installmentCreated,
          installmentLinked,
        }),
      },
    });
  }

  return {
    invoice,
    installments: invoiceInstallments,
    invoiceCreated,
    installmentCreated,
    installmentLinked,
  };
}

export async function acceptOfferAndCreateContract(input: AcceptOfferInput) {
  const { tenantId, userId, offerId } = input;

  await assertTenantOwnership(
    tenantId,
    "offer",
    offerId,
    "Offer not found in this tenant.",
  );

  const offer = await prisma.offer.findFirst({
    where: { id: offerId, tenantId },
    include: { opportunity: true },
  });

  if (!offer) throw new Error("Offer not found.");
  if (!["PENDING", "ACCEPTED"].includes(offer.status)) {
    throw new Error("Offer is not in PENDING or ACCEPTED status.");
  }
  if (offer.status === "PENDING" && offer.validUntil < new Date()) {
    throw new Error("Offer has expired.");
  }
  if (!offer.unitId) {
    throw new Error("لا يمكن قبول هذا العرض: لم يتم ربط وحدة عقارية به.");
  }

  await assertTenantOwnership(
    tenantId,
    "unit",
    offer.unitId,
    "Unit not found in this tenant.",
  );

  const opportunity = offer.opportunity;
  if (!opportunity) throw new Error("Opportunity not linked to this offer.");

  await assertTenantOwnership(
    tenantId,
    "lead",
    opportunity.leadId,
    "Lead not found in this tenant.",
  );

  const lead = await prisma.lead.findFirst({
    where: { id: opportunity.leadId, tenantId },
  });
  if (!lead) throw new Error("Lead not found.");

  const result = await prisma.$transaction(async (tx) => {
    let contract = await tx.contract.findUnique({
      where: { offerId: offer.id },
    });
    let contractCreated = false;

    if (!contract) {
      const unitContract = await tx.contract.findUnique({
        where: { unitId: offer.unitId! },
      });

      if (unitContract) {
        throw new Error(
          "Unit already has a contract that is not linked to this offer.",
        );
      }

      const buyerName = `${lead.firstName} ${lead.lastName || ""}`.trim();

      contract = await _createContractInTx(tx, {
        tenantId,
        userId,
        unitId: offer.unitId!,
        leadId: lead.id,
        offerId: offer.id,
        buyerName,
        buyerPhone: lead.phone,
        totalVolumeSar: Number(offer.price),
      });

      contractCreated = true;
    }

    if (!contract) {
      throw new Error("Contract could not be created or resolved.");
    }

    const updatedOffer =
      offer.status === "ACCEPTED"
        ? offer
        : await tx.offer.update({
            where: { id: offerId },
            data: {
              status: "ACCEPTED",
              updatedBy: userId,
              auditLog: `${offer.auditLog || ""}\nOffer accepted at ${new Date().toISOString()}`.trim(),
            },
          });

    if (opportunity.status !== "WON") {
      await tx.opportunity.update({
        where: { id: opportunity.id },
        data: { status: "WON" },
      });
    }

    const financials = await ensureSaleFinancialsInTx(tx, {
      tenantId,
      userId,
      offerId: offer.id,
      offerPrice: Number(offer.price),
      contractId: contract.id,
    });

    return {
      contract,
      offer: updatedOffer,
      invoice: financials.invoice,
      installments: financials.installments,
      contractCreated,
      invoiceCreated: financials.invoiceCreated,
      installmentCreated: financials.installmentCreated,
      installmentLinked: financials.installmentLinked,
    };
  });

  return result;
}
