# ORCA Z8 — EXEC-003 v2 Semantic Behavioral Evidence Ledger

- **Package:** `EXEC-003 v2`
- **State:** `IN_EXECUTION / AWAITING INDEPENDENT RE-REVIEW`
- **PR:** `#108 / DRAFT / OPEN / UNMERGED`
- **Branch:** `work/orca-gexec-003-v2-shared-guard-20260725`
- **Base:** `work/orca-zero-based-execution-20260721`
- **Validated implementation head:** `15230ab21553b0d7992d9c66963d126c6aa16367`
- **Evidence digest:** `a9f68b74bf6dc739b3afabaa9cfa59466c345e4757fb3533d664033016a4fe75`
- **Digest algorithm:** `sha256-path-length-content-v1`
- **Validated base SHA:** `001b2c853e99ea055f161dcd294d968bbf25c9ad`
- **Checkout mode:** `PR_MERGE_REF`
- **Evidence identity:** `docs/zero-based/Z8/ORCA_Z8_EXEC_003_V2_EVIDENCE_IDENTITY.json`

## Executable sources of truth

- `lib/auth/exec-003-permission-assignments.ts`
- `lib/auth/exec-003-shared-guard.ts`
- `lib/system-prisma-boundary.ts`
- `tests/foundation/g5-exec-003-behavior-evidence-manifest.ts`
- `tests/foundation/g5-exec-003-evidence-ledger.test.ts`
- `tests/foundation/g5-exec-003-evidence-identity.test.ts`
- `scripts/exec-003-evidence-digest.mjs`

The Manifest provides candidate metadata only. It does not grant direct credit. The semantic gate evaluates each operation and derives the credited set from operations whose validation result has no violation.

## Required semantic proof

Each credited operation has:

1. a stable operation fingerprint covering method, route/contract, Permission Key, and boundary;
2. distinct executable ALLOW and DENY test names and callbacks;
3. actual entry-point import/binding and invocation in both tests;
4. the real final authorization decision;
5. an explicit ALLOW outcome contract;
6. an explicit DENY outcome contract;
7. downstream reachability after ALLOW and non-execution after DENY where a downstream symbol exists;
8. an explicit response/result contract where no downstream symbol exists;
9. no final-guard mock, spy, indirect factory, alias, setup-file override, or intermediary mocked re-export;
10. no same-file spillover or out-of-freeze credit.

Forbidden final-guard replacements:

```text
Eligible Database RBAC: hasDatabaseRole
C17 delegated boundary: requireAgentAccess
```

## Runtime and entry-point coverage

`authBootstrapFindUserRole` now requires `{ id, tenantId, isActive: true }`. Actual entry-point tests prove inactive-user denial across:

```text
Route bearer-capable
Cookie-only Route
Server Action
Read operation
Mutation operation
Sensitive read
```

Additional reviewed blockers are proven as follows:

- C18 and C19 use independent ALLOW and DENY tests.
- C14-O02 and C15-O02 independently reject Bearer-only requests, never call `requireAuth`, and never execute their mutations.
- A frozen C03 entry point proves Legacy allow + Progressive deny = DENY.
- C02/C09 retain signed boundaries.
- C17 retains delegated `requireAgentAccess`.
- C18/C19 retain exact Legacy `Admin` semantics.

## Derived accounting

```text
Starting strict direct credit: 3 contracts / 3 operations
Starting remaining gap: 56
Directly tested contracts: 25/25
Directly tested operations: 32/32
Full direct behavioral credit: 25 contracts / 32 operations
Partial contract-entry tests: 0
Structural-only frozen contracts: 0
Out-of-scope contracts credited: 0
Same-file spillover: 0
Baseline gap: 59
Remaining gap: 34
P0 remaining: 0
P1 mutation remaining: 0
P1 sensitive read remaining: 0
P2 remaining: 16
P3 remaining: 16
P4 remaining: 2
```

These values are derived from semantically validated operations, not from the number of Manifest rows or this Markdown.

## Repository-bound identity

The evidence identity records:

```text
Validated implementation head: 15230ab21553b0d7992d9c66963d126c6aa16367
Evidence digest: a9f68b74bf6dc739b3afabaa9cfa59466c345e4757fb3533d664033016a4fe75
Base SHA: 001b2c853e99ea055f161dcd294d968bbf25c9ad
Checkout mode: PR_MERGE_REF
```

CI recomputes the digest from the sorted evidence file set and fails on any addition, omission, content change, duplicate path, unsorted path list, invalid head, or stale `PENDING FINAL VALIDATION` value.

## Validation

```text
G5 executable tests: 182/182 PASS
G5 suites: 45/45 PASS
TypeScript: PASS
Production gate: PASS
Production dependency audit: PASS
G5: PASS
G7: PASS
G8: PASS
Foundation regressions: PASS
Sentinel regressions: PASS
P2 acceptance: PASS
Build: PASS
Isolated recovery drill: PASS
Evidence digest verification: PASS
```

## Scope

```text
Runtime files changed in this remediation: 1
Runtime security defects found: 1
Runtime fixes applied: 1
Prisma schema changes: 0
Migrations: 0
Backfills: 0
Production data changes: 0
Provider changes: 0
Environment changes: 0
UI changes: 0
Permission key changes: 0
Legacy role changes: 0
Authentication channel expansion: 0
New privilege grants: 0
Dynamic permission keys: 0
Tests deleted: 0
Skipped/focused/TODO tests: 0
EXEC-004 work: 0
main changes: 0
Production changes: 0
Vercel Preview: NOT REQUIRED
```

Next authorized step: `INDEPENDENT RE-REVIEW ONLY`.
