# ORCA INFRASTRUCTURE AUDIT

**Date:** 2026-06-10
**Auditor:** Agent 1 — Platform & Security Lead
**Scope:** Git hygiene, env management, backup/DR, cron reliability, caching, deployment pipeline
**Repository:** `github.com/ali599115225/orca_crm.git` (public)

---

## EXECUTIVE SUMMARY

| Component | Score | Status |
|-----------|-------|--------|
| Git History Hygiene | 2/10 | CRITICAL |
| Environment Variables Management | 3/10 | CRITICAL |
| Backup Strategy | 5/10 | PARTIAL |
| Disaster Recovery | 4/10 | INSUFFICIENT |
| Cron Jobs Reliability | 6/10 | ADEQUATE |
| Caching Strategy | 2/10 | MISSING |
| Deployment Pipeline | 5/10 | BASIC |
| **Overall Infrastructure** | **3.5/10** | **NOT PRODUCTION-READY** |

---

## 1. GIT HISTORY HYGIENE — 2/10 (CRITICAL)

### 1.1 Secrets in Repository History

| File | Content Exposed | Committed In | Tracked? | In .gitignore? |
|------|----------------|-------------|----------|----------------|
| `env.txt` | `PGPASSWORD=npg_yBq3k5MVrmIL`, `PGUSER=neondb_owner` | `533853a` | YES | YES (line 26, added later) |
| `recovery-codes.txt` | 6 recovery codes | `be33a7c` | YES | YES (line 23, added later) |

**Status:** Both files remain in git history. They were committed BEFORE `.gitignore` rules were applied. A simple `git rm` will remove them from the working tree but NOT from history.

### 1.2 `.env` Status

`git ls-files ".env"` returns no output — `.env` is currently NOT tracked. However, the file exists on disk with live secrets (`DATABASE_URL`, `GEMINI_API_KEY`, `JWT_SECRET`). The `.gitignore` entry at line 11 prevents future commits, but:
- The file on disk is identical to production credentials
- Any accidental `git add -f .env` would commit it
- No pre-commit hook prevents secret leakage

### 1.3 Commit Hygiene Issues

| Issue | Detail |
|-------|--------|
| **30 total commits** | Low commit count suggests infrequent pushes and large batch commits |
| **Build output in repo** | `build_v2.txt`, `build_v3.txt`, `build_out.txt`, `build_output.txt`, `build_final.txt`, `build_docs.txt` are build logs committed to the repo — bloat and potential info leakage |
| **Log files committed** | `server_err.log`, `server_out.log`, `logs/system.log` — server logs in git with potential PII or error details |
| **Test output committed** | `playwright-report/`, `lighthouse-report/`, `unlighthouse-report/` — generated test output in source control |
| **Audit files in repo** | 40+ `.md` report files committed — not harmful but clutters the repo |
| **Large binary files unclear** | `docs/ORCA_CRM_التقنيات_المستخدمة.docx` committed |

### 1.4 Recommendations

1. **Rewrite git history** using BFG Repo-Cleaner to purge `env.txt`, `recovery-codes.txt`, and any other sensitive files
2. **Add pre-commit hook** (`pre-commit` or `husky`) with secret scanning (`detect-secrets`, `gitleaks`, or `trufflehog`)
3. **Add `.gitignore` rules** for `*.log`, `build_*.txt`, `playwright-report/`, `lighthouse-report/`, `unlighthouse-report/`
4. **Rotate all secrets** before history rewrite is pushed
5. **Make repository private** immediately — currently `github.com/ali599115225/orca_crm` appears to be a public repository

---

## 2. ENVIRONMENT VARIABLES MANAGEMENT — 3/10 (CRITICAL)

### 2.1 Current State

| File | Location | Status |
|------|----------|--------|
| `.env` | Local disk only | Contains live production secrets, gitignored |
| `.env.production` | Local disk only | Gitignored (line 16) |
| `env.txt` | Git history | Contains DB credentials (`neondb_owner` role) |
| Vercel Dashboard | Cloud | Primary intended location for production secrets |

### 2.2 Missing Environment Variables (Production)

| Variable | Purpose | Status |
|----------|---------|--------|
| `SENTRY_DSN` | Error tracking | MISSING — Sentry is non-functional |
| `SENTRY_AUTH_TOKEN` | Source map uploads | MISSING |
| `SENTRY_ORG` | Sentry organization | MISSING |
| `SENTRY_PROJECT` | Sentry project | MISSING |
| `CRON_SECRET` | Cron job authentication | MISSING — defined but empty |
| `ENCRYPTION_KEY` | Separate encryption key | MISSING — falls back to JWT_SECRET |
| `RESEND_API_KEY` | Email sending | MISSING (placeholder only) |
| `FAILOVER_WEBHOOK_URL` | Sentinel failover alerts | MISSING |
| `SUPER_ADMIN_EMAILS` | Admin identity | MISSING — superseded by hardcoded values |

### 2.3 Environment Variable Issues

| Issue | Detail |
|-------|--------|
| **No `.env.example`** | No template file documenting required variables |
| **No validation at startup** | Missing env vars cause runtime errors, not build failures |
| **Fallback values are production-dangerous** | `JWT_SECRET` falls back to weak dev key; WhatsApp instance falls back to hardcoded ID |
| **No secret rotation process** | No documented procedure for rotating any secret |
| **Shared keys across dev/prod** | Gemini API key identical in `.env` and `.env.production` |
| **Dev secrets are weak** | `JWT_SECRET` in `.env` is a human-readable placeholder |

### 2.4 Vercel Deployment Variables

The `deployment-checklist.md` lists 24 environment variables needed in Vercel. The `deployment-guide.md` lists only 3 core variables. These documents are inconsistent. Many of the 24 variables are missing or have empty values.

### 2.5 Recommendations

1. Create `.env.example` with ALL required variables and descriptions (no secrets)
2. Add startup validation in `instrumentation.ts` or middleware to check required vars
3. Implement Vercel `env:pull` workflow for local development
4. Create `scripts/validate-env.ts` that runs before build
5. Document secret rotation procedures
6. Remove all fallback-to-dev behavior in production code

---

## 3. BACKUP STRATEGY — 5/10 (PARTIAL)

### 3.1 Current State

| Backup Type | Status | Provider |
|------------|--------|----------|
| Database Point-in-Time Recovery | EXISTS | Neon built-in WAL archiving (7-day retention) |
| Database Daily Snapshots | EXISTS | Neon automated snapshots (30-day retention) |
| Database Weekly Full Backup | EXISTS | Neon automated |
| Custom `pg_dump` Scripts | NOT IMPLEMENTED | — |
| Application Code Backup | EXISTS | GitHub (git history) |
| Environment Variables Backup | NOT IMPLEMENTED | No backup of Vercel env vars |
| Uploaded Files Backup | NOT IMPLEMENTED | Files in `scratch/uploads/` have no backup |
| Backup Encryption | NOT CONFIGURED | — |
| Off-Site / Cross-Region Backup | NOT CONFIGURED | Single region (us-east-1) |
| Backup Verification | NOT AUTOMATED | No automated restore testing |

### 3.2 What Exists (from `BACKUP_RECOVERY_VALIDATION.md`)

| Tier | Retention | Method | Status |
|------|-----------|--------|--------|
| WAL (Continuous) | 7 days | Neon built-in | ACTIVE |
| Daily Snapshots | 30 days | Neon automated | ACTIVE |
| Weekly Full | 90 days | Neon automated | ACTIVE |
| Monthly Archive | 12 months | pg_dump to S3 | **SCRIPT ONLY — NOT IMPLEMENTED** |
| Annual Archive | 7 years | S3 Glacier | **SCRIPT ONLY — NOT IMPLEMENTED** |

### 3.3 Restore Validation

Per `BACKUP_RECOVERY_VALIDATION.md`, a manual restore test was performed on 2026-06-09 with the following results:
- Point-in-time restore: ✅ 4 min RTO, 0 min RPO
- Snapshot restore: ✅ 8 min RTO
- Weekly full restore: ✅ 15 min RTO
- Cross-region DR: ❌ NOT TESTED
- Data integrity: ✅ All tables verified

However, this was a **one-time manual test**. No automated restore testing exists.

### 3.4 Gaps

1. **No automated backup verification** — backups assumed successful unless manually checked
2. **No backup failure alerting** — no notification if Neon backup fails
3. **No custom export** — 100% dependent on Neon's built-in backup
4. **No file backup** — `scratch/uploads/` documents are ephemeral on Vercel
5. **No cross-region copy** — single `us-east-1` deployment, no DR region
6. **No encrypted off-site storage** — no S3/GCS/Azure Blob export

### 3.5 Recommendations

1. Implement weekly `pg_dump` export to S3 (with server-side encryption)
2. Schedule automated restore test (monthly minimum)
3. Add backup health check to Sentinel cron job
4. Add backup failure alerting (email + WhatsApp)
5. Move file storage to S3/R2 (eliminates ephemeral filesystem concern)

---

## 4. DISASTER RECOVERY — 4/10 (INSUFFICIENT)

### 4.1 DR Scenarios

| Scenario | RTO (Claimed) | RPO | Tested? |
|----------|--------------|-----|---------|
| Database corruption | ~10 min | ~0 min (PITR) | ✅ Manual test once |
| Application failure | ~3 min | N/A | ⚠️ Vercel rollback only |
| Full region outage | ~20 min | Unknown | ❌ NOT TESTED |
| Accidental data deletion | ~8 min | 24h max | ✅ Manual test once |
| Credentials compromise | Unknown | Unknown | ❌ No procedure |
| Ransomware | Unknown | Unknown | ❌ No procedure |

### 4.2 Sentinel Self-Healing (`app/api/cron/sentinel/route.ts`)

The Sentinel cron job attempts automatic database recovery:
- Up to 3 healing attempts via `$disconnect()` + `$connect()`
- After 3 failures, triggers "failover mode" (writes to `console.error`, optionally sends webhook)
- Failover state stored in module-level variable (not persistent — see Security Audit L4)
- No actual multi-region failover implementation exists

### 4.3 Emergency Procedures (`deployment-checklist.md`)

Three "kill switches" documented:
1. **Safe Mode** (30 sec) — Set `SAFE_MODE_ENABLED=true` in Vercel
2. **Rollback** (60 sec) — Promote last successful Vercel deploy
3. **Logger Off** — Set `ENABLE_SYSTEM_LOGGER=false`

These are reasonable for application-layer emergencies but do not address:
- Database unavailability
- Neon region outage
- DNS failure
- Credential compromise
- Vercel platform outage

### 4.4 Gaps

1. **No DR runbook** — No step-by-step document for full disaster recovery
2. **No cross-region deployment** — Single Vercel region + single Neon region
3. **No DNS failover** — Single domain `orca.az-ez.pro` with no backup domain
4. **No incident response plan** — No defined roles, communication channels, or escalation
5. **No RTO/RPO targets** — Ad-hoc estimates, not contractual SLAs

### 4.5 Recommendations

1. Create `DISASTER_RECOVERY_RUNBOOK.md` with step-by-step procedures
2. Deploy Neon read replica in a secondary region (e.g., `eu-west-1`)
3. Configure Vercel deployment to a secondary region
4. Set up DNS failover (Cloudflare or AWS Route 53 health-check-based)
5. Define and document RTO/RPO targets per service tier
6. Test cross-region failover quarterly
7. Move Sentinel state from module-level variable to database

---

## 5. CRON JOBS RELIABILITY — 6/10 (ADEQUATE)

### 5.1 Cron Job Inventory

| Job | Route | Schedule | Auth | Status |
|-----|-------|----------|------|--------|
| Billing | `/api/cron/billing` | Daily 02:00 KSA | Bearer `CRON_SECRET` | ✅ Active in `vercel.json` |
| Sentinel | `/api/cron/sentinel` | Daily 06:00 KSA | Bearer `CRON_SECRET` | ✅ Active in `vercel.json` |
| ZATCA | `/api/cron/zatca` | NOT in `vercel.json` | Bearer `CRON_SECRET` | ⚠️ Has auth, but NOT scheduled |
| Installments | `/api/cron/installments` | NOT in `vercel.json` | Bearer `CRON_SECRET` | ⚠️ Has auth, but NOT scheduled |

### 5.2 Issues

| Issue | Detail |
|-------|--------|
| **ZATCA cron not scheduled** | Route has auth code but is NOT listed in `vercel.json` crons array. ZATCA processing will never run automatically. |
| **Installments cron not scheduled** | Same as above — Sanad installment agent never runs automatically. |
| **CRON_SECRET possibly empty** | If `CRON_SECRET` is not set in Vercel env, cron auth fails silently (returns 500 "CRON_SECRET not configured"). |
| **No retry logic** | Vercel cron fires once. If the function times out or errors, there's no automatic retry. |
| **60-second timeout** | Vercel serverless functions have a 60s timeout. The billing cron with sequential `for` loops may exceed this at scale. |
| **No cron health monitoring** | No alert if a cron job fails or doesn't run. Sentinel checks health, but who monitors Sentinel? |
| **Module-level mutable state** | Sentinel's `healingAttempts` counter is in memory — lost between cron runs. See Security Audit L4. |

### 5.3 Recommendations

1. Add ZATCA and Installments cron jobs to `vercel.json` with appropriate schedules
2. Set `CRON_SECRET` in Vercel environment with a strong random value
3. Add cron health checks to Sentinel: verify last run timestamps
4. Add cron failure alerting (email + Sentry)
5. Refactor billing cron to use batched `updateMany()` instead of sequential `for` loops
6. Consider Upstash QStash or Inngest for reliable cron with retries
7. Store Sentinel state in database, not module variable

---

## 6. CACHING STRATEGY — 2/10 (MISSING)

### 6.1 Current State

| Cache Layer | Status | Detail |
|-------------|--------|--------|
| Distributed Cache (Redis) | NOT CONFIGURED | No Redis, no Upstash, no Memcached |
| Database Query Cache | NOT CONFIGURED | Every request hits the database directly |
| HTTP Response Caching | PARTIAL | `Cache-Control` on QR code endpoints only |
| React `cache()` | ACTIVE | Per-request in-memory only, not shared across instances |
| Next.js ISR | ACTIVE | `revalidatePath` used for page cache invalidation |
| CDN | NOT CONFIGURED | No Cloudflare, no Vercel Edge CDN configuration |
| Image Optimization | NOT CONFIGURED | Images served as raw CSS backgrounds (`ToursView.tsx:736`) |

### 6.2 Impact

| Issue | Consequence |
|-------|------------|
| No distributed cache | Every API call executes database queries. As tenant count grows, DB load scales linearly. |
| No tenant metadata cache | `getActiveTenant()` queries the database on every request |
| No session cache | Session lookup hits the database |
| In-memory DLQ | `lib/saher/replayEngine.ts` stores failed messages in a Map — lost on server restart |
| In-memory favorites/visits | Property favorites and visit logs in `app/api/properties/[id]/favorites/route.ts` are in-memory — lost on server restart |

### 6.3 Database Connection Pool

| Parameter | Value | Impact |
|-----------|-------|--------|
| `max` connections | 1 | Single connection for entire application per instance |
| `connectionTimeoutMillis` | 10,000ms | Long timeout for cold starts |
| `idleTimeoutMillis` | 10,000ms | Connections closed aggressively in serverless |
| Adapter | `@prisma/adapter-pg` | Not the Neon-optimized adapter (`@prisma/adapter-neon` is installed but UNUSED) |

### 6.4 Recommendations

1. **Deploy Upstash Redis** — Cache tenant metadata, lookup data, session tokens, rate limit counters
2. **Increase DB connection pool** — Raise `max` to 5-10 (or switch to `@prisma/adapter-neon` for built-in pooling)
3. **Add HTTP caching headers** — `Cache-Control` on read-heavy API responses
4. **Migrate in-memory stores to DB or Redis** — Favorites, visit logs, DLQ, Sentinel state
5. **Configure CDN** — Vercel Edge CDN for static assets, Cloudflare for DNS-level caching
6. **Add image optimization** — Use `next/image` instead of CSS `backgroundImage`

---

## 7. DEPLOYMENT PIPELINE — 5/10 (BASIC)

### 7.1 Current Pipeline

```
GitHub Push → Vercel Auto-Deploy → Build (prisma generate + next build) → Deploy
```

| Stage | Status | Detail |
|-------|--------|--------|
| Source Control | ✅ | GitHub |
| Auto-Deploy | ✅ | Vercel Git integration |
| Build | ✅ | `prisma generate && next build` |
| Build Command | ✅ | Configured in `vercel.json:12` |
| Install Command | ✅ | `npm install` |
| Framework Detection | ✅ | Next.js auto-detected |
| Preview Deployments | ✅ | Vercel auto-creates per-branch preview |
| Production Promotion | ✅ | Merge to main → auto-deploy to production |

### 7.2 What's Missing

| Stage | Detail |
|-------|--------|
| **Pre-commit hooks** | No linting, formatting, or secret scanning before commit |
| **CI checks** | No automated tests in the deployment pipeline — Vercel only runs `prisma generate && next build` |
| **Type checking** | No `tsc --noEmit` in build — TypeScript errors are bypassed (commit `aab0487`: "bypass_ts_errors") |
| **Linting** | No ESLint or Prettier configuration found |
| **Unit tests in CI** | Vitest configured but not run in Vercel build |
| **E2E tests in CI** | Playwright configured (38 tests) but not run in pipeline |
| **Database migrations in CI** | `prisma migrate deploy` not in build — migrations must be run manually |
| **Environment validation** | No check that all required env vars are set |
| **Bundle analysis** | No `@next/bundle-analyzer` |
| **Performance budget** | No Lighthouse CI or performance regression checks |
| **Staging environment** | No dedicated staging deployment — preview deploys only |
| **Blue-green deployments** | Not configured — all deploys go directly to production |
| **Rollback automation** | Manual only (Vercel dashboard) |
| **Health check trigger** | No post-deploy health check verification |

### 7.3 Recommendations

1. Add GitHub Actions workflow with: `npm run lint`, `npm run typecheck`, `npx vitest run`, `npx playwright test`
2. Add `tsc --noEmit` to build script to catch TypeScript errors before deployment
3. Create `scripts/validate-env.ts` and run it before build
4. Configure a dedicated staging environment on Vercel
5. Add post-deploy smoke tests (health check, login test, lead creation test)
6. Add `@next/bundle-analyzer` for bundle size monitoring
7. Set up Husky pre-commit hooks with secret scanning
8. Add `prisma migrate deploy` to the production build command

---

## VERDICT

**INFRASTRUCTURE POSTURE: 3.5/10 — NOT PRODUCTION-READY.**

The infrastructure foundation (Vercel + Neon + GitHub) is solid, but the implementation is incomplete:

- **Git hygiene is compromised** — secrets in history, build artifacts committed
- **Environment management is fragile** — missing vars, no validation, fallbacks are dangerous
- **Backup is Neon-dependent** — no custom exports, no off-site copies
- **DR is untested** — no cross-region, no runbook, no automated failover
- **Cron jobs are partially scheduled** — 2 of 4 crons not in `vercel.json`
- **Caching is absent** — zero distributed caching, in-memory stores are ephemeral
- **CI/CD is deployment-only** — no testing, linting, or validation gates

**Minimum requirements before production:** Fix git hygiene (secrets purge, pre-commit hooks), schedule missing cron jobs, deploy Upstash Redis for distributed rate limiting and caching, add environment validation, configure remaining Sentry env vars.
