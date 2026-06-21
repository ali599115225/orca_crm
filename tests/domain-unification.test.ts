import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockTourCreate,
  mockOfferCreate,
  mockContractCreate,
  mockContractFindUnique,
  mockLeadFindFirst,
  mockLeadUpdate,
  mockUnitFindFirst,
  mockUnitUpdate,
  mockOpportunityFindFirst,
  mockOpportunityUpdate,
  mockOfferFindFirst,
  mockOfferUpdate,
  mockTelemetryCreate,
  mockAuditCreate,
  mockTransaction,
} = vi.hoisted(() => ({
  mockTourCreate: vi.fn(),
  mockOfferCreate: vi.fn(),
  mockContractCreate: vi.fn(),
  mockContractFindUnique: vi.fn(),
  mockLeadFindFirst: vi.fn(),
  mockLeadUpdate: vi.fn(),
  mockUnitFindFirst: vi.fn(),
  mockUnitUpdate: vi.fn(),
  mockOpportunityFindFirst: vi.fn(),
  mockOpportunityUpdate: vi.fn(),
  mockOfferFindFirst: vi.fn(),
  mockOfferUpdate: vi.fn(),
  mockTelemetryCreate: vi.fn(),
  mockAuditCreate: vi.fn(),
  mockTransaction: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    tour: { create: mockTourCreate },
    offer: { create: mockOfferCreate, findFirst: mockOfferFindFirst, update: mockOfferUpdate },
    contract: { create: mockContractCreate, findUnique: mockContractFindUnique },
    lead: { findFirst: mockLeadFindFirst, update: mockLeadUpdate },
    unit: { findFirst: mockUnitFindFirst, update: mockUnitUpdate },
    opportunity: { findFirst: mockOpportunityFindFirst, update: mockOpportunityUpdate },
    telemetryEvent: { create: mockTelemetryCreate },
    auditLog: { create: mockAuditCreate },
    $transaction: mockTransaction,
  },
}));

vi.mock('@/lib/privacy-mask', () => ({
  hashPhone: vi.fn(() => 'hashed-phone'),
}));

import { prisma } from '@/lib/prisma';
import { scheduleTour } from '@/lib/domain/transaction-spine/schedule-tour';
import { createOffer } from '@/lib/domain/transaction-spine/create-offer';
import { issueContract } from '@/lib/domain/transaction-spine/issue-contract';
import { acceptOfferAndCreateContract } from '@/lib/domain/transaction-spine/accept-offer';

describe('Domain Service Unification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTelemetryCreate.mockResolvedValue({});
    mockAuditCreate.mockResolvedValue({});
  });

  describe('scheduleTour', () => {
    it('creates tour via domain service', async () => {
      const mockTour = { id: 'tour-1', leadId: 'lead-1', location: 'Riyadh' };
      mockLeadFindFirst.mockResolvedValue({ id: 'lead-1', tenantId: 'tenant-1' });
      mockTourCreate.mockResolvedValue(mockTour);

      const result = await scheduleTour({
        tenantId: 'tenant-1',
        userId: 'user-1',
        leadId: 'lead-1',
        location: 'Riyadh',
        startAt: new Date(),
        endAt: new Date(),
      });

      expect(mockTourCreate).toHaveBeenCalledTimes(1);
      expect(mockTourCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: 'tenant-1',
            leadId: 'lead-1',
            location: 'Riyadh',
          }),
        })
      );
      expect(result).toEqual(mockTour);
    });
  });

  describe('createOffer', () => {
    it('creates offer via domain service', async () => {
      const mockOffer = { id: 'offer-1', linkedOpportunityId: 'opp-1', unitId: 'unit-1', price: 100000 };
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

      expect(mockOfferCreate).toHaveBeenCalledTimes(1);
      expect(mockOfferCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: 'tenant-1',
            linkedOpportunityId: 'opp-1',
            price: 100000,
          }),
        })
      );
      expect(result).toEqual(mockOffer);
    });
  });

  describe('issueContract', () => {
    it('creates contract via domain service', async () => {
      const mockContract = { id: 'contract-1', unitId: 'unit-1', buyerName: 'John' };
      
      mockUnitFindFirst.mockResolvedValue({ id: 'unit-1', contract: null });
      mockLeadFindFirst.mockResolvedValue({ id: 'lead-1', firstName: 'John', phone: '123' });
      
      const txMock = {
        contract: { create: vi.fn().mockResolvedValue(mockContract), findUnique: vi.fn().mockResolvedValue(null) },
        lead: { update: vi.fn() },
        unit: { update: vi.fn() },
        auditLog: { create: vi.fn() },
        telemetryEvent: { create: vi.fn() },
      };
      mockTransaction.mockImplementation(async (fn) => fn(txMock));

      const result = await issueContract({
        tenantId: 'tenant-1',
        userId: 'user-1',
        clientId: 'lead-1',
        propertyId: 'unit-1',
        amount: 500000,
      });

      expect(mockUnitFindFirst).toHaveBeenCalled();
      expect(mockTransaction).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockContract);
    });

    it('rejects cross-tenant unit', async () => {
      mockUnitFindFirst.mockResolvedValue(null);

      await expect(
        issueContract({
          tenantId: 'tenant-1',
          userId: 'user-1',
          clientId: 'lead-1',
          propertyId: 'wrong-tenant-unit',
          amount: 500000,
        })
      ).rejects.toThrow('Unit not found in this tenant');
    });
  });

  describe('acceptOfferAndCreateContract', () => {
    it('atomically accepts offer and creates contract', async () => {
      const mockOffer = {
        id: 'offer-1',
        status: 'PENDING',
        validUntil: new Date(Date.now() + 86400000),
        unitId: 'unit-1',
        opportunity: { id: 'opp-1', leadId: 'lead-1', linkedUnitIds: null },
        price: 500000,
        auditLog: '',
      };
      const mockLead = { id: 'lead-1', firstName: 'John', lastName: 'Doe', phone: '123', unitId: 'unit-1' };
      const mockContract = { id: 'contract-1', unitId: 'unit-1' };

      mockOfferFindFirst.mockResolvedValue({ ...mockOffer, tenantId: 'tenant-1' });
      mockLeadFindFirst.mockResolvedValue(mockLead);
      mockUnitFindFirst.mockResolvedValue({ id: 'unit-1' });
      
      const txMock = {
        contract: { create: vi.fn().mockResolvedValue(mockContract), findUnique: vi.fn().mockResolvedValue(null) },
        offer: { update: vi.fn().mockResolvedValue({ ...mockOffer, status: 'ACCEPTED' }) },
        lead: { update: vi.fn() },
        unit: { update: vi.fn() },
        opportunity: { update: vi.fn() },
        tenant: {
          findUnique: vi.fn().mockResolvedValue({ id: 'tenant-1', nextInvoiceNumber: 1, invoicePrefix: 'INV' }),
          update: vi.fn(),
        },
        invoice: { create: vi.fn().mockResolvedValue({ id: 'invoice-1', type: 'SALE', contractId: 'contract-1' }) },
        installment: { create: vi.fn().mockResolvedValue({ id: 'installment-1', invoiceId: 'invoice-1', contractId: 'contract-1' }) },
        auditLog: { create: vi.fn() },
        telemetryEvent: { create: vi.fn() },
      };
      mockTransaction.mockImplementation(async (fn) => fn(txMock));

      const result = await acceptOfferAndCreateContract({
        tenantId: 'tenant-1',
        userId: 'user-1',
        offerId: 'offer-1',
      });

      expect(mockTransaction).toHaveBeenCalledTimes(1);
      expect(result.contract).toEqual(mockContract);
      expect(result.offer.status).toBe('ACCEPTED');
    });

    it('rejects expired offer', async () => {
      const mockOffer = {
        id: 'offer-1',
        status: 'PENDING',
        validUntil: new Date(Date.now() - 86400000),
        opportunity: { id: 'opp-1', leadId: 'lead-1' },
      };

      mockOfferFindFirst.mockResolvedValue({ ...mockOffer, tenantId: 'tenant-1' });

      await expect(
        acceptOfferAndCreateContract({
          tenantId: 'tenant-1',
          userId: 'user-1',
          offerId: 'offer-1',
        })
      ).rejects.toThrow('Offer has expired');
    });
  });
});
