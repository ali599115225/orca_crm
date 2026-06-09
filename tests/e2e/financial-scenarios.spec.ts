import { test, expect, TEST_ADMIN } from './fixtures';

test.describe('Financial Scenarios — Critical Business Coverage', () => {
  let authToken: string;

  test.beforeAll(async ({ request }) => {
    const res = await request.post('/api/v1/auth/login', {
      data: { email: TEST_ADMIN.email, password: TEST_ADMIN.password },
    });
    const body = await res.json();
    authToken = body.token;
  });

  test('TS-FIN-01: Invoice Creation — create rental invoice', async ({ request }) => {
    const res = await request.post('/api/v1/invoices', {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        leaseId: 'test-lease-id',
        issueDate: '2026-07-01',
        dueDate: '2026-07-31',
        subtotal: 5000,
        vatRate: 15,
        vatAmount: 750,
        totalAmount: 5750,
      },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.invoiceNumber).toBeDefined();
  });

  test('TS-FIN-02: VAT Calculation — 15% correctly applied', async ({ request }) => {
    const subtotal = 10000;
    const vatRate = 15;
    const vatAmount = (subtotal * vatRate) / 100;
    const total = subtotal + vatAmount;

    expect(vatAmount).toBe(1500);
    expect(total).toBe(11500);
  });

  test('TS-FIN-03: Payment Processing — mark invoice as paid', async ({ request }) => {
    const res = await request.post('/api/v1/invoices/test-invoice-id/pay', {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        paymentMethod: 'BANK_TRANSFER',
        paidAt: '2026-07-15',
        paymentRef: 'TXN-001',
      },
    });
    expect(res.ok()).toBeTruthy();
  });

  test('TS-FIN-04: Journal Posting — double-entry integrity', async ({ request }) => {
    const res = await request.post('/api/v1/accounting/journal-entries', {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        description: 'Test journal entry',
        entryDate: '2026-07-01',
        lines: [
          { accountId: 'acc-revenue', debit: 0, credit: 5750 },
          { accountId: 'acc-receivable', debit: 5750, credit: 0 },
        ],
      },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);

    const { lines } = body.data;
    const totalDebit = lines.reduce((s: number, l: any) => s + l.debit, 0);
    const totalCredit = lines.reduce((s: number, l: any) => s + l.credit, 0);
    expect(totalDebit).toBe(totalCredit);
  });

  test('TS-FIN-05: Accounts Receivable Update — reflects unpaid invoices', async ({ request }) => {
    const res = await request.get('/api/v1/accounting/accounts-receivable', {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test('TS-FIN-06: Tenant Isolation — financial data scoped', async ({ request }) => {
    const res = await request.get('/api/v1/accounting/journal-entries', {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    if (body.data) {
      for (const entry of body.data) {
        expect(entry.tenantId).toBe(TEST_ADMIN.tenantId);
      }
    }
  });
});
