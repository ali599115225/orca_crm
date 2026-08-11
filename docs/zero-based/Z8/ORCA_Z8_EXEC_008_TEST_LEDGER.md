# ORCA Z8 — EXEC-008 Test Ledger

## Status

`FROZEN TEST LEDGER / NO IMPLEMENTATION AUTHORITY`

Every accepted EXEC-008 invariant must earn direct evidence. Structural/source assertions may supplement but cannot replace direct behavior where a route, action, service or database constraint is responsible for the decision.

## Contract integrity cases

| ID | Frozen behavior | Required evidence |
|---|---|---|
| E8-C01 | Issuing a contract binds an exact template/version snapshot. | Direct service/entry-point test plus persisted record assertion. |
| E8-C02 | Issued contract content cannot be mutated in place. | Direct denial test and PostgreSQL immutability proof where applicable. |
| E8-C03 | Amendment creates a new immutable version linked to its predecessor. | Direct positive test plus history assertion. |
| E8-C04 | A stale/superseded version cannot be signed as current. | Direct denial test. |
| E8-C05 | Signing requires explicit persisted signatory authority on the exact scope. | Direct allow/deny tests using real authority evaluation. |
| E8-C06 | Job title, Platform Owner or System Administrator status alone does not grant sign/activate authority. | Direct negative tests. |
| E8-C07 | Missing, expired, wrong-tenant, wrong-branch or wrong-resource authority fails closed. | Direct negative matrix. |
| E8-C08 | Activation requires the exact eligible signed/accepted version and required evidence. | Direct positive/negative tests. |
| E8-C09 | Activation replay with the same idempotency key/payload creates no second contract obligation. | Direct replay test plus database uniqueness proof. |
| E8-C10 | Conflicting payload reuse of an activation idempotency key fails. | Direct denial test. |
| E8-C11 | Concurrent activation requests cannot create duplicate obligations. | Real PostgreSQL concurrency proof. |
| E8-C12 | Cancellation/restructure/early settlement preserve prior immutable contract evidence. | Direct lifecycle/history tests. |

## Financial precision and obligation cases

| ID | Frozen behavior | Required evidence |
|---|---|---|
| E8-F01 | Every authoritative amount has explicit currency and fixed precision. | Schema contract plus direct value tests. |
| E8-F02 | Authoritative financial arithmetic does not rely on floating-point JS truth. | Source/contract assertion plus exact decimal behavior tests. |
| E8-F03 | Currency mismatch between obligation/payment/allocation fails closed. | Direct denial tests. |
| E8-F04 | Invoice/obligation creation is idempotent and retry-safe. | Replay and concurrent duplicate tests. |
| E8-F05 | A finalized obligation/payment/correction record cannot be destructively overwritten. | Service denial and PostgreSQL append-only proof. |
| E8-F06 | Correction/reversal references the original entry and records reason/actor. | Direct positive test plus persisted history assertion. |
| E8-F07 | Reconciliation derives net truth from originals plus corrections/reversals. | Deterministic reconciliation tests. |
| E8-F08 | Payment allocation cannot exceed the eligible remaining obligation. | Direct denial and PostgreSQL race proof. |
| E8-F09 | Concurrent allocations cannot over-allocate the same obligation. | Real PostgreSQL concurrency proof. |
| E8-F10 | Cross-tenant/cross-scope allocation fails. | Direct authority and database denial tests. |

## Payment evidence cases

| ID | Frozen behavior | Required evidence |
|---|---|---|
| E8-P01 | Payment-link creation alone never marks payment complete. | Direct entry-point/service test. |
| E8-P02 | An unverified callback/event alone never marks payment complete. | Direct negative test. |
| E8-P03 | Payment evidence must bind provider/reference identity, amount, currency and target scope before completion/allocation. | Direct positive/negative matrix. |
| E8-P04 | Duplicate callback/evidence replay cannot duplicate payment or allocation. | Direct replay test plus uniqueness proof. |
| E8-P05 | Conflicting evidence reuse fails closed and is auditable. | Direct denial/history test. |
| E8-P06 | Payment command idempotency same-key/same-payload returns one semantic result. | Direct replay test. |
| E8-P07 | Payment command conflicting-key reuse fails without money movement. | Direct denial test. |

## Refund separation-of-duties cases

| ID | Frozen behavior | Required evidence |
|---|---|---|
| E8-R01 | Refund initiation requires explicit scoped finance authority. | Direct allow/deny tests. |
| E8-R02 | Approval-required refund cannot be approved without persisted initiator evidence. | Direct fail-closed test. |
| E8-R03 | Initiator cannot approve the same approval-required refund. | Direct self-approval denial test. |
| E8-R04 | Approver requires independent active scoped authority. | Direct allow/deny tests. |
| E8-R05 | Refund replay cannot create duplicate refund obligations/movements. | Direct replay plus database uniqueness proof. |
| E8-R06 | Conflicting refund idempotency payload fails closed. | Direct denial test. |
| E8-R07 | Concurrent approval/execution cannot refund more than the refundable balance. | Real PostgreSQL concurrency proof. |
| E8-R08 | Refund preserves original payment evidence and creates separate append-only refund truth. | Direct history/reconciliation test. |

## Boundary and regression cases

| ID | Frozen behavior | Required evidence |
|---|---|---|
| E8-B01 | EXEC-004 deny-by-default and exact-scope authority remains intact. | EXEC-004 regressions plus focused EXEC-008 denial tests. |
| E8-B02 | EXEC-005 party/customer identity truth is not rewritten by contract/finance work. | Focused regression. |
| E8-B03 | EXEC-006 reservation/commitment truth is not bypassed by contract activation. | Focused regression. |
| E8-B04 | EXEC-007 exact offer/version acceptance remains the upstream acceptance evidence where consumed. | Focused regression. |
| E8-B05 | No provider credential/account/activation is required to pass package tests. | Configuration-independent test and diff review. |
| E8-B06 | No Production/customer-data migration or backfill occurs. | Workflow/diff/data-impact verification. |

## Required executable gates

The final implementation candidate must pass, on its exact final head:

- package-focused Vitest ledger above;
- Prisma validate/generate;
- disposable PostgreSQL 16 migration/integrity/concurrency validation;
- repository governance lint;
- TypeScript;
- G5 security and quality gate;
- G7 reconciliation;
- G8 final foundation gate;
- relevant foundation/core regressions, including EXEC-004 through EXEC-007 dependencies;
- production dependency audit;
- Build;
- ORCA CI on the exact final head.

## Evidence rules

- Mock-only tests do not receive direct credit for authorization, idempotency, immutable persistence, payment completion or database-concurrency invariants.
- PostgreSQL-specific claims require disposable PostgreSQL evidence.
- Entry-point security claims must reach the real final authority decision or a directly bound service with an independently proven entry-point wiring test.
- Any test skipped because of environment limitations is not a pass and must be classified before merge.
- Baseline failures outside the allowlist must not be silently repaired inside EXEC-008; they are compared and classified separately.

## Ledger count

Frozen direct behavioral/integrity contracts: `43`.

- Contract: 12
- Financial: 10
- Payment evidence: 7
- Refund: 8
- Boundary/regression: 6

No reduction or semantic weakening of this ledger is allowed during implementation without an explicit governance amendment.
