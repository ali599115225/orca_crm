# ORCA Z8 — EXEC-003 v2 Frozen Execution Contract

- **Document ID:** `ORCA-Z8-EXEC-003-V2-FREEZE-001`
- **Package:** `EXEC-003 v2`
- **Date:** `2026-07-25`
- **Status:** `FROZEN / SHARED GUARD SLICE AUTHORIZED`
- **Central base branch:** `work/orca-zero-based-execution-20260721`
- **Central base SHA:** `001b2c853e99ea055f161dcd294d968bbf25c9ad`
- **Execution branch:** `work/orca-gexec-003-v2-shared-guard-20260725`
- **Source gap register:** `docs/zero-based/Z7/ORCA_Z7_CLASSIFIED_GAP_REGISTER.md`
- **Source package registry:** `docs/zero-based/Z8/ORCA_Z8_EXECUTION_PACKAGE_REGISTRY.json`
- **Assignment object:** `lib/auth/exec-003-permission-assignments.ts`

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

The progressive permission registry is code-only. It may preserve or narrow a legacy role set. It must never add a role that the current legacy control rejects.

## 2. Current authorized slice

This slice authorizes only:

1. freezing the exact 25 P0/P1 contracts and their source evidence;
2. registering code-only permission keys and legacy/progressive role assignments;
3. implementing a shared database-backed guard that intersects, rather than replaces, legacy role allow sets;
4. adding executable G5 tests for fail-closed behavior and the non-expansion invariant;
5. updating the Z8 package registry to `EXEC-003 v2 / IN_EXECUTION`.

This slice does **not** authorize wiring the guard into the 25 contracts. Contract-by-contract runtime wiring and direct behavioral evidence remain later bounded slices of the same package.

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

## 4. Boundary classification

The 25 contracts are not forced into one artificial authentication model.

- `DATABASE_RBAC` and authenticated tenant-session surfaces may use the shared guard in later slices.
- `SIGNED_BOUNDARY` surfaces remain signature/timestamp/replay scoped and must not be converted into user-session RBAC.
- `DELEGATED_DATABASE_RBAC` remains guarded at its actual downstream server boundary.
- `SESSION_CLAIM_EXACT` is recorded literally. It is not normalized to a database role in this slice because doing so could grant access that the current comparison rejects.

The authoritative operation-level classification and role evidence are in `lib/auth/exec-003-permission-assignments.ts`.

## 5. Allowed changed paths for this slice

```text
docs/zero-based/Z8/ORCA_Z8_EXEC_003_V2_FREEZE.md
docs/zero-based/Z8/ORCA_Z8_EXECUTION_PACKAGE_REGISTRY.json
lib/auth/exec-003-permission-assignments.ts
lib/auth/exec-003-shared-guard.ts
tests/foundation/g5-exec-003-shared-guard.test.ts
```

No other path is authorized in this slice.

## 6. Explicit exclusions

```text
Prisma schema changes: 0
Migration files: 0
Backfill scripts or execution: 0
Database data changes: 0
Provider or credential changes: 0
Environment changes: 0
Route or Server Action wiring changes: 0
main changes: 0
Production changes: 0
Vercel Preview: SKIP_BY_DEFAULT
```

## 7. Acceptance for the shared-guard slice

- the assignment object contains exactly 25 contracts and 32 method/action assignments;
- every shared-guard progressive role is a subset of the corresponding legacy role allow set;
- unknown keys fail closed;
- signed-boundary, delegated, and exact-claim keys fail closed when presented to the shared database guard;
- database role revalidation receives only the legacy/progressive intersection;
- existing platform-owner semantics are reachable only for a known shared permission and remain subject to the legacy server-action guard;
- G5 executable test, TypeScript, governance lint, security audit, existing regression gates, and Build pass through ORCA CI;
- no Preview, migration, backfill, main, or Production action occurs.
