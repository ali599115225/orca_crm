# ORCA G5 Security & Quality Register

## EXEC-003 v2

- **Package:** `EXEC-003 v2`
- **State:** `IN_EXECUTION / AWAITING INDEPENDENT RE-REVIEW`
- **PR:** `#108 / DRAFT / OPEN / UNMERGED`
- **Branch:** `work/orca-gexec-003-v2-shared-guard-20260725`
- **Base:** `work/orca-zero-based-execution-20260721`
- **Validated evidence head:** `4db5e74b596eba18334e9cd10712da60d4118d4e`
- **Validated base SHA:** `001b2c853e99ea055f161dcd294d968bbf25c9ad`
- **ORCA CI:** `#385 / SUCCESS`
- **Checkout mode:** `PR_MERGE_REF`
- **Synthetic merge SHA:** `ad0cdad8098256332d17e046079cad9387479cf2`

CI validated the synthetic PR merge commit containing the validated evidence head SHA against the PR base. Checkout used `refs/pull/108/merge`; it did not check out the head commit directly.

The final documentation head and its CI identity are recorded in PR #108 after this documentation commit passes CI, avoiding an impossible self-referential SHA.


## Semantic evidence

- Typed manifest: `tests/foundation/g5-exec-003-behavior-evidence-manifest.ts`
- Semantic gate: `tests/foundation/g5-exec-003-evidence-ledger.test.ts`
- Assignment Registry: `lib/auth/exec-003-permission-assignments.ts`

The semantic gate uses the TypeScript Compiler API to verify executable ALLOW and DENY tests, actual entry-point imports and invocations, downstream reachability and non-execution, exact Permission Keys and Legacy role sets, forbidden final-guard mocks, frozen-scope membership, and no same-file spillover. Markdown never calculates credit.

Eligible contracts retain the actual chain:

```text
Route Handler or Server Action
→ EXEC-003 guard
→ Legacy/progressive role intersection
→ real hasDatabaseRole
→ authBootstrapFindUserRole
→ authBootstrapFindTenantActive
→ downstream operation
```

C17 invokes `generateAIInsight` with the real `requireAgentAccess`. It proves missing session, missing user, inactive user, tenant mismatch, disallowed role, ALLOW, and provider non-execution/execution ordering.

Original boundaries remain unchanged: C02/C09 signed HMAC, C17 delegated RBAC, C18/C19 exact Legacy `Admin`.

## Derived accounting

```text
Frozen contracts: 25/25
Frozen operations: 32/32
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

## Validation

```text
G5 executable tests: 157/157 PASS
G5 suites: 36/36 PASS
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
```

## Scope

```text
Runtime files changed in this remediation: 0
Prisma changes: 0
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
