# ORCA W1C — Contract Draft / Approval + Finance Case Lifecycle Gate

Status: FROZEN FOR W1C INTERNAL SERVICE IMPLEMENTATION

Base: `22329cdce3dc44501199388fc343ae0233ad90fe`

W1C follows the verified W1B merge. It does not create STEP 15 or reopen STEP 0–14.

## Objective

Introduce internal lifecycle services only, before any public API/UI write surface:

1. create ContractDraft only from a tenant-owned published ContractTemplate + published ContractTemplateVersion;
2. request/decide/finalize ContractApproval with fail-closed state transitions;
3. create FinanceCase with tenant-safe legacy references;
4. transition FinanceCase internal workflow through a closed state machine while appending FinanceCaseEvent;
5. record external/provider authority state only with explicit provider reference + evidence, without silently changing internal workflow state.

## Contract lifecycle invariants

- ContractDraft creation never creates or mutates Contract, Unit, Lead, PaymentPlan, Installment, Invoice, Offer, or accounting records.
- Template and TemplateVersion must both be `PUBLISHED` and belong to the same tenant/template.
- Optional Contract / FinanceCase links are tenant-scoped and mutually consistent.
- New drafts start `DRAFT`.
- ContractApproval starts `PENDING` and may be decided once as `APPROVED` or `REJECTED`.
- Final draft approval requires at least one ContractApproval and every persisted approval to be `APPROVED`.
- Draft approval changes status only; immutable `ISSUED` evidence remains owned by the verified W1B snapshot service.
- W1C exposes no content-edit function after approval request. A later governed editing slice must explicitly stale/reset approvals when material content changes.

## Finance lifecycle invariants

- `internalStatus` and provider/authority status are independent authorities.
- New FinanceCase starts `DRAFT`; caller cannot create it as externally approved.
- Every internal status transition appends a FinanceCaseEvent in the same SERIALIZABLE transaction.
- Only allowlisted transitions are accepted.
- Provider/authority state may be recorded only with non-empty provider, provider reference, status, and evidence.
- Recording provider/authority state does not alter `internalStatus`.
- W1C does not submit to any bank/provider and does not claim ORCA approval is provider approval.
- PaymentPlan remains company receivables only and is not touched by FinanceCase services.

## Internal finance state machine

`DRAFT → ASSESSMENT → READY_FOR_SUBMISSION → AWAITING_PROVIDER → OFFERS_RECEIVED → OFFER_SELECTED → PROVIDER_APPROVED → READY_FOR_TRANSACTION → COMPLETED`

`CANCELLED` is permitted from any non-terminal state. `COMPLETED` and `CANCELLED` are terminal.

## Allowed paths

- `lib/domain/contract-finance/contract-draft-service.ts`
- `lib/domain/contract-finance/finance-case-service.ts`
- `tests/foundation/g8-w1c-contract-finance-lifecycle.test.ts`
- this gate document

## Explicit exclusions

- no routes/server actions/UI;
- no Prisma schema or migration change;
- no production migration/backfill;
- no Transaction Spine mutation;
- no PaymentPlan/Installment/Invoice mutation;
- no provider adapter, credentials, submission, activation, or external call;
- no deploy/production action.

## Acceptance

- tenant-safe template, draft, approval, finance-case, and legacy reference predicates are explicit;
- invalid ContractDraft/Approval transitions fail closed;
- FinanceCase invalid/reverse/terminal transitions fail closed;
- FinanceCase transition + event append is atomic at SERIALIZABLE isolation;
- authority recording requires evidence and does not mutate internalStatus;
- W1C services contain no PaymentPlan/Installment/Invoice write operations;
- G8 focused tests pass;
- Prisma validate/generate, repository lint/typecheck, full ORCA CI through Build pass on exact head;
- no production migration/deploy/provider activation occurs.
