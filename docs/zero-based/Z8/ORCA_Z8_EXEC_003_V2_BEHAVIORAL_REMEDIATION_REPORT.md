# ORCA Z8 — EXEC-003 v2 Behavioral Evidence Remediation Report

- **Package:** `EXEC-003 v2`
- **Slice:** `CONTRACT_LEVEL_BEHAVIORAL_EVIDENCE_REMEDIATION`
- **Status:** `IMPLEMENTED / AWAITING INDEPENDENT RE-REVIEW`
- **Source SHA:** `931016d8a01dabf4dcea8e6c31cce4eecc05dec5`
- **Behavioral evidence SHA:** `3dc4b8d865212716e5bfdb844a85e7d9c90e17ea`
- **Branch:** `work/orca-gexec-003-v2-shared-guard-20260725`
- **Pull Request:** `#108 / DRAFT / OPEN / UNMERGED`
- **Central base:** `work/orca-zero-based-execution-20260721`
- **Base SHA:** `001b2c853e99ea055f161dcd294d968bbf25c9ad`
- **ORCA CI evidence run:** `#365 / SUCCESS`
- **CI checkout mode:** `PR_MERGE_REF`
- **Synthetic merge SHA:** `0ea28c491d67fee8356f566a34861daf0b956474`

CI validated the synthetic PR merge commit `0ea28c491d67fee8356f566a34861daf0b956474` containing evidence head SHA `3dc4b8d865212716e5bfdb844a85e7d9c90e17ea` against base SHA `001b2c853e99ea055f161dcd294d968bbf25c9ad`. It did not check out that head commit directly.

## 1. Remediation objective

The previous evidence set proved Shared Guard behavior and source wiring, but the contract-specific test read source files and matched guard names, Permission Keys, role tokens, and Regex patterns. That evidence is retained as:

```text
STRUCTURAL / SOURCE_ASSERTION
```

It is not counted as `DIRECT_BEHAVIORAL`.

This remediation invokes the actual Route Handler or Server Action entry point for every frozen contract, traverses its real authorization boundary, and verifies that denial stops before the next operational step or that successful authorization reaches the next tenant-scoped operation.

## 2. Result

```text
Frozen contracts: 25/25
Frozen operations: 32/32
Directly tested contracts: 25/25
Directly tested operations: 32/32
Structural-only frozen contracts: 0
Excluded contracts tested under original boundary: 5/5
Baseline gaps: 59
Remaining gaps: 34
P0 remaining: 0
P1 mutation remaining: 0
P1 sensitive read remaining: 0
P2 remaining: 16
P3 remaining: 16
P4 remaining: 2
```

The authoritative operation-level credit record is:

`docs/zero-based/Z8/ORCA_Z8_EXEC_003_V2_EVIDENCE_LEDGER.md`

## 3. Direct behavioral test files

```text
tests/foundation/g5-exec-003-contract-behavior-pilot.test.ts
tests/foundation/g5-exec-003-contract-behavior-p0.test.ts
tests/foundation/g5-exec-003-contract-behavior-p1-mutation.test.ts
tests/foundation/g5-exec-003-contract-behavior-p1-sensitive-read.test.ts
tests/foundation/g5-exec-003-signed-boundary-behavior.test.ts
tests/foundation/g5-exec-003-delegated-boundary-behavior.test.ts
tests/foundation/g5-exec-003-exact-claim-boundary-behavior.test.ts
```

The Ledger integrity test is:

`tests/foundation/g5-exec-003-evidence-ledger.test.ts`

Supporting evidence remains:

```text
tests/foundation/g5-exec-003-shared-guard.test.ts       UNIT_BEHAVIOR
tests/foundation/g5-exec-003-cookie-guard.test.ts       UNIT_BEHAVIOR
tests/foundation/g5-exec-003-contract-wiring.test.ts    STRUCTURAL / SOURCE_ASSERTION
```

## 4. Boundary coverage

### Eligible shared-guard contracts

The 27 eligible operations invoke their actual entry points and prove, as applicable:

- missing identity is rejected before the downstream operation;
- database-denied or unknown roles are denied;
- Legacy-denied roles cannot be rescued by Progressive Permission;
- Cookie-only contracts reject Bearer-only identity;
- successful authorization reaches the next tenant-scoped operation;
- C25 does not receive a Platform Owner bypass.

### Excluded original boundaries

- C02: actual provider HMAC rejection and acceptance.
- C09: actual timestamped HMAC rejection and acceptance before lead creation.
- C17: actual `generateAIInsight` entry point delegates to `requireAgentAccess`; delegated denial is preserved.
- C18: actual `clearSystemLogsAction` accepts exact Legacy `Admin` and rejects `ADMIN`.
- C19: actual `triggerMockErrorAction` accepts exact Legacy `Admin` and rejects `ADMIN`.

No excluded contract was moved to the Shared Guard.

## 5. Same-file spillover correction

An intermediate combined excluded-boundary test imported `app/actions/logs.ts` with its literal source path. The G4 discovery mechanism then referenced the unfrozen `getSystemLogsAction` because it shared the same file, reducing the backlog incorrectly from 34 to 33.

The behavioral assertions themselves passed, but this evidence-accounting defect was corrected by:

1. splitting Signed, Delegated, and Exact Claim tests into boundary-specific files;
2. importing the exact-claim module through a composed module path;
3. adding a Ledger integrity test that requires exactly 25 contracts and 32 operations;
4. retaining `getSystemLogsAction` outside EXEC-003 and outside the credited set.

CI #365 confirmed the corrected backlog remained 34 with no same-file spillover.

## 6. Runtime findings

```text
Runtime privilege expansion defects found: 0
Runtime defects fixed: 0
Shared Guard redesign: 0
Permission Key changes: 0
Legacy role changes: 0
Authentication-channel expansions: 0
New privilege grants: 0
Dynamic permission keys: 0
```

No Runtime source was modified during this remediation slice.

## 7. Validation evidence

ORCA CI #365 recorded:

```text
G5 executable tests: 135/135 PASS
G5 suites: 33/33 PASS
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

The final documentation and Ledger-integrity head must also pass ORCA CI before handoff to independent re-review. That final CI result is reported in the task result and PR body rather than represented as an impossible self-referential SHA inside this committed document.

## 8. Scope verification

```text
Prisma changes: 0
Migrations: 0
Backfills: 0
Production data changes: 0
Provider credential changes: 0
Environment changes: 0
UI changes: 0
Out-of-scope contract credit: 0
Tests deleted from the accepted baseline: 0
Skipped/focused tests: 0
main changes: 0
Production changes: 0
Vercel Preview: NOT_REQUIRED / SKIP_BY_DEFAULT
```

## 9. Current state

```text
EXEC-003 v2: IN_EXECUTION
Slice: IMPLEMENTED / AWAITING INDEPENDENT RE-REVIEW
PR #108: DRAFT / OPEN / UNMERGED
Central merge: NOT PERFORMED
main: UNTOUCHED
Production: UNTOUCHED
EXEC-004: NOT AUTHORIZED
```

## 10. Next authorized step

`INDEPENDENT RE-REVIEW`

This report does not authorize closure, Ready for Review conversion, Merge, main, Production, Vercel Preview, or EXEC-004.
