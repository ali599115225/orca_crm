# ORCA G6 Backup & Restore Runbook

## Authority

This runbook defines repository-approved rehearsal steps. It does **not** authorize a Production backup, restore, database switch, environment change, deployment, or data write.

## 1. Required roles

Before any execution identify:

- change approver;
- backup operator;
- restore operator;
- application verifier;
- rollback owner.

One person may hold multiple roles in a single-owner project, but each decision must still be recorded explicitly.

## 2. Backup plan-only check

From the selected repository SHA:

```bash
node scripts/g6-backup-plan.mjs --type manual
```

Expected result:

- mode is `PLAN_ONLY`;
- no database connection occurs;
- no file is created;
- no provider call occurs.

The legacy entrypoint is equivalent:

```bash
bash scripts/backup-db.sh manual
```

## 3. Isolated logical backup execution

Use only a reviewed isolated or approved target.

```bash
ORCA_G6_BACKUP_EXECUTE=true \
ORCA_G6_CHANGE_APPROVED=true \
DIRECT_URL='postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require' \
node scripts/g6-backup-plan.mjs \
  --execute \
  --type manual \
  --output-dir artifacts/g6-backups
```

Production additionally requires:

```bash
ORCA_G6_PRODUCTION_APPROVED=true
```

Required outputs:

- `orca-<type>-<timestamp>.dump`;
- adjacent `.manifest.json`;
- successful `pg_restore --list` integrity verification;
- SHA-256 and byte size in the manifest.

The command never deletes the local archive automatically.

## 4. Optional object-storage upload

Upload is separate and explicit:

```bash
ORCA_G6_BACKUP_EXECUTE=true \
ORCA_G6_CHANGE_APPROVED=true \
DIRECT_URL='postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require' \
S3_BACKUP_BUCKET='approved-bucket' \
AWS_REGION='me-central-1' \
S3_BACKUP_KMS_KEY_ID='approved-kms-key-id' \
node scripts/g6-backup-plan.mjs \
  --execute \
  --type manual \
  --output-dir artifacts/g6-backups \
  --upload-s3
```

Do not place credentials, connection strings, bucket policies, or KMS keys in Git history or CI artifacts.

Retention deletion belongs to an independently reviewed bucket lifecycle policy. The backup script does not delete objects.

## 5. Restore drill plan-only check

```bash
node scripts/g6-restore-drill.mjs --backup-file artifacts/g6-backups/example.dump
```

Expected result:

- mode is `PLAN_ONLY`;
- no target connection occurs;
- no restore occurs.

## 6. Isolated restore execution

Create a new empty non-Production database. Never use the source database as the target.

```bash
ORCA_G6_RESTORE_EXECUTE=true \
ORCA_G6_CHANGE_APPROVED=true \
ORCA_G6_RESTORE_CONFIRM=RESTORE_NON_PRODUCTION \
DATABASE_URL='postgresql://SOURCE_USER:SOURCE_PASSWORD@SOURCE_HOST:5432/SOURCE_DB?sslmode=require' \
DIRECT_URL='postgresql://SOURCE_USER:SOURCE_PASSWORD@SOURCE_HOST:5432/SOURCE_DB?sslmode=require' \
ORCA_G6_RESTORE_DATABASE_URL='postgresql://RESTORE_USER:RESTORE_PASSWORD@RESTORE_HOST:5432/EMPTY_RESTORE_DB?sslmode=require' \
node scripts/g6-restore-drill.mjs \
  --execute \
  --backup-file artifacts/g6-backups/orca-manual-TIMESTAMP.dump
```

The command refuses:

- Production runtime markers;
- a target equal to `DATABASE_URL` or `DIRECT_URL`;
- a missing confirmation token;
- a missing or invalid archive.

It does not use `--clean` and does not drop a database or schema.

## 7. Mandatory integrity checks

After an isolated restore, record at minimum:

1. restore duration from the generated `.restore-drill.json`;
2. database connectivity;
3. schema table count;
4. Prisma migration status;
5. counts for Tenant/company, users, leads, contracts, invoices, payments, audit logs, ZATCA queue, and documents where present;
6. financial reconciliation checks;
7. health readiness against an isolated application runtime;
8. secrets rotation or masking for any restored non-Production data.

Do not publish row-level customer data in reports or CI artifacts.

## 8. Provider PITR/snapshot rehearsal

At the time of rehearsal inspect the current Neon project settings. Record the active history/instant-restore window and snapshot schedule instead of relying on historical reports.

Preferred safe sequence:

1. select a recovery timestamp or snapshot;
2. preview or restore into a separate temporary branch first;
3. inspect schema and representative counts;
4. connect an isolated application runtime;
5. verify `/api/health/ready`;
6. measure elapsed time;
7. delete or expire the temporary branch only after evidence is retained.

A Production branch reset or endpoint switch requires a separate approved incident/release action.

## 9. Application rollback

Application rollback and database recovery are independent:

- application-only failure: roll back to a known-good Vercel deployment and verify health;
- data corruption: stop writes, identify the recovery point, and use provider or logical recovery under explicit approval;
- migration failure: disable affected features, restore or roll forward based on reviewed evidence;
- provider outage: follow provider incident status and avoid repeated destructive recovery attempts.

## 10. Stop conditions

Stop immediately when:

- the target might be Production;
- source and restore URLs match;
- archive integrity verification fails;
- the restore target is not empty or ownership is unclear;
- row counts or financial totals are unexplained;
- the provider recovery window is unknown;
- secrets cannot be masked in the isolated environment;
- the selected SHA differs from the approved SHA.

## 11. Evidence package

Retain:

- selected repository SHA;
- plan-only output;
- dump manifest without secrets;
- restore result without secrets;
- integrity/count summary;
- measured RTO and RPO inputs;
- approver and operator record;
- rollback decision.

Production credentials and dump archives must not be uploaded as public GitHub Actions artifacts.
