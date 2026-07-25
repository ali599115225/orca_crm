# ORCA Z8 — EXEC-003 v2 Frozen Execution Contract

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

## Binding invariant

```text
NEW RBAC MUST NOT EXPAND LEGACY ACCESS
effectiveAllow = legacyRoleAllows AND progressivePermissionAllows
unknown permission = DENY
missing permission = DENY
inactive user = DENY
database exception = DENY
```

## Frozen scope

The package remains frozen at 25 contracts and 32 operations. Eligible scope is 20 contracts / 27 operations. Original excluded boundaries remain C02 and C09 `SIGNED_BOUNDARY`, C17 `DELEGATED_DATABASE_RBAC`, and C18/C19 `SESSION_CLAIM_EXACT`.

Cookie-only contracts remain Cookie-only. C25 has no Platform Owner bypass. Permission Keys and Legacy role sets are unchanged.

## Runtime boundary

The earlier inactive-user correction remains part of the validated evidence set:

```text
where: { id: userId, tenantId, isActive: true }
```

The current evidence-gate hardening cycle changed no Runtime file and introduced no Runtime behavior change. It strengthened only evidence derivation, semantic validation, fail-closed exception proof, identity sealing, Registry reconciliation, and records.

## Direct evidence rule

Direct credit requires:

1. a candidate Manifest row bound to a stable operation fingerprint;
2. separate executable ALLOW and DENY tests owned by the exact `operationId`;
3. actual Route Handler or Server Action invocation in each test;
4. no mock, spy, mutation, reassignment, or replacement of the credited entry point;
5. the real final guard (`hasDatabaseRole` or `requireAgentAccess`);
6. explicit ALLOW and DENY outcome contracts;
7. downstream execution only after ALLOW;
8. inactive-user coverage across bearer-capable routes, Cookie-only routes, Server Actions, reads, mutations, and sensitive reads;
9. explicit fail-closed proof when AUTH_BOOTSTRAP persistence throws;
10. no final-guard mock, same-file spillover, cross-operation spillover, or out-of-freeze credit;
11. a repository-bound digest derived from the Manifest and covering every entry point, final guard, evidence test, tool, Vitest configuration, and configured setup file.

C18 and C19 have independent ALLOW and DENY tests. C14-O02 and C15-O02 have independent Bearer-only denial tests. A frozen C03 entry point proves Legacy allow + Progressive deny = DENY.

## Derived accounting

```text
Starting strict direct credit: 3 contracts / 3 operations
Starting remaining gap: 56
Final directly tested contracts: 25/25
Final directly tested operations: 32/32
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

This freeze does not authorize closure, Ready for Review, Merge, main, Production, Vercel Preview, or EXEC-004. Next authorized step: `INDEPENDENT RE-REVIEW ONLY`.
