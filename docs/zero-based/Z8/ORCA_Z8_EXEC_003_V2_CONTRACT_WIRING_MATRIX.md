# ORCA Z8 — EXEC-003 v2 Contract Wiring Matrix

- **State:** `IN_EXECUTION / AWAITING INDEPENDENT RE-REVIEW`
- **PR:** `#108 / DRAFT / OPEN / UNMERGED`
- **Validated implementation head:** `d17acb09354a54aee7946b6de8e67a2a9b55fbd5`
- **Evidence digest:** `1c65e04339c20ccf1d094620a741862f97e7f033388324843006265109dfc5af`
- **Algorithm:** `sha256-path-length-content-v3-derived-security-dependencies`
- **Evidence files:** `49`

## Classification

| Evidence | Class | Direct credit |
|---|---|---|
| Wiring/source tests | `STRUCTURAL / SOURCE_ASSERTION` | No |
| Manifest row | `CANDIDATE_DIRECT_BEHAVIORAL` | No |
| Semantically validated entry-point ALLOW/DENY | `DIRECT_BEHAVIORAL` | Yes |
| Identity digest | `REPOSITORY_BOUND_INTEGRITY` | Binds the executable surface |
| Registry reconciliation | `PACKAGE_STATE_INTEGRITY` | Preserves package state |

## C17 chain

```text
generateAIInsight — app/actions/aiClient.ts
  → analyzeLeadAI — app/actions/aiActions.ts
  → await requireAgentAccess — lib/agents/access.ts
  → generateAgentJson — provider boundary
```

The AST gate proves the import and invocation chain and enforces that provider execution follows the awaited authorization decision. `app/actions/aiActions.ts` is declared in `securityDependencyModules`, appears in `securityDependencyFiles` and `derivedEvidenceFiles`, and changes the digest when mutated.

## Blocker coverage

| Control | Result |
|---|---|
| Missing/unreadable/omitted security dependency | Fail closed |
| Security dependency content mutation | Digest changes |
| Entry-point mock/spy/mutation/reassignment | Rejected |
| Final-guard mock/spy/indirect replacement | Rejected |
| AUTH_BOOTSTRAP exception | `null` / DENY |
| C17 provider before authorization | Rejected by AST ordering proof |
| C18/C19 exact-claim ALLOW and DENY | Independent callbacks |
| C14-O02/C15-O02 Bearer-only access | DENY; Cookie-only preserved |
| C03 Legacy allow + Progressive deny | DENY |
| Operation ownership spillover | `0` |
| EXEC-004 state | `OWNER_DECISION_PENDING / UNTOUCHED` |

## Accounting

```text
Contracts: 25/25 direct
Operations: 32/32 direct
G5 tests: 200/200
G5 suites: 47/47
Partial/structural-only/out-of-scope credit: 0
Remaining P0/P1 gap: 0
Runtime files changed in this closure: 0
```

EXEC-003 remains `IN_EXECUTION / AWAITING INDEPENDENT RE-REVIEW`. Next authorized step: `INDEPENDENT FINAL RE-REVIEW ONLY`.