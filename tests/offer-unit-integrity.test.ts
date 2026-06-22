import fs from "node:fs";
import path from "node:path";
import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockOfferCreate,
  mockOfferFindFirst,
  mockOpportunityFindFirst,
  mockUnitFindFirst,
  mockLeadFindFirst,
  mockTourCreate,
  mockTelemetryCreate,
  mockTransaction,
} = vi.hoisted(() => ({
  mockOfferCreate: vi.fn(),
  mockOfferFindFirst: vi.fn(),
  mockOpportunityFindFirst: vi.fn(),
  mockUnitFindFirst: vi.fn(),
  mockLeadFindFirst: vi.fn(),
  mockTourCreate: vi.fn(),
  mockTelemetryCreate: vi.fn(),
  mockTransaction: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    offer: {
      create: mockOfferCreate,
      findFirst: mockOfferFindFirst,
    },
    opportunity: {
      findFirst: mockOpportunityFindFirst,
    },
    unit: {
      findFirst: mockUnitFindFirst,
    },
    lead: {
      findFirst: mockLeadFindFirst,
    },
    tour: {
      create: mockTourCreate,
    },
    telemetryEvent: {
      create: mockTelemetryCreate,
    },
    $transaction: mockTransaction,
  },
}));

vi.mock("@/lib/privacy-mask", () => ({
  hashPhone: vi.fn(() => "hashed-phone"),
}));

import { createOffer } from "@/lib/domain/transaction-spine/create-offer";
import { scheduleTour } from "@/lib/domain/transaction-spine/schedule-tour";
import { acceptOfferAndCreateContract } from "@/lib/domain/transaction-spine/accept-offer";

const future = () => new Date(Date.now() + 86_400_000);

function createOfferTx() {
  let sequence = 0;
  const dealPassport = {
    id: "deal-1",
    tenantId: "tenant-1",
    opportunityId: "opp-1",
    contractId: null,
    currentOfferId: null,
    status: "OPEN",
    version: 0,
    lastSequence: 0,
  };

  return {
    opportunity: {
      findFirst: mockOpportunityFindFirst,
      update: vi.fn().mockResolvedValue({}),
    },
    unit: {
      findFirst: mockUnitFindFirst,
    },
    offer: {
      findFirst: mockOfferFindFirst,
      create: mockOfferCreate,
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({}),
    },
    telemetryEvent: {
      create: mockTelemetryCreate,
    },
    dealPassport: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue(dealPassport),
      findUnique: vi.fn(),
      update: vi.fn().mockImplementation(async ({ data }) => {
        if (data.lastSequence?.increment) sequence += data.lastSequence.increment;
        return {
          ...dealPassport,
          ...data,
          version: data.version?.increment ? sequence : dealPassport.version,
          lastSequence: sequence,
        };
      }),
    },
    dealEvent: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation(async ({ data }) => ({
        id: `event-${data.sequence}`,
        ...data,
      })),
    },
  };
}

describe("Offer Unit Integrity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTelemetryCreate.mockResolvedValue({});
    mockTransaction.mockImplementation(async (callback) =>
      callback(createOfferTx()),
    );
  });

  it("creates an offer from the same opportunity unit", async () => {
    mockOpportunityFindFirst.mockResolvedValue({
      id: "opp-1",
      tenantId: "tenant-1",
      unitId: "unit-1",
    });
    mockUnitFindFirst.mockResolvedValue({
      id: "unit-1",
      tenantId: "tenant-1",
      status: "Available",
      contract: null,
    });
    mockOfferFindFirst.mockResolvedValue(null);
    mockOfferCreate.mockResolvedValue({
      id: "offer-1",
      linkedOpportunityId: "opp-1",
      unitId: "unit-1",
    });

    const offer = await createOffer({
      tenantId: "tenant-1",
      userId: "user-1",
      opportunityId: "opp-1",
      unitId: "unit-1",
      price: 100000,
      validUntil: future(),
    });

    expect(offer.unitId).toBe("unit-1");
    expect(offer.idempotent).toBe(false);
    expect(mockOfferCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          linkedOpportunityId: "opp-1",
          unitId: "unit-1",
        }),
      }),
    );
    expect(mockTransaction).toHaveBeenCalledTimes(1);
  });

  it("rejects offer creation when opportunity has no unit and never falls back", async () => {
    await expect(
      createOffer({
        tenantId: "tenant-1",
        userId: "user-1",
        opportunityId: "opp-1",
        unitId: "",
        price: 100000,
        validUntil: future(),
      }),
    ).rejects.toThrow("Unit ID is required");

    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("rejects cross-tenant unit when creating an offer", async () => {
    mockOpportunityFindFirst.mockResolvedValue({
      id: "opp-1",
      tenantId: "tenant-1",
    });
    mockUnitFindFirst.mockResolvedValue(null);

    await expect(
      createOffer({
        tenantId: "tenant-1",
        userId: "user-1",
        opportunityId: "opp-1",
        unitId: "unit-other",
        price: 100000,
        validUntil: future(),
      }),
    ).rejects.toThrow("Unit not found in this tenant");
  });

  it("creates a tour from offer.unitId and links lead/opportunity/unit", async () => {
    mockOfferFindFirst.mockResolvedValue({
      id: "offer-1",
      tenantId: "tenant-1",
      linkedOpportunityId: "opp-1",
      unitId: "unit-1",
      opportunity: { id: "opp-1", leadId: "lead-1" },
    });
    mockOpportunityFindFirst.mockResolvedValue({
      id: "opp-1",
      tenantId: "tenant-1",
    });
    mockUnitFindFirst.mockResolvedValue({
      id: "unit-1",
      tenantId: "tenant-1",
    });
    mockLeadFindFirst.mockResolvedValue({
      id: "lead-1",
      tenantId: "tenant-1",
    });
    mockTourCreate.mockResolvedValue({
      id: "tour-1",
      leadId: "lead-1",
      opportunityId: "opp-1",
      unitId: "unit-1",
    });

    const tour = await scheduleTour({
      tenantId: "tenant-1",
      userId: "user-1",
      leadId: "",
      offerId: "offer-1",
      location: "Unit 1",
      startAt: future(),
      endAt: future(),
    });

    expect(tour.unitId).toBe("unit-1");
    expect(mockTourCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          leadId: "lead-1",
          opportunityId: "opp-1",
          unitId: "unit-1",
          offerId: "offer-1",
        }),
      }),
    );
  });

  it("blocks tours for legacy offers without a unit", async () => {
    mockOfferFindFirst.mockResolvedValue({
      id: "offer-legacy",
      tenantId: "tenant-1",
      linkedOpportunityId: "opp-1",
      unitId: null,
      opportunity: { id: "opp-1", leadId: "lead-1" },
    });

    await expect(
      scheduleTour({
        tenantId: "tenant-1",
        userId: "user-1",
        leadId: "",
        offerId: "offer-legacy",
        location: "Unit",
        startAt: future(),
        endAt: future(),
      }),
    ).rejects.toThrow("without a linked unit");
  });

  it("accepts an offer once and creates a reserved draft contract and payment plan", async () => {
    const offer = {
      id: "offer-1",
      tenantId: "tenant-1",
      status: "PENDING",
      validUntil: future(),
      unitId: "unit-1",
      linkedOpportunityId: "opp-1",
      opportunity: { id: "opp-1", leadId: "lead-1" },
      contract: null,
      price: 500000,
      auditLog: "",
    };
    const lead = {
      id: "lead-1",
      tenantId: "tenant-1",
      firstName: "Sara",
      lastName: "Ali",
      phone: "0500000000",
    };
    const contract = {
      id: "contract-1",
      tenantId: "tenant-1",
      leadId: "lead-1",
      offerId: "offer-1",
      unitId: "unit-1",
      status: "PENDING_SIGNATURE",
      spineVersion: 2,
      legacyFinancial: false,
    };
    const paymentPlan = {
      id: "plan-1",
      tenantId: "tenant-1",
      contractId: "contract-1",
      status: "DRAFT",
    };

    mockOfferFindFirst.mockResolvedValue({
      id: "offer-1",
      tenantId: "tenant-1",
    });

    let sequence = 0;
    const dealPassport = {
      id: "deal-1",
      tenantId: "tenant-1",
      opportunityId: "opp-1",
      contractId: null,
      currentOfferId: "offer-1",
      status: "OFFERED",
      version: 2,
      lastSequence: 2,
    };

    const tx = {
      offer: {
        findFirst: vi.fn().mockResolvedValue(offer),
        update: vi.fn().mockResolvedValue({ ...offer, status: "ACCEPTED" }),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      lead: {
        findFirst: vi.fn().mockResolvedValue(lead),
        update: vi.fn().mockResolvedValue({}),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      unit: {
        findFirst: vi.fn().mockResolvedValue({
          id: "unit-1",
          tenantId: "tenant-1",
          status: "Available",
          contract: null,
        }),
        update: vi.fn().mockResolvedValue({}),
      },
      contract: {
        create: vi.fn().mockResolvedValue(contract),
      },
      paymentPlan: {
        findUnique: vi.fn().mockResolvedValue(paymentPlan),
        create: vi.fn().mockResolvedValue(paymentPlan),
      },
      opportunity: {
        update: vi.fn().mockResolvedValue({
          id: "opp-1",
          status: "COMMITTED",
        }),
      },
      invoice: {
        count: vi.fn().mockResolvedValue(0),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({}),
      },
      telemetryEvent: {
        create: vi.fn().mockResolvedValue({}),
      },
      dealPassport: {
        findMany: vi.fn().mockResolvedValue([dealPassport]),
        create: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn().mockImplementation(async ({ data }) => {
          if (data.lastSequence?.increment) {
            sequence += data.lastSequence.increment;
          }
          return {
            ...dealPassport,
            ...data,
            version: data.version?.increment
              ? dealPassport.version + sequence
              : dealPassport.version,
            lastSequence: data.lastSequence?.increment
              ? dealPassport.lastSequence + sequence
              : dealPassport.lastSequence,
          };
        }),
      },
      dealEvent: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockImplementation(async ({ data }) => ({
          id: `event-${data.sequence}`,
          ...data,
        })),
      },
    };

    mockTransaction.mockImplementation(async (callback) => callback(tx));

    const result = await acceptOfferAndCreateContract({
      tenantId: "tenant-1",
      userId: "user-1",
      offerId: "offer-1",
    });

    expect(tx.contract.create).toHaveBeenCalledTimes(1);
    expect(tx.unit.update).toHaveBeenCalledWith({
      where: { id: "unit-1" },
      data: { status: "Reserved" },
    });
    expect(tx.opportunity.update).toHaveBeenCalledWith({
      where: { id: "opp-1" },
      data: { status: "COMMITTED", updatedBy: "user-1" },
    });
    expect(result.contract).toMatchObject({ id: "contract-1" });
    expect(result.paymentPlan).toMatchObject({ id: "plan-1" });
    expect(result.idempotent).toBe(false);
    expect(tx.dealEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: "offer.accepted",
          sequence: 3,
        }),
      }),
    );
    expect(tx.dealEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: "contract.issued",
          sequence: 4,
        }),
      }),
    );
  });

  it("is idempotent when accepting an already accepted Phase 1 offer", async () => {
    const paymentPlan = {
      id: "plan-1",
      contractId: "contract-1",
      status: "DRAFT",
    };
    const contract = {
      id: "contract-1",
      offerId: "offer-1",
      leadId: "lead-1",
      unitId: "unit-1",
      spineVersion: 2,
      legacyFinancial: false,
      paymentPlan,
    };
    const acceptedOffer = {
      id: "offer-1",
      tenantId: "tenant-1",
      status: "ACCEPTED",
      validUntil: future(),
      unitId: "unit-1",
      linkedOpportunityId: "opp-1",
      opportunity: { id: "opp-1", leadId: "lead-1" },
      contract,
      price: 500000,
      auditLog: "",
    };

    mockOfferFindFirst.mockResolvedValue({
      id: "offer-1",
      tenantId: "tenant-1",
    });

    const tx = {
      offer: {
        findFirst: vi.fn().mockResolvedValue(acceptedOffer),
        update: vi.fn(),
      },
      lead: {
        findFirst: vi.fn().mockResolvedValue({
          id: "lead-1",
          tenantId: "tenant-1",
          firstName: "Sara",
          lastName: "Ali",
          phone: "0500000000",
        }),
      },
      paymentPlan: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
    };

    mockTransaction.mockImplementation(async (callback) => callback(tx));

    const result = await acceptOfferAndCreateContract({
      tenantId: "tenant-1",
      userId: "user-1",
      offerId: "offer-1",
    });

    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(tx.offer.update).not.toHaveBeenCalled();
    expect(tx.paymentPlan.findUnique).not.toHaveBeenCalled();
    expect(result.idempotent).toBe(true);
    expect(result.contract).toMatchObject({ id: "contract-1" });
    expect(result.paymentPlan).toMatchObject({ id: "plan-1" });
  });

  it("uses the active /operations/leads page and LeadsWorkspace, not the inactive detail route", () => {
    const root = process.cwd();
    const page = fs.readFileSync(
      path.join(root, "app/operations/leads/page.tsx"),
      "utf8",
    );
    const workspace = fs.readFileSync(
      path.join(root, "components/views/LeadsWorkspace.tsx"),
      "utf8",
    );

    expect(page).toContain("LeadsWorkspace");
    expect(workspace).toContain("POST");
    expect(workspace).toContain(
      "/api/v1/opportunities/${selectedOpportunity.id}/offers",
    );
    expect(workspace).toContain("/api/v1/tours");
    expect(workspace).not.toContain("LeadDetailClient");
  });
});
