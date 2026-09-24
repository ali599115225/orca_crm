# G3 RBAC Constraints and Indexes Rollout Contract

- **Stage:** G3-09 — Constraints & Indexes
- **Repository state:** reviewable SQL only
- **Production application:** not performed
- **Required predecessor:** G3-03 schema expansion plus verified G3-04 backfill

## Purpose

G3-09 adds database-level integrity evidence for the organization and RBAC structures without combining data repair, destructive contraction, or immediate Production enforcement.

The target guarantees are:

- every RBAC/organization row belongs to an existing Tenant;
- user, organization-unit, role, and audit references cannot cross tenant boundaries;
- assignment validity windows are coherent;
- role-assignment scope fields match their declared scope type;
- permission keys and risk classes follow the canonical registry vocabulary;
- authorization audits reference known tenants, users, and permissions;
- active authorization resolution paths have bounded, purpose-specific indexes.

## Files

- Migration proposal: `prisma/migrations/20260721020000_g3_rbac_constraints_indexes/migration.sql`
- Read-only preflight: `scripts/g3-rbac-constraint-preflight.sql`
- Controlled validation: `scripts/g3-rbac-constraint-validate.sql`
- Non-destructive rollback: `scripts/g3-rbac-constraint-rollback.sql`

## Required execution order

A future independently approved release must follow this order:

1. confirm a restorable provider snapshot or backup;
2. rehearse the full sequence in an isolated database restored from representative data;
3. apply the additive G3-03 migration;
4. run G3-04 dry-run and reconcile counts;
5. run G3-04 apply only in the isolated database and rerun it to prove idempotency;
6. run `g3-rbac-constraint-preflight.sql` and require `total_integrity_violations = 0`;
7. create G3-09 indexes concurrently and add constraints as `NOT VALID`;
8. run the preflight again;
9. validate one constraint at a time with lock and duration monitoring;
10. rerun authorization and tenant-isolation tests;
11. record restore and rollback evidence before any Production proposal.

G3 itself does not perform these database steps.

## Lock-risk controls

### Concurrent indexes

All new indexes use `CREATE INDEX CONCURRENTLY IF NOT EXISTS` or `CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS`.

Consequences:

- the SQL cannot be wrapped in a normal transaction;
- a release runner must inspect failed/invalid concurrent indexes before retrying;
- retries are name-stable and use `IF NOT EXISTS`;
- active-window indexes are partial to reduce index size and write amplification;
- the audit history uses BRIN for time-range retention and review queries.

### NOT VALID constraints

Foreign keys and checks are added as `NOT VALID` so existing rows are not scanned during the initial constraint-add operation. New or changed rows are still checked by PostgreSQL after the constraint is added.

Validation is deliberately separated into `g3-rbac-constraint-validate.sql`. It must run only after a zero-violation preflight and preferably one constraint per controlled transaction.

## Same-tenant integrity

Composite unique indexes on `(tenant_id, id)` support composite foreign keys that preserve tenant equality for:

- user assignments;
- organization hierarchy and assignments;
- access-role mappings;
- role assignments and scoped organization units;
- authorization audit users.

These constraints strengthen but do not replace application predicates and AccessContext checks.

## Scope-shape integrity

`ck_role_assignments_scope_shape` requires:

- `TENANT`: no organization or resource binding;
- `BRANCH`, `DEPARTMENT`, `TEAM`: an organization-unit binding and no resource binding;
- `SELF`: no explicit organization/resource binding;
- `RESOURCE`: both resource type and resource ID, with no organization-unit binding.

This prevents ambiguous assignments that authorization code could interpret inconsistently.

## Preflight evidence

The read-only preflight reports named counts for orphan, cross-tenant, temporal, permission-vocabulary, and scope-shape violations. It then returns one aggregate value:

```text
total_integrity_violations
```

The only passing value is zero. The script contains no mutation or DDL.

## Rollback

The rollback removes only G3-09 constraints and indexes. It does not drop:

- tables;
- columns;
- enum types;
- G3-03 models;
- backfilled roles or assignments;
- audit rows;
- historical SaaS data.

Operational rollback should first disable RBAC enforcement domains, then revert application code if required. Database rollback is a separate release decision.

## Backup and restore boundary

This repository work does not claim that a Production backup, snapshot, restore, or migration rehearsal occurred. Those actions require a separate Production gate and provider evidence. G3-09 supplies the scripts and acceptance contract only.
