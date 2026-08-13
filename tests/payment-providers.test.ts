import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { getPaymentProvider } from '@/lib/payments/registry';
import { moyasarProvider } from '@/lib/payments/providers/moyasar';
import { paylinkProvider } from '@/lib/payments/providers/paylink';

const createInput = {
  tenantId: 'tenant-1',
  planCode: 'pro',
  amountMinorUnits: 299_00,
  currency: 'SAR',
  description: 'ORCA pro plan',
  callbackUrl: 'https://orca.test/api/payment/callback?provider=MOYASAR',
};

describe('payment provider registry', () => {
  it('returns registered Moyasar and Paylink adapters only', () => {
    expect(getPaymentProvider('MOYASAR')).toBe(moyasarProvider);
    expect(getPaymentProvider('PAYLINK')).toBe(paylinkProvider);
    expect(getPaymentProvider('UNKNOWN')).toBeNull();
  });
});

describe('Moyasar adapter', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('creates a mock invoice and returns the unified contract', async () => {
    vi.stubEnv('MOYASAR_SECRET_KEY', 'moyasar-secret');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'moyasar-ref-1', url: 'https://pay.test/moyasar-ref-1', status: 'initiated' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await moyasarProvider.createPayment(createInput);

    expect(result).toMatchObject({
      providerReference: 'moyasar-ref-1',
      redirectUrl: 'https://pay.test/moyasar-ref-1',
      providerStatus: 'initiated',
    });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      amount: 299,
      currency: 'SAR',
      description: 'ORCA pro plan',
    });
  });

  it('verifies a paid mock invoice in minor units', async () => {
    vi.stubEnv('MOYASAR_SECRET_KEY', 'moyasar-secret');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'moyasar-ref-1', status: 'paid', amount: 299, currency: 'sar' }),
    }));

    await expect(moyasarProvider.verifyPayment('moyasar-ref-1')).resolves.toMatchObject({
      paid: true,
      providerReference: 'moyasar-ref-1',
      amountMinorUnits: 299_00,
      currency: 'SAR',
      providerStatus: 'paid',
    });
  });

  it('fails closed when MOYASAR_SECRET_KEY is missing', async () => {
    vi.stubEnv('MOYASAR_SECRET_KEY', '');
    await expect(moyasarProvider.createPayment(createInput)).rejects.toThrow('MOYASAR_SECRET_KEY not configured');
    await expect(moyasarProvider.verifyPayment('missing')).rejects.toThrow('MOYASAR_SECRET_KEY not configured');
  });
});

describe('Paylink adapter', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('creates a mock invoice and returns the unified contract', async () => {
    vi.stubEnv('PAYLINK_SECRET_KEY', 'paylink-secret');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ transactionNo: 'paylink-ref-1', payment_url: 'https://pay.test/paylink-ref-1' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await paylinkProvider.createPayment({ ...createInput, callbackUrl: 'https://orca.test/api/payment/callback?provider=PAYLINK' });

    expect(result).toMatchObject({
      providerReference: 'paylink-ref-1',
      redirectUrl: 'https://pay.test/paylink-ref-1',
      providerStatus: 'initiated',
    });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toMatchObject({
      amount: 299,
      currency: 'SAR',
      description: 'ORCA pro plan',
    });
    expect(body).not.toHaveProperty('subscriptionPlan');
  });

  it('verifies a paid mock invoice in the unified contract', async () => {
    vi.stubEnv('PAYLINK_SECRET_KEY', 'paylink-secret');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ transactionNo: 'paylink-ref-1', orderStatus: 'PAID', amount: 299 }),
    }));

    await expect(paylinkProvider.verifyPayment('paylink-ref-1')).resolves.toMatchObject({
      paid: true,
      providerReference: 'paylink-ref-1',
      amountMinorUnits: 299_00,
      currency: 'SAR',
      providerStatus: 'PAID',
    });
  });

  it('fails closed when Paylink settings are missing', async () => {
    vi.stubEnv('PAYLINK_SECRET_KEY', '');
    await expect(paylinkProvider.createPayment(createInput)).rejects.toThrow('PAYLINK_SECRET_KEY not configured');
    await expect(paylinkProvider.verifyPayment('missing')).rejects.toThrow('PAYLINK_SECRET_KEY not configured');
  });
});
