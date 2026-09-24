# ORCA W1 — Contract Studio + Finance Case Architecture Gate

Status: FROZEN FOR W1A IMPLEMENTATION
Date: 2026-08-15
Repository: `ali599115225/orca_crm`
Governance ref: `governance/orca-workflow-lock`
Base reference: `work/orca-unified-reference-20260813`
Base SHA: `50266d2122c966d0fa48f0d1b789e6ed5916b68c`

## Authority boundary

This is a post-closure owner-authorized product-extension package. It does **not** create STEP 15 and does not reopen STEP 0–14.

Authorized in W1: BUILD / EDIT / COMMIT / PUSH / PR verification and additive Prisma schema + migration artifacts after this gate.

Not authorized: production migration, backfill, deploy, production action, provider activation, credential changes, or representing ORCA as a lender / mortgagee / government authority.

## Observable outcome

W1A establishes the persistence and domain foundation for:

1. A governed Contract Studio that can support long company-controlled contracts, template versioning, clause overrides, approvals, immutable issued/signed snapshots, and amendments.
2. A separate Finance Case lifecycle for cash, direct-company installment, and external-financing scenarios without confusing a lender's repayment schedule with amounts owed to the company.

## Existing invariants preserved

- Transaction Spine remains the authoritative path for offer → contract → invoice → company payment plan → installments.
- Existing `Contract.unitId` remains required and unique in W1A. External-market or customer-owned collateral does not become a fake inventory unit.
- Existing `PaymentPlan` remains the schedule of amounts actually owed to the company. It is not used to materialize a bank's 20–30 year customer repayment schedule.
- Provider / authority decisions remain external truth. ORCA stores workflow/evidence/status copies but must not fabricate provider approval.
- Every new tenant business model is required-tenant and enters `REQUIRED_TENANT_MODELS`.
- Signed/issued contract history is immutable. Material change after issuance/signature is represented by an amendment, never silent mutation of the historical snapshot.

## W1A frozen model set

Exactly ten new required-tenant models:

### Contract Studio

1. `ContractTemplate`
   - company-owned template identity by contract type.
   - status: DRAFT / ACTIVE / RETIRED.

2. `ContractTemplateVersion`
   - immutable template version payload.
   - stores structured sections / clause placement in `structureJson`.
   - versioned independently from issued contracts.

3. `ContractClauseDefinition`
   - reusable clause library item.
   - risk tier: INFORMATIONAL / COMMERCIAL / LEGAL / REGULATORY_OFFICIAL.
   - edit mode: LOCKED / CONTROLLED_EDITABLE / OPTIONAL / CUSTOM.

4. `ContractDraft`
   - transaction-specific working contract.
   - may link to an existing ORCA Contract, but issuance is not required to create a draft.
   - stores transaction data bindings and draft structure/content separately from the immutable snapshot.

5. `ContractSnapshot`
   - immutable issued/signed snapshot.
   - stores rendered content plus structured source facts, template version reference, clause/version payload, payment-plan snapshot, approval references, and digest.
   - no `updatedAt` field.

6. `ContractApproval`
   - approval decision for legal/commercial/finance/material changes.
   - records requested/decided actor IDs, status, reason, and evidence metadata.

7. `ContractAmendment`
   - post-issuance change/addendum linked to the source snapshot and, when applicable, a resulting replacement snapshot.
   - preserves original snapshot.

### Finance Case

8. `FinanceCase`
   - independent funding/financing case.
   - optional `unitId`, `leadId`, and `contractId`.
   - property source: INVENTORY / EXTERNAL_MARKET / CUSTOMER_OWNED / THIRD_PARTY_COLLATERAL.
   - purpose: INVENTORY_PURCHASE / EXTERNAL_PURCHASE / CASH_AGAINST_PROPERTY / REFINANCE / INVESTMENT_FINANCE / DIRECT_COMPANY_INSTALLMENTS / CASH_PURCHASE.
   - tracks ORCA internal workflow state separately from provider authority state.

9. `FinanceProviderOffer`
   - one provider proposal/decision record per finance case.
   - provider-neutral fields for amount, down payment, term, rate/profit, payment estimate, fees, expiry, authority status, provider reference, evidence metadata.
   - external authority status is never inferred from ORCA internal state.

10. `FinanceCaseEvent`
    - append-oriented lifecycle/event history for provenance and provider/internal status transitions.

## Deliberately deferred from W1A

- New UI pages and visual Contract Builder.
- True PDF renderer / signing provider integration.
- Provider API submission adapters.
- Automatic regulatory eligibility decisioning.
- Direct-company 240/360 installment expansion.
- Calendar-month recurrence replacement for the existing fixed-day Payment Plan engine.
- Production migration execution or backfill.
- First-class document linkage table; W1A uses evidence/document reference JSON and the existing Document repository until a dedicated artifact relation is justified.

## Migration impact review

W1A migration must be additive only:

- create ten new tables and indexes;
- add nullable/relation-only fields on existing Prisma models only when required for relation navigation;
- do not alter existing columns, defaults, unique constraints, financial tables, provider tables, or historical data;
- no UPDATE/DELETE/backfill statements;
- no production application in this package.

Rollback before production application: drop only the ten newly created W1A tables in reverse dependency order. Since production application is not authorized, rollback execution is out of scope.

## Domain separation rules

### Finance Case vs Contract vs Payment Plan

- Finance Case = how the transaction is funded or financed.
- Contract = what the parties agreed.
- Payment Plan = amounts actually owed to the company and due dates.

External financing example: customer down payment + provider settlement may satisfy the company sale. The lender's 240/360 customer installments remain provider-side and are **not** ORCA company installments.

Direct-company installment example: if the company is the creditor, the company Contract + PaymentPlan owns the receivable. Expansion beyond the current 120-installment engine is a later explicitly verified package.

## Contract Compiler invariant

Future issuance must be deterministic from:

`Template Version + Deal facts + Property facts + Finance/Payment facts + approved clause overrides + approval/evidence references`

→ immutable Contract Snapshot

The snapshot must carry both rendered text and the structured facts that produced it.

## W1A acceptance ledger

W1A is complete only when all of the following are freshly demonstrated on one exact PR head:

1. Prisma schema validates and client generation succeeds.
2. Exactly ten W1A required-tenant models exist and are registered in `REQUIRED_TENANT_MODELS`.
3. Tenant isolation tests cover representative reads/writes for `ContractDraft` and `FinanceCase`.
4. A focused W1 foundation test proves:
   - existing `Contract.unitId` remains required/unique;
   - existing `PaymentPlan` remains contract/company-receivable scoped;
   - `FinanceCase.unitId`, `leadId`, and `contractId` are nullable;
   - ContractSnapshot has no mutable `updatedAt` column;
   - provider authority status is stored separately from FinanceCase internal status;
   - migration contains no UPDATE/DELETE/backfill statements.
5. Typecheck passes.
6. ORCA CI passes through Build on the exact final head.
7. Independent review has no unresolved Critical/Major finding.
8. No production migration / deploy / provider activation occurs.
