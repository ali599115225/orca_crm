# ORCA W1F — Isolated Migration Readiness Gate

Status: FROZEN FOR W1F NON-PRODUCTION VERIFICATION

Base: `dc51a4ce0ef2f6b8f47535cbe511dc82101c5dcc`

Pre-W1A reference: `50266d2122c966d0fa48f0d1b789e6ed5916b68c`

W1F follows the verified W1E merge. It does not create STEP 15 or reopen STEP 0–14.

## Objective

Prove the W1 Contract Studio / Finance Case persistence migrations are operationally ready **without touching production or customer data**.

W1F verifies two independent PostgreSQL 16 rehearsals:

1. **Full migration replay** — apply the repository migration history to a fresh isolated database with `prisma migrate deploy`, require `prisma migrate status` success, and require zero Prisma-schema drift.
2. **Targeted W1 upgrade rehearsal** — materialize the exact pre-W1A schema from the frozen pre-W1A SHA, fingerprint all legacy columns/constraints, apply only the W1A and W1D migration SQL, require the legacy fingerprint to remain unchanged, require all ten W1 tables + two W1D unique indexes to exist, and require zero drift against the current multi-file Prisma schema.

## Frozen migration identities

- W1A: `prisma/migrations/20260815001500_w1_contract_finance_foundation/migration.sql`
- W1D: `prisma/migrations/20260815004500_w1d_snapshot_offer_integrity/migration.sql`

W1F does not edit either migration file.

## Safety invariants

- All databases are ephemeral PostgreSQL 16 service databases created inside GitHub Actions.
- No repository/environment production database secret is referenced.
- W1F uses only localhost PostgreSQL URLs with CI-only credentials.
- No Vercel, Neon, Supabase, provider, bank, Ejar, or production endpoint is contacted.
- No `prisma migrate dev`, `prisma migrate reset`, `prisma db push`, seed, backfill, or application data migration is executed.
- W1F never applies a migration to the production/customer database.
- W1F creates no public route, server action, UI, provider integration, or deploy action.

## Full replay acceptance

The fresh replay database must satisfy all of the following:

- `prisma migrate deploy` exits successfully;
- `prisma migrate status` exits successfully;
- W1A and W1D exist in `_prisma_migrations` as finished and not rolled back;
- `prisma migrate diff --from-config-datasource --to-schema prisma --exit-code` reports no supported-schema drift.

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
- full replay deploy output;
- full replay migration status;
- full replay drift output;
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
- no modification of ORCA production deployment workflows;
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
- evidence proves both replay and targeted-upgrade zero-drift rehearsals;
- the PR diff remains within the four-file W1F allowlist;
- no production migration/deploy/provider activation occurs.
