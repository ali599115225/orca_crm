# ORCA Z8 — EXEC-003 v2 Semantic Behavioral Evidence Ledger

- **Package:** `EXEC-003 v2`
- **State:** `IN_EXECUTION / AWAITING INDEPENDENT RE-REVIEW`
- **PR:** `#108 / DRAFT / OPEN / UNMERGED`
- **Branch:** `work/orca-gexec-003-v2-shared-guard-20260725`
- **Base:** `work/orca-zero-based-execution-20260721`
- **Validated implementation head:** `d84a1ea5e10a64778c841f59d8049ec1ae25e522`
- **Evidence digest:** `b6cb250d25d2b939f9a153647e809174e23c8d26783a2f7d17cc9e4d526e6652`
- **Digest algorithm:** `sha256-path-length-content-v2-derived-manifest`
- **Derived evidence files:** `48`
- **Validated base SHA:** `001b2c853e99ea055f161dcd294d968bbf25c9ad`
- **Checkout mode:** `PR_MERGE_REF`
- **Evidence identity:** `docs/zero-based/Z8/ORCA_Z8_EXEC_003_V2_EVIDENCE_IDENTITY.json`

## Executable sources of truth

The evidence set is derived from the frozen operation Manifest rather than maintained as a manual list. It includes every credited operation entry point, `hasDatabaseRole`, `requireAgentAccess`, the Shared Guard and assignment registry, AUTH_BOOTSTRAP boundary, direct behavioral tests, candidate Manifest, semantic gate, identity and Registry tests, deterministic scripts, `vitest.config.ts`, and configured setup/global-setup files.

The Manifest provides candidate metadata only. It does not grant direct credit. The semantic gate evaluates each exact `operationId` and derives the credited set only when that operation has no semantic violation.

## Required semantic proof

Each credited operation has:

1. a stable operation fingerprint covering method, route/contract, Permission Key, and boundary;
2. distinct executable ALLOW and DENY test names and callbacks owned by the exact `operationId`;
3. actual entry-point import or real `vi.importActual` binding and invocation in both tests;
4. no mock, doMock, spy, mutation, unauthorized reassignment, or replacement of the credited entry point;
5. the real final authorization decision;
6. an explicit ALLOW outcome contract;
7. an explicit DENY outcome contract;
8. downstream reachability after ALLOW and non-execution after DENY where a downstream symbol exists;
9. an explicit response/result contract where no downstream symbol exists;
10. no final-guard mock, spy, indirect factory, alias, setup-file override, or intermediary mocked re-export;
11. no same-file spillover, cross-operation spillover, or out-of-freeze credit.

```text
Eligible Database RBAC final guard: hasDatabaseRole
C17 delegated final guard: requireAgentAccess
```

## Runtime and entry-point coverage

The earlier Runtime correction remains included in the evidence surface: `authBootstrapFindUserRole` requires `{ id, tenantId, isActive: true }`. The current hardening cycle changed no Runtime file.

Actual entry-point tests prove inactive-user denial across bearer-capable routes, Cookie-only routes, Server Actions, reads, mutations, and sensitive reads.

- AUTH_BOOTSTRAP database exceptions return `null` and fail closed.
- C18 and C19 use independent ALLOW and DENY tests.
- C14-O02 and C15-O02 independently reject Bearer-only requests, never call `requireAuth`, and never execute their mutations.
- A frozen C03 entry point proves Legacy allow + Progressive deny = DENY.
- C02/C09 retain signed boundaries.
- C17 retains delegated `requireAgentAccess`.
- C18/C19 retain exact Legacy `Admin` semantics.

## Gate hardening result

The AST gate now rejects:

```text
entry-point vi.mock / vi.doMock
entry-point vi.spyOn
entry-point mutation or unauthorized reassignment
final-guard mock / doMock / spy
vi aliases and indirect factories
untrusted object spreading
wrong vi.importActual module paths
mocked intermediary re-exports
ALLOW/DENY callback reuse
cross-operation test ownership spillover
unscanned Vitest setup/global-setup files
missing derived evidence paths
PENDING or stale evidence identity
```

Dynamic entry-point binding is accepted only when `vi.importActual` resolves the exact frozen module and the local binding receives the matching real export.

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
Cross-operation spillover: 0
Baseline gap: 59
Remaining gap: 34
P0 remaining: 0
P1 mutation remaining: 0
P1 sensitive read remaining: 0
P2 remaining: 16
P3 remaining: 16
P4 remaining: 2
```

These values are derived from semantically validated operations, not from Manifest row count or this Markdown.

## Repository-bound identity

```text
Validated implementation head: d84a1ea5e10a64778c841f59d8049ec1ae25e522
Evidence digest: b6cb250d25d2b939f9a153647e809174e23c8d26783a2f7d17cc9e4d526e6652
Digest algorithm: sha256-path-length-content-v2-derived-manifest
Derived evidence files: 48
Base SHA: 001b2c853e99ea055f161dcd294d968bbf25c9ad
Checkout mode: PR_MERGE_REF
```

CI derives the sorted evidence set and fails on any omitted entry point, final guard, test, configured setup file, missing path, duplicate path, content change, invalid head, mismatched digest, or stale `PENDING` value. The deterministic Registry reconciliation preserves every non-EXEC-003 package state; EXEC-004 remains `OWNER_DECISION_PENDING`.

## Validation

```text
G5 executable tests: 194/194 PASS
G5 suites: 47/47 PASS
TypeScript: PASS
Production gate: PASS
Production dependency audit: PASS
G5: PASS
G6: PASS
G7: PASS
G8: PASS
Foundation regressions: PASS
Sentinel regressions: PASS
P2 acceptance: PASS
Build: PASS
Isolated recovery drill: PASS
Evidence derivation: PASS
Evidence digest verification: PASS
Registry reconciliation: PASS
```

## Current hardening-cycle scope

```text
Runtime files changed: 0
Runtime security defects introduced or fixed: 0
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
