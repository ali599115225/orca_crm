# Security Fix Plan – ORCA CRM

**Priority:** Critical → High → Medium → Low
**Target:** 9/10 Security Score

---

## Critical Fixes (Must fix before production)

### C1 – API Keys Endpoint: Add Authentication & Encryption

**File:** `app/api/v1/settings/api-keys/route.ts`

**Action:**
1. Add `authenticateRequest()` to all methods
2. Add RBAC check – only ADMIN can manage API keys
3. Store keys encrypted using `lib/crypto.ts` `encryptText()`
4. Mask keys in list responses (show only last 4 chars: `****1234`)
5. Use `crypto.randomBytes(32).toString('hex')` instead of `Math.random()`
6. Store in Database (not filesystem) for tenant isolation

```typescript
// Fix template for API key creation:
const key = crypto.randomBytes(32).toString('hex');
const encrypted = encryptText(key);
// Store encrypted in database with tenantId relation
```

**Estimate:** 2 hours

---

### C2 – Payment Callback: Gate Mock Mode Behind Env Flag

**File:** `app/api/payment/callback/route.ts`

**Action:**
1. Add env variable `MOCK_PAYMENT_ENABLED` (default `false`)
2. Only allow mock mode when env var is explicitly `true`
3. Add authentication + HMAC verification to mock endpoints
4. Never accept `mock_tenant_id` from query params – use session tenant
5. Log all mock payment attempts as security events

```typescript
// Fix template:
if (process.env.MOCK_PAYMENT_ENABLED !== 'true') {
  return NextResponse.json({ error: 'Mock payments disabled' }, { status: 403 });
}
```

**Estimate:** 1 hour

---

### C3 – ZATCA Cron: Add Authentication

**File:** `app/api/cron/zatca/route.ts`

**Action:**
1. Add same `CRON_SECRET` Bearer token check used by other cron routes
2. Register `CRON_SECRET` in `.env.production`
3. Add rate limiting (max 1 call per 5 minutes)

**Estimate:** 30 minutes

---

## High Priority Fixes

### H1 – RBAC Enforcement

**Files:** All API routes + Server Actions

**Action:**
1. Create `lib/rbac.ts` with role-checking middleware:

```typescript
export function requireRole(allowedRoles: Role[]) {
  return async (request: NextRequest) => {
    const session = await authenticateRequest(request);
    if (!session) return unauthorized();
    if (!allowedRoles.includes(session.role)) return forbidden();
    return session;
  };
}
```

2. Apply to all financial routes (ADMIN, SALES_MANAGER only)
3. Apply to all admin routes (ADMIN only)
4. Apply to all read routes (all authenticated roles)

**Estimate:** 4 hours

---

### H2 – Security Headers

**File:** `next.config.mjs`

**Action:**
Add `async headers()` function:

```typescript
async headers() {
  return [
    {
      source: '/(.*)',
      headers: [
        { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self' https://api.moyasar.com https://*.neon.tech;" },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      ],
    },
  ];
},
```

**Estimate:** 1 hour

---

### H3 – Remove Client-Side Auth in localStorage

**File:** `app/context/AuthContext.tsx`

**Action:**
1. Remove role storage from `localStorage`
2. Get role from session cookie/server-side always
3. Remove `role-change` custom event listener
4. Add server-side role check before rendering protected components

**Estimate:** 2 hours

---

### H4 – Gitignore `env.txt`

**File:** `.gitignore`

**Action:**
Add `env.txt` to `.gitignore`. If file has been committed, use `git filter-branch` or BFG Repo-Cleaner to remove from history.

**Estimate:** 30 minutes + history rewrite

---

### H5 – Documents Endpoint Auth

**File:** `app/api/v1/documents/route.ts`

**Action:**
1. Add `authenticateRequest()` to all methods
2. Add file size limit (max 10MB)
3. Add MIME type validation whitelist (`application/pdf`, `image/*`, `application/msword`, etc.)
4. Store in tenant-scoped directory

**Estimate:** 2 hours

---

### H6 – Separate Encryption Key

**Files:** `lib/crypto.ts`

**Action:**
1. Add `ENCRYPTION_KEY` env variable (separate from `JWT_SECRET`)
2. Update `lib/crypto.ts` to use `ENCRYPTION_KEY` instead of deriving from `JWT_SECRET`
3. For backward compatibility, fall back to `JWT_SECRET` with a deprecation warning

**Estimate:** 1 hour

---

## Medium Priority Fixes

### M1 – Fix Login Error Messages
Return generic "Invalid credentials" regardless of whether account exists or is disabled.

### M2 – Add CAPTCHA
Add Google reCAPTCHA v3 or Cloudflare Turnstile to login form.

### M3 – Persistent Rate Limiting
Replace in-memory Map with Vercel KV (Redis) or database-backed rate limiting.

### M4 – File Upload Validation
Add MIME type, size, and extension validation to all file upload endpoints.

### M5 – Add Missing ENV Vars
Define `ENCRYPTION_KEY`, `CRON_SECRET`, `SENTRY_DSN`, `SENTRY_AUTH_TOKEN` in `.env.production`.

### M6 – Fix SSL Verification
Remove `rejectUnauthorized: false` and add proper CA certificate for Neon.

### M7 – Idempotency for Financial Mutations
Add idempotency key checking to:
- `POST /contracts/issue`
- `POST /leases`
- `POST /leases/[id]/invoices`
- `POST /accounting/journal-entries`

### M8 – Input Validation Library
Integrate Zod for request body validation across all POST/PUT endpoints.

---

## Low Priority Fixes

### L1 – Strengthen Dev JWT Secret
### L2 – Unify JWT Expiry to 24h
### L3 – Move Super Admin Emails to ENV
### L4 – Remove First-Tenant Fallback
### L5 – Separate Dev/Prod API Keys
### L6 – Fix Sentinel Race Condition

---

## Implementation Timeline

| Phase | Fixes | Duration | Score After |
|-------|-------|----------|-------------|
| **Phase 1** | C1, C2, C3 | 3.5h | 6/10 |
| **Phase 2** | H1, H2, H3, H4, H5, H6 | 10.5h | 8/10 |
| **Phase 3** | M1–M8 | 6h | 9/10 |
| **Phase 4** | L1–L6 | 3h | 9.5/10 |
| **Total** | **23 fixes** | **~23h** | **9/10** |

---

## BLOCKER Status

**Current: BLOCKED** – 3 Critical vulnerabilities (C1, C2, C3) must be fixed before production.
**After Phase 1: UNBLOCKED** – Production can proceed with High+Medium fixes scheduled.
