# ORCA PAYLINK SECURITY PROOF — Static Analysis Report

**Date:** 2026-06-10
**Scope:** Payment callback handler, Paylink integration, idempotency, duplicate prevention
**Files Analyzed:**
- `app/api/payment/callback/route.ts` (120 lines)
- `app/actions/payment.ts` (120 lines)
- `app/actions/billingAgent.ts` (146 lines)
- `lib/api-auth.ts` (23 lines)
- `lib/session.ts` (38 lines)

---

## 1. WEBHOOK AUTHENTICATION — CALLBACK ENDPOINT

### 1.1 Endpoint Type: GET (NOT a Webhook)

```typescript
// app/api/payment/callback/route.ts:10
export async function GET(request: NextRequest) {
```

This is a **GET** endpoint intended for browser redirect after user completes payment. It is NOT a server-to-server webhook (which would typically be POST with a static secret).

### 1.2 Authentication Mechanism

```typescript
// app/api/payment/callback/route.ts:11-15
const session = await authenticateRequest(request);
if (!session) {
  const fallbackUrl = new URL("/login", request.url);
  return NextResponse.redirect(fallbackUrl);
}
```

The `authenticateRequest()` function from `lib/api-auth.ts` (lines 5-22):

```typescript
// lib/api-auth.ts:5-22
export async function authenticateRequest(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session_token')?.value;
    if (sessionToken) {
      const payload = await decrypt(sessionToken);
      if (payload && payload.tenantId) return payload as any;
    }

    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = await decrypt(token);
      if (payload && payload.tenantId) return payload as any;
    }
  } catch {}
  return null;
}
```

### 1.3 What format does it check?

| Mechanism | Header | Format | Decryption |
|-----------|--------|--------|------------|
| Session cookie | `Cookie: session_token=<value>` | JWT (HS256) | `jwtVerify` via jose |
| Authorization bearer | `Authorization: Bearer <value>` | JWT (HS256) | `jwtVerify` via jose |

Both tokens are validated using `decrypt()` from `lib/session.ts:22-30` which uses `JWT_SECRET` env var with HS256 algorithm.

### 1.4 What happens if no Authorization?

- `authenticateRequest()` returns `null`
- User is **redirected to `/login`** (line 13-14)
- No error response code — it's a `307 Temporary Redirect`

### 1.5 What happens if Authorization is wrong?

- `decrypt()` catches the error and returns `null` (line 28-29 in session.ts)
- `authenticateRequest()` returns `null`
- Same behavior: redirect to `/login`

### 1.6 CRITICAL FINDING: No Paylink/Moyasar Webhook Secret Validation

**The callback does NOT validate any Paylink-specific webhook secret.** It uses the application's own user session auth (session cookie or JWT bearer token). This means:

- A genuine Paylink IPN/webhook POST from Paylink servers would return a 405 Method Not Allowed (only GET is defined) or redirect to /login
- If this endpoint is intended as a Paylink webhook receiver, it will reject all genuine Paylink server-to-server calls
- If it's intended only for browser redirect after payment, `callback_url` in the Paylink invoice creation (line 34 of payment.ts) points here:
  ```typescript
  // app/actions/payment.ts:34
  callback_url: `${APP_URL}/api/payment/callback`,
  ```
  So Paylink redirects the user's browser here after payment — this IS browser session auth, which is acceptable for a redirect.

**VERDICT on Webhook Auth:**
- For browser redirect flow: session auth is **appropriate** (user is logged in)
- For server-to-server webhook: **CRITICAL FAIL** — no Paylink/Moyasar secret validation exists

---

## 2. IDEMPOTENCY PROTECTION

### 2.1 The Idempotency Check

```typescript
// app/api/payment/callback/route.ts:30-38
const existing = await prisma.zatcaQueue.findFirst({
  where: { invoiceId, status: "COMPLETED" },
});
if (existing) {
  const successUrl = new URL("/operations", request.url);
  successUrl.searchParams.set("tab", "settings");
  successUrl.searchParams.set("success", "تم تفعيل الاشتراك مسبقًا.");
  return NextResponse.redirect(successUrl);
}
```

### 2.2 CRITICAL FINDING: Wrong Table Used for Idempotency

The idempotency check queries **`zatcaQueue`** — the ZATCA tax reporting queue model:

```prisma
// prisma/schema.prisma:468-488
model ZatcaQueue {
  id          String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId    String
  invoiceId   String    // FK → RentalInvoice
  action      String    @default("REPORT")
  status      String    @default("PENDING")
  retryCount  Int       @default(0)
  // ... ZATCA-specific fields: payload, response, nextRetryAt, completedAt
}
```

This table stores ZATCA tax compliance report submissions. It has **nothing to do with payment processing or Paylink**.

- If a subscription payment invoice never had a ZATCA submission (which is the common case — subscription invoices go through Paylink, not ZATCA), **no duplicate check will fire**
- The `invoiceId` field in `zatcaQueue` is an FK to `RentalInvoice` — subscription payments do not create `RentalInvoice` records
- Therefore, for all subscription payments, **this check will always return nothing**, and idempotency is effectively absent

### 2.3 Paylink Idempotency (Outbound)

```typescript
// app/actions/payment.ts:11-13
function generateIdempotencyKey(): string {
  return `orca-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

// app/actions/payment.ts:28
"Idempotency-Key": idempotencyKey,
```

The outbound Paylink API call at `app/actions/payment.ts:23-37` includes an `Idempotency-Key` header. This prevents Paylink from creating duplicate invoices for the same request. However:

- The key is generated fresh each time with `Date.now()` — it's a **new UUID every call**, not derived from a business key (e.g., `${tenantId}-${plan}-${billingCycle}`)
- This means the idempotency is **request-level only** (retry of the same HTTP request). If the user clicks "Pay" twice, two different Paylink invoices are created with different idempotency keys.

### 2.4 Rental Invoice Payment Idempotency (BROKEN)

In `app/api/v1/invoices/[id]/pay/route.ts:37-44`:

```typescript
const idempotencyKey = request.headers.get('idempotency-key') || request.headers.get('Idempotency-Key');
if (!idempotencyKey) {
  return NextResponse.json({ error: 'Missing Idempotency-Key header' }, { status: 400 });
}
```

The key is **required** but **never checked** against a processed-keys store. No deduplication table exists.

---

## 3. DUPLICATE RECORD PREVENTION

### 3.1 Does it create duplicate records on repeated calls?

For subscription payments (the callback flow):

| Call # | What Happens | Duplicate Created? |
|--------|-------------|-------------------|
| 1st | Activates tenant, sets plan, generates credentials | No |
| 2nd | Same activation — same plan, same status | No (idempotent result), but: |
| 2nd | Regenerates admin password | **YES** — new password hash written |
| 2nd | Sends new SMS | **YES** — duplicate SMS |
| 2nd | Sends new email | **YES** — duplicate email |
| 2nd | Writes duplicate audit log | **YES** |

```typescript
// app/actions/billingAgent.ts:37-50
const tenant = await prisma.tenant.update({
  where: { id: tenantId },
  data: {
    subscriptionPlan: plan,       // idempotent — same value
    isActive: true,               // idempotent — same value
    paymentStatus: "PAID",        // idempotent — same value
    billingCycle: billingCycle,   // idempotent — same value
    subscriptionExpiresAt: expiresAt, // DIFFERENT each time! (30 days from now)
  },
});

// app/actions/billingAgent.ts:59-69
const plainPassword = generateSecureRandomPassword(); // NEW random password each call
const hashedPassword = await bcrypt.hash(plainPassword, 10);
await prisma.user.update({
  where: { id: adminUser.id },
  data: {
    passwordHash: hashedPassword,  // OVERWRITES previous password
    isActive: true,
  }
});
```

On repeated calls:
- `subscriptionExpiresAt` is recalculated from `new Date() + 30 days` — extends the subscription each time
- Admin password is regenerated — locking out the admin who received the first credentials
- SMS and email are re-sent
- No `PaymentTransaction` is created (model exists but unused — FI-12)

### 3.2 Verification with Moyasar API (Not Paylink)

```typescript
// app/api/payment/callback/route.ts:40-47
const response = await fetch(`https://api.moyasar.com/v1/invoices/${invoiceId}`, {
  headers: {
    "Authorization": `Basic ${Buffer.from(MOYASAR_SECRET_KEY + ":").toString("base64")}`,
  },
});
if (!response.ok) {
  throw new Error("لم نتمكن من التحقق من صحة الفاتورة عبر بوابة ميسر.");
}
```

**CRITICAL GATEWAY MISMATCH:**
- Invoice was created in **Paylink** (`POST ${PAYLINK_BASE}/invoice` at line 23 of payment.ts)
- Invoice is verified in **Moyasar** (`GET https://api.moyasar.com/v1/invoices/${invoiceId}`)
- These are **two different payment gateways**
- The invoice ID from Paylink will not exist in Moyasar's system
- The Moyasar API call will fail with a 404 or auth error
- The environment variable used is `MOYASAR_SECRET_KEY` (not `PAYLINK_SECRET`)

---

## 4. ENVIRONMENT VARIABLE DEPENDENCIES

### 4.1 Payment Initiation

| Variable | File | Line | Purpose | Fallback |
|----------|------|------|---------|----------|
| `PAYLINK_SECRET` | `app/actions/payment.ts` | 7 | Bearer token for Paylink API | `"test_secret_key_placeholder"` |
| `PAYLINK_BASE_URL` | `app/actions/payment.ts` | 8 | Paylink API base URL | `"https://paylink.sa/api/v1"` |
| `NEXT_PUBLIC_APP_URL` | `app/actions/payment.ts` | 9 | Callback URL | `"http://localhost:3000"` |

### 4.2 Payment Verification (Callback)

| Variable | File | Line | Purpose | Fallback |
|----------|------|------|---------|----------|
| `MOYASAR_SECRET_KEY` | `app/api/payment/callback/route.ts` | 8 | Basic auth for Moyasar API | `""` (empty string) |

### 4.3 What happens if PAYLINK_SECRET is not configured?

```typescript
// app/actions/payment.ts:64-69 (and lines 98-103)
if (!PAYLINK_SECRET || PAYLINK_SECRET === "test_secret_key_placeholder") {
  return {
    success: false,
    error: "بوابة الدفع Paylink غير مفعلة حالياً. يرجى التواصل مع الدعم الفني.",
  };
}
```

Returns a user-friendly Arabic error message. No crash. No fake URLs generated.

### 4.4 What happens if MOYASAR_SECRET_KEY is not configured?

```typescript
// app/api/payment/callback/route.ts:8
const MOYASAR_SECRET_KEY = process.env.MOYASAR_SECRET_KEY || "";
```

Defaults to empty string. The Basic auth header becomes `Basic Og==` (empty credential). The Moyasar API call at line 40 will fail with 401 Unauthorized. The error at line 47 will throw:

> "لم نتمكن من التحقق من صحة الفاتورة عبر بوابة ميسر."

This error is caught at line 115-118 and user sees: "حدث خطأ أثناء تفعيل الاشتراك."

---

## 5. BILLING AGENT ANALYSIS

### 5.1 `handleSuccessfulPaymentAction` (billingAgent.ts:25-103)

**What it does:**
1. Calculates expiry date (30 days monthly, 365 days yearly) — lines 28-34
2. Updates tenant: `subscriptionPlan`, `isActive = true`, `paymentStatus = "PAID"`, `billingCycle`, `subscriptionExpiresAt` — lines 37-51
3. Finds admin user from tenant — lines 47-49
4. Generates random password, hashes with bcrypt — lines 59-60
5. Updates admin user's passwordHash — lines 63-69
6. Sends SMS with credentials — lines 72-80
7. Sends email notification to platform admin — lines 83-95

**What it does NOT do:**
- Does NOT create a `PaymentTransaction` record
- Does NOT call `postJournalEntry` or `postPaymentEntry`
- Does NOT wrap operations in a database transaction (FI-05)
- Does NOT create any accounting records

### 5.2 `checkAndSuspendExpiredTenantsAction` (billingAgent.ts:109-146)

**What it does:**
1. Finds all active tenants where `subscriptionExpiresAt < now` — lines 114-121
2. Batch-updates them: `isActive = false`, `paymentStatus = "UNPAID"` — lines 128-132
3. Sends SMS suspension notice to each — lines 134-137

---

## 6. FINAL VERDICT (TEST 4)

### Scenario 1: Browser Redirect Auth
**Verdict: PASS** — Session/cookie auth is appropriate for a user returning from payment gateway in their browser.

### Scenario 2: Server-to-Server Webhook Auth
**Verdict: FAIL** — No webhook secret validation. No POST handler. Paylink webhooks would be rejected.

### Scenario 3: Idempotency
**Verdict: FAIL** — Uses wrong database table (`zatcaQueue`). No deduplication for subscription payments. Repeated calls extend expiry date and regenerate credentials.

### Scenario 4: Duplicate Prevention
**Verdict: FAIL** — Repeated calls regenerate admin password, re-send SMS/email, and extend `subscriptionExpiresAt`. Tenant update is logically idempotent but side effects are not.

### Scenario 5: Gateway Consistency
**Verdict: CRITICAL FAIL** — Paylink creates invoices, Moyasar verifies them. Two different gateways. Invoice ID from Paylink will not exist in Moyasar.

### Scenario 6: Environment Variable Safety
**Verdict: PASS** — Missing `PAYLINK_SECRET` returns graceful error. Missing `MOYASAR_SECRET_KEY` falls through to error but does not crash.

---

## SECURITY CHECKLIST — GUARD CLAUSES

| Line | Guard | Type | Code |
|------|-------|------|------|
| `api/auth.ts:9-11` | Session cookie check | Auth | `if (sessionToken) { const payload = await decrypt(sessionToken); if (payload && payload.tenantId) return payload; }` |
| `api/auth.ts:14-18` | Bearer token check | Auth | `if (authHeader?.startsWith('Bearer ')) { const token = authHeader.substring(7); const payload = await decrypt(token); if (payload && payload.tenantId) return payload; }` |
| `callback/route.ts:11-15` | Fail: no session | Redirect | `if (!session) { ... return NextResponse.redirect(fallbackUrl); }` |
| `callback/route.ts:24-27` | Fail: no invoiceId / not paid | Redirect | `if (!invoiceId || status !== "paid") { ... return NextResponse.redirect(fallbackUrl); }` |
| `callback/route.ts:30-38` | Idempotency check (BROKEN) | DB query | `const existing = await prisma.zatcaQueue.findFirst({ where: { invoiceId, status: "COMPLETED" } });` |
| `callback/route.ts:46-48` | Moyasar verification fail | Error | `if (!response.ok) { throw new Error(...); }` |
| `callback/route.ts:56-58` | No tenantId in metadata | Error | `if (!tenantId) { throw new Error("رقم المنشأة غير موجود في الفاتورة."); }` |
| `callback/route.ts:59-61` | Tenant mismatch (session) | Error | `if (tenantId !== session.tenantId) { throw new Error("الفاتورة لا تخص هذه المنشأة."); }` |
| `callback/route.ts:63-65` | Tenant not found in DB | Error | `if (!tenantExists) { throw new Error("المنشأة غير موجودة."); }` |
| `callback/route.ts:70-72` | Invalid agent count | Error | `if (agentCount <= 0 || agentCount > 100) { throw new Error("عدد الوكلاء غير صالح."); }` |
| `callback/route.ts:93` | No plan metadata | Error | `if (!plan) throw new Error("خطة الاشتراك غير موجودة.");` |
| `callback/route.ts:115-118` | Catch-all error | Redirect | `catch (error: any) { ... return NextResponse.redirect(fallbackUrl); }` |
