# ORCA Z8 — EXEC-003 v2 Frozen Execution Contract

- **Document ID:** `ORCA-Z8-EXEC-003-V2-FREEZE-001`
- **Package:** `EXEC-003 v2`
- **Date:** `2026-07-25`
- **Status:** `FROZEN / BEHAVIORAL REMEDIATION IMPLEMENTED / AWAITING INDEPENDENT RE-REVIEW`
- **Package state:** `IN_EXECUTION`
- **Central base branch:** `work/orca-zero-based-execution-20260721`
- **Central base SHA:** `001b2c853e99ea055f161dcd294d968bbf25c9ad`
- **Execution branch:** `work/orca-gexec-003-v2-shared-guard-20260725`
- **Pull Request:** `#108 / DRAFT / OPEN / UNMERGED`
- **Behavioral evidence head:** `3dc4b8d865212716e5bfdb844a85e7d9c90e17ea`
- **ORCA CI:** `#365 / SUCCESS / PR_MERGE_REF`
- **Synthetic merge SHA:** `0ea28c491d67fee8356f566a34861daf0b956474`
- **Evidence ledger:** `docs/zero-based/Z8/ORCA_Z8_EXEC_003_V2_EVIDENCE_LEDGER.md`
- **Wiring matrix:** `docs/zero-based/Z8/ORCA_Z8_EXEC_003_V2_CONTRACT_WIRING_MATRIX.md`
- **Assignment object:** `lib/auth/exec-003-permission-assignments.ts`

CI validated the synthetic PR merge commit `0ea28c491d67fee8356f566a34861daf0b956474` containing head SHA `3dc4b8d865212716e5bfdb844a85e7d9c90e17ea` against base SHA `001b2c853e99ea055f161dcd294d968bbf25c9ad`. This document does not claim a direct head checkout.

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

The code-only permission registry may preserve or narrow Legacy access. It must not add a role, authentication channel, Platform Owner bypass, tenant scope, or trust source rejected by Legacy.

## 2. Frozen scope

| ID | Priority | Kind | Route / contract | Source | Operations |
|---|---|---|---|---|---|
| EXEC-003-C01 | P0 | API | `/api/properties/[id]/request-finance` | `app/api/properties/[id]/request-finance/route.ts` | POST |
| EXEC-003-C02 | P0 | API | `/api/revenue-integrity/webhook/[provider]` | `app/api/revenue-integrity/webhook/[provider]/route.ts` | POST |
| EXEC-003-C03 | P0 | API | `/api/v1/contracts/[id]/cancel` | `app/api/v1/contracts/[id]/cancel/route.ts` | POST |
| EXEC-003-C04 | P0 | API | `/api/v1/contracts/[id]/invoices` | `app/api/v1/contracts/[id]/invoices/route.ts` | GET, POST |
| EXEC-003-C05 | P0 | API | `/api/v1/contracts/[id]/payment-plan` | `app/api/v1/contracts/[id]/payment-plan/route.ts` | GET, PUT, POST |
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
| EXEC-003-C17 | P1 mutation | Server Action | `generateAIInsight` | `app/actions/aiClient.ts` | INVOKE |
| EXEC-003-C18 | P1 mutation | Server Action | `clearSystemLogsAction` | `app/actions/logs.ts` | INVOKE |
| EXEC-003-C19 | P1 mutation | Server Action | `triggerMockErrorAction` | `app/actions/logs.ts` | INVOKE |
| EXEC-003-C20 | P1 sensitive read | API | `/api/v1/accounting/payables` | `app/api/v1/accounting/payables/route.ts` | GET |
| EXEC-003-C21 | P1 sensitive read | API | `/api/v1/contracts/[id]/pdf` | `app/api/v1/contracts/[id]/pdf/route.ts` | GET |
| EXEC-003-C22 | P1 sensitive read | API | `/api/v1/invoices/[id]/paylink/status` | `app/api/v1/invoices/[id]/paylink/status/route.ts` | GET |
| EXEC-003-C23 | P1 sensitive read | API | `/api/v1/invoices/[id]/pdf` | `app/api/v1/invoices/[id]/pdf/route.ts` | GET |
| EXEC-003-C24 | P1 sensitive read | API | `/api/v1/invoices/[id]/qr` | `app/api/v1/invoices/[id]/qr/route.ts` | GET |
| EXEC-003-C25 | P1 sensitive read | Server Action | `getRentalContractsAction` | `app/actions/rentals.ts` | INVOKE |

Frozen totals:

```text
Contracts: 25
Operations: 32
Eligible contracts: 20
Eligible operations: 27
Excluded contracts: 5
Excluded operations: 5
Excluded boundary types: 3
```

## 3. Eligibility and original boundaries

- `SIGNED_BOUNDARY`: C02, C09.
- `DELEGATED_DATABASE_RBAC`: C17.
- `SESSION_CLAIM_EXACT`: C18, C19.
- All other frozen operations use the applicable shared database, Cookie-only, inline database, or strict Server Action guard.

Rules:

- Cookie-only contracts remain Cookie-only; Bearer alone must not open them.
- Standard request contracts retain only their Legacy authentication channels.
- Database roles are revalidated from the active tenant user record.
- C25 has no Platform Owner bypass.
- Signed boundaries remain signature/timestamp/replay scoped.
- Delegated RBAC remains at its downstream server boundary.
- Exact claim boundaries retain literal Legacy `Admin`.
- Permission keys remain static typed server literals.

## 4. Evidence correction

The original `g5-exec-003-contract-wiring.test.ts` reads source files and verifies guard names, role tokens, and static permission literals. Its correct classification is:

```text
STRUCTURAL / SOURCE_ASSERTION
```

It does not earn `DIRECT_BEHAVIORAL` credit by itself.

The remediation added direct tests that invoke the actual Route Handler or Server Action for every frozen contract and operation. Lower operational dependencies are mocked only after the real entry point and authorization boundary are traversed.

Authoritative direct evidence files:

```text
tests/foundation/g5-exec-003-contract-behavior-pilot.test.ts
tests/foundation/g5-exec-003-contract-behavior-p0.test.ts
tests/foundation/g5-exec-003-contract-behavior-p1-mutation.test.ts
tests/foundation/g5-exec-003-contract-behavior-p1-sensitive-read.test.ts
tests/foundation/g5-exec-003-signed-boundary-behavior.test.ts
tests/foundation/g5-exec-003-delegated-boundary-behavior.test.ts
tests/foundation/g5-exec-003-exact-claim-boundary-behavior.test.ts
tests/foundation/g5-exec-003-evidence-ledger.test.ts
```

Supporting evidence:

```text
tests/foundation/g5-exec-003-shared-guard.test.ts       UNIT_BEHAVIOR
tests/foundation/g5-exec-003-cookie-guard.test.ts       UNIT_BEHAVIOR
tests/foundation/g5-exec-003-contract-wiring.test.ts    STRUCTURAL / SOURCE_ASSERTION
```

## 5. Corrected evidence accounting

```text
Baseline gaps: 59
Directly credited frozen contracts: 25
Remaining gaps: 34
P0 remaining: 0
P1 mutation remaining: 0
P1 sensitive read remaining: 0
P2 read remaining: 16
P3 UI remaining: 16
P4 source-state remaining: 2
```

No credit is granted through a shared file alone. The unfrozen `getSystemLogsAction` remains outside EXEC-003 and remains in the backlog. The combined excluded-boundary test was split by boundary so G4 does not infer same-file evidence for that action.

## 6. Validation

ORCA CI `#365` on the evidence head recorded:

```text
G5 executable tests: 135/135 PASS
G5 test suites: 33/33 PASS
TypeScript: PASS
Production gate: PASS
Production dependency audit: PASS
G5-G8: PASS
Foundation regressions: PASS
Sentinel regressions: PASS
P2 acceptance: PASS
Build: PASS
Isolated recovery drill: PASS
```

## 7. Explicit exclusions

```text
Runtime changes in behavioral remediation: 0
Prisma schema changes: 0
Migration files: 0
Backfills: 0
Production data changes: 0
Provider credential changes: 0
Environment changes: 0
Dynamic permission keys: 0
New privilege grants: 0
Out-of-scope contracts credited: 0
main changes: 0
Production changes: 0
Vercel Preview: NOT_REQUIRED / SKIP_BY_DEFAULT
```

## 8. Current authorization state

EXEC-003 v2 remains `IN_EXECUTION / AWAITING INDEPENDENT RE-REVIEW`.

This remediation does not authorize:

- closing EXEC-003;
- converting PR #108 to Ready for Review;
- merging PR #108;
- starting EXEC-004;
- touching main or Production;
- requesting Vercel Preview.
