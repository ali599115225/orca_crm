import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockTransaction,
  mockUserFindFirst,
  mockOfferFindFirst,
  mockOpportunityFindFirst,
  mockUnitFindFirst,
  mockLeadFindFirst,
  mockContactFindFirst,
} = vi.hoisted(() => ({
  mockTransaction: vi.fn(),
  mockUserFindFirst: vi.fn(),
  mockOfferFindFirst: vi.fn(),
  mockOpportunityFindFirst: vi.fn(),
  mockUnitFindFirst: vi.fn(),
  mockLeadFindFirst: vi.fn(),
  mockContactFindFirst: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findFirst: mockUserFindFirst },
    offer: { findFirst: mockOfferFindFirst },
    opportunity: { findFirst: mockOpportunityFindFirst },
    unit: { findFirst: mockUnitFindFirst },
    lead: { findFirst: mockLeadFindFirst },
    contact: { findFirst: mockContactFindFirst },
    $transaction: mockTransaction,
  },
}));

vi.mock("@/lib/domain/transaction-spine/validate-tenant", () => ({
  assertTenantOwnership: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/privacy-mask", () => ({
  hashPhone: vi.fn(() => "hashed-phone"),
}));

import {
  createOffer,
  issueContract,
  scheduleTour,
  updateTourStatus,
} from "@/lib/domain/transaction-spine";

describe("Domain Service Unification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserFindFirst.mockResolvedValue({ id: "user-1" });
  });

  it("creates a tour and telemetry inside one transaction", async () => {
    const startAt = new Date(Date.now() + 86_400_000);
    const endAt = new Date(startAt.getTime() + 3_600_000);
    const tour = { id: "tour-1", leadId: "lead-1", location: "Riyadh" };
    const tx = {
      tour: { create: vi.fn().mockResolvedValue(tour) },
      telemetryEvent: { create: vi.fn().mockResolvedValue({}) },
    };
    mockTransaction.mockImplementation(async (callback) => callback(tx));

    const result = await scheduleTour({
      tenantId: "tenant-1",
      userId: "user-1",
      leadId: "lead-1",
      location: "Riyadh",
      startAt,
      endAt,
    });

    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(tx.tour.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: "tenant-1",
          leadId: "lead-1",
          assignedTo: "user-1",
        }),
      }),
    );
    expect(tx.telemetryEvent.create).toHaveBeenCalledTimes(1);
    expect(result).toEqual(tour);
  });

  it("creates an offer through the transaction spine", async () => {
    const offer = {
      id: "offer-1",
      linkedOpportunityId: "opp-1",
      unitId: "unit-1",
      price: 100000,
    };
    const tx = {
      opportunity: {
        findFirst: vi.fn().mockResolvedValue({
          id: "opp-1",
          tenantId: "tenant-1",
          unitId: "unit-1",
        }),
        update: vi.fn(),
      },
      unit: {
        findFirst: vi.fn().mockResolvedValue({
          id: "unit-1",
          tenantId: "tenant-1",
          status: "Available",
          contract: null,
        }),
      },
      offer: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue(offer),
      },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
      telemetryEvent: { create: vi.fn().mockResolvedValue({}) },
    };
    mockTransaction.mockImplementation(async (callback) => callback(tx));

    const result = await createOffer({
      tenantId: "tenant-1",
      userId: "user-1",
      opportunityId: "opp-1",
      unitId: "unit-1",
      price: 100000,
      validUntil: new Date(Date.now() + 86_400_000),
    });

    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(tx.offer.create).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ id: "offer-1", idempotent: false });
  });

  it("issues a direct contract through one transaction", async () => {
    const contract = {
      id: "contract-1",
      tenantId: "tenant-1",
      unitId: "unit-1",
      leadId: "lead-1",
      offerId: null,
      buyerName: "John Doe",
      buyerPhone: "0500000000",
      totalVolumeSar: 500000,
      vatType: "STANDARD",
      acceptedAt: new Date(),
      status: "PENDING_SIGNATURE",
      spineVersion: 2,
      legacyFinancial: false,
    };
    mockLeadFindFirst.mockResolvedValue({
      id: "lead-1",
      tenantId: "tenant-1",
      firstName: "John",
      lastName: "Doe",
      phone: "0500000000",
    });
    const tx = {
      unit: {
        findFirst: vi.fn().mockResolvedValue({ id: "unit-1", contract: null }),
        update: vi.fn().mockResolvedValue({}),
      },
      contract: { create: vi.fn().mockResolvedValue(contract) },
      lead: { update: vi.fn().mockResolvedValue({}) },
      paymentPlan: {
        findFirst: vi.fn().mockResolvedValue(null),
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: "plan-1" }),
      },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
      telemetryEvent: { create: vi.fn().mockResolvedValue({}) },
    };
    mockTransaction.mockImplementation(async (callback) => callback(tx));

    const result = await issueContract({
      tenantId: "tenant-1",
      userId: "user-1",
      clientId: "lead-1",
      propertyId: "unit-1",
      amount: 500000,
    });

    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(tx.contract.create).toHaveBeenCalledTimes(1);
    expect(result).toEqual(contract);
  });

  it("updates tour status and follow-up work inside one transaction", async () => {
    const tour = {
      id: "tour-1",
      tenantId: "tenant-1",
      leadId: "lead-1",
      assignedTo: "user-1",
      opportunityId: null,
      offerId: null,
      status: "SCHEDULED",
      updatedAt: new Date(),
      auditLog: "",
    };
    const tx = {
      tour: {
        findFirst: vi.fn().mockResolvedValue(tour),
        update: vi.fn().mockResolvedValue({ ...tour, status: "COMPLETED" }),
      },
      task: { create: vi.fn().mockResolvedValue({ id: "task-1" }) },
      lead: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      telemetryEvent: { create: vi.fn().mockResolvedValue({}) },
    };
    mockTransaction.mockImplementation(async (callback) => callback(tx));

    const result = await updateTourStatus({
      tenantId: "tenant-1",
      userId: "user-1",
      tourId: "tour-1",
      status: "COMPLETED",
    });

    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(tx.task.create).toHaveBeenCalledTimes(1);
    expect(tx.lead.updateMany).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ followUpCreated: true, taskId: "task-1" });
  });
});
