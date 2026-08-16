# ORCA — RF12-P1 Additive Persistence + Domain Commands

Status: IMPLEMENTED FOR REVIEW  
Date: 2026-08-16  
Repository: `ali599115225/orca_crm`  
Base: `work/orca-unified-reference-20260813`  
Base SHA: `7762b851738b4600d6f87edc7b94140b39fc8d9c`

This slice implements the first code package authorized by the merged Rent Flex 12 persistence/UI architecture gate. It does not create or apply a database migration and does not activate any provider, Ejar, accounting, deployment, or production behavior.

## Implemented

### Additive Prisma domain

`prisma/rent-flex-12.prisma` adds four isolated models:

- `RentFlexUnitConfig`
- `RentFlexSelection`
- `RentFlexOfferTerms`
- `RentFlexSettlement`

The schema intentionally uses tenant-validated scalar UUID references for legacy/W1 identities. It does not rewrite `RentalLease`, `Unit`, `Lead`, `FinanceCase`, `FinanceProviderOffer`, `PaymentPlan`, `Installment`, or `Invoice`.

No `RentFlexProviderOffer` model exists. External provider cases/offers remain under W1 `FinanceCase` / `FinanceProviderOffer`.

Tenant-scoped uniqueness prevents one RentalLease, FinanceCase, or selected provider offer from being bound to conflicting Rent Flex selections.

### Domain command service

`lib/domain/rental/rent-flex-12-service.ts` implements:

- `configureRentFlexForUnit`
- `createDirectMonthlySelection`
- `createExternalRnplSelection`
- `attachExternalFinanceCase`
- `attachExternalOfferTerms`
- `selectExternalRnplOffer`
- `attachRentFlexSelectionToLease`
- `lockRentFlexSelection`
- `recordRentFlexSettlement`

Every command requires the authoritative async tenant context and rejects tenant mismatch. If the context carries a user identity, actor mismatch is rejected as well.

Material state changes write to the existing `AuditLog` table.

## Frozen invariants implemented

### Direct monthly Ejar-compatible mode

- mode is `DIRECT_MONTHLY_EJAR`;
- the RF12-P1 command boundary validates `firstDueDate` before invoking the lower-level calculator, so invalid command dates use the RF12-P1 error contract;
- the verified Rent Flex 12 calculator generates exactly 12 company/owner receivable periods;
- annual totals are preserved to halala precision;
- the company schedule and SHA-256 digest are stored on the selection;
- no W1 finance case or provider offer may be attached to the direct mode;
- lock parses the stored schedule JSON and recomputes both stored and expected digests before accepting the immutable state.

### External RNPL mode

- mode is `EXTERNAL_RNPL_12`;
- a new external selection is allowed only when the same-tenant `RentFlexUnitConfig` is `ACTIVE` and `externalRnplEnabled = true`;
- selection begins as `DRAFT`;
- selection becomes `SELECTED` only after a same-tenant W1 FinanceCase is attached;
- one FinanceCase may bind to only one Rent Flex selection within a tenant;
- the FinanceCase must have purpose `RENT_FLEX_12`, term 12 months, matching unit, and matching requested annual amount;
- provider offers are selected through the existing W1 `selectProviderOfferInTransaction` helper, executed inside the Rent Flex Serializable transaction, so W1 offer selection and Rent Flex selection update commit or roll back together;
- RNPL-specific owner settlement, total tenant payable, cost delta, first due date, exact 12-payment external schedule, and quote digest are stored in `RentFlexOfferTerms`;
- lock parses the persisted external repayment schedule and recomputes the quote identity from the selected W1 offer and stored terms;
- external repayment schedule is informational provider repayment data only;
- external repayment schedule never creates an ORCA invoice, PaymentPlan, Installment, PaymentTransaction, or ledger entry in RF12-P1.

### Lease binding

A selection may be attached only to a same-tenant RentalLease. If the lease has a unit identity it must match the selection unit. A lease cannot have two Rent Flex selections.

Lease creation may occur after an external selection is locked and after its operational settlement record exists. When a lease is attached later, the same transaction propagates the lease identity to an existing Rent Flex settlement whose `rentalLeaseId` is still null.

`RentalLease.rentAmount` is not modified or reinterpreted.

### Locking

Selection lifecycle is fail-closed:

`DRAFT -> SELECTED -> LOCKED`

with cancellation allowed only before lock.

`LOCKED` is terminal for RF12-P1 money/mode/schedule/provider identity. The lease identity may be attached before or after lock because lease creation can occur after the commercial choice is frozen.

### Provider settlement

`RentFlexSettlement` tracks provider-to-owner/company settlement operationally for locked external RNPL selections.

Settlement amounts obey:

- `EXPECTED`: no paid amount;
- `PARTIAL`: amount is greater than zero and below expected;
- `FAILED`: no received amount is recorded and retry/recovery may return to a valid non-terminal state;
- `RECEIVED`: amount equals expected exactly;
- amount cannot exceed expected;
- `RECEIVED` and `CANCELLED` are terminal;
- a recorded partial receipt cannot be rewritten into `FAILED` or `CANCELLED`, preserving received-money evidence.

`receivedAt` is specifically the timestamp at which the **full expected settlement** is received. It remains null while settlement status is `PARTIAL`; partial amount changes do not redefine that field as a generic last-payment timestamp.

No accounting mutation occurs from this record.

## Verification contract

`tests/foundation/g8-rent-flex-12-p1-persistence.test.ts` verifies:

- tenant/actor context mismatch fails closed;
- selection lifecycle boundaries;
- settlement recovery and amount invariants;
- strict date-only parsing and deterministic digests;
- all four additive models exist;
- unit, FinanceCase, provider-offer, and lease identity constraints are represented;
- no duplicate Rent Flex provider-offer model is introduced;
- W1 provider selection is reused atomically inside the Rent Flex Serializable transaction;
- external RNPL requires an active/enabled unit configuration;
- late lease attachment synchronizes an existing settlement identity;
- service source contains tenant guard + audit boundary;
- service source contains no invoice/payment/accounting/network creation path.

The pull request must pass fresh Prisma generation, Typecheck, foundation/core regressions, and Build on one exact head before RF12-P1 can be considered verified.

## Explicit exclusions

RF12-P1 does **not** authorize or perform:

- migration generation;
- migration application;
- `prisma db push`;
- production schema changes;
- backfill;
- API routes;
- UI changes;
- invoice generation;
- PaymentPlan/Installment generation;
- ledger/accounting posting;
- Ejar API calls;
- provider API calls or callbacks;
- credit bureau, payroll, or open-banking access;
- provider credentials;
- deploy;
- production action.

## Next slice after verification

`RF12-P2 — Read/write API wrappers`

RF12-P2 may expose tenant/RBAC protected endpoints over this domain only after RF12-P1 is reviewed and merged and after schema readiness is separately established. A migration artifact or database application remains a separate governed action.
