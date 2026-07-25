# ORCA G5 Security & Quality Register

## EXEC-003 v2

- **Package:** `EXEC-003 v2`
- **State:** `IN_EXECUTION / AWAITING INDEPENDENT RE-REVIEW`
- **PR:** `#108 / DRAFT / OPEN / UNMERGED`
- **Branch:** `work/orca-gexec-003-v2-shared-guard-20260725`
- **Base:** `work/orca-zero-based-execution-20260721`
- **Validated implementation head:** `f87213676c735c11782751a74435d8d752027b2c`
- **Evidence digest:** `88481115ceceae02964061356f76e30c6252456f89ff06e94cf6fd54553a140f`
- **Digest algorithm:** `sha256-path-length-content-v1`
- **Validated base SHA:** `001b2c853e99ea055f161dcd294d968bbf25c9ad`
- **Checkout mode:** `PR_MERGE_REF`
- **Evidence identity:** `docs/zero-based/Z8/ORCA_Z8_EXEC_003_V2_EVIDENCE_IDENTITY.json`

The repository-bound identity binds the complete executable remediation and reconciliation toolset to one immutable digest. Changes after the validated implementation head are limited to the identity, registry and documentation records and must retain the same digest.

## Runtime security correction

`authBootstrapFindUserRole` now resolves a role only when the user matches all three predicates:

```text
id = session.userId
tenantId = session.tenantId
isActive = true
```

The real `hasDatabaseRole` decision therefore denies inactive users before downstream execution. No Permission Key, Legacy role set, authentication channel, tenant boundary, or privilege grant changed.

## Semantic evidence

- Candidate manifest: `tests/foundation/g5-exec-003-behavior-evidence-manifest.ts`
- Semantic gate: `tests/foundation/g5-exec-003-evidence-ledger.test.ts`
- Identity gate: `tests/foundation/g5-exec-003-evidence-identity.test.ts`
- Registry reconciliation gate: `tests/foundation/g5-exec-003-registry-reconciliation.test.ts`
- AUTH_BOOTSTRAP proof: `tests/foundation/g5-exec-003-auth-bootstrap-active-user.test.ts`
- Inactive-user matrix: `tests/foundation/g5-exec-003-entrypoint-security-matrix.test.ts`
- Cookie mutation proof: `tests/foundation/g5-exec-003-cookie-mutation-boundary.test.ts`

The manifest describes `CANDIDATE_DIRECT_BEHAVIORAL` rows. Direct credit is granted only after the TypeScript AST gate validates distinct executable ALLOW and DENY callbacks, actual entry-point binding and invocation, explicit outcome assertions, final-guard integrity, operation fingerprints, inactive-user coverage, no same-file spillover, and frozen-scope membership.

The gate scans registered tests and configured Vitest setup files for `vi.mock`, `vi.doMock`, `vi.spyOn`, aliases, indirect factories, untrusted object spreading, wrong `vi.importActual` module paths, and mocked intermediary re-exports of `hasDatabaseRole` or `requireAgentAccess`.

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
Baseline gap: 59
Remaining gap: 34
P0 remaining: 0
P1 mutation remaining: 0
P1 sensitive read remaining: 0
P2 remaining: 16
P3 remaining: 16
P4 remaining: 2
```

Contracts without a direct current test reference: **34**

EXEC-003 v2 direct evidence: **25 contracts**

| Priority class | Contracts without direct current test evidence |
|---|---:|
| `P0_SECURITY_CRITICAL_SURFACE` | 0 |
| `P1_MUTATION_SURFACE` | 0 |
| `P1_SENSITIVE_READ_SURFACE` | 0 |
| `P2_READ_SURFACE` | 16 |
| `P3_UI_SURFACE` | 16 |
| `P4_SOURCE_STATE` | 2 |

The priority rows reconcile exactly: `0 + 0 + 0 + 16 + 16 + 2 = 34`.

## Durable dependency risk register

| Dependency / control | Classification | Current handling |
|---|---|---|
| Static low-severity findings | `ACCEPTED_LOW_STATIC` | Retained only under the reviewed production-audit threshold and CI gate. |
| `brace-expansion` | Reviewed package override | Registered with ownership and removal trigger; production audit remains mandatory. |
| `postcss` | Reviewed package override | Uses the package-managed override and remains covered by deterministic install and audit. |

## Validation

```text
G5 executable tests: 184/184 PASS
G5 suites: 47/47 PASS
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
Registry reconciliation: PASS
```

## Scope

```text
Runtime files changed in this remediation: 1
Runtime change: active-user predicate only
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

EXEC-003 remains `IN_EXECUTION / AWAITING INDEPENDENT RE-REVIEW`. Next authorized step: `INDEPENDENT RE-REVIEW ONLY`.
