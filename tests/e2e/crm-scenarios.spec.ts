import { test, expect, TEST_ADMIN, TEST_LEAD, TEST_CONTRACT } from './fixtures';

test.describe('CRM Scenarios — Critical Business Coverage', () => {
  test('TS-CRM-01: User Login — valid credentials return session', async ({ request }) => {
    const res = await request.post('/api/v1/auth/login', {
      data: { email: TEST_ADMIN.email, password: TEST_ADMIN.password },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.token).toBeDefined();
    expect(body.user).toBeDefined();
    expect(body.user.role).toBe('ADMIN');
  });

  test('TS-CRM-02: User Login — invalid credentials return 401', async ({ request }) => {
    const res = await request.post('/api/v1/auth/login', {
      data: { email: 'wrong@test.com', password: 'wrong' },
    });
    expect(res.status()).toBe(401);
  });

  test('TS-CRM-03: Lead Creation — create lead with required fields', async ({ request }) => {
    const loginRes = await request.post('/api/v1/auth/login', {
      data: { email: TEST_ADMIN.email, password: TEST_ADMIN.password },
    });
    const { token } = await loginRes.json();

    const res = await request.post('/api/v1/leads', {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        firstName: TEST_LEAD.firstName,
        lastName: TEST_LEAD.lastName,
        phone: TEST_LEAD.phone,
        email: TEST_LEAD.email,
        city: TEST_LEAD.city,
        source: TEST_LEAD.source,
      },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBeDefined();
    expect(body.data.firstName).toBe(TEST_LEAD.firstName);
    expect(body.data.phone).toBe(TEST_LEAD.phone);
  });

  test('TS-CRM-04: Lead Creation — rejects duplicate phone within same tenant', async ({ request }) => {
    const loginRes = await request.post('/api/v1/auth/login', {
      data: { email: TEST_ADMIN.email, password: TEST_ADMIN.password },
    });
    const { token } = await loginRes.json();

    const res = await request.post('/api/v1/leads', {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        firstName: TEST_LEAD.firstName,
        lastName: TEST_LEAD.lastName,
        phone: TEST_LEAD.phone,
      },
    });
    expect(res.status()).toBe(409);
  });

  test('TS-CRM-05: Lead Assignment — assign lead to sales employee', async ({ request }) => {
    const loginRes = await request.post('/api/v1/auth/login', {
      data: { email: TEST_ADMIN.email, password: TEST_ADMIN.password },
    });
    const { token } = await loginRes.json();

    const leadsRes = await request.get('/api/v1/leads', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const leadsBody = await leadsRes.json();
    const leadId = leadsBody.data?.[0]?.id;

    const res = await request.patch(`/api/v1/leads/${leadId}/move`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { assignedTo: 'sales-user-id', status: 'CONTACTED' },
    });
    expect(res.ok()).toBeTruthy();
  });

  test('TS-CRM-06: Opportunity Creation — create from lead', async ({ request }) => {
    const loginRes = await request.post('/api/v1/auth/login', {
      data: { email: TEST_ADMIN.email, password: TEST_ADMIN.password },
    });
    const { token } = await loginRes.json();

    const res = await request.post('/api/v1/opportunities', {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        leadId: 'test-lead-id',
        value: 850000,
        probability: 75,
        closeDate: '2026-08-01',
        status: 'OPEN',
      },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test('TS-CRM-07: Opportunity Conversion — convert to won with offer', async ({ request }) => {
    const loginRes = await request.post('/api/v1/auth/login', {
      data: { email: TEST_ADMIN.email, password: TEST_ADMIN.password },
    });
    const { token } = await loginRes.json();
    const oppRes = await request.get('/api/v1/opportunities', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const oppBody = await oppRes.json();
    const oppId = oppBody.data?.[0]?.id;
    if (!oppId) return;

    const res = await request.post(`/api/v1/offers/${oppId}/accept`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { status: 'ACCEPTED' },
    });
    expect(res.ok()).toBeTruthy();
  });

  test('TS-CRM-08: Contract Creation — from won opportunity', async ({ request }) => {
    const loginRes = await request.post('/api/v1/auth/login', {
      data: { email: TEST_ADMIN.email, password: TEST_ADMIN.password },
    });
    const { token } = await loginRes.json();

    const res = await request.get('/api/v1/contracts/issue', {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        leadId: 'test-lead-id',
        unitId: 'test-unit-id',
        totalVolumeSar: TEST_CONTRACT.totalVolumeSar,
        vatRate: TEST_CONTRACT.vatRate,
      },
    });
    expect(res.ok()).toBeTruthy();
  });

  test('TS-CRM-09: Tenant Isolation — tenant A cannot access tenant B leads', async ({ request }) => {
    const res = await request.post('/api/v1/auth/login', {
      data: { email: TEST_ADMIN.email, password: TEST_ADMIN.password },
    });
    const { token } = await res.json();

    const leadsRes = await request.get('/api/v1/leads', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const leadsBody = await leadsRes.json();
    if (leadsBody.data) {
      for (const lead of leadsBody.data) {
        expect(lead.tenantId).toBe(TEST_ADMIN.tenantId);
      }
    }
  });

  test('TS-CRM-10: Unauthenticated access returns 401', async ({ request }) => {
    const res = await request.get('/api/v1/leads');
    expect(res.status()).toBe(401);
  });
});
