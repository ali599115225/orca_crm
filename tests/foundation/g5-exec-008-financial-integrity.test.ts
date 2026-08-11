import { describe, expect, it } from "vitest";
import type {
  ContractFinanceActorContext,
  FinancialObligation,
  IdempotencyRecord,
  PaymentAllocation,
  PaymentEvidence,
  PaymentRecord,
  RefundRequest,
  ScopedResource,
} from "@/lib/contract-finance/contracts";
import type {
  ContractFinanceRepository,
  ContractFinanceTransaction,
} from "@/lib/contract-finance/repository";
import { ContractFinanceService } from "@/lib/contract-finance/service";

const tenantId = "11111111-1111-4111-8111-111111111111";
const initiatorId = "22222222-2222-4222-8222-222222222222";
const approverId = "33333333-3333-4333-8333-333333333333";
const obligationId = "44444444-4444-4444-8444-444444444444";
const evidenceId = "55555555-5555-4555-8555-555555555555";

const scope: ScopedResource = {
  tenantId,
  resourceType: "INVOICE",
  resourceId: "invoice-1001",
};

function actor(userId: string, role: "ACCOUNTANT_COLLECTOR" | "FINANCE_MANAGER"): ContractFinanceActorContext {
  return {
    tenantId,
    userId,
    assignments: [
      {
        id: userId === initiatorId
          ? "66666666-6666-4666-8666-666666666666"
          : "77777777-7777-4777-8777-777777777777",
        tenantId,
        userId,
        securityRole: role,
        scopeType: "COMPANY",
        active: true,
      },
    ],
    now: new Date("2026-08-11T00:00:00.000Z"),
  };
}

class FinancialFixtureRepository implements ContractFinanceRepository {
  readonly idempotency = new Map<string, IdempotencyRecord>();
  readonly payments = new Map<string, PaymentRecord>();
  readonly allocations: PaymentAllocation[] = [];
  readonly refunds = new Map<string, RefundRequest>();
  obligation: FinancialObligation = {
    id: obligationId,
    tenantId,
    sourceType: "INVOICE",
    sourceId: "invoice-1001",
    amount: { currency: "SAR", minorUnits: 10_000 },
    correctedMinorUnits: 0,
    allocatedMinorUnits: 0,
    finalized: true,
    scope,
  };
  evidence: PaymentEvidence = {
    id: evidenceId,
    tenantId,
    provider: "TEST_PROVIDER",
    providerReference: "provider-ref-1",
    amount: { currency: "SAR", minorUnits: 4_000 },
    scope,
    verified: true,
    verifiedAt: new Date("2026-08-11T00:00:00.000Z"),
    payloadHash: "evidence-payload-hash",
  };

  async transaction<T>(work: (tx: ContractFinanceTransaction) => Promise<T>): Promise<T> {
    const self = this;
    const tx = {
      async findIdempotency(t: string, operation: string, keyHash: string) {
        return self.idempotency.get(`${t}:${operation}:${keyHash}`) ?? null;
      },
      async insertIdempotency(record: IdempotencyRecord) {
        self.idempotency.set(`${record.tenantId}:${record.operation}:${record.keyHash}`, record);
      },
      async findPaymentEvidence(t: string, id: string) {
        return t === tenantId && id === self.evidence.id ? self.evidence : null;
      },
      async findObligation(t: string, id: string) {
        return t === tenantId && id === self.obligation.id ? self.obligation : null;
      },
      async findPayment(t: string, id: string) {
        const value = self.payments.get(id) ?? null;
        return value?.tenantId === t ? value : null;
      },
      async insertPayment(payment: PaymentRecord) {
        self.payments.set(payment.id, payment);
      },
      async insertPaymentAllocation(allocation: PaymentAllocation) {
        self.allocations.push(allocation);
      },
      async allocatedMinorUnitsForObligation(t: string, id: string) {
        return self.allocations
          .filter((entry) => entry.tenantId === t && entry.obligationId === id)
          .reduce((sum, entry) => sum + entry.amount.minorUnits, 0);
      },
      async findRefund(t: string, id: string) {
        const value = self.refunds.get(id) ?? null;
        return value?.tenantId === t ? value : null;
      },
      async insertRefund(refund: RefundRequest) {
        self.refunds.set(refund.id, refund);
      },
      async markRefundApproved(input: { tenantId: string; refundId: string; approvedByUserId: string }) {
        const value = self.refunds.get(input.refundId);
        if (!value || value.tenantId !== input.tenantId) throw new Error("missing");
        const next = {
          ...value,
          state: "APPROVED" as const,
          approvedByUserId: input.approvedByUserId,
        };
        self.refunds.set(next.id, next);
        return next;
      },
      async refundedMinorUnitsForPayment(t: string, paymentId: string) {
        return [...self.refunds.values()]
          .filter(
            (entry) =>
              entry.tenantId === t &&
              entry.paymentId === paymentId &&
              ["REQUESTED", "APPROVED", "EXECUTED"].includes(entry.state),
          )
          .reduce((sum, entry) => sum + entry.amount.minorUnits, 0);
      },
    } as unknown as ContractFinanceTransaction;
    return work(tx);
  }
}

async function recordPayment(repository: FinancialFixtureRepository, idempotencyKey = "payment-1") {
  const service = new ContractFinanceService(repository);
  return service.recordVerifiedPayment({
    actor: actor(initiatorId, "ACCOUNTANT_COLLECTOR"),
    evidenceId,
    obligationId,
    amount: { currency: "SAR", minorUnits: 4_000 },
    scope,
    idempotencyKey,
  });
}

describe("EXEC-008 — financial integrity", () => {
  it("records only verified evidence, allocates exact minor units, and replays one payment result", async () => {
    const repository = new FinancialFixtureRepository();

    const first = await recordPayment(repository);
    const replay = await recordPayment(repository);

    expect(first.replayed).toBe(false);
    expect(replay.replayed).toBe(true);
    expect(replay.value.id).toBe(first.value.id);
    expect(repository.payments.size).toBe(1);
    expect(repository.allocations).toHaveLength(1);
    expect(repository.allocations[0]?.amount).toEqual({ currency: "SAR", minorUnits: 4_000 });
  });

  it("fails closed for unverified evidence, currency mismatch, and over-allocation", async () => {
    const repository = new FinancialFixtureRepository();
    const service = new ContractFinanceService(repository);
    const paymentActor = actor(initiatorId, "ACCOUNTANT_COLLECTOR");

    repository.evidence = { ...repository.evidence, verified: false, verifiedAt: null };
    await expect(
      service.recordVerifiedPayment({
        actor: paymentActor,
        evidenceId,
        obligationId,
        amount: { currency: "SAR", minorUnits: 4_000 },
        scope,
        idempotencyKey: "unverified",
      }),
    ).rejects.toThrow(/verified payment evidence is required/i);

    repository.evidence = {
      ...repository.evidence,
      verified: true,
      verifiedAt: paymentActor.now ?? new Date(),
      amount: { currency: "USD", minorUnits: 4_000 },
    };
    await expect(
      service.recordVerifiedPayment({
        actor: paymentActor,
        evidenceId,
        obligationId,
        amount: { currency: "USD", minorUnits: 4_000 },
        scope,
        idempotencyKey: "currency-mismatch",
      }),
    ).rejects.toThrow(/currency mismatch/i);

    repository.evidence = {
      ...repository.evidence,
      amount: { currency: "SAR", minorUnits: 11_000 },
    };
    await expect(
      service.recordVerifiedPayment({
        actor: paymentActor,
        evidenceId,
        obligationId,
        amount: { currency: "SAR", minorUnits: 11_000 },
        scope,
        idempotencyKey: "over-allocation",
      }),
    ).rejects.toThrow(/exceeds remaining obligation/i);
    expect(repository.payments.size).toBe(0);
    expect(repository.allocations).toHaveLength(0);
  });

  it("fails closed when payment evidence or obligation scope differs from the command scope", async () => {
    const repository = new FinancialFixtureRepository();
    const service = new ContractFinanceService(repository);
    const paymentActor = actor(initiatorId, "ACCOUNTANT_COLLECTOR");

    repository.evidence = {
      ...repository.evidence,
      scope: { ...scope, resourceId: "invoice-other" },
    };
    await expect(
      service.recordVerifiedPayment({
        actor: paymentActor,
        evidenceId,
        obligationId,
        amount: { currency: "SAR", minorUnits: 4_000 },
        scope,
        idempotencyKey: "evidence-scope-mismatch",
      }),
    ).rejects.toThrow(/payment evidence scope mismatch/i);

    repository.evidence = { ...repository.evidence, scope };
    repository.obligation = {
      ...repository.obligation,
      scope: { ...scope, resourceId: "invoice-other" },
    };
    await expect(
      service.recordVerifiedPayment({
        actor: paymentActor,
        evidenceId,
        obligationId,
        amount: { currency: "SAR", minorUnits: 4_000 },
        scope,
        idempotencyKey: "obligation-scope-mismatch",
      }),
    ).rejects.toThrow(/financial obligation scope mismatch/i);

    expect(repository.payments.size).toBe(0);
    expect(repository.allocations).toHaveLength(0);
  });

  it("rejects conflicting payment idempotency payload without money movement", async () => {
    const repository = new FinancialFixtureRepository();
    const service = new ContractFinanceService(repository);
    const paymentActor = actor(initiatorId, "ACCOUNTANT_COLLECTOR");

    await recordPayment(repository, "payment-conflict");
    repository.evidence = {
      ...repository.evidence,
      amount: { currency: "SAR", minorUnits: 3_000 },
    };

    await expect(
      service.recordVerifiedPayment({
        actor: paymentActor,
        evidenceId,
        obligationId,
        amount: { currency: "SAR", minorUnits: 3_000 },
        scope,
        idempotencyKey: "payment-conflict",
      }),
    ).rejects.toThrow(/conflicting payload/i);
    expect(repository.payments.size).toBe(1);
    expect(repository.allocations).toHaveLength(1);
  });

  it("requires independent authority for refund approval and preserves separate refund truth", async () => {
    const repository = new FinancialFixtureRepository();
    const service = new ContractFinanceService(repository);
    const payment = await recordPayment(repository);

    const initiated = await service.initiateRefund({
      actor: actor(initiatorId, "ACCOUNTANT_COLLECTOR"),
      paymentId: payment.value.id,
      amount: { currency: "SAR", minorUnits: 1_000 },
      reason: "customer correction",
      scope,
      idempotencyKey: "refund-init-1",
    });

    await expect(
      service.approveRefund({
        actor: actor(initiatorId, "FINANCE_MANAGER"),
        refundId: initiated.value.id,
        scope,
        idempotencyKey: "refund-self-approve",
      }),
    ).rejects.toThrow(/authority denied.*SEPARATION_OF_DUTIES_DENIED/i);

    const approved = await service.approveRefund({
      actor: actor(approverId, "FINANCE_MANAGER"),
      refundId: initiated.value.id,
      scope,
      idempotencyKey: "refund-approve-1",
    });

    expect(approved.value.state).toBe("APPROVED");
    expect(approved.value.initiatedByUserId).toBe(initiatorId);
    expect(approved.value.approvedByUserId).toBe(approverId);
    expect(repository.payments.get(payment.value.id)).toEqual(payment.value);
    expect(repository.refunds.size).toBe(1);
  });

  it("fails closed for refund scope mismatch, missing initiator evidence, and non-approver authority", async () => {
    const repository = new FinancialFixtureRepository();
    const service = new ContractFinanceService(repository);
    const payment = await recordPayment(repository, "payment-refund-denials");

    await expect(
      service.initiateRefund({
        actor: actor(initiatorId, "ACCOUNTANT_COLLECTOR"),
        paymentId: payment.value.id,
        amount: { currency: "SAR", minorUnits: 500 },
        reason: "wrong scope",
        scope: { ...scope, resourceId: "invoice-other" },
        idempotencyKey: "refund-wrong-scope",
      }),
    ).rejects.toThrow(/refund payment scope mismatch/i);

    const initiated = await service.initiateRefund({
      actor: actor(initiatorId, "ACCOUNTANT_COLLECTOR"),
      paymentId: payment.value.id,
      amount: { currency: "SAR", minorUnits: 500 },
      reason: "approval required",
      scope,
      idempotencyKey: "refund-missing-initiator",
    });

    repository.refunds.set(initiated.value.id, {
      ...initiated.value,
      initiatedByUserId: "",
    });
    await expect(
      service.approveRefund({
        actor: actor(approverId, "FINANCE_MANAGER"),
        refundId: initiated.value.id,
        scope,
        idempotencyKey: "refund-approve-missing-initiator",
      }),
    ).rejects.toThrow(/SEPARATION_OF_DUTIES_DENIED/i);

    repository.refunds.set(initiated.value.id, initiated.value);
    const unauthorizedApprover = actor(approverId, "ACCOUNTANT_COLLECTOR");
    await expect(
      service.approveRefund({
        actor: unauthorizedApprover,
        refundId: initiated.value.id,
        scope,
        idempotencyKey: "refund-approve-role-denied",
      }),
    ).rejects.toThrow(/ROLE_PERMISSION_DENIED/i);

    expect(repository.refunds.get(initiated.value.id)?.state).toBe("REQUESTED");
  });

  it("replays refund initiation and denies conflicting reuse of the same key", async () => {
    const repository = new FinancialFixtureRepository();
    const service = new ContractFinanceService(repository);
    const payment = await recordPayment(repository);
    const refundActor = actor(initiatorId, "ACCOUNTANT_COLLECTOR");
    const command = {
      actor: refundActor,
      paymentId: payment.value.id,
      amount: { currency: "SAR", minorUnits: 500 },
      reason: "duplicate collection",
      scope,
      idempotencyKey: "refund-replay",
    };

    const first = await service.initiateRefund(command);
    const replay = await service.initiateRefund(command);
    expect(replay.replayed).toBe(true);
    expect(replay.value.id).toBe(first.value.id);
    expect(repository.refunds.size).toBe(1);

    await expect(
      service.initiateRefund({ ...command, reason: "different reason" }),
    ).rejects.toThrow(/conflicting payload/i);
    expect(repository.refunds.size).toBe(1);
  });
});
