# Load Test Report – ORCA CRM

**Date:** 2026-06-09
**Engineer:** Performance Engineer
**Tool:** k6 (recommended)

---

## Setup

### Install k6

```bash
# Windows (PowerShell)
winget install k6 --source winget
# or
choco install k6
```

### Test Configuration: `k6/load-test.js`

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL = 'https://orca.az-ez.pro';
const LOGIN_EMAIL = 'admin@dar-al-amar.com';
const LOGIN_PASSWORD = 'Orca@Secure2026!';

const errorRate = new Rate('errors');
const loginTrend = new Trend('login_duration');
const dashboardTrend = new Trend('dashboard_duration');
const invoiceTrend = new Trend('invoice_duration');
const reportTrend = new Trend('report_duration');

// Get auth token
function getToken() {
  const res = http.post(`${BASE_URL}/api/v1/auth/login`, {
    email: LOGIN_EMAIL,
    password: LOGIN_PASSWORD,
  }, { tags: { name: 'login' } });
  return res.json().token;
}

export const options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp up to 100 users
    { duration: '5m', target: 100 },   // Stay at 100
    { duration: '2m', target: 500 },   // Ramp up to 500
    { duration: '5m', target: 500 },   // Stay at 500
    { duration: '2m', target: 1000 },  // Ramp up to 1000
    { duration: '5m', target: 1000 },  // Stay at 1000
    { duration: '2m', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000'], // 95% of requests under 5s
    errors: ['rate<0.10'],             // Error rate under 10%
    login_duration: ['p(95)<3000'],    // Login under 3s
    dashboard_duration: ['p(95)<3000'], // Dashboard under 3s
    invoice_duration: ['p(95)<2000'],   // Invoice under 2s
    report_duration: ['p(95)<8000'],    // Reports under 8s
  },
};

export default function () {
  const token = getToken();
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // 1. Load Dashboard (GET)
  let res = http.get(`${BASE_URL}/api/v1/dashboard/stats`, { headers, tags: { name: 'dashboard' } });
  check(res, { 'dashboard status 200': (r) => r.status === 200 });
  dashboardTrend.add(res.timings.duration);
  errorRate.add(res.status !== 200);
  sleep(1);

  // 2. List Leads (GET)
  res = http.get(`${BASE_URL}/api/v1/leads?limit=20`, { headers, tags: { name: 'leads' } });
  check(res, { 'leads status 200': (r) => r.status === 200 });
  sleep(0.5);

  // 3. Create Invoice (POST)
  res = http.post(`${BASE_URL}/api/v1/invoices`, {
    leaseId: LEASE_ID,
    subtotal: 5000,
    dueDate: '2026-07-01',
  }, { headers, tags: { name: 'create_invoice' } });
  check(res, { 'invoice created': (r) => r.status === 201 });
  invoiceTrend.add(res.timings.duration);
  errorRate.add(res.status !== 201);
  sleep(1);

  // 4. Pay Invoice (POST)
  const invoiceId = res.json().invoice.id;
  res = http.post(`${BASE_URL}/api/v1/invoices/${invoiceId}/pay`, {
    amount: 5750,
    method: 'BANK_TRANSFER',
  }, { 
    headers: { ...headers, 'Idempotency-Key': `load-test-${__VU}-${Date.now()}` },
    tags: { name: 'pay_invoice' },
  });
  check(res, { 'payment success': (r) => r.status === 200 });
  errorRate.add(res.status !== 200);
  sleep(1);

  // 5. Trial Balance (GET)
  res = http.get(`${BASE_URL}/api/v1/accounting/trial-balance`, { headers, tags: { name: 'trial_balance' } });
  check(res, { 'trial balance 200': (r) => r.status === 200 });
  reportTrend.add(res.timings.duration);
  errorRate.add(res.status !== 200);
  sleep(1);

  // 6. Aging Report (GET)
  res = http.get(`${BASE_URL}/api/v1/accounting/aging-report`, { headers, tags: { name: 'aging_report' } });
  check(res, { 'aging report 200': (r) => r.status === 200 });
  reportTrend.add(res.timings.duration);
  sleep(1);
}
```

---

## Expected Results

### 100 Concurrent Users

| Endpoint | Avg | P50 | P95 | P99 | Error Rate |
|----------|-----|-----|-----|-----|------------|
| Login | 800ms | 600ms | 1.5s | 2s | 0% |
| Dashboard | 1.2s | 1s | 2s | 3s | 0% |
| List Leads | 400ms | 300ms | 800ms | 1.2s | 0% |
| Create Invoice | 900ms | 800ms | 1.5s | 2s | 0% |
| Pay Invoice | 1.1s | 900ms | 1.8s | 2.5s | 0% |
| Trial Balance | 500ms | 400ms | 1s | 1.5s | 0% |
| Aging Report | 300ms | 250ms | 600ms | 1s | 0% |

### 500 Concurrent Users

| Endpoint | Avg | P50 | P95 | P99 | Error Rate |
|----------|-----|-----|-----|-----|------------|
| Login | 1.5s | 1.2s | 3s | 4s | 1% |
| Dashboard | 2s | 1.5s | 3.5s | 5s | 2% |
| List Leads | 800ms | 600ms | 1.5s | 2.5s | 0% |
| Create Invoice | 1.8s | 1.5s | 3s | 4s | 1% |
| Pay Invoice | 2.2s | 1.8s | 3.5s | 5s | 2% |
| Trial Balance | 1s | 800ms | 2s | 3s | 1% |
| Aging Report | 600ms | 500ms | 1.2s | 2s | 0% |

### 1000 Concurrent Users

| Endpoint | Avg | P50 | P95 | P99 | Error Rate |
|----------|-----|-----|-----|-----|------------|
| Login | 3s | 2.5s | 5s | 8s | 5% |
| Dashboard | 3.5s | 3s | 6s | 10s | 8% |
| List Leads | 1.5s | 1.2s | 3s | 5s | 3% |
| Create Invoice | 3.5s | 3s | 6s | 10s | 5% |
| Pay Invoice | 4s | 3.5s | 7s | 12s | 8% |
| Trial Balance | 2s | 1.5s | 4s | 6s | 3% |
| Aging Report | 1.2s | 1s | 2.5s | 4s | 2% |

---

## Bottleneck Analysis

| Bottleneck | Affected | Severity | Mitigation |
|------------|----------|----------|------------|
| **Database connection pool** (`max: 1`) | All endpoints | Critical | Increase `max` to 10–20, use connection pooling |
| **In-memory rate limiter** | Login | High | Replace with Vercel KV/Redis |
| **Synchronous VAT calculation** | Invoice creation | Medium | Make async if possible |
| **Full-table scans for reports** | Reports | Medium | Add composite indexes |
| **Missing pagination** | Lead listing | Medium | Add cursor-based pagination |
| **Sentry tracing overhead** | All endpoints | Low | Reduce tracesSampleRate to 0.1 |

---

## Load Testing Prerequisites

Before running load tests, ensure:

1. [ ] Database connection pool size increased from 1 to 20
2. [ ] 8 composite indexes added (see PERFORMANCE_AUDIT_REPORT.md)
3. [ ] Rate limiter moved to Vercel KV
4. [ ] `CRON_SECRET` env var defined (needed for cron auth, but load test bypasses)
5. [ ] Test tenant with 10k+ financial transactions pre-loaded

---

## Running the Tests

```bash
# Install k6
winget install k6

# Run load test
k6 run k6/load-test.js

# Run with HTML report
k6 run k6/load-test.js --out json=results.json

# Analyze results
k6 run k6/load-test.js --summary-trend-stats="avg,p(50),p(95),p(99)"
```

---

## Score Assessment

| Scenario | Expected Score | Target | Status |
|----------|---------------|--------|--------|
| 100 users | 9/10 | 9/10 | ✅ Expected |
| 500 users | 8/10 | 8/10 | ✅ Expected |
| 1000 users | 6/10 | 7/10 | ⚠️ Needs pool + indexes |
| **Load Test Score** | **7.5/10** | **8.5/10** | ⚠️ |
