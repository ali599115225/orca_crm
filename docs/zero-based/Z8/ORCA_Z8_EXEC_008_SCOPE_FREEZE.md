# ORCA Z8 — EXEC-008 Scope Freeze

## Identity

- Package: `EXEC-008 — Contract and financial integrity spine`
- Central base: `38f69a10359641fc94f902a372f7f6f21bfc3424`
- Governance branch: `work/orca-exec-008-owner-decision-freeze-20260811`
- Date: `2026-08-11`
- Owner decision record: `docs/zero-based/Z8/ORCA_Z8_EXEC_008_DECISION_RECORD.md`
- Package state: `SCOPE FROZEN / AMENDED FOR ATOMIC WIRING / IMPLEMENTATION AUTHORITY GRANTED`
- Prerequisites: `EXEC-001` through `EXEC-007` closed; owner decisions for `OWN-A06`, `OWN-A07`, and `Z2R-006` approved for this package.

## Frozen owner decisions

1. An issued contract is bound to an exact immutable template/version. Any later business change is an amendment or new version; issued truth is never edited in place.
2. Signatory and activation authority must be explicit and must match the persisted resource scope. Job title or broad administrative status does not imply contract authority.
3. Every money-bearing command uses explicit currency and fixed precision. Completed financial truth is not overwritten; correction is append-only through reversal/correction evidence.
4. Refund initiation and refund approval are separated whenever approval is required. Missing initiator evidence or self-approval fails closed.
5. Payment completion requires persisted, reconcilable evidence. Creation of a payment link or receipt of an unverified callback is insufficient by itself.
6. Contract activation, payment recording/allocation and refund commands are idempotent. Same-key/same-payload replay returns the same semantic result; conflicting key reuse fails without creating a second obligation or money movement.

## Current-source inventory frozen as input

The current repository already contains contract and finance surfaces that EXEC-008 must reconcile rather than bypass. Inventory evidence includes:

- `app/actions/contract.ts`
- `app/actions/finance.ts`
- `app/api/v1/contracts/issue/route.ts`
- `app/api/v1/contracts/[id]/route.ts`
- `app/api/v1/contracts/[id]/sign/route.ts`
- `app/api/v1/contracts/[id]/cancel/route.ts`
- `app/api/v1/contracts/[id]/restructure/route.ts`
- `app/api/v1/contracts/[id]/invoices/route.ts`
- `app/api/v1/contracts/[id]/payment-plan/route.ts`
- `app/api/v1/contracts/[id]/early-settlement/route.ts`
- `app/api/v1/invoices/[id]/pay/route.ts`
- `lib/domain/transaction-spine/types.ts`
- `lib/domain/transaction-spine/record-payment.ts`
- `lib/domain/transaction-spine/early-settlement.ts`
- `lib/domain/transaction-spine/issue-contract.ts`
- `lib/domain/transaction-spine/payment-reconciliation.ts`
- `lib/payments/custom-payment-reconciliation.ts`
- `lib/accounting/posting-engine.ts`
- `prisma/schema.prisma`

Historical reports and provider-specific integrations are evidence inputs only and are not implementation authority.

## Narrow scope amendment — 2026-08-11

Implementation and PostgreSQL evidence proved that correct atomic wiring cannot be completed solely through the previously admitted route/action surfaces. The authoritative mutation boundaries are:

- `lib/domain/transaction-spine/issue-contract.ts` for contract creation inside the existing serializable transaction;
- `lib/domain/transaction-spine/payment-reconciliation.ts` for verified payment completion, invoice/receipt mutation and accounting posting inside the existing payment transaction.

The owner approved adding exactly those two paths to the package boundary. The Final Allowlist therefore changes from 36 to 38 admitted paths. The 43 frozen Test Ledger contracts remain unchanged. No additional migration, provider route, UI path, package dependency file, backfill, or Production action is authorized by this amendment.

Atomicity requirement: EXEC-008 authoritative records must be created or reconciled at the same transaction boundary as the existing contract/payment truth where practical. A post-commit shadow write that can diverge from the legacy transaction is not an acceptable wiring strategy.

## Target source of truth

EXEC-008 will establish one bounded contract/financial integrity boundary with these concepts:

- immutable Contract Template Version;
- immutable Contract Version / Amendment chain;
- explicit Signatory Authority evidence;
- idempotent Contract Activation record;
- currency-aware fixed-precision Money value;
- Invoice / obligation identity that cannot duplicate on retry;
- Payment Evidence and Payment Allocation records;
- append-only Correction / Reversal records;
- Refund Request and Refund Approval with separation of duties;
- reconciliation state derived from persisted obligations, allocations, corrections and verified payment evidence;
- package-scoped idempotency records keyed by tenant/security partition, operation and key with payload fingerprint.

## Security invariants

- Deny by default.
- Existing EXEC-004 authority remains the authority foundation; EXEC-008 must not invent parallel RBAC.
- Exact persisted tenant and resource scope are mandatory.
- No Platform Owner or System Administrator implicit contract-signing, finance-write or refund authority.
- Caller-supplied branch, amount, currency, signatory, initiator or approval context is not trusted without persisted validation.
- Self-approval is denied where independent approval is required.
- A stale contract version cannot be signed or activated as if it were current.
- Issued/signed/activated contract version content is immutable.
- Finalized financial records are append-only; destructive edits are prohibited.
- Duplicate/replayed callbacks and duplicate command submissions cannot duplicate obligations, payments, allocations or refunds.
- Provider-specific callback truth is not trusted unless normalized into verified payment evidence.

## Precision and correction policy

- Currency is explicit on every money-bearing aggregate and command.
- Runtime calculations must use the repository's approved decimal/fixed-precision representation; floating-point JavaScript arithmetic cannot become authoritative financial truth.
- Rounding occurs only at an explicitly defined currency boundary, never implicitly at arbitrary intermediate steps.
- A finalized amount is corrected by a new correction/reversal record that references the original record and preserves an attributable reason and actor.
- Reconciliation computes net truth from original entries plus append-only corrections rather than rewriting history.

## Contract lifecycle policy

At minimum, implementation must distinguish draft preparation from issued immutable truth and prove the following lifecycle boundary:

`DRAFT -> ISSUED_VERSION -> SIGNED/ACCEPTED -> ACTIVATED`

Amendment produces a new immutable version linked to its predecessor. Cancellation, restructuring and early settlement must preserve the prior contractual and financial evidence and cannot silently mutate already-issued facts.

## Payment and refund policy

- Payment-link creation is not payment completion.
- A payment callback/event is evidence input, not authoritative completion until authenticity, identity, amount, currency and replay conditions pass.
- Payment allocation is explicit and attributable to exact obligations.
- Over-allocation, wrong-currency allocation and cross-tenant allocation fail closed.
- Refund state is separate from original payment truth.
- When refund approval is required, initiator and approver must be different persisted actors with valid authority.
- Retry, reversal and concurrent allocation/refund scenarios must reconcile deterministically.

## Compatibility strategy

- Existing transaction-spine and route/action surfaces are adapted; no parallel business truth may be introduced behind an unconnected new API.
- Legacy mutable fields may remain as compatibility data where deletion would enlarge migration risk, but they cannot override the new authoritative records after an operation is explicitly wired to EXEC-008.
- Existing historical records are not backfilled by this package unless a later, separate migration/data authorization is issued.

## Migration policy

- Additive schema/migration work only.
- No Production migration.
- No customer-data migration.
- No backfill.
- No destructive legacy-column removal.
- Migration validation is limited to disposable PostgreSQL 16 / approved CI evidence.
- Database constraints/triggers/functions may be used where Prisma alone cannot enforce immutability, append-only evidence, exact currency/precision, idempotency or SoD integrity.

## Explicitly out of scope

- provider account activation, credentials, purchases or production payment-provider configuration;
- ZATCA/Ejar/legal certification or claims of legal sufficiency;
- UI/visual redesign;
- customer-data migration/backfill;
- `main` or Production deployment;
- EXEC-009 or later implementation;
- deleting historical financial/accounting evidence;
- broad accounting redesign unrelated to contract/payment/refund integrity.

## Required gates before implementation authority

1. Final Allowlist is exact and closed.
2. Test Ledger maps every frozen invariant to direct evidence.
3. Current central SHA is rechecked before implementation branch creation.
4. No conflicting mutable package is in execution.
5. Scope/allowlist mechanical validation passes.
6. A separate explicit owner instruction grants EXEC-008 implementation authority.

Those gates were satisfied and owner implementation authority was granted before implementation began. The narrow two-path amendment above does not widen the frozen behavior ledger and does not revoke that authority; it only admits the proven atomic transaction boundaries required to implement it correctly.

Human independent review is deferred to the mandatory pre-launch gate by owner decision; this does not relax exact-head CI, direct tests, disposable PostgreSQL validation, audit, TypeScript, Build or security gates.
