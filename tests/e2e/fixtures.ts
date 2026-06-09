import { test as base } from '@playwright/test';

export const TEST_ADMIN = {
  email: 'admin@test.orca.sa',
  password: 'TestAdmin@123',
  tenantId: 'test-tenant-1',
};

export const TEST_LEAD = {
  firstName: 'سارة',
  lastName: 'العتيبي',
  phone: '+966555001122',
  email: 'sara@test.com',
  city: 'الرياض',
  source: 'Google Ads',
  projectId: 'test-project-1',
};

export const TEST_PROPERTY = {
  name: 'فلة النرجس',
  city: 'الرياض',
  district: 'النرجس',
  priceSar: 850000,
  type: 'VILLA',
  area: 350,
  beds: 5,
};

export const TEST_UNIT = {
  unitNumber: 'A-101',
  priceSar: 850000,
  area: 350,
  beds: 5,
};

export const TEST_CONTRACT = {
  buyerName: 'محمد القحطاني',
  buyerPhone: '+966555112233',
  totalVolumeSar: 850000,
  vatRate: 15,
};

export const TEST_LEASE = {
  tenantName: 'أحمد السبيعي',
  unitName: 'شقة 201',
  startDate: '2026-07-01',
  endDate: '2027-06-30',
  rentAmount: 60000,
  deposit: 15000,
};

export type TestFixtures = {
  authToken: string;
};

export const test = base.extend<TestFixtures>({
  authToken: async ({ request }, use) => {
    const res = await request.post('/api/v1/auth/login', {
      data: { email: TEST_ADMIN.email, password: TEST_ADMIN.password },
    });
    const json = await res.json();
    await use(json.token || 'test-token');
  },
});

export const expect = test.expect;
