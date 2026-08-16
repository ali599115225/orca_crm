# ORCA — Rent Flex 12 Product Gate

Status: FROZEN FOR RENT FLEX 12 FOUNDATION
Date: 2026-08-16
Repository: `ali599115225/orca_crm`
Base reference: `work/orca-unified-reference-20260813`
Base SHA: `b1217d6e6518d85a25d1924932eed74e27919748`

This package extends the existing Rental Operations scope. It does not create STEP 15, FC-021, a lending product, or a new authoritative financial spine.

## Research finding

Saudi rental payment behavior contains two materially different models that ORCA must not merge into one concept:

### 1. Direct monthly rent inside the lease

The official Ejar service supports rental payment periods including monthly, quarterly, semi-annual, and annual payment, subject to the parties' agreement. Ejar also supports flexible payment schedules and electronic payment tracking.

In this mode, the monthly rental obligation is the landlord/company receivable itself.

ORCA code: `DIRECT_MONTHLY_EJAR`.

### 2. External Rent-Now-Pay-Later (RNPL)

Saudi proptech providers advertise a model in which the provider settles the annual rent to the owner and the tenant repays the provider over 12 monthly payments. Public provider material reviewed for this gate includes Rize, Sariat, and Bast. Some providers describe a sublease structure and/or external eligibility assessment.

Aqar's February 2026 help material shows the model moving from a stand-alone provider journey into the property-listing journey itself: a residential listing can expose an "Rent Now, Pay Later" option, while the owner/broker receives the amount upfront and the payment/collection process is handled by the external partner. This means ORCA should eventually expose Rent Flex at both the property/listing opportunity boundary and the lease-creation boundary rather than treating it as a finance-screen-only feature.

In this mode, the tenant's 12-provider-payment schedule is **not** automatically an ORCA company receivable. The company/owner settlement and the tenant/provider repayment schedule are separate economic relationships.

ORCA code: `EXTERNAL_RNPL_12`.

## Product objective

Add a provider-neutral Rent Flex 12 capability that can later support:

- direct Ejar-compatible monthly rent planning;
- external RNPL quote comparison;
- clear display of annual rent, upfront amount, total tenant payable, and monthly schedule;
- owner settlement expectation separated from tenant/provider repayment;
- provider offer expiry/reference/evidence in a later persistence slice;
- property/listing-level eligibility/activation display before lease creation;
- safe handoff to an external provider without ORCA representing itself as lender, lessor-by-sublease, credit bureau, or finance authority.

## Foundation implemented in this slice

`lib/domain/rental/rent-flex-12.ts` provides deterministic calculation only:

1. `buildDirectMonthlyEjarPlan`
   - always generates 12 calendar-month installments;
   - preserves the exact annual total to the halala;
   - uses calendar-month recurrence with end-of-month clamping;
   - marks the schedule as company receivable.

2. `buildExternalRnpl12Quote`
   - accepts provider-supplied commercial values only;
   - calculates financed balance and exact 12-part monthly schedule;
   - exposes tenant cost delta without classifying it as interest, finance charge, or Sharia status;
   - marks the monthly repayment schedule as external-provider repayment;
   - keeps expected owner settlement equal to the underlying annual rent.

3. `compareExternalRnpl12Quotes`
   - provider-neutral comparison by tenant total payable, then upfront amount;
   - no provider recommendation, underwriting, or approval inference.

## Required architecture separation

### Direct monthly

`Rental obligation -> 12 company/owner receivable periods`

Future invoice generation may derive company receivables from this schedule only after the existing rental VAT/invoice rules are verified for the target lease type.

### External RNPL

`Underlying annual rent -> owner/company settlement`

separate from:

`Tenant -> external provider -> 12 repayment periods`

The external repayment schedule must never be inserted into ORCA `PaymentPlan`/`Installment`/rental invoices as if the company were the creditor unless the commercial/legal relationship actually makes the company the creditor.

## Product development beyond the market baseline

A later UI/persistence slice should evolve the market idea into an ORCA operational workflow:

1. **Rent Flex entry points**
   - property/listing: show whether Rent Flex is available/configured before the tenant starts the lease journey;
   - lease creation: Annual / semi-annual / quarterly / direct monthly / External RNPL 12;
   - no public promise of provider approval before the external provider confirms it.

2. **Offer comparison panel**
   - provider;
   - annual underlying rent;
   - upfront/down payment;
   - total tenant payable;
   - monthly amount;
   - total delta versus annual rent;
   - offer expiry;
   - provider reference;
   - provider-declared Sharia/licensing evidence as evidence only, never an ORCA guarantee.

3. **Owner-side settlement tracking**
   - expected settlement;
   - received amount/date/reference;
   - reconciliation status.

4. **Tenant-side external schedule view**
   - informational provider repayment timeline;
   - external status/reference only;
   - no company receivable posting.

5. **Consent and privacy boundary**
   - ORCA must not pull credit-bureau, payroll, or open-banking data merely to calculate a quote;
   - any future provider eligibility integration requires explicit provider configuration, consent, credential handling, data-minimization review, and its own authorization gate.

6. **Provider-neutral adapter boundary**
   - no Rize/Sariat/Bast hard-coding in domain logic;
   - adapters may be added only if the customer configures/authorizes that provider.

7. **Conversion and occupancy analytics**
   - when persistence is later approved, ORCA should measure Rent Flex exposure -> quote request -> provider approval -> lease signed -> owner settled;
   - the metric must not treat provider approval as an ORCA decision.

## Explicit exclusions in this foundation

- no Prisma schema change or migration;
- no production migration/backfill;
- no provider API call;
- no Ejar API call;
- no credit-bureau/open-banking call;
- no automatic provider approval or eligibility decision;
- no invoice creation;
- no accounting posting;
- no payment collection;
- no deploy or production action;
- no claim that ORCA itself offers financing, credit, or subleasing.

## Acceptance

This foundation is accepted when:

- direct monthly and external RNPL are separate domain modes;
- exact 12-part schedules preserve halala totals;
- month-end recurrence is deterministic;
- external tenant repayments are explicitly non-company-receivable;
- provider quotes can be compared without provider-specific business logic;
- focused tests pass;
- typecheck and ORCA CI pass on one exact head;
- no schema/migration/provider/deploy/production action occurs.

## Research sources reviewed

- Ejar FAQ and residential lease material: monthly/quarterly/semi-annual/annual payment periods and flexible payment scheduling.
- REGA/Ejar digital-payment material: residential rent payments use Ejar digital channels for applicable new residential contracts.
- Aqar help center, 2026-02-25: Rent Now, Pay Later can be activated from an eligible residential listing; owner/broker receives the amount upfront while the partner handles payment/collection.
- Rize: annual rent can be converted to 12 monthly payments while the owner receives the annual amount upfront; provider site also describes external bank-data access for eligibility through its own partner flow.
- Sariat: advertises annual owner settlement and 12 monthly tenant payments and describes a sublease structure.
- Bast: terms describe leasing from the owner and re-leasing to the customer through a sublease contract with 12 payments.

Research is market/product evidence only. Provider terms, approvals, pricing, licensing, Sharia claims, and integration availability remain external facts that must be verified at the time of any actual provider integration.
