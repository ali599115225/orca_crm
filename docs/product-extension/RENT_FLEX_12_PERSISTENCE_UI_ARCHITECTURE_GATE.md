# ORCA — Rent Flex 12 Persistence + UI Architecture Gate

Status: ARCHITECTURE FROZEN FOR IMPLEMENTATION SLICES  
Date: 2026-08-16  
Repository: `ali599115225/orca_crm`  
Base reference: `work/orca-unified-reference-20260813`  
Base SHA: `eb6f93d907009ee6bb577d5b9c819a41322f5ed5`

This gate follows the merged `RENT_FLEX_12_PRODUCT_GATE.md` foundation. It does not create STEP 15, does not reopen STEP 0–14, and does not authorize production migration, deploy, provider activation, credit-bureau access, open-banking access, or production actions.

## 1. Evidence from the live codebase

The current rental stack establishes four constraints that this architecture must preserve:

1. `RentalLease.rentAmount` is an existing legacy periodic-rent field.
2. `POST /api/v1/leases` currently accepts one `rent` value and persists it to `RentalLease.rentAmount`.
3. `POST /api/accounting/settle-lease` currently treats `RentalLease.rentAmount` as the subtotal for a single settlement invoice and ledger posting.
4. W1 already provides `FinanceCase` and `FinanceProviderOffer` for provider-neutral finance cases, offers, provider references, authority states, down payments, monthly payments, term months, expiry, and evidence.

Therefore:

- `RentalLease.rentAmount` MUST NOT be silently redefined as annual rent.
- the existing legacy settlement endpoint MUST NOT be used to post Rent Flex schedules by inference;
- external RNPL provider offers MUST reuse the existing W1 finance-case authority instead of creating a duplicate provider-offer domain;
- Rent Flex persistence should be additive and should avoid rewriting the frozen legacy rental schema merely to attach the new workflow.

## 2. Frozen domain split

### 2.1 `DIRECT_MONTHLY_EJAR`

Meaning:

`Underlying annual rent -> deterministic 12-period company/owner receivable schedule`

The 12 periods are ORCA-side rental obligations. When financial activation is later authorized, invoices may be created from the locked company schedule.

### 2.2 `EXTERNAL_RNPL_12`

Meaning:

`Underlying annual rent -> external provider settles owner/company`

separate from:

`Tenant -> external provider -> 12 external repayments`

The 12 external repayments are informational inside ORCA and MUST NOT become ORCA invoices, seller `PaymentPlan` installments, or company receivables.

## 3. Persistence strategy

The persistence implementation MUST be additive in a dedicated Prisma domain file such as:

`prisma/rent-flex-12.prisma`

Legacy/W1 identifiers may be stored as tenant-validated scalar UUIDs where adding reverse relations would require rewriting an otherwise frozen schema. Every scalar cross-domain reference MUST be resolved inside the tenant boundary before write or transition.

### 3.1 `RentFlexUnitConfig`

Purpose: property/unit-level configuration for displaying Rent Flex before lease creation.

Required logical fields:

- `id`
- `tenantId`
- `unitId`
- `externalRnplEnabled`
- `status` (`ACTIVE | DISABLED`)
- `createdBy`
- `updatedBy`
- `createdAt`
- `updatedAt`

Required uniqueness:

- one configuration per `(tenantId, unitId)`.

Invariant:

`externalRnplEnabled = true` means the option is configured/marketed for the unit. It MUST NOT mean that a tenant is approved or eligible with any external provider.

No new generic `Listing` entity is introduced by this feature. The current property surface is unit-based, so pre-lease Rent Flex availability attaches to `Unit` by scalar `unitId`.

### 3.2 `RentFlexSelection`

Purpose: one auditable Rent Flex choice that can begin before lease creation and later be attached to a `RentalLease`.

Required logical fields:

- `id`
- `tenantId`
- `unitId`
- `leadId` optional
- `rentalLeaseId` optional
- `financeCaseId` optional
- `selectedProviderOfferId` optional
- `mode` (`DIRECT_MONTHLY_EJAR | EXTERNAL_RNPL_12`)
- `annualRentAmount`
- `currency` default `SAR`
- `firstDueDate`
- `companyScheduleJson` optional
- `scheduleDigest` optional
- `status` (`DRAFT | SELECTED | LOCKED | CANCELLED`)
- `createdBy`
- `updatedBy`
- `selectedAt` optional
- `lockedAt` optional
- `createdAt`
- `updatedAt`

Mode invariants:

For `DIRECT_MONTHLY_EJAR`:

- `companyScheduleJson` is required before `LOCKED`;
- schedule is produced by the verified `rent-flex-12.ts` calculator;
- exactly 12 periods are required;
- exact halala total MUST equal `annualRentAmount`;
- `financeCaseId` and `selectedProviderOfferId` are null;
- the schedule is a company/owner receivable schedule.

For `EXTERNAL_RNPL_12`:

- `financeCaseId` is required before `SELECTED`;
- `selectedProviderOfferId` is required before `LOCKED`;
- `companyScheduleJson` MUST remain null;
- external repayment schedule lives with the selected provider offer terms, not on the company receivable selection.

Lock invariant:

Once a selection reaches `LOCKED`, money values, mode, first due date, selected provider offer, and schedule snapshots are immutable. A later change requires cancellation/replacement or an explicit amendment workflow; it must not rewrite the historical locked record.

### 3.3 Reuse `FinanceCase` / `FinanceProviderOffer`

External RNPL MUST reuse the existing W1 finance-case domain.

Frozen interpretation for this feature:

- `FinanceCase.purpose = "RENT_FLEX_12"`;
- `FinanceCase.unitId` identifies the target unit before lease creation;
- `FinanceCase.leadId` may identify the prospective tenant when available;
- `FinanceCase.requestedAmount` represents the underlying requested annual rent amount for the external RNPL case;
- `FinanceCase.termMonths = 12` for this product slice;
- `FinanceProviderOffer.provider`, `providerReference`, `authorityStatus`, `downPayment`, `monthlyPayment`, `fees`, `termMonths`, `expiresAt`, and `evidenceJson` remain provider-neutral evidence fields.

The implementation MUST NOT introduce a second `RentFlexProviderOffer` table duplicating `FinanceProviderOffer`.

### 3.4 `RentFlexOfferTerms`

Purpose: preserve RNPL-specific commercial values that the generic finance offer cannot safely infer.

Required logical fields:

- `id`
- `tenantId`
- `financeProviderOfferId`
- `ownerSettlementAmount`
- `totalTenantPayable`
- `tenantCostDelta`
- `firstDueDate`
- `repaymentScheduleJson`
- `quoteDigest`
- `createdAt`
- `updatedAt`

Required uniqueness:

- one RNPL terms record per `(tenantId, financeProviderOfferId)`.

Invariants:

- `repaymentScheduleJson` is always external-provider repayment data;
- it is never invoice source data;
- `ownerSettlementAmount`, `totalTenantPayable`, and the exact external schedule are persisted explicitly and MUST NOT be reconstructed from `monthlyPayment`, `fees`, or assumptions;
- `tenantCostDelta = totalTenantPayable - annual underlying rent` is descriptive only and MUST NOT be labelled by ORCA as interest, finance charge, or Sharia classification.

### 3.5 `RentFlexSettlement`

Purpose: operationally track the provider-to-owner/company settlement without pretending that the tenant's provider installments are company receivables.

Required logical fields:

- `id`
- `tenantId`
- `rentFlexSelectionId`
- `financeCaseId` optional
- `financeProviderOfferId` optional
- `rentalLeaseId` optional
- `expectedAmount`
- `receivedAmount` optional
- `currency` default `SAR`
- `status` (`EXPECTED | PARTIAL | RECEIVED | FAILED | CANCELLED`)
- `providerReference` optional
- `receivedAt` optional
- `evidenceJson` optional
- `createdBy`
- `updatedBy`
- `createdAt`
- `updatedAt`

Accounting invariant:

This record is operational evidence only in the first persistence/UI implementation. Creation or update MUST NOT automatically create an invoice, payment transaction, journal entry, or ledger posting. Accounting activation requires a separate gate based on the actual commercial relationship.

## 4. Legacy compatibility

### 4.1 Preserve `RentalLease.rentAmount`

No Rent Flex implementation may reinterpret existing `RentalLease.rentAmount` values.

Existing leases and existing callers without Rent Flex continue to behave as today.

The future lease-create API may accept an optional `rentFlexSelectionId`. When present it must validate:

- same `tenantId`;
- same `unitId` when both records have a unit identity;
- selection status allows attachment;
- no other rental lease is already bound to the locked selection.

The Rent Flex annual benchmark and schedules live in the additive Rent Flex domain, not by overloading `rentAmount`.

### 4.2 Guard legacy `settle-lease`

The current `settle-lease` endpoint creates one invoice from `RentalLease.rentAmount`.

Therefore, once a rental lease is attached to a Rent Flex selection in either mode, the legacy settlement path MUST fail closed unless a later schedule-aware accounting slice explicitly delegates it.

Required future behavior:

- legacy lease with no Rent Flex selection: current behavior preserved;
- `DIRECT_MONTHLY_EJAR`: legacy one-shot settlement is blocked; later invoice activation reads the locked company schedule;
- `EXTERNAL_RNPL_12`: legacy one-shot tenant settlement is blocked; external provider repayment is never invoiced to the tenant by ORCA merely because the RNPL case exists.

## 5. Service boundary

Future implementation should expose a dedicated domain service rather than letting UI/routes write these records directly.

Required command boundaries:

- `configureRentFlexForUnit`
- `createDirectMonthlySelection`
- `createExternalRnplSelection`
- `attachExternalFinanceCase`
- `attachExternalOfferTerms`
- `selectExternalRnplOffer`
- `attachRentFlexSelectionToLease`
- `lockRentFlexSelection`
- `recordRentFlexSettlement`

Every command MUST:

- call `requireTenantContext()` or equivalent authoritative tenant guard;
- verify all referenced records are in that tenant;
- validate status transitions fail-closed;
- reject conflicting selected offers;
- reject mutation of locked snapshots;
- write audit evidence for material transitions.

No domain command may call a provider API, Ejar API, credit bureau, payroll API, or open-banking API in this slice.

## 6. API boundary

A later API slice may add rental-specific wrappers such as:

- `GET/PUT /api/v1/rent-flex/units/:unitId`
- `POST/GET /api/v1/rent-flex/selections`
- `GET /api/v1/rent-flex/selections/:id`
- `POST /api/v1/rent-flex/selections/:id/offers`
- `POST /api/v1/rent-flex/selections/:id/select-offer`
- `POST /api/v1/rent-flex/selections/:id/lock`
- `POST /api/v1/rent-flex/selections/:id/settlements`

Rental API wrappers may call the shared W1 finance-case service for `FinanceCase` / `FinanceProviderOffer`; they must not duplicate finance business rules.

Writes require the repository's finance/write role boundary. Reads remain tenant-scoped. Provider callbacks are explicitly out of scope until a provider adapter is separately authorized.

## 7. UI contract

The first Rent Flex UI implementation should extend existing surfaces instead of creating an isolated product silo.

### 7.1 Properties / units

On `PropertiesWorkspace`:

- display a compact `الدفع المرن متاح` badge when `RentFlexUnitConfig.externalRnplEnabled = true`;
- wording means availability/configuration only;
- never show `مؤهل`, `مقبول`, or provider approval before provider evidence exists.

### 7.2 Lease creation

Extend the existing rental lease creation flow with a Rent Flex selector.

Initial choices in this feature slice:

- existing/legacy periodic payment;
- `دفع شهري مباشر` -> `DIRECT_MONTHLY_EJAR`;
- `استأجر الآن وادفع على 12 دفعة` -> `EXTERNAL_RNPL_12`.

For direct monthly:

- annual underlying rent;
- first due date;
- read-only 12-period preview generated from the verified calculator;
- exact annual total shown.

For external RNPL:

- annual underlying rent;
- quote comparison panel;
- provider;
- upfront/down payment;
- monthly payment;
- total tenant payable;
- cost delta;
- offer expiry;
- provider reference/status.

The UI MUST distinguish `عرض مزود` from `موافقة مزود`.

### 7.3 Lease detail

A Rent Flex section/tab should show:

For direct monthly:

- locked company schedule;
- due/paid state only after a later invoice-activation slice exists.

For external RNPL:

- selected provider offer;
- external repayment timeline labelled as external/provider repayments;
- owner/company settlement status;
- provider reference/evidence;
- no ORCA invoice status for the provider repayment periods.

### 7.4 Settlement view

Existing settlement UI may later display `RentFlexSettlement` as a distinct settlement source, but it MUST NOT synthesize the amount from tenant external repayments.

## 8. Feature flags and rollout

Implementation MUST remain dark until persistence and route contracts are verified.

Recommended bounded flags:

- `ORCA_RENT_FLEX_12_ENABLED`
- `ORCA_RENT_FLEX_12_WRITES_ENABLED`

The read flag may expose configured/verified records. The write flag controls creation/selection/locking commands.

A provider-specific flag is not introduced until a provider adapter exists.

## 9. Security, privacy, and audit

Required:

- tenant isolation on every read/write;
- no raw credentials in Rent Flex tables;
- no bank/credit/payroll data merely to calculate a schedule;
- provider `evidenceJson` treated as external evidence, not ORCA certification;
- audit events for selection, offer selection, lock, cancellation, settlement status changes;
- no arbitrary provider response rendering in UI without normalisation/escaping;
- no provider eligibility inference by ORCA.

## 10. Implementation slices after this gate

### RF12-P1 — Additive persistence + domain commands

Target:

- new additive Rent Flex Prisma domain;
- tenant-safe services and transition rules;
- focused tests;
- migration artifact only if separately authorized under governance;
- no production migration.

### RF12-P2 — Read/write API wrappers

Target:

- tenant/RBAC protected Rent Flex APIs;
- finance-case reuse for external provider offers;
- no external network calls.

### RF12-P3 — Property + lease UI

Target:

- unit availability badge;
- lease creation selector and schedule preview;
- provider offer comparison;
- lease-detail Rent Flex panel.

### RF12-P4 — Accounting guard + direct schedule activation

Target:

- protect legacy `settle-lease` from Rent Flex misuse;
- activate direct monthly invoice generation from locked company schedule only;
- external repayment schedule remains non-invoice data.

This slice requires separate accounting verification.

### RF12-P5 — Provider adapters

Out of scope until a specific provider is selected and integration evidence, credentials, consent/privacy scope, callbacks, and commercial/legal responsibility are separately authorized.

## 11. Acceptance criteria for the persistence/UI program

The program is acceptable only when all of the following hold:

- `RentalLease.rentAmount` legacy meaning is preserved;
- unit-level availability does not imply provider approval;
- direct monthly and external RNPL remain separate domains;
- external RNPL reuses W1 `FinanceCase` / `FinanceProviderOffer` rather than duplicating them;
- exact provider total and schedule are persisted, not inferred;
- locked selections are immutable;
- direct company schedule is the only Rent Flex schedule eligible to become ORCA receivables;
- external provider repayment never becomes an ORCA invoice/payment plan by inference;
- provider-to-owner/company settlement is separately tracked;
- legacy `settle-lease` cannot accidentally post a Rent Flex lease;
- tenant/RBAC/audit tests pass;
- no provider API, Ejar API, production migration, deploy, or production action occurs without its own authorization gate.

## 12. Authorization boundary

This architecture gate itself is documentation-only.

It does NOT authorize:

- Prisma schema edits;
- migration creation/application;
- production backfill;
- deployment;
- provider credentials;
- provider/Ejar/open-banking/credit calls;
- production accounting changes.

Those actions remain governed by their applicable implementation and owner-authorization gates.
