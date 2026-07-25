# ORCA Z8 — EXEC-003 v2 Controlled Security Remediation Report

- **Mode:** `CONTROLLED SECURITY REMEDIATION / EVIDENCE GATE HARDENING`
- **Source failed head:** `aad03d74bb1003c6a979813c3c7626782676ee3b`
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

## Current review blockers closed

1. Replaced the manual evidence-file list with deterministic Manifest-derived evidence discovery.
2. Included every frozen entry point, `hasDatabaseRole`, `requireAgentAccess`, executable evidence test, deterministic tool, Vitest configuration, and configured setup/global-setup file in the digest surface.
3. Added hard failure for every missing derived path.
4. Prevented direct credit when a credited entry point is mocked, spied, mutated, or reassigned.
5. Preserved only the exact real-export binding produced by matching `vi.importActual` for C18/C19.
6. Changed test ownership from file-based credit to exact `operationId` ownership, eliminating cross-operation spillover.
7. Added negative fixtures proving entry-point and final-guard bypass patterns are rejected.
8. Added explicit AUTH_BOOTSTRAP database-exception evidence proving `null` return and fail-closed denial.
9. Parsed actual Vitest `setupFiles` and `globalSetup`, including shorthand-property configuration.
10. Re-sealed evidence identity and deterministically reconciled Registry state while preserving every non-EXEC-003 package state.

## Runtime boundary

The earlier remediation corrected inactive-user authorization by requiring:

```text
id = session.userId
tenantId = session.tenantId
isActive = true
```

That correction remains inside the derived evidence surface and continues to pass. The current evidence-gate hardening cycle changed no Runtime file and introduced no Runtime behavior change.

```text
active user + active tenant + allowed role = ALLOW
inactive user = DENY
missing user = DENY
tenant mismatch = DENY
inactive tenant = DENY
disallowed role = DENY
database exception = DENY
```

## Direct evidence result

- `hasDatabaseRole` remains real in eligible operation evidence.
- `requireAgentAccess` remains real in C17.
- Every credited operation invokes its actual frozen entry point.
- C18 and C19 use separate ALLOW and DENY callbacks and bind the real exports through exact `vi.importActual` resolution.
- C14-O02 and C15-O02 reject Bearer-only requests through the original Cookie-only boundary, do not call `requireAuth`, and do not execute mutations.
- An actual C03 entry point proves Legacy allow + Progressive deny = DENY without changing the permanent Assignment Registry.
- Direct credit is owned by exact `operationId`, not by sharing a test file.

## AST gate result

The semantic gate validates registered tests plus actual configured setup/global-setup files and blocks:

```text
entry-point vi.mock
entry-point vi.doMock
entry-point vi.spyOn
entry-point mutation or unauthorized reassignment
final-guard mock / doMock / spy
aliases of vi
untrusted object spreading
indirect mock factories
wrong vi.importActual module paths
mocked intermediary re-exports
same ALLOW and DENY test/callback
cross-operation ownership spillover
random expectations for null-downstream operations
same-file spillover
out-of-freeze credit
missing derived evidence files
stale or PENDING evidence identity
```

The Manifest remains `CANDIDATE_DIRECT_BEHAVIORAL`; the gate alone derives final credit from validated operations.

## Evidence identity

```text
Validated implementation head:
d84a1ea5e10a64778c841f59d8049ec1ae25e522

Evidence digest:
b6cb250d25d2b939f9a153647e809174e23c8d26783a2f7d17cc9e4d526e6652

Algorithm:
sha256-path-length-content-v2-derived-manifest

Derived evidence files:
48

Base SHA:
001b2c853e99ea055f161dcd294d968bbf25c9ad

Checkout mode:
PR_MERGE_REF
```

The identity file is outside its own digest to avoid a circular reference. Documentation, identity, and Registry records may follow the validated implementation head without altering the sealed executable digest.

## Corrected strict accounting

```text
Starting strict direct credit: 3/25 contracts
Starting strict direct operations: 3/32 operations
Starting remaining gap: 56

Final directly tested contracts: 25/25
Final directly tested operations: 32/32
Full direct behavioral credit: 25 contracts / 32 operations
Partial contract-entry tests: 0
Structural-only frozen contracts: 0
Out-of-scope contracts credited: 0
Same-file spillover: 0
Cross-operation spillover: 0

Test gap: 59 → 34
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

## Current hardening-cycle scope result

```text
Runtime security defects introduced or fixed: 0
Runtime files changed: 0
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

EXEC-003 remains `IN_EXECUTION / AWAITING INDEPENDENT RE-REVIEW`. PR #108 remains Draft/Open/Unmerged. Central merge, main, Production, Vercel, and EXEC-004 remain untouched.

Next authorized step: `INDEPENDENT RE-REVIEW ONLY`.
