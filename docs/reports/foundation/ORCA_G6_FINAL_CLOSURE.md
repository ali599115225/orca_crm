# ORCA G6 Final Closure

## Stage record

- **Stage:** G6 — Operations, Recovery & Reliability
- **Repository status:** PASS / READY FOR FINAL CHECKS
- **Start SHA:** `a0915efc78b28144f13d8fd7d04633586f18a721`
- **Verified implementation head:** `b60a8b588fc44261885ce2faafa219d27072937d`
- **Source branch:** `work/orca-foundation-plan-20260721`
- **Target branch:** `work/orca-central-baseline-execution-20260719`
- **PR:** #66
- **Main baseline:** `f7af072c689178d397019648ab5c21336ab259b6`
- **Production backup:** none
- **Production restore:** none
- **Production migration/backfill/data write:** none
- **Production environment/secret/domain change:** none
- **Production deploy:** none
- **Cron schedule change:** none

## Delivered controls

G6 establishes current executable controls for:

- health liveness, database readiness, and deployment identity;
- scheduled Cron route, authentication, test, and heartbeat evidence;
- plan-only database backup by default;
- explicit backup execution and Production approval gates;
- custom-format PostgreSQL dumps with `pg_restore --list` integrity verification;
- SHA-256 and byte-size backup manifests;
- optional explicit S3 upload with encrypted-at-rest configuration;
- no automatic deletion of local archives or object-store backups;
- plan-only restore drills by default;
- structural refusal of Production restore;
- refusal of source-target database equality;
- isolated restore without `--clean`, schema drop, or database drop;
- post-restore connectivity and deterministic data verification;
- retained CI evidence for each pull request;
- durable operations/recovery register and runbook.

## Cron reliability result

The current inventory records **8** Cron route sources:

- **6** scheduled by `vercel.json`;
- **2** manual or disabled compatibility routes;
- **6/6** scheduled contracts classified `READY`;
- **0** scheduled routes missing source, authentication/trusted-job evidence, or direct current tests.

The scheduled routes are:

| Route | Schedule | Evidence status |
|---|---|---|
| `/api/cron/sentinel` | `0 6 * * *` | READY |
| `/api/cron/zatca` | `0 4 * * *` | READY |
| `/api/cron/installments` | `0 8 * * *` | READY |
| `/api/cron/retention` | `0 3 * * *` | READY |
| `/api/cron/realtime-retention` | `17 3 * * *` | READY |
| `/api/cron/sentinel-heartbeats` | `0 9 * * *` | READY |

The unscheduled `/api/cron/billing` compatibility route remains disabled for the single-company operating model. `/api/cron/revenue-integrity` remains a manual or disabled route and is not falsely represented as scheduled.

## Health result

All **4/4** current health contracts are present:

- `/api/health/live` — process liveness without database dependency;
- `/api/health/ready` — database `SELECT 1`, request ID, no-store response, and 503 on failure;
- `/api/health/deployment` — environment and commit identity;
- `/api/v1/health` — legacy compatibility response.

## Backup safety result

The previous `scripts/backup-db.sh` was not accepted as safe operational evidence because it executed immediately and removed the generated local archive even when S3 was absent.

G6 replaced it with a compatibility wrapper that delegates to `scripts/g6-backup-plan.mjs`.

The canonical backup command:

- reports `PLAN_ONLY` unless `--execute` is supplied;
- requires `ORCA_G6_BACKUP_EXECUTE=true`;
- requires `ORCA_G6_CHANGE_APPROVED=true`;
- requires `ORCA_G6_PRODUCTION_APPROVED=true` when Production markers are present;
- uses fixed executable and argument arrays without shell interpolation;
- verifies every dump with `pg_restore --list`;
- retains the local archive;
- emits a manifest with size and SHA-256;
- uploads only with explicit `--upload-s3`.

## Restore safety result

The canonical restore command `scripts/g6-restore-drill.mjs`:

- reports `PLAN_ONLY` by default;
- requires `ORCA_G6_RESTORE_EXECUTE=true`;
- requires `ORCA_G6_CHANGE_APPROVED=true`;
- requires `ORCA_G6_RESTORE_CONFIRM=RESTORE_NON_PRODUCTION`;
- refuses `NODE_ENV`, `VERCEL_ENV`, or `ORCA_ENV` equal to `production`;
- refuses a restore target equal to `DATABASE_URL` or `DIRECT_URL`;
- verifies the archive before restore;
- does not use `--clean` or destructive drop operations;
- records duration and a post-restore `SELECT 1` probe.

## Isolated recovery drill evidence

ORCA CI run `29846114718` executed a real backup and restore using an ephemeral PostgreSQL 16 service and synthetic data only.

Evidence:

- source database: `orca_g6_source`;
- separate restore database: `orca_g6_restore`;
- deterministic table: `g6_recovery_probe`;
- deterministic payload: `orca-g6-ci`;
- dump format: PostgreSQL custom;
- dump size: **1,886 bytes**;
- dump SHA-256: `a7333b753c1c74528c9103c0e99a6a5567caea47841f46004b989bf5a9684fe9`;
- archive integrity: `pg_restore --list` PASS;
- restore duration: **82 ms** for the synthetic probe dataset;
- post-restore connectivity: `SELECT 1` PASS;
- restored payload verification: `orca-g6-ci` PASS;
- Production restore refusal flag retained: true.

The measured 82 ms is CI synthetic evidence only. It is not represented as a Production RTO.

## Historical evidence reconciliation

Archived reports under `docs/reports/archive/` contain contradictory, unsupported statements about backup existence, provider retention, successful restore drills, exact row counts, RTO, RPO, S3 archives, and Production configuration.

G6 classifies those documents as historical context only. Current readiness claims require executable source, retained CI artifacts, live provider inspection, or an authorized isolated rehearsal.

## Provider recovery ownership

Neon point-in-time recovery and snapshot capabilities depend on the current plan and project settings. G6 intentionally does not freeze historical retention values into the repository.

Before Production activation or a risky database change, the operator must record:

- current Neon plan;
- current history/instant-restore window;
- snapshot schedule and retention, if configured;
- Production root branch and region;
- selected recovery point;
- an isolated restored branch/database;
- representative integrity counts;
- measured application readiness duration.

Production RTO and RPO remain **UNVERIFIED** until that authorized rehearsal. This remains explicit evidence for G8 rather than being converted into a false passing claim.

## Verified checks

Head `b60a8b588fc44261885ce2faafa219d27072937d` passed:

- Node.js 24 installation;
- Prisma validate and generate;
- Production safety gate;
- G3 final verification;
- G4 inventory, normalization, and reconciliation;
- G5 security and quality inventory;
- Production dependency audit;
- TypeScript typecheck;
- G5 executable tests;
- G6 operational inventory with zero blocking findings;
- all **6/6** G6 executable tests;
- isolated PostgreSQL backup/restore drill;
- foundation and core regressions;
- all Sentinel regressions;
- P2 acceptance;
- production build;
- CodeQL Actions, Python, and JavaScript/TypeScript.

## Durable outputs

- `docs/architecture/ORCA_G6_OPERATIONS_RECOVERY_REGISTER.md`;
- `docs/runbooks/ORCA_G6_BACKUP_RESTORE_RUNBOOK.md`;
- `docs/reports/foundation/ORCA_G6_DISCOVERY.md`;
- `docs/reports/foundation/ORCA_G6_FINAL_CLOSURE.md`;
- `scripts/g6-operational-reliability-inventory.mjs`;
- `scripts/g6-backup-plan.mjs`;
- `scripts/g6-restore-drill.mjs`;
- `tests/foundation/g6-operational-reliability.test.ts`;
- retained CI inventory, test, dump-manifest, restore-result, and deterministic-probe evidence.

## Residual ownership

- **Activation/release:** verify current Neon recovery settings and rehearse a representative isolated restore before any risky Production database change.
- **G8 — Final Foundation Gate:** score unverified Production RTO/RPO, provider recovery evidence, remaining direct-test gaps, and remaining visual evidence.
- Object-storage retention, lifecycle policy, access policy, KMS key ownership, and scheduled Production backup execution require separate infrastructure approval.

## Closure rule

G6 becomes repository-closed only after:

1. this final documentation head passes ORCA CI, G6 inventory/tests, isolated recovery drill, regressions, acceptance, and production build;
2. CodeQL succeeds for all configured languages;
3. PR #66 merges into the central branch;
4. Vercel Preview succeeds on the central merge SHA;
5. the foundation branch is fast-forwarded to the central merge SHA;
6. central and foundation compare identical;
7. `main` remains unchanged.

Until those conditions are reconciled, this report remains **PASS / READY FOR FINAL CHECKS**.
