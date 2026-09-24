# ORCA Backup Audit Report

**Document ID**: ORCA-BKP-001  
**Date**: 10 June 2026  
**Scope**: All ORCA production data sources, backup policies, retention, and restore procedures  
**Status**: GAP IDENTIFIED — No custom backup strategy exists

---

## 1. Data Source Inventory

### 1.1 PostgreSQL Database (Neon Serverless)

**Current State**: The database is hosted on Neon (us-east-1, pooled endpoint) and relies exclusively on Neon's automatic snapshots. There are no custom `pg_dump` scripts, no scheduled exports, and no off-region copies.

**Models**: 41 Prisma models in `prisma/schema.prisma`. Below is the full inventory:

| # | Model | Table | Criticality | Notes |
|---|-------|-------|-------------|-------|
| 1 | Tenant | `tenants` | **CRITICAL** | Multi-tenant core; company name, subdomain, subscription, ZATCA creds, VAT, CR |
| 2 | User | `users` | **CRITICAL** | All user accounts, password hashes, roles |
| 3 | Lead | `leads` | **CRITICAL** | CRM pipeline; customer data, scores, status |
| 4 | Contract | `contracts` | **CRITICAL** | Signed sales contracts, buyer info, VAT |
| 5 | Unit | `units` | **CRITICAL** | Property inventory, pricing, media |
| 6 | RentalLease | `rental_leases` | **CRITICAL** | Active lease agreements |
| 7 | RentalInvoice | `rental_invoices` | **CRITICAL** | ZATCA-linked invoices, QR codes, XML payloads |
| 8 | PaymentTransaction | `payment_transactions` | **CRITICAL** | All financial transactions, gateway refs |
| 9 | JournalEntry | `journal_entries` | **CRITICAL** | Double-entry accounting |
| 10 | AccountBalance | `account_balances` | **CRITICAL** | Period-end balances per account |
| 11 | ZatcaDevice | `zatca_devices` | **CRITICAL** | Compliance/production CSRs, private keys, certs |
| 12 | AuditLog | `audit_logs` | **CRITICAL** | Immutable audit trail |
| 13 | MaintenanceTicket | `maintenance_tickets` | **CRITICAL** | Maintenance operations |
| 14 | Account | `accounts` | HIGH | Chart of accounts |
| 15 | JournalLine | `journal_lines` | HIGH | Journal entry line items |
| 16 | Installment | `installments` | HIGH | Contract installment schedules, payment tokens |
| 17 | ZatcaQueue | `zatca_queue` | HIGH | ZATCA submission queue, retries, responses |
| 18 | Receipt | `receipts` | HIGH | Payment receipts, ledger links |
| 19 | GeneralLedger | `general_ledger` | HIGH | General ledger entries |
| 20 | Project | `projects` | HIGH | Real estate projects, unit counts |
| 21 | PayrollCommission | `payroll_commissions` | HIGH | Sales commissions |
| 22 | CommissionPayment | `commission_payments` | HIGH | Commission disbursements |
| 23 | Ticket | `tickets` | MEDIUM | Support tickets |
| 24 | LeadActivity | `lead_activities` | MEDIUM | Lead interaction history |
| 25 | Task | `tasks` | MEDIUM | User tasks |
| 26 | AgentSlot | `agent_slots` | MEDIUM | AI agent slot assignments |
| 27 | UsageMeter | `usage_meters` | MEDIUM | Usage limits and counters |
| 28 | AgentTelemetryLog | `agent_telemetry_logs` | MEDIUM | AI agent telemetry |
| 29 | FollowupSequence | `followup_sequences` | MEDIUM | Automated follow-up configs |
| 30 | MansourChat | `mansour_chats` | MEDIUM | WhatsApp chat history |
| 31 | PlatformConnection | `platform_connections` | MEDIUM | WhatsApp/Green API connections |
| 32 | AgentLease | `agent_leases` | MEDIUM | AI agent lease records |
| 33 | Contact | `contacts` | MEDIUM | Extended contact records |
| 34 | Opportunity | `opportunities` | MEDIUM | Sales opportunities |
| 35 | Tour | `tours` | MEDIUM | Property tour scheduling |
| 36 | Offer | `offers` | MEDIUM | Price offers to leads |
| 37 | AutomationWorkflow | `automation_workflows` | MEDIUM | Workflow automation configs |
| 38 | TelemetryEvent | `telemetry_events` | MEDIUM | System telemetry |
| 39 | RateLimitEntry | `rate_limit_entries` | LOW | Rate limiting counters |
| 40 | UserFavorite | `user_favorites` | LOW | User bookmarks |
| 41 | FailedLoginAttempt | `failed_login_attempts` | LOW | Brute-force tracking |

**Critical models (13)**: Tenant, User, Lead, Contract, Unit, RentalLease, RentalInvoice, PaymentTransaction, JournalEntry, AccountBalance, ZatcaDevice, AuditLog, MaintenanceTicket

**Connection details** (from `.env.production:6`):
- Pooled endpoint: `ep-fragrant-dream-aqbliivf-pooler.c-8.us-east-1.aws.neon.tech:5432`
- SSL mode: `require` (not `verify-full` — gap noted in monitoring audit)

---

### 1.2 Uploaded Documents

**Current State**: No backups exist for any uploaded files.

| Path | Purpose | Status |
|------|---------|--------|
| `scratch/uploads/` | User-uploaded files (tickets, leads, etc.) | **NOT BACKED UP** — directory exists but empty at time of audit |
| `public/documents/` | Public-facing documents | **DOES NOT EXIST** — may be populated at runtime |

**Risk**: Uploaded documents (contract PDFs, maintenance images, offer documents) are stored ephemerally on Vercel's filesystem. Vercel deployments are immutable and file system is not persistent across deployments.

**Recommendation**: Upload documents should be stored in an S3-compatible bucket (not Vercel filesystem). If they are currently stored on Vercel filesystem, they are at imminent risk of loss on next deployment.

---

### 1.3 Environment Variables

**Current State**: `.env.production` contains 56 lines (35+ discrete environment variables). No backup of these values exists outside of the Vercel dashboard and the local `.env.production` file (which is gitignored and not tracked in version control).

| Category | Critical Variables | Present? |
|----------|-------------------|----------|
| Database | `DATABASE_URL`, `DIRECT_URL` | Yes |
| Auth | `JWT_SECRET` | Yes |
| AI | `GEMINI_API_KEY`, `GOOGLE_AI_API_KEY`, `SAHER_*` (7 vars) | Yes |
| Email | `RESEND_API_KEY`, `FROM_EMAIL` | Partial — RESEND_API_KEY is placeholder |
| WhatsApp | `GREEN_API_*`, `WHATSAPP_*` (7 vars) | Partial — tokens are placeholders |
| Vercel | `VERCEL_API_TOKEN`, `VERCEL_PROJECT_ID`, `VERCEL_TEAM_ID` | All placeholders |
| Emergency | `SAFE_MODE_ENABLED`, `MAINTENANCE_MODE` | Yes |
| Runtime | `NODE_ENV`, `TZ`, `NEXT_TELEMETRY_DISABLED` | Yes |

**Missing critical variables** (not set in `.env.production`):
- `SENTRY_DSN` — Sentry initializes silently with empty string, zero error tracking
- `CRON_SECRET` — Required by all 4 cron routes (`billing`, `sentinel`, `zatca`, `installments`); crons will return HTTP 500 without it
- `FAILOVER_WEBHOOK_URL` — Used by sentinel agent for critical alerts
- `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` — Required by `withSentryConfig` in `next.config.mjs`

---

### 1.4 Vercel Configuration

**Current State**: `vercel.json` defines build/install commands and 2 cron jobs. No backup exists beyond the git repository.

```json
{
  "crons": [
    { "path": "/api/cron/billing",   "schedule": "0 2 * * *" },
    { "path": "/api/cron/sentinel",  "schedule": "0 6 * * *" }
  ],
  "buildCommand": "prisma generate && next build",
  "installCommand": "npm install",
  "framework": "nextjs"
}
```

**What needs backing up**:
- `vercel.json` (in git — backed up)
- Vercel project environment variables (set via dashboard or `vercel env`)
- Custom domains: `orca.az-ez.pro` (production), `orca-crm-one.vercel.app` (immutable fallback)
- Vercel project ID, team ID (in `.env.production` placeholders)

---

### 1.5 ZATCA Data

**Current State**: All ZATCA data resides in the database:

| Data | Table | Backup Coverage |
|------|-------|----------------|
| Device CSRs and certificates | `zatca_devices` | Neon snapshots only |
| Invoice XML payloads (signed/unsigned) | `rental_invoices` | Neon snapshots only |
| Submission queue (pending, retries, errors) | `zatca_queue` | Neon snapshots only |
| QR code payloads | `rental_invoices` | Neon snapshots only |

**ZATCA Compliance Note**: Saudi ZATCA regulations require taxpayers to retain electronic invoices and associated records for a minimum of 6 years. Relying solely on database snapshots is insufficient for a 6-year compliance window. A separate archival strategy is required.

---

## 2. Backup Policy

### 2.1 Schedule

| Frequency | Type | Destination | Retention |
|-----------|------|-------------|-----------|
| **Daily** | `pg_dump` (custom format, compressed) | S3 `orca-backups/daily/` | 7 days |
| **Weekly** | Full `pg_dump` + uploaded documents tarball | S3 `orca-backups/weekly/` | 30 days (4 weeks) |
| **Monthly** | Full archive (database + documents + env vars + vercel config) | S3 `orca-backups/monthly/` | 12 months |

### 2.2 Retention Summary

```
Daily:   7 days rolling
Weekly:  4 copies (30 days)
Monthly: 12 copies (12 months)
---------------------------
Total:   Up to 23 concurrent backup objects in S3
```

### 2.3 Off-Region Replication

- **Primary bucket region**: `me-central-1` (Saudi Arabia — Riyadh) for ZATCA data sovereignty compliance
- **Replication**: S3 Cross-Region Replication (CRR) to `eu-west-1` or `us-east-1` for disaster recovery
- **Rationale**: Saudi data residency laws require primary storage within KSA; off-region replica provides DR against regional outage

### 2.4 Encryption

- **At rest**: S3 server-side encryption with AWS KMS (SSE-KMS)
- **In transit**: TLS 1.3 (enforced by AWS SDK + `sslmode=require` on Neon)
- **Dump-level**: Optional `pg_dump` encryption with `gpg` before upload for PII-containing data

---

## 3. Backup Commands

### 3.1 Database Dump (Daily)

```bash
#!/bin/bash
# orca-pg-dump.sh — Daily database backup

TIMESTAMP=$(date -u +"%Y-%m-%dT%H-%M-%SZ")
DUMP_FILE="orca-daily-${TIMESTAMP}.dump"
DATABASE_URL="postgresql://neondb_owner:<PASSWORD>@ep-fragrant-dream-aqbliivf-pooler.c-8.us-east-1.aws.neon.tech:5432/neondb?sslmode=require"

# Export with custom format (supports parallel restore)
pg_dump \
  --dbname="${DATABASE_URL}" \
  --format=custom \
  --compress=9 \
  --no-owner \
  --no-acl \
  --exclude-table=rate_limit_entries \
  --exclude-table=failed_login_attempts \
  --file="${DUMP_FILE}"

echo "Dump created: ${DUMP_FILE} ($(du -h ${DUMP_FILE} | cut -f1))"
```

### 3.2 S3 Upload

```bash
#!/bin/bash
# orca-s3-upload.sh

BUCKET="orca-backups-me-central-1"
PREFIX="daily"
DUMP_FILE="$1"

# Upload with SSE-KMS encryption
aws s3 cp "${DUMP_FILE}" \
  "s3://${BUCKET}/${PREFIX}/${DUMP_FILE}" \
  --region me-central-1 \
  --sse aws:kms \
  --sse-kms-key-id alias/orca-backup-key \
  --storage-class STANDARD_IA

# Verify upload
aws s3 ls "s3://${BUCKET}/${PREFIX}/${DUMP_FILE}"

# Tag for lifecycle policy
aws s3api put-object-tagging \
  --bucket "${BUCKET}" \
  --key "${PREFIX}/${DUMP_FILE}" \
  --tagging '{"TagSet":[{"Key":"retention","Value":"daily-7d"},{"Key":"application","Value":"orca-crm"}]}'
```

### 3.3 S3 Lifecycle Policy

```json
{
  "Rules": [
    {
      "Id": "expire-daily-backups",
      "Prefix": "daily/",
      "Status": "Enabled",
      "Expiration": { "Days": 7 }
    },
    {
      "Id": "expire-weekly-backups",
      "Prefix": "weekly/",
      "Status": "Enabled",
      "Expiration": { "Days": 30 }
    },
    {
      "Id": "expire-monthly-backups",
      "Prefix": "monthly/",
      "Status": "Enabled",
      "Expiration": { "Days": 365 }
    }
  ]
}
```

---

## 4. Restore Procedure

### 4.1 Restore Command (from S3 Backup)

```bash
#!/bin/bash
# orca-restore.sh — Full database restore from S3 backup

DUMP_FILE="orca-daily-2026-06-10T02-00-00Z.dump"
BUCKET="orca-backups-me-central-1"
TARGET_DATABASE_URL="postgresql://neondb_owner:<PASSWORD>@ep-fragrant-dream-aqbliivf-pooler.c-8.us-east-1.aws.neon.tech:5432/neondb?sslmode=require"  # or restored test DB URL

# 1. Download from S3
aws s3 cp "s3://${BUCKET}/daily/${DUMP_FILE}" "./${DUMP_FILE}" --region me-central-1

# 2. Drop and recreate schema (in test DB — NEVER production without confirmation)
# psql "${TARGET_DATABASE_URL}" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# 3. Restore with pg_restore (parallel for speed, custom format supports it)
pg_restore \
  --dbname="${TARGET_DATABASE_URL}" \
  --clean \
  --if-exists \
  --no-owner \
  --no-acl \
  --jobs=4 \
  "./${DUMP_FILE}"

echo "Restore complete. Running verification..."
```

### 4.2 Verification Queries

```sql
-- Row count verification for critical tables
SELECT 'tenants'               AS table_name, COUNT(*) AS row_count FROM tenants
UNION ALL SELECT 'users',                   COUNT(*) FROM users
UNION ALL SELECT 'leads',                   COUNT(*) FROM leads
UNION ALL SELECT 'contracts',               COUNT(*) FROM contracts
UNION ALL SELECT 'units',                   COUNT(*) FROM units
UNION ALL SELECT 'rental_leases',           COUNT(*) FROM rental_leases
UNION ALL SELECT 'rental_invoices',         COUNT(*) FROM rental_invoices
UNION ALL SELECT 'payment_transactions',    COUNT(*) FROM payment_transactions
UNION ALL SELECT 'journal_entries',         COUNT(*) FROM journal_entries
UNION ALL SELECT 'account_balances',        COUNT(*) FROM account_balances
UNION ALL SELECT 'zatca_devices',           COUNT(*) FROM zatca_devices
UNION ALL SELECT 'audit_logs',              COUNT(*) FROM audit_logs
UNION ALL SELECT 'maintenance_tickets',     COUNT(*) FROM maintenance_tickets
ORDER BY table_name;
```

### 4.3 Health Check After Restore

```bash
# Hit the health endpoint
curl -s https://<restored-deployment>/api/v1/health | jq '.status, .responseTime, .checks.database'
# Expected: "online", latency <200ms, database.status = "connected"
```

---

## 5. Restore Test Protocol

### 5.1 Recovery Objectives

| Metric | Target | Description |
|--------|--------|-------------|
| **RPO** (Recovery Point Objective) | 24 hours | Maximum acceptable data loss = 1 day (daily backup interval) |
| **RTO** (Recovery Time Objective) | 2 hours | Time from incident detection to verified restore completion |

### 5.2 Test Schedule

**Frequency**: Quarterly (every 3 months)

**Procedure**:
1. Provision a fresh Neon database branch from the latest daily backup
2. Execute `pg_restore` as documented in Section 4.1
3. Run verification queries (Section 4.2) — compare row counts against production
4. Hit `/api/v1/health` on the test deployment — confirm HTTP 200 and DB connected
5. Log into the restored instance with superadmin credentials — confirm login works
6. Spot-check 3 tenants: verify their leads, contracts, and invoices load correctly
7. Document results in `BACKUP_RECOVERY_VALIDATION.md` (template already exists at repo root)

### 5.3 Success Criteria

- [ ] Database dump downloads from S3 without errors
- [ ] `pg_restore` completes with zero errors
- [ ] Critical table row counts match production (within RPO tolerance)
- [ ] Health endpoint returns HTTP 200 with `database.status: "connected"`
- [ ] Superadmin can authenticate and access the dashboard
- [ ] At least 3 tenants have verifiable data integrity

---

## 6. Gap Summary

| Gap | Severity | Mitigation |
|-----|----------|------------|
| No custom `pg_dump` scripts | **CRITICAL** | Implement daily/weekly/monthly dump schedule per Section 2 |
| Uploaded documents not backed up | **HIGH** | Migrate upload storage to S3; include in weekly/monthly tarballs |
| Environment variables not backed up | **HIGH** | Export Vercel env to encrypted file monthly; store in S3 alongside DB dump |
| Vercel config not exported | **MEDIUM** | `vercel.json` is in git; env vars needed from Vercel dashboard |
| ZATCA data — no separate archival | **CRITICAL** | Implement ZATCA-specific archive pipeline; 6-year retention per Saudi law |
| No off-region backup | **HIGH** | Configure S3 CRR from `me-central-1` to `eu-west-1` |
| Restore never tested | **HIGH** | Execute Section 5 quarterly |
| `DATABASE_URL` in `.env.production` uses `sslmode=require` | **MEDIUM** | Upgrade to `sslmode=verify-full` for production |

---

## 7. Immediate Actions

1. Create AWS S3 bucket `orca-backups-me-central-1` in `me-central-1` region with SSE-KMS encryption
2. Create IAM user/role with `s3:PutObject`, `s3:GetObject`, `s3:ListBucket` permissions scoped to this bucket
3. Write and test `orca-pg-dump.sh` against production Neon database
4. Schedule dump script via GitHub Actions, Vercel cron, or a dedicated EC2/Lightsail instance (Vercel cron max duration is 60s — pg_dump may exceed this for large databases)
5. Set up S3 lifecycle policy per Section 3.3
6. Enable S3 Cross-Region Replication to `eu-west-1`
7. Execute first quarterly restore test within 30 days
8. Export Vercel environment variables and store encrypted in S3 `monthly/orca-env-<date>.enc`
