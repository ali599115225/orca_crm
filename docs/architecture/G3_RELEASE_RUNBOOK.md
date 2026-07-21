# ORCA G3 Release, Rehearsal, and Rollback Runbook

- **Program:** ORCA Foundation G3
- **Repository closure:** G3-10
- **Production execution authority:** not granted by this document
- **Required operating model:** single independent company

## 1. Purpose

This runbook defines the only approved sequence for rehearsing and later proposing the G3 organization/RBAC changes. Repository merge, CI success, and Vercel preview success do not mean that a Production migration, backfill, RBAC rollout, backup, restore, or deployment occurred.

## 2. Preconditions for any database rehearsal

A release operator must have:

1. an isolated PostgreSQL database that is not Production;
2. a representative restored dataset with secrets rotated or removed;
3. the exact central-branch SHA selected for rehearsal;
4. a documented restore point for the isolated database;
5. `DIRECT_URL` pointing only to the isolated target;
6. confirmation that `NODE_ENV` and `VERCEL_ENV` are not `production`;
7. no browser/client-supplied Tenant scope in any script input;
8. a rollback owner and stop conditions.

## 3. Isolated rehearsal order

### Step A — Baseline evidence

- Record schema version, row counts, active Tenant count, active user count, and legacy role distribution.
- Run the existing tenant-isolation, authorization, Sentinel, P2 acceptance, and production-build gates.
- Confirm G3 enforcement domains are disabled.

### Step B — Additive schema

- Review `20260721010000_g3_rbac_expand/migration.sql`.
- Apply it only to the isolated database using a reviewed migration runner.
- Do not use `prisma db push`.
- Run `npx prisma validate` and `npx prisma generate`.

### Step C — Backfill dry-run

Run:

```text
node --import tsx scripts/g3-rbac-backfill.ts --dry-run --batch-size=100
```

Reconcile:

- permission count;
- Tenant count;
- users per Tenant;
- expected organization assignments;
- expected role assignments;
- expected role-permission mappings.

No apply is allowed while counts are unexplained.

### Step D — Isolated backfill apply

Only in the isolated database:

```text
G3_BACKFILL_TARGET=isolated-test
ALLOW_G3_BACKFILL_WRITE=true
node --import tsx scripts/g3-rbac-backfill.ts --apply --batch-size=100
```

Then:

- rerun the same apply command;
- require no duplicate roles, assignments, or mappings;
- compare before/after counts;
- verify every legacy user maps to one supported role blueprint;
- verify active and expiry windows.

### Step E — Constraint preflight

Run `scripts/g3-rbac-constraint-preflight.sql` read-only.

Required result:

```text
total_integrity_violations = 0
```

Any non-zero count is a stop condition. Repair must be separately reviewed; do not weaken constraints to hide violations.

### Step F — Indexes and NOT VALID constraints

Review and execute `20260721020000_g3_rbac_constraints_indexes/migration.sql` with a runner that does not wrap concurrent indexes in a transaction.

Record:

- index build duration;
- invalid-index status after each build;
- lock waits;
- statement failures;
- retry decisions.

### Step G — Controlled validation

Run `scripts/g3-rbac-constraint-validate.sql` one constraint per controlled maintenance transaction.

After each constraint:

- record duration and lock waits;
- stop on elevated contention;
- rerun the zero-violation preflight;
- verify application reads and writes.

### Step H — Audit mode

In an isolated/staging runtime only:

```text
G3_RBAC_AUDIT_MODE=enabled
```

Database persistence is optional and separately gated:

```text
G3_RBAC_AUDIT_PERSIST=true
```

Require zero unexplained unexpected grants and denials for selected boundaries. Logs must contain no request bodies, credentials, messages, documents, phone numbers, or email addresses.

### Step I — Progressive enforcement

Enable one domain at a time in this order:

1. `users-settings`
2. `finance`
3. `messaging`
4. `sales`
5. `jobs`

Required acknowledgement:

```text
G3_RBAC_ENFORCEMENT_ACK=G3-07-DUAL-ALLOW
G3_RBAC_ENFORCE_DOMAINS=<one-domain>
```

Production additionally requires a separate approved release decision and:

```text
G3_RBAC_PRODUCTION_APPROVAL=approved
```

The effective decision remains `legacy_allow AND rbac_allow`.

## 4. Mandatory direct-request tests

For each enabled domain test:

- missing session;
- malformed session;
- inactive user;
- inactive Tenant;
- expired role assignment;
- missing permission;
- wrong branch/department/team;
- wrong owner/resource;
- cross-tenant resource ID;
- legacy denial with RBAC allow;
- RBAC evaluation failure;
- job request without the existing trusted secret.

Every denial must occur before sensitive persistence or provider calls.

## 5. Rollback order

1. Remove the affected domain from `G3_RBAC_ENFORCE_DOMAINS`.
2. If needed, remove `G3_RBAC_ENFORCEMENT_ACK` to disable every domain.
3. Disable G3 audit persistence and audit mode.
4. Revert application commits through normal Git history.
5. If database constraints cause an independently verified operational problem, run `g3-rbac-constraint-rollback.sql` under a separate database change approval.
6. Restore the isolated database when rehearsal evidence is no longer trustworthy.

Do not delete RBAC tables or historical SaaS data as a rollback shortcut.

## 6. Production backup and restore gate

Before any Production migration proposal:

- confirm a provider snapshot or backup is restorable;
- rehearse restoration into an isolated target;
- record restore duration and integrity checks;
- identify recovery-point and recovery-time objectives;
- document who may authorize restore;
- keep application rollback independent from database rollback.

G3 repository work does not claim this gate has been completed.

## 7. Final repository verification

`node scripts/g3-final-verification.mjs` must pass and report:

- zero untrusted Tenant/company-scope violations;
- only explicitly reviewed platform-target exceptions;
- zero destructive statements in G3 migrations;
- zero Production migration/deploy/force-push commands in workflows;
- all G3 closure reports present;
- enforcement disabled by default;
- Production enforcement separately gated;
- backfill dry-run and Production-write protections intact;
- legacy SaaS disabled.

## 8. Closure versus activation

G3 is repository-closed when the G3-10 PR passes all required checks and merges into the central branch. G3 is not Production-active until a separate release authorizes and evidences the database, environment, backup, restore, and deployment steps above.
