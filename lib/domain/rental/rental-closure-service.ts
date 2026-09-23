import "server-only";

import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { completePaymentTransaction } from "@/lib/domain/transaction-spine";
import {
  RENTAL_AUDIT_ACTION,
  RENTAL_LEASE_STATUS,
  evaluateRentalClosureGate,
  moneyToMinor,
  minorToMoney,
  normalizeDepositSettlement,
  type RentalClosureFacts,
  type RentalClosureGateResult,
  type RentalFinancialMode,
  type RentalTerminalReason,
} from "./rental-closure-contract";

const PAYMENT_OPEN_STATUSES = ["PENDING", "PROCESSING", "REVIEW_REQUIRED"] as const;
const RF12_DIRECT = "DIRECT_MONTHLY_EJAR";
const RF12_EXTERNAL = "EXTERNAL_RNPL_12";
const RF12_LOCKED = "LOCKED";
const RF12_EXTERNAL_SETTLED = "RECEIVED";

type RentalClosureDb = Pick<
  typeof prisma,
  | "rentalLease"
  | "auditLog"
  | "rentFlexSelection"
  | "rentFlexDirectInvoiceLink"
  | "invoice"
  | "rentFlexSettlement"
  | "unit"
>;

export class RentalClosureError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: 400 | 404 | 409 = 409,
  ) {
    super(code);
    this.name = "RentalClosureError";
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function parseAuditDetails(details: string | null): Record<string, unknown> {
  if (!details) return {};
  try {
    return asRecord(JSON.parse(details));
  } catch {
    return {};
  }
}

function dateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function parseDateOnly(value: string, code: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new RentalClosureError(code, 400);
  const parsed = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
  );
  if (
    parsed.getUTCFullYear() !== Number(match[1]) ||
    parsed.getUTCMonth() !== Number(match[2]) - 1 ||
    parsed.getUTCDate() !== Number(match[3])
  ) {
    throw new RentalClosureError(code, 400);
  }
  return parsed;
}

function normalizedMoney(value: number, code: string, allowZero = false): number {
  if (
    !Number.isFinite(value) ||
    (allowZero ? value < 0 : value <= 0) ||
    value > 1_000_000_000
  ) {
    throw new RentalClosureError(code, 400);
  }
  return minorToMoney(moneyToMinor(value));
}

function requiredText(value: string | null | undefined, code: string): string {
  const normalized = String(value ?? "").trim();
  if (!normalized) throw new RentalClosureError(code, 400);
  return normalized;
}

function providerIdempotencyKey(
  tenantId: string,
  invoiceId: string,
  providerReference: string,
): string {
  return createHash("sha256")
    .update(`EJAR:${tenantId}:${invoiceId}:${providerReference}`)
    .digest("hex");
}

async function leaseOrThrow(
  db: RentalClosureDb,
  tenantId: string,
  leaseId: string,
) {
  const lease = await db.rentalLease.findFirst({
    where: { id: leaseId, tenantId },
  });
  if (!lease) {
    throw new RentalClosureError("RENTAL_LEASE_NOT_FOUND", 404);
  }
  return lease;
}

async function audit(
  db: RentalClosureDb,
  input: {
    tenantId: string;
    actorId: string;
    action: string;
    leaseId: string;
    details: Record<string, unknown>;
  },
) {
  return await db.auditLog.create({
    data: {
      tenantId: input.tenantId,
      userId: input.actorId,
      action: input.action,
      tableName: "rental_leases",
      recordId: input.leaseId,
      details: JSON.stringify(input.details),
    },
  });
}

async function lifecycleAuditLogs(
  db: RentalClosureDb,
  tenantId: string,
  leaseId: string,
) {
  return await db.auditLog.findMany({
    where: {
      tenantId,
      tableName: "rental_leases",
      recordId: leaseId,
      action: {
        in: [
          RENTAL_AUDIT_ACTION.EJAR_RECONCILED,
          RENTAL_AUDIT_ACTION.DEPOSIT_SETTLED,
          RENTAL_AUDIT_ACTION.DEPOSIT_CARRIED_FORWARD,
          RENTAL_AUDIT_ACTION.HANDOVER_LINKED,
          RENTAL_AUDIT_ACTION.TERMINATED,
          RENTAL_AUDIT_ACTION.RENEWED,
          RENTAL_AUDIT_ACTION.FINANCIALLY_CLOSED,
          RENTAL_AUDIT_ACTION.CLOSED,
        ],
      },
    },
    orderBy: { createdAt: "asc" },
    select: {
      action: true,
      details: true,
      createdAt: true,
    },
  });
}

function terminalReasonFromState(input: {
  status: string;
  endDate: Date;
  now: Date;
  logs: Array<{ action: string; details: string | null }>;
}): RentalTerminalReason | null {
  const normalized = input.status.toLowerCase();
  if (normalized === RENTAL_LEASE_STATUS.RENEWED) return "RENEWED";
  if (normalized === RENTAL_LEASE_STATUS.TERMINATED) return "TERMINATED";

  const closeLog = [...input.logs]
    .reverse()
    .find((item) => item.action === RENTAL_AUDIT_ACTION.CLOSED);
  if (closeLog) {
    const reason = parseAuditDetails(closeLog.details).terminalReason;
    if (reason === "EXPIRED" || reason === "TERMINATED" || reason === "RENEWED") {
      return reason;
    }
  }

  const renewed = input.logs.some(
    (item) => item.action === RENTAL_AUDIT_ACTION.RENEWED,
  );
  if (renewed) return "RENEWED";

  const terminated = input.logs.some(
    (item) => item.action === RENTAL_AUDIT_ACTION.TERMINATED,
  );
  if (terminated) return "TERMINATED";

  if (normalized === "expired" || dateOnly(input.endDate) < dateOnly(input.now)) {
    return "EXPIRED";
  }

  return null;
}

async function rentFlexState(
  db: RentalClosureDb,
  tenantId: string,
  leaseId: string,
): Promise<{
  financialMode: RentalFinancialMode;
  directInvoiceCoverageSatisfied: boolean;
  externalSettlementSatisfied: boolean;
}> {
  if (process.env.ORCA_RENT_FLEX_12_SCHEMA_READY !== "true") {
    return {
      financialMode: "LEGACY",
      directInvoiceCoverageSatisfied: true,
      externalSettlementSatisfied: true,
    };
  }

  const selection = await db.rentFlexSelection.findFirst({
    where: { tenantId, rentalLeaseId: leaseId },
    select: {
      id: true,
      mode: true,
      status: true,
    },
  });

  if (!selection) {
    return {
      financialMode: "LEGACY",
      directInvoiceCoverageSatisfied: true,
      externalSettlementSatisfied: true,
    };
  }

  if (selection.status !== RF12_LOCKED) {
    return {
      financialMode:
        selection.mode === RF12_EXTERNAL ? RF12_EXTERNAL : RF12_DIRECT,
      directInvoiceCoverageSatisfied: false,
      externalSettlementSatisfied: false,
    };
  }

  if (selection.mode === RF12_DIRECT) {
    const links = await db.rentFlexDirectInvoiceLink.findMany({
      where: {
        tenantId,
        rentFlexSelectionId: selection.id,
        rentalLeaseId: leaseId,
      },
      select: {
        invoiceId: true,
        installmentNumber: true,
      },
      orderBy: { installmentNumber: "asc" },
    });
    const installmentNumbers = links.map((item) => item.installmentNumber);
    const uniqueInvoiceIds = [...new Set(links.map((item) => item.invoiceId))];
    const matchingInvoiceCount =
      uniqueInvoiceIds.length === 12
        ? await db.invoice.count({
            where: {
              tenantId,
              leaseId,
              type: "RENTAL",
              id: { in: uniqueInvoiceIds },
            },
          })
        : 0;
    const directInvoiceCoverageSatisfied =
      links.length === 12 &&
      uniqueInvoiceIds.length === 12 &&
      matchingInvoiceCount === 12 &&
      installmentNumbers.every((value, index) => value === index + 1);

    return {
      financialMode: RF12_DIRECT,
      directInvoiceCoverageSatisfied,
      externalSettlementSatisfied: true,
    };
  }

  if (selection.mode === RF12_EXTERNAL) {
    const settlement = await db.rentFlexSettlement.findFirst({
      where: {
        tenantId,
        rentFlexSelectionId: selection.id,
        rentalLeaseId: leaseId,
      },
      select: {
        status: true,
        expectedAmount: true,
        receivedAmount: true,
        providerReference: true,
        evidenceJson: true,
      },
    });
    const externalSettlementSatisfied =
      settlement?.status === RF12_EXTERNAL_SETTLED &&
      settlement.receivedAmount !== null &&
      moneyToMinor(Number(settlement.receivedAmount)) ===
        moneyToMinor(Number(settlement.expectedAmount)) &&
      Boolean(settlement.providerReference || settlement.evidenceJson);

    return {
      financialMode: RF12_EXTERNAL,
      directInvoiceCoverageSatisfied: true,
      externalSettlementSatisfied,
    };
  }

  throw new RentalClosureError("RENTAL_RF12_MODE_UNKNOWN", 409);
}

function ejarEvidenceByInvoice(
  invoices: Array<{
    id: string;
    totalAmount: Prisma.Decimal;
    paymentTransactions: Array<{
      provider: string;
      status: string;
      netAmount: Prisma.Decimal;
    }>;
  }>,
  logs: Array<{ action: string; details: string | null }>,
): Map<string, number> {
  const reconciled = new Map<string, number>();

  for (const invoice of invoices) {
    const transactionMinor = invoice.paymentTransactions
      .filter(
        (payment) =>
          payment.status === "COMPLETED" &&
          payment.provider.toUpperCase() === "EJAR",
      )
      .reduce(
        (total, payment) => total + moneyToMinor(Number(payment.netAmount)),
        0,
      );
    reconciled.set(invoice.id, transactionMinor);
  }

  for (const item of logs) {
    if (item.action !== RENTAL_AUDIT_ACTION.EJAR_RECONCILED) continue;
    const details = parseAuditDetails(item.details);
    if (details.appliedPayment === true) {
      // The completed EJAR PaymentTransaction above is the financial/evidence
      // source for applied payments. Do not double count its audit record.
      continue;
    }
    const invoiceId =
      typeof details.invoiceId === "string" ? details.invoiceId : "";
    const amountMinor =
      typeof details.amountMinor === "number" &&
      Number.isSafeInteger(details.amountMinor)
        ? details.amountMinor
        : 0;
    if (!invoiceId || amountMinor <= 0) continue;
    reconciled.set(invoiceId, (reconciled.get(invoiceId) ?? 0) + amountMinor);
  }

  return reconciled;
}

async function buildRentalClosureSnapshotInDb(
  db: RentalClosureDb,
  tenantId: string,
  leaseId: string,
  now: Date,
): Promise<{
  lease: {
    id: string;
    status: string;
    startDate: Date;
    endDate: Date;
    deposit: Prisma.Decimal;
    unitId: string | null;
    rentAmount: Prisma.Decimal;
  };
  gate: RentalClosureGateResult;
  summary: {
    invoiceTotal: number;
    paid: number;
    outstanding: number;
    pendingPaymentCount: number;
    ejarReconciledInvoiceCount: number;
    invoiceCount: number;
  };
}> {
  const lease = await db.rentalLease.findFirst({
    where: { id: leaseId, tenantId },
    select: {
      id: true,
      status: true,
      startDate: true,
      endDate: true,
      deposit: true,
      unitId: true,
      rentAmount: true,
      invoices: {
        select: {
          id: true,
          totalAmount: true,
          paymentTransactions: {
            select: {
              provider: true,
              status: true,
              netAmount: true,
            },
          },
        },
      },
    },
  });

  if (!lease) {
    throw new RentalClosureError("RENTAL_LEASE_NOT_FOUND", 404);
  }

  const [logs, rf12] = await Promise.all([
    lifecycleAuditLogs(db, tenantId, leaseId),
    rentFlexState(db, tenantId, leaseId),
  ]);

  const invoiceTotalMinor = lease.invoices.reduce(
    (total, invoice) => total + moneyToMinor(Number(invoice.totalAmount)),
    0,
  );
  const paidMinor = lease.invoices.reduce(
    (total, invoice) =>
      total +
      invoice.paymentTransactions
        .filter((payment) => payment.status === "COMPLETED")
        .reduce(
          (subtotal, payment) =>
            subtotal + moneyToMinor(Number(payment.netAmount)),
          0,
        ),
    0,
  );
  const pendingPaymentCount = lease.invoices.reduce(
    (total, invoice) =>
      total +
      invoice.paymentTransactions.filter((payment) =>
        PAYMENT_OPEN_STATUSES.includes(
          payment.status as (typeof PAYMENT_OPEN_STATUSES)[number],
        ),
      ).length,
    0,
  );

  const ejarByInvoice = ejarEvidenceByInvoice(lease.invoices, logs);
  const ejarReconciledInvoiceCount = lease.invoices.filter((invoice) => {
    const totalMinor = moneyToMinor(Number(invoice.totalAmount));
    return (ejarByInvoice.get(invoice.id) ?? 0) >= totalMinor;
  }).length;

  const depositAmountMinor = moneyToMinor(Number(lease.deposit));
  const depositSettled =
    depositAmountMinor === 0 ||
    logs.some((item) => {
      const details = parseAuditDetails(item.details);
      if (item.action === RENTAL_AUDIT_ACTION.DEPOSIT_SETTLED) {
        const recordedDeposit =
          typeof details.depositAmountMinor === "number"
            ? details.depositAmountMinor
            : -1;
        const refund =
          typeof details.refundAmountMinor === "number"
            ? details.refundAmountMinor
            : -1;
        const deduction =
          typeof details.deductionAmountMinor === "number"
            ? details.deductionAmountMinor
            : -1;
        return (
          recordedDeposit === depositAmountMinor &&
          refund >= 0 &&
          deduction >= 0 &&
          refund + deduction === depositAmountMinor &&
          (depositAmountMinor === 0 ||
            (typeof details.evidenceRef === "string" &&
              details.evidenceRef.trim().length > 0))
        );
      }
      if (item.action === RENTAL_AUDIT_ACTION.DEPOSIT_CARRIED_FORWARD) {
        return (
          details.amountMinor === depositAmountMinor &&
          typeof details.successorLeaseId === "string" &&
          details.successorLeaseId.length > 0
        );
      }
      return false;
    });

  const terminalReason = terminalReasonFromState({
    status: lease.status,
    endDate: lease.endDate,
    now,
    logs,
  });

  let handoverLinked = false;
  const handoverLog = [...logs]
    .reverse()
    .find((item) => item.action === RENTAL_AUDIT_ACTION.HANDOVER_LINKED);
  if (handoverLog && lease.unitId) {
    const details = parseAuditDetails(handoverLog.details);
    const handoverId =
      typeof details.handoverId === "string" ? details.handoverId : "";
    if (handoverId) {
      const unit = await db.unit.findFirst({
        where: { id: lease.unitId, tenantId },
        select: { handovers: true },
      });
      const handovers = Array.isArray(unit?.handovers) ? unit.handovers : [];
      handoverLinked = handovers
        .map((value) => asRecord(value))
        .some(
          (value) =>
            value.id === handoverId &&
            String(value.status ?? "").toLowerCase() === "completed",
        );
    }
  }

  const ejarReconciliationRequired = rf12.financialMode === RF12_DIRECT;
  const ejarReconciliationSatisfied =
    !ejarReconciliationRequired ||
    (lease.invoices.length > 0 &&
      ejarReconciledInvoiceCount === lease.invoices.length);

  const facts: RentalClosureFacts = {
    financialMode: rf12.financialMode,
    invoiceCount: lease.invoices.length,
    directInvoiceCoverageSatisfied: rf12.directInvoiceCoverageSatisfied,
    invoiceTotalMinor,
    paidMinor,
    outstandingMinor: invoiceTotalMinor - paidMinor,
    pendingPaymentCount,
    ejarReconciliationRequired,
    ejarReconciliationSatisfied,
    externalSettlementSatisfied: rf12.externalSettlementSatisfied,
    depositAmountMinor,
    depositSettled,
    handoverLinked,
    terminalReason,
  };

  return {
    lease,
    gate: evaluateRentalClosureGate(facts),
    summary: {
      invoiceTotal: minorToMoney(invoiceTotalMinor),
      paid: minorToMoney(paidMinor),
      outstanding: minorToMoney(invoiceTotalMinor - paidMinor),
      pendingPaymentCount,
      ejarReconciledInvoiceCount,
      invoiceCount: lease.invoices.length,
    },
  };
}

export async function getRentalClosureSnapshot(input: {
  tenantId: string;
  leaseId: string;
  now?: Date;
}) {
  return await buildRentalClosureSnapshotInDb(
    prisma,
    input.tenantId,
    input.leaseId,
    input.now ?? new Date(),
  );
}

export async function reconcileRentalEjarPayment(input: {
  tenantId: string;
  leaseId: string;
  invoiceId: string;
  providerReference: string;
  amount: number;
  actorId: string;
  applyPayment: boolean;
  evidence?: Record<string, unknown> | null;
  settledAt?: string | null;
}) {
  const providerReference = requiredText(
    input.providerReference,
    "RENTAL_EJAR_PROVIDER_REFERENCE_REQUIRED",
  );
  const amount = normalizedMoney(
    input.amount,
    "RENTAL_EJAR_RECONCILIATION_AMOUNT_INVALID",
  );
  const amountMinor = moneyToMinor(amount);
  const settledAt = input.settledAt
    ? parseDateOnly(input.settledAt, "RENTAL_EJAR_SETTLED_DATE_INVALID")
    : new Date();

  const invoice = await prisma.invoice.findFirst({
    where: {
      id: input.invoiceId,
      tenantId: input.tenantId,
      leaseId: input.leaseId,
      type: "RENTAL",
    },
    select: {
      id: true,
      totalAmount: true,
      paymentTransactions: {
        where: { status: "COMPLETED" },
        select: {
          provider: true,
          providerReference: true,
          netAmount: true,
        },
      },
    },
  });
  if (!invoice) {
    throw new RentalClosureError("RENTAL_EJAR_INVOICE_NOT_FOUND", 404);
  }

  const previousEvidence = await prisma.auditLog.findMany({
    where: {
      tenantId: input.tenantId,
      tableName: "rental_leases",
      recordId: input.leaseId,
      action: RENTAL_AUDIT_ACTION.EJAR_RECONCILED,
    },
    select: { details: true },
  });

  for (const item of previousEvidence) {
    const details = parseAuditDetails(item.details);
    if (details.providerReference !== providerReference) continue;

    const exactMatch =
      details.invoiceId === input.invoiceId &&
      details.amountMinor === amountMinor &&
      details.appliedPayment === input.applyPayment;

    if (!exactMatch) {
      throw new RentalClosureError(
        "RENTAL_EJAR_PROVIDER_REFERENCE_CONFLICT",
        409,
      );
    }

    if (!input.applyPayment) {
      return {
        idempotent: true,
        invoiceId: input.invoiceId,
        providerReference,
        amount,
        appliedPayment: false,
      };
    }
  }

  const existingProviderTransaction = await prisma.paymentTransaction.findUnique({
    where: {
      provider_providerReference: {
        provider: "EJAR",
        providerReference,
      },
    },
  });

  if (existingProviderTransaction) {
    if (
      existingProviderTransaction.tenantId !== input.tenantId ||
      existingProviderTransaction.invoiceId !== input.invoiceId ||
      moneyToMinor(Number(existingProviderTransaction.amount)) !== amountMinor
    ) {
      throw new RentalClosureError(
        "RENTAL_EJAR_PROVIDER_REFERENCE_CONFLICT",
        409,
      );
    }

    if (existingProviderTransaction.status === "COMPLETED") {
      return {
        idempotent: true,
        invoiceId: input.invoiceId,
        providerReference,
        amount,
        appliedPayment: true,
      };
    }

    if (
      existingProviderTransaction.status !== "FAILED" &&
      input.applyPayment
    ) {
      throw new RentalClosureError(
        "RENTAL_EJAR_RECONCILIATION_IN_PROGRESS",
        409,
      );
    }
  }

  const invoiceTotalMinor = moneyToMinor(Number(invoice.totalAmount));
  const paidMinor = invoice.paymentTransactions.reduce(
    (total, payment) => total + moneyToMinor(Number(payment.netAmount)),
    0,
  );
  const remainingMinor = invoiceTotalMinor - paidMinor;

  if (input.applyPayment) {
    if (amountMinor > remainingMinor || remainingMinor <= 0) {
      throw new RentalClosureError(
        "RENTAL_EJAR_PAYMENT_EXCEEDS_REMAINING_BALANCE",
        409,
      );
    }

    const idempotencyKey = providerIdempotencyKey(
      input.tenantId,
      input.invoiceId,
      providerReference,
    );

    const transactionData = {
      tenantId: input.tenantId,
      invoiceId: input.invoiceId,
      installmentId: null,
      amount,
      fee: 0,
      netAmount: amount,
      currency: "SAR",
      method: "EJAR",
      status: "PENDING",
      provider: "EJAR",
      providerReference,
      idempotencyKey,
      expectedAmountMinor: amountMinor,
      expectedCurrency: "SAR",
      failureReason: null,
      lastError: null,
      rawPayload: {
        source: "EJAR_RECONCILIATION",
        evidence: input.evidence ?? null,
        settledAt: settledAt.toISOString(),
      } as Prisma.InputJsonValue,
    };

    let transaction = existingProviderTransaction;

    if (transaction?.status === "FAILED") {
      const claimed = await prisma.paymentTransaction.updateMany({
        where: {
          id: transaction.id,
          tenantId: input.tenantId,
          status: "FAILED",
        },
        data: transactionData,
      });
      if (claimed.count !== 1) {
        throw new RentalClosureError(
          "RENTAL_EJAR_RECONCILIATION_IN_PROGRESS",
          409,
        );
      }
      transaction = await prisma.paymentTransaction.findUnique({
        where: { id: transaction.id },
      });
    } else if (!transaction) {
      try {
        transaction = await prisma.paymentTransaction.create({
          data: transactionData,
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          const duplicate = await prisma.paymentTransaction.findUnique({
            where: {
              provider_providerReference: {
                provider: "EJAR",
                providerReference,
              },
            },
          });
          if (
            duplicate &&
            duplicate.tenantId === input.tenantId &&
            duplicate.invoiceId === input.invoiceId &&
            moneyToMinor(Number(duplicate.amount)) === amountMinor &&
            duplicate.status === "COMPLETED"
          ) {
            return {
              idempotent: true,
              invoiceId: input.invoiceId,
              providerReference,
              amount,
              appliedPayment: true,
            };
          }
          throw new RentalClosureError(
            "RENTAL_EJAR_PROVIDER_REFERENCE_CONFLICT",
            409,
          );
        }
        throw error;
      }
    }

    if (!transaction) {
      throw new RentalClosureError(
        "RENTAL_EJAR_TRANSACTION_UNAVAILABLE",
        409,
      );
    }

    try {
      await completePaymentTransaction({
        transactionId: transaction.id,
        tenantId: input.tenantId,
        amountMinorUnits: amountMinor,
        currency: "SAR",
        providerStatus: "EJAR_CONFIRMED",
        rawPayload: {
          source: "EJAR_RECONCILIATION",
          evidence: input.evidence ?? null,
          settledAt: settledAt.toISOString(),
        },
        actorId: input.actorId,
        actorUserId: input.actorId,
        correlationId: `rental-ejar:${input.leaseId}:${providerReference}`,
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      await prisma.paymentTransaction.updateMany({
        where: {
          id: transaction.id,
          tenantId: input.tenantId,
          status: { not: "COMPLETED" },
        },
        data: {
          status: "FAILED",
          failureReason: reason.slice(0, 2000),
          lastError: reason.slice(0, 2000),
        },
      });
      throw error;
    }
  } else {
    if (remainingMinor !== 0) {
      throw new RentalClosureError(
        "RENTAL_EJAR_EVIDENCE_ONLY_REQUIRES_SETTLED_INVOICE",
        409,
      );
    }

    const evidenceOnlyMinor = previousEvidence
      .map((item) => parseAuditDetails(item.details))
      .filter(
        (details) =>
          details.invoiceId === input.invoiceId &&
          details.appliedPayment === false,
      )
      .reduce(
        (total, details) =>
          total +
          (typeof details.amountMinor === "number" &&
          Number.isSafeInteger(details.amountMinor)
            ? details.amountMinor
            : 0),
        0,
      );
    const providerAppliedMinor = invoice.paymentTransactions
      .filter((payment) => payment.provider.toUpperCase() === "EJAR")
      .reduce(
        (total, payment) => total + moneyToMinor(Number(payment.netAmount)),
        0,
      );

    if (
      evidenceOnlyMinor + providerAppliedMinor + amountMinor >
      invoiceTotalMinor
    ) {
      throw new RentalClosureError(
        "RENTAL_EJAR_RECONCILIATION_EXCEEDS_INVOICE",
        409,
      );
    }
  }

  await audit(prisma, {
    tenantId: input.tenantId,
    actorId: input.actorId,
    action: RENTAL_AUDIT_ACTION.EJAR_RECONCILED,
    leaseId: input.leaseId,
    details: {
      invoiceId: input.invoiceId,
      providerReference,
      amountMinor,
      appliedPayment: input.applyPayment,
      settledAt: settledAt.toISOString(),
      evidence: input.evidence ?? null,
    },
  });

  return {
    idempotent: false,
    invoiceId: input.invoiceId,
    providerReference,
    amount,
    appliedPayment: input.applyPayment,
  };
}


export async function settleRentalDeposit(input: {
  tenantId: string;
  leaseId: string;
  refundAmount: number;
  deductionAmount: number;
  reason?: string | null;
  evidenceRef?: string | null;
  actorId: string;
}) {
  return await prisma.$transaction(
    async (tx) => {
      const lease = await leaseOrThrow(tx, input.tenantId, input.leaseId);
      if (lease.status.toLowerCase() === RENTAL_LEASE_STATUS.CLOSED) {
        throw new RentalClosureError("RENTAL_LEASE_ALREADY_CLOSED", 409);
      }

      const normalized = normalizeDepositSettlement({
        depositAmount: Number(lease.deposit),
        refundAmount: input.refundAmount,
        deductionAmount: input.deductionAmount,
      });
      const reason = String(input.reason ?? "").trim();
      const evidenceRef = String(input.evidenceRef ?? "").trim();

      if (normalized.deductionAmountMinor > 0 && !reason) {
        throw new RentalClosureError(
          "RENTAL_DEPOSIT_DEDUCTION_REASON_REQUIRED",
          400,
        );
      }
      if (normalized.depositAmountMinor > 0 && !evidenceRef) {
        throw new RentalClosureError(
          "RENTAL_DEPOSIT_EVIDENCE_REQUIRED",
          400,
        );
      }

      const existing = await tx.auditLog.findFirst({
        where: {
          tenantId: input.tenantId,
          tableName: "rental_leases",
          recordId: input.leaseId,
          action: {
            in: [
              RENTAL_AUDIT_ACTION.DEPOSIT_SETTLED,
              RENTAL_AUDIT_ACTION.DEPOSIT_CARRIED_FORWARD,
            ],
          },
        },
        orderBy: { createdAt: "desc" },
        select: { action: true, details: true },
      });

      if (existing) {
        const details = parseAuditDetails(existing.details);
        if (
          existing.action === RENTAL_AUDIT_ACTION.DEPOSIT_SETTLED &&
          details.refundAmountMinor === normalized.refundAmountMinor &&
          details.deductionAmountMinor === normalized.deductionAmountMinor &&
          details.evidenceRef === evidenceRef
        ) {
          return { idempotent: true, ...normalized };
        }
        throw new RentalClosureError("RENTAL_DEPOSIT_ALREADY_SETTLED", 409);
      }

      await audit(tx, {
        tenantId: input.tenantId,
        actorId: input.actorId,
        action: RENTAL_AUDIT_ACTION.DEPOSIT_SETTLED,
        leaseId: input.leaseId,
        details: {
          ...normalized,
          reason,
          evidenceRef,
        },
      });

      return { idempotent: false, ...normalized };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function linkRentalHandover(input: {
  tenantId: string;
  leaseId: string;
  handoverId: string;
  actorId: string;
}) {
  return await prisma.$transaction(
    async (tx) => {
      const lease = await leaseOrThrow(tx, input.tenantId, input.leaseId);
      if (!lease.unitId) {
        throw new RentalClosureError("RENTAL_HANDOVER_UNIT_REQUIRED", 409);
      }
      if (lease.status.toLowerCase() === RENTAL_LEASE_STATUS.RENEWED) {
        throw new RentalClosureError(
          "RENTAL_HANDOVER_NOT_REQUIRED_FOR_RENEWAL",
          409,
        );
      }

      const unit = await tx.unit.findFirst({
        where: { id: lease.unitId, tenantId: input.tenantId },
        select: { handovers: true },
      });
      if (!unit) {
        throw new RentalClosureError("RENTAL_HANDOVER_UNIT_NOT_FOUND", 404);
      }

      const handovers = Array.isArray(unit.handovers) ? unit.handovers : [];
      const handover = handovers
        .map((value) => asRecord(value))
        .find((value) => value.id === input.handoverId);

      if (!handover || String(handover.status ?? "").toLowerCase() !== "completed") {
        throw new RentalClosureError(
          "RENTAL_HANDOVER_COMPLETED_EVIDENCE_REQUIRED",
          409,
        );
      }

      const existing = await tx.auditLog.findFirst({
        where: {
          tenantId: input.tenantId,
          tableName: "rental_leases",
          recordId: input.leaseId,
          action: RENTAL_AUDIT_ACTION.HANDOVER_LINKED,
        },
        orderBy: { createdAt: "desc" },
        select: { details: true },
      });
      if (existing) {
        const details = parseAuditDetails(existing.details);
        if (details.handoverId === input.handoverId) {
          return { idempotent: true, handoverId: input.handoverId };
        }
        throw new RentalClosureError("RENTAL_HANDOVER_ALREADY_LINKED", 409);
      }

      await audit(tx, {
        tenantId: input.tenantId,
        actorId: input.actorId,
        action: RENTAL_AUDIT_ACTION.HANDOVER_LINKED,
        leaseId: input.leaseId,
        details: {
          handoverId: input.handoverId,
          unitId: lease.unitId,
          completedAt: handover.completedAt ?? null,
        },
      });

      return { idempotent: false, handoverId: input.handoverId };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function terminateRentalLease(input: {
  tenantId: string;
  leaseId: string;
  effectiveDate: string;
  reason: string;
  actorId: string;
}) {
  const effectiveDate = parseDateOnly(
    input.effectiveDate,
    "RENTAL_TERMINATION_DATE_INVALID",
  );
  const reason = requiredText(
    input.reason,
    "RENTAL_TERMINATION_REASON_REQUIRED",
  );

  return await prisma.$transaction(
    async (tx) => {
      const lease = await leaseOrThrow(tx, input.tenantId, input.leaseId);
      const status = lease.status.toLowerCase();
      if (status === RENTAL_LEASE_STATUS.CLOSED) {
        throw new RentalClosureError("RENTAL_LEASE_ALREADY_CLOSED", 409);
      }
      if (status === RENTAL_LEASE_STATUS.RENEWED) {
        throw new RentalClosureError("RENTAL_RENEWED_LEASE_CANNOT_TERMINATE", 409);
      }

      if (status === RENTAL_LEASE_STATUS.TERMINATED) {
        const existing = await tx.auditLog.findFirst({
          where: {
            tenantId: input.tenantId,
            tableName: "rental_leases",
            recordId: input.leaseId,
            action: RENTAL_AUDIT_ACTION.TERMINATED,
          },
          orderBy: { createdAt: "desc" },
          select: { details: true },
        });
        const details = parseAuditDetails(existing?.details ?? null);
        if (
          details.effectiveDate === dateOnly(effectiveDate) &&
          details.reason === reason
        ) {
          return { idempotent: true, status: RENTAL_LEASE_STATUS.TERMINATED };
        }
        throw new RentalClosureError("RENTAL_LEASE_ALREADY_TERMINATED", 409);
      }

      if (
        effectiveDate.getTime() < lease.startDate.getTime() ||
        effectiveDate.getTime() > lease.endDate.getTime()
      ) {
        throw new RentalClosureError("RENTAL_TERMINATION_DATE_OUTSIDE_TERM", 400);
      }

      await tx.rentalLease.update({
        where: { id: lease.id },
        data: { status: RENTAL_LEASE_STATUS.TERMINATED },
      });

      await audit(tx, {
        tenantId: input.tenantId,
        actorId: input.actorId,
        action: RENTAL_AUDIT_ACTION.TERMINATED,
        leaseId: input.leaseId,
        details: {
          effectiveDate: dateOnly(effectiveDate),
          reason,
          previousStatus: lease.status,
        },
      });

      return { idempotent: false, status: RENTAL_LEASE_STATUS.TERMINATED };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function renewRentalLease(input: {
  tenantId: string;
  leaseId: string;
  newStartDate: string;
  newEndDate: string;
  newRentAmount?: number | null;
  actorId: string;
}) {
  const newStartDate = parseDateOnly(
    input.newStartDate,
    "RENTAL_RENEWAL_START_DATE_INVALID",
  );
  const newEndDate = parseDateOnly(
    input.newEndDate,
    "RENTAL_RENEWAL_END_DATE_INVALID",
  );
  if (newEndDate.getTime() <= newStartDate.getTime()) {
    throw new RentalClosureError("RENTAL_RENEWAL_DATE_RANGE_INVALID", 400);
  }

  return await prisma.$transaction(
    async (tx) => {
      const lease = await leaseOrThrow(tx, input.tenantId, input.leaseId);
      const status = lease.status.toLowerCase();
      if (status === RENTAL_LEASE_STATUS.CLOSED) {
        throw new RentalClosureError("RENTAL_LEASE_ALREADY_CLOSED", 409);
      }
      if (status === RENTAL_LEASE_STATUS.TERMINATED) {
        throw new RentalClosureError(
          "RENTAL_TERMINATED_LEASE_CANNOT_RENEW",
          409,
        );
      }

      const existingRenewal = await tx.auditLog.findFirst({
        where: {
          tenantId: input.tenantId,
          tableName: "rental_leases",
          recordId: input.leaseId,
          action: RENTAL_AUDIT_ACTION.RENEWED,
        },
        orderBy: { createdAt: "desc" },
        select: { details: true },
      });
      if (existingRenewal) {
        const details = parseAuditDetails(existingRenewal.details);
        return {
          idempotent: true,
          status: RENTAL_LEASE_STATUS.RENEWED,
          successorLeaseId:
            typeof details.successorLeaseId === "string"
              ? details.successorLeaseId
              : null,
        };
      }

      if (newStartDate.getTime() <= lease.endDate.getTime()) {
        throw new RentalClosureError(
          "RENTAL_RENEWAL_MUST_START_AFTER_CURRENT_TERM",
          400,
        );
      }

      const snapshot = await buildRentalClosureSnapshotInDb(
        tx,
        input.tenantId,
        input.leaseId,
        new Date(),
      );
      const preRenewalGate = evaluateRentalClosureGate({
        ...snapshot.gate.facts,
        terminalReason: "RENEWED",
        handoverLinked: true,
        depositSettled: true,
      });
      if (!preRenewalGate.pass) {
        throw new RentalClosureError(
          `RENTAL_RENEWAL_BLOCKED:${preRenewalGate.blockers
            .map((item) => item.code)
            .join(",")}`,
          409,
        );
      }

      const rentAmount =
        input.newRentAmount === null || input.newRentAmount === undefined
          ? Number(lease.rentAmount)
          : normalizedMoney(
              input.newRentAmount,
              "RENTAL_RENEWAL_RENT_AMOUNT_INVALID",
            );

      const successor = await tx.rentalLease.create({
        data: {
          tenantId: input.tenantId,
          unitId: lease.unitId,
          unitName: lease.unitName,
          tenantName: lease.tenantName,
          startDate: newStartDate,
          endDate: newEndDate,
          rentAmount,
          deposit: lease.deposit,
          currency: lease.currency,
          status: RENTAL_LEASE_STATUS.ACTIVE,
          vatType: lease.vatType,
          vatRate: lease.vatRate,
        },
      });

      await tx.rentalLease.update({
        where: { id: lease.id },
        data: { status: RENTAL_LEASE_STATUS.RENEWED },
      });

      if (moneyToMinor(Number(lease.deposit)) > 0) {
        await audit(tx, {
          tenantId: input.tenantId,
          actorId: input.actorId,
          action: RENTAL_AUDIT_ACTION.DEPOSIT_CARRIED_FORWARD,
          leaseId: input.leaseId,
          details: {
            successorLeaseId: successor.id,
            amountMinor: moneyToMinor(Number(lease.deposit)),
          },
        });
      }

      await audit(tx, {
        tenantId: input.tenantId,
        actorId: input.actorId,
        action: RENTAL_AUDIT_ACTION.RENEWED,
        leaseId: input.leaseId,
        details: {
          successorLeaseId: successor.id,
          newStartDate: dateOnly(newStartDate),
          newEndDate: dateOnly(newEndDate),
          newRentAmount: rentAmount,
          previousStatus: lease.status,
        },
      });

      return {
        idempotent: false,
        status: RENTAL_LEASE_STATUS.RENEWED,
        successorLeaseId: successor.id,
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function closeRentalLease(input: {
  tenantId: string;
  leaseId: string;
  actorId: string;
  now?: Date;
}) {
  return await prisma.$transaction(
    async (tx) => {
      const existing = await tx.rentalLease.findFirst({
        where: { id: input.leaseId, tenantId: input.tenantId },
        select: { status: true },
      });
      if (!existing) {
        throw new RentalClosureError("RENTAL_LEASE_NOT_FOUND", 404);
      }

      if (existing.status.toLowerCase() === RENTAL_LEASE_STATUS.CLOSED) {
        const closure = await tx.auditLog.findFirst({
          where: {
            tenantId: input.tenantId,
            tableName: "rental_leases",
            recordId: input.leaseId,
            action: RENTAL_AUDIT_ACTION.CLOSED,
          },
          orderBy: { createdAt: "desc" },
        });
        if (!closure) {
          throw new RentalClosureError(
            "RENTAL_CLOSED_STATE_MISSING_CLOSURE_EVIDENCE",
            409,
          );
        }
        return {
          idempotent: true,
          status: RENTAL_LEASE_STATUS.CLOSED,
          closureId: closure.id,
        };
      }

      const snapshot = await buildRentalClosureSnapshotInDb(
        tx,
        input.tenantId,
        input.leaseId,
        input.now ?? new Date(),
      );
      if (!snapshot.gate.pass) {
        throw new RentalClosureError(
          `RENTAL_CLOSURE_BLOCKED:${snapshot.gate.blockers
            .map((item) => item.code)
            .join(",")}`,
          409,
        );
      }

      const terminalReason = snapshot.gate.facts.terminalReason;
      if (!terminalReason) {
        throw new RentalClosureError(
          "RENTAL_CLOSURE_TERMINAL_STATE_REQUIRED",
          409,
        );
      }

      await audit(tx, {
        tenantId: input.tenantId,
        actorId: input.actorId,
        action: RENTAL_AUDIT_ACTION.FINANCIALLY_CLOSED,
        leaseId: input.leaseId,
        details: {
          financialMode: snapshot.gate.facts.financialMode,
          invoiceTotal: snapshot.summary.invoiceTotal,
          paid: snapshot.summary.paid,
          outstanding: snapshot.summary.outstanding,
          terminalReason,
        },
      });

      await tx.rentalLease.update({
        where: { id: input.leaseId },
        data: { status: RENTAL_LEASE_STATUS.CLOSED },
      });

      const closure = await audit(tx, {
        tenantId: input.tenantId,
        actorId: input.actorId,
        action: RENTAL_AUDIT_ACTION.CLOSED,
        leaseId: input.leaseId,
        details: {
          terminalReason,
          financialMode: snapshot.gate.facts.financialMode,
          depositSettled: snapshot.gate.facts.depositSettled,
          handoverLinked: snapshot.gate.facts.handoverLinked,
          ejarReconciliationSatisfied:
            snapshot.gate.facts.ejarReconciliationSatisfied,
          externalSettlementSatisfied:
            snapshot.gate.facts.externalSettlementSatisfied,
        },
      });

      return {
        idempotent: false,
        status: RENTAL_LEASE_STATUS.CLOSED,
        closureId: closure.id,
        terminalReason,
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}
