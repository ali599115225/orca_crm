# ORCA Z8 — EXEC-003 v2 Contract-Level Behavioral Evidence Ledger

- **Document ID:** `ORCA-Z8-EXEC-003-V2-EVIDENCE-LEDGER-001`
- **Package:** `EXEC-003 v2`
- **Slice:** `CONTRACT_LEVEL_BEHAVIORAL_EVIDENCE_REMEDIATION`
- **Status:** `IMPLEMENTED / AWAITING INDEPENDENT RE-REVIEW`
- **Evidence head SHA:** `3dc4b8d865212716e5bfdb844a85e7d9c90e17ea`
- **ORCA CI:** `#365 / SUCCESS`
- **CI checkout mode:** `PR_MERGE_REF`
- **Synthetic merge SHA:** `0ea28c491d67fee8356f566a34861daf0b956474`
- **Base SHA:** `001b2c853e99ea055f161dcd294d968bbf25c9ad`
- **CI statement:** CI validated the synthetic PR merge commit `0ea28c491d67fee8356f566a34861daf0b956474` containing head SHA `3dc4b8d865212716e5bfdb844a85e7d9c90e17ea` against base SHA `001b2c853e99ea055f161dcd294d968bbf25c9ad`.

## Evidence classification

| Class | Meaning |
|---|---|
| `DIRECT_BEHAVIORAL` | Invokes the actual Route Handler or Server Action entry point and traverses its authorization boundary. |
| `STRUCTURAL` | Checks wiring or code structure without invoking the contract entry point. |
| `SOURCE_ASSERTION` | Reads source text, imports, symbols, literals, or Regex matches. |
| `UNIT_BEHAVIOR` | Exercises a unit such as the shared guard independently of a contract entry point. |
| `INTEGRATION` | Exercises multiple real components or generated inventories together. |
| `REGRESSION` | Protects established behavior after a defect or compatibility correction. |

`tests/foundation/g5-exec-003-contract-wiring.test.ts` is classified as `STRUCTURAL / SOURCE_ASSERTION`; it is not used as direct behavioral credit.

## Verified counts

```text
Frozen contracts: 25
Frozen operations: 32
Directly tested contracts: 25
Directly tested operations: 32
Structural-only frozen contracts: 0
Excluded contracts tested under original boundary: 5
Test gaps: 59 → 34
P0 remaining: 0
P1 mutation remaining: 0
P1 sensitive read remaining: 0
P2 remaining: 16
P3 remaining: 16
P4 remaining: 2
```

## Operation-level ledger

Every row below carries `DIRECT_BEHAVIORAL / PASS` credit on evidence head `3dc4b8d865212716e5bfdb844a85e7d9c90e17ea` and CI run `365`.

| Operation | Contract | Entry point | Boundary / auth channel | Permission key | Legacy roles | Test file | Exact credited test name | Evidence |
|---|---|---|---|---|---|---|---|---|
| `EXEC-003-C01-O01` | `C01` | `POST /api/properties/[id]/request-finance` | `AUTHENTICATED_SESSION / COOKIE_OR_BEARER` | `properties.finance_request.create` | all tenant roles | `tests/foundation/g5-exec-003-contract-behavior-p0.test.ts` | `DIRECT_BEHAVIORAL EXEC-003-C01-O01 reaches the audit boundary after authorization` | `DIRECT_BEHAVIORAL / PASS` |
| `EXEC-003-C02-O01` | `C02` | `POST /api/revenue-integrity/webhook/[provider]` | `SIGNED_BOUNDARY / PROVIDER_HMAC` | `revenue.webhook.ingest` | none | `tests/foundation/g5-exec-003-signed-boundary-behavior.test.ts` | `DIRECT_BEHAVIORAL EXEC-003-C02-O01 accepts a valid provider HMAC without a user-session boundary` | `DIRECT_BEHAVIORAL / PASS` |
| `EXEC-003-C03-O01` | `C03` | `POST /api/v1/contracts/[id]/cancel` | `DATABASE_RBAC / COOKIE_OR_BEARER` | `contracts.cancel.execute` | `ADMIN, SALES_MANAGER` | `tests/foundation/g5-exec-003-contract-behavior-pilot.test.ts` | `DIRECT_BEHAVIORAL C03 reaches the real mutation boundary after authorization` | `DIRECT_BEHAVIORAL / PASS` |
| `EXEC-003-C04-O01` | `C04` | `GET /api/v1/contracts/[id]/invoices` | `AUTHENTICATED_SESSION / COOKIE_ONLY` | `contracts.invoices.read` | all tenant roles | `tests/foundation/g5-exec-003-contract-behavior-pilot.test.ts` | `DIRECT_BEHAVIORAL C04 reaches the tenant-scoped read after Cookie authorization` | `DIRECT_BEHAVIORAL / PASS` |
| `EXEC-003-C04-O02` | `C04` | `POST /api/v1/contracts/[id]/invoices` | `AUTHENTICATED_SESSION / COOKIE_ONLY` | `contracts.invoices.issue` | all tenant roles | `tests/foundation/g5-exec-003-contract-behavior-p0.test.ts` | `DIRECT_BEHAVIORAL EXEC-003-C04-O02 reaches invoice issuance after Cookie authorization` | `DIRECT_BEHAVIORAL / PASS` |
| `EXEC-003-C05-O01` | `C05` | `GET /api/v1/contracts/[id]/payment-plan` | `DATABASE_RBAC / COOKIE_OR_BEARER` | `contracts.payment_plan.read` | all tenant roles | `tests/foundation/g5-exec-003-contract-behavior-p0.test.ts` | `DIRECT_BEHAVIORAL EXEC-003-C05-O01 reaches the tenant-scoped payment-plan read` | `DIRECT_BEHAVIORAL / PASS` |
| `EXEC-003-C05-O02` | `C05` | `PUT /api/v1/contracts/[id]/payment-plan` | `DATABASE_RBAC / COOKIE_OR_BEARER` | `contracts.payment_plan.update` | `ADMIN, SALES_MANAGER` | `tests/foundation/g5-exec-003-contract-behavior-p0.test.ts` | `DIRECT_BEHAVIORAL EXEC-003-C05-O02 reaches payment-plan update after authorization` | `DIRECT_BEHAVIORAL / PASS` |
| `EXEC-003-C05-O03` | `C05` | `POST /api/v1/contracts/[id]/payment-plan` | `DATABASE_RBAC / COOKIE_OR_BEARER` | `contracts.payment_plan.create` | `ADMIN, SALES_MANAGER` | `tests/foundation/g5-exec-003-contract-behavior-p0.test.ts` | `DIRECT_BEHAVIORAL EXEC-003-C05-O03 reaches payment-plan creation after authorization` | `DIRECT_BEHAVIORAL / PASS` |
| `EXEC-003-C06-O01` | `C06` | `POST /api/v1/contracts/[id]/restructure` | `DATABASE_RBAC / COOKIE_ONLY` | `contracts.payment_plan.restructure` | `ADMIN, SALES_MANAGER` | `tests/foundation/g5-exec-003-contract-behavior-p0.test.ts` | `DIRECT_BEHAVIORAL EXEC-003-C06-O01 reaches restructuring after Cookie authorization` | `DIRECT_BEHAVIORAL / PASS` |
| `EXEC-003-C07-O01` | `C07` | `POST /api/v1/contracts/[id]/sign` | `DATABASE_RBAC / COOKIE_OR_BEARER` | `contracts.sign.execute` | `ADMIN, SALES_MANAGER` | `tests/foundation/g5-exec-003-contract-behavior-p0.test.ts` | `DIRECT_BEHAVIORAL EXEC-003-C07-O01 reaches signing after authorization` | `DIRECT_BEHAVIORAL / PASS` |
| `EXEC-003-C08-O01` | `C08` | `POST /api/v1/invoices/[id]/paylink/create` | `DATABASE_RBAC / COOKIE_OR_BEARER` | `invoices.paylink.create` | `ADMIN, SALES_MANAGER` | `tests/foundation/g5-exec-003-contract-behavior-p0.test.ts` | `DIRECT_BEHAVIORAL EXEC-003-C08-O01 reaches the tenant-scoped invoice lookup after authorization` | `DIRECT_BEHAVIORAL / PASS` |
| `EXEC-003-C09-O01` | `C09` | `POST /api/v1/leads/webhook` | `SIGNED_BOUNDARY / TIMESTAMPED_HMAC` | `leads.webhook.ingest` | none | `tests/foundation/g5-exec-003-signed-boundary-behavior.test.ts` | `DIRECT_BEHAVIORAL EXEC-003-C09-O01 accepts the real timestamped HMAC and reaches tenant-scoped lead creation` | `DIRECT_BEHAVIORAL / PASS` |
| `EXEC-003-C10-O01` | `C10` | `POST /api/v1/leases/[id]/invoices` | `AUTHENTICATED_SESSION / COOKIE_ONLY` | `leases.invoices.create` | all tenant roles | `tests/foundation/g5-exec-003-contract-behavior-p0.test.ts` | `DIRECT_BEHAVIORAL EXEC-003-C10-O01 reaches the tenant-scoped lease lookup` | `DIRECT_BEHAVIORAL / PASS` |
| `EXEC-003-C11-O01` | `C11` | `GET /api/v1/settings/leads-webhook` | `DATABASE_RBAC / COOKIE_OR_BEARER` | `settings.leads_webhook.read` | `ADMIN` | `tests/foundation/g5-exec-003-contract-behavior-p0.test.ts` | `DIRECT_BEHAVIORAL EXEC-003-C11-O01 reaches the tenant-scoped settings read` | `DIRECT_BEHAVIORAL / PASS` |
| `EXEC-003-C11-O02` | `C11` | `POST /api/v1/settings/leads-webhook` | `DATABASE_RBAC / COOKIE_OR_BEARER` | `settings.leads_webhook.rotate` | `ADMIN` | `tests/foundation/g5-exec-003-contract-behavior-p0.test.ts` | `DIRECT_BEHAVIORAL EXEC-003-C11-O02 reaches credential rotation only after ADMIN authorization` | `DIRECT_BEHAVIORAL / PASS` |
| `EXEC-003-C12-O01` | `C12` | `GET /api/v1/accounting/journal-entries/[id]` | `DATABASE_RBAC / COOKIE_OR_BEARER` | `accounting.journal_entries.read` | all tenant roles | `tests/foundation/g5-exec-003-contract-behavior-p1-mutation.test.ts` | `DIRECT_BEHAVIORAL EXEC-003-C12-O01 reaches tenant-scoped journal-entry read` | `DIRECT_BEHAVIORAL / PASS` |
| `EXEC-003-C12-O02` | `C12` | `POST /api/v1/accounting/journal-entries/[id]` | `DATABASE_RBAC / COOKIE_OR_BEARER` | `accounting.journal_entries.reverse` | `ADMIN` | `tests/foundation/g5-exec-003-contract-behavior-p1-mutation.test.ts` | `DIRECT_BEHAVIORAL EXEC-003-C12-O02 reaches reversal after ADMIN authorization` | `DIRECT_BEHAVIORAL / PASS` |
| `EXEC-003-C13-O01` | `C13` | `POST /api/v1/accounting/seed` | `DATABASE_RBAC / COOKIE_OR_BEARER` | `accounting.seed.execute` | `ADMIN` | `tests/foundation/g5-exec-003-contract-behavior-p1-mutation.test.ts` | `DIRECT_BEHAVIORAL EXEC-003-C13-O01 reaches tenant-scoped accounting seed` | `DIRECT_BEHAVIORAL / PASS` |
| `EXEC-003-C14-O01` | `C14` | `GET /api/v1/automation/workflows` | `AUTHENTICATED_SESSION / COOKIE_ONLY` | `automation.workflows.read` | all tenant roles | `tests/foundation/g5-exec-003-contract-behavior-p1-mutation.test.ts` | `DIRECT_BEHAVIORAL EXEC-003-C14-O01 reaches tenant-scoped workflow read` | `DIRECT_BEHAVIORAL / PASS` |
| `EXEC-003-C14-O02` | `C14` | `POST /api/v1/automation/workflows` | `AUTHENTICATED_SESSION / COOKIE_ONLY` | `automation.workflows.create` | all tenant roles | `tests/foundation/g5-exec-003-contract-behavior-p1-mutation.test.ts` | `DIRECT_BEHAVIORAL EXEC-003-C14-O02 reaches workflow creation after Cookie authorization` | `DIRECT_BEHAVIORAL / PASS` |
| `EXEC-003-C15-O01` | `C15` | `GET /api/v1/maintenance` | `AUTHENTICATED_SESSION / COOKIE_ONLY` | `maintenance.tickets.read` | all tenant roles | `tests/foundation/g5-exec-003-contract-behavior-p1-mutation.test.ts` | `DIRECT_BEHAVIORAL EXEC-003-C15-O01 reaches tenant-scoped maintenance read` | `DIRECT_BEHAVIORAL / PASS` |
| `EXEC-003-C15-O02` | `C15` | `POST /api/v1/maintenance` | `AUTHENTICATED_SESSION / COOKIE_ONLY` | `maintenance.tickets.create` | all tenant roles | `tests/foundation/g5-exec-003-contract-behavior-p1-mutation.test.ts` | `DIRECT_BEHAVIORAL EXEC-003-C15-O02 reaches maintenance creation after Cookie authorization` | `DIRECT_BEHAVIORAL / PASS` |
| `EXEC-003-C16-O01` | `C16` | `PATCH /api/v1/maintenance/[id]` | `AUTHENTICATED_SESSION / COOKIE_ONLY` | `maintenance.tickets.update` | all tenant roles | `tests/foundation/g5-exec-003-contract-behavior-p1-mutation.test.ts` | `DIRECT_BEHAVIORAL EXEC-003-C16-O01 reaches tenant-scoped maintenance update` | `DIRECT_BEHAVIORAL / PASS` |
| `EXEC-003-C17-O01` | `C17` | `SERVER_ACTION generateAIInsight` | `DELEGATED_DATABASE_RBAC / DELEGATED_SERVER_BOUNDARY` | `ai.lead_insight.generate` | all tenant roles at delegated boundary | `tests/foundation/g5-exec-003-delegated-boundary-behavior.test.ts` | `DIRECT_BEHAVIORAL EXEC-003-C17-O01 delegates allow behavior to requireAgentAccess` | `DIRECT_BEHAVIORAL / PASS` |
| `EXEC-003-C18-O01` | `C18` | `SERVER_ACTION clearSystemLogsAction` | `SESSION_CLAIM_EXACT / COOKIE_SESSION_CLAIM` | `system.logs.clear` | exact `Admin` | `tests/foundation/g5-exec-003-exact-claim-boundary-behavior.test.ts` | `DIRECT_BEHAVIORAL EXEC-003-C18-O01 keeps the exact legacy Admin claim` | `DIRECT_BEHAVIORAL / PASS` |
| `EXEC-003-C19-O01` | `C19` | `SERVER_ACTION triggerMockErrorAction` | `SESSION_CLAIM_EXACT / COOKIE_SESSION_CLAIM` | `system.logs.mock_error` | exact `Admin` | `tests/foundation/g5-exec-003-exact-claim-boundary-behavior.test.ts` | `DIRECT_BEHAVIORAL EXEC-003-C19-O01 keeps the exact legacy Admin claim` | `DIRECT_BEHAVIORAL / PASS` |
| `EXEC-003-C20-O01` | `C20` | `GET /api/v1/accounting/payables` | `AUTHENTICATED_SESSION / COOKIE_OR_BEARER` | `accounting.payables.read` | all tenant roles | `tests/foundation/g5-exec-003-contract-behavior-pilot.test.ts` | `DIRECT_BEHAVIORAL C20 reaches the tenant-scoped sensitive read after authorization` | `DIRECT_BEHAVIORAL / PASS` |
| `EXEC-003-C21-O01` | `C21` | `GET /api/v1/contracts/[id]/pdf` | `AUTHENTICATED_SESSION / COOKIE_ONLY` | `contracts.pdf.read` | all tenant roles | `tests/foundation/g5-exec-003-contract-behavior-pilot.test.ts` | `DIRECT_BEHAVIORAL C21 reaches the tenant-scoped PDF lookup after authorization` | `DIRECT_BEHAVIORAL / PASS` |
| `EXEC-003-C22-O01` | `C22` | `GET /api/v1/invoices/[id]/paylink/status` | `AUTHENTICATED_SESSION / COOKIE_OR_BEARER` | `invoices.paylink_status.read` | all tenant roles | `tests/foundation/g5-exec-003-contract-behavior-p1-sensitive-read.test.ts` | `DIRECT_BEHAVIORAL EXEC-003-C22-O01 reaches the tenant-scoped Paylink status lookup` | `DIRECT_BEHAVIORAL / PASS` |
| `EXEC-003-C23-O01` | `C23` | `GET /api/v1/invoices/[id]/pdf` | `AUTHENTICATED_SESSION / COOKIE_ONLY` | `invoices.pdf.read` | all tenant roles | `tests/foundation/g5-exec-003-contract-behavior-p1-sensitive-read.test.ts` | `DIRECT_BEHAVIORAL EXEC-003-C23-O01 reaches the tenant-scoped invoice PDF lookup` | `DIRECT_BEHAVIORAL / PASS` |
| `EXEC-003-C24-O01` | `C24` | `GET /api/v1/invoices/[id]/qr` | `AUTHENTICATED_SESSION / COOKIE_ONLY` | `invoices.qr.read` | all tenant roles | `tests/foundation/g5-exec-003-contract-behavior-p1-sensitive-read.test.ts` | `DIRECT_BEHAVIORAL EXEC-003-C24-O01 reaches the tenant-scoped invoice QR lookup` | `DIRECT_BEHAVIORAL / PASS` |
| `EXEC-003-C25-O01` | `C25` | `SERVER_ACTION getRentalContractsAction` | `AUTHENTICATED_SESSION / COOKIE_SESSION` | `rentals.contracts.read` | all tenant roles | `tests/foundation/g5-exec-003-contract-behavior-pilot.test.ts` | `DIRECT_BEHAVIORAL C25 reaches the tenant-scoped Server Action read after authorization` | `DIRECT_BEHAVIORAL / PASS` |

## Supporting behavioral cases

The credited test files also include applicable 401, 403, database-role denial, Cookie-only Bearer rejection, tenant-scoped next-step assertions, Platform Owner bypass denial, invalid signature denial, delegated denial, and exact-claim rejection. The lower operational dependency is mocked only after the actual contract entry point and authorization boundary have been invoked.

## Scope statement

```text
Runtime changes in this remediation: 0
Prisma changes: 0
Migrations: 0
Backfills: 0
Production data changes: 0
Provider credential changes: 0
Environment changes: 0
New privilege grants: 0
Dynamic permission keys: 0
Out-of-scope contracts credited: 0
Tests deleted: 0
```

The temporary combined excluded-boundary test was replaced by boundary-specific files because its literal shared-file import caused G4 to attribute evidence to the unfrozen `getSystemLogsAction`. CI #365 proves the corrected count remains `34` with no same-file spillover.
