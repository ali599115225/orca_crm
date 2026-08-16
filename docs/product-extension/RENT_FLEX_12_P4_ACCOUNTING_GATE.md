# ORCA — RF12-P4 Accounting Guard + Direct Schedule Activation

Status: IMPLEMENTED FOR REVIEW  
Date: 2026-08-16  
Repository: `ali599115225/orca_crm`  
Base: `work/orca-unified-reference-20260813`  
Base SHA: `fab9ef98e3040a4670ebdf45e5aa1847b59606fa`

RF12-P4 implements the accounting slice frozen by `RENT_FLEX_12_PERSISTENCE_UI_ARCHITECTURE_GATE.md`. It protects legacy rental settlement from Rent Flex misuse and adds an explicit, idempotent activation path for the locked `DIRECT_MONTHLY_EJAR` company schedule. It does not activate external RNPL repayments as ORCA receivables.

## 1. Legacy `settle-lease` guard

`POST /api/accounting/settle-lease` keeps its existing behavior for a legacy lease with no Rent Flex selection.

When `ORCA_RENT_FLEX_12_SCHEMA_READY=true`, the route checks for a tenant-scoped `RentFlexSelection` attached to the lease before reading the legacy rent amount into accounting setup, reserving an invoice number, creating an invoice, or posting a journal entry.

If any attached Rent Flex selection exists, regardless of mode, the legacy one-shot settlement path fails closed with HTTP `409` and writes an audit record `RENT_FLEX_LEGACY_SETTLEMENT_BLOCKED`.

This preserves the frozen invariant that `RentalLease.rentAmount` is a legacy periodic-rent field and is never silently reinterpreted as the Rent Flex annual benchmark.

If the Rent Flex schema is not acknowledged as ready, the guard does not query Rent Flex tables and legacy behavior remains unchanged.

## 2. Direct monthly invoice activation

New command:

`POST /api/v1/rent-flex/selections/:id/activate-direct-invoices`

The command is allowed only for a tenant-scoped selection that is:

- `mode = DIRECT_MONTHLY_EJAR`;
- `status = LOCKED`;
- attached to a tenant-scoped `RentalLease`;
- backed by `companyScheduleJson` and `scheduleDigest`;
- free of external `financeCaseId` / `selectedProviderOfferId` state;
- currency-consistent with the lease.

Before any invoice is created, RF12-P4:

1. parses the stored 12-period schedule with the existing RF12-P1 contract;
2. recomputes the digest over the stored schedule;
3. independently rebuilds the deterministic 12-period plan from annual rent plus first due date;
4. requires the stored digest, recomputed digest, and deterministic digest to match;
5. requires the exact halala sum of the 12 subtotals to equal the persisted annual rent.

Only the verified locked company schedule becomes invoice source data.

For every period RF12-P4 creates one rental invoice using the lease VAT rate and posts its accounting entry through the existing `postInvoiceEntry` transaction-aware posting engine. The 12 invoices and their journal entries are created inside one serializable database transaction.

## 3. Idempotency identity

RF12-P4 adds the additive Prisma model `RentFlexDirectInvoiceLink` in `prisma/rent-flex-12-accounting.prisma`.

It stores the stable mapping:

`tenant + RentFlexSelection + installmentNumber -> Invoice`

with the period due date, subtotal, and locked schedule digest.

Required uniqueness:

- one mapping per `(tenantId, rentFlexSelectionId, installmentNumber)`;
- one mapping per `(tenantId, invoiceId)`.

A replay is idempotent only when exactly 12 mappings and exactly 12 referenced invoices match the locked schedule and financial amounts. A partial or inconsistent mapping fails closed instead of filling missing periods by inference.

Concurrent `P2002` / `P2034` races are reconciled by rereading the complete activation. If another request completed the exact 12-period activation, the later request returns it as idempotent. Otherwise the command retries once and then fails closed.

The tenant invoice counter reserves a contiguous 12-number range atomically inside the same serializable transaction.

## 4. Accounting authorization

Financial activation is narrower than ordinary Rent Flex write permissions.

The facade first reuses the existing database-backed `finance-case.transition` actor boundary, then independently revalidates the actor against `ACCOUNTING_WRITE_ROLES`.

Current repository accounting writes are ADMIN-only. RF12-P4 does not broaden that authority to Sales Manager or other roles.

## 5. Dark-by-default activation

The new direct invoice endpoint remains dark unless all existing Rent Flex readiness/write gates pass and the additional flag is exactly:

`ORCA_RENT_FLEX_12_DIRECT_INVOICING_ENABLED=true`

The new flag is checked in addition to:

- `ORCA_RENT_FLEX_12_ENABLED=true`;
- `ORCA_RENT_FLEX_12_SCHEMA_READY=true`;
- `ORCA_RENT_FLEX_12_WRITES_ENABLED=true`;
- `ORCA_RENT_FLEX_12_ACCOUNTING_GUARD_READY=true`.

RF12-P4 does not set any of these flags in repository configuration, GitHub, Vercel, or production. `ORCA_RENT_FLEX_12_DIRECT_INVOICING_ENABLED` is also the operational acknowledgement that the P4 additive accounting persistence required by this endpoint has been installed before the endpoint is exposed.

## 6. External RNPL remains non-invoice data

`EXTERNAL_RNPL_12` is rejected by the direct activation contract.

RF12-P4 does not read `RentFlexOfferTerms.repaymentScheduleJson` as invoice source data and does not create ORCA invoices, `PaymentPlan` installments, `Installment` rows, or `PaymentTransaction` rows from provider repayment periods.

`RentFlexSettlement` remains provider-to-owner/company operational evidence and is not converted into a tenant receivable by this slice.

## 7. Schema and rollout boundary

RF12-P4 adds only a Prisma model definition for the invoice-link identity.

This slice performs no:

- migration generation;
- migration application;
- `prisma db push`;
- production backfill;
- environment/feature-flag mutation;
- Vercel configuration change;
- deploy;
- provider API call;
- Ejar API call;
- callback/webhook activation;
- production action.

The existing `prisma/rent-flex-12.prisma` P1 domain remains unchanged so its original non-accounting contract is preserved.

## 8. Verification contract

`tests/foundation/g8-rent-flex-12-p4-accounting.test.ts` verifies:

- exactly 12 deterministic direct invoice drafts;
- exact annual subtotal preservation;
- stored/deterministic digest validation and tamper rejection;
- locked direct-only activation;
- VAT computation consistent with the current rental accounting percentage convention;
- additive idempotency schema identities;
- legacy `settle-lease` guard ordering before accounting side effects;
- ADMIN-only accounting facade;
- dark direct-invoicing feature gate;
- facade-only API route;
- serializable/idempotent transaction evidence;
- no external RNPL repayment invoicing;
- no `PaymentPlan`, `Installment`, `PaymentTransaction`, provider-network, migration, deploy, or production behavior.

Fresh Prisma generation, Typecheck, G4/G5/G8 gates, foundation/core regressions, and Build must pass on one exact PR head before RF12-P4 is merge-ready. Independent review must have no unresolved material finding.
