# Monitoring & Observability Architecture – ORCA CRM

**Date:** 2026-06-09
**Engineer:** Principal SaaS Architect

---

## Current State

| Component | Status | Details |
|-----------|--------|---------|
| Error Tracking | ✅ Sentry (server + edge + client) | DSN not configured in env |
| Application Monitoring | ⚠️ Partial | Only error tracking, no APM |
| Database Monitoring | ❌ Not configured | No Neon dashboard integration |
| Queue Monitoring | ⚠️ Partial | ZATCA queue status viewable via API |
| ZATCA Monitoring | ⚠️ Basic | Dashboard endpoint exists, no alerting |
| Health Checks | ✅ `/api/v1/health` | DB + API status |
| Uptime Monitoring | ❌ Not configured | No external uptime monitor |
| Alerting | ❌ Not configured | No alerts for any failure mode |

---

## Proposed Architecture

```
┌────────────────────────────────────────────────────────────┐
│                      ORCA CRM PRODUCTION                    │
├────────────────────────────────────────────────────────────┤
│  Monitoring Stack                                           │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │  Sentry  │  │  Neon    │  │ Better   │  │ Health   │  │
│  │ (Errors) │  │ (DB)     │  │ Stack    │  │ Checks   │  │
│  │          │  │          │  │ (Uptime) │  │ (Custom) │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  │
│       │             │             │             │         │
│       ▼             ▼             ▼             ▼         │
│  ┌────────────────────────────────────────────────────┐   │
│  │              Alert Channels                         │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐               │   │
│  │  │ Email   │ │WhatsApp │ │ Sentry  │               │   │
│  │  │(Resend) │ │(Green)  │ │Alerts   │               │   │
│  │  └─────────┘ └─────────┘ └─────────┘               │   │
│  └────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────┘
```

---

## 1. Error Tracking (Sentry)

### Current Configuration

```typescript
// instrumentation.ts
Sentry.init({
  dsn: process.env.SENTRY_DSN || "",
  tracesSampleRate: 0.2,
  environment: process.env.NODE_ENV || "development",
});
```

### Critical Issue: Missing DSN

**`SENTRY_DSN` is not defined in any env file.** Error tracking is non-functional.

### Fix
```bash
# Add to .env.production
SENTRY_DSN=https://xxxxxxxxxxxxx@xxxxx.ingest.sentry.io/xxxxxx
SENTRY_AUTH_TOKEN=your_sentry_auth_token
```

### Custom Sentry Utils (`lib/sentry-utils.ts`)

| Function | Purpose | Tags |
|----------|---------|------|
| `captureApiError(error, { method, path, tenantId })` | API route errors | endpoint, tenant |
| `captureServerActionError(error, { action, tenantId })` | Server action errors | action, tenant |
| `captureCronError(error, { job })` | Cron job failures | job name |
| `captureAiAgentError(error, { agent, action, tenantId })` | AI agent failures | agent, action |

### Sentry Dashboard Components

| Metric | Cost Impact |
|--------|-------------|
| Errors | Free tier (5k events/month) |
| Traces (0.2 sample rate) | Paid plan recommended |
| Replays (0.1 session sample) | Paid plan recommended |

---

## 2. Application Monitoring

### Missing: Performance Monitoring (APM)

Sentry Performance can provide:
- Transaction traces for every API request
- Database query timing
- External API call timing
- Front-end page load performance

### Recommended Configuration

```typescript
// Increase trace sample rate for financial routes
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.2, // 20% of all requests
  profilesSampleRate: 0.1, // 10% with profiling
  environment: process.env.NODE_ENV,
  beforeSendTransaction(event) {
    // Always trace financial transactions
    if (event.request?.url?.includes('/api/v1/accounting') ||
        event.request?.url?.includes('/api/v1/invoices')) {
      event.sampleRate = 1.0;
    }
    return event;
  },
});
```

---

## 3. Database Monitoring

### Neon Dashboard

Neon provides built-in monitoring:
- **Connection pool usage** – Current: `max: 1` (Critical bottleneck)
- **Query performance** – Slow query log
- **Storage usage** – Data size tracking
- **CPU/Memory** – Compute resource usage

### Recommended Queries to Monitor

```sql
-- Slow queries (run time > 1s)
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE mean_exec_time > 1000
ORDER BY mean_exec_time DESC;

-- Connection count
SELECT count(*) FROM pg_stat_activity;

-- Table sizes
SELECT relname, n_live_tup, n_dead_tup
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;
```

### Custom Health Check (`app/api/v1/health/route.ts`)

```typescript
export async function GET() {
  const checks = {
    database: { status: "ok", latency: "2ms" },
    api: { status: "ok" },
    system: { activeTenants: 5, totalUsers: 42 },
  };
  return NextResponse.json({
    status: "online",
    timestamp: new Date().toISOString(),
    checks,
  });
}
```

---

## 4. Queue Monitoring

### ZATCA Queue Status

Available via `GET /api/v1/zatca/queue`:
- Total pending items
- Items by status (PENDING, PROCESSING, COMPLETED, FAILED)
- Retry counts
- Next retry times

### Missing: Real-time Queue Metrics

| Metric | Current | Needed |
|--------|---------|--------|
| Queue depth | ❌ | ✅ Alert when > 50 pending |
| Age of oldest item | ❌ | ✅ Alert when > 24h old |
| Failure rate | ❌ | ✅ Alert when > 10% failures |

---

## 5. ZATCA Monitoring

### Current: Dashboard Only

`GET /api/v1/zatca/dashboard` returns:
- Total invoices
- Status breakdown (DRAFT, REPORTED, CLEARED, FAILED)
- Compliance score
- Device status

### Missing: Proactive Monitoring

| Alert | Severity | Action |
|-------|----------|--------|
| ZATCA submission failure rate > 10% | Critical | Notify admin immediately |
| CSID certificate expires < 30 days | High | Notify to renew |
| Queue backlog > 100 items | High | Investigate API connectivity |
| Device certificate invalid | Critical | Immediate attention |

---

## 6. Alerting Rules

### Critical Alerts (Pager)

| Rule | Condition | Channel | Response Time |
|------|-----------|---------|---------------|
| Payment failure rate > 5% | Last 10 min | WhatsApp + Email | 15 min |
| ZATCA submission failure > 10% | Last 1 hour | WhatsApp + Email | 30 min |
| Database connection pool exhausted | Any occurrence | WhatsApp + Email | Immediate |
| Health check returns "degraded" | 2 consecutive checks | WhatsApp + Email | Immediate |
| Tenant cannot access system | Any occurrence | WhatsApp + Email | Immediate |

### High Alerts (Email)

| Rule | Condition | Channel | Response Time |
|------|-----------|---------|---------------|
| High error rate > 5% | Last 1 hour | Email | 1 hour |
| Slow queries > 2s | Any occurrence | Email | 4 hours |
| Queue backlog > 50 items | Any occurrence | Email | 4 hours |
| API response time > 5s P95 | Last 5 min | Email | 1 hour |
| Failed cron job | Any occurrence | Email | 1 hour |

### Medium Alerts (Dashboard)

| Rule | Condition | Channel | Response Time |
|------|-----------|---------|---------------|
| Low disk space > 80% | Any occurrence | Dashboard | 24 hours |
| Memory usage > 80% | Any occurrence | Dashboard | 24 hours |
| Unusual traffic spike | > 3x normal | Dashboard | 24 hours |

---

## 7. Implementation Checklist

### Phase 1 – Immediate (Day 1)

- [ ] Add `SENTRY_DSN` to `.env.production`
- [ ] Add `SENTRY_AUTH_TOKEN` to `.env.production`
- [ ] Increase Neon DB pool size to 10

### Phase 2 – Basic Monitoring (Week 1)

- [ ] Configure Sentry alerts for critical errors
- [ ] Add WhatsApp alerting via Green API (`app/actions/notifications.ts`)
- [ ] Add email alerting via Resend (already in `lib/email.ts`)
- [ ] Create `lib/alerts.ts` for unified alert dispatch
- [ ] Add ZATCA queue depth monitoring

### Phase 3 – Advanced Monitoring (Week 2)

- [ ] Set up Better Stack (or UptimeRobot) for external uptime monitoring
- [ ] Add Neon dashboard integration
- [ ] Configure Sentry Performance for financial routes
- [ ] Create operational dashboard in `/operations/health`

### Phase 4 – Automated Response (Week 3)

- [ ] Auto-retry failed ZATCA submissions (already in `lib/zatca/queue.ts`)
- [ ] Auto-scale database connections based on load
- [ ] Safe Mode auto-activation on critical failure

---

## 8. Score Assessment

| Component | Current | Target | Status |
|-----------|---------|--------|--------|
| Error Tracking | 4/10 (DSN missing) | 9/10 | ❌ Not functional |
| Application Monitoring | 5/10 | 8/10 | ⚠️ Partial |
| Database Monitoring | 3/10 | 8/10 | ❌ Not configured |
| Queue Monitoring | 5/10 | 8/10 | ⚠️ Basic only |
| ZATCA Monitoring | 4/10 | 8/10 | ❌ No alerting |
| Alerting | 2/10 | 9/10 | ❌ Not configured |
| **Overall** | **4/10** | **8.5/10** | **❌ Requires implementation** |
