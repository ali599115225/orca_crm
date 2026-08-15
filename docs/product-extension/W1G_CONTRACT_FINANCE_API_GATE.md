# ORCA W1G — Guarded Contract / Finance API Foundation Gate

Status: FROZEN FOR W1G NETWORK FOUNDATION IMPLEMENTATION

Base: `2ce8a88a737373f6261526dc8a4e3c411761e1a3`

W1G follows the verified W1F merge. It does not create STEP 15 or reopen STEP 0–14.

## Objective

Expose the first minimal network surface over the verified W1E application facade while remaining fail-closed until database migration application is separately authorized and confirmed.

W1G exposes only:

- FinanceCase list / get / create;
- ContractDraft list / get / create.

Provider-offer commands, FinanceCase transitions, authority evidence, ContractApproval decisions/finalization, and snapshot issuance remain outside W1G and are reserved for a later guarded command slice.

## Double fail-closed activation

Every W1G route must return before authentication or any W1 database/application-facade operation unless both server-only environment variables are exactly `true`:

- `ORCA_CONTRACT_FINANCE_API_ENABLED=true`
- `ORCA_CONTRACT_FINANCE_SCHEMA_READY=true`

Both are absent/false by default. W1G does not set either variable in repository configuration, Vercel, GitHub, or production.

`SCHEMA_READY` is an operational acknowledgement only; W1G does not apply migrations and does not infer production schema readiness from CI rehearsal evidence.

## Request boundary

- Feature gate executes first.
- `requireAuth()` establishes the signed session without a database role lookup.
- W1E facade performs current database-role revalidation, tenant binding, AsyncLocal tenant context, and delegation to W1B–W1D domain services.
- Request JSON cannot supply `tenantId`, actor/user identity, approval identity, or any authorization role.
- Query list limits are bounded by the existing W1E read model service.
- Malformed JSON and invalid scalar shapes fail with `400` before the facade call.
- W1E unauthorized/forbidden failures map to `401`/`403`; domain not-found failures map to `404`; conflicts map to `409`; unexpected failures map to a generic `500` without internal stack/error leakage.

## W1G routes

- `GET /api/v1/contract-finance/finance-cases`
- `POST /api/v1/contract-finance/finance-cases`
- `GET /api/v1/contract-finance/finance-cases/:id`
- `GET /api/v1/contract-finance/contract-drafts`
- `POST /api/v1/contract-finance/contract-drafts`
- `GET /api/v1/contract-finance/contract-drafts/:id`

## Write-source invariant

POST routes call only:

- `w1eCreateFinanceCase`
- `w1eCreateContractDraft`

No route imports Prisma or a W1 domain write service directly. No route mutates Contract, Lead, Unit, PaymentPlan, Invoice, Installment, JournalEntry, legacy Offer, or provider state.

## Allowed paths

- `lib/domain/contract-finance/api-boundary.ts`
- `app/api/v1/contract-finance/finance-cases/route.ts`
- `app/api/v1/contract-finance/finance-cases/[id]/route.ts`
- `app/api/v1/contract-finance/contract-drafts/route.ts`
- `app/api/v1/contract-finance/contract-drafts/[id]/route.ts`
- `tests/foundation/g8-w1g-contract-finance-api.test.ts`
- this gate document

## Explicit exclusions

- no Prisma schema or migration modification;
- no production/customer migration or backfill;
- no production environment variable activation;
- no Vercel deployment;
- no UI;
- no provider adapter/network call/credentials/activation;
- no approval-decision/finalization/snapshot-issue endpoint;
- no provider-offer/authority/FinanceCase-transition endpoint;
- no Transaction Spine financial mutation;
- no change to W1E permission mappings or EXEC-003 historical assignments.

## Closure

W1G closes only when the PR remains within the seven-file allowlist, G8 contract tests prove double fail-closed gating and facade-only routing, full ORCA CI through Build passes on the exact final head, independent review finds no Critical/Major issue, and no production migration/deploy/provider activation occurs.
