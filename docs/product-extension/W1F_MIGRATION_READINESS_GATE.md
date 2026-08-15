# ORCA W1F — Isolated Migration Readiness Gate

Status: FROZEN FOR W1F NON-PRODUCTION VERIFICATION

Base: `dc51a4ce0ef2f6b8f47535cbe511dc82101c5dcc`

Pre-W1A provenance reference: `50266d2122c966d0fa48f0d1b789e6ed5916b68c`

W1F follows the verified W1E merge. It does not create STEP 15 or reopen STEP 0–14.

## Objective

Prove the W1 Contract Studio / Finance Case persistence migrations are operationally ready **without touching production or customer data**.

W1F verifies two independent PostgreSQL 16 rehearsals:

1. **Repository migration replay** — replay the repository migration history on a fresh isolated database, recover only the frozen historical non-transactional G3 migration exactly as its own execution contract requires, require migration status success, and classify remaining historical schema divergence. Any drift touching a W1 table or W1 unique index fails closed.
2. **Targeted W1 parity rehearsal** — materialize the **current non-W1 Prisma schema** (`schema.prisma + rbac.prisma`, explicitly excluding `w1-contract-finance.prisma`), fingerprint every non-W1 column/constraint, apply W1A, W1D, and the W1 schema-alignment migration, require the non-W1 fingerprint to remain unchanged, require all ten W1 tables + two W1D unique indexes to exist, and require **zero Prisma-supported drift** against the current full multi-file Prisma schema.

The pre-W1A SHA remains provenance evidence and is checked to prove that the W1 domain file did not exist at the W1A base. It is not used as the targeted parity baseline because subsequent non-W1 RBAC schema additions would create unrelated drift.

## Migration identities

- Historical non-transactional migration: `prisma/migrations/20260721020000_g3_rbac_constraints_indexes/migration.sql`
- W1A foundation: `prisma/migrations/20260815001500_w1_contract_finance_foundation/migration.sql`
- W1D integrity: `prisma/migrations/20260815004500_w1d_snapshot_offer_integrity/migration.sql`
- W1 schema alignment: `prisma/migrations/20260815010000_w1_schema_alignment/migration.sql`

W1F does not rewrite W1A, W1D, or the historical G3 migration.

## W1 drift remediation classification

W1F evidence separated two classes of divergence:

1. **Historical legacy divergence** — older hardening migrations contain database constraints/indexes/tables that are not fully represented in the current Prisma schema.
2. **W1 metadata drift** — W1A used `transaction_timestamp()` defaults and explicit FK names while the committed Prisma W1 schema models `@default(now())` and Prisma-deterministic FK names.

The W1 metadata mismatch is remediated by forward migration `20260815010000_w1_schema_alignment`, which touches W1 tables only and performs:

- 17 `ALTER COLUMN ... SET DEFAULT CURRENT_TIMESTAMP` operations;
- 11 `RENAME CONSTRAINT` operations.

It performs no row DML, no backfill, no destructive drop, and no legacy/non-W1 table alteration.

After this migration, **any full-replay drift mentioning a W1 table or W1 unique index is a hard failure**. Historical legacy-only divergence may remain diagnostic because it predates W1. The targeted current-non-W1 → W1 rehearsal must be zero-drift in full.

## Historical replay classification

The frozen G3 migration is explicitly `REVIEW-ONLY` and states that `CREATE INDEX CONCURRENTLY` cannot run inside a transaction. A plain Prisma replay reaches it with the expected `P3018` / PostgreSQL `25001` signature. W1F's localhost-only verifier may recover from **only this exact frozen signature** by executing that exact SQL file outside a transaction, resolving only that failed migration as applied, and resuming replay. Any different migration, signature, host, or database fails closed.

## Safety invariants

- All databases are ephemeral PostgreSQL 16 service databases created inside GitHub Actions.
- No production/customer database secret is referenced.
- Only localhost PostgreSQL URLs with CI-only credentials are allowed.
- The verifier rejects non-PostgreSQL URLs, non-local hosts, unexpected ports, and database names outside `orca_w1f_*`.
- No Vercel, Neon, Supabase, bank/provider, Ejar, or production endpoint is contacted.
- No development/reset/push/seed command, application-data backfill, public route, server action, UI, provider integration, or deploy action is executed.
- G3 production-workflow protection is not changed or bypassed.

## Repository replay acceptance

The replay database must satisfy all of the following:

- candidate checkout SHA equals the exact PR head SHA;
- the initial history replay either succeeds directly or fails only with the exact frozen G3 signature;
- the bounded historical recovery, when needed, completes and migration status succeeds;
- W1A, W1D, and W1 alignment exist in `_prisma_migrations` as finished/not rolled back;
- diff exit `0` is `ZERO_DRIFT`;
- diff exit `2` is allowed only as `HISTORICAL_LEGACY_DRIFT_ONLY` when no W1 table/index appears;
- any other diff exit or any W1 touch fails closed.

## Targeted W1 parity acceptance

The upgrade database must satisfy all of the following:

- exact pre-W1A SHA is checked and does not contain `prisma/w1-contract-finance.prisma`;
- the baseline is generated from current `prisma/schema.prisma + prisma/rbac.prisma` only;
- the generated baseline SQL contains no W1 table;
- Prisma config stdout preamble is retained separately as raw evidence and stripped before `psql` execution;
- the confirmed Prisma `Error in Schema engine` flake may be retried at most five times; no other error is retryable;
- W1A, W1D, and W1 alignment are applied with `psql -v ON_ERROR_STOP=1` only to the isolated upgrade database;
- non-W1 column fingerprint before/after is identical;
- non-W1 constraint fingerprint before/after is identical;
- exactly the ten W1 tables are added;
- both W1D unique indexes exist and are unique;
- current full schema vs isolated upgraded database has **zero Prisma-supported drift**.

## Evidence

The workflow uploads `w1f-migration-readiness-evidence`, including exact refs, full replay/recovery/status/drift classification, current non-W1 baseline source and generated SQL, raw Prisma output, non-W1 fingerprints, W1 apply output, targeted zero-drift output, W1 object verification, cleanup, and final machine-readable summary.

## Allowed paths

- `.github/workflows/w1f-migration-readiness.yml`
- `scripts/w1f-migration-readiness-summary.mjs`
- `tests/foundation/g8-w1f-migration-readiness.test.ts`
- `prisma/migrations/20260815010000_w1_schema_alignment/migration.sql`
- this gate document

## Explicit exclusions

- no rewrite of existing Prisma schema, W1A, W1D, or historical migration files;
- no package/dependency change;
- no modification of production deployment workflows or G3 verification;
- no production/customer database access;
- no route/server action/UI;
- no Transaction Spine/application-domain write change;
- no provider activation/network integration;
- no deploy.

## Closure

W1F closes only when the dedicated PostgreSQL 16 rehearsal and full ORCA CI through Build pass on the exact same head, G8 passes, repository replay contains no W1 drift, targeted **current non-W1 → W1A → W1D → alignment** is zero-drift with unchanged non-W1 fingerprints, the PR remains within the five-file W1F allowlist, and no production migration/deploy/provider activation occurs.
