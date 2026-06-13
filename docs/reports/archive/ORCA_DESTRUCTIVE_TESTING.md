# ORCA DESTRUCTIVE TESTING REPORT
## AGENT 5 — Static Analysis of All Failure Points

---

## 1. LARGE DATA — Unpaginated / Unlimited Queries

### FAIL: `app/actions/growth.ts:53`
`prisma.lead.findMany({ where: { tenantId: tenant.id } })` — no `take`.
**What breaks:** With 1M+ leads, entire table loaded into memory. Server OOM / response timeout.
**Severity:** **CRITICAL**
**Fix:** Add `take` with cursor-based or page-based pagination.

### FAIL: `app/actions/growth.ts:153, 197`
`prisma.followupSequence.findMany()` — no `take`.
**What breaks:** Unbounded read. Low risk (sequences unlikely to exceed hundreds), but still no limit.
**Severity:** LOW
**Fix:** Add `take: 200` or pagination.

### FAIL: `app/actions/growth.ts:285, 341`
`prisma.mansourChat.findMany()` — no `take`.
**What breaks:** Chat history grows indefinitely. Could load 100K+ encrypted chat records into memory.
**Severity:** MEDIUM
**Fix:** Add `take: 100` with pagination/cursor.

### FAIL: `app/actions/growth.ts:600`
`prisma.platformConnection.findMany()` — no `take`.
**Severity:** LOW (max 6 platforms per tenant)

### FAIL: `app/actions/growth.ts:786`
`prisma.agentLease.findMany()` — no `take`.
**Severity:** LOW

### FAIL: `app/actions/analytics.ts:26`
`prisma.lead.findMany({ where: { tenantId: tenant.id } })` — no `take`, no `skip`. Fetches ALL leads into memory for client-side aggregation.
**What breaks:** With 50K+ leads, this single call OOMs the server.
**Severity:** **CRITICAL**
**Fix:** Move aggregation to database-level (`groupBy`, `count`) instead of fetching all rows. Or paginate.

### FAIL: `app/actions/dashboard.ts:63`
`prisma.task.findMany()` — no `take`. Fetches all PENDING tasks for today.
**What breaks:** If 10K+ tasks exist for today (unlikely but possible via batch import), response bloats.
**Severity:** MEDIUM
**Fix:** Add `take: 500`.

### FAIL: `app/actions/leadActions.ts:13`
`prisma.lead.findMany({ ... orderBy: ... })` — no `take`. 
**What breaks:** Fetches ALL leads with no limit.
**Severity:** **CRITICAL**
**Fix:** Add pagination or `take`.

### FAIL: `app/actions/helpdesk.ts:14`
`prisma.ticket.findMany()` — no `take`.
**Severity:** MEDIUM

### FAIL: `app/actions/users.ts:60`
`prisma.user.findMany()` — no `take`. Returns all tenant users.
**Severity:** MEDIUM (tenants have plan-based user caps, so bounded indirectly)

### FAIL: `app/actions/sales.ts:27`
`prisma.user.findMany({ include: { leads: true } })` — no `take` on either users or their nested leads.
**What breaks:** Loads every sales user AND all their leads into memory. Leads are unbounded.
**Severity:** **HIGH**
**Fix:** Use `take` on both, or aggregate with `_count` instead of `include: { leads: true }`.

### FAIL: `app/actions/rentals.ts:13`
`prisma.contract.findMany({ include: { unit: true, installments: true } })` — no `take`.
**What breaks:** Loads all contracts + all installments nested. With 10K contracts x 12 installments = 120K records.
**Severity:** **HIGH**
**Fix:** Paginate contracts; add `take` on nested installments.

### FAIL: `app/actions/ejar.ts:237`
`prisma.payrollCommission.findMany()` — no `take`.
**Severity:** MEDIUM

### FAIL: `app/actions/projects.ts:146`
`prisma.unit.findMany({ where: { projectId } })` — no `take`.
**What breaks:** A single mega-project with 50K units loads all.
**Severity:** MEDIUM
**Fix:** Add `take` or paginate.

### FAIL: `app/actions/tasks.ts:35`
`prisma.lead.findMany({ ... select: ... })` — no `take`. "Leads list" for task creation dropdown.
**Severity:** MEDIUM

### FAIL: `app/actions/leads.ts:44`
`prisma.project.findMany()` — no `take`. Projects dropdown.
**Severity:** LOW

### FAIL: `app/actions/admin.ts:84, 108`
`prisma.tenant.findMany()` and `prisma.ticket.findMany()` — no `take`. Superadmin views ALL tenants/tickets across the entire platform.
**What breaks:** If the platform has 10K+ tenants or 100K+ tickets.
**Severity:** **HIGH** for tickets, MEDIUM for tenants.
**Fix:** Add pagination.

### FAIL: `app/actions/accounting.ts:243`
`prisma.account.findMany()` — no `take`. Chart of accounts (usually <1000, but unbounded).
**Severity:** LOW

### FAIL: `app/api/v1/invoices/route.ts:39`
`prisma.rentalInvoice.findMany()` — no `take`, no pagination. GET endpoint returns ALL invoices for a tenant.
**What breaks:** 100K+ invoices serialized to JSON response = timeout + OOM.
**Severity:** **CRITICAL**
**Fix:** Add `page`/`limit` query params with `skip`/`take`.

---

## 2. INVALID INPUTS — Missing Validation

### FAIL: `app/actions/leads.ts:96-103` (createLeadAction)
Validates `firstName` and `phone` are non-empty, but:
- No phone format validation (accepts "abc", "1", SQL injection-like strings)
- No email format validation (accepts "not-an-email")
- No length limits on firstName, lastName, city, source
- No XSS/sanitization on any text field
**Severity:** **HIGH**
**Fix:** Validate phone with regex, validate email with regex, add max length constraints.

### FAIL: `app/actions/leadActions.ts:17` (createLead)
Zero input validation. Accepts `Omit<Lead, 'id' | 'createdAt' | ...>` directly from client. No `getSession()` auth check. No field validation whatsoever. Any caller can pass arbitrary data.
**What breaks:** Unauthenticated lead creation, data corruption, potential for abuse.
**Severity:** **CRITICAL**
**Fix:** Add `getSession()` + input validation + tenant scoping.

### FAIL: `app/api/v1/invoices/route.ts:78` (POST)
Validates presence of `leaseId`, `subtotal`, `dueDate`, but:
- No validation that `subtotal` is a positive number (negative amounts accepted)
- No validation that `dueDate` is a valid/parseable date string
- No validation that `dueDate` is not in the past
- No `amount` upper bound check (could create a SAR 999 trillion invoice)
**Severity:** **HIGH**
**Fix:** Validate `subtotal > 0`, validate `dueDate` is a valid future date, add max amount ceiling.

### FAIL: `app/actions/documents.ts:27-88` (createDocumentActionDirect)
Validates extension (ALLOWED_EXTENSIONS) and size (<10MB) and path traversal. Good.
But:
- No MIME type check on the actual content (a `.exe` renamed to `.pdf` passes)
- `docId = doc-${Date.now()}` — collision if two uploads happen in same millisecond
**Severity:** MEDIUM
**Fix:** Check file magic bytes for MIME validation; add random suffix to docId.

### FAIL: `app/actions/contract.ts:112-116` (issueContractActionDirect)
Validates `clientId`, `propertyId`, `amount > 0`. Good.
But no upper bound on `amount`. Could create SAR 999 billion contract.
**Severity:** LOW
**Fix:** Add reasonable max amount (e.g. 100M SAR).

---

## 3. EXPIRED SESSIONS — Session & Token Handling

### INFO: `lib/session.ts:4`
`SESSION_DURATION = "12h"` — JWT hard-expires at 12 hours.
**What breaks:** User kicked out mid-workflow after 12h. No refresh token, no sliding expiration, no "extend session" mechanism.
**Severity:** MEDIUM (UX issue, not security)
**Fix:** Implement refresh token rotation or sliding expiration.

### INFO: `lib/session.ts:33-37` (getSession)
Returns `null` on expired/invalid tokens. Downstream layouts and actions handle this correctly via redirect to `/login`.
**Severity:** N/A (handled correctly)

### FAIL: `app/operations/layout.tsx:22, app/dashboard/layout.tsx:9`
Redirect to `/login` on missing session. OK.
But no redirect on **inactive tenant** — if `tenant.isActive === false`, the layout still renders. Only `getActiveTenant()` in `lib/tenant.ts:16` checks `isActive`. Some server actions (like `getProjectsAction` in `leads.ts:41`) call `getActiveTenant()` which would throw. But the layout itself doesn't block inactive tenants.
**Severity:** LOW
**Fix:** Add `if (!tenant?.isActive) redirect("/suspended")` in layouts.

---

## 4. CONCURRENT REQUESTS — Rate Limiting & Connection Pool

### CRITICAL: `lib/prisma.ts:18`
```ts
const pool = new pg.Pool({
  max: 1,   // <--- SINGLE CONNECTION
});
```
**What breaks:** Under ANY concurrent load, ALL database queries serialize through one PostgreSQL connection. If one query takes 2 seconds (e.g., heavy aggregation), every other request across all tenants blocks for 2 seconds. This is the single biggest bottleneck in the entire system.
**Severity:** **CRITICAL**
**Fix:** Set `max` to at least `10` (or `20` for production). The `pool.max` should reflect expected concurrency. Use `connection_limit` in connection string as well.

### FAIL: `middleware.ts:20-55`
Rate limiting ONLY applies to `/api/:path*` routes (matcher on line 57-59). Server actions (POST to the page itself) are NOT rate limited. An attacker can spam `createLeadAction`, `createTicketAction`, etc. with no throttling.
**What breaks:** Server action endpoints (the bulk of the app) have zero rate limiting.
**Severity:** **HIGH**
**Fix:** Add rate limiting to server action routes or implement per-user quotas.

### FAIL: `middleware.ts:30`
```ts
const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
```
IP-based rate limiting is trivially bypassed by spoofing `x-forwarded-for` header.
**Severity:** MEDIUM
**Fix:** Trust only the leftmost IP from `x-forwarded-for` when behind a reverse proxy, or use a more robust identification method.

### FAIL: `lib/accounting/posting-engine.ts:103-137` (reverseJournalEntry)
The reversal entry creation (line 123) and status update (line 131) are NOT in a single `$transaction`.
**What breaks:** Race condition: two concurrent calls can both pass the `status !== 'REVERSED'` check and create two reversal entries, breaking double-entry accounting integrity.
**Severity:** **HIGH**
**Fix:** Wrap both operations in `prisma.$transaction()`.

### INFO: `lib/accounting/posting-engine.ts:54`
`postJournalEntry` uses `prisma.$transaction` for entry creation + balance upserts. Correct.
**Severity:** N/A (OK)

### INFO: `app/api/v1/invoices/route.ts:110`
Invoice creation uses `prisma.$transaction` for counter increment + invoice creation. Correct.
**Severity:** N/A (OK)

---

## 5. PERMISSION VIOLATIONS — Missing / Weak Authorization

### CRITICAL: `app/actions/leadActions.ts:10-28` (fetchLeads, createLead)
`fetchLeads()` and `createLead()` have NO `getSession()` call. None. They directly use `getActiveTenant()` which resolves by hostname, meaning ANY visitor to the page can call these server actions and create/read leads.
**What breaks:** Unauthenticated access to lead CRUD. Anyone who finds the server action endpoint can enumerate and create leads.
**Severity:** **CRITICAL**
**Fix:** Add `const session = await getSession(); if (!session) throw...` at the start of every action.

### FAIL: `app/api/v1/leads/webhook/route.ts:9-29`
Uses subdomain as the webhook token: `prisma.tenant.findUnique({ where: { subdomain: webhookToken } })`.
The webhook "secret" is publicly known (it's the tenant's subdomain). Anyone can POST leads to any tenant's webhook.
**What breaks:** Lead spam injection. Competitor could flood leads with garbage data.
**Severity:** **HIGH**
**Fix:** Require a proper `X-Webhook-Secret` header matched against a stored `webhookSecret` field on the tenant, not the public subdomain.

### FAIL: `app/actions/admin.ts:22`
```ts
const isSuperAdmin = userEmail === "ali.orca@outlook.sa" || userEmail === "elite.orca@outlook.sa";
```
Hardcoded email addresses. If these emails change or new admins need access, code must be redeployed.
**Severity:** MEDIUM
**Fix:** Use a `role: "SUPER_ADMIN"` field in the User model, or use `SUPER_ADMIN_EMAILS` env var (as done elsewhere).

### INFO: `app/actions/users.ts:39-45` (verifyTenantAdmin)
Checks `user.role !== "ADMIN"`. Correct RBAC.
**Severity:** N/A (OK)

### INFO: `app/api/v1/settings/api-keys/route.ts:24,53,107`
Checks `session.role !== 'ADMIN'`. Correct RBAC for GET/POST/DELETE.
**Severity:** N/A (OK)

---

## 6. BROKEN URLs — Hardcoded Links

### FAIL: `app/api/cron/billing/route.ts:213-214, 311-312`
```ts
`https://${lease.tenant.subdomain}.orca.az-ez.pro/operations?tab=growth`
```
Assumes `${subdomain}.orca.az-ez.pro` is a valid routable domain. If subdomain DNS hasn't propagated or wildcard SSL isn't configured, these SMS links 404.
**Severity:** MEDIUM
**Fix:** Use a centralized `getTenantUrl(tenant)` helper with fallback.

### INFO: `components/projects/ProjectDetail.tsx:61`
`https://assets.orca.pro/const/img.jpg` — external hardcoded image URL. If the CDN goes down or path changes, broken image.
**Severity:** LOW

### INFO: Multiple components use `https://picsum.photos/seed/...`
External dependency for placeholder images. Not critical (placeholder images), but may 404 if picsum is down.
**Severity:** LOW

### INFO: `next.config.mjs`
Redirects look syntactically correct. No circular redirects detected.
**Severity:** N/A (OK)

---

## 7. MASS UPDATES — Dangerous Bulk Operations

### INFO: `app/api/cron/billing/route.ts:47-51`
```ts
prisma.tenant.updateMany({ where: { id: { in: expiredIds } }, data: { isActive: false } })
```
Uses explicit ID list from prior query. Safe.
**Severity:** N/A (OK)

### INFO: `app/api/cron/billing/route.ts:77-83`
```ts
prisma.usageMeter.updateMany({ where: { resetAt: { lte: now } }, data: { usageValue: 0 } })
```
Scoped to meters needing reset. Safe.
**Severity:** N/A (OK)

### FAIL: `prisma/seed.ts:24-52` and `prisma/seed-demo.ts:25-37`
Multiple `deleteMany({})` calls with NO where clause — wipes entire tables unconditionally.
**What breaks:** If seed scripts are accidentally run against production, ALL data is deleted across ALL tenants with no confirmation prompt.
**Severity:** **HIGH**
**Fix:** Add `NODE_ENV === 'production'` guard at the top of seed files. Or require explicit `--force` flag.

---

## 8. REPEATED ACTIONS — Idempotency & Race Conditions

### FAIL: `app/api/payments/paylink/webhook/route.ts:10-20` (Idempotency)
In-memory `Map` for idempotency. In serverless (Vercel), this Map is destroyed between invocations. The DB check on line 49-54 (`prisma.paymentTransaction.findFirst({ where: { gatewayRef: paymentRef } })`) is the real safety net, but there's a race window: if two webhook calls arrive simultaneously, both pass the `isDuplicate` check, both pass the DB `findFirst` (neither has been inserted yet), and both create a payment transaction.
**What breaks:** Double-crediting of payments. Customer's subscription gets extended twice.
**Severity:** **HIGH**
**Fix:** Add a `@unique` constraint on `gatewayRef` in the Prisma schema, so the second insert fails with a unique constraint violation. Also wrap the entire webhook handler in `$transaction` or use idempotency keys at the DB level.

### FAIL: `app/api/v1/invoices/route.ts:110-138` (Invoice creation)
Uses `$transaction` for counter increment + insert. Good. But no idempotency key. If the client retries due to network timeout, duplicate invoices are created (with different invoice numbers).
**Severity:** MEDIUM
**Fix:** Accept an `idempotencyKey` header, store it in a unique column on the invoice.

### INFO: `app/actions/leads.ts:132-141` (Duplicate lead check)
Checks for duplicate phone before creating. Race condition exists: two simultaneous requests with the same phone pass the `findFirst` check before either insert completes.
**Severity:** MEDIUM
**Fix:** Add a `@@unique([tenantId, phone])` constraint on the Lead model.

---

## 9. FILE SYSTEM — Document Upload

### FAIL: `app/actions/documents.ts:56-65`
```ts
const filePath = path.join(uploadsDir, `${docId}-${safeName}`);
```
`docId = doc-${Date.now()}` — if two users upload files in the same millisecond, the second file overwrites the first. No retry mechanism.
**Severity:** MEDIUM
**Fix:** Add `crypto.randomUUID()` suffix or use the DB-generated document ID.

### INFO: `app/actions/documents.ts:50-52`
Path traversal check: `safeName.includes("..") || safeName.includes("~") || safeName.includes("/") || safeName.includes("\\")`. Adequate.
**Severity:** N/A (OK)

### INFO: `app/actions/documents.ts:57-59`
Creates `scratch/uploads` directory if it doesn't exist. Uses `fs.existsSync` + `fs.mkdirSync`. Potential race between exists check and mkdir (though unlikely in single-threaded Node.js per request).
**Severity:** LOW
**Fix:** Use `fs.mkdirSync(uploadsDir, { recursive: true })` without the exists check (it's idempotent).

---

## 10. DATABASE FAILURES — Connection Pool & Error Handling

### CRITICAL: `lib/prisma.ts:18`
`max: 1` in the pg Pool configuration. See Section 4 above.
**Severity:** **CRITICAL**

### FAIL: `lib/prisma.ts:106-135` (Auto-audit logging)
All write operations trigger an async audit log write WITHOUT `await`. This is "fire-and-forget." If the audit log write fails (DB down, connection pool exhausted), the error is silently caught and the main operation succeeds.
**What breaks:** Audit trail gaps. Operations succeed but are not logged. Compliance failure.
**Severity:** HIGH
**Fix:** Either `await` the audit log write (accepting latency) or enqueue to a persistent message queue.

### FAIL: `lib/accounting/posting-engine.ts:47-51`
```ts
const lastEntry = await prisma.journalEntry.findFirst({
  where: { tenantId },
  orderBy: { entryNumber: 'desc' },
});
const nextNumber = (lastEntry?.entryNumber ?? 0) + 1;
```
Entry number generation is NOT inside the `$transaction` on line 54. Two concurrent `postJournalEntry` calls can get the same `nextNumber` before either commits.
**What breaks:** Duplicate journal entry numbers — accounting integrity violation.
**Severity:** **HIGH**
**Fix:** Move entry number generation inside the `$transaction` block. Or use a database sequence / `@@unique` constraint on `[tenantId, entryNumber]`.

### INFO: Most server actions have `try/catch`
Error handling pattern: `return { success: false, error: error.message }`. This leaks internal Prisma error messages to the client (e.g., table names, field names).
**Severity:** LOW
**Fix:** Return generic "Internal server error" in production, log the actual error server-side.

---

## SUMMARY: TOP 10 CRITICAL/HIGH SEVERITY FINDINGS

| # | Severity | File:Line | Issue |
|---|----------|-----------|-------|
| 1 | **CRITICAL** | `lib/prisma.ts:18` | Connection pool `max: 1` — all DB queries serialize |
| 2 | **CRITICAL** | `app/actions/analytics.ts:26` | Fetches ALL leads into memory — OOM under load |
| 3 | **CRITICAL** | `app/actions/leadActions.ts:13` | `fetchLeads()` no pagination, fetches all rows |
| 4 | **CRITICAL** | `app/actions/leadActions.ts:17` | `createLead()` has NO auth check — unauthenticated write |
| 5 | **CRITICAL** | `app/actions/growth.ts:53` | Fetches ALL leads unbounded — OOM |
| 6 | **CRITICAL** | `app/api/v1/invoices/route.ts:39` | GET invoices no pagination — OOM + timeout |
| 7 | **HIGH** | `middleware.ts:20-55` | Zero rate limiting on server actions |
| 8 | **HIGH** | `lib/accounting/posting-engine.ts:47-51` | Journal entry number race condition outside $transaction` |
| 9 | **HIGH** | `lib/accounting/posting-engine.ts:103-137` | Reversal not atomic — double-reversal possible |
| 10 | **HIGH** | `app/api/payments/paylink/webhook/route.ts:49-54` | No `@unique` on `gatewayRef` — double-payment possible |
