# Backup & Disaster Recovery Report – ORCA CRM

**Date:** 2026-06-09
**Engineer:** Principal SaaS Architect
**Database:** Neon (PostgreSQL)

---

## Current State

| Component | Status | Details |
|-----------|--------|---------|
| Daily backup | ⚠️ Neon built-in | Enabled by default, no custom verification |
| Weekly full backup | ⚠️ Neon built-in | Point-in-time recovery available |
| Restore procedures | ❌ Not documented | No runbook exists |
| Backup monitoring | ❌ Not configured | No alerts on backup failure |
| Off-site backup | ⚠️ | Neon stores in multiple availability zones |
| **Backup Score** | **5/10** | **Depends entirely on Neon defaults** |

---

## 1. Neon Built-in Backup

Neon provides **point-in-time recovery (PITR)** by default:

| Feature | Details |
|---------|---------|
| Retention | 7 days of PITR |
| Full backups | Weekly (automatic) |
| WAL archiving | Continuous |
| Recovery point | Any second within 7 days |
| Storage | Redundant across AZs |
| Cross-region | ❌ Not configured (single region us-east-1) |

### What's Missing

1. **No custom backup script** – No `pg_dump` or database export anywhere in the codebase
2. **No restore testing** – Recovery has never been tested
3. **No backup of environment variables** – `.env.production` has gitignored secrets with no backup
4. **No backup of uploaded files** – `public/documents/` directory not backed up
5. **No backup monitoring** – No alerts if Neon backup fails
6. **No off-site/region backup** – Single-region deployment

---

## 2. Backup Strategy

### 2.1 Database Backup

#### Automated Daily Dump

Create `scripts/backup-db.sh`:

```bash
#!/bin/bash
# Daily database backup script
# Schedule: Daily at 03:00 (via Vercel Cron or external cron)

BACKUP_DIR="/backups/database"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_URL=$DATABASE_URL

# Full backup
pg_dump "$DB_URL" \
  --no-owner \
  --no-acl \
  --format=custom \
  --file="$BACKUP_DIR/orca_${TIMESTAMP}.dump"

# Encrypt backup
gpg --encrypt --recipient admin@orca.az-ez.pro \
  "$BACKUP_DIR/orca_${TIMESTAMP}.dump"

# Upload to S3-compatible storage
aws s3 cp "${BACKUP_DIR}/orca_${TIMESTAMP}.dump.gpg" \
  "s3://orca-backups/database/"

# Retention: keep 30 daily, 12 monthly
find "$BACKUP_DIR" -name "orca_*.dump*" -mtime +30 -delete
```

#### Critical Data Export

```typescript
// script/export-critical-data.ts
// Export tenant configurations, credentials, and settings separately
import { prisma } from '@/lib/prisma';

async function exportCriticalData() {
  const tenants = await prisma.tenant.findMany({
    select: {
      id: true,
      companyName: true,
      subdomain: true,
      vatNumber: true,
      subscriptionPlan: true,
      // Exclude encrypted credentials (backed up separately)
    },
  });
  // Write to encrypted JSON
}
```

### 2.2 Environment Variables Backup

```bash
# Current .env.production is only in local + Vercel
# Backup to encrypted storage:
aws s3 cp .env.production s3://orca-backups/env/
```

### 2.3 Uploaded Files Backup

```bash
# Files stored in public/documents/ need backup
aws s3 sync ./public/documents s3://orca-backups/documents/
```

---

## 3. Restore Procedures

### 3.1 Database Restore

```bash
#!/bin/bash
# Restore procedure
# 1. Identify backup file
BACKUP_FILE="orca_20260609_030000.dump"
# 2. Decrypt
gpg --decrypt "${BACKUP_FILE}.gpg" > "$BACKUP_FILE"
# 3. Restore to new database
pg_restore \
  --no-owner \
  --no-acl \
  --dbname="postgresql://new-db-url" \
  --jobs=4 \
  "$BACKUP_FILE"
# 4. Verify restore
psql "$NEW_DB_URL" -c "SELECT count(*) FROM tenants;"
```

### 3.2 Point-in-Time Recovery (Neon)

```sql
-- Neon Console: Restore to point in time
-- 1. Go to Neon Console → Branches → Restore
-- 2. Select timestamp
-- 3. Create new branch
-- 4. Update DATABASE_URL to new branch connection string

-- Or via API:
curl -X POST https://console.neon.tech/api/v2/projects/{project_id}/branches \
  -H "Authorization: Bearer {api_key}" \
  -H "Content-Type: application/json" \
  -d '{"endpoint":{"type":"read_write"},"branch_name":"restore-20260609"}'
```

### 3.3 Full Disaster Recovery

```markdown
# DISASTER RECOVERY RUNBOOK

## Scenario: Complete data loss

1. **Create new Neon project**
   - Region: us-east-1 (same as current)
   - Create from backup or PITR

2. **Restore database**
   ```bash
   pg_restore [backup_file] --dbname=$NEW_DATABASE_URL
   ```

3. **Update environment variables**
   - Deploy new `.env.production` with new DATABASE_URL
   - Re-encrypt ZATCA credentials with new ENCRYPTION_KEY

4. **Verify tenant data**
   ```sql
   SELECT count(*), count(DISTINCT tenant_id) FROM accounts;
   SELECT count(*) FROM journal_entries WHERE status = 'POSTED';
   ```

5. **Verify financial integrity**
   ```sql
   -- Check debit = credit across all entries
   SELECT je.id, SUM(jl.debit) - SUM(jl.credit) AS difference
   FROM journal_entries je
   JOIN journal_lines jl ON jl.journal_entry_id = je.id
   GROUP BY je.id
   HAVING ABS(SUM(jl.debit) - SUM(jl.credit)) > 0.01;
   ```

6. **Run application smoke tests**
   - Login
   - View dashboard
   - Create invoice
   - Run trial balance

7. **Update DNS if needed**
   - Point `orca.az-ez.pro` to new deployment

## Recovery Time Objective: 4 hours
## Recovery Point Objective: 24 hours (or 7 days with Neon PITR)
```

---

## 4. Backup Schedule

| Backup Type | Frequency | Retention | Location | Method |
|-------------|-----------|-----------|----------|--------|
| Database (full) | Daily 03:00 | 30 days | S3 + Neon | `pg_dump` + Neon PITR |
| Database (WAL) | Continuous | 7 days | Neon | Neon WAL archiving |
| Environment vars | On change | 90 days | S3 (encrypted) | Manual or CI/CD |
| Uploaded files | Daily 04:00 | 30 days | S3 | `aws s3 sync` |
| Tenant configs | Weekly Sun 05:00 | 12 months | S3 (encrypted) | Custom script |

---

## 5. Restore Testing

### First Restore Test: Prerequisites

- [ ] S3 bucket with versioning enabled
- [ ] IAM credentials for backup/restore
- [ ] GPG key pair generated and stored securely
- [ ] Neon API key for automated branch creation
- [ ] Test environment (staging DB) for restore validation

### Test Procedure

```bash
# Step 1: Take current backup
./scripts/backup-db.sh

# Step 2: Create test database
createdb orca_restore_test

# Step 3: Restore to test database
pg_restore --dbname=orca_restore_test /backups/latest.dump

# Step 4: Run validation queries
psql orca_restore_test -f verify_migration.sql

# Step 5: Compare record counts
psql orca_restore_test -c "
  SELECT 'tenants', count(*) FROM tenants
  UNION ALL SELECT 'users', count(*) FROM users
  UNION ALL SELECT 'accounts', count(*) FROM accounts
  UNION ALL SELECT 'journal_entries', count(*) FROM journal_entries
  UNION ALL SELECT 'rental_invoices', count(*) FROM rental_invoices;
"

# Step 6: Drop test database
dropdb orca_restore_test
```

---

## 6. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Database corruption | Low | Critical | Neon PITR within 7 days |
| Accidental data deletion | Medium | High | PITR + daily backups |
| Region outage | Low | Critical | Multi-region backup (not configured) |
| Backup failure | Low | High | Monitoring alerts |
| Credentials loss | Low | Critical | Encrypted backup + password manager |
| Ransomware | Low | Critical | Immutable S3 backups |

---

## 7. Score Assessment

| Component | Current | Target | Status |
|-----------|---------|--------|--------|
| Daily backup | ⚠️ 6/10 | 9/10 | Neon built-in, no custom script |
| Weekly full backup | ⚠️ 6/10 | 9/10 | Neon built-in, no verification |
| Restore procedures | ❌ 2/10 | 9/10 | Not documented |
| Restore testing | ❌ 0/10 | 8/10 | Never performed |
| File backup | ❌ 2/10 | 8/10 | Not configured |
| Env backup | ❌ 3/10 | 8/10 | Manual only |
| **Overall** | **3/10** | **8.5/10** | **❌ Needs implementation** |
