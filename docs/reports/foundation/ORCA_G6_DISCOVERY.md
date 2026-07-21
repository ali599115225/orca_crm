# ORCA G6 Discovery — Operations, Recovery & Reliability

## Stage record

- **Stage:** G6 — Operations, Recovery & Reliability
- **Start SHA:** `a0915efc78b28144f13d8fd7d04633586f18a721`
- **Working branch:** `work/orca-foundation-plan-20260721`
- **Target branch:** `work/orca-central-baseline-execution-20260719`
- **Status:** DISCOVERY CLOSED / IMPLEMENTATION IN PROGRESS
- **Production action:** none

## Scope

G6 owns:

- health and deployment readiness evidence;
- scheduled Cron reliability contracts;
- backup command safety;
- restore-drill safety;
- isolated recovery evidence;
- current provider recovery assumptions;
- durable runbooks and RTO/RPO ownership.

## Current-source findings

### Existing strengths

- Liveness, database readiness, deployment identity, and legacy health routes exist.
- Six Cron routes are scheduled in `vercel.json`.
- Scheduled Cron routes carry shared-secret or trusted-job boundaries and current tests.
- Sentinel heartbeats cover the primary scheduled operational services.
- G3 already requires an isolated restored dataset before database rehearsal.
- GitHub CI, CodeQL, dependency audit, typecheck, acceptance tests, and build are blocking.

### Blocking gap found

The existing `scripts/backup-db.sh` was not safe enough to serve as an operational contract:

- execution occurred immediately with no plan-only mode;
- no explicit change or Production approval gate existed;
- it was described as suitable for Vercel Cron even though the required `pg_dump` and AWS CLI runtime was not established;
- it claimed to keep a local backup when S3 was absent but deleted the temporary file unconditionally;
- retention deletion was embedded in the backup command;
- no restore command existed.

### Historical evidence conflict

Archived reports contain mutually incompatible claims, including:

- no custom backup exists;
- a custom backup script exists;
- restores were never tested;
- multiple restores passed with precise row counts and RTO values;
- Neon retention ranges from one day to seven days, thirty days, or longer;
- weekly/monthly exports are both described as active and merely recommended.

No execution artifact accompanies those claims. G6 therefore marks all archived backup and recovery reports as historical context only.

## Implemented G6 direction

1. Replace the legacy backup entrypoint with a compatibility wrapper that defaults to plan-only.
2. Add a canonical Node backup command using fixed process arguments and explicit gates.
3. Add a canonical restore drill that refuses Production and source-target equality.
4. Produce SHA-256 and integrity evidence for every executed dump.
5. Add a real isolated PostgreSQL backup/restore probe to GitHub Actions.
6. Generate a current Cron, health, backup, restore, and documentation inventory on every PR.
7. Retain Production provider settings, Production backup execution, Production restore, and environment changes outside repository automation.

## Provider facts requiring activation-time confirmation

Neon supports point-in-time recovery and snapshot workflows, but the effective recovery window and snapshot retention depend on the current plan and project configuration. G6 must not freeze historical provider values into the repository as if they were guaranteed.

At activation, record:

- current Neon plan;
- configured instant-restore/history window;
- scheduled snapshot policy and retention;
- Production root branch and region;
- most recent successful recovery point;
- measured isolated restore duration.

## Closure criteria

G6 becomes repository-ready only when:

1. the inventory reports zero blocking findings;
2. backup and restore commands remain plan-only by default;
3. Production restore remains structurally refused;
4. all scheduled Cron routes have route, auth, and test evidence;
5. health contracts remain present;
6. the isolated CI backup/restore drill restores a deterministic probe record;
7. ORCA CI, G3/G4/G5/G6 gates, CodeQL, acceptance, and build pass;
8. Vercel succeeds on the central merge candidate;
9. no Production data, environment, secret, domain, migration, or deploy action occurs.

Actual Production RTO/RPO remain activation evidence and feed G8 scoring.
