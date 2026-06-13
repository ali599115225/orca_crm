# ORCA PHASE 4 — BACKUP, MONITORING & RECOVERY
> **Date:** 2026-06-10  
> **Scope:** Operational readiness — backup, monitoring, alerting, recovery, disaster recovery  
> **Status:** **FAIL** — Critical operational gaps identified. Plans documented. Infrastructure not deployed.

---

## EXECUTIVE SUMMARY

| Dimension | Status | Score | Key Gap |
|-----------|--------|-------|---------|
| Backup | **FAIL** | 1/10 | No custom backup scripts; 100% dependent on Neon snapshots |
| Recovery | **PASS WITH ISSUES** | 5/10 | Neon PITR exists; no restore test ever performed |
| Monitoring | **FAIL** | 0/10 | Sentry DSN missing; 0 of 14 monitoring layers functional |
| Alerting | **FAIL** | 0/10 | Resend/SMS/WhatsApp all mock-mode; zero alerts reach anyone |
| Logging | **FAIL** | 2/10 | 224 console.errors; systemLogger unused in critical paths |
| Error Tracking | **FAIL** | 1/10 | Sentry dead; errorAgent never auto-runs |
| Deployment | **PASS WITH ISSUES** | 5/10 | Vercel rollback exists; no CI/CD, no migration automation |
| **Overall** | **FAIL** | **2/10** | |

---

## TASK 1 — BACKUP AUDIT

Full report: `ORCA_BACKUP_AUDIT.md`

### Data Sources Inventory

| Source | Critical Tables/Files | Current Backup | Custom Backup | Off-Region |
|--------|----------------------|----------------|---------------|------------|
| PostgreSQL | 13 critical tables (Tenant, User, Lead, Contract, Unit, RentalLease, RentalInvoice, PaymentTransaction, JournalEntry, AccountBalance, ZatcaDevice, AuditLog, MaintenanceTicket) | Neon automatic PITR | **NONE** | **NONE** |
| Documents | `scratch/uploads/`, `public/documents/` | **NONE** | **NONE** | **NONE** |
| Env Vars | DATABASE_URL, JWT_SECRET, GEMINI_API_KEY + 53 others | **NONE** | **NONE** | **NONE** |
| Vercel Config | `vercel.json` + domains + env vars | Git repository | Git only | Via Git |
| ZATCA Data | Invoices, CSIDs, queues | In DB (Neon PITR) | **NONE** | **NONE** |

### Required Backup Policy

| Frequency | Method | Retention | Storage |
|-----------|--------|-----------|---------|
| Daily | `pg_dump --clean` to S3 (gzip) | 7 days | `s3://orca-backups/daily/` |
| Weekly | Full dump to S3 | 30 days | `s3://orca-backups/weekly/` |
| Monthly | Archive to S3 (encrypted) | 12 months | `s3://orca-backups/monthly/` |
| On-demand | Before migration or major deploy | — | `s3://orca-backups/manual/` |

### Restore Test Plan

| Metric | Target |
|--------|--------|
| RPO (Recovery Point Objective) | 24 hours |
| RTO (Recovery Time Objective) | 2 hours |
| Test frequency | Quarterly |
| Test method | Restore latest daily dump to `orca_backup_test` DB → Run health check → Verify row counts on 13 critical tables |

### STATUS: FAIL — No backup scripts exist. Plans documented only.

---

## TASK 2 — DATABASE RECOVERY PLAN

Full report: `ORCA_DATABASE_RECOVERY_PLAN.md`

| Scenario | Primary Mechanism | RTO | Status |
|----------|------------------|-----|--------|
| Database Deleted | Neon point-in-time restore | 30 min | Plan documented |
| Corrupted Data | Neon PITR to before corruption | 30 min | Plan documented |
| Failed Migration | Rollback via Neon PITR or manual revert | 1 hour | Plan documented |
| Accidental Deletion | PITR to test DB → extract records → re-insert | 1.5 hours | Plan documented |

### Recovery Verification Checklist (all 4 scenarios):
- [ ] Health endpoint returns 200
- [ ] Row counts match expected on 13 critical tables
- [ ] Test lead creation + invoice generation
- [ ] Test payment recording + journal entry
- [ ] Test ZATCA invoice submission
- [ ] Verify AuditLog entries intact

### STATUS: PASS WITH ISSUES — Plans documented. No restore test ever performed. Recovery relies entirely on Neon PITR.

---

## TASK 3 — MONITORING AUDIT

Full report: `ORCA_MONITORING_AUDIT.md`

### Current State — 14 Monitoring Layers

| # | Layer | Status | Detail |
|---|-------|--------|--------|
| 1 | Sentry Error Tracking | **DEAD** | Code integrated but `SENTRY_DSN` not set |
| 2 | Sentry Sourcemaps | **DEAD** | `SENTRY_ORG/PROJECT/AUTH_TOKEN` not set |
| 3 | Health Endpoint | **UNMONITORED** | Works but no one watches it |
| 4 | Error Agent (manual) | **NEVER RUNS** | No cron trigger |
| 5 | Vercel Function Errors | **NOT CONFIGURED** | Vercel dashboard only |
| 6 | Vercel Log Drain | **NOT CONFIGURED** | Logs lost on cold start |
| 7 | Build Alerts | **NOT CONFIGURED** | Dashboard only |
| 8 | DB Pool Monitoring | **NONE** | No pool events logged |
| 9 | Slow Query Logging | **NONE** | No threshold config |
| 10 | Cron Job Monitoring | **NONE** | CRON_SECRET missing |
| 11 | Uptime Monitoring | **NONE** | No UptimeRobot/Checkly |
| 12 | SSL Certificate | **NONE** | Vercel auto-renews only |
| 13 | API Latency | **NONE** | No percentiles tracked |
| 14 | Error Rate Dashboard | **NONE** | No aggregation |

### STATUS: FAIL — 0 of 14 layers functional. Sentry and CRON_SECRET are critical blockers.

---

## TASK 4 — ALERTING PLAN

Full report: `ORCA_ALERTING_PLAN.md`

### Alert Inventory

| Tier | Count | Response Time | Channel |
|------|-------|---------------|---------|
| CRITICAL | 5 | Immediate (< 15 min) | Email + SMS + Call |
| HIGH | 4 | < 1 hour | Email |
| MEDIUM | 3 | < 4 hours | Email |
| LOW | 3 | < 24 hours | Weekly report |

### Critical Alerts:

| # | Alert | Trigger | Current State |
|---|-------|---------|---------------|
| 1 | Database Down | Health endpoint 503 | **No trigger configured** |
| 2 | Payment Webhook Failure | Paylink errors spike | **No trigger configured** |
| 3 | ZATCA Queue Overload | 50+ pending submissions | **No trigger configured** |
| 4 | Backup Failure | pg_dump non-zero exit | **No backup to monitor** |
| 5 | Deployment Failure | Vercel build fails | **No Vercel integration** |

### STATUS: FAIL — 15 alerts defined but 0 are operational. Resend/SMS/WhatsApp all mock-mode.

---

## TASK 5 — DISASTER RECOVERY RUNBOOK

Full report: `ORCA_DISASTER_RECOVERY_RUNBOOK.md`

| Incident | RTO | Key Action | Status |
|----------|-----|------------|--------|
| Database Outage | 30 min | Neon PITR restore → verify health | Runbook documented |
| Payment System Failure | 1 hour | Paylink dashboard → replay webhooks | Runbook documented |
| Webhook Failure | 30 min | Check queue → retry → clear | Runbook documented |
| Deployment Failure | 15 min | Vercel instant rollback → fix → redeploy | Runbook documented |
| Data Corruption | 2 hours | PITR to test → extract clean → merge | Runbook documented |

All 5 incidents have: Immediate Action, Containment, Recovery, Verification, Communication.

### STATUS: PASS WITH ISSUES — Runbooks documented. Never practiced. No incident response team defined.

---

## TASK 6 — PRODUCTION OPERATIONS REPORT

Full report: `ORCA_PRODUCTION_OPERATIONS_REPORT.md`

### Production Readiness Score: 2/10

| Category | Score | Key Gap |
|----------|-------|---------|
| Backup | 1/10 | No backup scripts |
| Monitoring | 0/10 | Sentry dead, no monitoring |
| Recovery | 5/10 | Neon PITR exists, no test |
| Alerting | 0/10 | All channels mock-mode |
| Logging | 2/10 | Console only, no aggregation |
| Error Tracking | 1/10 | Sentry code exists, DSN missing |
| Deployment | 5/10 | Vercel rollback, no CI/CD |

### Path from 2/10 to 7/10

| # | Action | Impact | Effort |
|---|--------|--------|--------|
| 1 | Set `SENTRY_DSN` in Vercel env vars | +2.0 | 10 min |
| 2 | Set `CRON_SECRET` in Vercel env vars | +1.0 | 5 min |
| 3 | Set valid `RESEND_API_KEY` | +0.5 | 15 min |
| 4 | Create daily pg_dump script + cron | +1.0 | 2 hours |
| 5 | Configure UptimeRobot on health endpoint | +0.5 | 15 min |
| 6 | Schedule ZATCA + Installments crons in vercel.json | +0.5 | 15 min |
| 7 | Write .github/workflows/deploy.yml | +0.3 | 1 hour |
| 8 | Add SENTRY_ORG/PROJECT/AUTH_TOKEN for sourcemaps | +0.2 | 10 min |

---

## FINAL DECISION

```
╔═══════════════════════════════════════════════╗
║   PHASE 4 — OPERATIONAL READINESS: FAIL       ║
║                                                ║
║   Rules violated:                              ║
║   ❌ Backup not tested (no restore performed)   ║
║   ❌ Monitoring not proven (Sentry DSN missing) ║
║   ❌ Recovery plan untested                     ║
║   ❌ Alerts not linked to real events           ║
║                                                ║
║   Overall Score: 2/10                          ║
║   Minimum for production: 7/10                 ║
╚═══════════════════════════════════════════════╝
```

### Why FAIL (not PASS WITH ISSUES):

Per the mandatory rules:
1. **"أي Backup غير مجرب Restore فعلياً = FAIL"** → No backup exists, let alone restore test
2. **"أي Monitoring غير مثبت بالأدلة = FAIL"** → Sentry DSN missing → 0 evidence of monitoring
3. **"أي Recovery Plan بدون خطوات تنفيذية = FAIL"** → Plans exist but rely on Neon PITR only; no custom backup → no custom restore
4. **"أي Alert غير مرتبط بحدث حقيقي = FAIL"** → All alert channels are mock-mode

### What was accomplished in Phase 4:
- ✅ All data sources inventoried (41 models, 13 critical)
- ✅ Backup policy defined (daily/weekly/monthly with S3)
- ✅ 4 recovery scenarios documented with full steps
- ✅ 14 monitoring layers assessed
- ✅ 15 alerts defined across 4 tiers
- ✅ 5 incident runbooks created
- ✅ Production readiness scored at 2/10
- ✅ Path to 7/10 documented with 8 action items

### Next steps before re-assessment:
1. Set `SENTRY_DSN` in Vercel → push test error → verify in Sentry dashboard
2. Set `CRON_SECRET` in Vercel → verify cron jobs execute
3. Set valid `RESEND_API_KEY` → verify email alerts deliver
4. Create and run `scripts/backup-db.sh` → verify dump file → restore to test DB
5. Configure UptimeRobot → verify alert triggers on health endpoint failure
6. Schedule all 4 crons in `vercel.json`
7. Perform DR runbook tabletop exercise (walk through 2 incidents)

---

## DELIVERABLES

| # | Report | Status |
|---|--------|--------|
| 1 | `ORCA_BACKUP_AUDIT.md` | Complete |
| 2 | `ORCA_DATABASE_RECOVERY_PLAN.md` | Complete |
| 3 | `ORCA_MONITORING_AUDIT.md` | Complete |
| 4 | `ORCA_ALERTING_PLAN.md` | Complete |
| 5 | `ORCA_DISASTER_RECOVERY_RUNBOOK.md` | Complete |
| 6 | `ORCA_PRODUCTION_OPERATIONS_REPORT.md` | Complete |
| 7 | `ORCA_PHASE4_OPERATIONS_READINESS.md` | This file |
