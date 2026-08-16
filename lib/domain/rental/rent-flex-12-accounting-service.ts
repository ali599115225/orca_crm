import "server-only";

import { Prisma } from "@prisma/client";
import {
  findAccountByCode,
  postInvoiceEntry,
  seedChartOfAccounts,
} from "@/lib/accounting";
import { prisma } from "@/lib/prisma";
import { requireTenantContext } from "@/lib/tenant-context";
import {
  assertRentFlexCommandContext,
  dateOnlyString,
  parseRentFlexDateOnly,
} from "./rent-flex-12-persistence-contract";
import {
  buildRentFlexDirectInvoiceDrafts,
  RentFlexP4Error,
  type RentFlexDirectInvoiceDraft,
} from "./rent-flex-12-accounting-contract";

const DIRECT_MODE = "DIRECT_MONTHLY_EJAR";
const LOCKED_STATUS = "LOCKED";
const DIRECT_INVOICE_COUNT = 12;

export type RentFlexLeaseAccountingGuard = Readonly<{
  selectionId: string;
  mode: string;
  status: string;
}>;

export async function findRentFlexLeaseAccountingGuard(
  tenantId: string,
  rentalLeaseId: string,
): Promise<RentFlexLeaseAccountingGuard | null> {
  // Legacy accounting must remain usable before the additive Rent Flex schema is
  // operational. Once that schema is acknowledged, any attached selection blocks
  // the one-shot legacy settlement path regardless of mode or selection status.
  if (process.env.ORCA_RENT_FLEX_12_SCHEMA_READY !== "true") return null;

  const selection = await prisma.rentFlexSelection.findFirst({
    where: { tenantId, rentalLeaseId },
    select: { id: true, mode: true, status: true },
  });
  if (!selection) return null;
  return {
    selectionId: selection.id,
    mode: selection.mode,
    status: selection.status,
  };
}

function moneyEquals(left: unknown, right: number): boolean {
  const value = Number(left);
  return Number.isFinite(value) && value.toFixed(2) === right.toFixed(2);
}

function prismaErrorCode(error: unknown): string | null {
  return error &&
    typeof error === "object" &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
    ? (error as { code: string }).code
    : null;
}

async function readCompleteActivation(
  tx: Prisma.TransactionClient,
  input: {
    tenantId: string;
    selectionId: string;
    rentalLeaseId: string;
    scheduleDigest: string;
    drafts: RentFlexDirectInvoiceDraft[];
  },
) {
  const links = await tx.rentFlexDirectInvoiceLink.findMany({
    where: {
      tenantId: input.tenantId,
      rentFlexSelectionId: input.selectionId,
    },
    orderBy: { installmentNumber: "asc" },
    select: {
      invoiceId: true,
      rentalLeaseId: true,
      installmentNumber: true,
      dueDate: true,
      subtotal: true,
      scheduleDigest: true,
    },
  });

  if (links.length === 0) return null;
  if (links.length !== input.drafts.length || links.length !== DIRECT_INVOICE_COUNT) {
    throw new RentFlexP4Error("RENT_FLEX_P4_ACTIVATION_INCOMPLETE_CONFLICT");
  }

  const invoices = await tx.invoice.findMany({
    where: {
      tenantId: input.tenantId,
      id: { in: links.map((link) => link.invoiceId) },
    },
    select: {
      id: true,
      leaseId: true,
      type: true,
      invoiceNumber: true,
      invoicePrefix: true,
      dueDate: true,
      subtotal: true,
      vatRate: true,
      vatAmount: true,
      totalAmount: true,
    },
  });
  if (invoices.length !== DIRECT_INVOICE_COUNT) {
    throw new RentFlexP4Error("RENT_FLEX_P4_ACTIVATION_INVOICE_CONFLICT");
  }
  const invoiceById = new Map(invoices.map((invoice) => [invoice.id, invoice]));

  const normalizedInvoices = input.drafts.map((draft, index) => {
    const link = links[index];
    const invoice = invoiceById.get(link.invoiceId);
    if (
      !invoice ||
      link.installmentNumber !== draft.installmentNumber ||
      link.rentalLeaseId !== input.rentalLeaseId ||
      dateOnlyString(link.dueDate) !== draft.dueDate ||
      !moneyEquals(link.subtotal, draft.subtotal) ||
      link.scheduleDigest !== input.scheduleDigest ||
      invoice.leaseId !== input.rentalLeaseId ||
      String(invoice.type) !== "RENTAL" ||
      dateOnlyString(invoice.dueDate) !== draft.dueDate ||
      !moneyEquals(invoice.subtotal, draft.subtotal) ||
      !moneyEquals(invoice.vatRate, draft.vatRate) ||
      !moneyEquals(invoice.vatAmount, draft.vatAmount) ||
      !moneyEquals(invoice.totalAmount, draft.totalAmount)
    ) {
      throw new RentFlexP4Error("RENT_FLEX_P4_ACTIVATION_INVOICE_CONFLICT");
    }
    return {
      installmentNumber: draft.installmentNumber,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      invoicePrefix: invoice.invoicePrefix,
      dueDate: draft.dueDate,
      subtotal: draft.subtotal,
      vatAmount: draft.vatAmount,
      totalAmount: draft.totalAmount,
    };
  });

  return normalizedInvoices;
}

async function readActivationState(
  tx: Prisma.TransactionClient,
  tenantId: string,
  selectionId: string,
) {
  const selection = await tx.rentFlexSelection.findFirst({
    where: { id: selectionId, tenantId },
    select: {
      id: true,
      unitId: true,
      rentalLeaseId: true,
      financeCaseId: true,
      selectedProviderOfferId: true,
      mode: true,
      annualRentAmount: true,
      currency: true,
      firstDueDate: true,
      companyScheduleJson: true,
      scheduleDigest: true,
      status: true,
    },
  });
  if (!selection) {
    throw new RentFlexP4Error("RENT_FLEX_P4_SELECTION_NOT_FOUND_FOR_TENANT");
  }
  if (selection.mode !== DIRECT_MODE) {
    throw new RentFlexP4Error("RENT_FLEX_P4_DIRECT_MODE_REQUIRED");
  }
  if (selection.status !== LOCKED_STATUS) {
    throw new RentFlexP4Error("RENT_FLEX_P4_LOCKED_SELECTION_REQUIRED");
  }
  if (!selection.rentalLeaseId) {
    throw new RentFlexP4Error("RENT_FLEX_P4_RENTAL_LEASE_REQUIRED");
  }
  if (selection.financeCaseId || selection.selectedProviderOfferId) {
    throw new RentFlexP4Error("RENT_FLEX_P4_DIRECT_SELECTION_SHAPE_INVALID");
  }

  const lease = await tx.rentalLease.findFirst({
    where: { id: selection.rentalLeaseId, tenantId },
    select: {
      id: true,
      unitId: true,
      currency: true,
      vatRate: true,
    },
  });
  if (!lease) {
    throw new RentFlexP4Error("RENT_FLEX_P4_LEASE_NOT_FOUND_FOR_TENANT");
  }
  if (lease.unitId && lease.unitId !== selection.unitId) {
    throw new RentFlexP4Error("RENT_FLEX_P4_LEASE_UNIT_MISMATCH");
  }
  if (selection.currency !== "SAR" || lease.currency !== selection.currency) {
    throw new RentFlexP4Error("RENT_FLEX_P4_LEASE_CURRENCY_MISMATCH");
  }

  const firstDueDate = dateOnlyString(selection.firstDueDate);
  const drafts = buildRentFlexDirectInvoiceDrafts({
    mode: selection.mode,
    status: selection.status,
    annualRentAmount: Number(selection.annualRentAmount),
    firstDueDate,
    companyScheduleJson: selection.companyScheduleJson,
    scheduleDigest: selection.scheduleDigest,
    vatRate: Number(lease.vatRate),
  });
  if (drafts.length !== DIRECT_INVOICE_COUNT || !selection.scheduleDigest) {
    throw new RentFlexP4Error("RENT_FLEX_P4_DIRECT_SCHEDULE_REQUIRED");
  }

  const existingInvoices = await readCompleteActivation(tx, {
    tenantId,
    selectionId: selection.id,
    rentalLeaseId: lease.id,
    scheduleDigest: selection.scheduleDigest,
    drafts,
  });

  return {
    selection,
    lease,
    drafts,
    scheduleDigest: selection.scheduleDigest,
    existingInvoices,
  };
}

async function readCurrentActivation(tenantId: string, selectionId: string) {
  return await prisma.$transaction(
    async (tx) => await readActivationState(tx, tenantId, selectionId),
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function activateRentFlexDirectInvoices(input: {
  tenantId: string;
  selectionId: string;
  actorId: string;
}) {
  assertRentFlexCommandContext(
    requireTenantContext(),
    input.tenantId,
    input.actorId,
  );

  const preflight = await readCurrentActivation(input.tenantId, input.selectionId);
  if (preflight.existingInvoices) {
    return {
      idempotent: true,
      selectionId: preflight.selection.id,
      rentalLeaseId: preflight.lease.id,
      scheduleDigest: preflight.scheduleDigest,
      invoiceCount: preflight.existingInvoices.length,
      invoices: preflight.existingInvoices,
    };
  }

  await seedChartOfAccounts(input.tenantId);
  const needsVatAccount = preflight.drafts.some((draft) => draft.vatAmount > 0);
  const [receivableAccount, revenueAccount, vatPayableAccount] = await Promise.all([
    findAccountByCode(input.tenantId, "1.1.3"),
    findAccountByCode(input.tenantId, "4.1"),
    needsVatAccount
      ? findAccountByCode(input.tenantId, "2.1.1")
      : Promise.resolve(null),
  ]);
  if (
    !receivableAccount ||
    !revenueAccount ||
    (needsVatAccount && !vatPayableAccount)
  ) {
    throw new RentFlexP4Error("RENT_FLEX_P4_ACCOUNTING_ACCOUNTS_MISSING");
  }

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const state = await readActivationState(
            tx,
            input.tenantId,
            input.selectionId,
          );
          if (state.existingInvoices) {
            return {
              idempotent: true,
              selectionId: state.selection.id,
              rentalLeaseId: state.lease.id,
              scheduleDigest: state.scheduleDigest,
              invoiceCount: state.existingInvoices.length,
              invoices: state.existingInvoices,
            };
          }

          const tenant = await tx.tenant.update({
            where: { id: input.tenantId },
            data: { nextInvoiceNumber: { increment: DIRECT_INVOICE_COUNT } },
            select: { nextInvoiceNumber: true, invoicePrefix: true },
          });
          const firstInvoiceNumber =
            tenant.nextInvoiceNumber - DIRECT_INVOICE_COUNT;
          const createdInvoices = [];

          for (const draft of state.drafts) {
            const invoiceNumber = firstInvoiceNumber + draft.installmentNumber - 1;
            const invoice = await tx.invoice.create({
              data: {
                tenantId: input.tenantId,
                leaseId: state.lease.id,
                invoiceNumber,
                invoicePrefix: tenant.invoicePrefix || "INV",
                dueDate: parseRentFlexDateOnly(draft.dueDate),
                subtotal: draft.subtotal,
                vatRate: draft.vatRate,
                vatAmount: draft.vatAmount,
                totalAmount: draft.totalAmount,
                status: "unpaid",
              },
            });

            await postInvoiceEntry(
              input.tenantId,
              invoice.id,
              draft.subtotal,
              draft.vatAmount,
              draft.totalAmount,
              receivableAccount.id,
              revenueAccount.id,
              vatPayableAccount?.id ?? "",
              tx,
            );

            await tx.rentFlexDirectInvoiceLink.create({
              data: {
                tenantId: input.tenantId,
                rentFlexSelectionId: state.selection.id,
                rentalLeaseId: state.lease.id,
                invoiceId: invoice.id,
                installmentNumber: draft.installmentNumber,
                dueDate: parseRentFlexDateOnly(draft.dueDate),
                subtotal: draft.subtotal,
                scheduleDigest: state.scheduleDigest,
                createdBy: input.actorId,
              },
            });

            createdInvoices.push({
              installmentNumber: draft.installmentNumber,
              invoiceId: invoice.id,
              invoiceNumber: invoice.invoiceNumber,
              invoicePrefix: invoice.invoicePrefix,
              dueDate: draft.dueDate,
              subtotal: draft.subtotal,
              vatAmount: draft.vatAmount,
              totalAmount: draft.totalAmount,
            });
          }

          await tx.auditLog.create({
            data: {
              tenantId: input.tenantId,
              userId: input.actorId,
              action: "RENT_FLEX_DIRECT_SCHEDULE_ACTIVATED",
              tableName: "rent_flex_direct_invoice_links",
              recordId: state.selection.id,
              details: JSON.stringify({
                selectionId: state.selection.id,
                rentalLeaseId: state.lease.id,
                scheduleDigest: state.scheduleDigest,
                invoiceIds: createdInvoices.map((invoice) => invoice.invoiceId),
              }),
            },
          });

          return {
            idempotent: false,
            selectionId: state.selection.id,
            rentalLeaseId: state.lease.id,
            scheduleDigest: state.scheduleDigest,
            invoiceCount: createdInvoices.length,
            invoices: createdInvoices,
          };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error: unknown) {
      const code = prismaErrorCode(error);
      if (code !== "P2002" && code !== "P2034") throw error;

      const replay = await readCurrentActivation(input.tenantId, input.selectionId);
      if (replay.existingInvoices) {
        return {
          idempotent: true,
          selectionId: replay.selection.id,
          rentalLeaseId: replay.lease.id,
          scheduleDigest: replay.scheduleDigest,
          invoiceCount: replay.existingInvoices.length,
          invoices: replay.existingInvoices,
        };
      }
      if (attempt === 1) {
        throw new RentFlexP4Error("RENT_FLEX_P4_ACTIVATION_CONFLICT");
      }
    }
  }

  throw new RentFlexP4Error("RENT_FLEX_P4_ACTIVATION_CONFLICT");
}
