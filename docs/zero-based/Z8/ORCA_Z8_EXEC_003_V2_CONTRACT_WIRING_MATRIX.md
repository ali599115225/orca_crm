# ORCA Z8 — EXEC-003 v2 Contract Wiring Matrix

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


## Classification

| Evidence | Class | Direct credit |
|---|---|---|
| Contract wiring test | `STRUCTURAL / SOURCE_ASSERTION` | No |
| Shared/Cookie guard tests | `UNIT_BEHAVIOR` | No |
| Registered entry-point tests | `DIRECT_BEHAVIORAL` | Yes, through semantic gate |
| Ledger gate | `INTEGRATION / REGRESSION` | Enforces credit |

## Wiring result

Eligible contracts invoke the actual Route Handler or Server Action and retain the real `hasDatabaseRole` decision. Lower-layer mocks are limited to session retrieval, `authBootstrapFindUserRole`, `authBootstrapFindTenantActive`, Tenant Context, downstream database/domain operations, and external systems.

C17 retains the real `requireAgentAccess`; only session retrieval, tenant-scoped user lookup, Tenant Context, and the AI provider are mocked.

Original boundaries remain:

- C02/C09: signed HMAC.
- C17: delegated database RBAC.
- C18/C19: exact Legacy `Admin`; `ADMIN` denied.

The TypeScript AST gate verifies exact entry-point module/export, ALLOW/DENY invocation, downstream called/not-called assertions, Assignment Registry Permission Key/boundary/Legacy roles, forbidden final-guard mocks, no out-of-freeze credit, and no same-file spillover.

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

EXEC-003 remains `IN_EXECUTION / AWAITING INDEPENDENT RE-REVIEW`. Next authorized step: `INDEPENDENT RE-REVIEW ONLY`.
