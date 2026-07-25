# ORCA Z8 — EXEC-003 v2 Semantic Behavioral Evidence Ledger

- **State:** `IN_EXECUTION / AWAITING INDEPENDENT RE-REVIEW`
- **PR:** `#108 / DRAFT / OPEN / UNMERGED`
- **Validated implementation head:** `d17acb09354a54aee7946b6de8e67a2a9b55fbd5`
- **Evidence digest:** `1c65e04339c20ccf1d094620a741862f97e7f033388324843006265109dfc5af`
- **Algorithm:** `sha256-path-length-content-v3-derived-security-dependencies`
- **Derived files:** `49`
- **Explicit security dependency:** `app/actions/aiActions.ts`

## Sources of truth

Direct credit is derived from the frozen operation Manifest only after the TypeScript AST gate validates the exact operation's entry point, ALLOW test, DENY test, final guard, outcome assertion, and downstream behavior. Manifest membership alone grants no credit.

For C17, the Manifest retains `@/app/actions/aiClient` / `generateAIInsight` and declares `@/app/actions/aiActions` as an additional security dependency. The identity gate verifies both the entry point and the deeper authorization-bearing module.

## Required proof

Each credited operation has:

1. a stable method/route/Permission Key/boundary fingerprint;
2. separate ALLOW and DENY callbacks owned by the exact operation;
3. actual entry-point invocation;
4. no credited entry-point or final-guard replacement;
5. the real final authorization decision;
6. explicit ALLOW and DENY outcome evidence;
7. downstream reachability only after ALLOW;
8. zero same-file, cross-operation, or out-of-freeze spillover.

C17 additionally proves:

```text
aiClient → analyzeLeadAI
aiActions → await requireAgentAccess
requireAgentAccess success → generateAgentJson
requireAgentAccess denial → provider not called
```

## Repository-bound identity

```text
Validated implementation head: d17acb09354a54aee7946b6de8e67a2a9b55fbd5
Evidence digest: 1c65e04339c20ccf1d094620a741862f97e7f033388324843006265109dfc5af
Digest algorithm: sha256-path-length-content-v3-derived-security-dependencies
Derived evidence files: 49
Security dependency files: app/actions/aiActions.ts
Base SHA: 001b2c853e99ea055f161dcd294d968bbf25c9ad
Checkout mode: PR_MERGE_REF
```

## Accounting

```text
Direct contracts: 25/25
Direct operations: 32/32
G5 executable tests: 200/200
G5 suites: 47/47
Partial contract-entry tests: 0
Structural-only frozen contracts: 0
Out-of-scope contracts credited: 0
Operation-level spillover: 0
Remaining gap: 34
P0/P1 remaining: 0
```

## Scope

The C17 evidence-dependency closure changed no Runtime file and introduced no Runtime behavior change. No Prisma schema, Migration, Backfill, Production data, provider credential, environment, UI, Permission Key, Legacy role, authentication channel, main, Production, or EXEC-004 change is authorized or performed.

Next authorized step: `INDEPENDENT FINAL RE-REVIEW ONLY`.