# ORCA Z8 — Prioritized Execution Roadmap

- **Document ID:** ORCA-Z8-ROADMAP-001
- **Version:** 1.5
- **Date:** 2026-07-26
- **Status:** `ACTIVE / EXEC-001 THROUGH EXEC-006 CLOSED / NO PACKAGE IN EXECUTION`
- **Current central baseline after EXEC-006 implementation:** `6d0f25d771ff8685d3569d5fd90aa6f5f765c9c4`

## 1. Sequencing rule

The roadmap orders work by risk reduction and prerequisite value, not by page visibility. A later wave cannot begin merely because its code is convenient; its package preconditions and mutable-boundary conflicts must be closed.

Closing one package does not authorize the next package. Owner/domain decisions, an exact base SHA, a frozen allowlist and package-specific acceptance remain mandatory before a new implementation branch starts.

## 2. Wave 0 — controlled execution

| Order | Package | Status | Purpose | Vercel validation |
|---|---|---|---|---|
| 1 | EXEC-001 | `CLOSED` via PR #104 | publish the verified dependency-security issue form | `NOT_REQUIRED` |
| 2 | EXEC-002 | `CLOSED` via PR #106 | add blocking governance lint, override ownership and artifact-retention controls | `SKIP_BY_DEFAULT` |
| 3 | EXEC-003 | `CLOSED` via PR #108 | close direct P0/P1 security, authority, webhook and cron evidence | `SKIP_BY_DEFAULT` |

EXEC-003 owns its sealed shared-security evidence and contract registries. Later packages may consume those boundaries but may not silently alter their evidence identity or expand legacy access.

## 3. Wave 1 — owner/domain decisions first

| Order | Package | Status / blocking decisions | Vercel validation |
|---|---|---|---|
| 4 | EXEC-004 | `CLOSED` via PR #128 — company structure, branches/departments/teams/personas and scoped authority approved and implemented | `SKIP_BY_DEFAULT`; exact-head CI and Build proved the non-visual Runtime contract |
| 5 | EXEC-005 | `CLOSED` via PR #132 — Party identity, Lead/Opportunity lifecycle, duplicate review, merge/reversal, consent and retention foundation | `SKIP_BY_DEFAULT`; exact-head CI, Build and disposable migration validation proved the non-visual contract |
| 6 | EXEC-006 | `CLOSED` via PR #135 — authoritative Unit availability, exclusive Hold/Reservation, atomic conversion/expiry, exact persisted scope and conflict-safe Tour scheduling | `SKIP_BY_DEFAULT`; exact-head ORCA CI, Build and disposable PostgreSQL race/scope validation proved the non-visual contract |
| 7 | EXEC-007 | `OWNER_DECISION_PENDING / NOT STARTED` — offer approval/pricing limits and acceptance semantics | `REQUIRED_AT_PACKAGE_END` only when operational Preview evidence is necessary |
| 8 | EXEC-008 | `OWNER_DECISION_PENDING` — templates/signatories, financial precision/correction, refund and evidence authority | `REQUIRED_AT_PACKAGE_END` only when operational Preview evidence is necessary |

EXEC-004 now provides the approved organization and authority foundation. It does not automatically wire every existing business record to a branch or execute the prepared additive migration. Any later package that consumes branch scope must freeze its exact resource mapping, migration/data authorization and denial evidence independently.

EXEC-006 is closed. It does not authorize EXEC-007, execute prepared migrations against Production/customer data, or claim legacy UI/API paths are migrated. EXEC-007 remains owner-decision gated and not started.

## 4. Wave 2 — operational truth and protected data

| Order | Package | Status / dependency | Vercel validation |
|---|---|---|---|
| 9 | EXEC-009 | `OWNER_DECISION_PENDING` — approved workflow/communication policy; provider activation remains off | `REQUIRED_AT_PACKAGE_END` only when operational Preview evidence is necessary |
| 10 | EXEC-010 | `OWNER_DECISION_PENDING` — privacy/retention/KPI/export policy and document-boundary design | `REQUIRED_AT_PACKAGE_END` only when operational Preview evidence is necessary |
| 11 | EXEC-011 | `OWNER_DECISION_PENDING` — one owner-approved visual reference per page/tab/overlay after its functional contract stabilizes | `REQUIRED_AT_PACKAGE_END` for the completed visual surface only |

Visual implementation follows the functional package for the same surface. One page or one tab is the maximum visual contract unit; unapproved adjacent surfaces remain untouched. One Preview is allowed only after the entire selected surface contract is complete, tested, built and frozen on a stable SHA.

## 5. Wave 3 — externally gated and release evidence

| Order | Package | Status | Trigger | Vercel validation |
|---|---|---|---|---|
| 12 | EXEC-012 | `BLOCKED` | company provider accounts/contracts/locations/budget, AI policy, licenses and official authority | `REQUIRED_AT_PACKAGE_END`; Production remains separate |
| 13 | EXEC-013 | `BLOCKED` | approved isolated environments, test identities/fixtures, recovery targets, UAT and handover authority | `REQUIRED_AT_PACKAGE_END` |
| 14 | EXEC-014 | `BLOCKED` | all Release-1 P0/P1 outcomes accepted plus exact single-use `main` and Production decisions | final RC=`REQUIRED_AT_FINAL_RELEASE`; Production=`SEPARATE_PRODUCTION_AUTHORIZATION` |

## 6. Critical path

```text
EXEC-001 CLOSED
→ EXEC-002 CLOSED
→ EXEC-003 CLOSED
→ EXEC-004 CLOSED
→ EXEC-005 CLOSED
→ EXEC-006 CLOSED
→ OWNER DECISION GATE
→ EXEC-007 when separately authorized
→ EXEC-008
→ EXEC-009 + EXEC-010
→ EXEC-011 per stabilized surface
→ EXEC-012 where approved
→ EXEC-013
→ EXEC-014
```

Parallelism is permitted only where package registries show no shared mutable files, schemas, contracts, fixtures, providers, environments or visual surfaces.

## 7. Vercel Hobby operating rule

- Z0–Z8 planning and documentation: `NOT_REQUIRED`.
- Incremental package work: `SKIP_BY_DEFAULT`.
- Daily acceptance relies on targeted tests, TypeScript where needed, GitHub CI, diff review, and scope-appropriate security/contract checks.
- No Preview is created for every file, commit, Push or PR.
- A completed Runtime/UI package may receive at most one Preview after all package changes are complete, tests/build pass and the candidate SHA is stable.
- A Preview is not required when the package introduces no browser-only behavior and exact-head CI, direct tests and Build fully prove the contract.
- One final Preview is required only for the definitive Release Candidate after all intended repair packages are complete.
- Automatic non-required Preview attempts are non-blocking; no retry-only Push is allowed.
- Hobby quota limitation is recorded as `VERCEL_VALIDATION = DEFERRED_TO_FINAL_EXECUTABLE_HEAD`.
- Production deployment always requires separate explicit owner authorization.

## 8. Priority policy

- Any newly verified exploitable P0 security/integrity issue interrupts the roadmap for a separately bounded containment/remediation package.
- A package blocked by an owner decision remains blocked; agents cannot choose a business policy.
- A package that exceeds its allowlist or change budget pauses and returns for amendment.
- No package proceeds from non-production verification to `main` or Production automatically.
- A prepared migration is not an executed migration. Migration, backfill and customer-data operations require separate authorization and recovery evidence.

## 9. Roadmap result

```text
TOTAL PACKAGES: 14
CLOSED: 6
READY FOR CONTROLLED EXECUTION: 0
OWNER/REFERENCE CONDITIONAL: 5
DEFERRED/BLOCKED: 3
IN EXECUTION: 0
AUTOMATIC EXECUTION: NONE
NEXT AUTOMATIC PACKAGE: NONE
NEXT ELIGIBLE PACKAGE: EXEC-007 AFTER OWNER DECISION AND SCOPE FREEZE
```

## 10. EXEC-004 closure reconciliation — 2026-07-26

- Implementation base: `6a24e57d75f17550fe0fd5755889aef9a5cacdc9`.
- Final reviewed implementation head: `d547caaeaa48de592229a51c5c252e32d4aacd02`.
- Implementation PR: `#128`.
- Squash merge to the zero-based central branch: `8643f1858cd453c53bee60cc4184dfab2f7cebdb`.
- Exact implementation scope: `15` files.
- ORCA CI: `#512 / SUCCESS` on the exact final head.
- Verify, Production gate, production dependency audit, TypeScript, G5, G8, focused/foundation/regression tests and Build: `SUCCESS`.
- Isolated recovery drill: `SUCCESS` after one infrastructure-only Docker Hub retry; no repository change was made for the transient pull timeout.
- Vercel: `SKIP_BY_DEFAULT`; no browser-only contract was introduced and no Preview was necessary.
- Prepared additive migration: `NOT EXECUTED`.
- Backfill and customer-data action: `NOT PERFORMED`.
- `main`, Production, providers, secrets, accounts and purchases: `UNTOUCHED`.
- EXEC-004 closes no authority for EXEC-005; the next package remains owner-decision gated.

## 11. EXEC-005 closure reconciliation — 2026-07-26

- Central base before implementation: `991afec099880565043ef578ba8084b2ece809ad`.
- Final implementation head: `6a327d67648f795f64b13d766672bd0f4911e8f1`.
- Implementation PR: `#132`.
- Squash merge to the zero-based central branch: `10d4b5fc00bb9dad35a3c381dd72f6be685db09a`.
- Closure PR: `#134` on clean branch `work/orca-exec-005-closure-v2-20260726`.
- Implementation scope: `14` files, all within the frozen allowlist.
- ORCA CI: `#532 / SUCCESS`.
- Disposable PostgreSQL migration validation: `#9 / SUCCESS`.
- Direct behavior: `38` named cases plus schema and integrity contracts.
- Strict self-review: `PASS / NON_INDEPENDENT`.
- Vercel: `SKIP_BY_DEFAULT`; no browser-only surface and no Preview.
- Prepared additive migrations: Production and customer data `NOT EXECUTED`.
- Backfill: `NOT PERFORMED`.
- `main`, Production, providers, secrets and customer data: `UNTOUCHED`.
- EXEC-006 remained `NOT STARTED / OWNER_DECISION_PENDING` at EXEC-005 closure; that historical state is preserved here.

## 12. EXEC-006 closure reconciliation — 2026-07-26

- Central base before implementation: `5774f64ad42fb77a387c28d6f5c8fac29c31450b`.
- Reviewed executable head: `bec25027a6519792690cbe2a5cdf48e19f78c4f4`.
- Final implementation/review head: `967ea4a2b79624facece53f55e2356e8673fe07b`.
- Implementation PR: `#135`.
- Merge to the zero-based central branch: `6d0f25d771ff8685d3569d5fd90aa6f5f765c9c4`.
- Closure branch: `work/orca-exec-006-closure-20260726`.
- Closure PR: `#136`.
- Implementation scope: `22` files, all within the renewed frozen allowlist.
- ORCA CI: `#599 / SUCCESS`, workflow run ID `30206068819`.
- Disposable PostgreSQL migration validation: `#45 / SUCCESS`, workflow run ID `30206068820`.
- Seven additive migrations prepared; Production/customer-data execution: `NOT PERFORMED`.
- Direct evidence includes Unit availability, Hold/Reservation lifecycle, atomic conversion/expiry, idempotency, optimistic concurrency, append-only audit/history, Tour conflicts, independent approval, final contractual blocking and exact persisted assignment scope.
- Material final-review finding `F-EXEC006-001` (Department/Team Branch expansion and untyped assigned resource) was remediated and directly proven in disposable PostgreSQL.
- Strict final review: `PASS / NON_INDEPENDENT`; known Runtime security defects and privilege expansions remaining: `0`.
- Vercel: `SKIP_BY_DEFAULT`; automatic Hobby rate-limit failure was non-blocking and no retry-only Push or Preview was used.
- Backfill and customer-data action: `NOT PERFORMED`.
- `main`, Production, providers, secrets, accounts and subscriptions: `UNTOUCHED`.
- EXEC-007 remains `OWNER_DECISION_PENDING / NOT STARTED`; closure grants no automatic authorization.

## Historical Z8 post-capacity closure — 2026-07-26

- Final Z8 reconciliation base was `ff47997382d9032a6e1c27b9488884282867479f` after PR `#123` isolated administrative closure metadata from the sealed EXEC-003 digest.
- Superseded Z8 PR `#99` / `a82bcc937a8f69196b96f742801fe20f2eecaf99` remains closed without merge.
- Historical PR `#102` is not reused as final evidence.
- Z0–Z8 remain closed as planning, assessment and execution-authorization gates; no package starts automatically.
