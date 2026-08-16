# ORCA — RF12-P2 Guarded Read/Write API Wrappers

Status: IMPLEMENTED FOR REVIEW  
Date: 2026-08-16  
Repository: `ali599115225/orca_crm`  
Base: `work/orca-unified-reference-20260813`  
Base SHA: `e24a1999c77f201bbf1d51277c6f8e5a01e0a5de`

RF12-P2 exposes a dark-by-default network boundary over the merged RF12-P1 domain. It does not create or apply a migration, set any environment variable, call an external provider, call Ejar, post accounting entries, change UI, deploy, or perform a production action.

## Activation contract

Every Rent Flex route returns before authentication or any Rent Flex database/domain operation unless the server-only read gates are exactly:

- `ORCA_RENT_FLEX_12_ENABLED=true`
- `ORCA_RENT_FLEX_12_SCHEMA_READY=true`

Every normal write additionally requires:

- `ORCA_RENT_FLEX_12_WRITES_ENABLED=true`

Lease binding has one additional fail-closed readiness requirement:

- `ORCA_RENT_FLEX_12_ACCOUNTING_GUARD_READY=true`

This fourth condition exists because the frozen architecture requires the legacy `settle-lease` path to fail closed once a lease is attached to any Rent Flex selection. RF12-P2 deliberately does not modify accounting behavior, so `/api/v1/rent-flex/selections/:id/lease` MUST remain dark until the later accounting-guard slice has been independently implemented and verified. Enabling the three general Rent Flex flags alone cannot create a lease-bound Rent Flex state.

All flags remain absent/false by default. RF12-P2 does not set them in repository configuration, Vercel, GitHub, or production.

`ORCA_RENT_FLEX_12_SCHEMA_READY` and `ORCA_RENT_FLEX_12_ACCOUNTING_GUARD_READY` are operational acknowledgements only. This PR does not infer production readiness from Prisma client generation or CI and does not create/apply a migration or accounting guard. Until the corresponding acknowledgements are separately established, those network surfaces remain dark.

## RBAC and tenant boundary

Routes call `requireAuth()` only after the applicable feature/schema/write/readiness gates. The Rent Flex application facade then reuses the existing database-role revalidation contract through `authorizeW1eActor` and establishes AsyncLocal tenant context before invoking RF12-P1 commands.

Permission reuse is intentionally conservative:

- reads: `finance-case.read`;
- unit configuration and selection/lease creation: `finance-case.create`;
- finance-case attachment, RNPL terms, and settlement evidence: `finance-case.offer-record`;
- provider offer selection: `finance-case.offer-select`;
- immutable lock transition: `finance-case.transition`.

Request bodies cannot provide `tenantId`, `actorId`, `userId`, `createdBy`, `updatedBy`, or `role`. Those fields are rejected rather than ignored.

## API routes

- `GET/PUT /api/v1/rent-flex/units/:unitId`
- `GET/POST /api/v1/rent-flex/selections`
- `GET /api/v1/rent-flex/selections/:id`
- `POST /api/v1/rent-flex/selections/:id/finance-case`
- `POST /api/v1/rent-flex/selections/:id/offer-terms`
- `POST /api/v1/rent-flex/selections/:id/select-offer`
- `POST /api/v1/rent-flex/selections/:id/lease` — additionally gated by `ORCA_RENT_FLEX_12_ACCOUNTING_GUARD_READY=true`
- `POST /api/v1/rent-flex/selections/:id/lock`
- `POST /api/v1/rent-flex/selections/:id/settlements`

The explicit command routes avoid a generic action endpoint with over-broad authorization.

## Read contract

The read service is tenant scoped and normalizes Decimal and Date values for JSON delivery.

Selection detail may expose:

- the persisted Rent Flex selection and locked company schedule;
- normalized W1 provider-offer commercial fields;
- RNPL-specific `RentFlexOfferTerms`, including the exact external repayment schedule;
- operational `RentFlexSettlement` status.

It intentionally does not return raw provider `evidenceJson` or settlement `evidenceJson` in this first API read model. Provider evidence remains stored evidence and is not treated as ORCA certification.

## Input contract

RF12-P2 validates before the facade call:

- UUID-shaped path/body references;
- strict `YYYY-MM-DD` dates;
- positive annual/offer money values;
- non-negative optional received amounts;
- known mode/status enums;
- list limits from 1 through 100;
- non-empty provider references when supplied;
- JSON document shape for request bodies.

Malformed JSON or forbidden identity fields return a generic `400`. Authorization failures map to `401/403`. Tenant/domain not-found maps to `404`. Known conflicts/state mismatches/unique conflicts map to `409`. Unexpected failures return a generic `500` without stack leakage.

## Domain reuse

Routes never import Prisma or RF12-P1/W1 write services directly. They call only the Rent Flex application facade.

External RNPL continues to reuse W1 `FinanceCase` and `FinanceProviderOffer`. RF12-P2 does not create a duplicate provider-offer model or implement provider network calls.

## Accounting and provider exclusions

RF12-P2 performs no:

- invoice generation;
- `PaymentPlan` or `Installment` mutation;
- payment transaction or ledger/journal posting;
- legacy `settle-lease` activation/change;
- provider callback/webhook;
- provider API call;
- Ejar API call;
- credit bureau, payroll, or open-banking call;
- credential storage or activation;
- Prisma migration generation/application;
- `prisma db push`;
- production backfill;
- UI change;
- deploy or production action.

Because the legacy `settle-lease` guard is intentionally not implemented in RF12-P2, lease binding is separately dark until `ORCA_RENT_FLEX_12_ACCOUNTING_GUARD_READY=true` is acknowledged after the later guard slice is verified.

`RentFlexSettlement` remains operational provider-to-owner/company evidence only.

## Verification contract

`tests/foundation/g8-rent-flex-12-p2-api.test.ts` must provide direct G4 evidence for all nine routes and verify:

- double read gate plus write gate;
- lease binding additionally requires accounting-guard readiness;
- all applicable gates execute before authentication/facade operations;
- facade-only routing;
- existing RBAC permission reuse;
- no caller-supplied tenant/actor identity;
- strict UUID/date/money/enum/list validation;
- normalized read model without raw provider evidence;
- no provider/network/accounting/deploy/migration surface.

Fresh Prisma generation, Typecheck, G4/G5/G8 tests, foundation/core regressions, and Build must pass on one exact head. Independent review must find no Critical/Major issue before merge readiness.

## Next slice

After RF12-P2 is reviewed and merged, the next planned slice remains:

`RF12-P3 — Property + lease UI`

RF12-P3 must remain dark until persistence/schema operational readiness is separately acknowledged. Migration creation/application and production flag activation remain separate governed actions. The actual legacy accounting guard remains a later governed slice; no lease-binding surface may be activated before that guard is independently verified.
