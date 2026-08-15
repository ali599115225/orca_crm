# ORCA W1F — Isolated Migration Readiness Gate

Status: FROZEN FOR W1F NON-PRODUCTION VERIFICATION

Base: `dc51a4ce0ef2f6b8f47535cbe511dc82101c5dcc`

Pre-W1A reference: `50266d2122c966d0fa48f0d1b789e6ed5916b68c`

W1F follows the verified W1E merge. It does not create STEP 15 or reopen STEP 0–14.

## Objective

Prove the W1 Contract Studio / Finance Case persistence migrations are operationally ready **without touching production or customer data**.

W1F verifies two independent PostgreSQL 16 rehearsals:

1. **Repository migration replay** — replay the repository migration history on a fresh isolated database, recover only the frozen historical non-transactional G3 migration exactly as its own execution contract requires, require migration status success, and classify remaining historical schema divergence. Any drift touching a W1 table or W1 unique index fails closed.
2. **Targeted W1 upgrade rehearsal** — materialize the exact pre-W1A Prisma schema, fingerprint all legacy columns/constraints, apply W1A, W1D, and the W1 schema-alignment migration, require the legacy fingerprint to remain unchanged, require all ten W1 tables + two W1D unique indexes to exist, and require **zero Prisma-supported drift** against the current multi-file Prisma schema.

## Frozen / additive migration identities

- Historical non-transactional migration: `prisma/migrations/20260721020000_g3_rbac_constraints_indexes/migration.sql`
- W1A foundation: `prisma/migrations/20260815001500_w1_contract_finance_foundation/migration.sql`
- W1D integrity: `prisma/migrations/20260815004500_w1d_snapshot_offer_integrity/migration.sql`
- W1 schema alignment: `prisma/migrations/20260815010000_w1_schema_alignment/migration.sql`

W1F does not rewrite W1A, W1D, or the historical G3 migration.

## W1 drift remediation classification

The first complete W1F replay evidence proved two separate classes of schema divergence:

1. **Historical legacy divergence** — older hardening migrations contain database constraints/indexes/tables that are not fully represented in the current Prisma schema.
2. **W1 metadata drift** — W1A used `transaction_timestamp()` defaults and explicit FK names while the committed Prisma W1 schema models `@default(now())` and Prisma-deterministic FK names.

W1F does not hide either class. The W1 metadata mismatch is remediated by a new forward migration, `20260815010000_w1_schema_alignment`, that touches **W1 tables only** and performs only:

- `ALTER COLUMN ... SET DEFAULT CURRENT_TIMESTAMP` for the 17 W1 timestamp defaults identified by evidence;
- `RENAME CONSTRAINT` for the 11 W1 FK names identified by evidence.

It performs no row DML, no backfill, no destructive drop, and no legacy-table alteration.

After this migration, **any full-replay drift mentioning a W1 table or W1 unique index is a hard failure**. Historical legacy-only divergence may remain as diagnostic evidence because it predates W1 and is outside this slice. The targeted W1 rehearsal must still be zero-drift.

## Historical replay classification

The historical G3 migration is explicitly marked `REVIEW-ONLY` and states that `CREATE INDEX CONCURRENTLY` cannot run inside a transaction and that a future release runner must execute the file without wrapping it in `BEGIN/COMMIT`.

The first W1F rehearsal proved that a plain replay reaches that migration and fails with the expected signature:

- Prisma `P3018`;
- migration `20260721020000_g3_rbac_constraints_indexes`;
- PostgreSQL `25001`;
- `CREATE INDEX CONCURRENTLY cannot run inside a transaction block`.

This is a **pre-existing historical replay constraint**, not a W1 failure. W1F does not rewrite or weaken the historical migration. Its localhost-only verifier may recover from **only this exact frozen signature** by:

1. executing the exact frozen G3 SQL file with PostgreSQL autocommit / `psql -v ON_ERROR_STOP=1` on the isolated W1F database;
2. marking only that failed migration as applied in Prisma migration history;
3. resuming the remaining repository migration replay;
4. failing closed for any different migration, error signature, host, or database.

## Safety invariants

- All databases are ephemeral PostgreSQL 16 service databases created inside GitHub Actions.
- No repository/environment production database secret is referenced.
- W1F uses only localhost PostgreSQL URLs with CI-only credentials.
- The verifier rejects non-PostgreSQL URLs, non-local hosts, unexpected ports, and database names outside the `orca_w1f_*` namespace before executing database commands.
- No Vercel, Neon, Supabase, provider, bank, Ejar, or production endpoint is contacted.
- No development/reset/push/seed migration command, application-data backfill, public route, server action, UI, provider integration, or deploy action is executed.
- G3 production-workflow protection is not changed or bypassed; the workflow invokes only the localhost-guarded W1F verifier.

## Repository replay acceptance

The replay database must satisfy all of the following:

- candidate checkout SHA equals the exact PR head SHA;
- the initial history replay either succeeds directly or fails with only the exact frozen historical G3 signature above;
- when that exact historical signature occurs, the exact frozen SQL file is executed outside a transaction and only that failed migration is resolved as applied;
- replay then completes and migration status succeeds;
- W1A, W1D, and W1 schema alignment exist in `_prisma_migrations` as finished and not rolled back;
- schema-diff exit `0` is classified `ZERO_DRIFT`;
- schema-diff exit `2` is allowed only as `HISTORICAL_LEGACY_DRIFT_ONLY` when **no W1 table or W1 unique index appears in the diff**;
- any other diff exit or any W1 touch fails closed.

## Targeted W1 upgrade acceptance

The upgrade database must satisfy all of the following:

- its starting schema is generated from exact pre-W1A SHA `50266d2122c966d0fa48f0d1b789e6ed5916b68c`;
- W1A, W1D, and W1 alignment are applied with `psql -v ON_ERROR_STOP=1` only to the isolated upgrade database;
- legacy column fingerprint before and after W1 migrations is identical;
- legacy constraint fingerprint before and after W1 migrations is identical;
- exactly the ten W1A tables are added;
- both W1D unique indexes exist and are unique;
- current schema vs isolated upgraded database has **zero Prisma-supported drift**.

## Evidence

The workflow uploads a `w1f-migration-readiness-evidence` artifact containing:

- exact refs/environment;
- initial and resumed replay output;
- historical exception evidence;
- migration status;
- full replay drift plus machine-readable classification;
- exact pre-W1A generated schema SQL;
- legacy before/after fingerprints;
- W1A/W1D/alignment apply output;
- targeted zero-drift output;
- W1 object verification;
- final machine-readable summary.

## Allowed paths

- `.github/workflows/w1f-migration-readiness.yml`
- `scripts/w1f-migration-readiness-summary.mjs`
- `tests/foundation/g8-w1f-migration-readiness.test.ts`
- `prisma/migrations/20260815010000_w1_schema_alignment/migration.sql`
- this gate document

## Explicit exclusions

- no rewrite of existing Prisma schema, W1A, W1D, or historical migration files;
- no package-lock/package dependency change;
- no modification of ORCA production deployment workflows or G3 verification;
- no production/customer database access;
- no route/server action/UI;
- no Transaction Spine or application-domain write change;
- no provider activation/network integration;
- no deploy.

## Closure

W1F is closed only when:

- the dedicated PostgreSQL 16 rehearsal passes on the exact PR head;
- ORCA CI through Build passes on the exact same head;
- G8 W1F contract tests pass;
- repository replay contains no W1 drift;
- targeted pre-W1A → W1A → W1D → alignment rehearsal is zero-drift and preserves all legacy fingerprints;
- the PR diff remains within the five-file W1F allowlist;
- no production migration/deploy/provider activation occurs.
