# ORCA Z8 — EXEC-003 v2 Frozen Execution Contract

- **Document ID:** `ORCA-Z8-EXEC-003-V2-FREEZE-001`
- **Package:** `EXEC-003 v2`
- **Date:** `2026-07-25`
- **Status:** `FROZEN / SHARED GUARD VERIFIED / CONTRACT WIRING SLICE AUTHORIZED`
- **Central base branch:** `work/orca-zero-based-execution-20260721`
- **Central base SHA:** `001b2c853e99ea055f161dcd294d968bbf25c9ad`
- **Execution branch:** `work/orca-gexec-003-v2-shared-guard-20260725`
- **Pull Request:** `#108`
- **Source gap register:** `docs/zero-based/Z7/ORCA_Z7_CLASSIFIED_GAP_REGISTER.md`
- **Source package registry:** `docs/zero-based/Z8/ORCA_Z8_EXECUTION_PACKAGE_REGISTRY.json`
- **Assignment object:** `lib/auth/exec-003-permission-assignments.ts`
- **Wiring matrix:** `docs/zero-based/Z8/ORCA_Z8_EXEC_003_V2_CONTRACT_WIRING_MATRIX.md`

## 1. Binding security invariant

```text
NEW RBAC MUST NOT EXPAND LEGACY ACCESS

effectiveAllow =
  legacyRoleAllows
  AND
  progressivePermissionAllows

unknown permission = DENY
non-shared boundary permission = DENY in shared guard
```

The progressive permission registry is code-only. It may preserve or narrow a legacy role set. It must never add a role or authentication channel that the current legacy control rejects.

## 2. Authorized slices

### Slice A — Shared guard

Completed and verified:

1. freeze the exact 25 P0/P1 contracts and their source evidence;
2. register 32 code-only permission keys and legacy/progressive assignments;
3. implement the shared database-backed guard using intersection semantics;
4. add executable G5 fail-closed and non-expansion tests;
5. activate `EXEC-003 v2 / IN_EXECUTION` in the Z8 registry.

### Slice B — Contract wiring and direct behavioral evidence

Authorized in the same branch and PR:

1. wire only the 27 eligible operations across 20 frozen contracts;
2. preserve the authentication channel of each legacy contract, including Cookie-only routes;
3. leave the five excluded operations unchanged;
4. add direct source-to-contract wiring evidence for all 32 operations;
5. add Cookie-only behavioral evidence and retain the shared-guard behavioral tests;
6. update the authoritative wiring matrix and Z8 package state;
7. validate through targeted tests, TypeScript, GitHub ORCA CI, and diff review.

## 3. Frozen 25 contracts

| ID | Priority | Kind | Route / contract | Source | Methods |
|---|---|---|---|---|---|
| EXEC-003-C01 | P0 | API | `/api/properties/[id]/request-finance` | `app/api/properties/[id]/request-finance/route.ts` | POST |
| EXEC-003-C02 | P0 | API | `/api/revenue-integrity/webhook/[provider]` | `app/api/revenue-integrity/webhook/[provider]/route.ts` | POST |
| EXEC-003-C03 | P0 | API | `/api/v1/contracts/[id]/cancel` | `app/api/v1/contracts/[id]/cancel/route.ts` | POST |
| EXEC-003-C04 | P0 | API | `/api/v1/contracts/[id]/invoices` | `app/api/v1/contracts/[id]/invoices/route.ts` | GET, POST |
| EXEC-003-C05 | P0 | API | `/api/v1/contracts/[id]/payment-plan` | `app/api/v1/contracts/[id]/payment-plan/route.ts` | GET, POST, PUT |
| EXEC-003-C06 | P0 | API | `/api/v1/contracts/[id]/restructure` | `app/api/v1/contracts/[id]/restructure/route.ts` | POST |
| EXEC-003-C07 | P0 | API | `/api/v1/contracts/[id]/sign` | `app/api/v1/contracts/[id]/sign/route.ts` | POST |
| EXEC-003-C08 | P0 | API | `/api/v1/invoices/[id]/paylink/create` | `app/api/v1/invoices/[id]/paylink/create/route.ts` | POST |
| EXEC-003-C09 | P0 | API | `/api/v1/leads/webhook` | `app/api/v1/leads/webhook/route.ts` | POST |
| EXEC-003-C10 | P0 | API | `/api/v1/leases/[id]/invoices` | `app/api/v1/leases/[id]/invoices/route.ts` | POST |
| EXEC-003-C11 | P0 | API | `/api/v1/settings/leads-webhook` | `app/api/v1/settings/leads-webhook/route.ts` | GET, POST |
| EXEC-003-C12 | P1 mutation | API | `/api/v1/accounting/journal-entries/[id]` | `app/api/v1/accounting/journal-entries/[id]/route.ts` | GET, POST |
| EXEC-003-C13 | P1 mutation | API | `/api/v1/accounting/seed` | `app/api/v1/accounting/seed/route.ts` | POST |
| EXEC-003-C14 | P1 mutation | API | `/api/v1/automation/workflows` | `app/api/v1/automation/workflows/route.ts` | GET, POST |
| EXEC-003-C15 | P1 mutation | API | `/api/v1/maintenance` | `app/api/v1/maintenance/route.ts` | GET, POST |
| EXEC-003-C16 | P1 mutation | API | `/api/v1/maintenance/[id]` | `app/api/v1/maintenance/[id]/route.ts` | PATCH |
| EXEC-003-C17 | P1 mutation | Server Action inventory contract | `SERVER_ACTION:app/actions/aiClient.ts:generateAIInsight` | `app/actions/aiClient.ts` | INVOKE |
| EXEC-003-C18 | P1 mutation | Server Action | `SERVER_ACTION:app/actions/logs.ts:clearSystemLogsAction` | `app/actions/logs.ts` | INVOKE |
| EXEC-003-C19 | P1 mutation | Server Action | `SERVER_ACTION:app/actions/logs.ts:triggerMockErrorAction` | `app/actions/logs.ts` | INVOKE |
| EXEC-003-C20 | P1 sensitive read | API | `/api/v1/accounting/payables` | `app/api/v1/accounting/payables/route.ts` | GET |
| EXEC-003-C21 | P1 sensitive read | API | `/api/v1/contracts/[id]/pdf` | `app/api/v1/contracts/[id]/pdf/route.ts` | GET |
| EXEC-003-C22 | P1 sensitive read | API | `/api/v1/invoices/[id]/paylink/status` | `app/api/v1/invoices/[id]/paylink/status/route.ts` | GET |
| EXEC-003-C23 | P1 sensitive read | API | `/api/v1/invoices/[id]/pdf` | `app/api/v1/invoices/[id]/pdf/route.ts` | GET |
| EXEC-003-C24 | P1 sensitive read | API | `/api/v1/invoices/[id]/qr` | `app/api/v1/invoices/[id]/qr/route.ts` | GET |
| EXEC-003-C25 | P1 sensitive read | Server Action | `SERVER_ACTION:app/actions/rentals.ts:getRentalContractsAction` | `app/actions/rentals.ts` | INVOKE |

## 4. Eligibility and exclusion classification

- **Eligible:** 27 operations across 20 contracts.
- **Excluded:** five operations across five Contract IDs.
- **Excluded Contract IDs:** `C02`, `C09`, `C17`, `C18`, `C19`.
- **Excluded boundary types:** three, not five:
  - `SIGNED_BOUNDARY` — C02 and C09;
  - `DELEGATED_DATABASE_RBAC` — C17;
  - `SESSION_CLAIM_EXACT` — C18 and C19.

Rules:

- `DATABASE_RBAC` and eligible authenticated tenant-session operations may use the shared guard.
- Cookie-only legacy contracts must use the Cookie-only shared-guard entry point; Bearer must not become a new authentication channel.
- `SIGNED_BOUNDARY` remains signature, timestamp, and replay scoped.
- `DELEGATED_DATABASE_RBAC` remains guarded at its real downstream server boundary.
- `SESSION_CLAIM_EXACT` remains literal, including the exact legacy string `Admin`.

The operation-level source of truth is the assignment object and the wiring matrix.

## 5. Allowed changed paths for the contract-wiring slice

### Authoritative controls and evidence

```text
docs/zero-based/Z8/ORCA_Z8_EXEC_003_V2_FREEZE.md
docs/zero-based/Z8/ORCA_Z8_EXEC_003_V2_CONTRACT_WIRING_MATRIX.md
docs/zero-based/Z8/ORCA_Z8_EXECUTION_PACKAGE_REGISTRY.json
lib/auth/exec-003-permission-assignments.ts
lib/auth/exec-003-shared-guard.ts
tests/foundation/g5-exec-003-shared-guard.test.ts
tests/foundation/g5-exec-003-cookie-guard.test.ts
tests/foundation/g5-exec-003-contract-wiring.test.ts
```

### Eligible frozen contract sources

```text
app/api/properties/[id]/request-finance/route.ts
app/api/v1/contracts/[id]/cancel/route.ts
app/api/v1/contracts/[id]/invoices/route.ts
app/api/v1/contracts/[id]/payment-plan/route.ts
app/api/v1/contracts/[id]/restructure/route.ts
app/api/v1/contracts/[id]/sign/route.ts
app/api/v1/invoices/[id]/paylink/create/route.ts
app/api/v1/leases/[id]/invoices/route.ts
app/api/v1/settings/leads-webhook/route.ts
app/api/v1/accounting/journal-entries/[id]/route.ts
app/api/v1/accounting/seed/route.ts
app/api/v1/automation/workflows/route.ts
app/api/v1/maintenance/route.ts
app/api/v1/maintenance/[id]/route.ts
app/api/v1/accounting/payables/route.ts
app/api/v1/contracts/[id]/pdf/route.ts
app/api/v1/invoices/[id]/paylink/status/route.ts
app/api/v1/invoices/[id]/pdf/route.ts
app/api/v1/invoices/[id]/qr/route.ts
app/actions/rentals.ts
```

No other implementation path is authorized.

## 6. Explicitly untouched excluded contract sources

```text
app/api/revenue-integrity/webhook/[provider]/route.ts
app/api/v1/leads/webhook/route.ts
app/actions/aiClient.ts
app/actions/logs.ts
app/actions/aiActions.ts
lib/agents/access.ts
```

The last two paths are read-only evidence for delegated authorization and are not frozen contract sources to modify.

## 7. Explicit exclusions

```text
Prisma schema changes: 0
Migration files: 0
Backfill scripts or execution: 0
Database data changes: 0
Production seed execution: 0
Provider or credential changes: 0
Environment changes: 0
Dynamic permission keys: 0
Out-of-scope contract changes: 0
New privilege grants: 0
main changes: 0
Production changes: 0
Vercel Preview: SKIP_BY_DEFAULT
```

## 8. Acceptance for the contract-wiring slice

- all 27 eligible operations invoke the expected shared-guard entry point with a static typed key;
- all 20 eligible contracts retain their frozen Legacy role sets;
- Cookie-only contracts do not accept Bearer as a new channel;
- missing identity produces 401 and authenticated denial produces 403 where the HTTP contract applies;
- Legacy denial always wins over a progressive allow;
- unknown and non-shared keys fail closed;
- all five excluded operations remain unchanged and retain their original security models;
- every operation has a direct test record in the authoritative wiring matrix;
- G5 evidence count changes only when the named contract-source test passes;
- targeted tests, TypeScript, Foundation regressions, ORCA CI, and Build pass on the exact final head;
- no Preview, migration, backfill, main, or Production action occurs.
