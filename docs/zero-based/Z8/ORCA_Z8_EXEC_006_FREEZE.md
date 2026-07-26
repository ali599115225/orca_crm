# ORCA Z8 — EXEC-006 Freeze Contract

## Identity

- Package: `EXEC-006 — Unit Commitment, Reservation and Tours`
- Verified central branch: `work/orca-zero-based-execution-20260721`
- Verified central base: `5774f64ad42fb77a387c28d6f5c8fac29c31450b`
- Implementation branch: `work/orca-exec-006-unit-commitment-reservation-tours-20260726`
- Date: `2026-07-26`
- Owner decision status: approved by the package instruction that opened this execution cycle.
- Prerequisite packages: `EXEC-001` through `EXEC-005` are `CLOSED`.
- Packages in execution before this branch: `0`.
- Scope recheck: the central branch remained exactly at the frozen base before all additive hardening, disambiguation, reconciliation and lifecycle-guard migrations.

## Owner decisions frozen for this package

1. Availability is calculated server-side from the persisted unit base state, active exclusive commitments, effective operational restrictions, final contractual links and server time.
2. Exclusive commitment types are `HOLD` and `RESERVATION`; a tour is never an exclusive commitment.
3. Default Hold duration is 24 hours, standard maximum is 72 hours and longer duration requires independent elevated approval. Duration is always bounded.
4. Default Reservation duration is 7 days, standard maximum is 30 days and longer duration requires independent elevated approval. Duration is always bounded.
5. Default priority is first valid exclusive commitment wins. There is no silent preemption.
6. Hold-to-Reservation conversion is atomic and idempotent.
7. Expired commitments do not block availability even before reconciliation runs.
8. Tours are stored in UTC with an explicit timezone; company default is `Asia/Riyadh`.
9. Employee tour overlap is always denied. Unit tour overlap is denied by default and remains policy-configurable.
10. No Offer acceptance, Contract, Invoice, Payment, Refund, ownership transfer or Lease activation is implemented by EXEC-006.

## Existing model inventory and current truth conflicts

- `Unit.status` is a mutable legacy text field and cannot remain the exclusive availability source.
- `Contract.reservationExpiresAt` mixes historic reservation semantics into the contract boundary.
- `RentalLease` is a final contractual linkage and must block availability while effective.
- legacy Lead, Opportunity and Offer statuses can imply interest or progress but do not establish exclusive inventory rights.
- legacy `Tour` has limited states, no explicit timezone/history aggregate and no database overlap guard.
- current scheduling uses a serializable transaction but inserts a Tour without employee/unit exclusion protection.
- no dedicated Hold/Reservation aggregate, idempotency ledger, append-only commitment history or availability decision exists.

## Target aggregate

The new source of truth consists of:

- Unit inventory reference and base/operational/contractual availability inputs.
- Unit Commitment aggregate (`HOLD` or `RESERVATION`) with version, expiry and lifecycle.
- Availability Decision with fail-closed unknown state.
- Tour Appointment aggregate with history and overlap policy.
- Idempotency records keyed by tenant, operation and key plus payload fingerprint.
- Append-only audit and history records.
- Atomic PostgreSQL constraints/functions for exclusivity, conversion, expiry reconciliation and tour conflicts.

## Security invariants

- Deny by default.
- Same tenant and exact persisted assignment scope are mandatory.
- Branch identity is taken from the persisted unit/project scope, never trusted from a request body.
- Platform Owner and System Administrator receive no automatic commercial Hold/Reservation/Tour authority.
- Self-approval and missing initiator evidence fail closed.
- Elevated duration approval is verified against a distinct, active, persisted approver assignment inside PostgreSQL; an arbitrary JSON object is insufficient.
- Duration validation applies only at creation and actual expiry changes; lifecycle-only transitions such as `EXPIRED`, `RELEASED`, `CANCELLED` or `CONVERTED` cannot be rejected as zero-duration requests.
- Cross-branch override requires explicit company scope plus a distinct override permission and reason.
- Actor, tenant and scope supplied by a client are not trusted without session-to-assignment binding at an entry point.
- Blocking-customer details are redacted unless the actor has explicit audit disclosure authority.

## Concurrency strategy

- Application commands execute within a repository transaction and enforce optimistic version checks.
- PostgreSQL uses transaction-scoped unit advisory locking for command functions.
- A partial GiST exclusion constraint prevents overlapping active exclusive commitment windows for the same tenant and unit.
- Tour schedules use GiST exclusion constraints for active employee overlaps and, by default, active unit overlaps.
- Idempotency is protected by a tenant/operation/key unique constraint and payload hash comparison.
- Conversion, expiry, release and extension use atomic conditional updates with version checks.
- Expiry reconciliation selects a bounded candidate page, then locks and rechecks each row without `SKIP LOCKED`; a concurrent conversion cannot leave an expired commitment in a blocking lifecycle state after both commands complete.

## Compatibility strategy

- New commitment tables are the forward source of truth.
- Existing columns are retained and are not backfilled.
- `Unit.status`, legacy reservation expiry and legacy workflow statuses are classified as compatibility projections or historical state.
- A database guard prevents legacy callers from writing exclusive commitment meanings directly into `Unit.status`.
- Existing runtime paths are not claimed as migrated unless explicitly wired in this branch.
- The new service exposes a compatibility projection contract; deleting legacy fields is outside scope.

## Migration policy

- Additive SQL only.
- No Production migration.
- No customer-data migration.
- No backfill.
- No legacy-column deletion.
- Validation occurs only on disposable PostgreSQL 16 in GitHub Actions.
- Composite tenant-safe foreign keys and append-only triggers are mandatory where Prisma cannot express the rule.
- The second migration is limited to strengthening approval shape, immutable identity, and atomic Extend/Reschedule command functions discovered during pre-execution SQL review; it does not expand product scope.
- The third migration is limited to database verification of independent elevated approvals, effective RentalLease availability, and final-link release protection discovered during strict security review; it does not expand product scope.
- The fourth migration is a fully-qualified availability function replacement that removes PL/pgSQL name ambiguity while preserving Contract, RentalLease, operational restriction, commitment and fail-closed semantics.
- The fifth migration replaces only expiry reconciliation locking after a real conversion/expiry race proved that `SKIP LOCKED` could leave an expired row un-reconciled in that invocation.
- The sixth migration replaces only the approval-policy trigger function so lifecycle state changes are not treated as new duration requests while direct Reservation activation still requires independent approval.

## Allowed paths

1. `.github/workflows/exec-006-migration-validation.yml`
2. `docs/zero-based/Z8/ORCA_Z8_EXEC_006_FREEZE.md`
3. `docs/zero-based/Z8/ORCA_Z8_EXEC_006_DATA_IMPACT.md`
4. `docs/zero-based/Z8/ORCA_Z8_EXEC_006_REVIEW.md`
5. `lib/unit-commitment/contracts.ts`
6. `lib/unit-commitment/authority.ts`
7. `lib/unit-commitment/repository.ts`
8. `lib/unit-commitment/service.ts`
9. `lib/unit-commitment/sql-repository.ts`
10. `prisma/migrations/20260726160000_exec_006_unit_commitment_reservation_tours/migration.sql`
11. `prisma/migrations/20260726161000_exec_006_unit_commitment_integrity_hardening/migration.sql`
12. `prisma/migrations/20260726162000_exec_006_authority_availability_hardening/migration.sql`
13. `prisma/migrations/20260726163000_exec_006_availability_disambiguation/migration.sql`
14. `prisma/migrations/20260726164000_exec_006_reconciliation_race_hardening/migration.sql`
15. `prisma/migrations/20260726165000_exec_006_lifecycle_approval_guard_hardening/migration.sql`
16. `scripts/exec-006-postgres-concurrency.mjs`
17. `tests/foundation/g5-exec-006-unit-commitment.test.ts`
18. `tests/foundation/g5-exec-006-security.test.ts`
19. `tests/foundation/g5-exec-006-schema-contract.test.ts`
20. `tests/foundation/g5-exec-006-postgres-contract.test.ts`

Any additional path requires a documented scope reason and a renewed conflict check against the central branch before modification.

## Disallowed paths and actions

- `main`, Production, customer data, provider accounts, credentials and subscriptions.
- EXEC-007 or later package implementation.
- visual redesign of Properties, Tours or Offers.
- Offer acceptance, contract, invoice, payment, refund, ownership or lease activation logic.
- Production seeds, Production Cron activation, Backfill and legacy-column removal.

## Direct evidence and required gates

- Direct behavioral tests cover availability, Hold, Reservation, conversion, expiry/reconciliation, Tour lifecycle, timezone, scope, self-approval, concurrency semantics, versioning, idempotency, append-only history and disclosure redaction.
- Disposable PostgreSQL tests prove exclusion constraints, independent elevated approval, effective RentalLease blocking and real concurrent race outcomes.
- EXEC-004 authority and EXEC-005 identity regression suites remain green.
- Schema contract, G5, G8, lint, TypeScript, build, production dependency audit, P2 acceptance and isolated recovery are required.
- Exact-head ORCA CI and final diff/allowlist review are required before merge.

## Acceptance criteria

- Two incompatible exclusive commitments cannot both succeed, including real concurrent PostgreSQL requests.
- Hold conversion and expiry cannot produce two active truths or leave an expired `ACTIVE` row after both commands complete.
- Expired rows do not block availability before reconciliation.
- Stale versions and idempotency payload mismatches fail.
- Long duration cannot be authorized by self-approval or unverified JSON evidence.
- Lifecycle-only state changes remain valid under the duration guard.
- Active final Contract or RentalLease linkage blocks availability and protected release.
- Tours do not reserve units and conflicting employee/unit schedules are denied.
- Audit and history are append-only and same-tenant safe.
- No known Runtime defect exists inside the frozen boundary.
- No Production, customer-data, provider, `main` or EXEC-007 action occurs.

## Vercel policy

`SKIP_BY_DEFAULT`. A maximum of one stable-head Preview is allowed only if a required browser-only behavior cannot be proven by direct tests, disposable PostgreSQL validation, Build and ORCA CI. There is no Production deploy.

## No-claim boundaries

- EXEC-006 does not claim that every legacy UI/API mutation path is migrated unless the final reviewed diff proves the wiring.
- Legacy statuses remain historical/compatibility data and are not authoritative.
- External scheduling, notifications and payment/provider integrations remain inactive.
- Closure cannot state `CLOSED` until all gates and any required independent review condition are satisfied.