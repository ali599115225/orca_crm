import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockOfferCreate,
  mockOfferFindFirst,
  mockOpportunityFindFirst,
  mockUnitFindFirst,
  mockContractCreate,
  mockContractFindUnique,
  mockLeadFindFirst,
  mockLeadUpdate,
  mockUnitUpdate,
  mockOpportunityUpdate,
  mockOfferUpdate,
  mockTelemetryCreate,
  mockAuditCreate,
  mockTransaction,
} = vi.hoisted(() => ({
  mockOfferCreate: vi.fn(),
  mockOfferFindFirst: vi.fn(),
  mockOpportunityFindFirst: vi.fn(),
  mockUnitFindFirst: vi.fn(),
  mockContractCreate: vi.fn(),
  mockContractFindUnique: vi.fn(),
  mockLeadFindFirst: vi.fn(),
  mockLeadUpdate: vi.fn(),
  mockUnitUpdate: vi.fn(),
  mockOpportunityUpdate: vi.fn(),
  mockOfferUpdate: vi.fn(),
  mockTelemetryCreate: vi.fn(),
  mockAuditCreate: vi.fn(),
  mockTransaction: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    offer: { create: mockOfferCreate, findFirst: mockOfferFindFirst, update: mockOfferUpdate },
    opportunity: { findFirst: mockOpportunityFindFirst, update: mockOpportunityUpdate },
    unit: { findFirst: mockUnitFindFirst, update: mockUnitUpdate },
    contract: { create: mockContractCreate, findUnique: mockContractFindUnique },
    lead: { findFirst: mockLeadFindFirst, update: mockLeadUpdate },
    telemetryEvent: { create: mockTelemetryCreate },
    auditLog: { create: mockAuditCreate },
    $transaction: mockTransaction,
  },
}));

vi.mock('@/lib/privacy-mask', () => ({
  hashPhone: vi.fn(() => 'hashed-phone'),
}));

import { createOffer } from '@/lib/domain/transaction-spine/create-offer';
import { acceptOfferAndCreateContract } from '@/lib/domain/transaction-spine/accept-offer';

describe('Offer Unit Integrity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTelemetryCreate.mockResolvedValue({});
    mockAuditCreate.mockResolvedValue({});
  });

  describe('createOffer', () => {
    it('creates offer with valid unitId', async () => {
      const mockOffer = { id: 'offer-1', unitId: 'unit-1', price: 100000 };
      mockOpportunityFindFirst.mockResolvedValue({ id: 'opp-1', tenantId: 'tenant-1' });
      mockUnitFindFirst.mockResolvedValue({ id: 'unit-1', tenantId: 'tenant-1' });
      mockOfferCreate.mockResolvedValue(mockOffer);

      const result = await createOffer({
        tenantId: 'tenant-1',
        userId: 'user-1',
        opportunityId: 'opp-1',
        unitId: 'unit-1',
        price: 100000,
        validUntil: new Date(),
      });

      expect(mockOfferCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ unitId: 'unit-1' }),
        })
      );
      expect(result.unitId).toBe('unit-1');
    });

    it('rejects offer without unitId', async () => {
      await expect(
        createOffer({
          tenantId: 'tenant-1',
          userId: 'user-1',
          opportunityId: 'opp-1',
          unitId: '',
          price: 100000,
          validUntil: new Date(),
        })
      ).rejects.toThrow('Unit ID is required');
    });

    it('rejects unit from different tenant', async () => {
      mockOpportunityFindFirst.mockResolvedValue({ id: 'opp-1', tenantId: 'tenant-1' });
      mockUnitFindFirst.mockResolvedValue(null);

      await expect(
        createOffer({
          tenantId: 'tenant-1',
          userId: 'user-1',
          opportunityId: 'opp-1',
          unitId: 'wrong-tenant-unit',
          price: 100000,
          validUntil: new Date(),
        })
      ).rejects.toThrow('Unit not found in this tenant');
    });

    it('rejects non-existent unit', async () => {
      mockOpportunityFindFirst.mockResolvedValue({ id: 'opp-1', tenantId: 'tenant-1' });
      mockUnitFindFirst.mockResolvedValue(null);

      await expect(
        createOffer({
          tenantId: 'tenant-1',
          userId: 'user-1',
          opportunityId: 'opp-1',
          unitId: 'non-existent-unit',
          price: 100000,
          validUntil: new Date(),
        })
      ).rejects.toThrow('Unit not found in this tenant');
    });
  });

  describe('acceptOfferAndCreateContract', () => {
    it('uses offer.unitId as the only source for unit', async () => {
      const mockOffer = {
        id: 'offer-1',
        status: 'PENDING',
        validUntil: new Date(Date.now() + 86400000),
        unitId: 'unit-1',
        opportunity: { id: 'opp-1', leadId: 'lead-1' },
        price: 500000,
        auditLog: '',
      };
      const mockLead = { id: 'lead-1', firstName: 'John', lastName: 'Doe', phone: '123' };
      const mockContract = { id: 'contract-1', unitId: 'unit-1' };

      mockOfferFindFirst.mockResolvedValue({ ...mockOffer, tenantId: 'tenant-1' });
      mockUnitFindFirst.mockResolvedValue({ id: 'unit-1' });
      mockLeadFindFirst.mockResolvedValue(mockLead);

      const txMock = {
        contract: { create: vi.fn().mockResolvedValue(mockContract), findUnique: vi.fn().mockResolvedValue(null) },
        offer: { update: vi.fn().mockResolvedValue({ ...mockOffer, status: 'ACCEPTED' }) },
        lead: { update: vi.fn() },
        unit: { update: vi.fn() },
        opportunity: { update: vi.fn() },
        auditLog: { create: vi.fn() },
        telemetryEvent: { create: vi.fn() },
      };
      mockTransaction.mockImplementation(async (fn) => fn(txMock));

      const result = await acceptOfferAndCreateContract({
        tenantId: 'tenant-1',
        userId: 'user-1',
        offerId: 'offer-1',
      });

      expect(txMock.contract.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ unitId: 'unit-1' }),
        })
      );
      expect(result.contract.unitId).toBe('unit-1');
    });

    it('rejects offer without unitId', async () => {
      const mockOffer = {
        id: 'offer-1',
        status: 'PENDING',
        validUntil: new Date(Date.now() + 86400000),
        unitId: null,
        opportunity: { id: 'opp-1', leadId: 'lead-1' },
      };

      mockOfferFindFirst.mockResolvedValue({ ...mockOffer, tenantId: 'tenant-1' });

      await expect(
        acceptOfferAndCreateContract({
          tenantId: 'tenant-1',
          userId: 'user-1',
          offerId: 'offer-1',
        })
      ).rejects.toThrow('لا يمكن قبول هذا العرض');
    });

    it('does not fallback to random unit', async () => {
      const mockOffer = {
        id: 'offer-1',
        status: 'PENDING',
        validUntil: new Date(Date.now() + 86400000),
        unitId: null,
        opportunity: { id: 'opp-1', leadId: 'lead-1' },
      };

      mockOfferFindFirst.mockResolvedValue({ ...mockOffer, tenantId: 'tenant-1' });

      await expect(
        acceptOfferAndCreateContract({
          tenantId: 'tenant-1',
          userId: 'user-1',
          offerId: 'offer-1',
        })
      ).rejects.toThrow();

      // Verify no unit was searched for
      expect(mockUnitFindFirst).not.toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: 'Available' }) })
      );
    });

    it('rejects cross-tenant unit', async () => {
      const mockOffer = {
        id: 'offer-1',
        status: 'PENDING',
        validUntil: new Date(Date.now() + 86400000),
        unitId: 'wrong-tenant-unit',
        opportunity: { id: 'opp-1', leadId: 'lead-1' },
      };

      mockOfferFindFirst.mockResolvedValue({ ...mockOffer, tenantId: 'tenant-1' });
      mockUnitFindFirst.mockResolvedValue(null);

      await expect(
        acceptOfferAndCreateContract({
          tenantId: 'tenant-1',
          userId: 'user-1',
          offerId: 'offer-1',
        })
      ).rejects.toThrow('Unit not found in this tenant');
    });
  });
});
