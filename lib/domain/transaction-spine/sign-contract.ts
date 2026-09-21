import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  appendDealEventInTx,
  ensureDealCorrelationId,
  resolveDealInTx,
} from "@/lib/domain/deal-passport";
import { calculateVat } from "@/lib/vat/engine";
import {
  findAccountByCode,
  postInvoiceEntry,
  seedChartOfAccounts,
} from "@/lib/accounting";
import { assertTenantOwnership } from "./validate-tenant";
import {
  CONTRACT_STATUS,
  INVOICE_STATUS,
  INSTALLMENT_STATUS,
  OPPORTUNITY_STATUS,
  PAYMENT_PLAN_STATUS,
  UNIT_STATUS,
} from "./constants";
import {
  ensureDefaultPaymentPlanInTx,
  parsePaymentSchedule,
} from "./payment-plan";
import type { SignContractInput } from "./types";

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function amountsMatch(left: unknown, right: unknown): boolean {
  return Math.abs(roundMoney(Number(left)) - roundMoney(Number(right))) <= 0.01;
}

async function ensureSaleInvoiceAndInstallmentsInTx(
  tx: any,
  contract: any,
  paymentPlan: any,
  actorUserId: string,
  accounts: { receivableId: string; revenueId: string; vatPayableId: string },
) {
  const saleInvoices = await tx.invoice.findMany({
    where: {
      tenantId: contract.tenantId,
      contractId: contract.id,
      type: "SALE",
    },
    orderBy: { createdAt: "asc" },
  });

  if (saleInvoices.length > 1) {
    throw new Error("Contract has more than one SALE invoice.");
  }

  const vatType =
    contract.vatType === "ZERO_RATED" || contract.vatType === "EXEMPT"
      ? contract.vatType
      : "STANDARD";
  const vat = calculateVat(Number(contract.totalVolumeSar), vatType);
  const schedule = parsePaymentSchedule(paymentPlan.scheduleJson);
  const scheduleTotal = roundMoney(
    schedule.reduce((sum, item) => sum + item.amountSar, 0),
  );

  if (!amountsMatch(scheduleTotal, vat.totalAmount)) {
    throw new Error("Payment plan total does not match the sale invoice total.");
  }

  let invoice = saleInvoices[0] || null;
  let invoiceCreated = false;

  if (!invoice) {
    const counter = await tx.tenant.update({
      where: { id: contract.tenantId },
      data: { nextInvoiceNumber: { increment: 1 } },
      select: { nextInvoiceNumber: true, invoicePrefix: true },
    });

    const earliestDueDate = schedule.reduce(
      (earliest, item) =>
        item.dueDate < earliest ? item.dueDate : earliest,
      schedule[0].dueDate,
    );

    invoice = await tx.invoice.create({
      data: {
        tenantId: contract.tenantId,
        type: "SALE",
        contractId: contract.id,
        invoiceNumber: counter.nextInvoiceNumber - 1,
        invoicePrefix: counter.invoicePrefix,
        issueDate: new Date(),
        dueDate: earliestDueDate,
        subtotal: Number(contract.totalVolumeSar),
        vatRate: Number(contract.vatRate),
        vatAmount: vat.vatAmount,
        totalAmount: vat.totalAmount,
        status: INVOICE_STATUS.UNPAID,
      },
    });
    invoiceCreated = true;
  } else if (!amountsMatch(invoice.totalAmount, vat.totalAmount)) {
    throw new Error("Existing SALE invoice total differs from the signed contract total.");
  }

  const existingInstallments = await tx.installment.findMany({
    where: { tenantId: contract.tenantId, contractId: contract.id },
    orderBy: { installmentNumber: "asc" },
  });

  let installments = existingInstallments;
  let installmentsCreated = false;
  let installmentsLinked = false;

  if (existingInstallments.length === 0) {
    installments = [];
    for (const item of schedule) {
      const installment = await tx.installment.create({
        data: {
          tenantId: contract.tenantId,
          contractId: contract.id,
          invoiceId: invoice.id,
          paymentPlanId: paymentPlan.id,
          installmentNumber: item.installmentNumber,
          amountSar: item.amountSar,
          dueDate: item.dueDate,
          paymentStatus: INSTALLMENT_STATUS.PENDING,
        },
      });
      installments.push(installment);
    }
    installmentsCreated = true;
  } else {
    const invalidLink = existingInstallments.some(
      (item: any) =>
        (item.invoiceId && item.invoiceId !== invoice.id) ||
        (item.paymentPlanId && item.paymentPlanId !== paymentPlan.id),
    );
    if (invalidLink) {
      throw new Error("Existing installments are linked to another invoice or payment plan.");
    }

    const existingTotal = roundMoney(
      existingInstallments.reduce(
        (sum: number, item: any) => sum + Number(item.amountSar),
        0,
      ),
    );
    if (!amountsMatch(existingTotal, invoice.totalAmount)) {
      throw new Error("Existing installment total differs from the SALE invoice total.");
    }

    const unlinkedIds = existingInstallments
      .filter((item: any) => !item.invoiceId || !item.paymentPlanId)
      .map((item: any) => item.id);
    if (unlinkedIds.length > 0) {
      await tx.installment.updateMany({
        where: {
          id: { in: unlinkedIds },
          tenantId: contract.tenantId,
          contractId: contract.id,
        },
        data: { invoiceId: invoice.id, paymentPlanId: paymentPlan.id },
      });
      installments = await tx.installment.findMany({
        where: { tenantId: contract.tenantId, contractId: contract.id },
        orderBy: { installmentNumber: "asc" },
      });
      installmentsLinked = true;
    }
  }

  const existingInvoiceEntry = await tx.journalEntry.findFirst({
    where: {
      tenantId: contract.tenantId,
      source: "INVOICE",
      sourceId: invoice.id,
      status: "POSTED",
    },
    select: { id: true },
  });

  let journalEntryCreated = false;

  if (!existingInvoiceEntry) {
    await postInvoiceEntry(
      contract.tenantId,
      invoice.id,
      Number(invoice.subtotal),
      Number(invoice.vatAmount),
      Number(invoice.totalAmount),
      accounts.receivableId,
      accounts.revenueId,
      accounts.vatPayableId,
      tx,
    );
    journalEntryCreated = true;
  }

  const paymentPlanActivated = paymentPlan.status !== PAYMENT_PLAN_STATUS.ACTIVE;

  await tx.paymentPlan.updateMany({
    where: { id: paymentPlan.id, tenantId: contract.tenantId },
    data: {
      status: PAYMENT_PLAN_STATUS.ACTIVE,
      activatedAt: paymentPlan.activatedAt || new Date(),
      installmentCount: installments.length,
    },
  });

  if (invoiceCreated || installmentsCreated || installmentsLinked) {
    await tx.auditLog.create({
      data: {
        tenantId: contract.tenantId,
        userId: actorUserId,
        action: "ACTIVATE_SALE_FINANCIALS",
        tableName: "contracts",
        recordId: contract.id,
        details: JSON.stringify({
          contractId: contract.id,
          invoiceId: invoice.id,
          paymentPlanId: paymentPlan.id,
          invoiceCreated,
          installmentsCreated,
          installmentsLinked,
          installmentCount: installments.length,
        }),
      },
    });
  }

  return {
    invoice,
    installments,
    invoiceCreated,
    installmentsCreated,
    installmentsLinked,
    journalEntryCreated,
    paymentPlanActivated,
  };
}

export async function signContract(input: SignContractInput) {
  const {
    tenantId,
    userId,
    contractId,
    actorId,
    correlationId: requestedCorrelationId,
  } = input;
  const eventActorId = actorId || userId;
  const correlationId = ensureDealCorrelationId(
    requestedCorrelationId,
    "deal",
  );
  if (!userId) throw new Error("Authenticated user is required.");

  await assertTenantOwnership(
    tenantId,
    "contract",
    contractId,
    "Contract not found in this tenant.",
  );

  const signedAt = input.signedAt || new Date();
  if (Number.isNaN(signedAt.getTime()) || signedAt.getTime() > Date.now() + 300_000) {
    throw new Error("Contract signing date is invalid.");
  }

  const cutoverContract = await prisma.contract.findFirst({
    where: { id: contractId, tenantId },
    select: { spineVersion: true, legacyFinancial: true },
  });
  if (!cutoverContract) throw new Error("Contract not found.");
  if (cutoverContract.legacyFinancial || cutoverContract.spineVersion < 2) {
    throw new Error("Legacy contract is read-only and cannot be signed through the Phase 1 cutover flow.");
  }

  await seedChartOfAccounts(tenantId);
  const [receivable, revenue, vatPayable] = await Promise.all([
    findAccountByCode(tenantId, "1.1.3"),
    findAccountByCode(tenantId, "4.2"),
    findAccountByCode(tenantId, "2.1.1"),
  ]);
  if (!receivable || !revenue || !vatPayable) {
    throw new Error("Required accounting accounts are missing.");
  }

  return prisma.$transaction(
    async (tx) => {
      const contract = await tx.contract.findFirst({
        where: { id: contractId, tenantId },
        include: {
          paymentPlan: true,
          offer: { include: { opportunity: true } },
        },
      });
      if (!contract) throw new Error("Contract not found.");

      const alreadySigned =
        contract.status === CONTRACT_STATUS.SIGNED && Boolean(contract.signedAt);

      if (
        !alreadySigned &&
        contract.status !== CONTRACT_STATUS.PENDING_SIGNATURE
      ) {
        throw new Error("Contract is not available for signing.");
      }
      if (
        !alreadySigned &&
        contract.reservationExpiresAt &&
        contract.reservationExpiresAt < new Date()
      ) {
        throw new Error("Contract reservation has expired.");
      }

      const paymentPlan =
        contract.paymentPlan ||
        (await ensureDefaultPaymentPlanInTx(tx, contract));

      const financials = await ensureSaleInvoiceAndInstallmentsInTx(
        tx,
        contract,
        paymentPlan,
        userId,
        {
          receivableId: receivable.id,
          revenueId: revenue.id,
          vatPayableId: vatPayable.id,
        },
      );

      const signedContract = alreadySigned
        ? contract
        : await tx.contract.update({
            where: { id: contract.id },
            data: {
              status: CONTRACT_STATUS.SIGNED,
              signedAt,
              reservationExpiresAt: null,
              version: { increment: 1 },
            },
          });

      await tx.unit.update({
        where: { id: contract.unitId },
        data: { status: UNIT_STATUS.SOLD },
      });

      if (contract.leadId) {
        await tx.lead.update({
          where: { id: contract.leadId },
          data: { status: "CONTRACT_SIGNED", updatedBy: userId },
        });
      }

      if (contract.offer?.opportunity) {
        await tx.opportunity.update({
          where: { id: contract.offer.opportunity.id },
          data: { status: OPPORTUNITY_STATUS.WON, updatedBy: userId },
        });
      }

      const deal = await resolveDealInTx(tx, {
        tenantId,
        opportunityId: contract.offer?.opportunity?.id || null,
        contractId: contract.id,
        actorId: eventActorId,
        correlationId,
      });

      let contractSignedEventId: string | null = null;
      if (deal.passport) {
        const contractSignedEvent = await appendDealEventInTx(tx, {
          tenantId,
          dealId: deal.passport.id,
          eventType: "contract.signed",
          idempotencyKey: `contract.signed:${contract.id}`,
          actorId: eventActorId,
          correlationId,
          causationId: deal.passport.lastEventId || null,
          entityType: "contract",
          entityId: contract.id,
          beforeState: alreadySigned
            ? null
            : {
                status: contract.status,
                signedAt: contract.signedAt?.toISOString() || null,
              },
          afterState: {
            status: CONTRACT_STATUS.SIGNED,
            signedAt: signedContract.signedAt?.toISOString() || signedAt.toISOString(),
          },
          payload: {
            invoiceId: financials.invoice.id,
            paymentPlanId: paymentPlan.id,
          },
          projection: {
            opportunityId: contract.offer?.opportunity?.id || null,
            contractId: contract.id,
            currentOfferId: contract.offerId || null,
            status: "CONTRACT_SIGNED",
          },
        });
        contractSignedEventId = contractSignedEvent.event?.id || null;
      }

      if (deal.passport) {
        await appendDealEventInTx(tx, {
          tenantId,
          dealId: deal.passport.id,
          eventType: "financials.activated",
          idempotencyKey: `financials.activated:${contract.id}`,
          causationId: contractSignedEventId,
          actorId: eventActorId,
          correlationId,
          entityType: "contract",
          entityId: contract.id,
          beforeState: {
            invoiceExists: !financials.invoiceCreated,
            installmentsExist: !financials.installmentsCreated,
            paymentPlanActive: !financials.paymentPlanActivated,
          },
          afterState: {
            invoiceExists: true,
            installmentsExist: true,
            paymentPlanActive: true,
          },
          payload: {
            invoiceId: financials.invoice.id,
            paymentPlanId: paymentPlan.id,
            invoiceCreated: financials.invoiceCreated,
            installmentsCreated: financials.installmentsCreated,
            installmentsLinked: financials.installmentsLinked,
            journalEntryCreated: financials.journalEntryCreated,
            paymentPlanActivated: financials.paymentPlanActivated,
          },
          projection: {
            opportunityId: contract.offer?.opportunity?.id || null,
            contractId: contract.id,
            currentOfferId: contract.offerId || null,
            status: "FINANCIALS_ACTIVE",
          },
        });
      }

      if (!alreadySigned) {
        await tx.auditLog.create({
          data: {
            tenantId,
            userId,
            action: "SIGN_CONTRACT",
            tableName: "contracts",
            recordId: contract.id,
            details: JSON.stringify({
              contractId: contract.id,
              signedAt,
              invoiceId: financials.invoice.id,
              paymentPlanId: paymentPlan.id,
              installmentCount: financials.installments.length,
            }),
          },
        });

        await tx.telemetryEvent
          .create({
            data: {
              tenantId,
              eventType: "contract.signed.financials.activated",
              eventDataJson: JSON.stringify({
                contractId: contract.id,
                invoiceId: financials.invoice.id,
              }),
              createdBy: userId,
            },
          })
          .catch(() => {});
      }

      return {
        contract: signedContract,
        paymentPlan,
        invoice: financials.invoice,
        installments: financials.installments,
        idempotent: alreadySigned,
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}
