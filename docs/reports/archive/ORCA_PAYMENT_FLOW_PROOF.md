# ORCA PAYMENT FLOW PROOF — Complete Accounting Trace

**Date:** 2026-06-10
**Scope:** Full payment cycle: Invoice → Payment → Webhook → PaymentTransaction → JournalEntry → AccountBalance
**References:** `FINANCIAL_INTEGRITY_REVIEW.md` (prior audit, findings FI-01 through FI-13)

---

## FLOW 1: SUBSCRIPTION PAYMENT (Paylink/Moyasar)

This is the **primary payment flow** — a user pays to activate/upgrade their SaaS subscription.

### Step 1: Invoice Creation → Paylink

**File:** `app/actions/payment.ts:52-85`
**Function:** `initiateSubscriptionPaymentAction`

```typescript
// Line 71-78
const result = await createPaylinkInvoice({
  amount: amountInHalalas,
  description: `ترقية باقة ... - ${tenant.companyName}`,
  metadata: {
    tenantId: tenant.id,   // ✅ tenantId propagated
    plan,                   // ✅ plan propagated
  },
});
```

**`createPaylinkInvoice`** at `app/actions/payment.ts:15-50`:
```typescript
// Line 23-36
const response = await fetch(`${PAYLINK_BASE}/invoice`, {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${PAYLINK_SECRET}`,
    "Content-Type": "application/json",
    "Idempotency-Key": idempotencyKey,     // Full-regenerated per call
  },
  body: JSON.stringify({
    amount: params.amount,
    currency: "SAR",
    description: params.description,
    callback_url: `${APP_URL}/api/payment/callback`,   // Line 34
    metadata: params.metadata,                          // {tenantId, plan}
  }),
});
```

**Records created at this step:** NONE in the local database.
- No `PaymentTransaction` is created
- No `RentalInvoice` is created
- No journal entry is created
- Only an external Paylink invoice is generated

**tenantId propagation:** ✅ Carried in `metadata.tenantId`

---

### Step 2: Payment Action (User Redirected to Paylink)

**File:** `app/actions/payment.ts:52-85`
**Function:** `initiateSubscriptionPaymentAction`

```typescript
// Lines 52-84
export async function initiateSubscriptionPaymentAction(plan: "basic" | "silver" | "gold") {
  const tenant = await getActiveTenant();                    // Line 54
  const amountInHalalas = planPrices[plan] || 45000;        // Line 62

  if (!PAYLINK_SECRET || PAYLINK_SECRET === "test_secret_key_placeholder") {
    return { success: false, error: "..." };                // Lines 64-68
  }

  const result = await createPaylinkInvoice({               // Line 71
    amount: amountInHalalas,
    description: `... - ${tenant.companyName}`,
    metadata: { tenantId: tenant.id, plan },
  });

  return result;                                            // Line 80
}
```

**Records created:** NONE locally.
**tenantId:** ✅ From `getActiveTenant()` → cookie-based session → metadata → Paylink

---

### Step 3: Webhook Callback (Browser Redirect)

**File:** `app/api/payment/callback/route.ts:1-120`

```typescript
// Line 10
export async function GET(request: NextRequest) {
  // Lines 11-15: Session auth (NOT webhook secret auth)
  const session = await authenticateRequest(request);
  if (!session) { return NextResponse.redirect(fallbackUrl); }

  // Lines 17-18: Extract query params
  const invoiceId = searchParams.get("id");
  const status = searchParams.get("status");

  // Lines 24-27: Validate status
  if (!invoiceId || status !== "paid") {
    return NextResponse.redirect(fallbackUrl);
  }

  // ⚠️ Lines 30-38: BOGUS IDEMPOTENCY CHECK
  const existing = await prisma.zatcaQueue.findFirst({
    where: { invoiceId, status: "COMPLETED" },
  });
  if (existing) { /* return early */ }

  // ⚠️ Lines 40-47: VERIFY WITH DIFFERENT GATEWAY (Moyasar ≠ Paylink)
  const response = await fetch(`https://api.moyasar.com/v1/invoices/${invoiceId}`, {
    headers: {
      "Authorization": `Basic ${Buffer.from(MOYASAR_SECRET_KEY + ":").toString("base64")}`,
    },
  });
  if (!response.ok) { throw new Error("..."); }

  // Lines 50-58: Extract metadata from Moyasar response
  const invoice = await response.json();
  if (invoice.status === "paid") {
    const tenantId = invoice.metadata.tenantId;    // Line 53
    const type = invoice.metadata.type;             // Line 54

    if (!tenantId) { throw new Error("..."); }     // Line 56-58
    if (tenantId !== session.tenantId) { throw new Error("..."); } // Lines 59-61

    // Lines 63-66: Verify tenant exists
    const tenantExists = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenantExists) { throw new Error("..."); }

    // Lines 92-94: CALL BILLING AGENT (main action)
    await handleSuccessfulPaymentAction(tenantId, plan, "MONTHLY");
  }
}
```

**Records created:** NONE (delegates to `handleSuccessfulPaymentAction`)
**tenantId:** ✅ From `session.tenantId` (validated against invoice metadata)

---

### Step 4: Billing Agent Activation

**File:** `app/actions/billingAgent.ts:25-103`
**Function:** `handleSuccessfulPaymentAction`

```typescript
// Lines 37-51: Tenant activation (NO transaction wrapping)
const tenant = await prisma.tenant.update({
  where: { id: tenantId },
  data: {
    subscriptionPlan: plan,
    isActive: true,
    paymentStatus: "PAID",
    billingCycle: billingCycle,
    subscriptionExpiresAt: expiresAt,
  },
  include: { users: { where: { role: "ADMIN" } } }
});

// Lines 63-69: Admin password regeneration (separate query)
const plainPassword = generateSecureRandomPassword();
const hashedPassword = await bcrypt.hash(plainPassword, 10);
await prisma.user.update({
  where: { id: adminUser.id },
  data: { passwordHash: hashedPassword, isActive: true }
});

// Lines 80: SMS notification (fire-and-forget)
await sendSMSNotification(clientMobile, welcomeMessage);

// Lines 95: Email notification (fire-and-forget)
await sendAdminEmailAlert(emailSubject, emailHtml);
```

**Records created:**
- ✅ `Tenant` row updated
- ✅ `User` row updated (password hash)
- ✅ `AuditLog` row (via `writeAuditLog` at line 96 of callback route)
- ❌ **NO `PaymentTransaction` created**
- ❌ **NO `JournalEntry` created**
- ❌ **NO `AccountBalance` update**

**tenantId:** ✅ Carried through to tenant.update, user.update, and audit log

---

### Step 5: PaymentTransaction → **GAP DETECTED**

**Search:** `paymentTransaction.create` — **ZERO matches in codebase**

```prisma
// prisma/schema.prisma:712-734 — MODEL EXISTS
model PaymentTransaction {
  id            String   @id @db.Uuid
  tenantId      String
  invoiceId     String?     // ⚠️ Plain String, no FK constraint
  installmentId String?     // ⚠️ Plain String, no FK constraint
  amount        Decimal  @db.Decimal(12, 2)
  fee           Decimal  @default(0) @db.Decimal(12, 2)
  netAmount     Decimal  @db.Decimal(12, 2)
  currency      String   @default("SAR")
  method        String
  status        String   @default("COMPLETED")
  gatewayRef    String?
  gatewayResponse String? @db.Text
  paidAt        DateTime @default(now())
  createdAt     DateTime @default(now())
}
```

**Finding:** The `PaymentTransaction` model is defined in the Prisma schema but **never created by any application code**. This is confirmed by:
- Zero grep results for `paymentTransaction.create`
- `FINANCIAL_INTEGRITY_REVIEW.md` finding FI-12: "`PaymentTransaction` unused — Schema — Evidently created but no code writes to it"

**VERDICT: CRITICAL GAP** — The data model designed to track payment transactions is never populated.

---

### Step 6: Journal Entry → **GAP DETECTED**

**File:** `lib/accounting/posting-engine.ts`
**Functions:** `postPaymentEntry` (line 188), `postJournalEntry` (line 31)

`postPaymentEntry` exists and is well-designed:

```typescript
// posting-engine.ts:188-215
export async function postPaymentEntry(
  tenantId: string,
  receiptId: string,
  amount: number,
  cashAccountId: string,
  receivableAccountId: string
): Promise<any> {
  return postJournalEntry({
    tenantId,
    description: `تحصيل دفعة`,
    source: 'RECEIPT',
    sourceId: receiptId,
    lines: [
      { accountId: cashAccountId,       debit: amount, credit: 0,      description: 'إيداع نقدي' },
      { accountId: receivableAccountId, debit: 0,      credit: amount, description: 'تخفيض حسابات القبض' },
    ],
  });
}
```

**But `handleSuccessfulPaymentAction` NEVER calls it.** The billing agent only updates tenant/user records — it does not interact with the accounting ledger.

`postPaymentEntry` IS called for **rental invoice payments** (see Flow 2 below), but NOT for subscription payments.

**VERDICT: CRITICAL GAP** — Subscription revenue is invisible to the general ledger.

---

### Step 7: Account Balance → **GAP (FOLLOW-ON)**

**File:** `lib/accounting/posting-engine.ts:75-97`

```typescript
// Inside postJournalEntry's $transaction:
for (const line of lines) {
  const period = getPeriod();
  await tx.accountBalance.upsert({
    where: {
      accountId_period_tenantId: {
        accountId: line.accountId,
        period,
        tenantId,
      },
    },
    create: {
      accountId: line.accountId,
      tenantId,
      period,
      debit: line.debit,
      credit: line.credit,
    },
    update: {
      debit: { increment: line.debit },
      credit: { increment: line.credit },
    },
  });
}
```

The `accountBalance.upsert` with atomic `increment` is correctly implemented for journal entries. However, since subscription payments never create journal entries, no account balance is ever updated for subscription revenue.

**tenantId:** ✅ Included in the upsert's composite unique key (`accountId_period_tenantId`)

**VERDICT: FOLLOW-ON GAP** — No account balance reflects subscription revenue because no journal entry is ever posted.

---

## FLOW 2: RENTAL INVOICE PAYMENT (Internal Payment)

This is the **secondary payment flow** — a tenant pays a rental invoice.

### Step 1: Invoice Creation

**File:** `app/api/v1/invoices/route.ts:70-173`

```typescript
// Lines 70-74: POST handler
export async function POST(request: NextRequest) {
  const session = await authenticateRequest(request);
  if (!session) { return NextResponse.json({ error: "غير مصرح بالوصول" }, { status: 401 }); }

  // Lines 110-138: Transactional invoice creation
  const result = await prisma.$transaction(async (tx) => {
    const counter = await tx.tenant.update({
      where: { id: tenant.id },
      data: { nextInvoiceNumber: { increment: 1 } },
    });
    const invoiceNumber = counter.nextInvoiceNumber - 1;

    const invoice = await tx.rentalInvoice.create({
      data: {
        tenantId: session.tenantId as string,   // ✅ tenantId
        leaseId,
        invoiceNumber,
        invoicePrefix: tenant.invoicePrefix || 'INV',
        dueDate: new Date(dueDate),
        subtotal: vatBreakdown.subtotal,
        vatRate: vatBreakdown.vatRate,
        vatAmount: vatBreakdown.vatAmount,
        totalAmount: vatBreakdown.totalAmount,
        qrPayload: JSON.stringify(qrPayload),
        qrCode,
        qrImage,
        status: "unpaid",
      },
    });
    return { invoice, tenant };
  });
}
```

**Records created:** ✅ `RentalInvoice`
**tenantId:** ✅ From session, carried into invoice

---

### Step 2: Invoice Payment

**File:** `app/api/v1/invoices/[id]/pay/route.ts:27-124`

```typescript
// Lines 70-93: MAIN TRANSACTION (creates Receipt + updates Invoice)
const result = await prisma.$transaction(async (tx) => {
  const receipt = await tx.receipt.create({
    data: {
      tenantId,                                // ✅ tenantId
      invoiceId: id,
      amount: parseFloat(amount),
      paymentMethod: method,
      status: 'COMPLETED',
      receivedDate: new Date(),
    },
  });

  await tx.rentalInvoice.update({
    where: { id },
    data: {
      status: 'paid',
      paidAt: new Date(),
      paymentMethod: method,
      paymentRef: receipt.id,
    },
  });

  return receipt;
});

// ⚠️ Lines 95-106: JOURNAL ENTRY OUTSIDE TRANSACTION (FI-01)
const cashAccount = await findAccountByCode(tenantId, '1.1.1');       // Cash
const receivableAccount = await findAccountByCode(tenantId, '1.1.3');  // AR

if (cashAccount && receivableAccount) {
  await postPaymentEntry(            // ⚠️ OUTSIDE $transaction!
    tenantId,
    result.id,                       // receipt ID
    parseFloat(amount),
    cashAccount.id,
    receivableAccount.id
  );
}
```

**Records created:**
- ✅ `Receipt`
- ✅ `RentalInvoice` updated (status, paidAt, paymentRef)
- ✅ `JournalEntry` + `JournalLine` (via `postPaymentEntry` → `postJournalEntry`)
- ✅ `AccountBalance` (via upsert inside `postJournalEntry`)
- ❌ **NO `PaymentTransaction`** — model exists but not populated

**tenantId:** ✅ Carried through all steps

**⚠️ Finding FI-01 (CRITICAL):** Journal entry posting is OUTSIDE the `$transaction` that creates the receipt. If the server crashes between the two operations:
- Receipt exists
- Invoice marked as paid
- **No journal entry** → general ledger missing the transaction

**⚠️ Finding FI-02 (CRITICAL):** Idempotency-Key header is required but never checked against a processed-keys store. Two concurrent requests with the same key can both succeed (race condition).

**⚠️ Finding FI-03 (CRITICAL):** Entry number is determined outside the transaction (line 47-52 of posting-engine.ts). Two concurrent journal postings can get the same entry number, causing a unique constraint violation.

---

## COMPLETE CHAIN ANALYSIS

### Subscription Payment Chain

```
initiateSubscriptionPaymentAction()
  → createPaylinkInvoice()         [app/actions/payment.ts:23]
    → POST Paylink API             [external]
    ← returns payment_url
  → User pays at Paylink           [external]
  → Paylink redirects to:
    GET /api/payment/callback?id=...&status=paid  [app/api/payment/callback/route.ts:10]
      → authenticateRequest()      [session auth]
      → fetch Moyasar invoice API  [⚠️ DIFFERENT GATEWAY]
      → handleSuccessfulPaymentAction()  [app/actions/billingAgent.ts:25]
        → UPDATE tenant            [subscription fields]
        → UPDATE user              [password hash]
        → sendSMS                  [notification]
        → sendEmail                [notification]
        → writeAuditLog            [audit trail]
  ❌ PaymentTransaction  — NEVER CREATED
  ❌ JournalEntry        — NEVER CREATED
  ❌ AccountBalance      — NEVER UPDATED
```

### Rental Invoice Payment Chain

```
POST /api/v1/invoices [app/api/v1/invoices/route.ts:70]
  → prisma.$transaction
    → UPDATE tenant.nextInvoiceNumber [atomic increment]
    → CREATE RentalInvoice            [with tenantId]
  ✅ Invoice created

POST /api/v1/invoices/:id/pay [app/api/v1/invoices/[id]/pay/route.ts:27]
  → prisma.$transaction              [receipt + invoice update]
    → CREATE Receipt                  [with tenantId]
    → UPDATE RentalInvoice            [status=paid]
  → findAccountByCode('1.1.1')       [cash account]
  → findAccountByCode('1.1.3')       [AR account]
  → ⚠️ postPaymentEntry()            [OUTSIDE transaction!]
    → postJournalEntry()             [posting-engine.ts:31]
      → prisma.$transaction
        → CREATE JournalEntry         [with tenantId]
        → CREATE JournalLine(s)       [debit=CR, credit=DR]
        → UPSERT AccountBalance       [atomic increment, by tenantId+accountId+period]
  ✅ JournalEntry created
  ✅ AccountBalance updated
  ❌ PaymentTransaction — NEVER CREATED
```

---

## TENANT ID PROPAGATION AUDIT

| Step | Source | Destination | File:Line | Status |
|------|--------|-------------|-----------|--------|
| Subscription init | `getActiveTenant()` → `tenant.id` | Paylink invoice metadata | `payment.ts:75` | ✅ |
| Callback verify | `session.tenantId` | Compared to `invoice.metadata.tenantId` | `callback/route.ts:59` | ✅ |
| Tenant activation | `tenantId` param | `tenant.update({ where: { id: tenantId } })` | `billingAgent.ts:38` | ✅ |
| Audit log | `tenantId` param | `writeAuditLog({ tenantId })` | `callback/route.ts:79,97` | ✅ |
| Rental invoice create | `session.tenantId` | `rentalInvoice.create({ data: { tenantId } })` | `invoices/route.ts:120` | ✅ |
| Receipt create | `session.tenantId` | `receipt.create({ data: { tenantId } })` | `[id]/pay/route.ts:73` | ✅ |
| Journal entry | `tenantId` param | `journalEntry.create({ data: { tenantId } })` | `posting-engine.ts:57` | ✅ |
| Account balance | `tenantId` param | `accountBalance.upsert({ ... tenantId })` | `posting-engine.ts:79` | ✅ |
| PaymentTransaction | — | — | NEVER CREATED | ❌ |

---

## ALL IDENTIFIED GAPS

| ID | Severity | Description | File:Line |
|----|----------|-------------|-----------|
| GAP-1 | **CRITICAL** | `PaymentTransaction` model exists but is never created by any code | Schema only |
| GAP-2 | **CRITICAL** | Subscription payments create no JournalEntry | `billingAgent.ts:25-103` |
| GAP-3 | **CRITICAL** | Subscription payments create no AccountBalance update | Follow-on from GAP-2 |
| GAP-4 | **CRITICAL** | Paylink creates invoices, Moyasar verifies them (gateway mismatch) | `payment.ts:23` vs `callback/route.ts:40` |
| GAP-5 | **CRITICAL** | Idempotency check uses wrong table (`zatcaQueue` for payment) | `callback/route.ts:30` |
| GAP-6 | **CRITICAL** | Journal entry outside payment transaction (FI-01) | `[id]/pay/route.ts:98-106` |
| GAP-7 | **CRITICAL** | Idempotency-Key requested but never deduplicated (FI-02) | `[id]/pay/route.ts:37-44` |
| GAP-8 | **CRITICAL** | Entry number race condition (FI-03) | `posting-engine.ts:47-52` |
| GAP-9 | **HIGH** | `handleSuccessfulPaymentAction` has no transaction wrapping (FI-05) | `billingAgent.ts:25-103` |
| GAP-10 | **MEDIUM** | `invoiceId` and `installmentId` in PaymentTransaction are plain strings, not FKs | `schema.prisma:716-717` |
| GAP-11 | **LOW** | Hardcoded SMS phone number `+966557516311` | `billingAgent.ts:79` |
| GAP-12 | **LOW** | Admin password sent in plaintext SMS (FI-10) | `billingAgent.ts:72-76` |

---

## FINAL VERDICT (TEST 5)

### Chain Completeness

| Segment | Records Created | Verdict |
|---------|----------------|---------|
| Invoice → Paylink | Paylink invoice (external only) | **PASS** |
| Payment callback | Tenant activated, audit log written | **PASS** (for tenant state) |
| PaymentTransaction | **NONE** | **FAIL** — Model unused |
| JournalEntry | **NONE** (subscriptions only; rental payments: PASS) | **FAIL** for subscriptions |
| AccountBalance | **NONE** (subscriptions only; rental payments: PASS) | **FAIL** for subscriptions |

### Overall Verdict

**FAIL** — The payment-to-accounting chain is fundamentally broken for subscription payments:

1. **Subscription revenue is invisible to the general ledger** — The `handleSuccessfulPaymentAction` function updates tenant/user data but never touches the accounting system (no JournalEntry, no AccountBalance, no PaymentTransaction).

2. **The PaymentTransaction model is dead code** — Defined in the Prisma schema but zero code paths create records in it. The model has broken FKs (`invoiceId`, `installmentId` are plain strings without relation constraints).

3. **Rental invoice payments have a transaction integrity bug** — The journal entry is posted outside the payment transaction (FI-01), creating a window where receipts exist without corresponding journal entries.

4. **Gateway mismatch** — Paylink creates the invoice, Moyasar verifies it. These are two separate payment gateways with different API credentials.

5. **No end-to-end idempotency** — The callback uses the ZATCA queue (tax filing) for deduplication instead of a payment-specific mechanism. The rental payment route requires an Idempotency-Key but never checks it against a processed store.
