# ORCA Z8 — EXEC-003 v2 Behavioral Evidence Remediation Report

- **Mode:** `CONTROLLED EVIDENCE REMEDIATION`
- **Source head:** `a087cdce47648656466bea90c3b19d6c302cf07f`

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


## Remediation completed

1. C17 now invokes `generateAIInsight` through the real `requireAgentAccess`.
2. Eligible contract tests keep the real `hasDatabaseRole`; only AUTH_BOOTSTRAP persistence boundaries and downstream systems are mocked.
3. A typed 25-contract/32-operation manifest was added.
4. The Ledger gate now uses TypeScript AST, not `testSource.includes(testName)`.
5. Stale evidence identities were removed.
6. Same-file spillover was detected during CI and corrected without Runtime changes.

## Security cases

```text
Missing session: DENY
Missing user: DENY
Inactive user: DENY in C17
Inactive tenant: DENY
Tenant mismatch: DENY
Disallowed role: DENY
Unknown role: DENY
Legacy allow + Progressive allow: ALLOW
Legacy deny + Progressive allow: DENY
Legacy allow + Progressive deny: DENY
Unknown permission: DENY
Missing permission: DENY
Downstream on DENY: NOT EXECUTED
Downstream after ALLOW: EXECUTED
Cookie-only: PRESERVED
Platform Owner bypass: ABSENT
```

The database AUTH_BOOTSTRAP role lookup does not expose a distinct inactive-user field; the remediation did not invent one. C17 proves inactive-user denial through the real delegated query.

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

## Runtime and scope result

```text
Runtime defects found: 0
Runtime fixes applied: 0
```

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

EXEC-003 remains `IN_EXECUTION / AWAITING INDEPENDENT RE-REVIEW`. PR #108 remains Draft/Open/Unmerged. Central merge, main, Production, Vercel, and EXEC-004 remain untouched.

Next authorized step: `INDEPENDENT RE-REVIEW ONLY`.
