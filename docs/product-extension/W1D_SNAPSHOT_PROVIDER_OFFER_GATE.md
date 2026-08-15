# ORCA W1D — Snapshot Idempotency + Provider Offer Lifecycle Gate

Status: FROZEN FOR W1D INTERNAL IMPLEMENTATION

Base: `3e8cc6ec5a23be43fff441a5754c0270b0ff2510`

W1D follows the verified W1C merge. It does not create STEP 15 or reopen STEP 0–14.

## Objective

Close the remaining pre-API integrity gaps for Contract Studio / Finance Case:

1. enforce one `ISSUED` ContractSnapshot per approved draft at the database boundary and make repeated identical issue calls idempotent;
2. reject a repeated issue attempt when the immutable digest differs from the already-issued artifact;
3. add an internal FinanceProviderOffer receive/select lifecycle with persisted provider evidence;
4. ensure provider approval / transaction readiness is tied to the currently selected provider offer, not merely any provider evidence.

## Snapshot invariants

- `ContractSnapshot` gains a unique key on `(tenantId, draftId, snapshotType)`.
- W1D adds an additive migration artifact only; it is not applied to production.
- `issueApprovedContractSnapshot` returns the already-issued snapshot when the requested immutable digest is identical.
- If a snapshot already exists for the draft/type with another digest, issuance fails closed.
- Concurrent identical issue attempts are protected by the database unique key; a uniqueness race may resolve only to the already-issued identical digest.
- No update/delete/upsert capability is added for ContractSnapshot.
- `EXECUTED` / signed snapshot creation remains outside W1D.

## Provider offer invariants

- Provider offers are records of external offers; ORCA does not manufacture provider approval.
- Recording an offer requires tenant, FinanceCase, provider, provider reference, amount, term, and evidence.
- Offer receipt is allowed only while FinanceCase is `AWAITING_PROVIDER` or `OFFERS_RECEIVED`.
- The first offer receipt may atomically move the FinanceCase from `AWAITING_PROVIDER` to `OFFERS_RECEIVED` and append a FinanceCaseEvent.
- Selecting an offer requires FinanceCase internal status `OFFERS_RECEIVED`, a non-expired tenant-owned offer in `RECEIVED`, and actor identity.
- Selection sets exactly the chosen offer to `SELECTED`, sets `selectedAt`, moves the FinanceCase to `OFFER_SELECTED`, and appends an event in one SERIALIZABLE transaction.
- W1D exposes no provider submission or network call.
- Transition to `PROVIDER_APPROVED` or `READY_FOR_TRANSACTION` requires the current authority provider to match the selected offer provider and still requires the W1C persisted APPROVED authority evidence.

## Allowed paths

- `prisma/w1-contract-finance.prisma`
- `prisma/migrations/20260815004500_w1d_snapshot_offer_integrity/migration.sql`
- `lib/domain/contract-finance/contract-snapshot-service.ts`
- `lib/domain/contract-finance/finance-case-service.ts`
- `lib/domain/contract-finance/provider-offer-service.ts`
- `tests/foundation/g8-w1d-snapshot-provider-offers.test.ts`
- this gate document

## Explicit exclusions

- no public route/server action/UI;
- no application of migrations to production or customer data;
- no provider API calls/adapters/credentials/activation;
- no Transaction Spine / PaymentPlan / Installment / Invoice / Offer mutation;
- no deployment/production action.

## Acceptance

- Prisma validates/generates with the new snapshot unique key.
- Migration is additive: unique index only, no row mutation/backfill/drop.
- Snapshot issuance is idempotent for identical digest and fail-closed for differing digest.
- Provider offer receipt/selection is tenant-scoped, evidence-backed, actor-attributed, and atomic.
- `PROVIDER_APPROVED` / `READY_FOR_TRANSACTION` requires a selected offer matching the authority provider.
- G8 focused tests pass.
- Full ORCA CI through Build passes on the exact final head.
- No production migration/deploy/provider activation occurs.
