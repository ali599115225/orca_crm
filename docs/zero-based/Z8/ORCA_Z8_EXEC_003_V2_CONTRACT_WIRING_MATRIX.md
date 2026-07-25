# ORCA Z8 — EXEC-003 v2 Contract Wiring Matrix

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

## Classification

| Evidence | Class | Direct credit |
|---|---|---|
| Contract wiring test | `STRUCTURAL / SOURCE_ASSERTION` | No |
| Shared/Cookie guard tests | `UNIT_BEHAVIOR` | No |
| Manifest rows | `CANDIDATE_DIRECT_BEHAVIORAL` | No, candidate only |
| Semantically validated entry-point tests | `DIRECT_BEHAVIORAL` | Yes |
| Ledger gate | `INTEGRATION / REGRESSION` | Decides credit per operation |
| Evidence identity gate | `REPOSITORY_BOUND_INTEGRITY` | Binds the derived executable surface |
| Registry reconciliation gate | `PACKAGE_STATE_INTEGRITY` | Preserves all package states |

## Wiring result

Eligible contracts invoke actual Route Handlers or Server Actions and retain the real `hasDatabaseRole`. Lower-layer mocks are limited to session retrieval, AUTH_BOOTSTRAP persistence boundaries, Tenant Context, downstream domain/database work, and external providers.

```text
Entry point
→ EXEC-003 shared/Cookie/Server Action guard
→ Legacy and Progressive role intersection
→ real hasDatabaseRole
→ authBootstrapFindUserRole(id, tenantId, isActive=true)
→ authBootstrapFindTenantActive
→ downstream operation
```

C17 invokes `generateAIInsight` through the real `requireAgentAccess`; only lower storage/context/provider dependencies are mocked.

Original boundaries remain C02/C09 signed HMAC, C17 delegated database RBAC, and C18/C19 exact Legacy `Admin` with `ADMIN` denied.

## Reviewed blocker coverage

| Blocker | Executable result |
|---|---|
| Inactive Database user | DENY through real `hasDatabaseRole` |
| AUTH_BOOTSTRAP database exception | `null` result and fail-closed role denial |
| Entry-point inactive-user coverage | bearer route, Cookie route, Server Action, read, mutation, sensitive read |
| C18 | independent ALLOW `Admin` and DENY `ADMIN` |
| C19 | independent ALLOW with logger reach and DENY before logger |
| C14-O02 | independent Bearer-only DENY; `requireAuth` not used; mutation not executed |
| C15-O02 | independent Bearer-only DENY; `requireAuth` not used; mutation not executed |
| Legacy allow + Progressive deny | actual frozen C03 entry point returns DENY |
| Entry-point replacement | mocks, doMocks, spies, mutations and unauthorized reassignments prohibited |
| Final-guard replacement | mocks, doMocks, spies, aliases, setup overrides, indirect factories and re-exports prohibited |
| Dynamic `vi.importActual` binding | allowed only when bound to the real matching export |
| Null downstream | explicit response/result assertion contract required |
| Operation ID drift | method/route/Permission Key/boundary fingerprint pinned |
| Test ownership spillover | direct credit owned by exact `operationId`, not file membership |
| Vitest setup bypass | actual `setupFiles` and `globalSetup`, including shorthand properties, are derived and scanned |
| Evidence identity | 48-file repository-bound SHA-256 digest derived from the Manifest |
| Package Registry | deterministic EXEC-003-only reconciliation; EXEC-004 remains pending |

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

The current evidence-gate hardening cycle changed no Runtime file, Permission Key, Legacy role, authentication channel, tenant boundary, or privilege grant.

EXEC-003 remains `IN_EXECUTION / AWAITING INDEPENDENT RE-REVIEW`. Next authorized step: `INDEPENDENT RE-REVIEW ONLY`.
