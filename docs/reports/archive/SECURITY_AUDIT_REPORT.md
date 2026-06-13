# Security Audit Report – ORCA CRM

**Date:** 2026-06-09
**Auditor:** Principal SaaS Architect / Security Auditor
**Scope:** Full application security review

---

## Executive Summary

| Domain | Score | Status |
|--------|-------|--------|
| Authentication | 7/10 | ⚠️ Needs improvements |
| Authorization | 4/10 | ❌ Critical gaps |
| Tenant Isolation | 8/10 | ✅ Good, minor gaps |
| Secrets Management | 5/10 | ⚠️ Key exposure risk |
| Upload Security | 3/10 | ❌ Missing validation |
| API Security | 4/10 | ❌ Multiple gaps |
| **Overall Security** | **5/10** | **❌ BLOCKED** |

**3 Critical vulnerabilities** must be resolved before production scale.

---

## 1. Authentication Audit

### 1.1 Login Flow
| Check | Status | Details |
|-------|--------|---------|
| Password hashing | ✅ | bcrypt with salt rounds 10 |
| Rate limiting | ⚠️ | In-memory only, lost on serverless restart |
| CAPTCHA | ❌ | No CAPTCHA, no brute-force protection |
| Username enumeration | ❌ | Error messages distinguish "wrong password" vs "account disabled" |
| Session fixation | ✅ | New session on each login |
| Cross-tenant detection | ✅ | `device_tenant_subdomain` cookie |

**Findings:**
- Login rate limiter is in-memory (`Map<string, {...}>`) – does not persist across serverless instances. An attacker can rotate IPs or hit different instances.
- Error messages leak account existence: _"كلمة المرور غير صحيحة أو الحساب معطل"_ vs generic message.

### 1.2 JWT / Session Handling
| Check | Status | Details |
|-------|--------|---------|
| Algorithm | ✅ | HS256 via `jose` library |
| Token expiry | ✅ | 24h (session.ts), 12h (login route) – **inconsistent** |
| Secret strength | ⚠️ | Dev: weak placeholder `orca_crm_dev_only...` |
| Key reuse | ❌ | Same secret used for JWT signing AND AES-256-CBC encryption (`lib/crypto.ts`) |
| Cookie flags | ✅ | `httpOnly`, `secure`, `sameSite: lax` |
| `__Host-` prefix | ❌ | Cookie domain set explicitly, not using `__Host-` prefix |

**Findings:**
- JWT expiry is **inconsistent**: `lib/session.ts` sets 24h, `app/api/v1/auth/login/route.ts` sets 12h.
- **Key reuse vulnerability**: `JWT_SECRET` is used for both JWT signing (`lib/session.ts`) and AES-256-CBC key derivation (`lib/crypto.ts`). If the JWT signing algorithm is compromised, all encrypted data (ZATCA credentials, API keys) is also compromised.

### 1.3 Logout
| Check | Status | Details |
|-------|--------|---------|
| Cookie destruction | ✅ | Multi-domain cookie deletion |
| Session invalidation | ⚠️ | JWT remains valid until expiry – no blacklist |
| Post-logout redirect | ✅ | Redirects to login page |

---

## 2. Authorization Audit

### 2.1 RBAC Enforcement

| Check | Status | Details |
|-------|--------|---------|
| Role field in JWT | ✅ | `role` field present |
| Role checked on APIs | ❌ | **Zero API routes check RBAC** |
| Role checked on Server Actions | ❌ | **Zero server actions check RBAC** |
| Client-side enforcement | ❌ | `localStorage` role can be changed via custom event |

**Findings:**
- **All 83+ API routes** authenticate but **none authorize**. A `READ_ONLY` user has identical access to an `ADMIN`.
- `app/context/AuthContext.tsx` stores role in `localStorage` and fires a `role-change` custom event that can be dispatched by any code (including XSS).
- The `hasPermission()` function is client-side only – completely cosmetic.

### 2.2 File: `app/actions/admin.ts` – Super Admin Check
- Hardcoded emails: `"ali.orca@outlook.sa"` and `"elite.orca@outlook.sa"`
- Should use `SUPER_ADMIN_EMAILS` env var (which exists in `lib/tenant.ts` but not used consistently)

### 2.3 File: `app/api/db-init/route.ts`
- Same hardcoded super admin check
- Executes raw SQL with `$executeRawUnsafe()`

---

## 3. Tenant Isolation Audit

### 3.1 Prisma Middleware
| Check | Status | Details |
|-------|--------|---------|
| Auto-inject tenantId | ✅ | Via Prisma extension in `lib/prisma.ts` |
| 71 models covered | ✅ | All financial + CRM models |
| `rawPrisma` bypass | ⚠️ | Used for auth + audit (by design) |
| SSL verification | ❌ | `rejectUnauthorized: false` |

### 3.2 API Route Tenant Filtering
| Route | Tenant Filter | Status |
|-------|---------------|--------|
| All `/api/v1/accounting/*` | ✅ `session.tenantId` | ✅ |
| All `/api/v1/invoices/*` | ✅ `session.tenantId` | ✅ |
| `/api/v1/settings/` | ⚠️ Falls back to first active tenant | ❌ |
| `/api/v1/settings/api-keys` | ❌ No auth at all | ❌ |
| `/api/cron/zatca` | ❌ No auth at all | ❌ |
| `/api/payment/callback` | ❌ Mock mode accepts `mock_tenant_id` | ❌ |

### 3.3 Critical Tenant Isolation Gaps
1. **`getActiveTenant()`** in `lib/tenant.ts` falls back to the first active tenant in the database when subdomain resolution fails. Should fail closed.
2. **`settings/api-keys/route.ts`** has zero tenant isolation.
3. **`cron/zatca/route.ts`** has no auth – any caller can trigger processing for all tenants.

---

## 4. Secrets & Environment Audit

| Secret | .env | .env.production | .gitignore | Issues |
|--------|------|-----------------|------------|--------|
| `DATABASE_URL` | ✅ Real | ✅ Real | ✅ | Password exposed in both files |
| `JWT_SECRET` | ✅ Weak | ✅ Strong | ✅ | Weak in dev, reused for encryption |
| `GEMINI_API_KEY` | ✅ Real | ✅ Real | ✅ | Shared between dev/prod |
| `RESEND_API_KEY` | ❌ | ❌ Placeholder | ✅ | Not configured |
| `ENCRYPTION_KEY` | ❌ | ❌ | N/A | **Missing** – ZATCA encryption will fail |
| `CRON_SECRET` | ❌ | ❌ | N/A | **Missing** – cron auth uses undefined var |
| `SENTRY_DSN` | ❌ | ❌ | N/A | **Missing** – Sentry won't report errors |
| `SENTRY_AUTH_TOKEN` | ❌ | ❌ | N/A | **Missing** – source maps not uploaded |

### 4.1 File: `env.txt`
**CRITICAL:** Contains `PGUSER=neondb_owner` and `PGPASSWORD=npg_yBq3k5MVrmIL` and is **NOT in `.gitignore`**. Database credentials are exposed to anyone with repository access.

### 4.2 File: `app/api/v1/settings/api-keys/route.ts`
**CRITICAL:** API keys stored in plaintext JSON at `scratch/api_keys.json`. No authentication. Keys generated with `Math.random()` (not `crypto.randomBytes`).

---

## 5. Upload Security Audit

| Check | Status | Details |
|-------|--------|---------|
| MIME validation | ❌ | No file type checking |
| File size limits | ❌ | No size limits enforced |
| Path traversal | ⚠️ | Docs stored in `public/documents/{tenantId}/` – path uses tenant ID which might be manipulable |
| File content validation | ❌ | No antivirus/sandbox scanning |
| Allowed extensions | ❌ | No whitelist of allowed extensions |

**Vulnerable endpoints:**
- `POST /api/v1/documents/route.ts` – **NO AUTH** – accepts arbitrary file uploads
- `POST /api/v1/reconciliation/upload` – accepts form data with file, no type/size check

---

## 6. API Security Audit

### 6.1 Security Headers
| Header | Status | Required |
|--------|--------|----------|
| `Content-Security-Policy` | ❌ | Critical |
| `X-Frame-Options` | ❌ | High |
| `X-Content-Type-Options` | ❌ | High |
| `Strict-Transport-Security` | ❌ | High |
| `Referrer-Policy` | ❌ | Medium |
| `Permissions-Policy` | ❌ | Medium |

`next.config.mjs` has **no `async headers()` function** – zero security headers configured.

### 6.2 CORS & CSRF
| Check | Status | Details |
|-------|--------|---------|
| CORS headers | ❌ | Not configured anywhere |
| CSRF tokens | ❌ | No CSRF protection on state-changing endpoints |
| SameSite cookies | ⚠️ | `lax` – partially protects against CSRF for GET, not POST |

### 6.3 Rate Limiting
| Check | Status | Details |
|-------|--------|---------|
| Global rate limiter | ❌ | Not configured |
| Per-route rate limiter | ⚠️ | In-memory only, lost on scale |
| Login rate limiter | ⚠️ | Per-IP 30 req/min, in-memory |
| Financial endpoints | ❌ | No rate limiting |

### 6.4 Input Validation
| Check | Status | Details |
|-------|--------|---------|
| Schema validation | ❌ | No Zod, Yup, or any validation library |
| XSS regex filter | ⚠️ | Blacklist-based, easily bypassed |
| SQL injection | ✅ | Prisma ORM prevents injection |
| NaN validation | ❌ | `parseFloat()` used without `isNaN()` check |
| Type coercion | ❌ | `vatType` cast as `any` bypasses TypeScript |

### 6.5 Unauthenticated Endpoints
| Endpoint | Risk |
|----------|------|
| `GET /api/v1/health` | Low – system info disclosure |
| `GET /api/v1/agents` | Low – agent list disclosure |
| `CRUD /api/v1/settings/api-keys` | **Critical** – API key exposure |
| `GET/POST /api/v1/documents` | **High** – unauthorized file upload |
| `POST /api/cron/zatca` | **Critical** – unauthorized ZATCA processing |
| `GET /api/payment/callback` (mock) | **Critical** – tenant plan escalation |

---

## 7. Vulnerability Summary

### Critical (3)
| # | Vulnerability | Location | Impact |
|---|--------------|----------|--------|
| C1 | API keys exposed with no auth | `app/api/v1/settings/api-keys/route.ts` | Anyone can read/create/delete API keys |
| C2 | Payment callback mock mode allows tenant escalation | `app/api/payment/callback/route.ts` | Unauthorized plan upgrades |
| C3 | ZATCA cron has no authentication | `app/api/cron/zatca/route.ts` | Unauthorized ZATCA processing for all tenants |

### High (6)
| # | Vulnerability | Location | Impact |
|---|--------------|----------|--------|
| H1 | No RBAC enforcement on any route | All API + Server Actions | READ_ONLY user can access all data |
| H2 | No security headers (CSP, HSTS, XFO) | `next.config.mjs` | XSS, clickjacking, MIME sniffing |
| H3 | Client-side auth in localStorage | `app/context/AuthContext.tsx` | Role can be manipulated via custom event |
| H4 | `env.txt` not gitignored, contains DB creds | `env.txt` | Database password exposed |
| H5 | Documents endpoint has no auth | `app/api/v1/documents/route.ts` | Unauthorized file upload |
| H6 | JWT key reuse for encryption | `lib/crypto.ts` + `lib/session.ts` | Encryption compromised if JWT key leaks |

### Medium (8)
| # | Vulnerability | Location | Impact |
|---|--------------|----------|--------|
| M1 | Login username enumeration | `app/api/v1/auth/login/route.ts` | Account existence disclosure |
| M2 | No CAPTCHA/brute-force on login | `app/api/v1/auth/login/route.ts` | Brute force attacks possible |
| M3 | In-memory rate limiter (serverless-unfriendly) | `lib/rate-limit.ts` | Rate limiting ineffective at scale |
| M4 | File upload with no validation | Multiple routes | Malicious file uploads |
| M5 | Missing `ENCRYPTION_KEY` env var | `lib/zatca/encrypt.ts` | ZATCA encryption may fail at runtime |
| M6 | Missing `CRON_SECRET` env var | 3 cron routes | Cron auth will fail in production |
| M7 | `rejectUnauthorized: false` for SSL | `lib/prisma.ts` | MITM possible on DB connection |
| M8 | No idempotency on financial mutations | Multiple POST routes | Duplicate transactions possible |

### Low (6)
| # | Vulnerability | Location | Impact |
|---|--------------|----------|--------|
| L1 | Weak dev JWT secret | `.env` | – |
| L2 | JWT expiry inconsistency (12h vs 24h) | `session.ts` vs `login/route.ts` | – |
| L3 | Hardcoded super admin emails | `app/actions/admin.ts` | – |
| L4 | `getActiveTenant()` fallback to first tenant | `lib/tenant.ts` | Potential data leak |
| L5 | Shared API keys between dev/prod | `.env` + `.env.production` | – |
| L6 | Module-level mutable state in sentinel cron | `app/api/cron/sentinel/route.ts` | Race condition |

---

## 8. Score Breakdown

| Category | Score | Rationale |
|----------|-------|-----------|
| Authentication | 7/10 | Good bcrypt/JWT, but no CAPTCHA, key reuse, enumeration |
| Authorization | 4/10 | Role exists but never enforced server-side |
| Tenant Isolation | 8/10 | Prisma middleware good, but 3 routes bypass it |
| Secrets Management | 5/10 | `env.txt` exposed, placeholder keys, missing env vars |
| Upload Security | 3/10 | No validation, no auth on documents |
| API Security | 4/10 | No CSP, no CORS, no CSRF, weak input validation |
| **Overall** | **5/10** | **❌ BLOCKED** |
