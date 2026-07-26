# ORCA Z8 — EXEC-003 v2 Semantic Behavioral Evidence Ledger

- **Package state:** `CLOSED`
- **Implementation PR:** `#108 / MERGED`
- **Implementation final head:** `abc43ab5e1a76b5f2d99f5deb0f5d1e35451a618`
- **Central merge SHA:** `b0369b50eb2d49001e5322eea90b3b6dae22a882`
- **Validated implementation head:** `d17acb09354a54aee7946b6de8e67a2a9b55fbd5`
- **Independent final review:** `PASS — READY_FOR_OWNER_PACKAGE_CLOSURE`
- **ORCA CI:** `#453 / SUCCESS`
- **Evidence digest:** `1c65e04339c20ccf1d094620a741862f97e7f033388324843006265109dfc5af`
- **Algorithm:** `sha256-path-length-content-v3-derived-security-dependencies`
- **Derived files:** `49`
- **Explicit security dependency:** `app/actions/aiActions.ts`

## Identity semantics

The `state` field in the sealed Evidence Identity remains the historical evidence-capture state used by the independent review. Package lifecycle closure is recorded separately as `packageClosureState: CLOSED` with PR, merge, CI and review metadata. This preserves the reviewed evidence snapshot while making the package lifecycle unambiguous.

## Sources of truth

Direct credit is derived from the frozen operation Manifest only after the TypeScript AST gate validates the exact operation's entry point, ALLOW test, DENY test, final guard, outcome assertion and downstream behavior. Manifest membership alone grants no credit.

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
8. zero same-file, cross-operation or out-of-freeze spillover.

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
Runtime defects remaining: 0
```

## Closure reconciliation scope

The closure reconciliation changes only registry, evidence-control tests/tools and closure documentation. It changes no Runtime file and introduces no Runtime behavior change. No Prisma schema, Migration, Backfill, Production data, provider credential, environment, UI, Permission Key, Legacy role, authentication channel, `main`, Production, Vercel Preview or EXEC-004 work is authorized or performed.
