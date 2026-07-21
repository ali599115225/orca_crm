# ORCA G6 Operations, Recovery & Reliability Register

## Purpose

This register is the current-source authority for repository-level operational readiness. Historical reports under `docs/reports/archive/` are context only because they contain contradictory and unverified claims about backup frequency, restore success, RTO, RPO, Neon retention, uploaded-file storage, and Production configuration.

## Stage boundary

- **Stage:** G6 — Operations, Recovery & Reliability
- **Repository start SHA:** `a0915efc78b28144f13d8fd7d04633586f18a721`
- **Production deployment authority:** not granted
- **Production database backup execution:** not performed
- **Production restore:** prohibited by the G6 restore command
- **Environment, secret, domain, Cron schedule, or Production data change:** none

## Accepted evidence classes

G6 accepts only:

1. current executable source;
2. current CI output and retained artifacts;
3. provider status inspected at the time of a release decision;
4. an authorized isolated restore drill with recorded duration and integrity checks.

A Markdown statement alone cannot establish that a backup exists or that a restore succeeded.

## Current operational surfaces

### Health

| Route | Purpose | Required behavior |
|---|---|---|
| `/api/health/live` | Process liveness | no database dependency, no-store response |
| `/api/health/ready` | Database readiness | parameterized `SELECT 1`, 503 on failure, request ID |
| `/api/health/deployment` | Deployment identity | environment and commit identity, no-store response |
| `/api/v1/health` | Legacy compatibility | minimal public health response |

### Scheduled Cron contracts

The authoritative schedules are in `vercel.json`:

- `/api/cron/sentinel` — `0 6 * * *`
- `/api/cron/zatca` — `0 4 * * *`
- `/api/cron/installments` — `0 8 * * *`
- `/api/cron/retention` — `0 3 * * *`
- `/api/cron/realtime-retention` — `17 3 * * *`
- `/api/cron/sentinel-heartbeats` — `0 9 * * *`

Every scheduled route must retain:

- a shared-secret or trusted-job boundary;
- direct current test evidence;
- an explicit success/failure response contract;
- no client-controlled Tenant scope;
- heartbeat evidence when the task represents a monitored service.

Cron routes present in source but absent from `vercel.json` are classified as manual, compatibility, or disabled. They are not treated as scheduled merely because the route exists.

## Backup contract

`scripts/g6-backup-plan.mjs` is the canonical database backup entrypoint.

Safety properties:

- defaults to `PLAN_ONLY`;
- uses `spawnSync` with fixed executable and argument arrays, never shell interpolation;
- requires `ORCA_G6_BACKUP_EXECUTE=true` and `ORCA_G6_CHANGE_APPROVED=true` to execute;
- requires `ORCA_G6_PRODUCTION_APPROVED=true` when the runtime identifies Production;
- reads `DIRECT_URL` before `DATABASE_URL` without printing credentials;
- creates a PostgreSQL custom-format dump;
- verifies the archive with `pg_restore --list`;
- records size and SHA-256 in a manifest;
- never deletes the local archive automatically;
- uploads to S3 only with explicit `--upload-s3` and configured bucket credentials;
- applies SSE-KMS when a KMS key is provided, otherwise SSE-S3.

`scripts/backup-db.sh` remains only as a compatibility wrapper and delegates to the canonical command. Its default behavior is also plan-only.

## Restore drill contract

`scripts/g6-restore-drill.mjs` is the canonical isolated restore drill.

Safety properties:

- defaults to `PLAN_ONLY`;
- requires `ORCA_G6_RESTORE_EXECUTE=true`;
- requires `ORCA_G6_CHANGE_APPROVED=true`;
- requires `ORCA_G6_RESTORE_CONFIRM=RESTORE_NON_PRODUCTION`;
- refuses execution when `NODE_ENV`, `VERCEL_ENV`, or `ORCA_ENV` is `production`;
- refuses a target URL equal to `DATABASE_URL` or `DIRECT_URL`;
- validates the dump with `pg_restore --list` before restoration;
- does not use `--clean`, drop databases, drop schemas, or run destructive SQL;
- performs a post-restore `SELECT 1` connectivity probe;
- records duration and result evidence beside the dump.

## CI recovery evidence

ORCA CI must run an actual isolated recovery drill using a temporary PostgreSQL service:

1. create an isolated source database;
2. insert a deterministic probe record;
3. execute the gated backup command;
4. create a separate empty restore database;
5. execute the gated restore drill against that separate target;
6. verify the probe record after restoration;
7. upload the dump manifest and restore result as short-lived CI artifacts.

This is repository recovery evidence. It is not a claim that Production credentials, Neon snapshots, S3 retention, or Production restore were exercised.

## Provider recovery policy

Neon point-in-time restore and snapshots are provider capabilities whose retention depends on the active plan and current project settings. G6 does not hard-code historical retention claims. At activation, the operator must inspect and record:

- project plan;
- configured instant-restore/history window;
- scheduled snapshot policy, if available;
- snapshot retention and expiration;
- branch/region topology;
- the selected Production recovery point before any risky change.

Logical `pg_dump` archives complement provider PITR; they do not replace it.

## RTO and RPO policy

No fixed RTO or RPO is accepted from archived reports. Initial targets remain **UNVERIFIED** until an authorized rehearsal records:

- dataset size and row counts;
- backup duration and archive size;
- restore duration;
- integrity checks;
- application readiness time;
- the provider restore window in force at that date.

G8 must score Production activation as conditional or blocked if these values remain unverified.

## Change rule

Any change to Cron schedules, Cron routes, health endpoints, backup/restore commands, provider recovery assumptions, operational environment gates, or CI recovery evidence must update this register and pass the G6 executable gate.
