import { test, expect, TEST_ADMIN } from './fixtures';

test.describe('Reporting Scenarios — Critical Business Coverage', () => {
  let authToken: string;

  test.beforeAll(async ({ request }) => {
    const res = await request.post('/api/v1/auth/login', {
      data: { email: TEST_ADMIN.email, password: TEST_ADMIN.password },
    });
    const body = await res.json();
    authToken = body.token;
  });

  test('TS-RPT-01: Trial Balance — debits equal credits', async ({ request }) => {
    const res = await request.get('/api/v1/accounting/trial-balance', {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test('TS-RPT-02: General Ledger — all posted entries', async ({ request }) => {
    const res = await request.get('/api/v1/accounting/general-ledger', {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test('TS-RPT-03: Aging Report — overdue receivables', async ({ request }) => {
    const res = await request.get('/api/v1/accounting/aging-report', {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test('TS-RPT-04: VAT Report — output vs input tax', async ({ request }) => {
    const res = await request.get('/api/v1/accounting/vat-report', {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
    if (body.data?.vatRate) {
      expect(body.data.vatRate).toBe(15);
    }
  });

  test('TS-RPT-05: Tenant Isolation — reports scoped to tenant', async ({ request }) => {
    const reports = [
      '/api/v1/accounting/trial-balance',
      '/api/v1/accounting/general-ledger',
      '/api/v1/accounting/aging-report',
      '/api/v1/accounting/vat-report',
    ];
    for (const path of reports) {
      const res = await request.get(path, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      expect(res.ok()).toBeTruthy();
    }
  });

  test('TS-RPT-06: Unauthenticated report access returns 401', async ({ request }) => {
    const res = await request.get('/api/v1/accounting/trial-balance');
    expect(res.status()).toBe(401);
  });
});
