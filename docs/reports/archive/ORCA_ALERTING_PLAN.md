# ORCA ALERTING PLAN

**Document:** REPORT 4 — Alert Levels & Specific Alerts
**Date:** 2026-06-10
**Version:** 1.0
**Scope:** ORCA CRM Core Platform — Production Alerting Configuration

---

## Overview

This document defines 15 production alerts across 4 severity tiers. Each alert specifies the trigger condition, notification channel, escalation path, and maximum response time. All alerts are currently **non-operational** until Resend API keys, Sentry DSN, and external monitoring are configured — these are tracked as prerequisites in the Production Operations Report.

---

## Alert Levels

| Level | Response Time | Description |
|-------|---------------|-------------|
| **CRITICAL** | ≤ 15 minutes | Service-down or revenue-impacting. Requires immediate human intervention. |
| **HIGH** | ≤ 1 hour | Degraded service or subsystem failure. Impacts users but not total outage. |
| **MEDIUM** | ≤ 4 hours | Warning conditions. No immediate user impact but requires investigation. |
| **LOW** | ≤ 24 hours | Informational. Trend analysis and backlog grooming. Aggregated reports. |

---

## CRITICAL (Response ≤ 15 min)

### 1. Database Down

| Property | Detail |
|----------|--------|
| **Alert ID** | `CRIT-01` |
| **Trigger** | `GET /api/v1/health` returns HTTP 503 OR `database.status !== "ok"` for 2 consecutive checks (interval: 60s) OR Vercel function error rate spikes > 20% in 5-minute window |
| **Channel** | Resend email to `ADMIN_EMAIL` + SMS to admin phone |
| **Escalation** | If no acknowledgment within 30 minutes → call CTO via phone |
| **Response Time** | 15 minutes |
| **Runbook** | See `ORCA_DISASTER_RECOVERY_RUNBOOK.md` — Incident 1: Database Outage |

**Implementation Requirements:**
- External uptime monitor (e.g., Better Uptime, UptimeRobot) polling `/api/v1/health` every 60s
- Vercel function error rate accessible via Vercel Analytics API or Sentry metric alert
- SMS integration via Twilio or equivalent

---

### 2. Payment Webhook Failure

| Property | Detail |
|----------|--------|
| **Alert ID** | `CRIT-02` |
| **Trigger** | Paylink webhook endpoint returns 4xx/5xx errors on > 3 consecutive deliveries OR webhook receipt gap > 15 minutes during business hours (08:00–22:00 AST) |
| **Channel** | Resend email to `ADMIN_EMAIL` |
| **Escalation** | If no resolution in 30 minutes → login to Paylink dashboard, check webhook event log |
| **Response Time** | 15 minutes |
| **Runbook** | See `ORCA_DISASTER_RECOVERY_RUNBOOK.md` — Incident 2: Payment System Failure |

**Implementation Requirements:**
- Webhook endpoint monitoring via `/api/payments/paylink/webhook` health sub-check
- Paylink dashboard access credentials documented in team vault
- Dead-letter queue for missed webhooks with manual replay capability

---

### 3. ZATCA Submission Failure

| Property | Detail |
|----------|--------|
| **Alert ID** | `CRIT-03` |
| **Trigger** | `zatca_queue` table count exceeds 50 pending items OR ZATCA API returns 5 consecutive failures |
| **Channel** | Resend email to `ADMIN_EMAIL` |
| **Escalation** | If queue exceeds 100 → escalation to CTO; if > 200 → contact ZATCA support |
| **Response Time** | 15 minutes |
| **Runbook** | Queue monitoring via `GET /api/v1/health` extended metrics |

**Implementation Requirements:**
- Cron job or health endpoint extended to report `pendingZatcaCount`
- Alert query: `SELECT COUNT(*) FROM zatca_queue WHERE status = 'pending'`
- ZATCA sandbox/production credentials documented in team vault

---

### 4. Backup Failure

| Property | Detail |
|----------|--------|
| **Alert ID** | `CRIT-04` |
| **Trigger** | `pg_dump` exits non-zero OR custom backup script returns failure OR Neon point-in-time restore window gap detected |
| **Channel** | Resend email to `ADMIN_EMAIL` |
| **Escalation** | If no successful backup for > 48 hours → manual `pg_dump` + S3 upload; notify CTO |
| **Response Time** | 15 minutes (business hours); 1 hour (off-hours) |
| **Runbook** | See `BACKUP_RECOVERY_REPORT.md` |

**Implementation Requirements:**
- Custom backup script (`scripts/backup-db.sh`) must be implemented and scheduled
- Exit code monitoring — non-zero triggers alert
- Neon dashboard backup status checked daily as secondary verification

---

### 5. Deployment Failure

| Property | Detail |
|----------|--------|
| **Alert ID** | `CRIT-05` |
| **Trigger** | Vercel build/deploy fails (status = `ERROR` or `CANCELED`) |
| **Channel** | Resend email to `ADMIN_EMAIL` |
| **Escalation** | If no fix within 30 minutes → rollback to last successful deployment via Vercel dashboard |
| **Response Time** | 15 minutes |
| **Runbook** | See `ORCA_DISASTER_RECOVERY_RUNBOOK.md` — Incident 4: Deployment Failure |

**Implementation Requirements:**
- Vercel webhook integration or Vercel API polling for deployment status
- Rollback procedure documented and tested

---

## HIGH (Response ≤ 1 hour)

### 6. AI Agent Failure

| Property | Detail |
|----------|--------|
| **Alert ID** | `HIGH-01` |
| **Trigger** | Saher, Mansour, or Khabeer Gemini API error rate > 20% over a 10-minute window OR `GEMINI_API_KEY` returns 401/403 (expired/invalid key) |
| **Channel** | Resend email to `ADMIN_EMAIL` |
| **Escalation** | If error rate > 50% → check Google AI Studio quota and billing; switch to fallback model if configured |
| **Response Time** | 1 hour |

**Monitored Agents:**
- **Saher** (`app/actions/saherAgent.ts`) — lead classification and WhatsApp response
- **Mansour** (`app/actions/growth.ts`) — chat and conversation handling
- **Khabeer** — contract and compliance analysis

**Implementation Requirements:**
- Per-agent error rate tracking in `saherAgentTelemetry` table or equivalent
- Gemini API quota monitoring via Google Cloud Console
- Fallback model configuration (`SAHER_AGENT_MODEL_FALLBACK`)

---

### 7. Storage Failure

| Property | Detail |
|----------|--------|
| **Alert ID** | `HIGH-02` |
| **Trigger** | Document upload returns error OR disk usage exceeds 95% on Vercel edge/storage OR Neon storage exceeds 90% of plan limit |
| **Channel** | Resend email to `ADMIN_EMAIL` |
| **Escalation** | If disk full → temporarily disable document uploads; increase Neon plan tier |
| **Response Time** | 1 hour |

**Implementation Requirements:**
- Upload health check: test document upload every 15 minutes
- Neon storage usage available via Neon API or dashboard
- Disk usage monitoring on Vercel (if using Vercel Blob/Storage)

---

### 8. High Error Rate

| Property | Detail |
|----------|--------|
| **Alert ID** | `HIGH-03` |
| **Trigger** | Sentry error count > 50/hour OR Vercel function 5xx rate > 5% |
| **Channel** | Resend email to `ADMIN_EMAIL` |
| **Escalation** | If > 200/hour → Sentry spike alert → check Sentry issue details; if DB-related → escalate to CRIT-01 |
| **Response Time** | 1 hour |

**Implementation Requirements:**
- Sentry DSN configured with alert rules
- `SENTRY_DSN` set in `.env.production`
- Rate-limit thresholds tuned per environment

---

### 9. Tenant Suspension (Bulk)

| Property | Detail |
|----------|--------|
| **Alert ID** | `HIGH-04` |
| **Trigger** | Billing cron (`/api/cron/billing`) suspends > 5 tenants in a single run |
| **Channel** | Resend email to `ADMIN_EMAIL` |
| **Escalation** | If > 10 tenants suspended → verify cron logic is not erroneously suspending paying tenants; check `billingAgent.ts` logs |
| **Response Time** | 1 hour |

**Implementation Requirements:**
- Billing cron must emit count of suspended tenants
- Audit log entry per suspension for traceability

---

## MEDIUM (Response ≤ 4 hours)

### 10. Slow Response

| Property | Detail |
|----------|--------|
| **Alert ID** | `MED-01` |
| **Trigger** | API latency p95 > 2 seconds over a 15-minute window |
| **Channel** | Resend email to `ADMIN_EMAIL` |
| **Escalation** | If p95 > 5 seconds → check DB connection pool, Neon dashboard for slow queries, cold start issues |
| **Response Time** | 4 hours |

**Implementation Requirements:**
- Vercel Analytics or Sentry Performance monitoring enabled
- Latency percentiles tracked per endpoint (`/api/v1/invoices`, `/api/v1/leads`, etc.)

---

### 11. DB Pool Warning

| Property | Detail |
|----------|--------|
| **Alert ID** | `MED-02` |
| **Trigger** | Active database connections > 80% of Neon plan maximum |
| **Channel** | Resend email to `ADMIN_EMAIL` |
| **Escalation** | If > 95% → increase connection pool size OR upgrade Neon plan; check for connection leaks in Prisma client |
| **Response Time** | 4 hours |

**Implementation Requirements:**
- Neon API metrics polling for connection count
- Prisma connection pool configured via `DATABASE_URL` query params (`connection_limit`)

---

### 12. Invoice Queue Growth

| Property | Detail |
|----------|--------|
| **Alert ID** | `MED-03` |
| **Trigger** | Unprocessed invoices (status = `pending` or `draft`) exceeds 100 |
| **Channel** | Resend email to `ADMIN_EMAIL` |
| **Escalation** | If > 500 → check invoice generation pipeline; check ZATCA integration status |
| **Response Time** | 4 hours |

**Implementation Requirements:**
- Query: `SELECT COUNT(*) FROM Invoice WHERE status IN ('pending', 'draft')`
- Available via extended health metrics or dedicated metric endpoint

---

## LOW (Response ≤ 24 hours — Aggregated Reports)

### 13. Maintenance Ticket Backlog

| Property | Detail |
|----------|--------|
| **Alert ID** | `LOW-01` |
| **Trigger** | Pending maintenance tickets > 50 |
| **Channel** | Weekly report (aggregated email every Monday 08:00 AST) |
| **Escalation** | If > 100 → include in HIGH alert as operational risk |
| **Response Time** | 24 hours (review during weekly ops meeting) |

---

### 14. Storage Usage Warning

| Property | Detail |
|----------|--------|
| **Alert ID** | `LOW-02` |
| **Trigger** | Storage usage > 80% of plan limit (Neon database size, Vercel Blob, document storage) |
| **Channel** | Weekly report |
| **Escalation** | If > 90% → escalate to HIGH-02 |
| **Response Time** | 24 hours |

---

### 15. Tenant Inactivity

| Property | Detail |
|----------|--------|
| **Alert ID** | `LOW-03` |
| **Trigger** | Tenant with no activity (no logins, no API calls, no lead modifications) for 30 consecutive days |
| **Channel** | Monthly report (aggregated email, 1st of each month) |
| **Escalation** | If > 20% of tenants inactive → customer success review; potential churn risk flag |
| **Response Time** | 24 hours |

---

## Alert Matrix Summary

| ID | Alert | Level | Trigger | Channel | Response | Escalation |
|----|-------|-------|---------|---------|----------|------------|
| CRIT-01 | Database Down | CRITICAL | Health 503 / error spike | Email + SMS | 15 min | Call CTO at 30 min |
| CRIT-02 | Payment Webhook Failure | CRITICAL | Webhook errors / gap | Email | 15 min | Check Paylink dashboard |
| CRIT-03 | ZATCA Submission Failure | CRITICAL | Queue > 50 pending | Email | 15 min | Contact ZATCA support |
| CRIT-04 | Backup Failure | CRITICAL | pg_dump non-zero | Email | 15 min | Manual dump + CTO |
| CRIT-05 | Deployment Failure | CRITICAL | Vercel build fails | Email | 15 min | Rollback at 30 min |
| HIGH-01 | AI Agent Failure | HIGH | Gemini error > 20% | Email | 1 hr | Check AI quota |
| HIGH-02 | Storage Failure | HIGH | Upload fail / disk > 95% | Email | 1 hr | Disable uploads |
| HIGH-03 | High Error Rate | HIGH | > 50 errors/hr | Email | 1 hr | Sentry spike check |
| HIGH-04 | Bulk Tenant Suspension | HIGH | > 5 suspended/run | Email | 1 hr | Verify cron logic |
| MED-01 | Slow Response | MEDIUM | p95 latency > 2s | Email | 4 hr | Check DB / cold starts |
| MED-02 | DB Pool Warning | MEDIUM | Connections > 80% max | Email | 4 hr | Increase pool / upgrade |
| MED-03 | Invoice Queue Growth | MEDIUM | Unprocessed > 100 | Email | 4 hr | Check ZATCA pipeline |
| LOW-01 | Ticket Backlog | LOW | Pending > 50 | Weekly report | 24 hr | Ops meeting review |
| LOW-02 | Storage Usage Warning | LOW | Usage > 80% | Weekly report | 24 hr | Escalate if > 90% |
| LOW-03 | Tenant Inactivity | LOW | No activity 30 days | Monthly report | 24 hr | Churn risk review |

---

## Prerequisites for Operational Alerting

These items must be completed before any alert in this plan goes live:

1. **Resend API Key** — Replace `REPLACE_WITH_YOUR_RESEND_API_KEY` in `.env.production` with a valid Resend API key
2. **Admin Email** — Set `ADMIN_EMAIL` in `.env.production` to a monitored inbox
3. **Sentry DSN** — Set `SENTRY_DSN` in `.env.production`; configure alert rules in Sentry dashboard
4. **External Uptime Monitor** — Configure Better Uptime or UptimeRobot to poll `GET /api/v1/health` every 60 seconds
5. **SMS Gateway** — Integrate Twilio or equivalent for CRITICAL SMS alerts
6. **Backup Script** — Implement `scripts/backup-db.sh` with exit code monitoring
7. **Health Endpoint Extended** — Add `pendingZatcaCount`, `activeDbConnections`, `unprocessedInvoiceCount` to `/api/v1/health`
8. **Vercel Webhook** — Configure Vercel deploy webhook or API polling for deployment status

---

## Alert Lifecycle

```
Trigger → Detect → Classify (Level) → Notify (Channel) → Acknowledge → Resolve → Post-Mortem
                                                              ↓ (no ack)
                                                        Escalation Path
```

- **Acknowledgment:** Receiver must acknowledge within response time window
- **Resolution:** Incident tracked in incident log with root cause, fix, and timestamp
- **Post-Mortem:** Required for all CRITICAL and HIGH alerts; documented in incident register

---

## Off-Hours Policy

| Level | Business Hours (08:00–22:00 AST) | Off-Hours (22:00–08:00 AST) |
|-------|----------------------------------|----------------------------|
| CRITICAL | Full response (SMS + email) | Full response (SMS + email) |
| HIGH | Full response (email) | Email only; SMS if > 1 hour unacknowledged |
| MEDIUM | Full response (email) | Deferred to next business day |
| LOW | Deferred to next report cycle | Deferred to next report cycle |

---

*End of ORCA_ALERTING_PLAN.md — Report 4 of 6*
