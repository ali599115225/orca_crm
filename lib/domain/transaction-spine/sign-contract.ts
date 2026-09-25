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
import {
  canonicalSha256,
  persistSignedOperationalSnapshotInTx,
} from "./signed-contract-snapshot";
import { assertContractApprovalBoundaryInTx } from "@/lib/domain/contract-finance/contract-draft-service";
import type {
  ConfigureContractSignatoriesInput,
  ConfigureContractSignatoryEntry,
  ContractSignatureEvidence,
  SignContractInput,
  SignContractSignatoryInput,
} from "./types";
import type { RequiredSignatureSetEntry } from "./signed-contract-snapshot";

export const SIGNATURE_EVIDENCE_REQUIRED = "SIGNATURE_EVIDENCE_REQUIRED";
export const SIGNATURE_EVIDENCE_INVALID = "SIGNATURE_EVIDENCE_INVALID";

export class ContractSignatureEvidenceError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "ContractSignatureEvidenceError";
  }
}

// Multi-sign fail-closed codes (design-freeze §"SIGNATORY SIGNING RULE" / "IDEMPOTENCY RULE").
export const CONTRACT_SIGNATORY_NOT_FOUND = "CONTRACT_SIGNATORY_NOT_FOUND";
export const CONTRACT_SIGNATORY_CONTRACT_MISMATCH = "CONTRACT_SIGNATORY_CONTRACT_MISMATCH";
export const CONTRACT_SIGNATORY_EVIDENCE_CONFLICT = "CONTRACT_SIGNATORY_EVIDENCE_CONFLICT";
export const CONTRACT_MULTI_SIGN_AMBIGUOUS = "CONTRACT_MULTI_SIGN_AMBIGUOUS";
export const CONTRACT_NOT_FOUND = "CONTRACT_NOT_FOUND";
export const CONTRACT_LEGACY_SIGNING_BLOCKED = "CONTRACT_LEGACY_SIGNING_BLOCKED";
export const CONTRACT_SIGNATORY_ZERO_REQUIRED_ROWS = "CONTRACT_SIGNATORY_ZERO_REQUIRED_ROWS";

// Signatory-configuration fail-closed codes (design-freeze item C/8/9/10).
export const CONTRACT_SIGNATORY_CONFIG_INVALID = "CONTRACT_SIGNATORY_CONFIG_INVALID";
export const CONTRACT_SIGNATORY_CONFIG_EMPTY = "CONTRACT_SIGNATORY_CONFIG_EMPTY";
export const CONTRACT_SIGNATORY_CONFIG_NO_REQUIRED = "CONTRACT_SIGNATORY_CONFIG_NO_REQUIRED";
export const CONTRACT_SIGNATORY_CONFIG_NOT_PENDING = "CONTRACT_SIGNATORY_CONFIG_NOT_PENDING";
export const CONTRACT_SIGNATORY_CONFIG_LOCKED = "CONTRACT_SIGNATORY_CONFIG_LOCKED";

export class ContractSignatoryError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "ContractSignatoryError";
  }
}

export interface NormalizedSignatureEvidence {
  method: string;
  signerName: string;
  capturedAt: Date;
  signerReference?: string;
  attributes?: Record<string, unknown>;
}

const SENSITIVE_EVIDENCE_KEY =
  /pass(word)?|secret|token|api[-_]?key|credential|private[-_]?key/i;

function containsSensitiveKey(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsSensitiveKey);
  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.entries(value as Record<string, unknown>).some(
      ([key, nested]) => SENSITIVE_EVIDENCE_KEY.test(key) || containsSensitiveKey(nested),
    );
  }
  return false;
}

function requiredText(value: unknown, maxLength: number): string {
  if (typeof value !== "string") {
    throw new ContractSignatureEvidenceError(SIGNATURE_EVIDENCE_INVALID);
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength) {
    throw new ContractSignatureEvidenceError(SIGNATURE_EVIDENCE_INVALID);
  }
  return trimmed;
}

/**
 * Validates provider-neutral signature evidence. Missing evidence fails with
 * SIGNATURE_EVIDENCE_REQUIRED; malformed or secret-bearing evidence fails with
 * SIGNATURE_EVIDENCE_INVALID.
 */
export function normalizeSignatureEvidence(
  evidence: ContractSignatureEvidence | null | undefined,
): NormalizedSignatureEvidence {
  if (evidence === null || evidence === undefined) {
    throw new ContractSignatureEvidenceError(SIGNATURE_EVIDENCE_REQUIRED);
  }
  if (typeof evidence !== "object" || Array.isArray(evidence)) {
    throw new ContractSignatureEvidenceError(SIGNATURE_EVIDENCE_INVALID);
  }

  const method = requiredText(evidence.method, 64).toUpperCase();
  const signerName = requiredText(evidence.signerName, 200);
  const capturedAt =
    evidence.capturedAt instanceof Date
      ? evidence.capturedAt
      : typeof evidence.capturedAt === "string"
        ? new Date(evidence.capturedAt)
        : new Date(Number.NaN);
  if (Number.isNaN(capturedAt.getTime()) || capturedAt.getTime() > Date.now() + 300_000) {
    throw new ContractSignatureEvidenceError(SIGNATURE_EVIDENCE_INVALID);
  }

  const signerReference =
    evidence.signerReference === undefined
      ? undefined
      : requiredText(evidence.signerReference, 200);

  let attributes: Record<string, unknown> | undefined;
  if (evidence.attributes !== undefined) {
    if (
      !evidence.attributes ||
      typeof evidence.attributes !== "object" ||
      Array.isArray(evidence.attributes)
    ) {
      throw new ContractSignatureEvidenceError(SIGNATURE_EVIDENCE_INVALID);
    }
    attributes = evidence.attributes;
  }

  if (containsSensitiveKey(evidence)) {
    throw new ContractSignatureEvidenceError(SIGNATURE_EVIDENCE_INVALID);
  }

  return { method, signerName, capturedAt, signerReference, attributes };
}

/** SHA-256 over the canonical representation of the normalized evidence. */
export function computeSignatureEvidenceHash(
  evidence: NormalizedSignatureEvidence,
): string {
  try {
    return canonicalSha256({
      method: evidence.method,
      signerName: evidence.signerName,
      capturedAt: evidence.capturedAt,
      signerReference: evidence.signerReference,
      attributes: evidence.attributes,
    });
  } catch {
    throw new ContractSignatureEvidenceError(SIGNATURE_EVIDENCE_INVALID);
  }
}

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

interface FinalizeContractSigningContext {
  tenantId: string;
  userId: string;
  eventActorId: string;
  correlationId: string;
  contract: any;
  signedAt: Date;
  signatureEvidenceHash: string;
  normalizedEvidenceMethod?: string | null;
  requiredSignatureSet?: RequiredSignatureSetEntry[] | null;
  receivable: { id: string };
  revenue: { id: string };
  vatPayable: { id: string };
}

/**
 * Reused, single finalization boundary for the PENDING_SIGNATURE -> SIGNED
 * transition (design-freeze §"FINAL SIGNING RULE"). Both the legacy
 * single-signer flow and the multi-sign completion path call this exact
 * function so there is only one finalization implementation. Idempotent by
 * construction: when the loaded contract is already SIGNED, every mutating
 * step below is skipped and the prior state is returned unchanged.
 */
async function finalizeContractSigningInTx(tx: any, ctx: FinalizeContractSigningContext) {
  const {
    tenantId,
    userId,
    eventActorId,
    correlationId,
    contract,
    signedAt,
    signatureEvidenceHash,
    normalizedEvidenceMethod,
    requiredSignatureSet,
    receivable,
    revenue,
    vatPayable,
  } = ctx;

  const alreadySigned =
    contract.status === CONTRACT_STATUS.SIGNED && Boolean(contract.signedAt);

  const paymentPlan =
    contract.paymentPlan || (await ensureDefaultPaymentPlanInTx(tx, contract));

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

  if (deal.passport && financials.invoiceCreated) {
    await appendDealEventInTx(tx, {
      tenantId,
      dealId: deal.passport.id,
      eventType: "invoice.issued",
      idempotencyKey: `invoice.issued:${financials.invoice.id}`,
      causationId: contractSignedEventId,
      actorId: eventActorId,
      correlationId,
      entityType: "invoice",
      entityId: financials.invoice.id,
      beforeState: {
        invoiceExists: false,
      },
      afterState: {
        invoiceExists: true,
        invoiceId: financials.invoice.id,
        invoiceNumber: financials.invoice.invoiceNumber,
        status: financials.invoice.status,
      },
      payload: {
        invoiceId: financials.invoice.id,
        invoiceNumber: financials.invoice.invoiceNumber,
        invoicePrefix: financials.invoice.invoicePrefix,
        type: financials.invoice.type,
        totalAmount: Number(financials.invoice.totalAmount),
        contractId: contract.id,
      },
      projection: {
        contractId: contract.id,
      },
    });
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

  let signedSnapshotId: string | null = null;
  if (!alreadySigned) {
    const activePaymentPlan = await tx.paymentPlan.findFirst({
      where: { id: paymentPlan.id, tenantId },
    });
    const { snapshot } = await persistSignedOperationalSnapshotInTx(
      tx,
      {
        contract: { ...signedContract, unit: contract.unit, tenant: contract.tenant },
        paymentPlan: activePaymentPlan,
        installments: financials.installments,
        invoice: financials.invoice,
        signatureEvidenceHash,
        requiredSignatureSet: requiredSignatureSet ?? undefined,
      },
      userId,
    );
    signedSnapshotId = snapshot.id;
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
          signatureEvidenceHash,
          signatureMethod: normalizedEvidenceMethod ?? undefined,
          signedSnapshotId,
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
    signatureEvidenceHash: alreadySigned ? null : signatureEvidenceHash,
    idempotent: alreadySigned,
  };
}

interface SignatoryFinalizationEnvironment {
  tenantId: string;
  userId: string;
  eventActorId: string;
  correlationId: string;
  receivable: { id: string };
  revenue: { id: string };
  vatPayable: { id: string };
}

/**
 * Persists one ContractSignatory signature (idempotent per signatory id;
 * fails closed on conflicting evidence — design-freeze §"IDEMPOTENCY RULE"),
 * then re-reads every required signatory for the contract. Finalization
 * (via finalizeContractSigningInTx) only runs when every required signatory
 * is SIGNED (§"PARTIAL SIGNING RULE" / §"FINAL SIGNING RULE").
 *
 * Approval placement (design-freeze item 1/15/D): assertContractApprovalBoundaryInTx
 * must pass BEFORE any PENDING -> SIGNED write, for both partial and final
 * signatures — never only at finalization time. No signature evidence is
 * persisted before that check. An idempotent replay of an already-SIGNED row
 * performs no write, so it does not re-run the boundary check.
 */
async function signSignatoryAndMaybeFinalizeInTx(
  tx: any,
  env: SignatoryFinalizationEnvironment,
  contract: any,
  signatory: any,
  normalizedEvidence: NormalizedSignatureEvidence,
  signatureEvidenceHash: string,
  signedAt: Date,
) {
  if (signatory.status === "SIGNED") {
    if (signatory.signatureEvidenceHash !== signatureEvidenceHash) {
      throw new ContractSignatoryError(CONTRACT_SIGNATORY_EVIDENCE_CONFLICT);
    }
  } else {
    const previousStatus = signatory.status;
    await assertContractApprovalBoundaryInTx(tx, env.tenantId, contract.id);
    await tx.contractSignatory.update({
      where: { id: signatory.id },
      data: { status: "SIGNED", signatureEvidenceHash, signedAt },
    });

    const deal = await resolveDealInTx(tx, {
      tenantId: env.tenantId,
      opportunityId: contract.offer?.opportunity?.id || null,
      contractId: contract.id,
      actorId: env.eventActorId,
      correlationId: env.correlationId,
    });

    if (deal?.passport) {
      await appendDealEventInTx(tx, {
        tenantId: env.tenantId,
        dealId: deal.passport.id,
        eventType: "signatory.signed",
        idempotencyKey: `signatory.signed:${signatory.id}`,
        correlationId: env.correlationId,
        causationId: deal.passport.lastEventId || null,
        actorId: env.eventActorId,
        entityType: "signatory",
        entityId: signatory.id,
        beforeState: {
          status: previousStatus,
        },
        afterState: {
          status: "SIGNED",
          signatureEvidenceHash,
        },
        payload: {
          signatoryId: signatory.id,
          contractId: contract.id,
          role: signatory.role,
          signerReference: signatory.signerReference ?? null,
          signedAt: signedAt.toISOString(),
        },
        projection: {
          contractId: contract.id,
        },
      });
    }
  }

  const requiredRows = await tx.contractSignatory.findMany({
    where: { tenantId: env.tenantId, contractId: contract.id, required: true },
  });
  if (requiredRows.length === 0) {
    // Defensive guard (design-freeze item E/16): never treat an empty
    // required set as vacuous completion, even for corrupted/pre-existing
    // data that somehow reached signing with zero required rows.
    throw new ContractSignatoryError(CONTRACT_SIGNATORY_ZERO_REQUIRED_ROWS);
  }
  const anyRequiredUnsigned = requiredRows.some((row: any) => row.status !== "SIGNED");

  if (anyRequiredUnsigned) {
    return {
      finalized: false as const,
      signatory: { ...signatory, status: "SIGNED", signatureEvidenceHash, signedAt },
    };
  }

  const requiredSignatureSet: RequiredSignatureSetEntry[] = requiredRows
    .map((row: any) => ({
      signatoryId: row.id,
      role: row.role,
      required: row.required,
      signatureEvidenceHash: row.signatureEvidenceHash,
      signedAt: row.signedAt instanceof Date ? row.signedAt.toISOString() : row.signedAt,
    }))
    .sort((a: RequiredSignatureSetEntry, b: RequiredSignatureSetEntry) =>
      a.signatoryId < b.signatoryId ? -1 : a.signatoryId > b.signatoryId ? 1 : 0,
    );
  const setHash = canonicalSha256(requiredSignatureSet);

  const result = await finalizeContractSigningInTx(tx, {
    tenantId: env.tenantId,
    userId: env.userId,
    eventActorId: env.eventActorId,
    correlationId: env.correlationId,
    contract,
    signedAt,
    signatureEvidenceHash: setHash,
    normalizedEvidenceMethod: normalizedEvidence.method,
    requiredSignatureSet,
    receivable: env.receivable,
    revenue: env.revenue,
    vatPayable: env.vatPayable,
  });

  return { finalized: true as const, result };
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

  const normalizedEvidence =
    input.signatureEvidence === undefined
      ? null
      : normalizeSignatureEvidence(input.signatureEvidence);
  const signatureEvidenceHash = normalizedEvidence
    ? computeSignatureEvidenceHash(normalizedEvidence)
    : null;

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
          unit: {
            select: { unitNumber: true, type: true, area: true, city: true, district: true },
          },
          tenant: {
            select: {
              companyName: true,
              vatNumber: true,
              commercialRegistry: true,
              nationalAddress: true,
            },
          },
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
      if (!alreadySigned && !signatureEvidenceHash) {
        throw new ContractSignatureEvidenceError(SIGNATURE_EVIDENCE_REQUIRED);
      }

      // Legacy /sign compatibility wrapper (design-freeze rule 15, tightened
      // by the Batch 1A remediation). Only engages when this tx exposes the
      // ContractSignatory model. A contract that is already SIGNED never
      // reaches this block (guarded by !alreadySigned above), so the
      // "SIGNED + zero rows is valid legacy history" rule is preserved
      // unconditionally, including read/idempotent-retry compatibility.
      //
      // For a PENDING_SIGNATURE contract, zero ContractSignatory rows is no
      // longer a license to fall back to the old whole-contract engine for a
      // NEW signing operation: that engine never persists a signatory row,
      // so it cannot participate in the multi-sign model at all. Only an
      // unambiguous single applicable (required, unsigned) signatory may be
      // delegated to the canonical per-signatory service; zero or multiple
      // applicable candidates both fail closed.
      if (!alreadySigned && (tx as any).contractSignatory) {
        const signatories = await (tx as any).contractSignatory.findMany({
          where: { tenantId, contractId: contract.id },
        });
        const candidates = signatories.filter(
          (row: any) => row.required && row.status !== "SIGNED",
        );

        if (candidates.length > 1) {
          // Multiple candidate signatories: the legacy endpoint carries no
          // signatoryId, so it cannot deterministically identify who this
          // evidence belongs to. Fail closed rather than guess.
          throw new ContractSignatoryError(CONTRACT_MULTI_SIGN_AMBIGUOUS);
        }
        if (candidates.length === 1) {
          const outcome = await signSignatoryAndMaybeFinalizeInTx(
            tx,
            { tenantId, userId, eventActorId, correlationId, receivable, revenue, vatPayable },
            contract,
            candidates[0],
            normalizedEvidence as NormalizedSignatureEvidence,
            signatureEvidenceHash as string,
            signedAt,
          );
          if (outcome.finalized) return outcome.result;
          // Unreachable in practice: signing the sole remaining required
          // candidate always completes the required set. Fail closed
          // rather than fabricate a legacy-shaped partial response.
          throw new ContractSignatoryError("CONTRACT_MULTI_SIGN_PARTIAL_VIA_LEGACY_ENDPOINT");
        }
        // Zero applicable candidates on a PENDING_SIGNATURE contract: either
        // no signatory rows exist at all, or every required row is already
        // SIGNED (an inconsistent state, since finalization would already
        // have run). Neither case may fall back to the old whole-contract
        // signing engine for a new signing operation.
        throw new ContractSignatoryError(CONTRACT_LEGACY_SIGNING_BLOCKED);
      }

      return finalizeContractSigningInTx(tx, {
        tenantId,
        userId,
        eventActorId,
        correlationId,
        contract,
        signedAt,
        signatureEvidenceHash: signatureEvidenceHash as string,
        normalizedEvidenceMethod: normalizedEvidence?.method ?? null,
        requiredSignatureSet: null,
        receivable,
        revenue,
        vatPayable,
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

/**
 * Canonical per-signatory signing service (design-freeze §"SIGNATORY SIGNING
 * RULE"). Authoritative signer identity is ContractSignatory.id
 * (signatoryId); signerReference, if present, is metadata only. signedAt is
 * never client-controlled — it is always the server clock at the time of
 * this call.
 */
export async function signContractSignatory(input: SignContractSignatoryInput) {
  const {
    tenantId,
    userId,
    contractId,
    signatoryId,
    actorId,
    correlationId: requestedCorrelationId,
  } = input;
  const eventActorId = actorId || userId;
  const correlationId = ensureDealCorrelationId(requestedCorrelationId, "deal");
  if (!userId) throw new Error("Authenticated user is required.");

  const normalizedEvidence = normalizeSignatureEvidence(input.signatureEvidence);
  const signatureEvidenceHash = computeSignatureEvidenceHash(normalizedEvidence);
  const signedAt = new Date();

  const cutoverContract = await prisma.contract.findFirst({
    where: { id: contractId, tenantId },
    select: { spineVersion: true, legacyFinancial: true },
  });
  if (!cutoverContract) throw new ContractSignatoryError(CONTRACT_NOT_FOUND);
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
      // 1. contract exists in same tenant.
      const contract = await tx.contract.findFirst({
        where: { id: contractId, tenantId },
        include: {
          paymentPlan: true,
          offer: { include: { opportunity: true } },
          unit: {
            select: { unitNumber: true, type: true, area: true, city: true, district: true },
          },
          tenant: {
            select: {
              companyName: true,
              vatNumber: true,
              commercialRegistry: true,
              nationalAddress: true,
            },
          },
        },
      });
      if (!contract) throw new ContractSignatoryError(CONTRACT_NOT_FOUND);

      // 2. signatory exists in same tenant (unknown/foreign-tenant -> same
      // fail-closed outcome so tenant existence is never leaked).
      const signatory = await (tx as any).contractSignatory.findFirst({
        where: { id: signatoryId, tenantId },
      });
      if (!signatory) throw new ContractSignatoryError(CONTRACT_SIGNATORY_NOT_FOUND);

      // 3. signatory.contractId == contractId.
      if (signatory.contractId !== contractId) {
        throw new ContractSignatoryError(CONTRACT_SIGNATORY_CONTRACT_MISMATCH);
      }

      // 4. contract is eligible for signing. SIGNED is allowed through only
      // so an idempotent replay of the completing signature can be recognized
      // by signSignatoryAndMaybeFinalizeInTx without a false rejection.
      const contractAlreadySigned =
        contract.status === CONTRACT_STATUS.SIGNED && Boolean(contract.signedAt);
      if (!contractAlreadySigned) {
        if (contract.status !== CONTRACT_STATUS.PENDING_SIGNATURE) {
          throw new Error("Contract is not available for signing.");
        }
        if (contract.reservationExpiresAt && contract.reservationExpiresAt < new Date()) {
          throw new Error("Contract reservation has expired.");
        }
      }

      // 5. evidence already passed fail-closed normalization above.
      const outcome = await signSignatoryAndMaybeFinalizeInTx(
        tx,
        { tenantId, userId, eventActorId, correlationId, receivable, revenue, vatPayable },
        contract,
        signatory,
        normalizedEvidence,
        signatureEvidenceHash,
        signedAt,
      );

      if (outcome.finalized) {
        return {
          finalized: true as const,
          contract: outcome.result.contract,
          paymentPlan: outcome.result.paymentPlan,
          invoice: outcome.result.invoice,
          installments: outcome.result.installments,
          signatureEvidenceHash: outcome.result.signatureEvidenceHash,
          idempotent: outcome.result.idempotent,
          signatoryId: signatory.id,
          signatoryStatus: "SIGNED" as const,
          contractStatus: outcome.result.contract.status as string,
        };
      }

      return {
        finalized: false as const,
        contract,
        signatoryId: signatory.id,
        signatoryStatus: "SIGNED" as const,
        idempotent: signatory.status === "SIGNED",
        contractStatus: CONTRACT_STATUS.PENDING_SIGNATURE as string,
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

function requiredConfigText(value: unknown, maxLength: number): string {
  if (typeof value !== "string") {
    throw new ContractSignatoryError(CONTRACT_SIGNATORY_CONFIG_INVALID);
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength) {
    throw new ContractSignatoryError(CONTRACT_SIGNATORY_CONFIG_INVALID);
  }
  return trimmed;
}

function normalizeConfigEntry(entry: unknown): {
  role: string;
  required: boolean;
  signerReference: string | null;
} {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    throw new ContractSignatoryError(CONTRACT_SIGNATORY_CONFIG_INVALID);
  }
  const value = entry as Record<string, unknown>;
  const role = requiredConfigText(value.role, 64);
  if (typeof value.required !== "boolean") {
    throw new ContractSignatoryError(CONTRACT_SIGNATORY_CONFIG_INVALID);
  }
  const signerReference =
    value.signerReference === undefined || value.signerReference === null
      ? null
      : requiredConfigText(value.signerReference, 200);
  return { role, required: value.required, signerReference };
}

/**
 * PUT /contracts/{id}/signatories (design-freeze item C/8/9/10): atomic
 * full-set replacement of the unsigned ContractSignatory set. The client
 * body carries only role/required/signerReference per entry — id, status,
 * signedAt, evidence hash, tenantId and contractId are always server-derived.
 * Allowed only while the contract is PENDING_SIGNATURE and no signatory has
 * signed yet; the input set must contain at least one row and at least one
 * required=true row, otherwise the whole call fails closed with no write.
 */
export async function configureContractSignatories(
  input: ConfigureContractSignatoriesInput,
) {
  const { tenantId, userId, contractId } = input;
  if (!userId) throw new Error("Authenticated user is required.");

  if (!Array.isArray(input.signatories) || input.signatories.length === 0) {
    throw new ContractSignatoryError(CONTRACT_SIGNATORY_CONFIG_EMPTY);
  }

  const normalized: ConfigureContractSignatoryEntry[] =
    input.signatories.map(normalizeConfigEntry);
  if (!normalized.some((row) => row.required)) {
    throw new ContractSignatoryError(CONTRACT_SIGNATORY_CONFIG_NO_REQUIRED);
  }

  return prisma.$transaction(
    async (tx) => {
      const contract = await tx.contract.findFirst({
        where: { id: contractId, tenantId },
      });
      if (!contract) throw new ContractSignatoryError(CONTRACT_NOT_FOUND);
      if (contract.status !== CONTRACT_STATUS.PENDING_SIGNATURE) {
        throw new ContractSignatoryError(CONTRACT_SIGNATORY_CONFIG_NOT_PENDING);
      }

      const existing = await tx.contractSignatory.findMany({
        where: { tenantId, contractId },
      });
      if (existing.some((row: any) => row.status === "SIGNED")) {
        throw new ContractSignatoryError(CONTRACT_SIGNATORY_CONFIG_LOCKED);
      }

      if (existing.length > 0) {
        await tx.contractSignatory.deleteMany({ where: { tenantId, contractId } });
      }

      const created: any[] = [];
      for (const row of normalized) {
        const signatory = await tx.contractSignatory.create({
          data: {
            tenantId,
            contractId,
            role: row.role,
            required: row.required,
            status: "PENDING",
            signerReference: row.signerReference,
          },
        });
        created.push(signatory);
      }

      await tx.auditLog.create({
        data: {
          tenantId,
          userId,
          action: "CONFIGURE_CONTRACT_SIGNATORIES",
          tableName: "contract_signatories",
          recordId: contract.id,
          details: JSON.stringify({
            contractId,
            signatoryCount: created.length,
            requiredCount: created.filter((row) => row.required).length,
            replacedExistingCount: existing.length,
          }),
        },
      });

      return { contract, signatories: created };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}
