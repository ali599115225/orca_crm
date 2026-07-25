# ORCA Z8 — EXEC-003 v2 Contract Wiring and Direct Evidence Matrix

- **Document ID:** `ORCA-Z8-EXEC-003-V2-WIRING-MATRIX-001`
- **Package:** `EXEC-003 v2`
- **Slice:** `CONTRACT_WIRING_AND_DIRECT_BEHAVIORAL_EVIDENCE`
- **Branch:** `work/orca-gexec-003-v2-shared-guard-20260725`
- **Pull Request:** `#108`
- **Status:** `IMPLEMENTED AND VERIFIED`
- **Validated executable head:** `ed7433257a334abe783d96dbd51fd3252f828556`
- **ORCA CI:** `#352 / SUCCESS`
- **Frozen contracts:** `25`
- **Frozen operations:** `32`
- **Shared-guard eligible:** `27 operations / 20 contracts`
- **Shared-guard excluded:** `5 operations / 5 contracts / 3 boundary types`
- **Direct-evidence reduction:** `59 → 34`, exactly `25` frozen contracts
- **Binding invariant:** `NEW RBAC MUST NOT EXPAND LEGACY ACCESS`

## Counting clarification

The phrase **five non-eligible boundaries** means five actual operations mapped to five Contract IDs: `C02`, `C09`, `C17`, `C18`, and `C19`. They use only three non-eligible security-boundary types:

1. `SIGNED_BOUNDARY` — two operations.
2. `DELEGATED_DATABASE_RBAC` — one operation.
3. `SESSION_CLAIM_EXACT` — two operations.

It does not mean five distinct boundary types.

## Role-set legend

- `ALL_TENANT_ROLES` = `ADMIN`, `SALES_MANAGER`, `SALES_EMPLOYEE`, `MARKETING`, `READ_ONLY`.
- `CONTRACT_WRITE_ROLES` = `ADMIN`, `SALES_MANAGER`.
- `ACCOUNTING_WRITE_ROLES` = `ADMIN`.
- `EXACT_ADMIN_CLAIM` = the legacy literal `Admin`; it is not normalized to the database enum literal `ADMIN` in this slice.

## Authoritative operation matrix

| Contract ID | Operation ID | Route / Server Action | Method | Source file | Boundary type | Legacy roles | Permission key | Progressive roles | Eligible | Eligibility reason | Implementation status | Direct test file | Direct test name | Evidence status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| EXEC-003-C01 | EXEC-003-C01-O01 | `/api/properties/[id]/request-finance` | POST | `app/api/properties/[id]/request-finance/route.ts` | AUTHENTICATED_SESSION | ALL_TENANT_ROLES | `properties.finance_request.create` | ALL_TENANT_ROLES | YES | Authenticated tenant operation; database revalidation preserves the full legacy role set. | WIRED_DATABASE_GUARD | `tests/foundation/g5-exec-003-contract-wiring.test.ts` | `EXEC-003-C01-O01 wires properties.finance_request.create through runWithExec003DatabasePermission with a static key` | PASS_CI_352 |
| EXEC-003-C02 | EXEC-003-C02-O01 | `/api/revenue-integrity/webhook/[provider]` | POST | `app/api/revenue-integrity/webhook/[provider]/route.ts` | SIGNED_BOUNDARY | NONE | `revenue.webhook.ingest` | NONE | NO | Provider connection, secret and signature verification; no user session must be introduced. | EXCLUDED_UNCHANGED | `tests/foundation/g5-exec-003-contract-wiring.test.ts` | `EXEC-003-C02-O01 preserves SIGNED_BOUNDARY for /api/revenue-integrity/webhook/[provider]` | PASS_CI_352 |
| EXEC-003-C03 | EXEC-003-C03-O01 | `/api/v1/contracts/[id]/cancel` | POST | `app/api/v1/contracts/[id]/cancel/route.ts` | DATABASE_RBAC | CONTRACT_WRITE_ROLES | `contracts.cancel.execute` | CONTRACT_WRITE_ROLES | YES | Existing database-backed write roles are intersected with the static permission. | WIRED_DATABASE_GUARD | `tests/foundation/g5-exec-003-contract-wiring.test.ts` | `EXEC-003-C03-O01 wires contracts.cancel.execute through runWithExec003DatabasePermission with a static key` | PASS_CI_352 |
| EXEC-003-C04 | EXEC-003-C04-O01 | `/api/v1/contracts/[id]/invoices` | GET | `app/api/v1/contracts/[id]/invoices/route.ts` | AUTHENTICATED_SESSION | ALL_TENANT_ROLES | `contracts.invoices.read` | ALL_TENANT_ROLES | YES | Cookie-only legacy authentication is preserved, then the current database role is revalidated. | WIRED_COOKIE_GUARD | `tests/foundation/g5-exec-003-contract-wiring.test.ts` | `EXEC-003-C04-O01 wires contracts.invoices.read through runWithExec003CookiePermission with a static key` | PASS_CI_352 |
| EXEC-003-C04 | EXEC-003-C04-O02 | `/api/v1/contracts/[id]/invoices` | POST | `app/api/v1/contracts/[id]/invoices/route.ts` | AUTHENTICATED_SESSION | ALL_TENANT_ROLES | `contracts.invoices.issue` | ALL_TENANT_ROLES | YES | Cookie-only legacy authentication is preserved; the permission cannot add a role. | WIRED_COOKIE_GUARD | `tests/foundation/g5-exec-003-contract-wiring.test.ts` | `EXEC-003-C04-O02 wires contracts.invoices.issue through runWithExec003CookiePermission with a static key` | PASS_CI_352 |
| EXEC-003-C05 | EXEC-003-C05-O01 | `/api/v1/contracts/[id]/payment-plan` | GET | `app/api/v1/contracts/[id]/payment-plan/route.ts` | DATABASE_RBAC | ALL_TENANT_ROLES | `contracts.payment_plan.read` | ALL_TENANT_ROLES | YES | Existing database-backed read role set is preserved and intersected. | WIRED_DATABASE_GUARD | `tests/foundation/g5-exec-003-contract-wiring.test.ts` | `EXEC-003-C05-O01 wires contracts.payment_plan.read through runWithExec003DatabasePermission with a static key` | PASS_CI_352 |
| EXEC-003-C05 | EXEC-003-C05-O02 | `/api/v1/contracts/[id]/payment-plan` | PUT | `app/api/v1/contracts/[id]/payment-plan/route.ts` | DATABASE_RBAC | CONTRACT_WRITE_ROLES | `contracts.payment_plan.update` | CONTRACT_WRITE_ROLES | YES | Existing contract-write role set is preserved and intersected. | WIRED_DATABASE_GUARD | `tests/foundation/g5-exec-003-contract-wiring.test.ts` | `EXEC-003-C05-O02 wires contracts.payment_plan.update through runWithExec003DatabasePermission with a static key` | PASS_CI_352 |
| EXEC-003-C05 | EXEC-003-C05-O03 | `/api/v1/contracts/[id]/payment-plan` | POST | `app/api/v1/contracts/[id]/payment-plan/route.ts` | DATABASE_RBAC | CONTRACT_WRITE_ROLES | `contracts.payment_plan.create` | CONTRACT_WRITE_ROLES | YES | Existing contract-write role set is preserved and intersected. | WIRED_DATABASE_GUARD | `tests/foundation/g5-exec-003-contract-wiring.test.ts` | `EXEC-003-C05-O03 wires contracts.payment_plan.create through runWithExec003DatabasePermission with a static key` | PASS_CI_352 |
| EXEC-003-C06 | EXEC-003-C06-O01 | `/api/v1/contracts/[id]/restructure` | POST | `app/api/v1/contracts/[id]/restructure/route.ts` | DATABASE_RBAC | CONTRACT_WRITE_ROLES | `contracts.payment_plan.restructure` | CONTRACT_WRITE_ROLES | YES | Cookie-only identity is preserved; the duplicated local role check is replaced by the same database-backed role intersection. | WIRED_COOKIE_GUARD | `tests/foundation/g5-exec-003-contract-wiring.test.ts` | `EXEC-003-C06-O01 wires contracts.payment_plan.restructure through runWithExec003CookiePermission with a static key` | PASS_CI_352 |
| EXEC-003-C07 | EXEC-003-C07-O01 | `/api/v1/contracts/[id]/sign` | POST | `app/api/v1/contracts/[id]/sign/route.ts` | DATABASE_RBAC | CONTRACT_WRITE_ROLES | `contracts.sign.execute` | CONTRACT_WRITE_ROLES | YES | Existing database-backed write roles are intersected with a static key. | WIRED_DATABASE_GUARD | `tests/foundation/g5-exec-003-contract-wiring.test.ts` | `EXEC-003-C07-O01 wires contracts.sign.execute through runWithExec003DatabasePermission with a static key` | PASS_CI_352 |
| EXEC-003-C08 | EXEC-003-C08-O01 | `/api/v1/invoices/[id]/paylink/create` | POST | `app/api/v1/invoices/[id]/paylink/create/route.ts` | DATABASE_RBAC | CONTRACT_WRITE_ROLES | `invoices.paylink.create` | CONTRACT_WRITE_ROLES | YES | Existing 401/403 flow and provider logic are preserved; only the role decision is intersected. | WIRED_INLINE_DATABASE_GUARD | `tests/foundation/g5-exec-003-contract-wiring.test.ts` | `EXEC-003-C08-O01 wires invoices.paylink.create through hasExec003DatabasePermission with a static key` | PASS_CI_352 |
| EXEC-003-C09 | EXEC-003-C09-O01 | `/api/v1/leads/webhook` | POST | `app/api/v1/leads/webhook/route.ts` | SIGNED_BOUNDARY | NONE | `leads.webhook.ingest` | NONE | NO | HMAC, timestamp and replay controls remain the sole authentication boundary. | EXCLUDED_UNCHANGED | `tests/foundation/g5-exec-003-contract-wiring.test.ts` | `EXEC-003-C09-O01 preserves SIGNED_BOUNDARY for /api/v1/leads/webhook` | PASS_CI_352 |
| EXEC-003-C10 | EXEC-003-C10-O01 | `/api/v1/leases/[id]/invoices` | POST | `app/api/v1/leases/[id]/invoices/route.ts` | AUTHENTICATED_SESSION | ALL_TENANT_ROLES | `leases.invoices.create` | ALL_TENANT_ROLES | YES | Cookie-only legacy channel is preserved, with database revalidation added. | WIRED_COOKIE_GUARD | `tests/foundation/g5-exec-003-contract-wiring.test.ts` | `EXEC-003-C10-O01 wires leases.invoices.create through runWithExec003CookiePermission with a static key` | PASS_CI_352 |
| EXEC-003-C11 | EXEC-003-C11-O01 | `/api/v1/settings/leads-webhook` | GET | `app/api/v1/settings/leads-webhook/route.ts` | DATABASE_RBAC | ACCOUNTING_WRITE_ROLES | `settings.leads_webhook.read` | ACCOUNTING_WRITE_ROLES | YES | Existing ADMIN-only database role remains authoritative. | WIRED_DATABASE_GUARD | `tests/foundation/g5-exec-003-contract-wiring.test.ts` | `EXEC-003-C11-O01 wires settings.leads_webhook.read through runWithExec003DatabasePermission with a static key` | PASS_CI_352 |
| EXEC-003-C11 | EXEC-003-C11-O02 | `/api/v1/settings/leads-webhook` | POST | `app/api/v1/settings/leads-webhook/route.ts` | DATABASE_RBAC | ACCOUNTING_WRITE_ROLES | `settings.leads_webhook.rotate` | ACCOUNTING_WRITE_ROLES | YES | Existing ADMIN-only database role remains authoritative. | WIRED_DATABASE_GUARD | `tests/foundation/g5-exec-003-contract-wiring.test.ts` | `EXEC-003-C11-O02 wires settings.leads_webhook.rotate through runWithExec003DatabasePermission with a static key` | PASS_CI_352 |
| EXEC-003-C12 | EXEC-003-C12-O01 | `/api/v1/accounting/journal-entries/[id]` | GET | `app/api/v1/accounting/journal-entries/[id]/route.ts` | DATABASE_RBAC | ALL_TENANT_ROLES | `accounting.journal_entries.read` | ALL_TENANT_ROLES | YES | Existing database-backed tenant role set is preserved. | WIRED_DATABASE_GUARD | `tests/foundation/g5-exec-003-contract-wiring.test.ts` | `EXEC-003-C12-O01 wires accounting.journal_entries.read through runWithExec003DatabasePermission with a static key` | PASS_CI_352 |
| EXEC-003-C12 | EXEC-003-C12-O02 | `/api/v1/accounting/journal-entries/[id]` | POST | `app/api/v1/accounting/journal-entries/[id]/route.ts` | DATABASE_RBAC | ACCOUNTING_WRITE_ROLES | `accounting.journal_entries.reverse` | ACCOUNTING_WRITE_ROLES | YES | Existing ADMIN-only reversal role is preserved. | WIRED_DATABASE_GUARD | `tests/foundation/g5-exec-003-contract-wiring.test.ts` | `EXEC-003-C12-O02 wires accounting.journal_entries.reverse through runWithExec003DatabasePermission with a static key` | PASS_CI_352 |
| EXEC-003-C13 | EXEC-003-C13-O01 | `/api/v1/accounting/seed` | POST | `app/api/v1/accounting/seed/route.ts` | DATABASE_RBAC | ACCOUNTING_WRITE_ROLES | `accounting.seed.execute` | ACCOUNTING_WRITE_ROLES | YES | Existing ADMIN-only role remains authoritative; this is route wiring, not Production seed execution. | WIRED_DATABASE_GUARD | `tests/foundation/g5-exec-003-contract-wiring.test.ts` | `EXEC-003-C13-O01 wires accounting.seed.execute through runWithExec003DatabasePermission with a static key` | PASS_CI_352 |
| EXEC-003-C14 | EXEC-003-C14-O01 | `/api/v1/automation/workflows` | GET | `app/api/v1/automation/workflows/route.ts` | AUTHENTICATED_SESSION | ALL_TENANT_ROLES | `automation.workflows.read` | ALL_TENANT_ROLES | YES | Cookie-only identity is preserved; missing identity returns 401. | WIRED_COOKIE_GUARD | `tests/foundation/g5-exec-003-contract-wiring.test.ts` | `EXEC-003-C14-O01 wires automation.workflows.read through runWithExec003CookiePermission with a static key` | PASS_CI_352 |
| EXEC-003-C14 | EXEC-003-C14-O02 | `/api/v1/automation/workflows` | POST | `app/api/v1/automation/workflows/route.ts` | AUTHENTICATED_SESSION | ALL_TENANT_ROLES | `automation.workflows.create` | ALL_TENANT_ROLES | YES | Cookie-only identity is preserved; no new write role is added beyond Legacy. | WIRED_COOKIE_GUARD | `tests/foundation/g5-exec-003-contract-wiring.test.ts` | `EXEC-003-C14-O02 wires automation.workflows.create through runWithExec003CookiePermission with a static key` | PASS_CI_352 |
| EXEC-003-C15 | EXEC-003-C15-O01 | `/api/v1/maintenance` | GET | `app/api/v1/maintenance/route.ts` | AUTHENTICATED_SESSION | ALL_TENANT_ROLES | `maintenance.tickets.read` | ALL_TENANT_ROLES | YES | Cookie-only legacy channel is preserved and current role is revalidated. | WIRED_COOKIE_GUARD | `tests/foundation/g5-exec-003-contract-wiring.test.ts` | `EXEC-003-C15-O01 wires maintenance.tickets.read through runWithExec003CookiePermission with a static key` | PASS_CI_352 |
| EXEC-003-C15 | EXEC-003-C15-O02 | `/api/v1/maintenance` | POST | `app/api/v1/maintenance/route.ts` | AUTHENTICATED_SESSION | ALL_TENANT_ROLES | `maintenance.tickets.create` | ALL_TENANT_ROLES | YES | Cookie-only legacy channel is preserved; permission does not add a role. | WIRED_COOKIE_GUARD | `tests/foundation/g5-exec-003-contract-wiring.test.ts` | `EXEC-003-C15-O02 wires maintenance.tickets.create through runWithExec003CookiePermission with a static key` | PASS_CI_352 |
| EXEC-003-C16 | EXEC-003-C16-O01 | `/api/v1/maintenance/[id]` | PATCH | `app/api/v1/maintenance/[id]/route.ts` | AUTHENTICATED_SESSION | ALL_TENANT_ROLES | `maintenance.tickets.update` | ALL_TENANT_ROLES | YES | Cookie-only legacy channel is preserved; request body cannot select the permission. | WIRED_COOKIE_GUARD | `tests/foundation/g5-exec-003-contract-wiring.test.ts` | `EXEC-003-C16-O01 wires maintenance.tickets.update through runWithExec003CookiePermission with a static key` | PASS_CI_352 |
| EXEC-003-C17 | EXEC-003-C17-O01 | `SERVER_ACTION:app/actions/aiClient.ts:generateAIInsight` | INVOKE | `app/actions/aiClient.ts` | DELEGATED_DATABASE_RBAC | ALL_TENANT_ROLES | `ai.lead_insight.generate` | NONE | NO | Client wrapper delegates to `analyzeLeadAI`; the real server boundary retains `requireAgentAccess(AGENT_READ_ROLES)`. | EXCLUDED_UNCHANGED | `tests/foundation/g5-exec-003-contract-wiring.test.ts` | `EXEC-003-C17-O01 preserves DELEGATED_DATABASE_RBAC for SERVER_ACTION:app/actions/aiClient.ts:generateAIInsight` | PASS_CI_352 |
| EXEC-003-C18 | EXEC-003-C18-O01 | `SERVER_ACTION:app/actions/logs.ts:clearSystemLogsAction` | INVOKE | `app/actions/logs.ts` | SESSION_CLAIM_EXACT | EXACT_ADMIN_CLAIM | `system.logs.clear` | NONE | NO | The literal legacy comparison `session.role !== "Admin"` remains exact. | EXCLUDED_UNCHANGED | `tests/foundation/g5-exec-003-contract-wiring.test.ts` | `EXEC-003-C18-O01 preserves SESSION_CLAIM_EXACT for SERVER_ACTION:app/actions/logs.ts:clearSystemLogsAction` | PASS_CI_352 |
| EXEC-003-C19 | EXEC-003-C19-O01 | `SERVER_ACTION:app/actions/logs.ts:triggerMockErrorAction` | INVOKE | `app/actions/logs.ts` | SESSION_CLAIM_EXACT | EXACT_ADMIN_CLAIM | `system.logs.mock_error` | NONE | NO | The literal legacy comparison `session.role !== "Admin"` remains exact. | EXCLUDED_UNCHANGED | `tests/foundation/g5-exec-003-contract-wiring.test.ts` | `EXEC-003-C19-O01 preserves SESSION_CLAIM_EXACT for SERVER_ACTION:app/actions/logs.ts:triggerMockErrorAction` | PASS_CI_352 |
| EXEC-003-C20 | EXEC-003-C20-O01 | `/api/v1/accounting/payables` | GET | `app/api/v1/accounting/payables/route.ts` | AUTHENTICATED_SESSION | ALL_TENANT_ROLES | `accounting.payables.read` | ALL_TENANT_ROLES | YES | Legacy accepted Cookie or Bearer; the standard request guard preserves both and revalidates the database role. | WIRED_DATABASE_GUARD | `tests/foundation/g5-exec-003-contract-wiring.test.ts` | `EXEC-003-C20-O01 wires accounting.payables.read through runWithExec003DatabasePermission with a static key` | PASS_CI_352 |
| EXEC-003-C21 | EXEC-003-C21-O01 | `/api/v1/contracts/[id]/pdf` | GET | `app/api/v1/contracts/[id]/pdf/route.ts` | AUTHENTICATED_SESSION | ALL_TENANT_ROLES | `contracts.pdf.read` | ALL_TENANT_ROLES | YES | Cookie-only legacy channel and tenant-scoped query are preserved. | WIRED_COOKIE_GUARD | `tests/foundation/g5-exec-003-contract-wiring.test.ts` | `EXEC-003-C21-O01 wires contracts.pdf.read through runWithExec003CookiePermission with a static key` | PASS_CI_352 |
| EXEC-003-C22 | EXEC-003-C22-O01 | `/api/v1/invoices/[id]/paylink/status` | GET | `app/api/v1/invoices/[id]/paylink/status/route.ts` | AUTHENTICATED_SESSION | ALL_TENANT_ROLES | `invoices.paylink_status.read` | ALL_TENANT_ROLES | YES | Legacy accepted Cookie or Bearer; standard request guard preserves both. | WIRED_DATABASE_GUARD | `tests/foundation/g5-exec-003-contract-wiring.test.ts` | `EXEC-003-C22-O01 wires invoices.paylink_status.read through runWithExec003DatabasePermission with a static key` | PASS_CI_352 |
| EXEC-003-C23 | EXEC-003-C23-O01 | `/api/v1/invoices/[id]/pdf` | GET | `app/api/v1/invoices/[id]/pdf/route.ts` | AUTHENTICATED_SESSION | ALL_TENANT_ROLES | `invoices.pdf.read` | ALL_TENANT_ROLES | YES | Cookie-only legacy channel and tenant-scoped query are preserved. | WIRED_COOKIE_GUARD | `tests/foundation/g5-exec-003-contract-wiring.test.ts` | `EXEC-003-C23-O01 wires invoices.pdf.read through runWithExec003CookiePermission with a static key` | PASS_CI_352 |
| EXEC-003-C24 | EXEC-003-C24-O01 | `/api/v1/invoices/[id]/qr` | GET | `app/api/v1/invoices/[id]/qr/route.ts` | AUTHENTICATED_SESSION | ALL_TENANT_ROLES | `invoices.qr.read` | ALL_TENANT_ROLES | YES | Cookie-only legacy channel and tenant-scoped query are preserved. | WIRED_COOKIE_GUARD | `tests/foundation/g5-exec-003-contract-wiring.test.ts` | `EXEC-003-C24-O01 wires invoices.qr.read through runWithExec003CookiePermission with a static key` | PASS_CI_352 |
| EXEC-003-C25 | EXEC-003-C25-O01 | `SERVER_ACTION:app/actions/rentals.ts:getRentalContractsAction` | INVOKE | `app/actions/rentals.ts` | AUTHENTICATED_SESSION | ALL_TENANT_ROLES | `rentals.contracts.read` | ALL_TENANT_ROLES | YES | Strict Server Action guard revalidates the current database role and does not inherit the platform-owner bypass from another guard. | WIRED_SERVER_ACTION_GUARD | `tests/foundation/g5-exec-003-contract-wiring.test.ts` | `EXEC-003-C25-O01 wires rentals.contracts.read through assertExec003ServerActionPermission with a static key` | PASS_CI_352 |

## Shared behavioral evidence

The operation-specific tests above prove that each actual contract invokes the correct shared-guard entry point with a typed static key and its frozen Legacy role set. Common decision behavior is proven by:

- `tests/foundation/g5-exec-003-shared-guard.test.ts`
  - Legacy allow + permission allow = allow.
  - Legacy deny + permission allow = deny through role-set intersection.
  - Legacy allow + permission deny = deny.
  - Legacy deny + permission deny = deny.
  - Unknown or non-shared key = deny.
  - Missing identity = deny / 401 according to the contract.
  - Database-denied Server Action = deny with no platform-owner bypass.
- `tests/foundation/g5-exec-003-cookie-guard.test.ts`
  - Cookie-only Legacy authentication remains Cookie-only.
  - Bearer input cannot expand a Cookie-only contract.
  - Missing Cookie identity = 401.
  - Current database-role or scope denial = 403.
  - Missing and unknown keys fail closed.
  - The operation runs only after identity and permission both allow.
- `tests/foundation/g5-exec-003-contract-wiring.test.ts`
  - 27 eligible operations use their expected guard and static permission key.
  - Five excluded operations preserve their signed, delegated, or exact-claim boundary.
  - No user input supplies a permission key.
  - Same-file evidence does not credit an unrelated log-read action.

## Verified evidence

- Validated executable head: `ed7433257a334abe783d96dbd51fd3252f828556`.
- ORCA CI run: `352` — `SUCCESS`.
- G5 direct-test backlog: `34` total, `0` P0/P1, `34` lower priority.
- G7 reconciliation: `SUCCESS` with `34 / 0 / 34` derived totals.
- G8 repository foundation: `PASS / CLOSED`; Production remains `CONDITIONAL_GO` and unauthorized.
- TypeScript, Production dependency audit, G5/G6/G7/G8 tests, Foundation regressions, Sentinel regressions, P2 acceptance, Build, and isolated recovery drill: `SUCCESS`.
