# ORCA Z8 — EXEC-008 Implementation Evidence Review

## Status

`IMPLEMENTATION EVIDENCE MAPPING / 43 OF 43 LEDGER ITEMS CLASSIFIED / NOT YET FINAL CLOSURE`

This review maps every frozen EXEC-008 Test Ledger item to the evidence currently present on the implementation branch. `PASS` means the required behavior has direct or PostgreSQL evidence matching the frozen requirement. `PARTIAL` means meaningful evidence exists but one required evidence dimension remains incomplete. `PENDING` means the frozen requirement still needs direct evidence before EXEC-008 can be declared technically closed.

Human/independent review that requires manual human review remains deferred to the pre-launch review gate. This document is an executable-evidence reconciliation, not that deferred human review.

## Current implementation evidence sources

- `tests/foundation/g5-exec-008-contract-integrity.test.ts`
- `tests/foundation/g5-exec-008-financial-integrity.test.ts`
- `tests/foundation/g5-exec-008-security.test.ts`
- `tests/foundation/g5-exec-008-schema-contract.test.ts`
- `tests/foundation/g5-exec-008-postgres-contract.test.ts`
- `scripts/exec-008-postgres-integrity.mjs`
- `lib/domain/transaction-spine/issue-contract.ts`
- `lib/domain/transaction-spine/sign-contract.ts`
- `lib/domain/transaction-spine/payment-reconciliation.ts`
- existing dependency regression evidence including `tests/payment-service.test.ts`
- disposable PostgreSQL 16 workflow `.github/workflows/exec-008-migration-validation.yml`

## Contract integrity — 12/12 classified

| ID | Status | Evidence / remaining gap |
|---|---|---|
| E8-C01 | PASS | Direct issuance test binds exact template ID/hash/snapshot; `issue-contract.ts` persists `ORCA_CONTRACT_V1` snapshot and contract snapshot atomically. |
| E8-C02 | PARTIAL | Migration immutability trigger protects contract-version immutable fields and schema contract asserts it. Dedicated PostgreSQL mutation proof currently exercises template/correction append-only, not an attempted `exec008_contract_versions.content_snapshot` mutation. |
| E8-C03 | PASS | Direct amendment test asserts version increment, predecessor link and retained prior record. |
| E8-C04 | PASS | Direct stale-version signing denial test. |
| E8-C05 | PARTIAL | Direct service allow path uses real EXEC-004 evaluator; runtime `sign-contract.ts` loads persisted `user_scope_assignments` and writes signatory evidence atomically. A disposable-DB entry-point test that seeds the assignment and calls the complete signing entry point is not yet present. |
| E8-C06 | PASS | Direct negative tests deny Platform Owner and System Administrator implicit contract authority. |
| E8-C07 | PASS | Direct matrix covers missing, expired, wrong tenant, wrong branch and wrong resource. |
| E8-C08 | PARTIAL | Positive eligible activation is covered and service rejects ineligible states in code; a dedicated direct negative activation-state test is still required for full ledger wording. |
| E8-C09 | PASS | Same-key/same-payload activation replay returns one semantic version result; obligation identity has database uniqueness proof. |
| E8-C10 | PASS | Direct conflicting activation idempotency payload denial. |
| E8-C11 | PASS | Disposable PostgreSQL 16 races two inserts for one `CONTRACT_ACTIVATION` obligation identity and proves exactly one persisted obligation. |
| E8-C12 | PENDING | Cancellation, restructure and early-settlement lifecycle tests have not yet been explicitly reconciled to immutable EXEC-008 contract evidence. |

## Financial precision and obligations — 10/10 classified

| ID | Status | Evidence / remaining gap |
|---|---|---|
| E8-F01 | PASS | Money contract enforces explicit 3-letter currency and safe-integer minor units; schema uses `char(3)` plus `bigint`. |
| E8-F02 | PARTIAL | EXEC-008 domain arithmetic is integer minor-unit based. A dedicated exact-decimal regression proving all authoritative entry-point conversions avoid floating-point truth remains incomplete. |
| E8-F03 | PASS | Direct currency mismatch denial plus PostgreSQL currency guards. |
| E8-F04 | PARTIAL | Financial obligation uniqueness makes retry duplication fail closed; activation-obligation concurrency is proven. Dedicated invoice-obligation replay/concurrency evidence for the payment wiring is not yet isolated as its own test. |
| E8-F05 | PARTIAL | Corrections, payment evidence, payments and allocations are append-only in PostgreSQL. A finalized-obligation destructive-overwrite denial is not yet directly proven. |
| E8-F06 | PENDING | Schema records correction original obligation, reason and actor, but no direct positive correction service/history test exists yet. |
| E8-F07 | PENDING | Net truth formula exists in service use of `amount + corrected - allocated`, but a dedicated deterministic reconciliation ledger test is still required. |
| E8-F08 | PASS | Direct over-allocation denial plus PostgreSQL guard. |
| E8-F09 | PASS | Real PostgreSQL concurrent allocation race proves bounded allocation. |
| E8-F10 | PARTIAL | Direct cross-scope payment/obligation denial exists. A dedicated database-level cross-tenant allocation denial assertion remains to be isolated. |

## Payment evidence — 7/7 classified

| ID | Status | Evidence / remaining gap |
|---|---|---|
| E8-P01 | PASS | Existing `tests/payment-service.test.ts` proves low-level payment creation persists `PENDING`, not completed; payment-link/provider initiation therefore does not itself mark payment complete. |
| E8-P02 | PASS | Existing business-payment callback test returns `BUSINESS_PAYMENT_PENDING` without mutation; EXEC-008 service independently rejects unverified evidence. |
| E8-P03 | PASS | Direct tests cover verified flag, amount/currency and scope; runtime reconciliation binds provider/reference identity and expected amount/currency before completion. |
| E8-P04 | PASS | Same semantic payment replay produces one payment/allocation; database uniqueness exists on provider/reference and payment evidence ID. |
| E8-P05 | PARTIAL | Conflicting identity/amount/currency paths fail closed in runtime/service. A dedicated assertion of durable audit/history for the rejected conflict is still missing. |
| E8-P06 | PASS | Direct same-key/same-payload payment replay returns one result. |
| E8-P07 | PASS | Direct conflicting payment idempotency payload denial asserts no second money movement. |

## Refund separation of duties — 8/8 classified

| ID | Status | Evidence / remaining gap |
|---|---|---|
| E8-R01 | PASS | Direct refund initiation succeeds only through explicit finance authority evaluation; unauthorized role/scope paths are fail-closed by the shared evaluator. |
| E8-R02 | PASS | Direct missing-initiator approval test fails closed via separation-of-duties evaluation. |
| E8-R03 | PASS | Direct self-approval denial plus PostgreSQL self-approval guard. |
| E8-R04 | PASS | Independent Finance Manager approval succeeds; approver without permission is denied. |
| E8-R05 | PASS | Refund initiation replay returns one refund; database balance guard prevents duplicate money truth. |
| E8-R06 | PASS | Direct conflicting refund idempotency payload denial. |
| E8-R07 | PASS | Real PostgreSQL concurrent refund race proves refundable balance cannot be exceeded. |
| E8-R08 | PASS | Direct history assertion confirms original payment is unchanged and refund is separate truth. |

## Boundary and regression — 6/6 classified

| ID | Status | Evidence / remaining gap |
|---|---|---|
| E8-B01 | PASS | EXEC-008 authority delegates to sealed EXEC-004 `evaluateOrganizationAuthority`; direct negative matrix confirms deny-by-default/exact-scope behavior. |
| E8-B02 | PENDING | EXEC-005 party/customer identity truth has not yet been explicitly exercised as a focused EXEC-008 regression. |
| E8-B03 | PENDING | EXEC-006 reservation/commitment truth has not yet been explicitly exercised as a focused activation regression. |
| E8-B04 | PENDING | EXEC-007 exact offer/version acceptance evidence has not yet been explicitly reconciled in a focused regression. |
| E8-B05 | PASS | Package tests and PostgreSQL workflow require no provider credentials/account activation; provider-specific activation remains excluded by allowlist. |
| E8-B06 | PASS | Workflow/schema tests verify no Production/customer-data migration or backfill; migration is additive and disposable validation uses synthetic data. |

## Classification totals

All frozen ledger entries are mapped: **43/43**.

- `PASS`: 29
- `PARTIAL`: 8
- `PENDING`: 6
- Unclassified: 0

The mapping is complete, but technical closure is **not** yet authorized because `PARTIAL` and `PENDING` items remain.

## Remaining executable closure set

The remaining work should be consolidated rather than split into recursive micro-cycles:

1. PostgreSQL direct contract-version mutation denial for E8-C02.
2. Direct negative activation-state evidence and persisted-authority integration evidence for E8-C05/C08.
3. Lifecycle preservation regression covering cancellation/restructure/early-settlement for E8-C12.
4. Exact-decimal/obligation immutability/correction/reconciliation evidence for E8-F02/F05/F06/F07.
5. Database cross-tenant allocation denial for E8-F10.
6. Durable conflicting-payment audit/history evidence for E8-P05.
7. Focused EXEC-005/006/007 regressions for E8-B02/B03/B04.

No new runtime change is authorized by this review unless a failing direct test proves a behavior defect. Prefer evidence-only changes inside the existing 39-path allowlist.

## Gate policy

After the consolidated remaining closure set is implemented, the exact final head must pass:

- focused EXEC-008 Vitest evidence;
- Prisma validate/generate;
- disposable PostgreSQL 16 migration/integrity/concurrency validation;
- repository governance lint;
- TypeScript;
- G5 security/quality;
- G7 reconciliation;
- G8 foundation gate;
- relevant EXEC-004 through EXEC-007 regressions;
- production dependency audit;
- Build;
- ORCA CI.

No merge, deploy, Production/customer-data migration, backfill or provider activation is authorized by this document.
