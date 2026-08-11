import { createHash, randomUUID } from "node:crypto";
import {
  assertPositiveMoney,
  assertSameCurrency,
  type ActivateContractVersionCommand,
  type ApproveRefundCommand,
  type ContractVersion,
  type IdempotencyRecord,
  type InitiateRefundCommand,
  type IssueContractVersionCommand,
  type PaymentRecord,
  type RecordVerifiedPaymentCommand,
  type RefundRequest,
  type SignContractVersionCommand,
} from "@/lib/contract-finance/contracts";
import { requireContractFinanceAuthority } from "@/lib/contract-finance/authority";
import type {
  ContractFinanceRepository,
  ContractFinanceTransaction,
} from "@/lib/contract-finance/repository";

const OPERATIONS = {
  ISSUE: "contract.issue",
  SIGN: "contract.sign",
  ACTIVATE: "contract.activate",
  PAYMENT: "payment.record-verified",
  REFUND_INITIATE: "refund.initiate",
  REFUND_APPROVE: "refund.approve",
} as const;

function canonicalize(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalize(entry)]),
    );
  }
  return value;
}

function digest(value: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(canonicalize(value)))
    .digest("hex");
}

function keyHash(tenantId: string, operation: string, key: string): string {
  const normalized = key.trim();
  if (!normalized) throw new Error("Idempotency key is required.");
  return digest({ tenantId, operation, key: normalized });
}

function sameScope(
  left: { tenantId: string; branchId?: string | null; departmentId?: string | null; teamId?: string | null; resourceType?: string | null; resourceId?: string | null },
  right: { tenantId: string; branchId?: string | null; departmentId?: string | null; teamId?: string | null; resourceType?: string | null; resourceId?: string | null },
): boolean {
  return (
    left.tenantId === right.tenantId &&
    (left.branchId ?? null) === (right.branchId ?? null) &&
    (left.departmentId ?? null) === (right.departmentId ?? null) &&
    (left.teamId ?? null) === (right.teamId ?? null) &&
    (left.resourceType ?? null) === (right.resourceType ?? null) &&
    (left.resourceId ?? null) === (right.resourceId ?? null)
  );
}

async function findReplay(
  tx: ContractFinanceTransaction,
  input: {
    tenantId: string;
    operation: string;
    idempotencyKey: string;
    payload: unknown;
  },
): Promise<IdempotencyRecord | null> {
  const hash = keyHash(input.tenantId, input.operation, input.idempotencyKey);
  const record = await tx.findIdempotency(input.tenantId, input.operation, hash);
  if (!record) return null;
  const payloadHash = digest(input.payload);
  if (record.payloadHash !== payloadHash) {
    throw new Error("Idempotency key was already used with a conflicting payload.");
  }
  return record;
}

async function persistIdempotency(
  tx: ContractFinanceTransaction,
  input: {
    tenantId: string;
    operation: string;
    idempotencyKey: string;
    payload: unknown;
    resultRef: string;
  },
): Promise<void> {
  await tx.insertIdempotency({
    tenantId: input.tenantId,
    operation: input.operation,
    keyHash: keyHash(input.tenantId, input.operation, input.idempotencyKey),
    payloadHash: digest(input.payload),
    resultRef: input.resultRef,
  });
}

export class ContractFinanceService {
  constructor(private readonly repository: ContractFinanceRepository) {}

  async issueContractVersion(command: IssueContractVersionCommand) {
    return this.repository.transaction(async (tx) => {
      const payload = {
        contractId: command.contractId,
        templateVersionId: command.templateVersionId,
        contentSnapshot: command.contentSnapshot,
        scope: command.scope,
      };
      const replay = await findReplay(tx, {
        tenantId: command.actor.tenantId,
        operation: OPERATIONS.ISSUE,
        idempotencyKey: command.idempotencyKey,
        payload,
      });
      if (replay) {
        const existing = await tx.findContractVersion(
          command.actor.tenantId,
          replay.resultRef,
        );
        if (!existing) throw new Error("Idempotent contract result is missing.");
        return { value: existing, replayed: true } as const;
      }

      requireContractFinanceAuthority({
        actor: command.actor,
        operation: "CONTRACT_WRITE",
        resource: command.scope,
      });

      if (command.scope.tenantId !== command.actor.tenantId) {
        throw new Error("Contract scope tenant mismatch.");
      }

      const template = await tx.findTemplateVersion(
        command.actor.tenantId,
        command.templateVersionId,
      );
      if (!template || !template.issuedAt) {
        throw new Error("Issued contract template version was not found.");
      }

      const current = await tx.findCurrentContractVersion(
        command.actor.tenantId,
        command.contractId,
      );
      if (current && !["ACTIVATED", "CANCELLED", "SUPERSEDED"].includes(current.state)) {
        throw new Error("Current contract version must be finalized before amendment.");
      }

      const now = command.actor.now ?? new Date();
      const version: ContractVersion = {
        id: randomUUID(),
        tenantId: command.actor.tenantId,
        contractId: command.contractId,
        version: (current?.version ?? 0) + 1,
        previousVersionId: current?.id ?? null,
        templateVersionId: template.id,
        templateContentHash: template.contentHash,
        contentHash: digest(command.contentSnapshot),
        contentSnapshot: command.contentSnapshot,
        state: "ISSUED",
        scope: command.scope,
        issuedAt: now,
        signedAt: null,
        acceptedAt: null,
        activatedAt: null,
      };

      await tx.insertContractVersion(version);
      await persistIdempotency(tx, {
        tenantId: command.actor.tenantId,
        operation: OPERATIONS.ISSUE,
        idempotencyKey: command.idempotencyKey,
        payload,
        resultRef: version.id,
      });
      return { value: version, replayed: false } as const;
    });
  }

  async signContractVersion(command: SignContractVersionCommand) {
    return this.repository.transaction(async (tx) => {
      const payload = {
        contractVersionId: command.contractVersionId,
        scope: command.scope,
      };
      const replay = await findReplay(tx, {
        tenantId: command.actor.tenantId,
        operation: OPERATIONS.SIGN,
        idempotencyKey: command.idempotencyKey,
        payload,
      });
      if (replay) {
        const existing = await tx.findContractVersion(
          command.actor.tenantId,
          replay.resultRef,
        );
        if (!existing) throw new Error("Idempotent sign result is missing.");
        return { value: existing, replayed: true } as const;
      }

      const version = await tx.findContractVersion(
        command.actor.tenantId,
        command.contractVersionId,
      );
      if (!version) throw new Error("Contract version not found.");
      if (version.state !== "ISSUED") {
        throw new Error("Only the current issued contract version can be signed.");
      }
      if (!sameScope(version.scope, command.scope)) {
        throw new Error("Contract signing scope mismatch.");
      }
      const current = await tx.findCurrentContractVersion(
        command.actor.tenantId,
        version.contractId,
      );
      if (!current || current.id !== version.id) {
        throw new Error("Stale contract version cannot be signed.");
      }

      const authority = requireContractFinanceAuthority({
        actor: command.actor,
        operation: "CONTRACT_SIGN",
        resource: version.scope,
      });
      const now = command.actor.now ?? new Date();
      const signed = await tx.markContractVersionSigned({
        tenantId: command.actor.tenantId,
        contractVersionId: version.id,
        signedAt: now,
        evidence: {
          actorUserId: command.actor.userId,
          assignmentId: authority.assignmentId,
          tenantId: command.actor.tenantId,
          resourceType: version.scope.resourceType,
          resourceId: version.scope.resourceId,
          capturedAt: now,
        },
      });
      await persistIdempotency(tx, {
        tenantId: command.actor.tenantId,
        operation: OPERATIONS.SIGN,
        idempotencyKey: command.idempotencyKey,
        payload,
        resultRef: signed.id,
      });
      return { value: signed, replayed: false } as const;
    });
  }

  async activateContractVersion(command: ActivateContractVersionCommand) {
    return this.repository.transaction(async (tx) => {
      const payload = {
        contractVersionId: command.contractVersionId,
        scope: command.scope,
      };
      const replay = await findReplay(tx, {
        tenantId: command.actor.tenantId,
        operation: OPERATIONS.ACTIVATE,
        idempotencyKey: command.idempotencyKey,
        payload,
      });
      if (replay) {
        const existing = await tx.findContractVersion(
          command.actor.tenantId,
          replay.resultRef,
        );
        if (!existing) throw new Error("Idempotent activation result is missing.");
        return { value: existing, replayed: true } as const;
      }

      const version = await tx.findContractVersion(
        command.actor.tenantId,
        command.contractVersionId,
      );
      if (!version) throw new Error("Contract version not found.");
      if (!sameScope(version.scope, command.scope)) {
        throw new Error("Contract activation scope mismatch.");
      }
      if (version.state !== "SIGNED" && version.state !== "ACCEPTED") {
        throw new Error("Contract version is not eligible for activation.");
      }
      const current = await tx.findCurrentContractVersion(
        command.actor.tenantId,
        version.contractId,
      );
      if (!current || current.id !== version.id) {
        throw new Error("Stale contract version cannot be activated.");
      }

      requireContractFinanceAuthority({
        actor: command.actor,
        operation: "CONTRACT_ACTIVATE",
        resource: version.scope,
      });
      const activated = await tx.markContractVersionActivated({
        tenantId: command.actor.tenantId,
        contractVersionId: version.id,
        activatedAt: command.actor.now ?? new Date(),
      });
      await persistIdempotency(tx, {
        tenantId: command.actor.tenantId,
        operation: OPERATIONS.ACTIVATE,
        idempotencyKey: command.idempotencyKey,
        payload,
        resultRef: activated.id,
      });
      return { value: activated, replayed: false } as const;
    });
  }

  async recordVerifiedPayment(command: RecordVerifiedPaymentCommand) {
    return this.repository.transaction(async (tx) => {
      const amount = assertPositiveMoney(command.amount);
      const payload = {
        evidenceId: command.evidenceId,
        obligationId: command.obligationId,
        amount,
        scope: command.scope,
      };
      const replay = await findReplay(tx, {
        tenantId: command.actor.tenantId,
        operation: OPERATIONS.PAYMENT,
        idempotencyKey: command.idempotencyKey,
        payload,
      });
      if (replay) {
        const existing = await tx.findPayment(command.actor.tenantId, replay.resultRef);
        if (!existing) throw new Error("Idempotent payment result is missing.");
        return { value: existing, replayed: true } as const;
      }

      requireContractFinanceAuthority({
        actor: command.actor,
        operation: "FINANCE_WRITE",
        resource: command.scope,
      });

      const evidence = await tx.findPaymentEvidence(
        command.actor.tenantId,
        command.evidenceId,
      );
      if (!evidence || !evidence.verified || !evidence.verifiedAt) {
        throw new Error("Verified payment evidence is required.");
      }
      if (!sameScope(evidence.scope, command.scope)) {
        throw new Error("Payment evidence scope mismatch.");
      }
      assertSameCurrency(evidence.amount, amount);
      if (evidence.amount.minorUnits !== amount.minorUnits) {
        throw new Error("Payment evidence amount mismatch.");
      }

      const obligation = await tx.findObligation(
        command.actor.tenantId,
        command.obligationId,
      );
      if (!obligation || !sameScope(obligation.scope, command.scope)) {
        throw new Error("Financial obligation scope mismatch.");
      }
      assertSameCurrency(obligation.amount, amount);
      const alreadyAllocated = await tx.allocatedMinorUnitsForObligation(
        command.actor.tenantId,
        obligation.id,
      );
      const netObligation = obligation.amount.minorUnits + obligation.correctedMinorUnits;
      const remaining = netObligation - alreadyAllocated;
      if (amount.minorUnits > remaining) {
        throw new Error("Payment allocation exceeds remaining obligation.");
      }

      const now = command.actor.now ?? new Date();
      const payment: PaymentRecord = {
        id: randomUUID(),
        tenantId: command.actor.tenantId,
        evidenceId: evidence.id,
        amount,
        scope: command.scope,
        completedAt: now,
      };
      await tx.insertPayment(payment);
      await tx.insertPaymentAllocation({
        id: randomUUID(),
        tenantId: command.actor.tenantId,
        paymentId: payment.id,
        obligationId: obligation.id,
        amount,
        createdAt: now,
      });
      await persistIdempotency(tx, {
        tenantId: command.actor.tenantId,
        operation: OPERATIONS.PAYMENT,
        idempotencyKey: command.idempotencyKey,
        payload,
        resultRef: payment.id,
      });
      return { value: payment, replayed: false } as const;
    });
  }

  async initiateRefund(command: InitiateRefundCommand) {
    return this.repository.transaction(async (tx) => {
      const amount = assertPositiveMoney(command.amount);
      const payload = {
        paymentId: command.paymentId,
        amount,
        reason: command.reason,
        scope: command.scope,
      };
      const replay = await findReplay(tx, {
        tenantId: command.actor.tenantId,
        operation: OPERATIONS.REFUND_INITIATE,
        idempotencyKey: command.idempotencyKey,
        payload,
      });
      if (replay) {
        const existing = await tx.findRefund(command.actor.tenantId, replay.resultRef);
        if (!existing) throw new Error("Idempotent refund result is missing.");
        return { value: existing, replayed: true } as const;
      }

      requireContractFinanceAuthority({
        actor: command.actor,
        operation: "REFUND_INITIATE",
        resource: command.scope,
      });
      const payment = await tx.findPayment(command.actor.tenantId, command.paymentId);
      if (!payment || !sameScope(payment.scope, command.scope)) {
        throw new Error("Refund payment scope mismatch.");
      }
      assertSameCurrency(payment.amount, amount);
      const refunded = await tx.refundedMinorUnitsForPayment(
        command.actor.tenantId,
        payment.id,
      );
      if (refunded + amount.minorUnits > payment.amount.minorUnits) {
        throw new Error("Refund exceeds refundable balance.");
      }
      if (!command.reason.trim()) throw new Error("Refund reason is required.");

      const refund: RefundRequest = {
        id: randomUUID(),
        tenantId: command.actor.tenantId,
        paymentId: payment.id,
        amount,
        reason: command.reason.trim(),
        initiatedByUserId: command.actor.userId,
        approvedByUserId: null,
        state: "REQUESTED",
        scope: command.scope,
      };
      await tx.insertRefund(refund);
      await persistIdempotency(tx, {
        tenantId: command.actor.tenantId,
        operation: OPERATIONS.REFUND_INITIATE,
        idempotencyKey: command.idempotencyKey,
        payload,
        resultRef: refund.id,
      });
      return { value: refund, replayed: false } as const;
    });
  }

  async approveRefund(command: ApproveRefundCommand) {
    return this.repository.transaction(async (tx) => {
      const payload = { refundId: command.refundId, scope: command.scope };
      const replay = await findReplay(tx, {
        tenantId: command.actor.tenantId,
        operation: OPERATIONS.REFUND_APPROVE,
        idempotencyKey: command.idempotencyKey,
        payload,
      });
      if (replay) {
        const existing = await tx.findRefund(command.actor.tenantId, replay.resultRef);
        if (!existing) throw new Error("Idempotent refund approval result is missing.");
        return { value: existing, replayed: true } as const;
      }

      const refund = await tx.findRefund(command.actor.tenantId, command.refundId);
      if (!refund || !sameScope(refund.scope, command.scope)) {
        throw new Error("Refund scope mismatch.");
      }
      if (refund.state !== "REQUESTED") {
        throw new Error("Refund is not pending approval.");
      }

      requireContractFinanceAuthority({
        actor: command.actor,
        operation: "REFUND_APPROVE",
        resource: refund.scope,
        initiatedByUserId: refund.initiatedByUserId,
      });

      const payment = await tx.findPayment(command.actor.tenantId, refund.paymentId);
      if (!payment) throw new Error("Original payment is missing.");
      const refunded = await tx.refundedMinorUnitsForPayment(
        command.actor.tenantId,
        payment.id,
      );
      if (refunded + refund.amount.minorUnits > payment.amount.minorUnits) {
        throw new Error("Refund exceeds refundable balance.");
      }

      const approved = await tx.markRefundApproved({
        tenantId: command.actor.tenantId,
        refundId: refund.id,
        approvedByUserId: command.actor.userId,
      });
      await persistIdempotency(tx, {
        tenantId: command.actor.tenantId,
        operation: OPERATIONS.REFUND_APPROVE,
        idempotencyKey: command.idempotencyKey,
        payload,
        resultRef: approved.id,
      });
      return { value: approved, replayed: false } as const;
    });
  }
}
