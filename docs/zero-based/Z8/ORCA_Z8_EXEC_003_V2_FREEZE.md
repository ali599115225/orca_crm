# ORCA Z8 — EXEC-003 v2 Frozen Execution Contract

- **State:** `IN_EXECUTION / AWAITING INDEPENDENT RE-REVIEW`
- **PR:** `#108 / DRAFT / OPEN / UNMERGED`
- **Branch:** `work/orca-gexec-003-v2-shared-guard-20260725`
- **Base:** `work/orca-zero-based-execution-20260721`
- **Validated implementation head:** `d17acb09354a54aee7946b6de8e67a2a9b55fbd5`
- **Evidence digest:** `1c65e04339c20ccf1d094620a741862f97e7f033388324843006265109dfc5af`
- **Algorithm:** `sha256-path-length-content-v3-derived-security-dependencies`
- **Derived evidence files:** `49`
- **Security dependency:** `app/actions/aiActions.ts`
- **Base SHA:** `001b2c853e99ea055f161dcd294d968bbf25c9ad`
- **Checkout:** `PR_MERGE_REF`

## Invariant

```text
NEW RBAC MUST NOT EXPAND LEGACY ACCESS
effectiveAllow = legacyRoleAllows AND progressivePermissionAllows
unknown permission = DENY
missing permission = DENY
inactive user = DENY
database exception = DENY
```

## Frozen scope

The package remains frozen at **25 contracts and 32 operations**. Permission Keys, Legacy roles, authentication channels, tenant boundaries, signed boundaries, exact-claim boundaries, and Cookie-only boundaries are unchanged. C25 retains no Platform Owner bypass.

C17 remains a delegated boundary. Its frozen entry point is `generateAIInsight`; its explicit security dependency is `app/actions/aiActions.ts`; its final guard is the real `requireAgentAccess`.

## Evidence rule

Direct credit requires an actual entry-point invocation, separate ALLOW and DENY callbacks owned by the exact operation, the real final guard, explicit outcome proof, downstream suppression on DENY, and zero same-file/cross-operation spillover.

The repository-bound digest covers every frozen entry point, declared security dependency, final/delegated guard, security core file, evidence test, deterministic tool, Vitest configuration, and configured setup/global-setup file. Omission or mutation fails closed.

## Accounting and scope

```text
Direct contracts: 25/25
Direct operations: 32/32
G5 executable tests: 200/200
G5 suites: 47/47
Remaining gap: 34
P0/P1 remaining: 0
Runtime files changed in this closure: 0
Runtime security defects remaining: 0
Prisma/Migration/Backfill changes: 0
Production/Provider/Environment/UI changes: 0
Permission/Legacy role/auth-channel expansion: 0
EXEC-004 work: 0
main changes: 0
Production changes: 0
Vercel Preview: NOT REQUIRED
```

This freeze does not authorize Ready for Review, Merge, main, Production, Vercel Preview, or EXEC-004. Next authorized step: `INDEPENDENT FINAL RE-REVIEW ONLY`.