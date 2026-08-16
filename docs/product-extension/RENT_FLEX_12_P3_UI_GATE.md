# ORCA — RF12-P3 Property + Lease UI Gate

Status: IMPLEMENTED FOR REVIEW  
Date: 2026-08-16  
Repository: `ali599115225/orca_crm`  
Base: `work/orca-unified-reference-20260813`  
Base SHA: `e1dc0395e24798b737de75d0078a46fb5050f020`

RF12-P3 extends the existing Properties and Rental/Leases surfaces with a dark-by-default Rent Flex UI over the merged RF12-P1/P2 domain and API boundaries. It does not create or apply a migration, activate flags, bind a Rent Flex selection to a lease, change legacy accounting behavior, call a provider, deploy, or perform a production action.

## 1. UI placement

RF12-P3 does not add a new Rent Flex navigation silo.

It adds two contextual components to existing pages:

- `RentFlexPropertyAvailabilityPanel` on `/operations/properties`;
- `RentFlexLeaseWorkspacePanel` on `/operations/rental/leases`, alongside the existing `ContractsPaymentsCenter`.

The approved `PropertiesWorkspace` and `ContractsPaymentsCenter` implementations are not rewritten in this slice. The add-ons are isolated so their dark state leaves the established pages unchanged.

## 2. Dark-by-default contract

Both UI surfaces discover Rent Flex only through the guarded RF12-P2 endpoints.

If the Rent Flex read boundary returns `404`, `401`, or `403` during discovery, the add-on renders nothing and the existing page remains unchanged.

RF12-P3 does not set:

- `ORCA_RENT_FLEX_12_ENABLED`;
- `ORCA_RENT_FLEX_12_SCHEMA_READY`;
- `ORCA_RENT_FLEX_12_WRITES_ENABLED`;
- `ORCA_RENT_FLEX_12_ACCOUNTING_GUARD_READY`.

No client-side environment variable is introduced as a substitute for the server authority.

## 3. Properties surface

The property add-on reads the real `/api/properties` inventory and the tenant-scoped RF12 unit-config endpoint.

It shows:

- the selected unit by unit number and project name;
- a compact `الدفع المرن متاح` / `Flexible payment available` badge when `externalRnplEnabled=true` and status is `ACTIVE`;
- explicit wording that availability is configuration/marketing only and is **not** tenant eligibility or provider approval.

For authorized property writers, the panel may call the guarded RF12-P2 unit-config `PUT` endpoint to enable or disable external RNPL availability. If RF12 writes are not operationally enabled, the UI fails closed and reports that configuration writes are not active.

No provider approval is inferred from property configuration.

## 4. Lease surface and lifecycle order

The Rent Flex lease add-on is intentionally a **pre-lease payment planner**.

This preserves the frozen RF12 architecture in which `RentFlexSelection` may exist before `RentalLease`, and it avoids creating partial lease/payment state before RF12-P4 closes the legacy accounting guard.

The existing `New lease` action in `ContractsPaymentsCenter` remains unchanged in RF12-P3.

The pre-lease planner exposes:

- the existing periodic lease path as unchanged context;
- `DIRECT_MONTHLY_EJAR`;
- `EXTERNAL_RNPL_12` only when the selected unit is configured for external RNPL.

For direct monthly payment it displays a deterministic 12-period preview from the verified `buildDirectMonthlyEjarPlan` calculator, including exact total preservation and calendar-month due dates.

For external RNPL it explains that provider repayments remain external and do not become ORCA receivables.

## 5. Saved choices and provider offers

The lease add-on lists tenant-scoped saved Rent Flex selections without rendering raw UUIDs to the user.

Selection detail can display:

- unit label;
- mode and status;
- annual underlying rent;
- whether the choice is pre-lease or already linked to a lease;
- normalized provider offers from the RF12-P2 read model;
- down payment;
- monthly payment;
- total tenant payable;
- tenant cost delta;
- offer expiry;
- canonical provider-approval state;
- operational owner/company settlement status.

The UI explicitly distinguishes `عرض مزود` / `Provider offer` from `موافقة مزود مثبتة` / `Provider approval recorded` and does not treat an offer as an approval.

For this badge, the Rent Flex read model does **not** trust `FinanceProviderOffer.authorityStatus` as the canonical approval source. W1 records provider authority on `FinanceCase`. The read model projects `APPROVED` onto the selected offer only when all of the following are true within the tenant boundary:

- the offer is the selection's `selectedProviderOfferId`;
- `FinanceCase.authorityStatus = APPROVED`;
- `FinanceCase.authorityProvider` equals the selected offer provider;
- `FinanceCase.authorityReference` equals the selected offer provider reference;
- the finance lifecycle has reached `PROVIDER_APPROVED`, `READY_FOR_TRANSACTION`, or `COMPLETED`.

This mirrors the existing W1 provider-approval transition invariant and prevents a provider offer from being presented as an approval merely because offer data exists.

Raw provider or settlement `evidenceJson` remains absent from the UI because RF12-P2 does not expose it in the first read model.

## 6. Write behavior

When RF12 writes are separately enabled, the lease add-on may:

- create a pre-lease Rent Flex selection;
- choose a provider offer that already has RF12 terms;
- lock the payment choice.

All writes go only through RF12-P2 routes and therefore preserve tenant/RBAC authority and fail-closed domain transitions.

RF12-P3 does **not** call the lease-binding endpoint. This is intentional.

## 7. Accounting and lease-binding boundary

RF12-P3 performs no lease binding because the frozen architecture requires the legacy `settle-lease` path to fail closed once a Rent Flex selection is attached.

Until RF12-P4 implements and verifies that accounting guard, P3 must not create a lease-bound Rent Flex state from the UI.

Therefore RF12-P3 performs no:

- `POST /api/v1/rent-flex/selections/:id/lease` call;
- invoice creation;
- `PaymentPlan` or `Installment` mutation;
- payment transaction mutation;
- ledger or journal posting;
- legacy `settle-lease` modification;
- provider callback/webhook;
- provider API call;
- Ejar API call;
- credit-bureau, payroll, or open-banking call.

## 8. Privacy and display rules

Required UI invariants:

- no raw tenant/user/actor identity input;
- no visible technical UUIDs;
- Arabic/English labels follow the existing application language context;
- external repayments are labelled as provider repayments, not ORCA invoice periods;
- owner/company settlement is operational evidence, not tenant payment status;
- fallback text is human-readable and never exposes a technical identifier.

## 9. Verification contract

RF12-P3 verification must establish:

- both contextual components are mounted only on existing Properties and Rental/Leases pages;
- dark `404/401/403` discovery returns `null` rather than exposing a broken feature shell;
- property wording does not imply eligibility or approval;
- direct monthly preview imports the verified RF12 calculator rather than duplicating schedule math;
- provider approval presentation is projected only from matching canonical W1 `FinanceCase` authority plus approved lifecycle state;
- the lease UI uses RF12-P2 routes for selection, offer choice, and lock;
- no lease-binding route is called in P3;
- no provider/network/accounting/migration/deploy surface is introduced;
- no raw UUID is intentionally rendered to users;
- fresh Typecheck, G4/G5/G8 evidence, regressions, and Build pass on one exact head.

## 10. Next slice

The next planned slice is:

`RF12-P4 — Legacy Accounting Guard + Lease Binding`

P4 must make the legacy one-shot rental settlement fail closed for a lease attached to either Rent Flex mode and then enable the guarded lease-binding workflow. Production migration/schema readiness and production flag activation remain separately governed actions.
