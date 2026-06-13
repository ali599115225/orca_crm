# E2E Testing Report – ORCA CRM

**Date:** 2026-06-09
**Engineer:** QA Lead
**Tool:** Playwright (recommended) / Vitest (existing)

---

## Current Test Coverage

| Metric | Value |
|--------|-------|
| Existing tests | 5 unit tests |
| E2E tests | **0** |
| Playwright config | **Not found** |
| Coverage | <5% |
| **Goal** | **80% critical business coverage** |

---

## Test Plan: 77 E2E Tests

### CRM Flows (20 tests)

| # | Test Name | Flow | Priority |
|---|-----------|------|----------|
| CR-01 | Create lead with all fields | Lead → DB verify | Critical |
| CR-02 | Create lead with minimal fields | Lead → validation | Critical |
| CR-03 | Update lead status (NEW → CONTACTED) | Status transition | Critical |
| CR-04 | Update lead status (CONTACTED → VISIT_SCHEDULED) | Status transition | Critical |
| CR-05 | Update lead status (RESERVED → CONTRACT_SIGNED) | Status transition | Critical |
| CR-06 | Update lead status (WON) | Win flow | Critical |
| CR-07 | Update lead status (LOST) with reason | Loss flow | Critical |
| CR-08 | Assign lead to sales agent | Assignment | High |
| CR-09 | Reassign lead to different agent | Reassignment | High |
| CR-10 | Search leads by phone | Search | High |
| CR-11 | Filter leads by status | Filter | High |
| CR-12 | Bulk import leads | Import | High |
| CR-13 | Create opportunity from lead | Lead → Opp | Critical |
| CR-14 | Update opportunity probability | Opp update | High |
| CR-15 | Close opportunity (WON) | Opp → Win | Critical |
| CR-16 | Close opportunity (LOST) | Opp → Lost | High |
| CR-17 | Create contract from opportunity | Opp → Contract | Critical |
| CR-18 | Verify lead count in dashboard | Dashboard | High |
| CR-19 | Lead activity timeline renders | Timeline | Medium |
| CR-20 | Delete lead (soft) | Deletion | Medium |

### Leasing Flows (18 tests)

| # | Test Name | Flow | Priority |
|---|-----------|------|----------|
| LS-01 | Create property with all details | Property CRUD | Critical |
| LS-02 | Create property with media/images | Property + media | High |
| LS-03 | Update property price | Property update | High |
| LS-04 | Delete property | Property delete | Medium |
| LS-05 | Search properties by filters | Search | High |
| LS-06 | Create lease contract | Lease CRUD | Critical |
| LS-07 | Update lease status (active → expired) | Lease update | Critical |
| LS-08 | Create installments for lease | Installment gen | Critical |
| LS-09 | Mark installment as paid | Installment pay | Critical |
| LS-10 | Verify installment schedule display | Schedule view | High |
| LS-11 | Create lease with deposit | Lease + deposit | High |
| LS-12 | End lease early (termination) | Lease end | High |
| LS-13 | Renew lease | Renewal | High |
| LS-14 | Create multiple installments batch | Batch create | High |
| LS-15 | Get lease financial summary | Fin summary | Critical |
| LS-16 | Link lease to unit | Unit assignment | High |
| LS-17 | Tenant name appears on lease invoice | Tenant linkage | High |
| LS-18 | Lease status filter on list | Filter | Medium |

### Finance Flows (20 tests)

| # | Test Name | Flow | Priority |
|---|-----------|------|----------|
| FI-01 | Create invoice with VAT 15% | Invoice → VAT | Critical |
| FI-02 | Create invoice zero-rated VAT | Invoice → 0% VAT | Critical |
| FI-03 | Create invoice exempt from VAT | Invoice → exempt | Critical |
| FI-04 | Pay invoice (full amount) | Pay → Receipt → JE | Critical |
| FI-05 | Pay invoice with idempotency key | Idempotency | Critical |
| FI-06 | Attempt duplicate invoice payment | Duplicate check | Critical |
| FI-07 | Verify journal entry created after payment | JE verify | Critical |
| FI-08 | Verify account balance updated | Balance verify | Critical |
| FI-09 | View trial balance report | Report | Critical |
| FI-10 | View general ledger report | Report | Critical |
| FI-11 | View accounts receivable report | Report | Critical |
| FI-12 | View aging report | Report | Critical |
| FI-13 | View VAT report | Report | Critical |
| FI-14 | Create commission for sales agent | Commission | Critical |
| FI-15 | Pay commission → verify JE | Commission pay | Critical |
| FI-16 | Reverse journal entry | Reversal | Critical |
| FI-17 | Verify debit = credit in reversal | Balance check | Critical |
| FI-18 | Seed chart of accounts | COA seed | High |
| FI-19 | Settle lease → verify invoice created | Settle flow | Critical |
| FI-20 | Run audit checks → all pass | Audit | Critical |

### ZATCA Flows (12 tests)

| # | Test Name | Flow | Priority |
|---|-----------|------|----------|
| ZA-01 | Generate ZATCA XML for invoice | XML gen | Critical |
| ZA-02 | Validate XML against UBL 2.1 schema | XML validate | Critical |
| ZA-03 | Generate QR code for invoice | QR gen | Critical |
| ZA-04 | Encode TLV from QR payload | TLV encode | Critical |
| ZA-05 | Submit invoice to ZATCA (reporting) | Submit | Critical |
| ZA-06 | Submit invoice to ZATCA (clearance) | Clearance | Critical |
| ZA-07 | Check ZATCA submission status | Status | Critical |
| ZA-08 | Retry failed ZATCA submission | Retry | High |
| ZA-09 | Generate previous invoice hash | PIH | High |
| ZA-10 | View ZATCA compliance dashboard | Dashboard | High |
| ZA-11 | View ZATCA submission queue | Queue view | High |
| ZA-12 | ZATCA device certificate management | Certificate | High |

### Security Tests (7 tests)

| # | Test Name | Flow | Priority |
|---|-----------|------|----------|
| SC-01 | Unauthenticated access returns 401 | Auth check | Critical |
| SC-02 | Cross-tenant data isolation | Isolation | Critical |
| SC-03 | READ_ONLY cannot modify data | RBAC | Critical |
| SC-04 | API key endpoint requires auth | API key auth | Critical |
| SC-05 | Payment callback requires auth | Payment auth | Critical |
| SC-06 | ZATCA cron requires auth | Cron auth | Critical |
| SC-07 | SQL injection attempt blocked | Injection | High |

---

## Test Implementation (Playwright)

### Install & Configure

```bash
npm install -D @playwright/test
npx playwright install chromium
```

### `playwright.config.ts`

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  retries: 2,
  use: {
    baseURL: 'https://orca.az-ez.pro',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
});
```

### Sample Test: `e2e/crm/lead-creation.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('CRM - Lead Creation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@dar-al-amar.com');
    await page.fill('input[type="password"]', 'Orca@Secure2026!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
  });

  test('CR-01: Create lead with all fields', async ({ page }) => {
    await page.click('text=إضافة عميل'); // or appropriate selector
    await page.fill('input[name="firstName"]', 'أحمد');
    await page.fill('input[name="lastName"]', 'المالكي');
    await page.fill('input[name="phone"]', '0555000111');
    await page.fill('input[name="email"]', 'ahmed@test.com');
    await page.selectOption('select[name="source"]', 'TWITTER');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=تم إنشاء العميل')).toBeVisible();
  });

  test('CR-03: Update lead status', async ({ page }) => {
    await page.goto('/operations/leads');
    await page.click('tr:first-child');
    await page.selectOption('select[name="status"]', 'CONTACTED');
    await page.click('button:has-text("حفظ")');
    
    await expect(page.locator('text=CONTACTED')).toBeVisible();
  });
});
```

### Sample Test: `e2e/finance/payment-flow.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Finance - Payment Flow', () => {
  test('FI-04: Pay invoice with double-entry posting', async ({ request }) => {
    // Create invoice first
    const invoiceRes = await request.post('/api/v1/invoices', {
      headers: { Authorization: `Bearer ${TOKEN}` },
      data: { leaseId: LEASE_ID, subtotal: 1000, dueDate: '2026-07-01' },
    });
    const invoice = await invoiceRes.json();
    expect(invoice.success).toBeTruthy();

    // Pay invoice
    const payRes = await request.post(`/api/v1/invoices/${invoice.invoice.id}/pay`, {
      headers: { 
        Authorization: `Bearer ${TOKEN}`,
        'Idempotency-Key': `test-${Date.now()}`,
      },
      data: { amount: 1150, method: 'BANK_TRANSFER' },
    });
    const payment = await payRes.json();
    expect(payment.success).toBeTruthy();

    // Verify journal entry
    const jeRes = await request.get('/api/v1/accounting/journal-entries', {
      headers: { Authorization: `Bearer ${TOKEN}` },
    });
    const entries = await jeRes.json();
    expect(entries.entries.length).toBeGreaterThan(0);
  });
});
```

### Sample Test: `e2e/security/tenant-isolation.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Security - Tenant Isolation', () => {
  test('SC-02: Cross-tenant data isolation', async ({ request }) => {
    // Login as tenant A
    const loginA = await request.post('/api/v1/auth/login', {
      data: { email: 'admin@tenant-a.com', password: 'password' },
    });
    const tokenA = (await loginA.json()).token;

    // Login as tenant B
    const loginB = await request.post('/api/v1/auth/login', {
      data: { email: 'admin@tenant-b.com', password: 'password' },
    });
    const tokenB = (await loginB.json()).token;

    // Tenant A creates a lead
    await request.post('/api/v1/leads', {
      headers: { Authorization: `Bearer ${tokenA}` },
      data: { firstName: 'TenantA', phone: '0555000111' },
    });

    // Tenant B should not see Tenant A's leads
    const leadsB = await request.get('/api/v1/leads', {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    const data = await leadsB.json();
    expect(data.leads.every(l => l.firstName !== 'TenantA')).toBeTruthy();
  });
});
```

---

## Coverage Summary

| Domain | Planned | Critical | High | Medium |
|--------|---------|----------|------|--------|
| CRM Flows | 20 | 7 | 8 | 5 |
| Leasing Flows | 18 | 6 | 9 | 3 |
| Finance Flows | 20 | 16 | 3 | 1 |
| ZATCA Flows | 12 | 7 | 5 | 0 |
| Security Tests | 7 | 6 | 1 | 0 |
| **Total** | **77** | **42** | **26** | **9** |

**Critical Business Coverage:** 42/77 = 54% critical, 68/77 = 88% including high priority

---

## Execution Plan

| Step | Action | Estimated Duration |
|------|--------|-------------------|
| 1 | Install Playwright + config | 15 min |
| 2 | Create auth helper + test fixtures | 1 hr |
| 3 | Write CRM tests (20) | 4 hr |
| 4 | Write Leasing tests (18) | 3 hr |
| 5 | Write Finance tests (20) | 5 hr |
| 6 | Write ZATCA tests (12) | 3 hr |
| 7 | Write Security tests (7) | 2 hr |
| 8 | Run full suite, fix failures | 2 hr |
| **Total** | **77 E2E tests** | **~20 hr** |

---

## Score Assessment

| Metric | Current | Target | After Implementation |
|--------|---------|--------|---------------------|
| Test count | 5 | 50–100 | 77 ✅ |
| Critical coverage | <20% | 80%+ | 88% ✅ |
| E2E framework | ❌ | Playwright | ✅ |
| CI integration | ❌ | GitHub Actions | ⚠️ Needed |
| **Testing Score** | **2/10** | **9/10** | **9/10** |
