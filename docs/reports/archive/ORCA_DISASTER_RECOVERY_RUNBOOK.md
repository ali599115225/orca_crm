# ORCA DISASTER RECOVERY RUNBOOK

**Document:** REPORT 5 — Incident Response Runbooks
**Date:** 2026-06-10
**Version:** 1.0
**Scope:** ORCA CRM Core Platform — Production Incident Response

---

## Overview

This runbook covers 5 production incident types with step-by-step response procedures. Each incident follows a structured lifecycle: **Immediate Action → Containment → Recovery → Verification → Communication**.

### Prerequisites

Before executing any runbook:
- Access to Neon dashboard (database)
- Access to Vercel dashboard (deployment)
- Access to Paylink dashboard (payments)
- Access to Sentry dashboard (error tracking, once configured)
- SSH / terminal access to run `pg_dump`, `curl`, and database queries
- Team communication channel (email, phone tree)

### Incident Severity Reference

| Severity | Definition | Response SLO |
|----------|-----------|-------------|
| Sev 1 | Complete service outage or revenue loss | 15 minutes |
| Sev 2 | Major functionality degraded | 1 hour |
| Sev 3 | Minor impact, non-critical | 4 hours |

---

## INCIDENT 1: Database Outage

**Severity:** Sev 1
**Alert Trigger:** `CRIT-01` — Health endpoint returns 503

### Immediate Action (First 5 minutes)

1. **Check Neon dashboard** — Navigate to Neon console → select project → check status:
   - Is the database instance running? (green/red indicator)
   - Are there any active incidents listed?
   - Check the "Operations" tab for recent failovers or maintenance
2. **Verify outage scope** — Determine if this is:
   - **Total outage:** Database completely unreachable from all sources
   - **Partial outage:** Specific queries failing, connection timeouts, or pool exhaustion
   - **Regional outage:** Neon us-east-1 status page (`status.neon.tech`)
3. **Run health endpoint manually:**
   ```bash
   curl -s https://orca.az-ez.pro/api/v1/health | python -m json.tool
   ```
   Check `database.status` field. If `"down"` or request times out → confirmed outage.
4. **Check Vercel function logs** for connection errors:
   - Vercel dashboard → Project → Functions → select any API route → check for `PrismaClientInitializationError` or `Can't reach database server`

### Containment (First 15 minutes)

1. **If partial outage (read-only possible):**
   - Identify if writes are failing but reads succeed
   - If a read replica is available (Neon branching), redirect read traffic by updating `DATABASE_URL` in Vercel environment variables
   - This is a temporary measure — Neon does not currently have a built-in read replica per project; branching can serve as a snapshot alternative
2. **If total outage:**
   - Enable maintenance mode: set `MAINTENANCE_MODE=true` in Vercel env vars → redeploy
   - This serves a static maintenance page from `app/maintenance/page.tsx`
3. **Stop non-essential cron jobs** to reduce retry pressure on the database:
   - Disable Vercel Cron triggers temporarily via Vercel dashboard

### Recovery

**Option A: Neon Self-Recovery (preferred)**
- Neon typically auto-recovers from transient failures within 1–5 minutes
- Monitor Neon dashboard until status returns to green
- If outage exceeds 15 minutes → proceed to Option B

**Option B: Point-in-Time Restore**
1. In Neon dashboard → "Branches" → "Create branch" → select "Point in Time"
2. Choose a timestamp before the outage began
3. Create the branch (`recovery-YYYYMMDD-HHMM`)
4. Copy the new branch connection string
5. Update `DATABASE_URL` and `DIRECT_URL` in Vercel environment variables:
   ```bash
   # DATABASE_URL=postgresql://...neon.tech:5432/neondb?sslmode=require
   # DIRECT_URL=postgresql://...neon.tech:5432/neondb?sslmode=require
   ```
6. Redeploy via Vercel dashboard (trigger redeploy with new env vars)
7. **Note:** This creates a new branch. Any data written after the restore point will be lost. Document the gap.

### Verification

1. **Run health check:**
   ```bash
   curl -s https://orca.az-ez.pro/api/v1/health
   ```
   Expected: `{"status": "ok", "database": "ok", ...}`
2. **Spot-check 5 recent records:**
   ```sql
   SELECT id, "createdAt", "buyerName" FROM "Lead" ORDER BY "createdAt" DESC LIMIT 5;
   SELECT id, "createdAt", "totalAmount", status FROM "Invoice" ORDER BY "createdAt" DESC LIMIT 5;
   ```
3. **Verify API responses:**
   ```bash
   curl -s https://orca.az-ez.pro/api/v1/leads | head -c 200
   curl -s https://orca.az-ez.pro/api/v1/invoices | head -c 200
   ```
4. **If maintenance mode was enabled**, verify the app returns normal pages:
   ```bash
   curl -sI https://orca.az-ez.pro | head -5
   ```
   Expected: `HTTP/2 200` (not 503)

### Communication

1. **Notify team:** Send email to all technical staff summarizing:
   - Outage start time and detected cause
   - Containment actions taken
   - Recovery method used (Option A or B)
   - Estimated data loss (if Option B — note the restore point gap)
2. **Update status page:** If a status page exists, update to "Investigating" → "Identified" → "Monitoring" → "Resolved"
3. **Post-incident review:** Schedule within 24 hours; document root cause in incident register

---

## INCIDENT 2: Payment System Failure

**Severity:** Sev 1
**Alert Trigger:** `CRIT-02` — Paylink webhook failure

### Immediate Action (First 5 minutes)

1. **Check Paylink dashboard:**
   - Login to Paylink merchant dashboard
   - Navigate to "Transactions" → check if recent payments are processing
   - Navigate to "Webhooks" → check delivery status and recent errors
   - Check for any Paylink service status announcements
2. **Check webhook endpoint health:**
   ```bash
   curl -sI https://orca.az-ez.pro/api/payments/paylink/webhook
   ```
   Expected: `HTTP/2 405 Method Not Allowed` (endpoint exists but requires POST with signature)
   If `HTTP/2 404` or `HTTP/2 500` → webhook route is down or broken
3. **Check PaymentTransaction table:**
   ```sql
   SELECT id, status, "createdAt", "externalRef", amount
   FROM "PaymentTransaction"
   ORDER BY "createdAt" DESC
   LIMIT 20;
   ```
   Look for transactions stuck in `pending` status and cross-reference with Paylink dashboard.

### Containment (First 15 minutes)

1. **Manually verify recent payments in Paylink dashboard:**
   - For each payment in Paylink with status "completed" in the last hour, check if a corresponding `PaymentTransaction` record exists in ORCA
   - Flag any that are missing — these are missed webhooks
2. **Replay missed webhooks:**
   - In Paylink dashboard → Webhooks → select failed deliveries → "Retry"
   - Monitor ORCA logs for successful processing
3. **If Paylink is the source of failure** (Paylink upstream outage):
   - Enable a banner on the payment flow: "Payment processing is temporarily delayed. Your payment will be processed shortly."
   - Do NOT process manual payments until Paylink is back online

### Recovery

1. **Check webhook authentication:**
   - Verify `PAYLINK_WEBHOOK_SECRET` in `.env.production` matches Paylink dashboard webhook secret
   - If credentials were rotated, update immediately
2. **Restart webhook processing if needed:**
   - Trigger a Vercel redeploy (clears any stuck in-memory state)
3. **Replay from Paylink event log:**
   - Paylink dashboard → Webhooks → Event Log → filter by date range
   - For each event with status "failed" and a date within the outage window, manually replay
4. **If payment callback endpoint is affected:**
   - Check `/api/payment/callback/route.ts` error logs
   - Verify the callback URL registered with Paylink matches `NEXT_PUBLIC_APP_URL`

### Verification

1. **Verify last 10 PaymentTransaction records match Paylink:**
   ```sql
   SELECT p.id, p."externalRef", p.amount, p.status, p."createdAt"
   FROM "PaymentTransaction" p
   ORDER BY p."createdAt" DESC
   LIMIT 10;
   ```
   Cross-reference each `externalRef` with Paylink dashboard transaction IDs.
2. **Run accounting reconciliation:**
   ```sql
   -- Sum payments by status for the affected period
   SELECT status, COUNT(*), SUM(amount) as total
   FROM "PaymentTransaction"
   WHERE "createdAt" >= NOW() - INTERVAL '1 hour'
   GROUP BY status;
   ```
   Compare totals with Paylink dashboard settlement summary.
3. **Verify invoice statuses updated correctly:**
   ```sql
   SELECT i.id, i.status, i."paidAt"
   FROM "Invoice" i
   JOIN "PaymentTransaction" p ON p."invoiceId" = i.id
   WHERE p."createdAt" >= NOW() - INTERVAL '1 hour';
   ```

### Communication

1. **Notify admin:** Email with:
   - Number of missed webhooks and amounts
   - Whether any payments were not captured
   - Current status of reconciliation
2. **Contact Paylink support if upstream:**
   - Paylink support email/channel
   - Provide: transaction IDs, timestamps, webhook endpoint URL
3. **If customer payments are affected:** Prepare customer communication for tenants whose payments show as pending but were completed in Paylink

---

## INCIDENT 3: Webhook Failure (WhatsApp / ZATCA / Paylink)

**Severity:** Sev 2
**Alert Trigger:** Webhook endpoint errors or dead-letter queue growth

### Immediate Action (First 5 minutes)

1. **Check webhook endpoint error logs:**
   - Vercel dashboard → Functions → select affected webhook route
   - Look for 4xx/5xx responses, timeout errors, authentication failures
2. **Verify endpoint is reachable:**
   ```bash
   # WhatsApp webhook
   curl -sI https://orca.az-ez.pro/api/whatsapp/webhook
   # ZATCA callback (if configured)
   curl -sI https://orca.az-ez.pro/api/zatca/callback
   # Paylink webhook
   curl -sI https://orca.az-ez.pro/api/payments/paylink/webhook
   ```
3. **Identify which webhook is failing** based on error source:
   - **WhatsApp:** Messages not being received or sent; `app/api/whatsapp/webhook/route.ts` errors
   - **ZATCA:** Invoices stuck in `pending_submission`; `zatca_queue` table growing
   - **Paylink:** Payments not recording; see Incident 2

### Containment (First 15 minutes)

1. **Check queue status:**
   ```sql
   -- ZATCA queue
   SELECT status, COUNT(*) FROM "zatca_queue" GROUP BY status;
   -- Saher DLQ
   SELECT status, COUNT(*) FROM "saherReplayEngine" WHERE status = 'dead' GROUP BY status;
   ```
2. **Pause non-critical processing if queue is growing rapidly:**
   - For WhatsApp: temporarily disable Saher auto-reply to prevent queue buildup
   - For ZATCA: pause ZATCA submission cron if queue exceeds 200 items
3. **Identify root cause category:**
   - **Authentication failure:** Token/secret mismatch or expiry
   - **Network issue:** Timeout to external service
   - **Payload error:** Malformed request from upstream provider
   - **Code regression:** Recent deployment broke webhook handler

### Recovery

1. **Fix root cause:**
   - **Auth:** Update `WHATSAPP_WEBHOOK_SECRET`, `WHATSAPP_API_TOKEN`, `PAYLINK_WEBHOOK_SECRET` as needed
   - **Network:** Check Vercel edge network status; verify external service is reachable
   - **Payload:** Check upstream provider's API changelog for schema changes
   - **Code:** Rollback to last known-good deployment (see Incident 4)
2. **Retry failed items:**
   ```sql
   -- Reset pending ZATCA items for retry
   UPDATE "zatca_queue" SET status = 'pending', "retryCount" = 0, "lastError" = NULL
   WHERE status = 'failed' AND "retryCount" < 3;
   ```
3. **Clear dead-letter queue:**
   - For Saher DLQ: trigger `saherReplayEngine` retry via the `/api/v1/leads/webhook` retry mechanism
4. **Verify webhook authentication configuration:**
   ```bash
   # Test WhatsApp webhook verification
   curl -s "https://orca.az-ez.pro/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=test"
   ```
   Expected: Returns the challenge string (if GET verification is implemented)

### Verification

1. **Send test webhook:**
   - **WhatsApp:** Send a message to the connected WhatsApp number → verify it appears in ORCA chat
   - **ZATCA:** Submit a test invoice → verify it clears the queue
   - **Paylink:** Create a test payment in Paylink sandbox → verify webhook receipt
2. **Verify queue draining:**
   ```sql
   SELECT status, COUNT(*) FROM "zatca_queue" GROUP BY status;
   ```
   Pending count should be decreasing.
3. **Check error rate normalization:**
   - Monitor Sentry (if configured) or Vercel function logs for errors returning to baseline

### Communication

1. **If ZATCA invoices are affected:** Notify affected tenants that invoice submission may be delayed. Each tenant whose invoices are in the queue should receive a status update.
2. **If WhatsApp is affected:** Notify tenants who rely on WhatsApp lead capture that the service was temporarily degraded.
3. **Update incident log:** Record root cause, affected webhook type, queue volume impacted, and resolution.

---

## INCIDENT 4: Deployment Failure

**Severity:** Sev 2 (Sev 1 if production is on a broken deployment)
**Alert Trigger:** `CRIT-05` — Vercel build fails

### Immediate Action (First 5 minutes)

1. **Check Vercel build logs:**
   - Vercel dashboard → Project → Deployments → click failed deployment
   - Review build output for the failing step:
     - **`npm install` failed:** Dependency resolution error, package not found
     - **`next build` failed:** TypeScript compilation error, import error, build-time assertion
     - **`prisma generate` failed:** Schema validation error, missing env var
     - **Lint step failed:** ESLint error (if configured as build step)
2. **Identify failing step and error message:**
   - Copy the exact error message
   - Check if it's a transient error (network timeout during `npm install`) or a code error
3. **Check Prisma migration status:**
   ```bash
   npx prisma migrate status
   ```
   Verify all migrations have been applied to the production database. A failed deployment may leave migrations unapplied.

### Containment (First 10 minutes)

1. **Rollback to last successful deployment:**
   - Vercel dashboard → Project → Deployments → find the last deployment marked "Ready" (green)
   - Click "..." → "Promote to Production" or "Redeploy"
   - This restores the last known-good state immediately
   - **Do not attempt to fix in place** — rollback first, fix second
2. **Verify rollback is serving traffic:**
   ```bash
   curl -sI https://orca.az-ez.pro | head -1
   ```
   Expected: `HTTP/2 200`
3. **If rollback is not available** (first deployment or all recent deployments failed):
   - Check if the previous production domain is still serving from Vercel's CDN cache
   - If completely down, deploy a static maintenance page via a minimal branch

### Recovery

1. **Fix the build error locally:**
   - Pull the failed deployment's commit
   - Reproduce the error: `npm run build`
   - Apply fix
   - Verify locally: `npm run build` passes
2. **Run pre-deployment checks:**
   ```bash
   npm run build        # TypeScript + Next.js build
   npx prisma generate  # Regenerate Prisma client
   npm run test         # Run test suite (if configured)
   ```
3. **Redeploy:**
   - Commit fix → push to production branch → Vercel auto-deploys (or trigger manually)
4. **Verify health after deployment:**
   ```bash
   curl -s https://orca.az-ez.pro/api/v1/health
   ```

### Verification

1. **Health check:** Confirm `{"status": "ok"}` from health endpoint
2. **Smoke test critical flows:**
   - Login: `POST /api/v1/auth/login`
   - List leads: `GET /api/v1/leads`
   - Create invoice: `POST /api/v1/invoices`
   - Health check: `GET /api/v1/health`
3. **Monitor error rate for 30 minutes:**
   - Watch Sentry (if configured) or Vercel function logs
   - If error rate exceeds pre-deployment baseline → consider rollback

### Communication

1. **Notify team of rollback:**
   - "Deployment #XXXX failed. Rolled back to #YYYY. Investigating."
2. **Announce fix deployment:**
   - "Fix deployed in #ZZZZ. Build error resolved. Monitoring."
3. **Post-mortem within 24 hours:**
   - Document: what failed, why it wasn't caught pre-deploy, what prevents recurrence (e.g., add build step, add pre-deploy checklist)

---

## INCIDENT 5: Data Corruption

**Severity:** Sev 1
**Alert Trigger:** Anomalous query results, data integrity check failure, audit log inconsistencies

### Immediate Action (First 10 minutes)

1. **Identify affected tables:**
   - Check Sentry / Vercel logs for error patterns (e.g., `PrismaClientValidationError`, foreign key violations, unique constraint errors)
   - Review recent audit log entries for anomalies:
     ```sql
     SELECT "tableName", action, COUNT(*)
     FROM "AuditLog"
     WHERE "createdAt" >= NOW() - INTERVAL '1 hour'
     GROUP BY "tableName", action
     HAVING COUNT(*) > 100;
     ```
     Unusually high counts may indicate bulk corruption.
   - Check for recent schema changes that may have corrupted data during migration
2. **Determine corruption scope:**
   - **Isolated to one table:** Easier recovery — restore only that table
   - **Multiple tables with foreign key relationships:** Requires coordinated restore
   - **Widespread (entire DB):** Requires full point-in-time restore (see Incident 1, Recovery Option B)
3. **Stop write operations to affected tables if corruption is isolated:**
   - This may require code-level intervention — deploy a hotfix that adds a write guard
   - Alternatively, in Neon dashboard, revoke write permissions temporarily on affected tables

### Containment (First 30 minutes)

1. **Mark affected records:**
   ```sql
   -- Example: mark corrupted leads
   UPDATE "Lead" SET status = 'CORRUPTED'
   WHERE id IN (<list of affected IDs>);
   ```
   This prevents downstream processes (AI agents, billing, ZATCA) from operating on bad data.
2. **Quarantine corrupted data:**
   ```sql
   -- Export corrupted rows for analysis
   CREATE TABLE "Lead_corrupted_20260610" AS
   SELECT * FROM "Lead" WHERE status = 'CORRUPTED';
   ```
3. **Identify the corruption source:**
   - **Code bug:** Recent deployment introduced a bug that wrote bad data
   - **Migration error:** Schema change was applied incorrectly
   - **External input:** Malformed webhook payload or API request
   - **Concurrency:** Race condition in a transaction

### Recovery

1. **Create a Neon point-in-time restore to a test branch:**
   - Neon dashboard → Branches → Create branch → Point in Time → select timestamp before corruption
   - Name: `recovery-pre-corruption-YYYYMMDD`
   - This creates an isolated copy for safe data extraction
2. **Extract clean records from the test branch:**
   ```sql
   -- Connect to the recovery branch
   -- Export clean rows
   SELECT * FROM "Lead" WHERE "createdAt" < 'corruption-timestamp';
   ```
   Export as CSV or use `pg_dump` for specific tables:
   ```bash
   pg_dump -d <recovery-branch-url> --table="Lead" --data-only --inserts > clean_leads.sql
   ```
3. **Merge with production:**
   - **For isolated table corruption:** Drop affected rows in production, re-insert from recovery branch
   - **For partial corruption:** Use `INSERT ... ON CONFLICT DO NOTHING` to only restore missing rows
   - **Manual verification:** Do NOT automate this merge — manually review each table
4. **Verify integrity after merge:**
   ```sql
   -- Row count comparison
   SELECT 'production' as source, COUNT(*) FROM "Lead"
   UNION ALL
   SELECT 'recovery' as source, COUNT(*) FROM <recovery_branch>."Lead";
   ```

### Verification

1. **Row counts match expected totals:**
   Compare pre-incident row counts (from backup or monitoring) with post-recovery counts.
2. **Spot-check critical records:**
   - 10 most recent leads
   - 10 most recent invoices
   - 10 most recent payment transactions
   - 10 most recent ZATCA submissions
3. **Full accounting reconciliation:**
   ```sql
   -- Verify invoice totals match payment totals
   SELECT
     (SELECT COALESCE(SUM("totalAmount"), 0) FROM "Invoice" WHERE status = 'paid') as paid_invoices,
     (SELECT COALESCE(SUM(amount), 0) FROM "PaymentTransaction" WHERE status = 'completed') as completed_payments;
   ```
   These should be within acceptable tolerance (< 1% difference).
4. **Run data integrity checks:**
   - Foreign key validation: all references resolve
   - No orphaned records
   - Unique constraints not violated
   - Enum values within expected range

### Communication

1. **Notify admin immediately** upon discovering corruption — include scope, affected tables, and estimated row count
2. **If customer data is affected:**
   - Prepare disclosure statement detailing what data was affected and for how long
   - Determine if the corruption affected tenant billing, ZATCA compliance, or payment records
   - If yes → those tenants must be contacted individually
3. **Legal review if PII is involved:**
   - If personally identifiable information was corrupted or exposed during recovery
   - Engage legal counsel for regulatory compliance (PDPL — Saudi Personal Data Protection Law)
   - Document all actions taken for regulatory audit trail
4. **Post-incident review within 48 hours:**
   - Root cause analysis
   - Recovery timeline
   - Data loss assessment (how many rows, what time window)
   - Preventive measures (add validation, add integrity checks, add backup frequency)

---

## Incident Response Checklist (Quick Reference)

### Before Any Incident
- [ ] Team phone tree documented and accessible
- [ ] Neon dashboard credentials saved and accessible
- [ ] Vercel dashboard credentials saved and accessible
- [ ] Paylink dashboard credentials saved and accessible
- [ ] `.env.production` backed up and retrievable
- [ ] This runbook accessible offline (printed or local copy)

### During Any Incident
- [ ] Declare severity (Sev 1/2/3)
- [ ] Start incident timer
- [ ] Assign incident commander
- [ ] Execute Immediate Action steps
- [ ] Execute Containment steps
- [ ] Execute Recovery steps
- [ ] Execute Verification steps
- [ ] Execute Communication steps
- [ ] Mark incident as resolved when verification passes

### After Any Incident
- [ ] Write post-mortem within 24 hours (Sev 1/2) or 48 hours (Sev 3)
- [ ] Add root cause to incident register
- [ ] Create action items to prevent recurrence
- [ ] Update this runbook if procedures changed

---

## Emergency Contacts

| Role | Contact Method | When to Contact |
|------|---------------|-----------------|
| CTO | Phone (primary) / Email | Sev 1, no ack within escalation window |
| Admin | Email / SMS | All incidents — first responder |
| Neon Support | Neon dashboard → Support | Database outage > 15 minutes |
| Paylink Support | Paylink dashboard → Support | Payment system failure |
| Vercel Support | Vercel dashboard → Support | Deployment issues, edge network |
| ZATCA Support | ZATCA portal | Submission failures, compliance issues |

---

*End of ORCA_DISASTER_RECOVERY_RUNBOOK.md — Report 5 of 6*
