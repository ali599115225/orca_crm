# Production Readiness Report – ORCA CRM

**Date:** 2026-06-09
**Auditor:** Principal SaaS Architect / Security Auditor / QA Lead / Performance Engineer
**Status:** ⚠️ **BLOCKED WITH REASONS**

---

## Executive Summary

| Domain | Score | Target | Verdict |
|--------|-------|--------|---------|
| Security | **5/10** | ≥ 9/10 | ❌ **BLOCKED** – 3 Critical vulns |
| Testing | **2/10** | ≥ 9/10 | ❌ **BLOCKED** – No E2E tests |
| Performance | **7.5/10** | ≥ 8.5/10 | ⚠️ Needs indexes + stress test |
| Reliability | **5/10** | ≥ 9/10 | ❌ No backup, no monitoring |
| **Overall** | **5/10** | **≥ 9/10** | **❌ BLOCKED** |

---

## Risk Register

### Critical (Must fix before Go-Live)

| ID | Risk | Domain | Fix Time | Owner |
|----|------|--------|----------|-------|
| R1 | API keys endpoint has zero authentication | Security | 2h | Dev |
| R2 | Payment callback mock mode allows unauthorized plan upgrades | Security | 1h | Dev |
| R3 | ZATCA cron has no authentication | Security | 30min | Dev |
| R4 | **env.txt** contains DB credentials, NOT gitignored | Security | 30min | DevOps |
| R5 | No E2E tests – 77 tests needed | Testing | 20h | QA |
| R6 | No backup monitoring or restore procedures | Reliability | 4h | DevOps |
| R7 | Database connection pool `max: 1` – single point of failure | Performance | 15min | DevOps |

### High (Fix within 1 week)

| ID | Risk | Domain | Fix Time | Owner |
|----|------|--------|----------|-------|
| R8 | No RBAC enforcement on any route (83+ routes) | Security | 4h | Dev |
| R9 | No security headers (CSP, HSTS, XFO, CORS) | Security | 1h | Dev |
| R10 | No CSRF protection on state-changing endpoints | Security | 2h | Dev |
| R11 | Client-side auth stored in localStorage, role can be manipulated | Security | 2h | Dev |
| R12 | Documents endpoint has no authentication | Security | 1h | Dev |
| R13 | JWT secret reused for AES encryption key | Security | 1h | Dev |
| R14 | Missing env vars: `SENTRY_DSN`, `CRON_SECRET`, `ENCRYPTION_KEY` | Security | 30min | DevOps |
| R15 | No monitoring alerts for payments, ZATCA, or database | Reliability | 4h | DevOps |
| R16 | Missing 8 composite database indexes | Performance | 2h | Dev |
| R17 | No load testing performed – 1000 user target unverified | Performance | 4h | QA |

### Medium (Fix within 2 weeks)

| ID | Risk | Domain | Fix Time | Owner |
|----|------|--------|----------|-------|
| R18 | Login username enumeration via error messages | Security | 30min | Dev |
| R19 | No CAPTCHA or brute-force protection on login | Security | 2h | Dev |
| R20 | In-memory rate limiter – fails in serverless | Security | 3h | Dev |
| R21 | File upload with no MIME/size validation | Security | 2h | Dev |
| R22 | Financial mutations lack idempotency (except invoice pay) | Security | 3h | Dev |
| R23 | `parseFloat()` without NaN validation in financial routes | Security | 1h | Dev |
| R24 | `getActiveTenant()` falls back to first tenant | Security | 30min | Dev |
| R25 | No ZATCA proactive monitoring/alerts | Reliability | 2h | DevOps |
| R26 | No database performance monitoring | Reliability | 2h | DevOps |
| R27 | Dashboard load time borderline (2.1s vs 2s target) | Performance | 2h | Dev |

### Low (Fix within 1 month)

| ID | Risk | Domain | Fix Time | Owner |
|----|------|--------|----------|-------|
| R28 | Weak dev JWT secret | Security | 5min | Dev |
| R29 | JWT expiry inconsistency (12h vs 24h) | Security | 15min | Dev |
| R30 | Hardcoded super admin emails | Security | 15min | Dev |
| R31 | Shared API keys between dev/prod | Security | 10min | DevOps |
| R32 | Module-level mutable state in sentinel cron | Reliability | 1h | Dev |
| R33 | No CI/CD pipeline (GitHub Actions) | Reliability | 4h | DevOps |
| R34 | No automated restore testing | Reliability | 4h | DevOps |

---

## Score Breakdown

### Security: 5/10 ❌

| Sub-domain | Score | Issues |
|------------|-------|--------|
| Authentication | 7/10 | No CAPTCHA, key reuse, enumeration |
| Authorization | 4/10 | Zero RBAC enforcement |
| Tenant Isolation | 8/10 | 3 routes bypass isolation |
| Secrets Management | 5/10 | `env.txt` exposed, missing vars |
| Upload Security | 3/10 | No validation, documents unauth |
| API Security | 4/10 | No CSP, CORS, CSRF, weak validation |
| **Weighted** | **5/10** | **3 Critical, 6 High, 8 Medium** |

### Testing: 2/10 ❌

| Sub-domain | Score | Issues |
|------------|-------|--------|
| Unit Tests | 3/10 | 5 tests only |
| E2E Tests | 1/10 | Zero Playwright tests |
| Coverage | 1/10 | < 5% coverage |
| **Weighted** | **2/10** | **77 tests needed** |

### Performance: 7.5/10 ⚠️

| Sub-domain | Score | Issues |
|------------|-------|--------|
| Database | 6/10 | 8 missing indexes, N+1 risk |
| Dashboard | 7/10 | Borderline 2.1s |
| Invoices | 9/10 | Within target |
| Reports | 8/10 | Within target |
| Stress Test | 0/10 | Not executed |
| **Weighted** | **7.5/10** | **Needs indexes + stress test** |

### Reliability: 5/10 ❌

| Sub-domain | Score | Issues |
|------------|-------|--------|
| Monitoring | 3/10 | No alerts, Sentry DSN missing |
| Backup | 3/10 | No scripts, no restore testing |
| Observability | 4/10 | Partial Sentry, no DB monitoring |
| **Weighted** | **5/10** | **Sentry non-functional** |

---

## Remediation Roadmap

### Week 1: Unblock Production (37 hours)

| Day | Focus | Tasks | Hours |
|-----|-------|-------|-------|
| Mon | **Critical Security** | R1, R2, R3, R4, R7 | 5h |
| Tue | **High Security** | R8, R9, R10, R11, R12, R13 | 11h |
| Wed | **Env + Monitoring** | R14, R15, R6 | 9h |
| Thu | **Performance** | R16, R27 | 4h |
| Fri | **Load Test** | R17 | 4h |
| Sat | **E2E Tests Start** | R5 (first 20 tests) | 4h |

### Week 2: Production Confidence (40 hours)

| Day | Focus | Tasks | Hours |
|-----|-------|-------|-------|
| Mon | **E2E Tests** | R5 (CRM + Leasing: 38 tests) | 8h |
| Tue | **E2E Tests** | R5 (Finance + ZATCA: 32 tests) | 8h |
| Wed | **Medium Security** | R18, R19, R20, R21, R22, R23, R24 | 10h |
| Thu | **Medium Reliability** | R25, R26 | 4h |
| Fri | **E2E Security Tests** | R5 (Security: 7 tests) + execution | 6h |
| Sat | **Final Validation** | Full regression, audit re-check | 4h |

### Total: ~77 hours across 12 days

---

## Final Verdict

```
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║           ❌ BLOCKED WITH REASONS                             ║
║                                                              ║
║  Current Score:      5/10   ❌                                ║
║  Target Score:       9/10   🎯                                ║
║                                                              ║
║  Blocking Issues:                                              ║
║                                                              ║
║  CRITICAL (3):                                                ║
║    R1  API keys endpoint has ZERO authentication              ║
║    R2  Payment callback mock mode allows tenant escalation     ║
║    R3  ZATCA cron has no authentication                        ║
║    R4  DB credentials exposed in non-gitignored file           ║
║                                                              ║
║  HIGH (9):                                                    ║
║    R5  Zero E2E tests (77 needed)                             ║
║    R6  No backup monitoring or restore procedures              ║
║    R7  DB pool max=1 (single point of failure)                ║
║    R8  No RBAC on any of 83+ API routes                       ║
║    R9  No security headers (CSP, HSTS, CORS)                  ║
║    R10 No CSRF protection                                     ║
║    R11 Client-side auth in localStorage                       ║
║    R12 Documents endpoint has no authentication                ║
║    R13 JWT secret reused for encryption                       ║
║    R14 Missing 3 critical env vars (SENTRY_DSN, etc.)         ║
║                                                              ║
║  Remediation: ~77 hours across 12 days                        ║
║  After remediation target: 9/10                               ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```

## Required Actions for Unblock

```markdown
1. Fix CRITICAL issues (R1-R4):  ~4 hours → UNBLOCK for monitored pilot
2. Fix HIGH issues (R5-R14):     ~33 hours → Safe for production
3. Fix MEDIUM issues (R15-R27):  ~26 hours → Production confidence
4. Fix LOW issues (R28-R34):     ~14 hours → Production excellence
```

**Minimum for production:** Fix all Critical + High issues (~37 hours, ~5 days).  
**After Phase 1 (Critical fixes + pool size):** Unblock for **monitored commercial pilot**.
