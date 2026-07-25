# ORCA Z8 — EXEC-003 v2 Frozen Execution Contract

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


## Binding invariant

```text
NEW RBAC MUST NOT EXPAND LEGACY ACCESS
effectiveAllow = legacyRoleAllows AND progressivePermissionAllows
unknown permission = DENY
missing permission = DENY
```

## Frozen scope

The frozen package contains 25 contracts and 32 operations:

```text
C01 finance request
C02 revenue signed webhook
C03 contract cancel
C04 contract invoices GET/POST
C05 payment plan GET/PUT/POST
C06 restructure
C07 sign
C08 Paylink create
C09 leads signed webhook
C10 lease invoice
C11 webhook settings GET/POST
C12 journal entry GET/POST
C13 accounting seed
C14 workflows GET/POST
C15 maintenance GET/POST
C16 maintenance PATCH
C17 generateAIInsight
C18 clearSystemLogsAction
C19 triggerMockErrorAction
C20 payables
C21 contract PDF
C22 Paylink status
C23 invoice PDF
C24 invoice QR
C25 getRentalContractsAction
```

Eligible: 20 contracts / 27 operations. Original excluded boundaries: C02 and C09 `SIGNED_BOUNDARY`; C17 `DELEGATED_DATABASE_RBAC`; C18 and C19 `SESSION_CLAIM_EXACT`.

Cookie-only contracts stay Cookie-only. C25 has no Platform Owner bypass. Permission Keys remain static typed literals. Legacy role sets are unchanged.

## Direct evidence rule

Structural wiring and guard unit tests do not earn direct credit. Direct credit requires an actual entry-point invocation, executable ALLOW and DENY cases, the real final guard, downstream non-execution on DENY, downstream reachability on ALLOW, exact Assignment Registry metadata, and no same-file spillover.

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

This freeze does not authorize closure, Ready for Review, Merge, main, Production, Vercel Preview, or EXEC-004. Next authorized step: `INDEPENDENT RE-REVIEW ONLY`.
