# ORCA W1E — Contract / Finance Permission + Application Facade Gate

Status: FROZEN FOR W1E INTERNAL APPLICATION-BOUNDARY IMPLEMENTATION

Base: `1393ae27f89b9a60a877753f794e21b71a6a25fc`

W1E follows the verified W1D merge. It does not create STEP 15 or reopen STEP 0–14.

## Objective

Close the application-boundary layer before any public API/UI exposure:

1. define a typed least-privilege permission contract using only the five live database roles;
2. require database-backed role revalidation for every W1E read/write facade operation;
3. bind tenantId and actor/user id exclusively from the authenticated session context;
4. expose tenant-scoped Contract Studio and Finance Case read models;
5. wrap the verified W1B–W1D domain services without duplicating lifecycle, provider-evidence, snapshot, or Transaction Spine logic.

## Current-role constraint

W1E does **not** invent Legal, Finance, Compliance, or Issuer database roles. The live role set remains:

- `ADMIN`
- `SALES_MANAGER`
- `SALES_EMPLOYEE`
- `MARKETING`
- `READ_ONLY`

Until a later authorized RBAC expansion exists, W1E uses the following provisional least-privilege mapping:

- Contract/finance read: `ADMIN`, `SALES_MANAGER`, `SALES_EMPLOYEE`, `READ_ONLY`.
- Draft/finance-case authoring: `ADMIN`, `SALES_MANAGER`, `SALES_EMPLOYEE`.
- Finance provider decisions/offers/authority transitions: `ADMIN`, `SALES_MANAGER`.
- Contract approval decision/finalization and immutable issue: `ADMIN` only.
- `MARKETING` receives no W1E Contract Studio / Finance Case permission.
- `READ_ONLY` receives read permissions only.

## Boundary invariants

- Public callers may never choose `tenantId`, `createdBy`, `updatedBy`, `requestedBy`, `decidedBy`, `approvedBy`, or `actorId` through W1E facade inputs.
- The facade derives tenant and actor identity from the authenticated session after database-backed role revalidation.
- No platform-owner/super-admin bypass is introduced by W1E.
- Read models always predicate by `tenantId`; list reads use an explicit bounded limit.
- W1E does not reimplement domain lifecycle checks. It delegates to the already-verified services:
  - ContractDraft / approvals: W1C service;
  - FinanceCase lifecycle: W1C/W1D service;
  - Provider offers: W1D service;
  - immutable ContractSnapshot issue/read: W1B/W1D service.
- W1E does not create or mutate Contract, Unit, Lead, PaymentPlan, Installment, Invoice, legacy Offer, JournalEntry, or provider credentials.
- W1E does not call any external provider/network service.

## Network and migration gate

W1E intentionally adds **no public route, server action, UI, migration, backfill, deploy, or provider activation**.

Reason: W1A/W1D schema migrations remain artifacts only and have not been applied to production/customer data. Exposing a network route before migration readiness would create a code path whose build can succeed while its runtime database objects may not exist. A later authorized slice must verify migration readiness before network exposure.

## Allowed paths

- `lib/auth/w1e-contract-finance-permissions.ts`
- `lib/domain/contract-finance/read-model-service.ts`
- `lib/domain/contract-finance/application-facade.ts`
- `tests/foundation/g8-w1e-contract-finance-facade.test.ts`
- this gate document

## Explicit exclusions

- no modification of EXEC-003 historical assignment files;
- no Prisma schema or migration change;
- no production migration/backfill;
- no route/server action/UI;
- no Transaction Spine mutation;
- no PaymentPlan/Installment/Invoice/accounting mutation;
- no provider adapter/API/credentials/network call;
- no deploy/production action.

## Acceptance

- W1E permission keys and role mappings are typed, unique, and fail closed.
- MARKETING has zero W1E permissions; READ_ONLY has read-only access only.
- Approval decision/finalization/snapshot issue are ADMIN-only.
- Every facade operation performs W1E permission authorization before delegation.
- Facade write inputs cannot carry tenant/actor identity fields.
- Contract/finance read models are tenant-scoped and list reads are bounded.
- No public route/server action/UI is added.
- No duplicate domain write logic, Transaction Spine mutation, or provider network call exists.
- G8 focused tests pass.
- Full ORCA CI through Build passes on the exact final head.
- No production migration/deploy/provider activation occurs.
