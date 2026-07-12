import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  runWithDatabaseSession: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    paymentTransaction: {
      findMany: mocks.findMany,
    },
  },
}));

vi.mock('@/lib/api-auth-guard', () => ({
  TENANT_ROLES: ['ADMIN'],
  runWithDatabaseSession: mocks.runWithDatabaseSession,
}));

vi.mock('@/lib/errors', () => ({
  ErrorCode: { INTERNAL_ERROR: 'INTERNAL_ERROR' },
}));

vi.mock('@/lib/http-error-response', () => ({
  httpErrorResponse: vi.fn(),
}));

import { GET } from '../app/api/v1/payments/route';

describe('GET /api/v1/payments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.runWithDatabaseSession.mockImplementation(
      async (_request, _roles, handler) =>
        handler({
          tenantId: 'tenant-a',
          userId: 'user-a',
          role: 'ADMIN',
        }),
    );
    mocks.findMany.mockResolvedValue([]);
  });

  it('always scopes payment queries to the authenticated tenant', async () => {
    const response = await GET(
      new NextRequest(
        'http://localhost/api/v1/payments?status=COMPLETED&contractId=contract-1',
      ),
    );

    expect(response.status).toBe(200);
    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tenantId: 'tenant-a',
          status: 'COMPLETED',
          OR: [
            { invoice: { is: { contractId: 'contract-1' } } },
            { installment: { is: { contractId: 'contract-1' } } },
          ],
        },
      }),
    );
  });

  it('caps the read size and preserves tenant scope with invoice and provider filters', async () => {
    await GET(
      new NextRequest(
        'http://localhost/api/v1/payments?provider=NGENIUS&invoiceId=invoice-1&limit=999',
      ),
    );

    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 100,
        where: {
          tenantId: 'tenant-a',
          provider: 'NGENIUS',
          invoiceId: 'invoice-1',
        },
      }),
    );
  });

  it('returns real invoice, contract, payment-plan and installment links', async () => {
    mocks.findMany.mockResolvedValue([
      {
        id: 'payment-1',
        invoiceId: 'invoice-1',
        installmentId: 'installment-1',
        amount: '1000.00',
        fee: '10.00',
        netAmount: '990.00',
        currency: 'SAR',
        method: 'BANK_TRANSFER',
        status: 'COMPLETED',
        provider: 'MANUAL',
        providerReference: 'reference-1',
        paidAt: new Date('2026-07-10T10:00:00.000Z'),
        processedAt: null,
        createdAt: new Date('2026-07-10T09:00:00.000Z'),
        invoice: {
          id: 'invoice-1',
          invoiceNumber: 15,
          invoicePrefix: 'INV',
          totalAmount: '1000.00',
          status: 'paid',
          type: 'SALE',
          contractId: 'contract-1',
          leaseId: null,
          lease: null,
          contract: {
            buyerName: 'Buyer',
            unit: {
              unitNumber: 'A-10',
              project: { name: 'Project' },
            },
          },
        },
        installment: {
          id: 'installment-1',
          contractId: 'contract-1',
          paymentPlanId: 'plan-1',
          installmentNumber: 2,
          amountSar: '1000.00',
          dueDate: new Date('2026-07-10T00:00:00.000Z'),
          paymentStatus: 'Paid',
        },
      },
    ]);

    const response = await GET(
      new NextRequest('http://localhost/api/v1/payments'),
    );
    const body = await response.json();

    expect(body.success).toBe(true);
    expect(body.payments[0]).toMatchObject({
      id: 'payment-1',
      invoiceId: 'invoice-1',
      installmentId: 'installment-1',
      contractId: 'contract-1',
      paymentPlanId: 'plan-1',
      customerName: 'Buyer',
      unitName: 'Project · A-10',
      amount: 1000,
      netAmount: 990,
    });
  });
});
