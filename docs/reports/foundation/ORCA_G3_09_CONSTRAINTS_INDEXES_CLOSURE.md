# ORCA G3-09 Constraints and Indexes Closure

## Stage record

- **Stage:** G3-09 — Constraints & Indexes
- **Result:** PASS pending CI evidence
- **Source branch:** `work/orca-foundation-plan-20260721`
- **Target branch:** `work/orca-central-baseline-execution-20260719`
- **Start SHA:** `1a4eb7b16d2f6e8a3e670e0bd295740bccc6d425`
- **Production migration applied:** no
- **Production data changed:** no
- **Production deploy:** no
- **Backup/restore rehearsal claimed:** no

## Implementation

Added:

- `prisma/migrations/20260721020000_g3_rbac_constraints_indexes/migration.sql`;
- `scripts/g3-rbac-constraint-preflight.sql`;
- `scripts/g3-rbac-constraint-validate.sql`;
- `scripts/g3-rbac-constraint-rollback.sql`;
- `tests/foundation/g3-09-constraints-indexes.test.ts`;
- `docs/architecture/G3_RBAC_CONSTRAINTS_INDEXES.md`.

## Integrity coverage

The proposal adds:

- tenant ownership foreign keys for every organization/RBAC table;
- composite same-tenant foreign keys for users, organization units, access roles, role assignments, and audit users;
- permission references for role mappings and authorization audits;
- validity-window checks;
- role-assignment scope-shape checks;
- permission-key format and risk-vocabulary checks;
- non-empty authorization-audit reason/source checks;
- partial active-resolution indexes;
- composite identity indexes;
- request-correlation and BRIN audit indexes.

## Lock and rollout controls

- Indexes use `CONCURRENTLY IF NOT EXISTS`.
- Existing-row constraints use `NOT VALID`.
- Constraint validation is in a separate script.
- Preflight must report zero total integrity violations before validation.
- The migration file explicitly warns that concurrent index creation cannot run in a transaction.
- A future runner must validate one constraint at a time and record lock/duration evidence.

## Preflight

`g3-rbac-constraint-preflight.sql` is read-only and reports named violation counts covering:

- missing Tenant parents;
- cross-tenant organization parents;
- orphan/cross-tenant user, unit, role, and audit references;
- invalid validity windows;
- invalid scope shapes;
- invalid permission keys and risks;
- invalid audit reason/source fields.

The aggregate gate is `total_integrity_violations = 0`.

The preflight was not run against Production or any connected database by this stage.

## Validation and rollback

The validation script contains one `VALIDATE CONSTRAINT` statement for each G3-09 constraint.

The rollback script removes only G3-09 constraints and indexes. It contains no table, column, enum, or data deletion. The additive G3-03 schema and any future backfilled data remain intact.

## Test contract

`tests/foundation/g3-09-constraints-indexes.test.ts` verifies:

- migration ordering and review-only status;
- all expected concurrent indexes;
- all expected same-tenant and shape constraints;
- `NOT VALID` on every initial constraint statement;
- no data mutation, destructive contraction, inline validation, or explicit table lock;
- read-only zero-violation preflight;
- complete separate validation script;
- exact non-destructive rollback coverage.

## Production boundary

This stage does not authorize or claim:

- applying either G3 migration to Production;
- running the backfill against Production;
- validating Production constraints;
- taking or restoring a provider snapshot;
- changing RBAC environment flags;
- deploying Production.

A restorable backup and isolated rehearsal remain mandatory before any later Production proposal.

## Closure rule

G3-09 closes only after Prisma generation, all G3 contracts, existing regression suites, production build, CodeQL, and Vercel preview/status pass on the PR head, followed by merge into the central branch. Database execution is outside this closure.
