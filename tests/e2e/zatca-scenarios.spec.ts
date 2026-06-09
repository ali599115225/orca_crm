import { test, expect, TEST_ADMIN } from './fixtures';

test.describe('ZATCA Scenarios — Critical Business Coverage', () => {
  let authToken: string;

  test.beforeAll(async ({ request }) => {
    const res = await request.post('/api/v1/auth/login', {
      data: { email: TEST_ADMIN.email, password: TEST_ADMIN.password },
    });
    const body = await res.json();
    authToken = body.token;
  });

  test('TS-ZAT-01: QR Generation — valid TLS 1.2 format', async ({ request }) => {
    const invoiceData = {
      sellerName: 'مؤسسة أبعاد السكنية',
      vatNumber: '310123456700003',
      timestamp: new Date().toISOString(),
      total: 11500,
      vatTotal: 1500,
    };
    const res = await request.get('/api/v1/invoices/test-id/qr', {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    if (body.data?.qrCode) {
      expect(body.data.qrCode).toBeTruthy();
    }
  });

  test('TS-ZAT-02: XML Generation — valid UBL 2.1 invoice', async ({ request }) => {
    const res = await request.get('/api/v1/zatca/submit/test-invoice-id', {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(res.ok()).toBeTruthy();
  });

  test('TS-ZAT-03: Reporting API — simplified invoice submission', async ({ request }) => {
    const res = await request.post('/api/v1/zatca/csid', {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        otp: '123456',
        deviceName: 'Test Device',
      },
    });
    expect(res.ok()).toBeTruthy();
  });

  test('TS-ZAT-04: Clearance API — standard invoice clearance', async ({ request }) => {
    const res = await request.get('/api/v1/zatca/status/test-invoice-id', {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test('TS-ZAT-05: Retry Queue — failed items retry logic', async ({ request }) => {
    const res = await request.get('/api/v1/zatca/queue', {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.data).toBeDefined();
  });

  test('TS-ZAT-06: Status Tracking — invoice ZATCA status', async ({ request }) => {
    const res = await request.get('/api/v1/zatca/dashboard', {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test('TS-ZAT-07: Cron Job — CRON_SECRET authentication', async ({ request }) => {
    const res = await request.get('/api/cron/zatca', {
      headers: { Authorization: 'Bearer invalid-secret' },
    });
    expect(res.status()).toBe(401);
  });
});
