# ORCA PHASE 3 — GATE CHECK REPORT
> **Status:** ALL TESTS EXECUTED
> **Method:** Static Analysis (code-path tracing)
> **Files Analyzed:** 42 files across 5 test domains

---

## RESULTS SUMMARY

| Test | Domain | Verdict | Critical? |
|------|--------|---------|-----------|
| TEST 1 | Tenant Isolation | **PASS** | ✅ |
| TEST 2 | Owner Portal Auth | **FAIL** | ❌ |
| TEST 3 | Tenant Portal Auth | **FAIL** | ❌ |
| TEST 4 | Paylink Webhook Security | **FAIL** | ❌ |
| TEST 5 | Payment Accounting Flow | **FAIL** | ❌ |

**Gate Result: FAIL — Phase 3 STOPPED per rule.**

---

## TEST 1 — TENANT ISOLATION PROOF

### Verdict: PASS ✅

### Evidence

**Layer 1 — Prisma Extension:** `lib/prisma.ts:39-71`
- All 36 models registered in `modelsWithTenantId`
- 5 newly added: Account, AccountBalance, JournalEntry, PaymentTransaction, CommissionPayment
- `$extends` hook auto-injects `tenantId` on every query (lines 80-103)

**Layer 2 — API Authentication:** Every accounting API route calls `authenticateRequest()` or `getTenantAndUser()`, which extracts `tenantId` from JWT session. All 17 routes verified.

**Layer 3 — Manual where clause:** All accounting lib functions (`financial-statements.ts:21`, `accounts-payable.ts:26`, `bank-reconciliation.ts:95`, etc.) accept `tenantId` parameter and pass it to `prisma.*.findMany({ where: { tenantId } })`.

**26 files audited, 70+ query sites traced.**

### Gaps Found: **0**

---

## TEST 2 — OWNER PORTAL AUTH PROOF

### Verdict: FAIL ❌

### Evidence

**Gap 1 — Auth Gate Missing:** `app\dashboard\layout.tsx:1-9`
- Does NOT call `getSession()`
- No redirect to login
- Unauthenticated user can access `/dashboard/owner-portal`
- Contrast: `app\operations\layout.tsx:19-22` correctly redirects

**Gap 2 — Units Table Leaks Data:** `app\dashboard\owner-portal\page.tsx:215`
```typescript
// Line 209-222 — renders ALL units, not ownerUnits
{units.slice(0, 10).map(u => (
```
Should be `ownerUnits.slice(0, 10).map(...)` — currently shows entire tenant's unit inventory regardless of owner.

**Gap 3 — Aggregate Queries Not Scoped:**
- RentalLeases query (line 27): `tenantId` only, no `tenantName` filter
- RentalInvoice aggregate (line 31): `tenantId` only
- Installments KPI (line 40): `tenantId` only
→ These aggregates include OTHER owners' data

### Passes

| Query | Filter | Status |
|-------|--------|--------|
| Contracts | `buyerName: ownerName` | ✅ PASS |
| Maintenance | `reportedBy: ownerName` | ✅ PASS |

### Full Report: `ORCA_OWNER_AUTH_PROOF.md`

---

## TEST 3 — TENANT PORTAL AUTH PROOF

### Verdict: FAIL ❌

### Evidence

**Gap 1 — Auth Gate Missing:** Same as Test 2 — `app\dashboard\layout.tsx` has no session check.

**Gap 2 — Invoices Query Leaks:** `app\dashboard\tenant-portal\page.tsx:27`
```typescript
prisma.rentalInvoice.findMany({
  where: { tenantId: tenant.id },  // ← NO tenantName filter
```
Shows ALL invoices across the organization, not just the current tenant user's invoices.

**Gap 3 — Payments Query Leaks:** `app\dashboard\tenant-portal\page.tsx:32`
```typescript
prisma.paymentTransaction.findMany({
  where: { tenantId: tenant.id },  // ← NO tenant filter
```
Same issue — all payment transactions visible.

### Passes

| Query | Filter | Status |
|-------|--------|--------|
| RentalLeases | `tenantName` | ✅ PASS |
| Maintenance | `reportedBy: tenantName` | ✅ PASS |

### Full Report: `ORCA_TENANT_AUTH_PROOF.md`

---

## TEST 4 — PAYLINK WEBHOOK SECURITY

### Verdict: FAIL ❌

### Evidence

**Critical Gaps Found:**

| # | Issue | File | Line | Severity |
|---|-------|------|------|----------|
| 1 | Endpoint is GET, not POST | `app/api/payment/callback/route.ts` | 10 | **CRITICAL** |
| 2 | No webhook secret validation | Same | — | **CRITICAL** |
| 3 | Gateway mismatch: Paylink creates invoice, Moyasar verifies it | `payment.ts` vs `callback/route.ts` | 15 / 38 | **CRITICAL** |
| 4 | Idempotency uses wrong table (zatcaQueue) | `callback/route.ts` | 25 | **HIGH** |
| 5 | Duplicate calls regenerate credentials | `callback/route.ts` | 45-78 | **HIGH** |
| 6 | No HMAC signature check from Paylink | `callback/route.ts` | — | **HIGH** |

**Scenario Results:**

| Scenario | Expected | Actual | Verdict |
|----------|----------|--------|---------|
| POST بدون Authorization | Reject 401 | Undefined (no POST handler) | FAIL |
| POST مع Authorization خاطئ | Reject 401 | Undefined | FAIL |
| POST مع Authorization صحيح | Process payment | Undefined | FAIL |
| Duplicate webhook نفس Payment ID | Reject duplicate | Would process again (no idempotency) | FAIL |

**Root causes:**
- Callback is designed as browser redirect (GET) after user payment, NOT as a Paylink server-to-server webhook
- No separate POST webhook endpoint exists for Paylink callbacks
- Gateway initialization checks Moyasar (line 38) but payment creation uses Paylink — cross-gateway mismatch
- Idempotency key is stored against `zatcaQueue`, not a payment-specific table

### Full Report: `ORCA_PAYLINK_SECURITY_PROOF.md`

---

## TEST 5 — PAYMENT ACCOUNTING FLOW

### Verdict: FAIL ❌

### Evidence

**Complete Flow Trace:**

| Step | File | Line | Status |
|------|------|------|--------|
| Invoice creation | `app/api/v1/invoices/route.ts` | POST | ✅ PASS |
| Paylink payment initiation | `app/actions/payment.ts` | 71-78 | ✅ PASS |
| Webhook callback | `app/api/payment/callback/route.ts` | 10 | ❌ FAIL — GET not POST |
| PaymentTransaction creation | — | — | ❌ **NEVER CREATED** |
| JournalEntry posting | — | — | ❌ **NEVER POSTED** |
| AccountBalance update | — | — | ❌ **NEVER UPDATED** |

**Root causes:**
- `handleSuccessfulPaymentAction` (`app/actions/billingAgent.ts`) only updates `tenant.status` and `tenant.planExpiry` — does not create `PaymentTransaction`, `JournalEntry`, or update `AccountBalance`
- No accounting integration for subscription payments at all
- Subscription revenue is invisible to the general ledger
- Rental invoice payments DO flow through to accounting (via `processPayment` in `app/actions/finance.ts`)

**What works:** Rental invoice → payment → receipt → journal entry → account balance (partially, with FI-01 risk — outside transaction)

**What's missing:** Subscription payments → accounting (entire path absent)

### Full Report: `ORCA_PAYMENT_FLOW_PROOF.md`

---

## GATE DECISION

```
╔═══════════════════════════════════════════╗
║   PHASE 3 GATE: FAIL                     ║
║                                           ║
║   Tests passed: 1/5  (20%)                ║
║   Tests failed: 4/5  (80%)                ║
║                                           ║
║   PHASE 3 VALIDATION STOPPED              ║
║   Per rule: أي اختبار FAIL يوقف Phase 3   ║
╚═══════════════════════════════════════════╝
```

---

## FAILURE ANALYSIS BY FIXABILITY

| Test | Gaps | Fix Complexity | Estimated Lines | 
|------|------|---------------|-----------------|
| TEST 2 | 3 (auth gate, units table, aggregate queries) | **TRIVIAL** | ~15 lines |
| TEST 3 | 3 (auth gate, invoices query, payments query) | **TRIVIAL** | ~15 lines |
| TEST 4 | 6 (webhook security, gateway mismatch, idempotency) | **MODERATE** | ~80 lines |
| TEST 5 | 3 (PaymentTransaction, JournalEntry, AccountBalance) | **MODERATE** | ~60 lines |

---

## RECOMMENDED FIX PLAN

### Phase 3.1 — Rapid Fix (Tests 2 & 3: ~20 min)
1. Add session gate to `app/dashboard/layout.tsx`
2. Fix units table in Owner Portal (line 215: `units` → `ownerUnits`)
3. Add tenantName filter to invoices + payments in Tenant Portal

### Phase 3.2 — Payment Security (Tests 4 & 5: ~60 min)
1. Add POST webhook endpoint for Paylink callbacks
2. Add Paylink HMAC signature validation
3. Fix idempotency: store on PaymentTransaction, not zatcaQueue
4. Create PaymentTransaction in callback
5. Post JournalEntry for subscription payments
6. Update AccountBalance from JournalEntry

**After fixes, re-run all 5 tests before attempting Phase 3 again.**
