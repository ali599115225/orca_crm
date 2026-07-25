# ORCA Z8 — EXEC-003 v2 Controlled Security Remediation Report

- **Mode:** `CONTROLLED SECURITY REMEDIATION`
- **Source head:** `aad03d74bb1003c6a979813c3c7626782676ee3b`
- **Package:** `EXEC-003 v2`
- **State:** `IN_EXECUTION / AWAITING INDEPENDENT RE-REVIEW`
- **PR:** `#108 / DRAFT / OPEN / UNMERGED`
- **Branch:** `work/orca-gexec-003-v2-shared-guard-20260725`
- **Base:** `work/orca-zero-based-execution-20260721`
- **Validated implementation head:** `15230ab21553b0d7992d9c66963d126c6aa16367`
- **Evidence digest:** `a9f68b74bf6dc739b3afabaa9cfa59466c345e4757fb3533d664033016a4fe75`
- **Validated base SHA:** `001b2c853e99ea055f161dcd294d968bbf25c9ad`
- **Checkout mode:** `PR_MERGE_REF`

## Reviewed blockers closed

1. Fixed the material inactive-user Runtime defect by adding `isActive: true` to `authBootstrapFindUserRole`.
2. Added actual-entry-point inactive-user proofs across bearer-capable routes, Cookie-only routes, Server Actions, reads, mutations, and sensitive reads.
3. Split C18 and C19 into independent ALLOW and DENY tests.
4. Added independent Bearer-only denial evidence for C14-O02 and C15-O02.
5. Strengthened the TypeScript AST gate against final-guard replacement and false-positive expectations.
6. Added a repository-bound evidence identity based on a deterministic content digest.
7. Corrected the strict counter only after semantic and identity gates passed.

## Runtime security fix

Before correction, `authBootstrapFindUserRole` accepted a user matching only `id` and `tenantId`. The corrected boundary requires:

```text
id = session.userId
tenantId = session.tenantId
isActive = true
```

Result:

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
- C18: exact `Admin` ALLOW and normalized `ADMIN` DENY are separate callbacks.
- C19: exact `Admin` reaches the logger; normalized `ADMIN` is denied before the logger, in separate callbacks.
- C14-O02 and C15-O02 reject Bearer-only requests with the original Cookie-only boundary, do not call `requireAuth`, and do not execute their mutations.
- An actual C03 entry point proves Legacy allow + Progressive deny = DENY without changing the permanent Assignment Registry.

## AST gate result

The semantic gate validates registered tests and configured setup files. It blocks:

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
15230ab21553b0d7992d9c66963d126c6aa16367

Evidence digest:
a9f68b74bf6dc739b3afabaa9cfa59466c345e4757fb3533d664033016a4fe75

Algorithm:
sha256-path-length-content-v1

Base SHA:
001b2c853e99ea055f161dcd294d968bbf25c9ad

Checkout mode:
PR_MERGE_REF
```

The identity file is outside its own digest, avoiding a circular reference. CI proves that later documentation-only heads retain the exact evidence digest.

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
