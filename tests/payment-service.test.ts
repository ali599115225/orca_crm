import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PaymentProviderAdapter } from '@/lib/payments/types';

vi.mock('server-only', () => ({}));

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    paymentTransaction: {
      create: vi.fn(),
      findFirst: vi.fn(),
      updateMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    tenant: {
      update: vi.fn(),
    },
  },
}));

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('@/lib/server/internal', () => ({
  handleSuccessfulPaymentInternal: vi.fn(async () => ({ success: true })),
}));

import { createPaymentTransaction, initiatePayment, processPaymentCallback } from '@/lib/payments/service';

function mockAdapter(overrides: Partial<PaymentProviderAdapter> = {}): PaymentProviderAdapter {
  return {
    code: 'MOYASAR',
    createPayment: vi.fn(async () => ({
      providerReference: 'REF-001',
      redirectUrl: 'https://pay.test/REF-001',
      providerStatus: 'initiated',
    })),
    verifyPayment: vi.fn(async () => ({
      paid: true,
      providerReference: 'REF-001',
      amountMinorUnits: 299_00,
      currency: 'SAR',
      providerStatus: 'paid',
    })),
    ...overrides,
  };
}

function wireTransactionStore(initial: Record<string, any>) {
  const store = { ...initial };

  prismaMock.paymentTransaction.findFirst.mockImplementation(async ({ where }: any) => {
    if (where.provider && where.provider !== store.provider) return null;
    if (where.providerReference && where.providerReference !== store.providerReference) return null;
    return { ...store };
  });

  prismaMock.paymentTransaction.updateMany.mockImplementation(async ({ where, data }: any) => {
    const allowed = where.status?.in || [];
    if (where.id === store.id && allowed.includes(store.status)) {
      Object.assign(store, data);
      return { count: 1 };
    }
    return { count: 0 };
  });

  prismaMock.paymentTransaction.findUnique.mockImplementation(async ({ where }: any) => {
    return where.id === store.id ? { ...store } : null;
  });

  prismaMock.paymentTransaction.update.mockImplementation(async ({ where, data }: any) => {
    if (where.id === store.id) Object.assign(store, data);
    return { ...store };
  });

  return store;
}

describe('payment service intent creation', () => {
  beforeEach(() => {
    vi.stubEnv('ENABLED_PAYMENT_PROVIDERS', 'MOYASAR,PAYLINK');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://orca.test');
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('creates PaymentTransaction before calling the provider adapter', async () => {
    const order: string[] = [];
    prismaMock.paymentTransaction.create.mockImplementation(async ({ data }: any) => {
      order.push('db');
      return { id: 'internal-tx-1', ...data };
    });
    prismaMock.paymentTransaction.update.mockResolvedValue({});
    const adapter = mockAdapter({
      createPayment: vi.fn(async () => {
        order.push('provider');
        return {
          providerReference: 'REF-001',
          redirectUrl: 'https://pay.test/REF-001',
          providerStatus: 'initiated',
        };
      }),
    });

    const result = await initiatePayment({
      tenantId: 'tenant-1',
      planCode: 'pro',
      providerCode: 'MOYASAR',
      adapter,
    });

    expect(result).toMatchObject({ success: true, internalTxId: 'internal-tx-1' });
    expect(order).toEqual(['db', 'provider']);
    expect(prismaMock.paymentTransaction.create.mock.calls[0][0].data).toMatchObject({
      tenantId: 'tenant-1',
      provider: 'MOYASAR',
      providerReference: null,
      planCode: 'pro',
      expectedAmountMinor: 299_00,
      expectedCurrency: 'SAR',
      status: 'PENDING',
    });
    expect((adapter.createPayment as any).mock.calls[0][0].callbackUrl).toBe('https://orca.test/api/payment/callback?provider=MOYASAR');
  });

  it('leaves a diagnosable non-completed record when provider creation fails', async () => {
    prismaMock.paymentTransaction.create.mockResolvedValue({ id: 'internal-tx-1' });
    const adapter = mockAdapter({
      createPayment: vi.fn(async () => {
        throw new Error('provider offline');
      }),
    });

    const result = await initiatePayment({
      tenantId: 'tenant-1',
      planCode: 'pro',
      providerCode: 'MOYASAR',
      adapter,
    });

    expect(result).toMatchObject({ success: false, error: 'provider offline' });
    expect(prismaMock.paymentTransaction.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'COMPLETED' }) }),
    );
  });

  it('creates multiple null provider references before provider creation', async () => {
    prismaMock.paymentTransaction.create
      .mockResolvedValueOnce({ id: 'intent-1' })
      .mockResolvedValueOnce({ id: 'intent-2' });

    await expect(createPaymentTransaction({
      tenantId: 'tenant-1',
      provider: 'MOYASAR',
      planCode: 'pro',
      amountMinor: 299_00,
      currency: 'SAR',
    })).resolves.toBe('intent-1');

    await expect(createPaymentTransaction({
      tenantId: 'tenant-1',
      provider: 'MOYASAR',
      planCode: 'gold',
      amountMinor: 499_00,
      currency: 'SAR',
    })).resolves.toBe('intent-2');

    expect(prismaMock.paymentTransaction.create).toHaveBeenCalledTimes(2);
    expect(prismaMock.paymentTransaction.create.mock.calls[0][0].data.providerReference).toBeNull();
    expect(prismaMock.paymentTransaction.create.mock.calls[1][0].data.providerReference).toBeNull();
  });
});

describe('payment callback state machine', () => {
  beforeEach(() => {
    vi.stubEnv('ENABLED_PAYMENT_PROVIDERS', 'MOYASAR,PAYLINK');
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('rejects an unknown provider reference', async () => {
    prismaMock.paymentTransaction.findFirst.mockResolvedValue(null);

    await expect(processPaymentCallback({
      provider: 'MOYASAR',
      providerReference: 'UNKNOWN',
      adapter: mockAdapter(),
    })).resolves.toMatchObject({ ok: false, status: 'REJECTED' });
  });

  it('rejects amount, currency, provider, and unpaid mismatches', async () => {
    wireTransactionStore({
      id: 'tx-1',
      tenantId: 'tenant-1',
      provider: 'MOYASAR',
      providerReference: 'REF-001',
      planCode: 'pro',
      expectedAmountMinor: 299_00,
      expectedCurrency: 'SAR',
      status: 'PENDING',
    });

    await expect(processPaymentCallback({
      provider: 'MOYASAR',
      providerReference: 'REF-001',
      adapter: mockAdapter({ verifyPayment: vi.fn(async () => ({ paid: true, providerReference: 'REF-001', amountMinorUnits: 198_00, currency: 'SAR', providerStatus: 'paid' })) }),
    })).resolves.toMatchObject({ ok: false, error: 'Payment amount mismatch' });

    await expect(processPaymentCallback({
      provider: 'MOYASAR',
      providerReference: 'REF-001',
      adapter: mockAdapter({ verifyPayment: vi.fn(async () => ({ paid: true, providerReference: 'REF-001', amountMinorUnits: 299_00, currency: 'USD', providerStatus: 'paid' })) }),
    })).resolves.toMatchObject({ ok: false, error: 'Payment currency mismatch' });

    await expect(processPaymentCallback({
      provider: 'PAYLINK',
      providerReference: 'REF-001',
      adapter: { ...mockAdapter(), code: 'PAYLINK' },
    })).resolves.toMatchObject({ ok: false, error: 'Payment transaction not found' });

    await expect(processPaymentCallback({
      provider: 'MOYASAR',
      providerReference: 'REF-001',
      adapter: mockAdapter({ verifyPayment: vi.fn(async () => ({ paid: false, providerReference: 'REF-001', amountMinorUnits: 299_00, currency: 'SAR', providerStatus: 'created' })) }),
    })).resolves.toMatchObject({ ok: false, error: 'Payment is not paid' });
  });

  it('moves PENDING to PROCESSING to COMPLETED without session data', async () => {
    const store = wireTransactionStore({
      id: 'tx-1',
      tenantId: 'tenant-1',
      provider: 'MOYASAR',
      providerReference: 'REF-001',
      planCode: 'pro',
      expectedAmountMinor: 299_00,
      expectedCurrency: 'SAR',
      status: 'PENDING',
    });
    const handleSuccessfulPayment = vi.fn(async () => ({ success: true }));

    await expect(processPaymentCallback({
      provider: 'MOYASAR',
      providerReference: 'REF-001',
      adapter: mockAdapter(),
      handleSuccessfulPayment,
    })).resolves.toMatchObject({ ok: true, status: 'COMPLETED' });

    expect(handleSuccessfulPayment).toHaveBeenCalledWith('tenant-1', 'pro', 'MONTHLY');
    expect(store.status).toBe('COMPLETED');
  });

  it('marks internal processing failure as FAILED and allows retry', async () => {
    const store = wireTransactionStore({
      id: 'tx-1',
      tenantId: 'tenant-1',
      provider: 'MOYASAR',
      providerReference: 'REF-001',
      planCode: 'pro',
      expectedAmountMinor: 299_00,
      expectedCurrency: 'SAR',
      status: 'PENDING',
    });

    await expect(processPaymentCallback({
      provider: 'MOYASAR',
      providerReference: 'REF-001',
      adapter: mockAdapter(),
      handleSuccessfulPayment: vi.fn(async () => ({ success: false, error: 'activation failed' })),
    })).resolves.toMatchObject({ ok: false, status: 'FAILED' });
    expect(store.status).toBe('FAILED');

    await expect(processPaymentCallback({
      provider: 'MOYASAR',
      providerReference: 'REF-001',
      adapter: mockAdapter(),
      handleSuccessfulPayment: vi.fn(async () => ({ success: true })),
    })).resolves.toMatchObject({ ok: true, status: 'COMPLETED' });
    expect(store.status).toBe('COMPLETED');
  });

  it('does not execute internal processing again after COMPLETED', async () => {
    wireTransactionStore({
      id: 'tx-1',
      tenantId: 'tenant-1',
      provider: 'MOYASAR',
      providerReference: 'REF-001',
      planCode: 'pro',
      expectedAmountMinor: 299_00,
      expectedCurrency: 'SAR',
      status: 'COMPLETED',
    });
    const handleSuccessfulPayment = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return { success: true };
    });

    await expect(processPaymentCallback({
      provider: 'MOYASAR',
      providerReference: 'REF-001',
      adapter: mockAdapter(),
      handleSuccessfulPayment,
    })).resolves.toMatchObject({ ok: true, status: 'ALREADY_COMPLETED' });
    expect(handleSuccessfulPayment).not.toHaveBeenCalled();
  });

  it('allows only one concurrent callback to claim PROCESSING', async () => {
    wireTransactionStore({
      id: 'tx-1',
      tenantId: 'tenant-1',
      provider: 'MOYASAR',
      providerReference: 'REF-001',
      planCode: 'pro',
      expectedAmountMinor: 299_00,
      expectedCurrency: 'SAR',
      status: 'PENDING',
    });
    const handleSuccessfulPayment = vi.fn(async () => ({ success: true }));

    const [first, second] = await Promise.all([
      processPaymentCallback({ provider: 'MOYASAR', providerReference: 'REF-001', adapter: mockAdapter(), handleSuccessfulPayment }),
      processPaymentCallback({ provider: 'MOYASAR', providerReference: 'REF-001', adapter: mockAdapter(), handleSuccessfulPayment }),
    ]);

    expect([first.status, second.status].sort()).toEqual(['COMPLETED', 'PROCESSING']);
    expect(handleSuccessfulPayment).toHaveBeenCalledTimes(1);
  });
});
