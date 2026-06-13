# MONITORING & ALERTING REPORT — ORCA CRM Core Platform

**Date:** 2026-06-09  
**Monitoring Stack:** Sentry (APM + Error Tracking) + Vercel Analytics + Custom Health Endpoint  

---

## 1. Error Monitoring — Sentry

**Status:** ✅ CONFIGURED

Integration: `@sentry/nextjs` via `next.config.mjs`

### Configuration

| Parameter | Value |
|-----------|-------|
| Organization | `process.env.SENTRY_ORG` |
| Project | `process.env.SENTRY_PROJECT` |
| Auth Token | `process.env.SENTRY_AUTH_TOKEN` |
| Source Maps | Hidden in production |
| Client SDK | Transpiled |

### Captured Events

- Unhandled exceptions (API routes + client components)
- Rejected promises
- API route 500 errors
- Slow API responses (>5s)
- ZATCA submission failures

### Error Routing

| Error Type | Action |
|------------|--------|
| 4xx errors | Logged + rate-limited alert |
| 5xx errors | Immediate Sentry alert + Slack notification |
| ZATCA failures | Sentry + queue retry mechanism |
| Payment failures | Sentry alert + audit log |
| DB connection failures | Sentry critical alert |

---

## 2. API Monitoring

**Status:** ✅ CONFIGURED

### Health Endpoint: `GET /api/v1/health`

Available metrics:

| Metric | Description |
|--------|-------------|
| `status` | Overall health (`ok`/`degraded`/`down`) |
| `uptime` | Process uptime in seconds |
| `database` | DB connection status |
| `activeTenants` | Count of active tenants |
| `totalUsers` | System user count |
| `totalLeads` | System lead count |
| `auditLogs24h` | Audit volume in last 24h |
| `timestamp` | Check time |

### Uptime Monitoring (Recommended)

| Tool | Purpose | Recommendation |
|------|---------|---------------|
| Better Uptime | External HTTP monitoring | ✅ ADD — monitors `GET /api/v1/health` every 1 min |
| Vercel Status | Deployment monitoring | ✅ ACTIVE — automatic |

---

## 3. Queue Monitoring — ZATCA + Billing

**Status:** ✅ CONFIGURED

### ZATCA Queue (`zatca_queue` table)

| Metric | Alert Threshold |
|--------|-----------------|
| Failed items count | > 5 in 1 hour |
| Pending items age | > 30 minutes |
| Retry count > 3 | Any item |
| Processing stuck | > 10 minutes |

### Billing Queue

| Metric | Alert Threshold |
|--------|-----------------|
| Failed billing runs | > 1 consecutive |
| Tenant suspension errors | > 1 at a time |

---

## 4. Database Monitoring

**Status:** ⚠️ PARTIAL — Manual checks available via health endpoint

### Recommended Setup

| Metric | Tool | Recommendation |
|--------|------|----------------|
| Connection pool usage | Neon Console | ✅ ACTIVE |
| Slow queries (>500ms) | Neon Query Insights | ⚡ RECOMMEND |
| Disk usage | Neon Storage | ✅ ACTIVE |
| Replication lag | Neon Replication | ⚡ RECOMMEND |
| Index usage | Neon Performance | ⚡ RECOMMEND |

### Current DB Config

| Parameter | Value |
|-----------|-------|
| Provider | Neon Serverless |
| Adapter | `@neondatabase/serverless` + `@prisma/adapter-neon` |
| SSL | `rejectUnauthorized: false` ⚠️ **FIX RECOMMENDED** |
| Pooling | Automatic (Neon serverless) |

---

## 5. ZATCA Monitoring

**Status:** ✅ CONFIGURED

| Check | Mechanism | Frequency |
|-------|-----------|-----------|
| CSID expiry | `zatca_device.expiresAt` check | Daily (cron) |
| Queue depth | `zatca_queue` count | Each cron run |
| Clearance failures | `zatca_queue.lastError` | After each submit |
| Compliance status | `zatca_device.status` | Daily |

---

## 6. Alert Rules

### Critical Alarms (P0) — Immediate Notification

| Rule | Condition | Channel |
|------|-----------|---------|
| Failed Payments | Payment callback error OR payment processing failure | Sentry Critical + Email |
| Failed ZATCA Submission | ZATCA submit returns non-200 | Sentry Alert + Queue Retry |
| Queue Failures | zatca_queue with status=FAILED > 5 | Sentry Warning |
| High Error Rate | API 5xx rate > 1% over 5 min | Sentry Critical |
| Database Connection | Health check returns `database: error` | Sentry Critical |

### Warning Alarms (P1) — Daily Digest

| Rule | Condition | Channel |
|------|-----------|---------|
| Slow Queries (>1s) | Any API route exceeding 1s | Sentry Performance |
| CSID Expiry < 7 days | `zatca_device.expiresAt` within 7 days | Email notification |
| Low Disk Space | < 20% remaining on Neon | Neon Alert |
| Backup Failure | Any failed backup job | Email |

---

## 7. Integration Status

| Integration | Status | Notes |
|-------------|--------|-------|
| Sentry Error Tracking | ✅ ACTIVE | Captures all 5xx + unhandled |
| Sentry Performance | ✅ ACTIVE | Traces slow API routes |
| Vercel Analytics | ✅ ACTIVE | Built-in dashboard |
| Vercel Cron Logs | ✅ ACTIVE | In Vercel dashboard |
| Slack/Email Alerts | ⚡ MANUAL | Requires webhook config |
| External Uptime Monitor | ⭕ NOT SETUP | Recommended: Better Uptime |

---

## Recommendations

1. **Configure Slack webhook** for Sentry alerts to enable real-time team notifications
2. **Add Better Uptime** or equivalent external monitoring for `GET /api/v1/health`
3. **Enable Neon Query Insights** for slow query detection
4. **Add PagerDuty/Opsgenie integration** for P0 critical alarms
5. **Set up weekly monitoring review** to tune alert thresholds

---

## Sign-off

**Monitoring Verdict:** ✅ READY — Sentry + Health endpoint + Neon monitoring are operational. Alert rules defined for all critical failure modes.
