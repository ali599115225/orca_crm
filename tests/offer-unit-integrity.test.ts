import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockOfferCreate,
  mockOfferFindFirst,
  mockOpportunityFindFirst,
  mockUnitFindFirst,
  mockTourCreate,
  mockTelemetryCreate,
  mockTransaction,
} = vi.hoisted(() => ({
  mockOfferCreate: vi.fn(),
  mockOfferFindFirst: vi.fn(),
  mockOpportunityFindFirst: vi.fn(),
  mockUnitFindFirst: vi.fn(),
  mockTourCreate: vi.fn(),
  mockTelemetryCreate: vi.fn(),
  mockTransaction: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    offer: { create: mockOfferCreate, findFirst: mockOfferFindFirst },
    opportunity: { findFirst: mockOpportunityFindFirst },
    unit: { findFirst: mockUnitFindFirst },
    lead: { findFirst: vi.fn() },
    tour: { create: mockTourCreate },
    telemetryEvent: { create: mockTelemetryCreate },
    $transaction: mockTransaction,
  },
}));

vi.mock('@/lib/privacy-mask', () => ({
  hashPhone: vi.fn(() => 'hashed-phone'),
}));

import { createOffer } from '@/lib/domain/transaction-spine/create-offer';
import { scheduleTour } from '@/lib/domain/transaction-spine/schedule-tour';
import { acceptOfferAndCreateContract } from '@/lib/domain/transaction-spine/accept-offer';

const future = () => new Date(Date.now() + 86400000);

describe('Offer Unit Integrity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTelemetryCreate.mockResolvedValue({});
  });

  it('creates an offer from the same opportunity unit', async () => {
    mockOpportunityFindFirst.mockResolvedValue({ id: 'opp-1', tenantId: 'tenant-1', unitId: 'unit-1' });
    mockUnitFindFirst.mockResolvedValue({ id: 'unit-1', tenantId: 'tenant-1' });
    mockOfferCreate.mockResolvedValue({ id: 'offer-1', linkedOpportunityId: 'opp-1', unitId: 'unit-1' });

    const offer = await createOffer({
      tenantId: 'tenant-1',
      userId: 'user-1',
      opportunityId: 'opp-1',
      unitId: 'unit-1',
      price: 100000,
      validUntil: future(),
    });

    expect(offer.unitId).toBe('unit-1');
    expect(mockOfferCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ linkedOpportunityId: 'opp-1', unitId: 'unit-1' }),
    }));
  });

  it('rejects offer creation when opportunity has no unit and never falls back', async () => {
    await expect(createOffer({
      tenantId: 'tenant-1',
      userId: 'user-1',
      opportunityId: 'opp-1',
      unitId: '',
      price: 100000,
      validUntil: future(),
    })).rejects.toThrow('Unit ID is required');

    expect(mockUnitFindFirst).not.toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: 'Available' }),
    }));
  });

  it('rejects cross-tenant unit when creating an offer', async () => {
    mockOpportunityFindFirst.mockResolvedValue({ id: 'opp-1', tenantId: 'tenant-1' });
    mockUnitFindFirst.mockResolvedValue(null);

    await expect(createOffer({
      tenantId: 'tenant-1',
      userId: 'user-1',
      opportunityId: 'opp-1',
      unitId: 'unit-other',
      price: 100000,
      validUntil: future(),
    })).rejects.toThrow('Unit not found in this tenant');
  });

  it('creates a tour from offer.unitId and links lead/opportunity/unit', async () => {
    mockOfferFindFirst.mockResolvedValue({
      id: 'offer-1',
      tenantId: 'tenant-1',
      linkedOpportunityId: 'opp-1',
      unitId: 'unit-1',
      opportunity: { id: 'opp-1', leadId: 'lead-1' },
    });
    mockOpportunityFindFirst.mockResolvedValue({ id: 'opp-1', tenantId: 'tenant-1' });
    mockUnitFindFirst.mockResolvedValue({ id: 'unit-1', tenantId: 'tenant-1' });
    const mockLeadFindFirst = (await import('@/lib/prisma')).prisma.lead.findFirst as any;
    mockLeadFindFirst.mockResolvedValue({ id: 'lead-1', tenantId: 'tenant-1' });
    mockTourCreate.mockResolvedValue({ id: 'tour-1', leadId: 'lead-1', opportunityId: 'opp-1', unitId: 'unit-1' });

    const tour = await scheduleTour({
      tenantId: 'tenant-1',
      userId: 'user-1',
      leadId: '',
      offerId: 'offer-1',
      location: 'Unit 1',
      startAt: future(),
      endAt: future(),
    });

    expect(tour.unitId).toBe('unit-1');
    expect(mockTourCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        leadId: 'lead-1',
        opportunityId: 'opp-1',
        unitId: 'unit-1',
        offerId: 'offer-1',
      }),
    }));
  });

  it('blocks tours for legacy offers without a unit', async () => {
    mockOfferFindFirst.mockResolvedValue({
      id: 'offer-legacy',
      tenantId: 'tenant-1',
      linkedOpportunityId: 'opp-1',
      unitId: null,
      opportunity: { id: 'opp-1', leadId: 'lead-1' },
    });

    await expect(scheduleTour({
      tenantId: 'tenant-1',
      userId: 'user-1',
      leadId: '',
      offerId: 'offer-legacy',
      location: 'Unit',
      startAt: future(),
      endAt: future(),
    })).rejects.toThrow('without a linked unit');
  });

  it('accepts an offer once and creates contract, SALE invoice, and installment', async () => {
    const offer = {
      id: 'offer-1',
      tenantId: 'tenant-1',
      status: 'PENDING',
      validUntil: future(),
      unitId: 'unit-1',
      linkedOpportunityId: 'opp-1',
      opportunity: { id: 'opp-1', leadId: 'lead-1' },
      price: 500000,
      auditLog: '',
    };
    const lead = { id: 'lead-1', tenantId: 'tenant-1', firstName: 'Sara', lastName: 'Ali', phone: '0500000000' };
    const contract = { id: 'contract-1', tenantId: 'tenant-1', leadId: 'lead-1', offerId: 'offer-1', unitId: 'unit-1' };
    const invoice = { id: 'invoice-1', tenantId: 'tenant-1', contractId: 'contract-1', type: 'SALE' };
    const installment = { id: 'installment-1', tenantId: 'tenant-1', contractId: 'contract-1', invoiceId: 'invoice-1' };

    mockOfferFindFirst
      .mockResolvedValueOnce({ id: 'offer-1', tenantId: 'tenant-1' })
      .mockResolvedValueOnce(offer);
    mockUnitFindFirst.mockResolvedValue({ id: 'unit-1', tenantId: 'tenant-1' });
    const { prisma } = await import('@/lib/prisma');
    (prisma.lead.findFirst as any)
      .mockResolvedValueOnce({ id: 'lead-1', tenantId: 'tenant-1' })
      .mockResolvedValueOnce(lead);

    const tx = {
      contract: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue(contract),
      },
      offer: { update: vi.fn().mockResolvedValue({ ...offer, status: 'ACCEPTED' }) },
      opportunity: { update: vi.fn().mockResolvedValue({ id: 'opp-1', status: 'WON' }) },
      lead: { update: vi.fn().mockResolvedValue({}) },
      unit: { update: vi.fn().mockResolvedValue({}) },
      tenant: {
        findUnique: vi.fn().mockResolvedValue({ id: 'tenant-1', nextInvoiceNumber: 77, invoicePrefix: 'INV' }),
        update: vi.fn().mockResolvedValue({}),
      },
      invoice: { create: vi.fn().mockResolvedValue(invoice) },
      installment: { create: vi.fn().mockResolvedValue(installment) },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
      telemetryEvent: { create: vi.fn().mockResolvedValue({}) },
    };
    mockTransaction.mockImplementation(async (fn) => fn(tx));

    const result = await acceptOfferAndCreateContract({ tenantId: 'tenant-1', userId: 'user-1', offerId: 'offer-1' });

    expect(tx.contract.create).toHaveBeenCalledTimes(1);
    expect(result.contract).toMatchObject(contract);
    expect(result.invoice).toMatchObject({ type: 'SALE', contractId: 'contract-1' });
    expect(result.installments[0]).toMatchObject({ invoiceId: 'invoice-1', contractId: 'contract-1' });
  });

  it('is idempotent when accepting an already accepted offer', async () => {
    const invoice = { id: 'invoice-1', type: 'SALE', installments: [{ id: 'installment-1' }] };
    const contract = { id: 'contract-1', offerId: 'offer-1', leadId: 'lead-1', unitId: 'unit-1', invoices: [invoice] };
    mockOfferFindFirst
      .mockResolvedValueOnce({ id: 'offer-1', tenantId: 'tenant-1' })
      .mockResolvedValueOnce({
        id: 'offer-1',
        tenantId: 'tenant-1',
        status: 'ACCEPTED',
        contract,
        opportunity: { id: 'opp-1', leadId: 'lead-1' },
      });

    const result = await acceptOfferAndCreateContract({ tenantId: 'tenant-1', userId: 'user-1', offerId: 'offer-1' });

    expect(mockTransaction).not.toHaveBeenCalled();
    expect(result.contractCreated).toBe(false);
    expect(result.contract).toMatchObject({ offerId: 'offer-1', leadId: 'lead-1', unitId: 'unit-1' });
    expect(result.invoice).toMatchObject({ type: 'SALE' });
    expect(result.installments).toHaveLength(1);
  });

  it('uses the active /operations/leads page and LeadsWorkspace, not the inactive detail route', () => {
    const root = process.cwd();
    const page = fs.readFileSync(path.join(root, 'app/operations/leads/page.tsx'), 'utf8');
    const workspace = fs.readFileSync(path.join(root, 'components/views/LeadsWorkspace.tsx'), 'utf8');

    expect(page).toContain('LeadsWorkspace');
    expect(workspace).toContain('POST');
    expect(workspace).toContain('/api/v1/opportunities/${selectedOpportunity.id}/offers');
    expect(workspace).toContain('/api/v1/tours');
    expect(workspace).not.toContain('LeadDetailClient');
  });
});
