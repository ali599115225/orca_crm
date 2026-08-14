import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockTransaction,
  mockAssertTenantOwnership,
  mockCreateContractInTx,
  mockEnsureDefaultPaymentPlanInTx,
  mockEnsureDealCorrelationId,
  mockResolveDealInTx,
  mockAppendDealEventInTx,
} = vi.hoisted(() => ({
  mockTransaction: vi.fn(),
  mockAssertTenantOwnership: vi.fn(),
  mockCreateContractInTx: vi.fn(),
  mockEnsureDefaultPaymentPlanInTx: vi.fn(),
  mockEnsureDealCorrelationId: vi.fn(() => "correlation-1"),
  mockResolveDealInTx: vi.fn(),
  mockAppendDealEventInTx: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { $transaction: mockTransaction },
}));

vi.mock("@/lib/domain/transaction-spine/validate-tenant", () => ({
  assertTenantOwnership: mockAssertTenantOwnership,
}));

vi.mock("@/lib/domain/transaction-spine/issue-contract", () => ({
  _createContractInTx: mockCreateContractInTx,
}));

vi.mock("@/lib/domain/transaction-spine/payment-plan", () => ({
  ensureDefaultPaymentPlanInTx: mockEnsureDefaultPaymentPlanInTx,
}));

vi.mock("@/lib/domain/deal-passport", () => ({
  ensureDealCorrelationId: mockEnsureDealCorrelationId,
  resolveDealInTx: mockResolveDealInTx,
  appendDealEventInTx: mockAppendDealEventInTx,
}));

import { acceptOfferAndCreateContract } from "@/lib/domain/transaction-spine/accept-offer";

const future = () => new Date(Date.now() + 86_400_000);

const paymentPlan = {
  id: "plan-1",
  tenantId: "tenant-1",
  contractId: "contract-1",
  status: "DRAFT",
};

const contract = {
  id: "contract-1",
  tenantId: "tenant-1",
  unitId: "unit-1",
  leadId: "lead-1",
  offerId: "offer-accepted",
  status: "PENDING_SIGNATURE",
  spineVersion: 2,
  legacyFinancial: false,
  paymentPlan,
};

const lead = {
  id: "lead-1",
  tenantId: "tenant-1",
  firstName: "Sara",
  lastName: "Ali",
  phone: "0500000000",
};

function makeOffer(withContract: boolean) {
  return {
    id: "offer-accepted",
    tenantId: "tenant-1",
    status: "PENDING",
    validUntil: future(),
    unitId: "unit-1",
    price: 500000,
    auditLog: "accepted-offer-history",
    opportunity: { id: "opp-1", leadId: "lead-1" },
    contract: withContract ? contract : null,
  };
}

function makeCompetitors() {
  return [
    { id: "competitor-pending", status: "PENDING", auditLog: "pending-history" },
    { id: "competitor-sent", status: "SENT", auditLog: "sent-history" },
    { id: "competitor-negotiation", status: "NEGOTIATION", auditLog: "negotiation-history" },
  ];
}

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function createAcceptanceHarness(withContract: boolean) {
  const offer = makeOffer(withContract);
  const competitors = makeCompetitors();
  const operationLog: string[] = [];
  const cancellationGates = new Map(
    competitors.map((competitor) => [competitor.id, deferred()]),
  );

  const tx = {
    offer: {
      findFirst: vi.fn().mockResolvedValue(offer),
      findMany: vi.fn().mockImplementation(async () =>
        competitors
          .filter((item) => ["PENDING", "SENT", "NEGOTIATION"].includes(item.status))
          .map(({ id, auditLog }) => ({ id, auditLog })),
      ),
      update: vi.fn().mockImplementation(async ({ where, data }) => {
        if (where.id === offer.id) {
          Object.assign(offer, data);
          operationLog.push(`accept:${offer.id}`);
          return { ...offer };
        }
        const competitor = competitors.find((item) => item.id === where.id);
        if (!competitor) throw new Error(`unexpected offer update: ${where.id}`);
        const gate = cancellationGates.get(competitor.id);
        if (!gate) throw new Error(`missing cancellation gate: ${competitor.id}`);
        await gate.promise;
        Object.assign(competitor, data);
        operationLog.push(`cancel:${competitor.id}`);
        return { ...competitor };
      }),
    },
    lead: {
      findFirst: vi.fn().mockResolvedValue(lead),
    },
    unit: {
      findFirst: vi.fn().mockResolvedValue({
        id: "unit-1",
        tenantId: "tenant-1",
        contract: null,
      }),
    },
    paymentPlan: {
      findFirst: vi.fn().mockResolvedValue(paymentPlan),
    },
    opportunity: {
      update: vi.fn().mockResolvedValue({ id: "opp-1", status: "COMMITTED" }),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({}),
    },
  };

  return { offer, competitors, operationLog, cancellationGates, tx };
}

function expectCompetitorsSuperseded(
  competitors: ReturnType<typeof makeCompetitors>,
) {
  expect(competitors).toEqual([
    expect.objectContaining({
      id: "competitor-pending",
      status: "CANCELLED",
      auditLog: expect.stringContaining("pending-history"),
    }),
    expect.objectContaining({
      id: "competitor-sent",
      status: "CANCELLED",
      auditLog: expect.stringContaining("sent-history"),
    }),
    expect.objectContaining({
      id: "competitor-negotiation",
      status: "CANCELLED",
      auditLog: expect.stringContaining("negotiation-history"),
    }),
  ]);

  for (const competitor of competitors) {
    expect(competitor.auditLog).toContain(
      "Superseded by accepted offer offer-accepted",
    );
  }
}

async function completeCancellationsBeforeResult(
  harness: ReturnType<typeof createAcceptanceHarness>,
  resultPromise: ReturnType<typeof acceptOfferAndCreateContract>,
) {
  let settled = false;
  void resultPromise.finally(() => {
    settled = true;
  });

  await vi.waitFor(() => {
    expect(harness.tx.offer.update).toHaveBeenCalledTimes(2);
  });
  expect(settled).toBe(false);
  expect(harness.operationLog).toEqual(["accept:offer-accepted"]);

  harness.cancellationGates.get("competitor-pending")!.resolve();
  await vi.waitFor(() => {
    expect(harness.tx.offer.update).toHaveBeenCalledTimes(3);
  });
  expect(settled).toBe(false);
  expect(harness.operationLog).toEqual([
    "accept:offer-accepted",
    "cancel:competitor-pending",
  ]);

  harness.cancellationGates.get("competitor-sent")!.resolve();
  await vi.waitFor(() => {
    expect(harness.tx.offer.update).toHaveBeenCalledTimes(4);
  });
  expect(settled).toBe(false);
  expect(harness.operationLog).toEqual([
    "accept:offer-accepted",
    "cancel:competitor-pending",
    "cancel:competitor-sent",
  ]);

  harness.cancellationGates.get("competitor-negotiation")!.resolve();
  const result = await resultPromise;
  expect(settled).toBe(true);
  return result;
}

describe("post-closure offer acceptance remediation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAssertTenantOwnership.mockResolvedValue(undefined);
    mockResolveDealInTx.mockResolvedValue({ created: false, passport: null });
    mockAppendDealEventInTx.mockResolvedValue({ event: null });
    mockCreateContractInTx.mockResolvedValue(contract);
    mockEnsureDefaultPaymentPlanInTx.mockResolvedValue(paymentPlan);
  });

  it("cancels every acceptance-eligible competitor before returning an existing contract", async () => {
    const harness = createAcceptanceHarness(true);
    mockTransaction.mockImplementation(async (callback) => callback(harness.tx));

    const resultPromise = acceptOfferAndCreateContract({
      tenantId: "tenant-1",
      userId: "user-1",
      offerId: "offer-accepted",
    });
    const result = await completeCancellationsBeforeResult(harness, resultPromise);

    expect(result.idempotent).toBe(true);
    expect(result.offer.status).toBe("ACCEPTED");
    expect(result.contract.id).toBe("contract-1");
    expectCompetitorsSuperseded(harness.competitors);
    expect(harness.operationLog).toEqual([
      "accept:offer-accepted",
      "cancel:competitor-pending",
      "cancel:competitor-sent",
      "cancel:competitor-negotiation",
    ]);
    expect(mockCreateContractInTx).not.toHaveBeenCalled();
  });

  it("cancels every acceptance-eligible competitor before returning a newly created contract", async () => {
    const harness = createAcceptanceHarness(false);
    mockTransaction.mockImplementation(async (callback) => callback(harness.tx));

    const resultPromise = acceptOfferAndCreateContract({
      tenantId: "tenant-1",
      userId: "user-1",
      offerId: "offer-accepted",
    });
    const result = await completeCancellationsBeforeResult(harness, resultPromise);

    expect(result.idempotent).toBe(false);
    expect(result.offer.status).toBe("ACCEPTED");
    expect(result.contract.id).toBe("contract-1");
    expectCompetitorsSuperseded(harness.competitors);
    expect(harness.operationLog).toEqual([
      "accept:offer-accepted",
      "cancel:competitor-pending",
      "cancel:competitor-sent",
      "cancel:competitor-negotiation",
    ]);
    expect(mockCreateContractInTx).toHaveBeenCalledTimes(1);
  });
});
