# ORCA Z8 — Prioritized Execution Roadmap

- **Document ID:** ORCA-Z8-ROADMAP-001
- **Version:** 1.3
- **Date:** 2026-07-26
- **Status:** `ACTIVE / EXEC-001 / EXEC-002 / EXEC-003 CLOSED / EXEC-004 OWNER_DECISION_PENDING`
- **Current central baseline after EXEC-003:** `b0369b50eb2d49001e5322eea90b3b6dae22a882`

```text
EXEC-001: CLOSED
EXEC-002: CLOSED
EXEC-003: CLOSED via PR #108
EXEC-004: OWNER_DECISION_PENDING
```

## 1. Sequencing rule

The roadmap orders work by risk reduction and prerequisite value, not by page visibility. A later wave cannot begin merely because its code is convenient; its package preconditions and mutable-boundary conflicts must be closed.

## 2. Wave 0 — controlled execution

| Order | Package | Status | Purpose | Vercel validation |
|---|---|---|---|---|
| 1 | EXEC-001 | `CLOSED` via PR #104 | publish the verified dependency-security issue form | `NOT_REQUIRED` |
| 2 | EXEC-002 | `CLOSED` via PR #106 | add blocking governance lint, override ownership and artifact-retention controls | `SKIP_BY_DEFAULT` |
| 3 | EXEC-003 | `CLOSED` via PR #108 | close direct P0/P1 security, authority, webhook and cron evidence | `SKIP_BY_DEFAULT` |

EXEC-003 owns shared security tests and contract registries. Other packages may not edit those boundaries concurrently without coordination.

## 3. Wave 1 — owner/domain decisions first

| Order | Package | Blocking decisions | Vercel validation |
|---|---|---|---|
| 4 | EXEC-004 | `OWNER_DECISION_PENDING` — Release-1 scope, company structure, branches/departments/teams/personas | `REQUIRED_AT_PACKAGE_END` |
| 5 | EXEC-005 | identity/merge survivorship, privacy purpose and consent | `REQUIRED_AT_PACKAGE_END` |
| 6 | EXEC-006 | commitment priority/expiry, acceptance-reservation truth, inventory/scheduling policy | `REQUIRED_AT_PACKAGE_END` |
| 7 | EXEC-007 | offer approval/pricing limits and acceptance semantics | `REQUIRED_AT_PACKAGE_END` |
| 8 | EXEC-008 | templates/signatories, financial precision/correction, refund and evidence authority | `REQUIRED_AT_PACKAGE_END` |

EXEC-004 precedes all packages that depend on scoped authority. EXEC-006 precedes EXEC-007 and the inventory-dependent portion of EXEC-008. No migration is implied by approving a domain policy.

## 4. Wave 2 — operational truth and protected data

| Order | Package | Dependency | Vercel validation |
|---|---|---|---|
| 9 | EXEC-009 | approved workflow/communication policy; provider activation remains off | `REQUIRED_AT_PACKAGE_END` |
| 10 | EXEC-010 | privacy/retention/KPI/export policy and document-boundary design | `REQUIRED_AT_PACKAGE_END` |
| 11 | EXEC-011 | one owner-approved visual reference per page/tab/overlay after its functional contract stabilizes | `REQUIRED_AT_PACKAGE_END` |

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
→ EXEC-004 OWNER_DECISION_PENDING
→ EXEC-005 + EXEC-006
→ EXEC-007
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
- One final Preview is required only for the definitive Release Candidate after all intended repair packages are complete.
- Automatic non-required Preview attempts are non-blocking; no retry-only Push is allowed.
- Hobby quota limitation is recorded as `VERCEL_VALIDATION = DEFERRED_TO_FINAL_EXECUTABLE_HEAD`.
- Production deployment always requires separate explicit owner authorization.

## 8. Priority policy

- Any newly verified exploitable P0 security/integrity issue interrupts the roadmap for a separately bounded containment/remediation package.
- A package blocked by an owner decision remains blocked; agents cannot choose a business policy.
- A package that exceeds its allowlist or change budget pauses and returns for amendment.
- No package proceeds from non-production verification to `main` or Production automatically.

## 9. Roadmap result

```text
TOTAL PACKAGES: 14
CLOSED: 3
READY FOR CONTROLLED EXECUTION: 0
OWNER/REFERENCE CONDITIONAL: 8
DEFERRED/BLOCKED: 3
IN EXECUTION: 0
AUTOMATIC EXECUTION: NONE
NEXT AUTOMATIC PACKAGE: NONE
NEXT OWNER DECISION: EXEC-004
```
