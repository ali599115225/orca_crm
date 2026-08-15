# ORCA W1F — Isolated Migration Readiness Gate

Status: FROZEN FOR W1F NON-PRODUCTION VERIFICATION

Base: `dc51a4ce0ef2f6b8f47535cbe511dc82101c5dcc`

Pre-W1A reference: `50266d2122c966d0fa48f0d1b789e6ed5916b68c`

W1F follows the verified W1E merge. It does not create STEP 15 or reopen STEP 0–14.

## Objective

Prove the W1 Contract Studio / Finance Case persistence migrations are operationally ready **without touching production or customer data**.

W1F verifies two independent PostgreSQL 16 rehearsals:

1. **Repository migration replay with one frozen historical non-transactional exception** — start the repository migration history on a fresh isolated database, permit only the already-documented `20260721020000_g3_rbac_constraints_indexes` transaction incompatibility, execute that exact frozen migration outside a transaction exactly as its own execution contract requires, resolve that failed migration as applied, resume the remaining migration history, require migration status success, and require zero Prisma-schema drift.
2. **Targeted W1 upgrade rehearsal** — materialize the exact pre-W1A schema from the frozen pre-W1A SHA, fingerprint all legacy columns/constraints, apply only the W1A and W1D migration SQL, require the legacy fingerprint to remain unchanged, require all ten W1 tables + two W1D unique indexes to exist, and require zero drift against the current multi-file Prisma schema.

## Frozen migration identities

- Historical non-transactional migration: `prisma/migrations/20260721020000_g3_rbac_constraints_indexes/migration.sql`
- W1A: `prisma/migrations/20260815001500_w1_contract_finance_foundation/migration.sql`
- W1D: `prisma/migrations/20260815004500_w1d_snapshot_offer_integrity/migration.sql`

W1F does not edit any of these migration files.

## Historical replay classification

The historical G3 migration is explicitly marked `REVIEW-ONLY` and states that `CREATE INDEX CONCURRENTLY` cannot run inside a transaction and that a future release runner must execute the file without wrapping it in `BEGIN/COMMIT`.

The first W1F exact-head rehearsal proved that a plain repository replay reaches that migration and fails with the expected Prisma/PostgreSQL signature:

- Prisma `P3018`;
- migration `20260721020000_g3_rbac_constraints_indexes`;
- PostgreSQL `25001`;
- `CREATE INDEX CONCURRENTLY cannot run inside a transaction block`.

This is a **pre-existing historical replay constraint**, not a W1A/W1D failure. W1F does not rewrite or weaken the historical migration. Its replay verifier may recover from **only this exact frozen signature** by:

1. executing the exact frozen G3 SQL file with PostgreSQL autocommit / `psql -v ON_ERROR_STOP=1` on the isolated W1F database;
2. marking only that failed migration as applied in Prisma migration history;
3. resuming the repository migration replay;
4. failing closed for any different migration, error signature, host, or database.

## Safety invariants

- All databases are ephemeral PostgreSQL 16 service databases created inside GitHub Actions.
- No repository/environment production database secret is referenced.
- W1F uses only localhost PostgreSQL URLs with CI-only credentials.
- The verifier rejects non-PostgreSQL URLs, non-local hosts, unexpected ports, and database names outside the `orca_w1f_*` namespace before executing database commands.
- No Vercel, Neon, Supabase, provider, bank, Ejar, or production endpoint is contacted.
- No `prisma migrate dev`, `prisma migrate reset`, `prisma db push`, seed, backfill, or application data migration is executed.
- W1F never applies a migration to the production/customer database.
- W1F creates no public route, server action, UI, provider integration, or deploy action.
- G3 production-workflow protection is not changed or bypassed; the GitHub workflow invokes only the localhost-guarded W1F verifier, not a production migration command.

## Repository replay acceptance

The fresh replay database must satisfy all of the following:

- candidate checkout SHA equals the exact PR head SHA;
- the initial replay either succeeds directly or fails with only the exact frozen historical G3 signature above;
- when that exact historical signature occurs, the exact frozen SQL file is executed outside a transaction and only that failed migration is resolved as applied;
- replay then completes successfully;
- migration status exits successfully;
- W1A and W1D exist in `_prisma_migrations` as finished and not rolled back;
- current database vs current Prisma schema reports no supported-schema drift;
- evidence records whether the historical exception path was used.

## Targeted upgrade acceptance

The upgrade database must satisfy all of the following:

- its starting schema is generated from exact pre-W1A SHA `50266d2122c966d0fa48f0d1b789e6ed5916b68c`;
- W1A and W1D are applied with `psql -v ON_ERROR_STOP=1` only to the isolated upgrade database;
- legacy column fingerprint before and after W1 migrations is identical;
- legacy constraint fingerprint before and after W1 migrations is identical;
- exactly the ten W1A tables are added;
- both W1D unique indexes exist and are unique;
- current schema vs isolated upgraded database has zero Prisma-supported drift.

## Evidence

The workflow uploads a `w1f-migration-readiness-evidence` artifact containing:

- environment / exact refs;
- initial repository replay output;
- historical exception detection/recovery evidence when applicable;
- resumed replay output;
- migration status;
- repository replay drift output;
- targeted pre-W1A generated schema SQL;
- legacy before/after fingerprints and table counts;
- W1 object verification;
- targeted drift output;
- final machine-readable summary.

## Allowed paths

- `.github/workflows/w1f-migration-readiness.yml`
- `scripts/w1f-migration-readiness-summary.mjs`
- `tests/foundation/g8-w1f-migration-readiness.test.ts`
- this gate document

## Explicit exclusions

- no modification of existing Prisma schema or migration files;
- no package-lock/package dependency change;
- no modification of ORCA production deployment workflows or G3 verification;
- no production/customer database access;
- no route/server action/UI;
- no Transaction Spine or application-domain write change;
- no provider activation/network integration;
- no deploy.

## Closure

W1F is closed only when:

- the dedicated W1F PostgreSQL 16 workflow passes on the exact PR head;
- ORCA CI through Build also passes on the exact same head;
- G8 W1F static contract tests pass;
- evidence proves repository replay completion (including the exact frozen historical exception path if required) and targeted-upgrade zero drift;
- the PR diff remains within the four-file W1F allowlist;
- no production migration/deploy/provider activation occurs.
