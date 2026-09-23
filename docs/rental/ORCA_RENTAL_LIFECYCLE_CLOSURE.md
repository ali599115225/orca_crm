# ORCA — Rental Contract Lifecycle Closure

Status: implementation candidate for `work/orca-operational-core-cleanroom-20260921`.

This package closes the missing rental lifecycle slices without changing Prisma
schema and without applying a migration, deployment, provider credential, or
Production action.

## Reused foundations

The implementation preserves and reuses:

- Rent Flex 12 direct schedule and 12-invoice activation.
- `PaymentTransaction` + receipt + accounting posting.
- existing invoice `partial / paid / overdue` semantics.
- existing Unit handover evidence.
- existing `RentFlexSettlement` for external RNPL owner/company settlement.
- append-only `AuditLog` as lifecycle evidence for states that do not require a
  new table.

## Closed slices

### A — partial payment / outstanding

`POST /api/v1/invoices/:id/pay`

The existing manual payment route now accepts an optional `amount`.

- omitted `amount` preserves the previous behavior: settle the full remaining
  invoice balance.
- supplied `amount` may be a true partial amount.
- overpayment is rejected.
- failed idempotent retries preserve the original amount.
- reuse of one idempotency key with a different amount is rejected.
- the existing `completePaymentTransaction` remains the only completion path,
  so invoice status and receipts/accounting continue to use the transaction
  spine.

### B — Ejar reconciliation boundary

`POST /api/v1/leases/:id/ejar-reconciliation`

This route does not invent or assume an undocumented external Ejar API.
It is an authenticated internal boundary for evidence that has already been
confirmed by the configured provider/integration caller.

Two explicit behaviors are supported:

- `applyPayment=true`: create/retry an `EJAR` `PaymentTransaction`, then use
  `completePaymentTransaction`.
- `applyPayment=false`: attach official provider evidence to an invoice that is
  already financially settled in ORCA, preventing double financial allocation.

Provider references are idempotent. Direct monthly RF12 closure requires Ejar
evidence covering the full amount of every rental invoice.

### C — deposit + handover

`POST /api/v1/leases/:id/deposit-settlement`

- refund + deduction must exactly equal the held deposit.
- a positive held deposit requires settlement evidence.
- deductions require a reason.
- duplicate identical settlement is idempotent; conflicting settlement is
  rejected.

`POST /api/v1/leases/:id/handover`

- links an existing completed Unit handover to the rental lease.
- the closure gate rechecks that the linked handover still exists and remains
  completed.

### D — renewal / termination

`POST /api/v1/leases/:id/terminate`

- records a controlled terminal transition.
- effective date must fall inside the current lease term.
- termination does not bypass finance, deposit, handover, or final closure.

`POST /api/v1/leases/:id/renew`

- the prior lease must first satisfy its financial/Ejar/RNPL obligations.
- the successor starts after the current term.
- the existing held deposit is carried forward unchanged.
- physical handover is not required when the old term closes through renewal.
- the old lease records `renewed`; the new lease starts `active`.

The generic `PUT /api/v1/leases` route can no longer write terminal lifecycle
states and cannot reopen a lease that has already left `active`.

### E — final closure gate

`GET /api/v1/leases/:id/closure`

Returns the live gate facts and blockers.

`POST /api/v1/leases/:id/closure`

Closes only when all applicable invariants pass:

- direct RF12 has all 12 activated invoice links and all 12 linked invoices.
- non-external leases have invoices.
- outstanding balance is exactly zero.
- overpayment conflicts are not silently accepted.
- no payment is still pending/processing/review-required.
- direct monthly Ejar invoices have provider reconciliation evidence for their
  full amount.
- external RNPL has a full `RECEIVED` owner/company settlement with provider
  reference or evidence.
- held deposit is settled or carried into a completed renewal.
- completed handover is linked for expiry/termination.
- lease reached an allowed terminal reason: expired, terminated, or renewed.

A successful close appends:

1. `RENTAL_LEASE_FINANCIALLY_CLOSED`
2. `RENTAL_LEASE_CLOSED`

and then persists `RentalLease.status = "closed"` in the same serializable
transaction.

## Natural expiry rule

An active lease becomes eligible for the `EXPIRED` terminal reason only after
its `endDate` has passed. The end date itself is not treated as already expired.

## External RNPL

`EXTERNAL_RNPL_12` is not converted to an ORCA tenant receivable by this
package. Its closure financial gate relies on the existing locked RF12
settlement record reaching `RECEIVED` for exactly the expected amount and
carrying provider reference/evidence.

## Explicit non-actions

This package performs no:

- database migration or `db push`;
- Production data mutation;
- provider credential activation;
- external Ejar endpoint invention;
- Commit, Push, Merge, or Deploy.
