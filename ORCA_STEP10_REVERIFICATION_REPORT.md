# ORCA — STEP 10 REVERIFICATION REPORT

Date: 2026-08-13
Governance ref: `governance/orca-workflow-lock`
Verified product head: `769b0a3de7ff09e00e2baf3c438886a6b616ab1d`
Verified tree: `3909c364a8903a081b3d184431885e10f27e566c`
Scope: exactly 10 E2E cycles + exactly 20 Functional Contracts. No E2E-11. No FC-021.

## Verification basis

- Live governing runbook scope and business model were used; historical/Kross labels were not carried forward as truth.
- ORCA CI run `31673473533` on the final unified branch completed successfully, including production gate verification, G3-G8, dependency audit, typecheck, G5 executable contracts, core regressions, Sentinel regressions, P2 acceptance, build, and the isolated G6 backup/restore drill.
- Exact full-suite differential was executed against pre-remediation baseline `eafe1852ffe044e901f745d34c9c50af0483ea3e` and the byte-identical verified candidate tree. Current tree: 2493 tests, 2456 passed, 37 failed assertion identities in 14 files. Baseline: 2488 tests, 2437 passed, 51 failed assertion identities in 19 files. New failure identities = 0; resolved failure identities = 14.
- The remaining 37 baseline assertion identities were classified rather than hidden:
  - 30 page/UI/source-shape assertions -> recorded for STEP 11 Runtime / Page Verification.
  - 3 raw-Prisma/security-boundary assertions -> recorded for STEP 12 Final Authoritative Reference Gate.
  - 4 stale source-string assertions -> current implementation was inspected and the required semantics are present; these are test-shape debt, not missing product behavior.
- Customer/provider activation is not treated as a repository defect. Where live credentials/provider activation are required, classification is `CLIENT_CONFIGURATION_REQUIRED / NO PRODUCT FIX` while the repository must fail closed.
- FC-019 remains governed as `INTENTIONALLY_DISABLED / LEGACY_DISABLED`.

## E2E — exactly 10

| ID | Governing cycle | STEP 10 status | Current evidence / disposition |
|---|---|---|---|
| E2E-01 | Lead -> WON/LOST | PASS | Direct current tests prove explicit WON/LOST transitions, reject ambiguous closed status, preserve tenant isolation, and require LOST reason / independent WON transition evidence. |
| E2E-02 | Property/Project Inventory -> Transaction Readiness | PASS | Current properties closure tests prove real project/unit data, listing readiness, tenant-scoped reads/writes, no manual SOLD/LEASED without contracts, and protection of operationally linked units. |
| E2E-03 | Inquiry -> Tour Outcome | PASS | Current transaction-spine and tour tests prove tour creation, COMPLETED/NO_SHOW outcome handling, linked lead/opportunity/unit context, rescheduling constraints, and follow-up work. |
| E2E-04 | Offer -> Reservation | PASS | `offer-unit-integrity` proves one-time offer acceptance creates a reserved draft contract and payment plan; offer/tour integrity tests are green. |
| E2E-05 | Contract -> Active Deal | PASS | Contract lifecycle and sales workspace tests prove tenant-scoped issuance, signing of pending contracts, lifecycle presentation truth, and canonical contract routes. |
| E2E-06 | Contract -> Cash / Settlement / Accounting | PASS | Settlement, early-settlement, payment-reconciliation, accounting authorization, and contextual financial lifecycle tests are green; no new failure identity exists in this cycle. |
| E2E-07 | Task / Approval -> Verified Closure | PASS | Tasks closure proves tenant-scoped completion plus verification rather than blind toggling; Sentinel approval persistence proves atomic approval/decision/expiry behavior. |
| E2E-08 | Customer Communication / Support -> Resolution | PASS | Support closure proves real tenant-scoped tickets, status transitions, persisted replies, channel sending, destination handling, and fail-closed behavior; Email/WhatsApp suites are green. |
| E2E-09 | Provider Setup -> Safe Operation | PASS | Provider tests prove tenant-scoped connection resolution, credential protection, supported provider execution, no simulated success, and fail-closed missing configuration. Live provider credentials/activation remain `CLIENT_CONFIGURATION_REQUIRED / NO PRODUCT FIX`. |
| E2E-10 | Incident -> Recovery | PASS | Sentinel incident/heartbeat regressions are green and the isolated PostgreSQL backup/restore drill passed on the final unified branch CI. |

E2E totals: PASS=10, PARTIAL=0, MISSING=0, BLOCKED=0.

## Functional Contracts — exactly 20

| ID | Functional Contract | STEP 10 status | Current evidence / disposition |
|---|---|---|---|
| FC-001 | Authentication & Session | PASS | Login/security/session suites and session revalidation are green. Three raw-client boundary assertions are not session-behavior failures and are recorded for STEP 12. |
| FC-002 | Staff & User Management | PASS | Current actions enforce DB-backed ADMIN authority, tenant-scoped create/update/delete, self-delete protection, progressive authorization, and audit. Current authorization tests prove create and delete behavior. |
| FC-003 | Organization Structure | PASS | EXEC-004 organization authority/service/schema suites are green, including branch/department scope, assignment validity, tenant isolation, and audited commands. |
| FC-004 | Leads & Contacts | PASS | Lead CRUD, functional boundary, page data-layer, service closure, and WON/LOST behavior are green. Remaining lead visual assertions are recorded only for STEP 11. |
| FC-005 | Projects & Properties | PASS | Properties operational closure is green and proves real projects/units, readiness rules, tenant scoping, and state integrity. |
| FC-006 | Tours & Offers | PASS | Tours operational closure, offers operational closure, offer-unit integrity, and transaction-spine behavior are green. |
| FC-007 | Contracts & Payment Plans | PASS | Contract lifecycle, sales workspace, payment-plan and route-isolation suites are green. One UI source-shape assertion about mirroring payment eligibility is recorded for STEP 11. |
| FC-008 | Installments & Invoices | PASS | Current payment-plan/installment company-scope/cron and payment execution evidence is green. The three failing N-Genius assertions are stale source-string checks: current route still uses `runWithDatabaseSession`, tenant-scoped installment/idempotency lookups, and the canonical rental sales-contract return route. |
| FC-009 | Rental Operations | PASS | Rental contract reads, contextual rental financial lifecycle, sale/rental settlement isolation, and canonical rental compatibility routing are proven. |
| FC-010 | Tasks & Maintenance | PASS | Tasks operational closure is fully green, including tenant-scoped create/update/completion, verified completion, audit, and maintenance API linkage; maintenance authorization contracts are green. |
| FC-011 | Documents | PASS | Real byte storage, file policy, tenant-scoped document access, role-bound writes, and tenant model registration are present. The failed old guard-name assertion expects `runWithDatabaseSession`; current route uses the dedicated `runWithDocumentAccess` boundary with `access.tenantId`. The scrollbar assertion is STEP 11 only. |
| FC-012 | Email | PASS | Email operational, SMTP, tenant connection, admin alert, and settings deep-link suites are green. Live provider credentials are `CLIENT_CONFIGURATION_REQUIRED / NO PRODUCT FIX`. |
| FC-013 | WhatsApp | PASS | Architecture, authorization, connection resolver, credential service, webhook security, persistence, send service, actions and provider-agnostic closure suites are green. Live provider activation is `CLIENT_CONFIGURATION_REQUIRED / NO PRODUCT FIX`. |
| FC-014 | SMS | PASS | Current support/lead behavior explicitly records `SMS_NOT_CONFIGURED` or degrades safely instead of claiming success. Live SMS provider configuration is `CLIENT_CONFIGURATION_REQUIRED / NO PRODUCT FIX`. |
| FC-015 | Payment Gateway | PASS | Payment provider, custom provider, reconciliation, default provider, N-Genius provider, tenant isolation and payment-service suites are green. Live gateway connection is `CLIENT_CONFIGURATION_REQUIRED / NO PRODUCT FIX`. |
| FC-016 | Advertising | PASS | Advertising placement, custom advertising provider actions, settings tab and provider foundation tests are green. Two campaign workspace source-shape assertions are recorded for STEP 11. Live provider activation is `CLIENT_CONFIGURATION_REQUIRED / NO PRODUCT FIX`. |
| FC-017 | ZATCA / Ejar / Government | PASS | Current ZATCA E2E, Ejar E2E, company-scope cron, and Saudi trust authorization/audit suites are green. Live government credentials/connections are `CLIENT_CONFIGURATION_REQUIRED / NO PRODUCT FIX`. |
| FC-018 | Agents & Sentinel | PASS | Agent runtime/tenant-scoping tests and all Sentinel incident/heartbeat/approval/operational suites are green. Old `dedicated-agents-ui` assertions expect SaaS/licensing residue that conflicts with the current dedicated-product business-model lock; page/UI behavior is reverified in STEP 11. |
| FC-019 | Tenant Registration & SaaS Billing | INTENTIONALLY_DISABLED | Governing state is `LEGACY_DISABLED`; G3/G5 SaaS-retirement and single-company shutdown tests are green. No SaaS reactivation is authorized or required. |
| FC-020 | Dashboard & Reporting | PASS | Dashboard page closure gate and reporting/data services remain available; current failures are source/layout composition assertions and are recorded for STEP 11 Runtime / Page Verification. |

FC totals: PASS=19, INTENTIONALLY_DISABLED=1, PARTIAL=0, MISSING=0, BLOCKED=0.

## Deferred existing-step findings

### STEP 11 — Runtime / Page Verification
30 current baseline assertion identities are page/UI/source-shape findings. They include dashboard visual/composition expectations, lead/revenue visual hierarchy, document internal scrolling, contract-payment UI eligibility mirroring, marketing campaign workspace placement, Agents dedicated UI assumptions, and related page/layout checks. They are not fixed or hidden in STEP 10.

### STEP 12 — Final Authoritative Reference Gate
3 current baseline assertion identities concern the legacy raw-Prisma allowlist / raw-client boundary. They are recorded for the existing STEP 12 authority/security gate and do not create a new step.

### Resolved as stale test-shape evidence in STEP 10
4 current baseline assertions were inspected semantically:
1. Documents route old guard-name assertion: dedicated document access guard now supplies tenant/role context.
2-4. Installment N-Genius source-string assertions: authenticated database session, tenant scoping, idempotency tenant scoping, and canonical return route remain present under renamed/refactored code.

No product fix is justified from these four string mismatches.

## STEP 10 closure assessment

REQUIRED OUTPUT = COMPLETE
EXACT E2E COUNT = 10
EXACT FC COUNT = 20
UNKNOWN = 0
SCOPE EXPANSION = 0
UNAUTHORIZED CHANGES = 0
E2E-11 = NOT CREATED
FC-021 = NOT CREATED
PROVIDER ACTIVATION = NOT PERFORMED
DEPLOY = NOT PERFORMED
MIGRATION / BACKFILL = NOT PERFORMED
MAIN MERGE = NOT PERFORMED

Recommendation: `STEP 10 = CLOSE`, next authorized step: `STEP 11 — Runtime / Page Verification`.
