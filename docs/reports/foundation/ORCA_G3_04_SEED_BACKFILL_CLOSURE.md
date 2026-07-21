# ORCA G3-04 Seed and Backfill Closure

## Stage record

- **Stage:** G3-04 — Seed & Backfill
- **Result:** PASS pending CI evidence
- **Source branch:** `work/orca-foundation-plan-20260721`
- **Target branch:** `work/orca-central-baseline-execution-20260719`
- **Start SHA:** `72286db443de5c9179ef083aba27d94e63419468`
- **Production migration applied:** no
- **Production data changed:** no
- **Production deploy:** no

## Implementation

Added:

- `lib/authz/backfill-plan.ts`;
- `scripts/g3-rbac-backfill.ts`;
- `tests/foundation/g3-04-backfill.test.ts`.

## Backfill behavior

The backfill defines and safely creates, when explicitly applied to an isolated test database:

- a default branch per tenant;
- a default department under that branch;
- the canonical permission registry;
- five system roles compatible with the legacy Prisma `Role` enum;
- permission mappings for each role;
- one primary `OrgAssignment` for every current user;
- one tenant-scoped `RoleAssignment` compatible with every current legacy role.

## Safety properties

- The default mode is `DRY_RUN`.
- Write mode requires `--apply`.
- Write mode additionally requires both:
  - `G3_BACKFILL_TARGET=isolated-test`;
  - `ALLOW_G3_BACKFILL_WRITE=true`.
- Write mode refuses `NODE_ENV=production` and `VERCEL_ENV=production`.
- Permission, organization, and role records use upsert or unique-safe creation.
- Assignment creation uses unique constraints, `skipDuplicates`, or an explicit existing-record check.
- Users are processed in bounded cursor batches.
- The output contains counts and identifiers only; it does not emit names, email addresses, phone numbers, credentials, message bodies, or document contents.
- The script contains no delete, truncate, destructive update, or schema statement.

## Count evidence

The script records:

- global permission count before and after;
- tenant count;
- per-tenant users, organization units, organizational assignments, roles, role-permission mappings, and role assignments before and after;
- expected minimum counts for reconciliation.

Dry-run returns the same evidence without writes. Apply mode is not executed by this stage because no isolated database write gate was supplied through GitHub Actions and Production changes are explicitly forbidden.

## Idempotency and restart safety

- Stable organization codes prevent duplicate default units.
- Stable role keys prevent duplicate roles.
- Permission keys are globally unique.
- Role-permission mappings use a compound unique key.
- Organizational assignments use a compound unique key.
- Role assignment creation checks for an existing active tenant-scoped mapping.
- Cursor batching allows bounded, restartable processing.

## Rollback

Before any database application, rollback is a normal revert of this stage's source files. If the script is later run against an isolated test database, rollback is to discard or restore that isolated database. This stage does not authorize reverse SQL or any Production rollback claim.

## Test contract

`tests/foundation/g3-04-backfill.test.ts` verifies:

- complete legacy-role mapping;
- valid and unique role blueprints;
- least-privilege role selection;
- explicit dry-run default;
- isolated double opt-in for writes;
- production write refusal;
- idempotency and batch-safety anchors;
- count-only, non-sensitive evidence;
- absence of destructive operations.

## Closure rule

G3-04 closes only after ORCA CI, the complete G3 contract suite, existing regression suites, production build, CodeQL, and preview status pass on the PR head, followed by merge into the central branch. No database application is part of this closure.
