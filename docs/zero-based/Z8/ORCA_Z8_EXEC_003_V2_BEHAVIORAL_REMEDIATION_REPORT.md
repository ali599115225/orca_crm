# ORCA Z8 — EXEC-003 v2 Controlled Security Remediation Report

- **Mode:** `CONTROLLED SECURITY REMEDIATION`
- **Source head:** `aad03d74bb1003c6a979813c3c7626782676ee3b`
- **Package:** `EXEC-003 v2`
- **State:** `IN_EXECUTION / AWAITING INDEPENDENT RE-REVIEW`
- **PR:** `#108 / DRAFT / OPEN / UNMERGED`
- **Branch:** `work/orca-gexec-003-v2-shared-guard-20260725`
- **Base:** `work/orca-zero-based-execution-20260721`
- **Validated implementation head:** `f87213676c735c11782751a74435d8d752027b2c`
- **Evidence digest:** `88481115ceceae02964061356f76e30c6252456f89ff06e94cf6fd54553a140f`
- **Validated base SHA:** `001b2c853e99ea055f161dcd294d968bbf25c9ad`
- **Checkout mode:** `PR_MERGE_REF`

## Reviewed blockers closed

1. Fixed the material inactive-user Runtime defect by adding `isActive: true` to `authBootstrapFindUserRole`.
2. Added actual-entry-point inactive-user proofs across bearer-capable routes, Cookie-only routes, Server Actions, reads, mutations, and sensitive reads.
3. Split C18 and C19 into independent ALLOW and DENY tests.
4. Added independent Bearer-only denial evidence for C14-O02 and C15-O02.
5. Strengthened the TypeScript AST gate against final-guard replacement and false-positive expectations.
6. Added repository-bound evidence identity covering all executable remediation and reconciliation tooling.
7. Corrected the strict counter only after semantic, identity, and Registry gates passed.

## Runtime security fix

Before correction, `authBootstrapFindUserRole` accepted a user matching only `id` and `tenantId`. The corrected boundary requires:

```text
id = session.userId
tenantId = session.tenantId
isActive = true
```

```text
active user + active tenant + allowed role = ALLOW
inactive user = DENY
missing user = DENY
tenant mismatch = DENY
inactive tenant = DENY
disallowed role = DENY
```

The fix is limited to one Runtime file. No schema, migration, backfill, data, Permission Key, Legacy role, authentication channel, tenant-isolation rule, or bypass changed.

## Direct evidence corrections

- `hasDatabaseRole` remains real in eligible operation evidence.
- `requireAgentAccess` remains real in C17.
- C18 and C19 use separate ALLOW and DENY callbacks.
- C14-O02 and C15-O02 reject Bearer-only requests through the original Cookie-only boundary, do not call `requireAuth`, and do not execute mutations.
- An actual C03 entry point proves Legacy allow + Progressive deny = DENY without changing the permanent Assignment Registry.

## AST gate result

The semantic gate validates registered tests and configured setup files and blocks:

```text
vi.mock
vi.doMock
vi.spyOn
aliases of vi
untrusted object spreading
indirect mock factories
wrong vi.importActual module paths
mocked intermediary re-exports
same ALLOW and DENY test/callback
random expectations for null-downstream operations
same-file spillover
out-of-freeze credit
```

The Manifest uses `CANDIDATE_DIRECT_BEHAVIORAL`; the Gate alone derives final credit from validated operations.

## Evidence identity

```text
Validated implementation head:
f87213676c735c11782751a74435d8d752027b2c

Evidence digest:
88481115ceceae02964061356f76e30c6252456f89ff06e94cf6fd54553a140f

Algorithm:
sha256-path-length-content-v1

Base SHA:
001b2c853e99ea055f161dcd294d968bbf25c9ad

Checkout mode:
PR_MERGE_REF
```

The identity file is outside its own digest, avoiding a circular reference. Every executable change, including Registry reconciliation tooling, is inside the digest. Later changes after the validated implementation head are identity, Registry and documentation records only.

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

## Scope result

```text
Runtime security defects found: 1
Runtime fixes applied: 1
Runtime files changed in this remediation: 1
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
