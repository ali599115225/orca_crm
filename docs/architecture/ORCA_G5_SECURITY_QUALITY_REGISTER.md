# ORCA G5 Security & Quality Register

## EXEC-003 v2 — Final C17 evidence-dependency closure

- **State:** `IN_EXECUTION / AWAITING INDEPENDENT RE-REVIEW`
- **PR:** `#108 / DRAFT / OPEN / UNMERGED`
- **Branch:** `work/orca-gexec-003-v2-shared-guard-20260725`
- **Base:** `work/orca-zero-based-execution-20260721`
- **Validated implementation head:** `d17acb09354a54aee7946b6de8e67a2a9b55fbd5`
- **Evidence digest:** `1c65e04339c20ccf1d094620a741862f97e7f033388324843006265109dfc5af`
- **Digest algorithm:** `sha256-path-length-content-v3-derived-security-dependencies`
- **Derived evidence files:** `49`
- **Security dependency files:** `app/actions/aiActions.ts`
- **Base SHA:** `001b2c853e99ea055f161dcd294d968bbf25c9ad`
- **Checkout mode:** `PR_MERGE_REF`

## Security result

The Manifest keeps C17's credited entry point at `@/app/actions/aiClient` / `generateAIInsight` and explicitly registers `@/app/actions/aiActions` as a security dependency. The digest fails closed on a missing, unreadable, duplicated, omitted, outside-repository, or content-mutated dependency.

The TypeScript AST gate proves:

```text
aiClient imports and invokes analyzeLeadAI
aiActions imports requireAgentAccess
analyzeLeadAI awaits requireAgentAccess
generateAgentJson executes only after authorization succeeds
DENY suppresses the provider
```

The real `requireAgentAccess` remains the delegated final guard. No C17 Runtime file was modified.

## Direct evidence accounting

```text
Frozen contracts: 25
Frozen operations: 32
Directly tested contracts: 25/25
Directly tested operations: 32/32
Full direct behavioral credit: 25 contracts / 32 operations
Partial contract-entry tests: 0
Structural-only frozen contracts: 0
Out-of-scope contracts credited: 0
Operation-level spillover: 0
Remaining gap: 34
```

Contracts without a direct current test reference: **34**

EXEC-003 v2 direct evidence: **25 contracts**

| Priority class | Contracts without direct current test evidence |
|---|---:|
| `P0_SECURITY_CRITICAL_SURFACE` | 0 |
| `P1_MUTATION_SURFACE` | 0 |
| `P1_SENSITIVE_READ_SURFACE` | 0 |
| `P2_READ_SURFACE` | 16 |
| `P3_UI_SURFACE` | 16 |
| `P4_SOURCE_STATE` | 2 |

The priority rows reconcile exactly: `0 + 0 + 0 + 16 + 16 + 2 = 34`.

## Durable dependency risk register

| Dependency / control | Classification | Current handling |
|---|---|---|
| Static low-severity findings | `ACCEPTED_LOW_STATIC` | Retained under the production-audit threshold and CI gate. |
| `brace-expansion` | Reviewed override | Registered with ownership and removal trigger. |
| `postcss` | Reviewed override | Covered by deterministic install and production audit. |

## Validation contract

```text
G5 executable tests: 200/200
G5 suites: 47/47
TypeScript: PASS
Production gate: PASS
Production dependency audit: PASS
G5/G6/G7/G8: PASS required
Foundation and Sentinel regressions: PASS required
P2 acceptance: PASS required
Build: PASS required
Isolated recovery drill: PASS required
Evidence identity and Registry reconciliation: PASS required
```

## Scope

```text
Runtime files changed in this closure: 0
Runtime security defects remaining: 0
Prisma schema changes: 0
Migrations: 0
Backfills: 0
Production data changes: 0
Provider or credential changes: 0
Environment changes: 0
UI changes: 0
Permission key or Legacy role changes: 0
Authentication channel expansion: 0
New privilege grants: 0
EXEC-004 work: 0
main changes: 0
Production changes: 0
Vercel Preview: NOT REQUIRED
```

EXEC-003 remains `IN_EXECUTION / AWAITING INDEPENDENT RE-REVIEW`. The next authorized step is `INDEPENDENT FINAL RE-REVIEW ONLY`.
