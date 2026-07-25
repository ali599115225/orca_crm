# ORCA Z8 — EXEC-003 v2 Frozen Execution Contract

- **Document ID:** `ORCA-Z8-EXEC-003-V2-FREEZE-001`
- **Package:** `EXEC-003 v2`
- **Date:** `2026-07-25`
- **Status:** `FROZEN / SHARED GUARD VERIFIED / CONTRACT WIRING VERIFIED`
- **Central base branch:** `work/orca-zero-based-execution-20260721`
- **Central base SHA:** `001b2c853e99ea055f161dcd294d968bbf25c9ad`
- **Execution branch:** `work/orca-gexec-003-v2-shared-guard-20260725`
- **Pull Request:** `#108`
- **Validated executable head:** `ed7433257a334abe783d96dbd51fd3252f828556`
- **ORCA CI:** `#352 / SUCCESS`
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
missing permission = DENY
non-shared boundary permission = DENY in shared guard
```

The progressive permission registry is code-only. It may preserve or narrow a legacy role set. It must never add a role, authentication channel, platform-owner bypass, tenant scope, or trust source that the legacy control rejects.

## 2. Verified slices

### Slice A — Shared guard

Completed and verified:

1. froze the exact 25 P0/P1 contracts and their source evidence;
2. registered 32 code-only permission keys and legacy/progressive assignments;
3. implemented the shared database-backed guard using intersection semantics;
4. added executable G5 fail-closed and non-expansion tests;
5. activated `EXEC-003 v2 / IN_EXECUTION` in the Z8 registry.

### Slice B — Contract wiring and direct behavioral evidence

Completed and verified in the same branch and PR:

1. wired only the 27 eligible operations across 20 frozen contracts;
2. preserved the authentication channel of each legacy contract, including Cookie-only routes;
3. left the five excluded operations unchanged;
4. added direct source-to-contract wiring evidence for all 32 operations;
5. added Cookie-only behavioral evidence and retained shared-guard behavioral tests;
6. removed a potential Server Action platform-owner bypass that Legacy C25 never granted;
7. reduced the direct-test backlog from 59 to 34, crediting exactly the 25 frozen contracts;
8. reconciled the derived G5, G7, and G8 counts without changing the Production decision;
9. validated TypeScript, audit, G5–G8, regressions, acceptance, Build, and recovery through ORCA CI #352.

EXEC-003 v2 remains `IN_EXECUTION`. Completion of this slice does not authorize closing the package, merging PR #108, starting EXEC-004, changing main, or performing any Production action.

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

- `DATABASE_RBAC` and eligible authenticated tenant-session operations use only their matching shared-guard entry point.
- Cookie-only legacy contracts use the Cookie-only entry point; Bearer is not accepted as a new authentication channel.
- Standard request contracts retain the authentication channels already accepted by `requireAuth` and add database-role intersection only.
- The strict Server Action entry point performs active tenant-user database-role intersection and has no platform-owner bypass.
- `SIGNED_BOUNDARY` remains signature, timestamp, and replay scoped.
- `DELEGATED_DATABASE_RBAC` remains guarded at its real downstream server boundary.
- `SESSION_CLAIM_EXACT` remains literal, including the exact legacy string `Admin`.
- Permission keys are static typed literals in server code and are never read from Query, Form, Header, Request body, Client state, or URL parameters.

The operation-level source of truth is the assignment object and the wiring matrix.

## 5. Allowed changed paths for the contract-wiring slice

### Authoritative controls, reconciliation, and evidence

```text
docs/zero-based/Z8/ORCA_Z8_EXEC_003_V2_FREEZE.md
docs/zero-based/Z8/ORCA_Z8_EXEC_003_V2_CONTRACT_WIRING_MATRIX.md
docs/zero-based/Z8/ORCA_Z8_EXECUTION_PACKAGE_REGISTRY.json
docs/architecture/ORCA_G5_SECURITY_QUALITY_REGISTER.md
lib/auth/exec-003-permission-assignments.ts
lib/auth/exec-003-shared-guard.ts
tests/foundation/g5-exec-003-shared-guard.test.ts
tests/foundation/g5-exec-003-cookie-guard.test.ts
tests/foundation/g5-exec-003-contract-wiring.test.ts
tests/foundation/g5-security-quality.test.ts
tests/foundation/g7-remediation-reconciliation.test.ts
scripts/g8-final-foundation-gate.mjs
tests/foundation/g8-final-foundation-gate.test.ts
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
```

The delegated downstream evidence sources `app/actions/aiActions.ts` and `lib/agents/access.ts` were read but not modified.

## 7. Verified evidence accounting

```text
G4 contracts: 359
Baseline without direct current test reference: 59
EXEC-003 v2 credited frozen contracts: 25
Remaining without direct current test reference: 34
Remaining P0 security-critical gaps: 0
Remaining P1 mutation gaps: 0
Remaining P1 sensitive-read gaps: 0
Remaining P2 read gaps: 16
Remaining P3 UI gaps: 16
Remaining P4 source-state gaps: 2
```

No unrelated same-file contract receives evidence credit. The log-read Server Action sharing `app/actions/logs.ts` with C18/C19 remains outside EXEC-003 v2 and remains in the lower-priority backlog where applicable.

## 8. Explicit exclusions

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

## 9. Verified acceptance

- all 27 eligible operations invoke the expected shared-guard entry point with a static typed key;
- all 20 eligible contracts retain their frozen Legacy role sets and authentication channels;
- Cookie-only contracts do not accept Bearer as a new channel;
- missing identity produces 401 and authenticated denial produces 403 where the HTTP contract applies;
- tenant/user scope mismatch is denied by current database-user revalidation;
- Legacy denial always wins over progressive allow;
- unknown, missing, and non-shared keys fail closed;
- strict Server Action authorization has no platform-owner privilege bypass;
- all five excluded operations remain unchanged and retain their original security models;
- every operation has a direct test record in the authoritative wiring matrix;
- G5 evidence credits exactly 25 frozen contracts and leaves 34 lower-priority gaps;
- G7 and G8 consume `34 / 0 / 34` without authorizing Production;
- TypeScript, audit, G5/G6/G7/G8, Foundation regressions, Sentinel regressions, P2 acceptance, Build, and isolated recovery drill passed on executable head `ed7433257a334abe783d96dbd51fd3252f828556` in ORCA CI #352;
- no Preview, migration, backfill, main, Merge, or Production action occurred.
