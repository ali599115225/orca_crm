# ORCA Monitoring Audit Report

**Document ID**: ORCA-MON-001  
**Date**: 10 June 2026  
**Scope**: Observability, alerting, error tracking, health monitoring, and logging for ORCA production  
**Status**: CRITICAL GAPS — Sentry is integrated but non-functional; no automated alerting; health endpoint exists but unpolled by external services

---

## 1. Current State Assessment

### 1.1 Sentry — Error Tracking

| Aspect | Current State | Status |
|--------|--------------|--------|
| **Package** | `@sentry/nextjs: ^10.56.0` in `package.json:18` | Installed |
| **Server Config** | `sentry.server.config.ts:3-8` — `Sentry.init({ dsn: process.env.SENTRY_DSN \|\| "", tracesSampleRate: 0.2 })` | Configured |
| **Edge Config** | `sentry.edge.config.ts` (file exists) | Present |
| **Client Config** | `sentry.client.config.ts` (file exists) | Present |
| **Instrumentation Hook** | `instrumentation.ts:1-11` — calls `Sentry.init()` in Node.js runtime | Registered |
| **Next.js Integration** | `next.config.mjs:78-86` — wraps config with `withSentryConfig()` using `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` | Integrated |
| **Utility Helpers** | `lib/sentry-utils.ts:1-39` — 4 helper functions: `captureApiError`, `captureServerActionError`, `captureCronError`, `captureAiAgentError` | Written |
| **DSN Environment Variable** | `SENTRY_DSN` — **NOT SET** in `.env.production` (confirmed: grep returned no matches) | **MISSING** |
| **Org/Project/AuthToken** | `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` — **NOT SET** in `.env.production` | **MISSING** |
| **Actual Error Tracking** | Sentry initializes with `dsn: ""` (empty string) — **ZERO errors captured** | **BROKEN** |

**Root Cause**: `sentry.server.config.ts:4` uses `process.env.SENTRY_DSN || ""`. Since `SENTRY_DSN` is not defined in `.env.production` or Vercel environment variables, Sentry silently initializes with an empty DSN. No errors are sent to any Sentry project. The `captureException` calls in `lib/sentry-utils.ts` execute but go nowhere.

**Impact**: The application has zero visibility into:
- Unhandled promise rejections
- API route exceptions
- Server action errors
- Cron job failures
- AI agent errors
- Edge middleware errors

Despite having Sentry fully wired into the codebase at 4 integration points (`instrumentation.ts`, `next.config.mjs`, 3 sentry config files, `lib/sentry-utils.ts` with 4 capture helpers), no production errors have ever been tracked.

---

### 1.2 Health Endpoint

| Aspect | Current State | Status |
|--------|--------------|--------|
| **Endpoint** | `GET /api/v1/health` in `app/api/v1/health/route.ts` | Operational |
| **Database Check** | `SELECT 1` with latency measurement | Implemented |
| **System Metrics** | Active tenants, total users, total leads, 24h audit log count | Implemented |
| **Response Codes** | HTTP 200 (online) / HTTP 503 (degraded) | Implemented |
| **Authentication** | None — endpoint is publicly accessible | **No auth** |
| **External Monitoring** | No UptimeRobot, Pingdom, Checkly, or similar service configured | **MISSING** |
| **Polling Frequency** | Manually polled; not called by any cron or external monitor | **AD-HOC** |

**Health endpoint response format** (`route.ts:39-51`):
```json
{
  "status": "online" | "degraded",
  "timestamp": "2026-06-10T...",
  "responseTime": "45ms",
  "checks": {
    "database": { "status": "connected", "latency": "12ms" },
    "api": { "status": "operational", "latency": "1ms" },
    "system": { "activeTenants": 5, "totalUsers": 42, "totalLeads": 150, "auditLogs24h": 30 }
  },
  "version": "1.0.0"
}
```

**Gap**: The health endpoint is fully functional but not monitored. Nobody gets alerted when it returns HTTP 503. No dashboard consumes its data. It exists and works — but serves no operational purpose until external monitoring is attached.

---

### 1.3 Error Agent (ساهر / Saher)

| Aspect | Current State | Status |
|--------|--------------|--------|
| **Code Location** | `app/actions/errorAgent.ts` — 204 lines | Implemented |
| **Function** | `saherTrackSystemErrorsAction()` — DB health, SSL check, open tickets, expired tenants, anomalies | Implemented |
| **Email Alert** | Sends HTML report via `sendAdminEmailAlert()` on every run | Implemented |
| **Invocation** | Only via `runAllSystemAgentsAction()` which requires superadmin auth (`actions/errorAgent.ts:179-204`) | **MANUAL ONLY** |
| **Cron Scheduling** | NOT in `vercel.json` crons array (only `billing` and `sentinel` are listed) | **NOT SCHEDULED** |
| **CRON_SECRET** | Not set in `.env.production` — would fail even if scheduled | **MISSING** |

**Gap**: The error agent is a fully built diagnostic system (6 health checks, anomaly detection, email alerting) but is **never called automatically**. It requires a superadmin to manually trigger it from the UI. It is not wired to any cron job or automated trigger.

---

### 1.4 Sentinel Cron (الوكيل ساهر — Cron Version)

| Aspect | Current State | Status |
|--------|--------------|--------|
| **Code Location** | `app/api/cron/sentinel/route.ts` — 201 lines | Implemented |
| **Schedule** | `vercel.json:8` — `0 6 * * *` (every 6 hours at minute 0) | Scheduled |
| **Health Checks** | DB health, connection latency, suspended tenants, exhausted usage meters | Implemented |
| **Self-Healing** | Disconnect → wait 2s → reconnect → retry `SELECT 1` (up to 3 attempts) | Implemented |
| **Failover Mode** | After 3 failures, calls `activateFailoverMode()` → webhook to `FAILOVER_WEBHOOK_URL` | Implemented |
| **Email Alert** | Sends HTML report on every run with anomaly summary | Implemented |
| **CRON_SECRET** | Required (line 13-20) — returns HTTP 500 if not configured | **MISSING in env** |
| **FAILOVER_WEBHOOK_URL** | Required for failover notifications — not set | **MISSING** |

**Critical Gap**: The sentinel cron is scheduled in `vercel.json` but `CRON_SECRET` is not set in `.env.production`. Every 6 hours, Vercel hits `/api/cron/sentinel`, the route reads `process.env.CRON_SECRET` → falsy → returns HTTP 500 with `"CRON_SECRET not configured"`. The sentinel has **never successfully executed** in production.

Additionally, `FAILOVER_WEBHOOK_URL` is not set, so even if the cron worked, the failover notification mechanism is broken.

---

### 1.5 Vercel Observability

| Aspect | Current State | Status |
|--------|--------------|--------|
| **Function Error Alerts** | Not configured — no email/Slack notifications for function crashes | **MISSING** |
| **Build Failure Visibility** | Visible only in Vercel Dashboard (manual check) | **REACTIVE** |
| **Log Drains** | Not configured — no log export to external service | **MISSING** |
| **Runtime Logs** | Available in Vercel Dashboard per-deployment, but ephemeral | **MANUAL** |
| **Web Analytics** | No Vercel Analytics or Web Vitals monitoring configured | **MISSING** |
| **Cron Job Monitoring** | Vercel shows cron execution status in dashboard, but no alert on failure | **REACTIVE** |

**Current Cron Jobs** (from `vercel.json:2-11`):
| Path | Schedule | Purpose | CRON_SECRET Set? | Likely Working? |
|------|----------|---------|------------------|-----------------|
| `/api/cron/billing` | Daily at 02:00 UTC | Tenant billing/suspension | No | **No** (HTTP 500) |
| `/api/cron/sentinel` | Every 6 hours | System health + self-healing | No | **No** (HTTP 500) |

**Additional Cron Routes** (exist in codebase but NOT in vercel.json):
| Path | File | Purpose |
|------|------|---------|
| `/api/cron/zatca` | `app/api/cron/zatca/route.ts` | ZATCA queue processing |
| `/api/cron/installments` | `app/api/cron/installments/route.ts` | Installment processing |

These have `CRON_SECRET` auth implemented but are not scheduled — they also need to be added to `vercel.json`.

---

### 1.6 Database Monitoring

| Aspect | Current State | Status |
|--------|--------------|--------|
| **Slow Query Logging** | No `log` configuration in Prisma client or Neon settings | **MISSING** |
| **Connection Pool Metrics** | Pooling via Neon (`-pooler` endpoint), but no exposed metrics on pool usage, waiters, timeouts | **MISSING** |
| **Connection Failure Alerts** | Sentinel cron attempts to detect this but cron itself is broken (see 1.4) | **BROKEN** |
| **Prisma Client Logging** | No `log: ['query', 'info', 'warn', 'error']` configuration in Prisma client instantiation | **MISSING** |
| **Neon Dashboard** | Provides query stats, CPU, RAM, connections — but requires manual dashboard login | **MANUAL** |

---

## 2. Action Items

### 2.1 Sentry — Restore Error Tracking

| # | Action | Priority | Effort | Dependencies |
|---|--------|----------|--------|-------------|
| **S1** | Create a Sentry project at `https://sentry.io` (org + Next.js project) and obtain DSN | **CRITICAL** | 10 min | Sentry account |
| **S2** | Set `SENTRY_DSN` in Vercel environment variables (Vercel Dashboard → Project → Settings → Environment Variables → Add) | **CRITICAL** | 2 min | S1 |
| **S3** | Set `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` in Vercel env for source map uploads during build | **HIGH** | 2 min | S1 |
| **S4** | Redeploy production to pick up new env vars (`vercel --prod` or trigger via dashboard) | **CRITICAL** | 5 min | S2, S3 |
| **S5** | After deploy, trigger a test error to verify Sentry receives it: `curl -X POST https://orca.az-ez.pro/api/v1/test-sentry` (create a test route) | **CRITICAL** | 15 min | S4 |
| **S6** | Add manual `Sentry.captureException()` in critical catch blocks that currently only `console.error` | **HIGH** | 2 hours | S5 |
| **S7** | Configure Sentry alert rules: notify on `# errors > 0 in 5 min`, `# new issues in 1 hour` | **MEDIUM** | 15 min | S5 |
| **S8** | Add Sentry release tracking: set `Sentry.init({ release: process.env.VERCEL_GIT_COMMIT_SHA })` in `sentry.server.config.ts` | **LOW** | 5 min | S5 |

**Critical catch blocks to instrument with Sentry** (S6 — based on codebase review):
- `app/actions/errorAgent.ts` — all 6 try/catch blocks (lines 38-110): these swallow errors into `anomalies[]` but never report to Sentry
- `app/api/cron/sentinel/route.ts` — DB health check catch (line 50), self-healing catch (line 75), failover catch (line 96)
- `app/api/cron/billing/route.ts` — billing operations
- `app/api/cron/zatca/route.ts` — ZATCA queue processing
- `app/api/cron/installments/route.ts` — installment processing
- `app/api/v1/health/route.ts` — DB/system checks (lines 15, 22, 32): currently fail silently into status object
- Any route handler with `try { await prisma... } catch (e) { return error }` — use `captureApiError()` from `lib/sentry-utils.ts`

**Recommended `sentry.server.config.ts` after fix**:
```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.2,
  debug: false,  // disable debug in production
  environment: process.env.NODE_ENV || "development",
  release: process.env.VERCEL_GIT_COMMIT_SHA || "unknown",
});
```

Note: Remove `|| ""` fallback — if DSN is missing, Sentry should loudly fail (throw) rather than silently initialize with empty DSN.

---

### 2.2 Health Endpoint — Enable External Monitoring

| # | Action | Priority | Effort | Dependencies |
|---|--------|----------|--------|-------------|
| **H1** | Create UptimeRobot account (free tier: 50 monitors, 5-min interval) and add `https://orca.az-ez.pro/api/v1/health` as an HTTP monitor | **HIGH** | 10 min | None |
| **H2** | Set alert condition: alert if HTTP status != 200 OR response time > 2000ms | **HIGH** | 2 min | H1 |
| **H3** | Configure alert contacts: admin email + optionally WhatsApp/Slack | **MEDIUM** | 5 min | H1 |
| **H4** | Alternative: Use Checkly (checklyhq.com) for more sophisticated API checks with assertion on `response.status == 200 && response.body.status == "online"` | **MEDIUM** | 15 min | None |
| **H5** | Add response time tracking to the health endpoint's system check — currently it counts rows but doesn't measure the query latency for those counts (route.ts:27-31) | **LOW** | 10 min | None |
| **H6** | Consider adding a lightweight auth requirement (e.g., `X-Health-Token` header) to prevent health endpoint abuse — currently no auth means anyone can poll it endlessly | **LOW** | 15 min | None |

---

### 2.3 Error Agent — Automate Execution

| # | Action | Priority | Effort | Dependencies |
|---|--------|----------|--------|-------------|
| **E1** | Set `CRON_SECRET` in Vercel environment variables (generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) | **CRITICAL** | 2 min | None |
| **E2** | Add `saherTrackSystemErrorsAction` as a cron endpoint: create `app/api/cron/saher/route.ts` that calls the error agent and returns the diagnostics report. Or add the error agent logic to the existing sentinel cron (which already does similar checks) | **HIGH** | 30 min | E1 |
| **E3** | Add the new cron path to `vercel.json`: `{ "path": "/api/cron/saher", "schedule": "0 */6 * * *" }` | **HIGH** | 2 min | E2 |
| **E4** | Enable existing sentinel and billing crons by setting `CRON_SECRET` in Vercel env (same as E1 — one secret serves all cron routes) | **CRITICAL** | 1 min | E1 |
| **E5** | Set `FAILOVER_WEBHOOK_URL` to a Slack/Discord/Telegram webhook for critical failover alerts | **MEDIUM** | 5 min | None |
| **E6** | Add `zatca` and `installments` cron routes to `vercel.json` if they should run on schedule | **MEDIUM** | 2 min | E1 |

**Note**: The `runAllSystemAgentsAction()` in `errorAgent.ts:179` is manually triggered via superadmin UI. The error agent (`saherTrackSystemErrorsAction`) and the sentinel cron (`/api/cron/sentinel`) have significant overlap in their checks (both do DB health, tenant status, anomaly detection). Consider consolidating:
- Use the sentinel cron (`/api/cron/sentinel`) as the primary automated health monitor (it already has self-healing and failover)
- Keep the manual `runAllSystemAgentsAction()` as an on-demand superadmin diagnostic tool

---

### 2.4 Database Monitoring

| # | Action | Priority | Effort | Dependencies |
|---|--------|----------|--------|-------------|
| **D1** | Add Prisma client query logging for slow queries. In `lib/prisma.ts`, add: | **HIGH** | 15 min | None |

```typescript
const prismaClient = new PrismaClient({
  log: [
    { level: 'warn', emit: 'stdout' },
    { level: 'error', emit: 'stdout' },
    { level: 'query', emit: 'event' },  // event-based for filtering
  ],
});

// Log slow queries (>500ms)
prismaClient.$on('query', (e: any) => {
  if (e.duration > 500) {
    console.warn(`[SLOW_QUERY] ${e.duration}ms — ${e.query} — ${e.params}`);
    // Optionally send to Sentry:
    // Sentry.captureMessage(`Slow query: ${e.duration}ms`, { extra: { query: e.query, params: e.params } });
  }
});
```

| **D2** | Add Neon connection pool event listeners in `lib/prisma.ts` or `instrumentation.ts` to detect pool exhaustion | **MEDIUM** | 20 min | None |
| **D3** | Log `PrismaClient` connect/disconnect events to track connection lifecycle | **LOW** | 5 min | None |
| **D4** | Enable Neon's built-in query performance dashboard (already available in Neon Console — no setup required; just needs manual review on a schedule) | **LOW** | 0 min | None |
| **D5** | Set up a PostgreSQL `statement_timeout` per-session to prevent runaway queries: `SET statement_timeout = '30s'` on connection (or configure in Prisma connection string: `?options=-c%20statement_timeout%3D30000`) | **MEDIUM** | 10 min | None |

---

### 2.5 Vercel Observability

| # | Action | Priority | Effort | Dependencies |
|---|--------|----------|--------|-------------|
| **V1** | Configure Vercel Log Drains to export logs to an external service (Datadog, Logtail, Better Stack, or even a custom endpoint) | **MEDIUM** | 15 min | External log service account |
| **V2** | Enable Vercel Deployment Protection → "Email on failure" for production deployments | **HIGH** | 2 min | None |
| **V3** | Add status badge to internal dashboard showing latest deployment status | **LOW** | 30 min | None |
| **V4** | Enable Vercel Web Analytics (if available on plan) or inject a lightweight analytics script for RUM (Real User Monitoring) | **LOW** | 15 min | None |

---

## 3. Priority Matrix

```
                    HIGH IMPACT                LOW IMPACT
                 ┌─────────────────┬─────────────────┐
  LOW EFFORT     │ S2: Set DSN     │ V2: Email on    │
  (< 5 min)      │ E1: CRON_SECRET │ deploy failure  │
                 │ E4: Fix crons   │                 │
                 ├─────────────────┼─────────────────┤
  MED EFFORT     │ S1: Sentry proj │ H1: UptimeRobot │
  (10-30 min)    │ S5: Test Sentry │ H2: Alert rules │
                 │ S4: Redeploy    │ V1: Log drains  │
                 │ E2: Cron route  │ E5: Webhook URL │
                 │ D1: Slow query  │                 │
                 ├─────────────────┼─────────────────┤
  HIGH EFFORT    │ S6: Catch blocks│ S8: Release     │
  (1+ hours)     │                 │ tracking        │
                 │                 │ H6: Auth health │
                 │                 │ V3: Status UI   │
                 └─────────────────┴─────────────────┘
```

---

## 4. Immediate Action Plan (First 24 Hours)

| Step | Action | Time | Owner |
|------|--------|------|-------|
| 1 | Create Sentry project, get DSN | 10 min | Dev |
| 2 | Set `SENTRY_DSN` in Vercel env | 2 min | Dev |
| 3 | Set `CRON_SECRET` in Vercel env | 2 min | Dev |
| 4 | Set `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` in Vercel env | 2 min | Dev |
| 5 | Redeploy production | 5 min | Dev |
| 6 | Trigger test error → verify in Sentry | 15 min | Dev |
| 7 | Verify sentinel cron executes: check Vercel Cron tab after next 6-hour window | 5 min (wait up to 6h) | Dev |
| 8 | Set up UptimeRobot monitor on `/api/v1/health` | 10 min | Dev |
| **Total effort** | | **~1 hour active + 6h wait for cron verification** | |

---

## 5. Current Monitoring Coverage Summary

```
┌────────────────────────────┬────────────┬──────────────┐
│ Monitoring Layer           │ Implemented │ Functional    │
├────────────────────────────┼────────────┼──────────────┤
│ Sentry Error Tracking      │     ✅     │     ❌        │
│ Health Endpoint            │     ✅     │     ✅        │
│ Health Endpoint Monitoring │     ❌     │     ❌        │
│ Error Agent (Saher)        │     ✅     │     ❌        │
│ Sentinel Cron              │     ✅     │     ❌        │
│ Billing Cron               │     ✅     │     ❌        │
│ ZATCA Cron                 │     ✅     │     ❌        │
│ Installments Cron          │     ✅     │     ❌        │
│ Vercel Function Alerts     │     ❌     │     ❌        │
│ Vercel Log Drains          │     ❌     │     ❌        │
│ Slow Query Logging         │     ❌     │     ❌        │
│ Connection Pool Metrics    │     ❌     │     ❌        │
│ Uptime Monitoring          │     ❌     │     ❌        │
│ RUM / Web Vitals           │     ❌     │     ❌        │
├────────────────────────────┼────────────┼──────────────┤
│ TOTALS                     │   7 / 14   │   1 / 14     │
└────────────────────────────┴────────────┴──────────────┘
```

**Bottom line**: ORCA has 7 of 14 monitoring components implemented in code, but only 1 is functional in production (the health endpoint — and it's not even monitored by anyone). Four cron jobs are implemented but all fail because `CRON_SECRET` is not set. Sentry is fully wired but sends zero errors because `SENTRY_DSN` is not set. The monitoring infrastructure is architecturally sound but operationally dead due to two missing environment variables.

---

## 6. Monthly Review Cadence

| Review | What to Check | When |
|--------|--------------|------|
| Sentry Issues | New/unresolved errors, error rate trends | 1st of month |
| Cron Execution | Vercel Cron tab — all jobs succeeding? | 1st of month |
| Health Endpoint | UptimeRobot report — any downtime? | 1st of month |
| Slow Queries | Search logs for `[SLOW_QUERY]` — any new patterns? | 1st of month |
| Alert Rules | Are alert thresholds appropriate? Any false positives? | 1st of month |

---

## Appendix A: Required Environment Variables (Monitoring)

These must be set in Vercel Environment Variables (Vercel Dashboard → Project → Settings → Environment Variables):

| Variable | Purpose | Currently Set? |
|----------|---------|----------------|
| `SENTRY_DSN` | Sentry project DSN for error capture | **NO** |
| `SENTRY_ORG` | Sentry organization slug | **NO** |
| `SENTRY_PROJECT` | Sentry project slug | **NO** |
| `SENTRY_AUTH_TOKEN` | Sentry auth token for source map uploads | **NO** |
| `CRON_SECRET` | Bearer token for all 4 cron route auth | **NO** |
| `FAILOVER_WEBHOOK_URL` | Webhook endpoint for critical failover alerts | **NO** |

---

## Appendix B: Key File Reference

| File | Purpose |
|------|---------|
| `sentry.server.config.ts:4` | Sentry init with empty DSN fallback — root cause of dead error tracking |
| `sentry.edge.config.ts` | Sentry Edge runtime config |
| `sentry.client.config.ts` | Sentry Browser runtime config |
| `instrumentation.ts:6` | Server-side Sentry registration on Node.js runtime |
| `next.config.mjs:78-86` | `withSentryConfig` for source map uploads |
| `lib/sentry-utils.ts` | 4 capture helpers — all non-functional due to missing DSN |
| `app/api/v1/health/route.ts` | Health endpoint — works but unmonitored |
| `app/actions/errorAgent.ts` | Error agent — works but only on manual trigger |
| `app/api/cron/sentinel/route.ts` | Sentinel cron — scheduled but blocked by missing CRON_SECRET |
| `app/api/cron/billing/route.ts` | Billing cron — scheduled but blocked by missing CRON_SECRET |
| `app/api/cron/zatca/route.ts` | ZATCA cron — NOT in vercel.json |
| `app/api/cron/installments/route.ts` | Installments cron — NOT in vercel.json |
| `vercel.json:2-11` | Cron schedule definitions (only 2 of 4 routes listed) |
| `.env.production` | Missing: `SENTRY_DSN`, `CRON_SECRET`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`, `FAILOVER_WEBHOOK_URL` |
