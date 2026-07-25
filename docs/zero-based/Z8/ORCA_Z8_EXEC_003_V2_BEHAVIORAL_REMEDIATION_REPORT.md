# ORCA Z8 — EXEC-003 v2 Controlled Security Remediation Report

- **Mode:** `FINAL C17 EVIDENCE-DEPENDENCY CLOSURE`
- **Original failed head:** `aad03d74bb1003c6a979813c3c7626782676ee3b`
- **State:** `IN_EXECUTION / AWAITING INDEPENDENT RE-REVIEW`
- **PR:** `#108 / DRAFT / OPEN / UNMERGED`
- **Branch:** `work/orca-gexec-003-v2-shared-guard-20260725`
- **Base:** `work/orca-zero-based-execution-20260721`
- **Validated implementation head:** `d17acb09354a54aee7946b6de8e67a2a9b55fbd5`
- **Evidence digest:** `1c65e04339c20ccf1d094620a741862f97e7f033388324843006265109dfc5af`
- **Algorithm:** `sha256-path-length-content-v3-derived-security-dependencies`
- **Derived evidence files:** `49`

## Closure delivered

1. Added optional `securityDependencyModules` metadata to the behavior Manifest.
2. Registered `@/app/actions/aiActions` for C17 without changing the credited `generateAIInsight` entry point.
3. Derived security dependencies into both `securityDependencyFiles` and the final digest surface.
4. Added fail-closed checks for missing, unreadable, duplicate, outside-repository, or omitted dependencies.
5. Added a content-mutation test proving that changing `aiActions.ts` changes the digest.
6. Added TypeScript AST proof for `aiClient → analyzeLeadAI → await requireAgentAccess → generateAgentJson`.
7. Preserved provider suppression on every DENY path.
8. Re-sealed Evidence Identity v3 and deterministically reconciled the EXEC-003 Registry record while preserving all other package states.

## Runtime boundary

```text
Runtime security defects remaining: 0
Runtime files changed in this closure: 0
Runtime behavior changes in this closure: 0
Prisma schema changes: 0
Migrations: 0
Backfills: 0
Production data changes: 0
Provider/credential changes: 0
Environment changes: 0
UI changes: 0
Permission Key changes: 0
Legacy role changes: 0
Authentication channel expansion: 0
New privilege grants: 0
EXEC-004 work: 0
main changes: 0
Production changes: 0
Vercel Preview: NOT REQUIRED
```

## Evidence result

```text
Frozen contracts: 25
Frozen operations: 32
Direct contracts: 25/25
Direct operations: 32/32
G5 executable tests: 200/200
G5 suites: 47/47
Partial/structural-only/out-of-scope credit: 0
Operation-level spillover: 0
Remaining test gap: 34
P0 remaining: 0
P1 mutation remaining: 0
P1 sensitive read remaining: 0
```

## Authorization state

This remediation does not authorize Ready for Review, Merge, main, Production, Vercel, or EXEC-004. PR #108 remains Draft/Open/Unmerged. The next authorized step is `INDEPENDENT FINAL RE-REVIEW ONLY`.