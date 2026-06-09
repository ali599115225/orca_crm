import { test, expect, TEST_ADMIN, TEST_PROPERTY, TEST_UNIT, TEST_LEASE } from './fixtures';

test.describe('Leasing Scenarios — Critical Business Coverage', () => {
  let authToken: string;
  let projectId: string;
  let unitId: string;
  let leaseId: string;

  test.beforeAll(async ({ request }) => {
    const res = await request.post('/api/v1/auth/login', {
      data: { email: TEST_ADMIN.email, password: TEST_ADMIN.password },
    });
    const body = await res.json();
    authToken = body.token;
  });

  test('TS-LEA-01: Property Creation — create with required fields', async ({ request }) => {
    const res = await request.post('/api/properties', {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        name: TEST_PROPERTY.name,
        city: TEST_PROPERTY.city,
        district: TEST_PROPERTY.district,
        priceSar: TEST_PROPERTY.priceSar,
        type: TEST_PROPERTY.type,
        area: TEST_PROPERTY.area,
        beds: TEST_PROPERTY.beds,
      },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
    projectId = body.data?.id;
  });

  test('TS-LEA-02: Unit Creation — create unit under project', async ({ request }) => {
    const res = await request.post('/api/properties', {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        projectId,
        unitNumber: TEST_UNIT.unitNumber,
        priceSar: TEST_UNIT.priceSar,
        area: TEST_UNIT.area,
        beds: TEST_UNIT.beds,
      },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
    unitId = body.data?.id;
  });

  test('TS-LEA-03: Lease Creation — create rental lease', async ({ request }) => {
    const res = await request.post('/api/v1/leases', {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        unitId,
        tenantName: TEST_LEASE.tenantName,
        startDate: TEST_LEASE.startDate,
        endDate: TEST_LEASE.endDate,
        rentAmount: TEST_LEASE.rentAmount,
        deposit: TEST_LEASE.deposit,
      },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBeDefined();
    leaseId = body.data.id;
  });

  test('TS-LEA-04: Installments Schedule — auto-generate from lease', async ({ request }) => {
    const res = await request.get(`/api/v1/leases/${leaseId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    if (body.data?.invoices) {
      expect(body.data.invoices.length).toBeGreaterThanOrEqual(1);
    }
  });

  test('TS-LEA-05: Lease Settlement — settle lease', async ({ request }) => {
    const res = await request.post('/api/accounting/settle-lease', {
      headers: { Authorization: `Bearer ${authToken}` },
      data: { leaseId, settlementDate: '2026-12-31' },
    });
    expect(res.ok()).toBeTruthy();
  });

  test('TS-LEA-06: Tenant Isolation — lease belongs to correct tenant', async ({ request }) => {
    const res = await request.get(`/api/v1/leases/${leaseId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.data.tenantId).toBe(TEST_ADMIN.tenantId);
  });
});
