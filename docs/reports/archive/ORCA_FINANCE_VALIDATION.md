# ORCA Finance Validation Report

**Date:** 2026-06-10  
**Cycle:** Invoice → QR → PDF → Paylink → Webhook → PaymentTransaction → JournalEntry → AccountBalance → Receipt

---

## STEP 1: Invoice Creation

**File:** `app/api/v1/invoices/route.ts:POST` (lines 70-173)

### Prisma Models Created
| Model | Operation | Line | 
|---|---|---|
| `rentalInvoice` | `.create()` | 118-135 |
| `tenant` | `.update()` (counter increment) | 111-114 |

Additionally referenced (read-only):
- `rentalLease` queried via `.findFirst()` at line 89-93

### VAT Calculation
- **YES** — `calculateVat()` from `lib/vat/engine.ts:13-19` called at line 99
- `validateVatInput()` from `lib/vat/engine.ts:21-25` called at line 84
- VAT rates: STANDARD = 15%, ZERO_RATED = 0%, EXEMPT = 0% (`lib/vat/engine.ts:3-7`)

### QR Generation
- **YES** — `buildQrPayload()` at line 101-106, `encodeQrCode()` at line 107, `generateQrImage()` at line 108
- Stored in invoice: `qrPayload` (JSON), `qrCode` (base64 TLV), `qrImage` (PNG data URL)

### JournalEntry Creation
- **NO** — `postInvoiceEntry()` exists (`lib/accounting/posting-engine.ts:145-186`) but is NOT called in `POST /api/v1/invoices`
- JournalEntry is only created separately via `POST /api/accounting/settle-lease` (`app/api/accounting/settle-lease/route.ts:88`)
- **GAP: Invoice creation and accounting are decoupled** — no automatic JournalEntry on invoice creation

---

## STEP 2: QR Generation

**File:** `lib/zatca/qr.ts` (53 lines total)

### TLV Encoding
- **YES** — `encodeTlv()` at lines 28-36 encodes 5 tags:
  - Tag 1: Seller Name (line 30)
  - Tag 2: VAT Number (line 31)
  - Tag 3: Timestamp (ISO 8601) (line 32)
  - Tag 4: Total (line 33)
  - Tag 5: VAT Total (line 34)
- `encodeTlvTag()` at lines 4-11: tag byte + length byte + UTF-8 value Buffer
- Encoded as base64 via `encodeQrCode()` at lines 38-41

### PNG Image Generation
- **YES** — `generateQrImage()` at lines 43-49 uses `qrcode` package `toDataURL()`
- Width: 300, margin: 2, dark: #000000, light: #ffffff

### Invoice Label Format
- `formatInvoiceLabel()` at lines 51-53: `{prefix}-{year}-{number padded to 6 digits}`
- Example: `INV-2026-000001`

---

## STEP 3: PDF Generation

### Invoice PDF

**File:** `app/api/v1/invoices/[id]/pdf/route.ts` (158 lines)

| Feature | Status | Line |
|---|---|---|
| HTML output | **YES** — inline HTML with embedded CSS | 47-146 |
| RTL support | **YES** — `dir="rtl"` | 48 |
| Seller info | **YES** — company name, VAT, CR, address | 92-98 |
| Customer info | **YES** — tenant name, unit name | 99-103 |
| Line items | **YES** — table with description + amount | 106-119 |
| Totals breakdown | **YES** — subtotal, VAT rate, VAT amount, grand total | 121-126 |
| QR code image | **YES** — embedded as `<img>` if `qrImage` exists | 128 |
| Print button | **YES** — `class="no-print"` | 140-142 |
| Download mode | **YES** — `?download=1` triggers auto-print + Content-Disposition header | 28-29, 144, 151-153 |
| Auth guard | **YES** — cookie + tenantId scoping | 17-25, 31-36 |

### Contract PDF

**File:** `app/api/v1/contracts/[id]/pdf/route.ts` (185 lines)

| Feature | Status | Line |
|---|---|---|
| HTML output | **YES** | 49-173 |
| Installment schedule | **YES** — table listing installment number, amount, VAT, due date, status | 131-155 |
| Buyer info | **YES** — name, phone, unit details | 99-106 |
| Download mode | **YES** | 27-28, 171, 178-180 |

---

## STEP 4: Paylink Link

**File:** `app/actions/payment.ts` (120 lines)

### API Call
| Feature | Status | Line |
|---|---|---|
| Paylink API endpoint | `POST {PAYLINK_BASE}/invoice` | 23 |
| Auth header | `Authorization: Bearer {PAYLINK_SECRET}` | 26 |
| Idempotency key | Generated per call: `orca-{timestamp}-{random}` | 11-13, 28 |
| Callback URL | `{APP_URL}/api/payment/callback` | 34 |
| Error handling | Returns `{ success: false, error }` on failure | 39-48 |
| Placeholder guard | Blocks if PAYLINK_SECRET is the placeholder value | 64-68 (`initiateSubscriptionPaymentAction`) |

### Metadata (subscription)
| Field | Value | Line |
|---|---|---|
| `tenantId` | `tenant.id` | 75 |
| `plan` | `"basic"` / `"silver"` / `"gold"` | 76 |

### Metadata (addon)
| Field | Value | Line |
|---|---|---|
| `type` | `"addon"` | 109 |
| `tenantId` | `tenant.id` | 110 |
| `agentCount` | `String(agentCount)` | 111 |

### Plan Prices (halalas)
| Plan | Price | Line |
|---|---|---|
| basic | 45,000 | 57 |
| silver | 90,000 | 58 |
| gold | 240,000 | 59 |
| addon (per agent) | 25,000 | 96 |

---

## STEP 5: Paylink Webhook

**File:** `app/api/payments/paylink/webhook/route.ts` (133 lines)

### Auth Check
- Bearer token compared against `PAYLINK_WEBHOOK_SECRET` env var (lines 24-32)
- Returns 503 if secret not configured, 401 if mismatch

### Idempotency (Two Layers)
| Layer | Mechanism | Lines | Window |
|---|---|---|---|
| **In-memory Map** | `isDuplicate(paymentRef)` checks `idempotencyCache` Map | 12-20, 40 | 60 seconds |
| **Database** | `prisma.paymentTransaction.findFirst({ gatewayRef: paymentRef })` | 49-53 | Permanent |

- If either layer finds existing record → returns `{ status: "already_processed" }` (200)
- **Note:** In-memory cache is ephemeral (lost on restart); DB check is the durable safeguard

### PaymentTransaction Creation
- Created via `prisma.paymentTransaction.create()` at lines 66-79
- Fields: `tenantId`, `amount` (halalas), `fee` (0), `netAmount`, `currency` ("SAR"), `method` ("paylink"), `status` ("COMPLETED"), `gatewayRef`, `gatewayResponse` (raw body JSON), `paidAt`

### Tenant Update (subscription only)
- Updated if `plan` metadata is present and amount > 0 (lines 81-96)
- Fields updated: `subscriptionPlan`, `isActive`, `paymentStatus` → "PAID", `billingCycle` → "MONTHLY", `subscriptionExpiresAt` → now + 30 days

### JournalEntry (Accounting)
- Uses `findAccountByCode(tenantId, "1.1.1")` for Cash (line 100)
- Uses `findAccountByCode(tenantId, "4.1.1")` for Revenue (line 101)
- Debit: Cash (1.1.1), Credit: Revenue (4.1.1) (lines 109-111)
- Wrapped in try/catch — failures are logged but do NOT fail the webhook response (lines 114-116)

### Audit Log
- `writeAuditLog()` at lines 119-126 — action: `"PAYMENT_RECEIVED"`, userId: `"system"`

---

## STEP 6: JournalEntry (postJournalEntry)

**File:** `lib/accounting/posting-engine.ts:31-101`

### Validation
| Rule | Check | Line |
|---|---|---|
| Minimum 2 lines | `lines.length < 2` throws `PostingError` | 34 |
| Debit = Credit | `abs(totalDebit - totalCredit) > 0.01` tolerance | 38-45 |
| Entry number | Auto-incremented per tenant via `MAX(entryNumber) + 1` | 47-52 |

### Transaction
- Wrapped in `prisma.$transaction()` (line 54)
- Creates `journalEntry` + nested `journalLine` records (lines 55-73)
- Status: `'POSTED'`

### Entry Types Available (same file)
| Function | Source | Lines |
|---|---|---|
| `postInvoiceEntry` | INVOICE | 145-186 (AR debit, Revenue credit, VAT payable credit) |
| `postPaymentEntry` | RECEIPT | 188-215 (Cash debit, AR credit) |
| `postCommissionEntry` | COMMISSION | 217-244 (Expense debit, Cash credit) |
| `postRefundEntry` | REFUND | 246-273 (Revenue debit, Cash credit) |
| `postInstallmentEntry` | INSTALLMENT | 275-316 (AR debit, Revenue credit, VAT payable credit) |
| `reverseJournalEntry` | REVERSAL | 103-137 (swapped debit/credit, marks original as REVERSED) |

---

## STEP 7: AccountBalance Upsert

**File:** `lib/accounting/posting-engine.ts:75-95`

```typescript
await tx.accountBalance.upsert({
  where: {
    accountId_period_tenantId: {
      accountId: line.accountId,
      period,          // "YYYY-MM" format
      tenantId,
    },
  },
  create: { accountId, tenantId, period, debit: line.debit, credit: line.credit },
  update: { debit: { increment: line.debit }, credit: { increment: line.credit } },
});
```

- Unique compound key: `(accountId, period, tenantId)` — see Prisma schema lines 656-670
- Atomic increments within the same `$transaction` as JournalEntry creation
- Period derived from current date via `getPeriod()` (`lib/accounting/utils.ts:1-6`)

---

## STEP 8: Receipt

**File:** `app/api/v1/invoices/[id]/pay/route.ts:POST` (124 lines)

### Receipt Creation
- `seedChartOfAccounts()` called first (line 58) — ensures accounts exist
- Creates `receipt` + updates `rentalInvoice` in `$transaction()` (lines 70-93)
- Receipt fields: `tenantId`, `invoiceId`, `amount`, `paymentMethod`, `status: "COMPLETED"`, `receivedDate`
- Invoice fields updated: `status: "paid"`, `paidAt`, `paymentMethod`, `paymentRef: receipt.id`

### JournalEntry Posting
- Uses `findAccountByCode(tenantId, "1.1.1")` → Cash (line 95)
- Uses `findAccountByCode(tenantId, "1.1.3")` → Accounts Receivable (line 96)
- Calls `postPaymentEntry()` — Debit Cash, Credit AR (lines 99-105)
- Only posts if both accounts found (line 98)

### Idempotency
- Idempotency key **REQUIRED** in request header (lines 37-44)
- But **NOT CHECKED** against any cache or database — `idempotencyCached: false` returned (line 111)
- **GAP: Header is validated as present but never used for deduplication**

---

## SCENARIO ANALYSIS

### SCENARIO 1: Success Payment — Full Flow

| Step | Status | Evidence |
|---|---|---|
| Invoice created | ✅ PASS | `app/api/v1/invoices/route.ts:118-135` |
| QR generated (TLV + PNG) | ✅ PASS | `lib/zatca/qr.ts:28-49` |
| PDF renderable | ✅ PASS | `app/api/v1/invoices/[id]/pdf/route.ts:47-146` |
| Paylink API call with metadata | ✅ PASS | `app/actions/payment.ts:23-49, 74-77` |
| Webhook receives payment | ✅ PASS | `app/api/payments/paylink/webhook/route.ts:22-132` |
| PaymentTransaction created | ✅ PASS | `app/api/payments/paylink/webhook/route.ts:66-79` |
| Tenant subscription updated | ✅ PASS | `app/api/payments/paylink/webhook/route.ts:81-96` |
| JournalEntry posted | ⚠️ PASS WITH ISSUES | Revenue account "4.1.1" not in COA seed — see GAP below |
| AccountBalance upserted | ✅ PASS | `lib/accounting/posting-engine.ts:75-95` |
| Receipt created | ✅ PASS | `app/api/v1/invoices/[id]/pay/route.ts:71-93` |
| Receipt JournalEntry posted | ✅ PASS | `app/api/v1/invoices/[id]/pay/route.ts:99-105` |

**GAP: Revenue account "4.1.1" does not exist in COA seed.**
- COA defines `4.1` (Rental Revenue) as a leaf account with no children (`lib/accounting/chart-of-accounts.ts:119-121`)
- `4.1.1` is never seeded
- Webhook at `app/api/payments/paylink/webhook/route.ts:101` calls `findAccountByCode(tenantId, "4.1.1")` → returns `null`
- Revenue credit JournalEntry is silently skipped (try/catch at lines 114-116)
- **Impact:** Cash is debited but Revenue is never credited — unbalanced books if cash account exists

**GAP: Invoice creation does NOT post JournalEntry.**  
- `postInvoiceEntry()` exists (`posting-engine.ts:145-186`) but is only called from `settle-lease` route
- The `POST /api/v1/invoices` route creates a `rentalInvoice` record but does not create a JournalEntry
- **Impact:** Invoice A/R is not recorded in the general ledger at invoice time — only at payment time

---

### SCENARIO 2: Failed Payment — Paylink Rejection

| Aspect | Status | Evidence |
|---|---|---|
| Paylink API error handling | ✅ PASS | `app/actions/payment.ts:39-48` — catches non-OK response, returns `{ success: false }` |
| Placeholder secret guard | ✅ PASS | `app/actions/payment.ts:64-68` — returns clear error in Arabic |
| No state mutated on failure | ✅ PASS | No Prisma writes before API call; all writes after success |
| No stale PaymentTransaction | ✅ PASS | Transaction only created in webhook, which only fires on success |
| Error logged | ✅ PASS | `console.error("[Paylink] create invoice error:", ...)` at line 47 |

**Verdict: PASS** — Clean failure, no orphaned state.

---

### SCENARIO 3: Duplicate Webhook — Idempotency

| Layer | Mechanism | Status | Evidence |
|---|---|---|---|
| In-memory Map | `isDuplicate()` checks `idempotencyCache` | ✅ PASS | `app/api/payments/paylink/webhook/route.ts:12-20` |
| DB findFirst | `PaymentTransaction.findFirst({ gatewayRef })` | ✅ PASS | `app/api/payments/paylink/webhook/route.ts:49-53` |
| 200 response on duplicate | Returns `{ status: "already_processed" }` | ✅ PASS | Lines 41, 53 |
| Non-"paid" status filtered | Ignores non-paid statuses | ✅ PASS | Lines 44-47 |

**Note:** In-memory Map has 60-second TTL and is lost on server restart. The DB check is the durable safeguard. If both layers are bypassed due to race condition (unlikely with Prisma unique constraint), a duplicate PaymentTransaction could be created. The `gatewayRef` field has no `@unique` constraint in the Prisma schema (line 724: just `String?`).

**Verdict: PASS WITH ISSUES** — Effective for single-instance deployments but:
- `gatewayRef` on `PaymentTransaction` has **no `@unique` constraint** in `prisma/schema.prisma:724` — race condition could create duplicates
- In-memory Map is lost on restart

---

### SCENARIO 4: Partial Payment

| Aspect | Status | Evidence |
|---|---|---|
| Amount accepted from body | ✅ PASS | `app/api/v1/invoices/[id]/pay/route.ts:48` |
| Amount validated against invoice total | ❌ FAIL | No comparison of `amount` vs `invoice.totalAmount` |
| Invoice marked fully paid | ❌ FAIL | `status: 'paid'` set at line 85 regardless of amount paid |
| Remaining balance tracked | ❌ FAIL | No `remainingBalance` or `paidAmount` field on RentalInvoice |
| `RentalInvoice` model supports partial payment | ❌ FAIL | Schema has no `paidAmount`, `remainingAmount`, or `partialPaid` status (`prisma/schema.prisma:400-438`) |
| `Receipt` model has `amount` field but no `remainingBalance` | ⚠️ INFO | `prisma/schema.prisma:601-614` |

**Verdict: FAIL** — Partial payments are not supported:
1. Any payment amount marks the invoice as fully paid
2. No partial payment status exists in the data model
3. No remaining balance calculated or stored

---

### SCENARIO 5: Payment Retry

| Aspect | Status | Evidence |
|---|---|---|
| Retry in `createPaylinkInvoice()` | ❌ FAIL | No retry logic in `app/actions/payment.ts:15-50` — one attempt only |
| Retry in webhook handler | N/A | Webhook is server-to-server push; retry is Paylink's responsibility |
| Retry in payment initiation action | ❌ FAIL | `initiateSubscriptionPaymentAction()` (line 52-85) calls once, returns error |
| Idempotency key reuse | ⚠️ N/A | New key generated per call; cannot safely retry same payment |
| Other retry patterns in codebase | ℹ️ EXISTS | ZATCA queue retry (`lib/zatca/queue.ts`), agent retry (`lib/agents/baseer.ts`) — but NOT payment |

**Verdict: FAIL** — No automatic retry for Paylink API calls:
1. If `createPaylinkInvoice` fails (network error, 5xx), user receives error and must manually retry
2. No exponential backoff, no retry queue, no dead-letter mechanism
3. Each call generates a new idempotency key, so the same payment intent could create multiple Paylink invoices on manual retry

---

## CRITICAL GAPS SUMMARY

| # | Gap | Severity | File + Line |
|---|---|---|---|
| 1 | Revenue account code `"4.1.1"` not in COA seed — webhook JE silently fails | **HIGH** | `app/api/payments/paylink/webhook/route.ts:101` |
| 2 | Webhook does not call `seedChartOfAccounts()` before `findAccountByCode()` | **MEDIUM** | `app/api/payments/paylink/webhook/route.ts:100-101` |
| 3 | Invoice creation does not auto-post JournalEntry (decoupled from accounting) | **MEDIUM** | `app/api/v1/invoices/route.ts:110-138` |
| 4 | `gatewayRef` has no `@unique` constraint on `PaymentTransaction` | **MEDIUM** | `prisma/schema.prisma:724` |
| 5 | Partial payment not supported — any amount marks invoice as `paid` | **HIGH** | `app/api/v1/invoices/[id]/pay/route.ts:85` |
| 6 | Invoice pay route requires idempotency key but never checks it | **MEDIUM** | `app/api/v1/invoices/[id]/pay/route.ts:37-44` |
| 7 | No payment retry mechanism | **MEDIUM** | `app/actions/payment.ts:15-50` |
| 8 | `rentalInvoice` model has no `paidAmount` / `remainingBalance` fields | **MEDIUM** | `prisma/schema.prisma:400-438` |

---

## FIX RECOMMENDATIONS

1. **Fix revenue account code:** Change `"4.1.1"` → `"4.1"` in webhook, or add `4.1.1` child to COA seed
2. **Add `seedChartOfAccounts(tenantId)`** before `findAccountByCode` in webhook handler
3. **Add `postInvoiceEntry()` call** to `POST /api/v1/invoices` after invoice creation
4. **Add `@@unique([gatewayRef])`** on `PaymentTransaction` model
5. **Add partial payment support:** 
   - Add `partial` status to invoice
   - Compare `amount` against `totalAmount`
   - Add `paidAmount` and `remainingBalance` to `RentalInvoice`
6. **Implement idempotency key check** in invoice pay route (in-memory Map + DB `findFirst` on receipt)
7. **Add retry with backoff** to `createPaylinkInvoice()` for 5xx/network errors
