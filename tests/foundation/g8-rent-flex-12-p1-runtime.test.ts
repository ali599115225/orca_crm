import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

vi.mock("server-only", () => ({}));

const { txMock, prismaMock } = vi.hoisted(() => {
  const tx = {
    unit: { findFirst: vi.fn() },
    lead: { findFirst: vi.fn() },
    rentFlexUnitConfig: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    rentFlexSelection: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    financeCase: { findFirst: vi.fn() },
    financeProviderOffer: { findFirst: vi.fn() },
    rentFlexOfferTerms: { findFirst: vi.fn(), create: vi.fn() },
    rentalLease: { findFirst: vi.fn() },
    rentFlexSettlement: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    auditLog: { create: vi.fn() },
  };

  return {
    txMock: tx,
    prismaMock: {
      ...tx,
      $transaction: vi.fn(async (callback: (tx: typeof tx) => unknown) =>
        callback(tx),
      ),
    },
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/tenant-context", () => ({
  requireTenantContext: vi.fn(() => ({
    tenantId: "tenant-1",
    userId: "actor-1",
  })),
}));
vi.mock("@/lib/domain/contract-finance/provider-offer-service", () => ({
  selectProviderOfferInTransaction: vi.fn(),
}));

import {
  attachRentFlexSelectionToLease,
  createDirectMonthlySelection,
  recordRentFlexSettlement,
} from "@/lib/domain/rental/rent-flex-12-service";
import { RentFlexP1Error } from "@/lib/domain/rental/rent-flex-12-persistence-contract";

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.$transaction.mockImplementation(
    async (callback: (tx: typeof txMock) => unknown) => callback(txMock),
  );
});

describe("RF12-P1 runtime command boundaries", () => {
  it("normalizes an invalid direct firstDueDate to the RF12-P1 error contract before DB work", async () => {
    let thrown: unknown;

    try {
      await createDirectMonthlySelection({
        tenantId: "tenant-1",
        unitId: "unit-1",
        annualRentAmount: 120_000,
        firstDueDate: "2026-02-30",
        actorId: "actor-1",
      });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(RentFlexP1Error);
    expect((thrown as RentFlexP1Error).code).toBe(
      "RENT_FLEX_P1_DATE_INVALID",
    );
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("keeps PARTIAL receivedAt null and stamps receivedAt only when the full expected settlement is received", async () => {
    const selection = {
      id: "selection-1",
      tenantId: "tenant-1",
      mode: "EXTERNAL_RNPL_12",
      status: "LOCKED",
      financeCaseId: "finance-1",
      selectedProviderOfferId: "offer-1",
      rentalLeaseId: null,
      currency: "SAR",
    };
    const terms = {
      id: "terms-1",
      ownerSettlementAmount: new Prisma.Decimal("75000.00"),
    };

    txMock.rentFlexSelection.findFirst.mockResolvedValue(selection);
    txMock.rentFlexOfferTerms.findFirst.mockResolvedValue(terms);
    txMock.rentFlexSettlement.findFirst.mockResolvedValueOnce(null);
    txMock.rentFlexSettlement.create.mockImplementation(async ({ data }) => ({
      id: "settlement-1",
      ...data,
    }));

    await recordRentFlexSettlement({
      tenantId: "tenant-1",
      selectionId: "selection-1",
      status: "PARTIAL",
      receivedAmount: 25_000,
      actorId: "actor-1",
    });

    const partialCreate = txMock.rentFlexSettlement.create.mock.calls[0][0];
    expect(partialCreate.data.receivedAt).toBeNull();
    expect(Number(partialCreate.data.receivedAmount)).toBe(25_000);

    txMock.rentFlexSettlement.findFirst.mockResolvedValueOnce({
      id: "settlement-1",
      status: "PARTIAL",
      receivedAmount: new Prisma.Decimal("25000.00"),
      receivedAt: null,
      providerReference: null,
    });
    txMock.rentFlexSettlement.update.mockImplementation(async ({ data }) => ({
      id: "settlement-1",
      ...data,
    }));

    await recordRentFlexSettlement({
      tenantId: "tenant-1",
      selectionId: "selection-1",
      status: "RECEIVED",
      receivedAmount: 75_000,
      actorId: "actor-1",
    });

    const receivedUpdate = txMock.rentFlexSettlement.update.mock.calls[0][0];
    expect(receivedUpdate.data.receivedAt).toBeInstanceOf(Date);
    expect(Number(receivedUpdate.data.receivedAmount)).toBe(75_000);

    let thrown: unknown;
    try {
      await recordRentFlexSettlement({
        tenantId: "tenant-1",
        selectionId: "selection-1",
        status: "RECEIVED",
        receivedAmount: 74_999,
        actorId: "actor-1",
      });
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(RentFlexP1Error);
    expect((thrown as RentFlexP1Error).code).toBe(
      "RENT_FLEX_P1_RECEIVED_SETTLEMENT_MUST_EQUAL_EXPECTED",
    );
  });

  it("synchronizes only the current selection's still-unbound settlement when a lease is attached later", async () => {
    txMock.rentFlexSelection.findFirst
      .mockResolvedValueOnce({
        id: "selection-1",
        tenantId: "tenant-1",
        unitId: "unit-1",
        status: "LOCKED",
        rentalLeaseId: null,
      })
      .mockResolvedValueOnce(null);
    txMock.rentalLease.findFirst.mockResolvedValue({
      id: "lease-1",
      tenantId: "tenant-1",
      unitId: "unit-1",
    });
    txMock.rentFlexSelection.update.mockResolvedValue({
      id: "selection-1",
      rentalLeaseId: "lease-1",
    });
    txMock.rentFlexSettlement.updateMany.mockResolvedValue({ count: 1 });

    await attachRentFlexSelectionToLease({
      tenantId: "tenant-1",
      selectionId: "selection-1",
      rentalLeaseId: "lease-1",
      actorId: "actor-1",
    });

    expect(txMock.rentFlexSettlement.updateMany).toHaveBeenCalledWith({
      where: {
        tenantId: "tenant-1",
        rentFlexSelectionId: "selection-1",
        rentalLeaseId: null,
      },
      data: {
        rentalLeaseId: "lease-1",
        updatedBy: "actor-1",
      },
    });
  });
});
