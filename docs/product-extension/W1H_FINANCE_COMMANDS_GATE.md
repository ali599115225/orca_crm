# ORCA W1H — Guarded Finance Case Commands Gate

Status: FROZEN FOR W1H FINANCE COMMAND IMPLEMENTATION

Base: `4e1f9f9096fe1254d3bc1510cab1a1c8b8738df2`

W1H-Finance follows the verified W1G merge. It does not create STEP 15 or reopen STEP 0–14.

## Objective

Expose only the four sensitive FinanceCase command operations already implemented and authorized through W1E, without creating a second state machine, provider network path, or production activation path.

W1H-Finance exposes only:

- FinanceCase internal transition;
- external authority evidence recording;
- evidence-backed provider-offer recording;
- provider-offer selection.

Contract approval/finalization/snapshot commands remain outside this slice.

## Triple fail-closed activation

Every W1H-Finance command route is hidden unless all three server-only conditions are true:

- `ORCA_CONTRACT_FINANCE_API_ENABLED=true`
- `ORCA_CONTRACT_FINANCE_SCHEMA_READY=true`
- `ORCA_FINANCE_CASE_COMMANDS_ENABLED=true`

The command-specific flag is checked before delegating to the W1G base request boundary. None of these variables are set by W1H in repository, GitHub, Vercel, or production configuration.

## Authorization boundary

- W1H performs no database role lookup itself.
- After the triple gate, the existing signed-session boundary is used.
- W1E remains the first W1 database-backed authorization boundary and revalidates the current role against the live database.
- Existing W1E permissions are unchanged: FinanceCase transitions, authority recording, offer recording, and offer selection are limited to the currently mapped `ADMIN` / `SALES_MANAGER` roles.
- No super-admin/platform-owner bypass is introduced.
- `tenantId`, actor identity, role, or authorization identity can never be supplied by command payloads.

## Command routes

- `POST /api/v1/contract-finance/finance-cases/:id/transition`
- `POST /api/v1/contract-finance/finance-cases/:id/authority-evidence`
- `POST /api/v1/contract-finance/finance-cases/:id/provider-offers`
- `POST /api/v1/contract-finance/finance-cases/:id/provider-offers/:offerId/select`

Routes call only these W1E facade operations:

- `w1eTransitionFinanceCase`
- `w1eRecordFinanceAuthorityEvidence`
- `w1eRecordProviderOffer`
- `w1eSelectProviderOffer`

No route imports Prisma or a FinanceCase/provider-offer write service directly.

## Input integrity

- FinanceCase and offer path IDs must be canonical UUID-shaped values before W1E.
- `nextStatus` must be one of the FinanceCase internal statuses already modeled by W1B; W1B remains authoritative for whether a transition from the current state is legal.
- Authority evidence requires non-empty `authorityStatus`, `provider`, `providerReference`, and non-null top-level `evidenceJson`.
- Provider offer recording requires non-empty provider/reference, a strictly positive amount, a positive safe-integer term, optional non-negative financial scalars, optional valid ISO datetime expiry, and non-null top-level evidence JSON.
- No lender-specific DSR/rate/term maximum is introduced here.
- Provider raw documents/details belong in evidence JSON; ORCA does not fabricate external approval.

## Replay / state semantics

W1H does not claim universal request idempotency.

- Provider-offer recording inherits W1C idempotency for the same `(tenant, case, provider, providerReference)` when the normalized commercial terms match; a conflicting reuse is rejected.
- Provider-offer selection inherits the W1C replay-safe selected-offer behavior and expiry/state guards.
- Snapshot/contract commands are not in this slice.
- Finance state transitions and authority evidence recording remain governed by their persisted W1B state/evidence rules; W1H does not add a parallel state store.

## G4/G5 inventory reconciliation

Four guarded route files legitimately add four API contracts. W1H does not change G4/G5 scanners, normalization/reconciliation logic, priority logic, authentication detection, or runtime-risk logic.

The W1H contract test must reference all four route contracts directly. Generated-current executable baselines are reconciled only for deterministic totals:

- total G4 contracts: `367 -> 371`;
- total API routes / API auth evidence entries: `133 -> 137`;
- unproven contracts remain `33`;
- no P0 security-critical, P1 mutation, or P1 sensitive-read contract may remain unproven;
- `AUTH_EVIDENCE_NOT_DETECTED` remains zero;
- malformed contracts, duplicate contract IDs, and invalid permission keys remain zero.

Durable historical architecture markdown counts are not rewritten in this slice.

## Allowed paths

- `lib/domain/contract-finance/finance-command-boundary.ts`
- `app/api/v1/contract-finance/finance-cases/[id]/transition/route.ts`
- `app/api/v1/contract-finance/finance-cases/[id]/authority-evidence/route.ts`
- `app/api/v1/contract-finance/finance-cases/[id]/provider-offers/route.ts`
- `app/api/v1/contract-finance/finance-cases/[id]/provider-offers/[offerId]/select/route.ts`
- `tests/foundation/g8-w1h-finance-commands.test.ts`
- `tests/foundation/g4-page-operational-contracts.test.ts` — generated current inventory/API totals only
- `tests/foundation/g5-security-quality.test.ts` — generated current inventory/API totals only
- this gate document

## Explicit exclusions

- no Prisma schema/migration change or production migration/backfill;
- no environment activation or Vercel deploy;
- no provider API/network/credential call;
- no ContractApproval decision/finalization/snapshot endpoint;
- no Contract/PaymentPlan/Invoice/Installment/Journal mutation;
- no permission-role remapping;
- no lender-specific policy hard-coding;
- no G4/G5 scanner/control weakening;
- no UI.

## Closure

W1H-Finance closes only when the PR remains within the nine-file allowlist; direct G4/G5/G8 evidence covers all four new command routes; triple fail-closed gating and W1E-only command routing are proven; generated inventory has zero missing auth evidence and zero unproven P0/P1 surfaces; full ORCA CI through Build passes on one exact head; independent review finds no Critical/Major issue; and no production migration/deploy/provider activation occurs.
