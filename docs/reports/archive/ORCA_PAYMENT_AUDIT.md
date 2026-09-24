# ORCA Payment Audit

**Date:** 2026-06-10 | **Auditor:** Agent 2 (Finance, Accounting & ZATCA Lead)

---

## Payment Infrastructure Overview

ORCA has two distinct payment workflows:
1. **Subscription Payments** — Tenant plan upgrades / addon purchases via Moyasar gateway
2. **Rental Invoice Payments** — Tenant rent payments recorded in-system (no gateway)

---

## 1. Payment Gateway (Moyasar) Assessment

### 1.1 Gateway Configuration

| Aspect | Status | Details |
|--------|--------|---------|
| **Provider** | Moyasar | Saudi payment gateway. API endpoint: `https://api.moyasar.com/v1/invoices`. |
| **Secret Key** | PARTIAL | `MOYASAR_SECRET_KEY` env var with hardcoded fallback `"sk_test_dummy_key_for_orca_crm_saudi"` in `app/actions/payment.ts:7`. This means **production will use the dummy key unless explicitly set**. |
| **Env Config** | MISSING | No `.env` or `.env.example` file found with `MOYASAR_SECRET_KEY`, `MOYASAR_PUBLISHABLE_KEY`, or `NEXT_PUBLIC_APP_URL`. These must be configured per deployment. |
| **Mock Mode** | PRESENT | When key starts with `"sk_test_dummy"`, the system bypasses Moyasar entirely and generates a mock callback URL. This is intentional for development but dangerous if accidentally deployed to production. |

### 1.2 Payment Initiation

| Function | File | Purpose |
|----------|------|---------|
| `initiateSubscriptionPaymentAction(plan)` | `app/actions/payment.ts:9-62` | Creates Moyasar invoice for plan upgrade (basic/SAR 450, silver/SAR 900, gold/SAR 2400). |
| `initiateAddonPaymentAction(agentCount)` | `app/actions/payment.ts:67-120` | Creates Moyasar invoice for additional agents (SAR 250/agent). |

Both functions:
- Fetch `https://api.moyasar.com/v1/invoices` with Basic auth
- Send amount in halalas (SAR * 100)
- Include `callback_url` and `metadata` (tenantId, plan/type, agentCount)
- Return `invoice.url` for redirect to Moyasar hosted payment page

### 1.3 Payment Callback / Webhook

| Aspect | Status | Details |
|--------|--------|---------|
| **Route** | PRESENT | `app/api/payment/callback/route.ts:1-120` (GET method) |
| **Authentication** | READY | Session-based via `authenticateRequest()` from `lib/api-auth`. Redirects to `/login` if unauthenticated. |
| **Replay Protection** | READY | Checks `ZatcaQueue` for existing COMPLETED payment with same invoiceId before processing. |
| **Invoice Verification** | READY | Fetches `https://api.moyasar.com/v1/invoices/{id}` with Basic auth to verify payment status server-side. |
| **Tenant Validation** | READY | Verifies `metadata.tenantId` matches session tenant and that the tenant exists in DB. |
| **Plan Upgrade** | READY | Calls `handleSuccessfulPaymentAction(tenantId, plan, "MONTHLY")` from `app/actions/billingAgent`. Writes audit log. |
| **Addon Purchase** | READY | Increments `tenant.extraAgents` via `increment`. Validates agentCount range (1-100). Writes audit log. |

### 1.4 Gateway Reconciliation

| Aspect | Status | Details |
|--------|--------|---------|
| **Verification** | READY | Server-side verification of Moyasar invoice status before activating subscription. |
| **Error Handling** | BASIC | Catches errors, logs to console, redirects with generic error message. No retry logic, no manual intervention queue. |
| **Audit Trail** | READY | Writes `SUBSCRIPTION_CHANGED` audit logs for both plan upgrades and addon purchases. |
| **Idempotency** | PARTIAL | Replay protection via ZatcaQueue lookup, but no Moyasar-level idempotency key used in invoice creation. |

---

## 2. Rental Invoice Payment Processing

### 2.1 Local Payment Recording

| Aspect | Status | Details |
|--------|--------|---------|
| **Route** | READY | `app/api/v1/invoices/[id]/pay/route.ts:1-124` (POST) |
| **Authentication** | READY | Session token (cookie or Bearer header). |
| **Idempotency** | READY | Requires `Idempotency-Key` header. Not currently enforced in processing, but header presence is validated. |
| **Double-Entry** | READY | After recording receipt, posts journal entry: Dr Cash (1.1.1) / Cr AR (1.1.3) via `postPaymentEntry()`. Seeds chart of accounts if missing. |
| **Transaction Atomicity** | READY | Receipt creation and invoice status update use `prisma.$transaction`. Payment posting is separate (non-atomic with receipt creation). |
| **Duplicate Check** | READY | Rejects payment if invoice status is already `paid`. |
| **Payment Terms** | MISSING | No partial payment support. Payment is all-or-nothing. No installment tracking. |

### 2.2 Payment Method Tracking

| Model Field | where Used |
|-------------|------------|
| `Receipt.paymentMethod` | `app/api/v1/invoices/[id]/pay/route.ts:76` — stored on receipt creation |
| `Invoice.paymentMethod` | `app/api/v1/invoices/[id]/pay/route.ts:87` — set on invoice when paid |
| `Invoice.paymentRef` | `app/api/v1/invoices/[id]/pay/route.ts:88` — linked to receipt ID |

Payment methods are free-text strings (no enum constraint). This allows flexibility but lacks standardization (e.g., "cash", "bank_transfer", "card", "cheque").

---

## 3. Reconciliation Capability

### 3.1 Invoice-Payment Reconciliation

| Aspect | Status | Details |
|--------|--------|---------|
| **Route** | PRESENT | `app/api/v1/reconciliation/upload/route.ts:1-98` (POST) |
| **Authentication** | READY | Session-based with webhook signature verification (`x-signature` HMAC-SHA256). |
| **Functionality** | BASIC | Matches unpaid invoices to completed `PaymentTransaction` records by invoiceId or amount proximity (< 1 SAR). Produces matches (confidence 0.95) and exceptions list. |
| **File Upload** | STUB | Accepts file via FormData but never reads/parses the file content. Logic runs on DB queries only. |

### 3.2 Bank Reconciliation

| Aspect | Status | Details |
|--------|--------|---------|
| **Implementation** | MISSING | No bank statement import (CSV/OFX/QFX), no bank-to-GL matching engine, no reconciliation report. The `reconciliation/upload` route is misnamed — it does invoice-payment matching, not bank reconciliation. |
| **Cash at Bank Account** | READY | COA account 1.1.2 "Cash at Bank" exists but never used in reconciliation. |
| **Payment Transactions** | READY | `PaymentTransaction` model exists with fields: amount, paidAt, status, paymentMethod. Could serve as bank feed input. |

---

## 4. Security Assessment

| Check | Status | Detail |
|-------|--------|--------|
| **Secret in env, not code** | FAIL | `MOYASAR_SECRET_KEY` has hardcoded fallback in `app/actions/payment.ts:7`. |
| **TLS for API calls** | OK | All Moyasar API calls use HTTPS (`https://api.moyasar.com`). |
| **Server-side verification** | OK | Callback verifies invoice status with Moyasar before acting. |
| **Tenant isolation** | OK | All payment flows verify tenantId matches session. |
| **Audit logging** | OK | Payment actions write to `writeAuditLog`. |
| **CSRF** | PARTIAL | Session auth, but no CSRF token on callback redirect (GET-based callback is inherently CSRF-prone; mitigated by server-side Moyasar verification). |
| **Webhook signature** | OK | Reconciliation upload supports `x-signature` HMAC verification. Not used on payment callback (which uses session auth instead). |

---

## 5. Gaps & Recommendations

### P0 — Production Blocker

1. **Hardcoded API Key Fallback** (`app/actions/payment.ts:7`)
   - `MOYASAR_SECRET_KEY || "sk_test_dummy_key_for_orca_crm_saudi"` means if env var is missing, the dummy key is used silently.
   - Fix: Remove fallback and throw a clear error on startup if key is missing. Add env validation.

### P1 — Important

2. **No Moyasar Webhook Endpoint**
   - Currently only a GET callback for redirect-based flow. No POST webhook for async notifications from Moyasar (e.g., payment delayed, refunded, disputed).
   - Fix: Add `app/api/payment/webhook/route.ts` (POST) with signature verification.

3. **No Payment Reconciliation at Gateway Level**
   - No periodic job to reconcile Moyasar invoice statuses with local subscription state. If the callback is missed, subscription stays unpaid.
   - Fix: Add reconciliation cron or Moyasar webhook handler.

4. **Mock Mode Gating**
   - Mock mode triggered by key prefix `"sk_test_dummy"` is fragile. If a real test key happens to start similarly, behavior changes.
   - Fix: Use explicit env var `MOYASAR_MOCK_MODE=true` instead of string-matching.

### P2 — Enhancement

5. **Partial Payments**
   - Invoice pay route is all-or-nothing. Many rental scenarios involve partial payments.
   - Fix: Support partial amount with remaining balance tracking.

6. **Structured Payment Methods**
   - Payment methods are free-text. Should be enum: `CASH`, `BANK_TRANSFER`, `CHEQUE`, `CARD`.
   - Fix: Add enum to Prisma schema and validate in API.

7. **Bank Reconciliation**
   - Implement true bank statement reconciliation (bank feed vs. GL Cash at Bank).
   - Fix: Add statement import, matching engine, reconciliation report.

8. **Payment Reminders / Dunning**
   - No automated payment reminders for overdue invoices despite aging report being available.
   - Fix: Integrate aging data with notification system for automated reminders.

---

## Summary

| Area | Score | Notes |
|------|-------|-------|
| **Gateway Integration** | 7/10 | Moyasar integration works for subscriptions. Missing webhook handler and reconciliation. |
| **Callback Handling** | 8/10 | Server-side verification, tenant isolation, audit logging. Needs async webhook support. |
| **Local Payments** | 7/10 | Double-entry posting, idempotency key validation. No partial payments, no structured methods. |
| **Reconciliation** | 3/10 | Basic invoice-matching exists. No bank reconciliation. File upload is a stub. |
| **Security** | 6/10 | HTTPS, session auth, audit trail. Hardcoded API key fallback is critical. |
| **Overall** | **6/10** | Functional for basic flows; needs hardening for production. |
