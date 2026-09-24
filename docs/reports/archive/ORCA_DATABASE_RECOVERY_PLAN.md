# ORCA Database Recovery Plan

**Document ID**: ORCA-DRP-001  
**Date**: 10 June 2026  
**Scope**: Incident response procedures for database outages, corruption, failed migrations, and accidental deletions  
**Platform**: Neon Serverless PostgreSQL (us-east-1), Vercel (Next.js), Prisma ORM  
**RPO**: 24 hours | **RTO**: 2 hours

---

## Pre-Incident: Access & Tools Required

Before any recovery procedure, ensure access to:

| Resource | Access Method | Credential Location |
|----------|--------------|---------------------|
| Neon Dashboard | `https://console.neon.tech` | Owner account + password |
| Vercel Dashboard | `https://vercel.com` | Owner account + password |
| AWS S3 Backups | `s3://orca-backups-me-central-1` | IAM credentials (if backup pipeline is operational) |
| Health Endpoint | `GET /api/v1/health` | No auth required |
| Sentry Dashboard | `https://sentry.io` | (Not currently configured — see ORCA_MONITORING_AUDIT.md) |

**Critical identifiers**:
- Neon Project: `ep-fragrant-dream-aqbliivf` (from `DATABASE_URL` in `.env.production:6`)
- Neon Database: `neondb`
- Production Domain: `orca.az-ez.pro`
- Fallback Domain: `orca-crm-one.vercel.app`
- Vercel Project: `orca-crm` (from `NEXT_PUBLIC_DEPLOYMENT_URL`)

---

## SCENARIO 1: Database Deleted or Unreachable

### 1.1 Detection

**Indicators** (any one is sufficient to trigger investigation):

| Signal | Source | What to look for |
|--------|--------|------------------|
| Vercel function errors spike | Vercel Dashboard > Functions | `PrismaClientInitializationError`, `Can't reach database server` |
| Health endpoint returns HTTP 503 | `GET /api/v1/health` | `checks.database.status = "disconnected"` |
| Neon dashboard shows no database | `console.neon.tech` > Project > Branches | Database branch missing or `Deleted` status |
| Sentinel cron email | Admin inbox (every 6 hours) | Subject contains `🚨 فشل قاعدة البيانات` |
| UI renders error pages for data-dependent routes | Manual browser check | "Error loading data" or blank tables |

**Auto-detection**: The sentinel cron (`/api/cron/sentinel`, every 6 hours at minute 0) performs:
1. `SELECT 1` health check
2. Self-healing: disconnect → wait 2s → reconnect → retry (up to 3 attempts)
3. Failover activation after 3 failed healing attempts
4. Email alert to admin

If sentinel reports `dbStatus: ERROR` or `failoverTriggered: true`, **immediately escalate**.

### 1.2 Recovery Steps

#### Step 1: Confirm the Incident (5 min)
```
1. Open https://console.neon.tech → navigate to project "ep-fragrant-dream-aqbliivf"
2. Verify database branch status
3. If branch is DELETED: proceed to Step 2
4. If branch is PAUSED (Neon auto-pauses after inactivity): click "Resume" and skip to Step 4
5. If branch is ACTIVE but unreachable: check DATABASE_URL in Vercel env vars for corruption
```

#### Step 2: Neon Point-in-Time Restore (15-30 min)

Neon supports PITR (Point-in-Time Recovery). If the database was deleted, Neon retains a recovery window.

```
1. In Neon Console → Project → "Branches" → click "Restore"
2. Select the most recent timestamp before deletion (Neon displays available recovery points)
3. Name the restored branch: "neondb-restored-{YYYYMMDD}"
4. Click "Create Branch" — Neon provisions a new branch with data up to the selected timestamp
5. Copy the new DATABASE_URL from the restored branch connection details
```

#### Step 3: Promote Restored Branch (5 min)

```
1. In Neon Console, set the restored branch as "Primary"
2. Or: Update Vercel environment variable DATABASE_URL to point to the new branch
    - Go to Vercel Dashboard → Project Settings → Environment Variables
    - Update DATABASE_URL and DIRECT_URL to the restored branch connection string
    - Redeploy the latest production build to pick up the new env var
```

#### Step 4: Verify Recovery (15 min)

```bash
# 1. Health check
curl -s https://orca.az-ez.pro/api/v1/health | jq '.'
# Expected: { "status": "online", "checks": { "database": { "status": "connected" } } }

# 2. Row count verification — compare against last known counts (from monitoring)
```

Run the following SQL against the restored database (via Neon SQL Editor or `psql`):

```sql
-- Critical table row counts
SELECT 'tenants'               AS tbl, COUNT(*) AS cnt FROM tenants
UNION ALL SELECT 'users',                   COUNT(*) FROM users
UNION ALL SELECT 'leads',                   COUNT(*) FROM leads
UNION ALL SELECT 'contracts',               COUNT(*) FROM contracts
UNION ALL SELECT 'units',                   COUNT(*) FROM units
UNION ALL SELECT 'rental_invoices',         COUNT(*) FROM rental_invoices
UNION ALL SELECT 'payment_transactions',    COUNT(*) FROM payment_transactions
UNION ALL SELECT 'journal_entries',         COUNT(*) FROM journal_entries
UNION ALL SELECT 'zatca_devices',           COUNT(*) FROM zatca_devices
UNION ALL SELECT 'audit_logs',              COUNT(*) FROM audit_logs
UNION ALL SELECT 'maintenance_tickets',     COUNT(*) FROM maintenance_tickets
ORDER BY tbl;
```

```
# 3. Functional smoke tests
- Log in as superadmin (ali.orca@outlook.sa)
- Navigate to Operations > Tenants — confirm tenant list renders
- Navigate to a tenant's leads — confirm data is present
- Navigate to a tenant's accounting — confirm journal entries exist
- Open a ZATCA device — confirm certificates load
```

#### Step 5: Notify Stakeholders (5 min)

If data loss occurred (beyond RPO tolerance):
- Email all tenant admins with incident summary and data loss scope
- Update ORCA status page if one exists

### 1.3 Recovery Time Estimate

| Step | Time |
|------|------|
| Detection | 0-6 hours (next sentinel run) or immediate if manually detected |
| Confirmation | 5 minutes |
| PITR Restore | 15-30 minutes |
| Promote Branch | 5 minutes |
| Verification | 15 minutes |
| Notification | 5 minutes |
| **Total RTA** (Recovery Time Actual) | **45-60 minutes** |

### 1.4 Validation Checklist

- [ ] Health endpoint returns HTTP 200 with `database.status: "connected"`
- [ ] All 13 critical table row counts are non-zero
- [ ] Superadmin can authenticate
- [ ] At least 3 tenants have verifiable data
- [ ] At least 1 ZATCA device certificate loads correctly
- [ ] Cron jobs (`/api/cron/sentinel`) re-execute without database errors
- [ ] `DATABASE_URL` in Vercel points to the correct restored branch
- [ ] Old branch (if not deleted) is documented and archived

---

## SCENARIO 2: Corrupted Data

### 2.1 Detection

**Indicators**:

| Signal | Source | What to look for |
|--------|--------|------------------|
| Specific queries return errors | Application logs / Sentry | `PrismaClientKnownRequestError`, foreign key violations, constraint errors |
| Data inconsistency reports | Users / support tickets | Duplicate records, missing related data, incorrect financial totals |
| Accounting imbalance | Manual audit | `SUM(debit) != SUM(credit)` in `journal_lines` for a `journal_entry` |
| Tenant isolation breach | Audit | Records from tenant A appearing in tenant B queries |
| ZATCA invoice errors | ZATCA queue | Invoices failing validation with schema/sequence errors |

**Auto-detection gaps**: There is no automated data integrity check. Corruption must be detected manually or via user reports.

### 2.2 Recovery Steps

#### Step 1: Scope the Corruption (15-30 min)

```sql
-- 1. Identify affected tables: check for constraint violations
-- Example: orphaned journal_lines (missing parent journal_entry)
SELECT COUNT(*) FROM journal_lines jl
LEFT JOIN journal_entries je ON jl.journal_entry_id = je.id
WHERE je.id IS NULL;

-- 2. Check accounting integrity per tenant
SELECT je.tenant_id, je.id AS entry_id,
  SUM(jl.debit) AS total_debit,
  SUM(jl.credit) AS total_credit,
  SUM(jl.debit) - SUM(jl.credit) AS imbalance
FROM journal_entries je
JOIN journal_lines jl ON jl.journal_entry_id = je.id
GROUP BY je.tenant_id, je.id
HAVING SUM(jl.debit) != SUM(jl.credit);

-- 3. Check ZATCA invoice sequence gaps per tenant
SELECT tenant_id, invoice_number,
  LAG(invoice_number) OVER (PARTITION BY tenant_id ORDER BY invoice_number) AS prev_number,
  invoice_number - LAG(invoice_number) OVER (PARTITION BY tenant_id ORDER BY invoice_number) AS gap
FROM rental_invoices
WHERE invoice_number - LAG(invoice_number) OVER (PARTITION BY tenant_id ORDER BY invoice_number) > 1;

-- 4. Check orphaned foreign keys across critical relationships
-- leads with non-existent tenant
SELECT COUNT(*) FROM leads l LEFT JOIN tenants t ON l.tenant_id = t.id WHERE t.id IS NULL;
-- contracts with non-existent units
SELECT COUNT(*) FROM contracts c LEFT JOIN units u ON c.unit_id = u.id WHERE u.id IS NULL;
-- rental_invoices with non-existent leases
SELECT COUNT(*) FROM rental_invoices ri LEFT JOIN rental_leases rl ON ri.lease_id = rl.id WHERE rl.id IS NULL;
```

#### Step 2: Determine the Corruption Window

Identify the earliest timestamp when corruption is confirmed. Check `audit_logs` for suspicious activity:

```sql
SELECT * FROM audit_logs
WHERE table_name IN ('journal_entries', 'rental_invoices', 'accounts')
  AND created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 100;
```

#### Step 3: Neon Point-in-Time Restore (15-30 min)

```
1. In Neon Console → Project → Branches → "Create Branch" → "Point in Time"
2. Select timestamp BEFORE the earliest corruption event
3. Name: "neondb-recovery-{YYYYMMDD}-pre-corruption"
4. Create the branch
5. Copy connection string
```

#### Step 4: Extract Clean Data (30-60 min)

Option A — **Full restore** (if corruption is widespread):

Follow Scenario 1, Step 3 to promote the restored branch as primary. This rolls back ALL data to the pre-corruption timestamp. **Data written after the restore point will be lost.**

Option B — **Selective extraction** (if corruption is limited to specific tables/tenants):

```bash
# Extract only affected tables from the restored branch
pg_dump \
  --dbname="<RESTORED_BRANCH_URL>" \
  --table=journal_entries \
  --table=journal_lines \
  --table=account_balances \
  --data-only \
  --inserts \
  --file="clean_data_2026-06-10.sql"

# Review extracted data
less clean_data_2026-06-10.sql

# Apply to production (WITH EXTREME CAUTION)
# psql "<PRODUCTION_DATABASE_URL>" -f clean_data_2026-06-10.sql
```

#### Step 5: Verify Integrity (15 min)

Re-run all queries from Step 1 against production. All should return zero violations.

```sql
-- Final integrity check
SELECT 'Imbalance in journal entries' AS check_name,
  COUNT(*) AS failures
FROM (
  SELECT je.id, SUM(jl.debit) - SUM(jl.credit) AS imbalance
  FROM journal_entries je
  JOIN journal_lines jl ON jl.journal_entry_id = je.id
  GROUP BY je.id
  HAVING SUM(jl.debit) != SUM(jl.credit)
) sub;
```

#### Step 6: Notify Affected Tenants (10 min)

If data was rolled back:
- Identify tenants affected by the corruption window
- Send email notification: "Data for {date range} has been restored from backup due to an integrity issue. Please verify your records for this period."
- If financial data was affected, provide a detailed reconciliation report

### 2.3 Recovery Time Estimate

| Phase | Time |
|-------|------|
| Detection & Scoping | 30-60 minutes |
| PITR Branch Creation | 15-30 minutes |
| Data Extraction/Restore | 30-60 minutes |
| Integrity Verification | 15-30 minutes |
| Tenant Notification | 10-30 minutes |
| **Total RTA** | **2-4 hours** |

### 2.4 Validation Checklist

- [ ] Journal entry debit/credit balance = 0 for all entries
- [ ] No orphaned foreign keys in critical tables
- [ ] ZATCA invoice sequence per tenant has no gaps
- [ ] `account_balances` match sum of `journal_lines` for the period
- [ ] Health endpoint returns HTTP 200
- [ ] All affected tenants notified
- [ ] Root cause documented in incident log
- [ ] Corruption window recorded for audit trail

---

## SCENARIO 3: Failed Database Migration

### 3.1 Detection

**Indicators**:

| Signal | Source | What to look for |
|--------|--------|------------------|
| Build failure | Vercel Dashboard > Deployments | `prisma generate` or build step fails with migration errors |
| Prisma migration error | Deployment logs | `P3009` (migration failed), `P3010` (migration already applied), drift detected |
| Startup failure | Vercel Functions logs | `PrismaClientInitializationError`, `The database schema is not in sync` |
| Application errors after deploy | Sentry / application logs | `P2021` (table does not exist), `P2022` (column does not exist) |
| Vercel deployment marked as "Error" | Vercel Dashboard | Red status on latest deployment |

**Auto-detection**: Vercel automatically rolls back to the previous successful deployment if the build fails. However, if the build succeeds but the migration corrupts data at runtime, the deployment will appear healthy while serving errors.

### 3.2 Recovery Steps

#### Step 1: Immediate Rollback — Stop the Bleeding (2 min)

```
Option A (Build failure):
  Vercel auto-rolls back. No action needed. Proceed to Step 3.

Option B (Runtime failure after successful build):
  1. Vercel Dashboard → Deployments
  2. Find the last successful deployment before the migration
  3. Click "..." → "Promote to Production"
  4. This redeploys the previous working version immediately
  5. Proceed to Step 2 to fix the database
```

#### Step 2: Roll Back Database Migration (15-30 min)

**Option A: Neon Point-in-Time Restore** (Recommended — safest)

```
1. Note the exact timestamp when the migration was applied
2. Neon Console → Branches → Create Branch → Point in Time
3. Select timestamp just BEFORE the migration ran
4. Name: "neondb-pre-migration-{date}"
5. Promote this branch as primary (or update DATABASE_URL)
6. This restores the database to its pre-migration state
```

**Option B: Manual Migration Revert** (If PITR is unavailable)

```sql
-- If the migration was a simple table creation:
DROP TABLE IF EXISTS <new_table> CASCADE;

-- If the migration added columns:
ALTER TABLE <table_name> DROP COLUMN IF EXISTS <column_name>;

-- If the migration was a data transformation (more complex):
-- 1. Identify affected rows from audit_logs
-- 2. Manually reverse the transformation
-- 3. This is risky — prefer PITR
```

**Option C: Prisma Migrate Resolve** (If the migration failed mid-way)

```bash
# Mark the failed migration as rolled back so Prisma can re-attempt
npx prisma migrate resolve --rolled-back <migration_name>

# Or if the migration was already applied but is missing from _prisma_migrations:
npx prisma migrate resolve --applied <migration_name>
```

#### Step 3: Fix the Migration Script (Variable)

```
1. Examine the failed migration in prisma/migrations/<latest>/
2. Identify the root cause:
   - Constraint violation? → Add data cleanup BEFORE the ALTER
   - Timeout? → Break into smaller migrations
   - Data type mismatch? → Add explicit CAST or USING clause
   - Lock contention? → Use CREATE INDEX CONCURRENTLY pattern
3. Fix the migration SQL
4. Test against a Neon branch (not production)
```

#### Step 4: Re-apply Fixed Migration (10 min)

```
1. Create a new Neon branch from the pre-migration PITR point (for testing)
2. Run: npx prisma migrate deploy (against test branch)
3. Verify: all tables exist, no errors
4. If successful: apply to production
   - Option A: Run migration against production DB
   - Option B: Promote the tested Neon branch as primary
5. Redeploy the application with the fixed migration
```

#### Step 5: Verify (15 min)

```bash
# Health check
curl -s https://orca.az-ez.pro/api/v1/health

# Prisma validation — no drift
npx prisma db pull --print  # Compare against schema.prisma — should match
```

```sql
-- Verify new schema elements exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Verify no data loss on critical tables (compare row counts)
SELECT 'tenants' AS tbl, COUNT(*) AS cnt FROM tenants;
```

### 3.3 Recovery Time Estimate

| Phase | Time |
|-------|------|
| Detection | 0-5 minutes (build failure) or hours (runtime failure) |
| Production rollback | 2 minutes (Vercel promote) |
| DB rollback (PITR) | 15-30 minutes |
| Fix migration | 30-120 minutes |
| Re-apply & verify | 15-30 minutes |
| **Total RTA** | **1-3 hours** |

### 3.4 Validation Checklist

- [ ] Production deployment shows "Ready" status in Vercel
- [ ] Health endpoint returns HTTP 200
- [ ] `prisma db pull` produces no schema drift from `schema.prisma`
- [ ] All critical table row counts are non-zero
- [ ] Application functions tested: login, lead list, invoice generation
- [ ] ZATCA queue processing works (submit test invoice if possible)
- [ ] Rollback deployment tagged and documented
- [ ] Migration fix tested on separate Neon branch before production apply

---

## SCENARIO 4: Accidental Data Deletion

### 4.1 Detection

**Indicators**:

| Signal | Source | What to look for |
|--------|--------|------------------|
| Missing record reports | User/support complaints | "My lead X disappeared" / "Invoice Y is gone" |
| Application errors for specific IDs | Sentry / logs | `NotFoundError`, `Record does not exist` for known IDs |
| Sudden row count drops | Monitoring | Any critical table count drops >10% between sentinel runs |
| Audit log spike | `audit_logs` table | Unusual DELETE operations from admin users |

**Auto-detection**: The sentinel cron already counts `tenants` and `usageMeters`. It does NOT track row counts for `leads`, `contracts`, `units`, `rental_invoices`, `payment_transactions`, `journal_entries`. This is a monitoring gap.

### 4.2 Recovery Steps

#### Step 1: Identify Deleted Records (15-30 min)

Query audit logs for the affected table and time window:

```sql
-- Find recent DELETE operations
SELECT id, tenant_id, user_id, action, table_name, record_id, details, created_at
FROM audit_logs
WHERE action = 'DELETE'
  AND table_name = '<AFFECTED_TABLE>'  -- e.g., 'leads', 'rental_invoices'
  AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- If audit_logs don't capture the deletion (gap), check for missing IDs:
-- Example: find gaps in lead IDs for a tenant
-- This requires knowing the approximate ID sequence
SELECT id FROM leads WHERE tenant_id = '<TENANT_ID>' ORDER BY created_at DESC;
```

#### Step 2: Neon PITR to Extract Deleted Records (15-30 min)

```
1. Neon Console → Branches → Create Branch → Point in Time
2. Select timestamp BEFORE the deletion occurred
3. Name: "neondb-recovery-deleted-{date}"
4. Create the branch — DO NOT promote to primary
5. Copy the restored branch connection string
```

#### Step 3: Extract and Re-insert (30-45 min)

```bash
# Extract only the deleted records from the restored branch
pg_dump \
  --dbname="<RESTORED_BRANCH_URL>" \
  --table=<affected_table> \
  --data-only \
  --inserts \
  --file="deleted_records.sql"
```

Edit `deleted_records.sql` to keep only the target rows, then:

```sql
-- CRITICAL: Wrap in a transaction for safety
BEGIN;

-- Re-insert deleted records
-- (from the extracted SQL file)
INSERT INTO leads (id, tenant_id, first_name, ...) VALUES (...);

-- Verify count
SELECT COUNT(*) FROM leads WHERE id = '<RESTORED_ID>';

-- Create audit log entry for the recovery
INSERT INTO audit_logs (tenant_id, user_id, action, table_name, record_id, details, created_at)
VALUES ('<TENANT_ID>', NULL, 'RECOVER', 'leads', '<RESTORED_ID>', 'Recovered from PITR after accidental deletion', NOW());

COMMIT;
-- If anything fails: ROLLBACK;
```

#### Step 4: Verify (15 min)

```
1. Confirm the re-inserted records appear in the application
2. Check that related records are intact (e.g., lead_activities for a restored lead)
3. If cascading deletes wiped related records, repeat Steps 2-3 for those tables
4. Notify the affected tenant
```

#### Step 5: Root Cause Analysis (30 min)

```
1. Who performed the deletion? (Check audit_logs.user_id)
2. Was it an API call, direct DB access, or automated process?
3. If API: review the endpoint for missing authorization checks
4. If Prisma Studio/Admin UI: review admin access controls
5. If automated: review the automation logic for unintended cascading deletes
6. Document findings and implement preventive measures
```

### 4.3 Recovery Time Estimate

| Phase | Time |
|-------|------|
| Detection | Variable (minutes to days, depending on user reports) |
| Identify deleted records | 15-30 minutes |
| PITR branch creation | 15-30 minutes |
| Extract & re-insert | 30-45 minutes |
| Verify | 15 minutes |
| Root cause analysis | 30 minutes |
| **Total RTA** | **2-3 hours** |

### 4.4 Validation Checklist

- [ ] Restored records appear in application with correct data
- [ ] Related records (child tables, foreign keys) are intact or also restored
- [ ] No duplicate records created by the restore
- [ ] Audit log entry created documenting the recovery
- [ ] Affected tenant notified
- [ ] Root cause identified and documented
- [ ] Preventive measure implemented (e.g., soft-delete, confirmation dialogs, RBAC changes)
- [ ] PITR branch cleaned up (deleted from Neon after recovery confirmed)

---

## 5. Cross-Scenario Reference

| Aspect | Scenario 1 (Deleted DB) | Scenario 2 (Corruption) | Scenario 3 (Migration) | Scenario 4 (Accidental Delete) |
|--------|------------------------|------------------------|------------------------|-------------------------------|
| **PITR Used** | Yes — full restore | Yes — full or partial | Yes — rollback | Yes — extract only |
| **Full DB Rollback** | Yes | Optional | Yes | No |
| **Data Loss Risk** | Up to RPO (24h) | Post-corruption writes | Post-migration writes | None (extract only) |
| **Production Downtime** | 45-60 min | 2-4 hours | 1-3 hours | None |
| **User Impact** | All tenants | Affected tenants only | All tenants | Affected tenant only |
| **Neon Branch Needed** | 1 (restored primary) | 1-2 (restore + extraction) | 1-2 (rollback + test) | 1 (extraction only) |

---

## 6. Prevention Measures

| Measure | Scenarios Addressed | Implementation |
|---------|---------------------|----------------|
| Custom pg_dump backups (see ORCA_BACKUP_AUDIT.md) | 1, 2, 3, 4 | Daily to S3, independent of Neon |
| Soft-delete pattern for critical tables | 4 | Add `deleted_at` column; never hard-delete leads/contracts/invoices |
| Migration dry-run on branch before production | 3 | Mandatory PR checklist item |
| Row count monitoring in sentinel cron | 2, 4 | Track counts for all 13 critical tables |
| Application-level delete confirmation | 4 | Add confirmation dialog + audit log capture for all admin delete actions |
| Prisma `@@index` on `deleted_at` (when added) | 4 | Allow efficient "show deleted" queries |
| Neon branch protection | 1 | Prevent deletion of primary branch without MFA confirmation |

---

## 7. Emergency Contacts

| Role | Contact | When to Escalate |
|------|---------|------------------|
| Database Admin | Ali (ali.orca@outlook.sa) | Any PITR restore needed |
| Vercel Admin | Ali (ali.orca@outlook.sa) | Env var changes, deploy rollback |
| Neon Support | `https://console.neon.tech` → Support | PITR not available, branch creation failure |
| Tenant Communication | Support email `support@orca.az-ez.pro` | Data loss affecting tenants |

---

## 8. Test Record

| Date | Scenario Tested | Result | Duration | Notes |
|------|----------------|--------|----------|-------|
| (Not yet tested) | — | — | — | First quarterly restore test scheduled per ORCA_BACKUP_AUDIT.md Section 5 |
