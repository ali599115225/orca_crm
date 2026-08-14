# ORCA W1B — Contract / Finance Service Integrity Gate

Status: FROZEN FOR W1B SERVICE IMPLEMENTATION

Base: `1276d80b9eaa2e6c47792342e2a3f53e8de342f4`

This package follows the merged W1A persistence foundation and does not create STEP 15 or reopen STEP 0–14.

## Objective

Close the two residual integrity gates before any Contract Studio / Finance Case public write surface is introduced:

1. tenant-safe validation of legacy scalar `leadId`, `unitId`, and `contractId` references;
2. a canonical append-oriented ContractSnapshot service boundary with no update/delete capability.

## Invariants

- Transaction Spine remains the only authority for offer → Contract → Invoice → company PaymentPlan → Installments.
- W1B must not mutate existing Contract, PaymentPlan, Installment, Offer, Unit, or Lead records.
- A W1 record may reference a legacy Lead/Unit/Contract only after confirming that the referenced record belongs to the current tenant.
- When both `contractId` and `unitId` are supplied, the Contract must point to that same Unit.
- When both `contractId` and `leadId` are supplied and the Contract already has a Lead, they must match.
- ContractSnapshot issuance uses a deterministic SHA-256 digest over canonical snapshot content.
- The W1B snapshot service exposes create/read operations only. It must expose no update/delete path.
- No route, server action, UI, provider adapter, deployment, production migration, backfill, or provider activation is in W1B.
- Existing W1A migration remains unapplied to production under this package.

## Allowed paths

- `lib/domain/contract-finance/legacy-reference-guard.ts`
- `lib/domain/contract-finance/contract-snapshot-service.ts`
- `tests/foundation/g8-w1b-contract-finance-services.test.ts`
- this gate document

## Acceptance

- Guard rejects missing/cross-tenant legacy references.
- Guard rejects Contract/Unit mismatch and Contract/Lead mismatch.
- Guard uses tenant-aware Prisma only; raw Prisma access is forbidden.
- Snapshot digest is deterministic across object key order.
- Snapshot service verifies draft/template/legacy Contract consistency before insert.
- Snapshot service contains no ContractSnapshot update/delete capability.
- G8 focused tests pass.
- Prisma validate/generate, typecheck, full ORCA CI through Build pass on exact head.
- No production migration/deploy/provider activation is performed.
