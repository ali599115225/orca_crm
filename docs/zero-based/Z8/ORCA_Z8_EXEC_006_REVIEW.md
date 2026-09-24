# ORCA Z8 — EXEC-006 Strict Final Read-only Review

## Review identity

- Package: `EXEC-006 — Unit Commitment, Reservation and Tours`
- Review mode: strict final read-only diff, architecture and security review.
- Review class: `PASS / NON_INDEPENDENT`.
- Frozen central base: `5774f64ad42fb77a387c28d6f5c8fac29c31450b`.
- Reviewed executable head: `bec25027a6519792690cbe2a5cdf48e19f78c4f4`.
- Implementation branch: `work/orca-exec-006-unit-commitment-reservation-tours-20260726`.
- Implementation PR: `#135`.
- PR state at review: `DRAFT / OPEN / UNMERGED`.
- Central comparison: `ahead 56 / behind 0`; merge base equals the frozen central base.
- Changed files at reviewed executable head: `21`.
- Document-only final head after adding this review: `22` changed files.

## Governing review condition

The governing EXEC-006 freeze and prioritized roadmap require a final read-only review before merge. No package-specific additional external-independent-review flag was identified in those governing records. This report is therefore explicitly non-independent and does not claim the independent-review status used by packages that separately required it.

## Scope reconciliation

Result: `PASS`.

The reviewed executable head contained 21 changed files, all inside the renewed allowlist in `ORCA_Z8_EXEC_006_FREEZE.md`. Adding this review report creates a document-only final head with 22 changed files, also entirely inside the allowlist:

- one disposable GitHub Actions workflow;
- three package documents including this review;
- five Unit Commitment TypeScript modules;
- seven additive EXEC-006 migrations;
- two disposable PostgreSQL proof scripts;
- four focused foundation tests.

No existing Runtime entry point, legacy page, API route, Server Action, `main`, provider configuration, secret, Production file or EXEC-007 file was changed.

## Material finding discovered during final review

### F-EXEC006-001 — Narrow assignments expanded to Branch scope

Initial severity: `HIGH / MATERIAL PRIVILEGE EXPANSION`.

The initial SQL authority function treated persisted `DEPARTMENT` and `TEAM` assignments as authorizing every EXEC-006 resource in the same Branch. It also accepted an `ASSIGNED_RESOURCE` identifier without proving that the declared resource type matched the persisted Unit, Unit Commitment or Tour Appointment.

This contradicted the frozen invariant:

`same tenant and exact persisted assignment scope are mandatory`.

### Remediation

The additive migration:

`prisma/migrations/20260726166000_exec_006_exact_scope_hardening/migration.sql`

now enforces:

1. `COMPANY` scope remains company-wide.
2. `BRANCH` scope requires the exact persisted Branch.
3. `DEPARTMENT` and `TEAM` fail closed because EXEC-006 resource records do not persist those identifiers and exact coverage cannot be proved.
4. `ASSIGNED_RESOURCE` requires both the declared type and identifier to match a persisted same-tenant, same-Branch Unit, Unit Commitment or Tour Appointment.
5. Independent approver fallback excludes unprovable Department/Team expansion and reuses the exact-scope verifier.
6. Scheduled Tour staff must have exact Company, Branch, Unit or Tour coverage; narrower Department/Team assignments cannot schedule across the Branch.

### Direct disposable evidence

`scripts/exec-006-postgres-exact-scope.sql` proves:

- Department assignment cannot authorize Branch-wide Unit access.
- Team assignment cannot authorize Branch-wide Unit access.
- a wrong assigned-resource type cannot authorize a Unit with the same UUID.
- an exact `UNIT` assignment is a positive control.
- Department-scoped staff cannot be scheduled Branch-wide.
- staff assigned to the exact Unit is a positive control.

Final finding status: `REMEDIATED / DIRECTLY PROVEN`.

## Other failure/remediation reconciliation

The implementation cycle also resolved the following evidence-backed defects before final review:

- audit-disclosure authority mapping;
- migration-step ordering assertions;
- disposable Unit fixture/schema mismatch;
- ambiguous PL/pgSQL output-column references;
- conversion/expiry reconciliation race;
- lifecycle approval guard revalidating terminal status as zero duration;
- cross-tenant direct-SQL scope guard ordering;
- stale source assertions that did not represent final SQL behavior.

No failing test was hidden, skipped or converted into a weaker assertion. Each correction was followed by exact-head CI or disposable PostgreSQL reruns.

## Security review result

Result: `PASS`.

- deny-by-default authority remains intact;
- same-tenant composite references remain intact;
- exact persisted scope is now enforced in SQL;
- Platform Owner/System Administrator receive no automatic commercial mutation authority;
- self-approval remains denied;
- independent approval requires a distinct persisted assignment;
- customer blocker references remain redacted without audit authority;
- final Contract/effective RentalLease links prevent protected release;
- append-only History/Audit mutation remains denied;
- no new legacy-role bypass, provider access or secret path exists.

Known Runtime security defects inside the frozen boundary: `0`.
Known privilege expansions after remediation: `0`.

## Architecture and data-boundary review result

Result: `PASS`.

- Unit Commitment owns only Hold/Reservation lifecycle and availability evidence.
- Tour Appointment is explicitly non-exclusive.
- Contract, Invoice, Payment, Refund, ownership transfer and Lease activation remain outside EXEC-006.
- legacy `Unit.status` remains compatibility projection, not authoritative truth.
- no Backfill or legacy-column deletion exists.
- no existing UI/API mutation path is falsely claimed as migrated.
- external scheduling and Production activation remain outside the closed claim.

## Concurrency and integrity review result

Result: `PASS`.

- advisory locks and GiST exclusions prevent incompatible simultaneous commitments;
- optimistic versions protect mutation transitions;
- Hold conversion remains atomic;
- expiry reconciliation waits, rechecks and converges with concurrent conversion;
- staff and Unit Tour overlap constraints remain enforced;
- idempotency payload mismatch fails;
- audit/history rows remain append-only.

## Exact-head executable evidence

Reviewed executable head:

`bec25027a6519792690cbe2a5cdf48e19f78c4f4`

### EXEC-006 Migration Validation

- Workflow run: `43`.
- Workflow run ID: `30205774785`.
- Result: `SUCCESS`.
- PostgreSQL: disposable `postgres:16` only.
- All seven EXEC-006 migrations: `SUCCESS`.
- schema/guard validation: `SUCCESS`.
- real concurrency/integrity drill: `SUCCESS`.
- exact persisted-scope drill: `SUCCESS`.
- final-link release denial: `SUCCESS`.
- PostgreSQL contract tests: `SUCCESS`.
- protected-action confirmation: `SUCCESS`.

### ORCA CI

- Workflow run: `597`.
- Workflow run ID: `30205774750`.
- Result: `SUCCESS`.
- Prisma, Production gate, G3, G4, G5, G6, G7, G8: `SUCCESS`.
- TypeScript and production dependency audit: `SUCCESS`.
- foundation/core/Sentinel/P2 regressions: `SUCCESS`.
- isolated recovery drill: `SUCCESS`.
- Build: `SUCCESS`.

## Vercel disposition

`SKIP_BY_DEFAULT / NON_BLOCKING`.

No browser-only behavior was introduced. The package is proven by direct tests, disposable PostgreSQL validation, TypeScript, Build, recovery and exact-head ORCA CI. No retry-only push or Production deployment is authorized.

## Protected actions confirmation

- `main`: untouched.
- Production: untouched.
- customer data: untouched.
- Production/Preview customer database migrations: not executed.
- Backfill: not executed.
- providers/accounts/subscriptions: untouched.
- secrets/credentials: untouched.
- EXEC-007: not started.

## Final review judgment

`PASS — IMPLEMENTATION ELIGIBLE FOR CENTRAL MERGE AFTER THE DOCUMENT-ONLY FINAL HEAD PASSES EXACT-HEAD ORCA CI AND THE FINAL DIFF REMAINS WITHIN THE ALLOWLIST.`

This report does not itself authorize `main`, Production, Backfill, provider actions or EXEC-007.
