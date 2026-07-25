# ORCA Z8 — Prioritized Execution Roadmap

- **Document ID:** ORCA-Z8-ROADMAP-001
- **Version:** 1.0
- **Date:** 2026-07-25
- **Status:** `FINAL / EXECUTION NOT STARTED`
- **Central baseline:** `ce0165d7a2ea6ff10acd9fe72e100555a2b3b325`

## 1. Sequencing rule

The roadmap orders work by risk reduction and prerequisite value, not by page visibility. A later wave cannot begin merely because its code is convenient; its package preconditions and mutable-boundary conflicts must be closed.

## 2. Wave 0 — ready for the next owner instruction

| Order | Package | Purpose | Start condition |
|---|---|---|---|
| 1 | EXEC-001 | publish the verified dependency-security issue form | bind exact current central SHA and one-file allowlist |
| 2 | EXEC-002 | add lint/supply-chain governance and reconcile repository artifacts | approve retention classification; no broad upgrades/deletions |
| 3 | EXEC-003 | close direct P0/P1 security, authority, webhook and cron evidence | freeze latest G4/G5 contract inventory and split test-only vs runtime corrections |

These packages are `EVIDENCE_READY`, not in execution. They may run sequentially or with explicit conflict analysis. EXEC-003 owns shared security tests and contract registries; other packages may not edit those boundaries concurrently without coordination.

## 3. Wave 1 — owner/domain decisions first

| Order | Package | Blocking decisions |
|---|---|---|
| 4 | EXEC-004 | Release-1 scope, company structure, branches/departments/teams/personas |
| 5 | EXEC-005 | identity/merge survivorship, privacy purpose and consent |
| 6 | EXEC-006 | commitment priority/expiry, acceptance-reservation truth, inventory/scheduling policy |
| 7 | EXEC-007 | offer approval/pricing limits and acceptance semantics |
| 8 | EXEC-008 | templates/signatories, financial precision/correction, refund and evidence authority |

EXEC-004 precedes all packages that depend on scoped authority. EXEC-006 precedes EXEC-007 and the inventory-dependent portion of EXEC-008. No migration is implied by approving a domain policy.

## 4. Wave 2 — operational truth and protected data

| Order | Package | Dependency |
|---|---|---|
| 9 | EXEC-009 | approved workflow/communication policy; provider activation remains off |
| 10 | EXEC-010 | privacy/retention/KPI/export policy and document-boundary design |
| 11 | EXEC-011 | one owner-approved visual reference per page/tab/overlay after its functional contract stabilizes |

Visual implementation follows the functional package for the same surface. One page or one tab is the maximum visual contract unit; unapproved adjacent surfaces remain untouched.

## 5. Wave 3 — externally gated and release evidence

| Order | Package | Status | Trigger |
|---|---|---|---|
| 12 | EXEC-012 | BLOCKED | company provider accounts/contracts/locations/budget, AI policy, licenses and official authority |
| 13 | EXEC-013 | BLOCKED | approved isolated environments, test identities/fixtures, recovery targets, UAT and handover authority |
| 14 | EXEC-014 | BLOCKED | all Release-1 P0/P1 outcomes accepted plus exact single-use `main` and Production decisions |

## 6. Critical path

```text
EXEC-001/002/003
→ EXEC-004
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

## 7. Priority policy

- Any newly verified exploitable P0 security/integrity issue interrupts the roadmap for a separately bounded containment/remediation package.
- A package blocked by an owner decision remains blocked; agents cannot choose a business policy.
- A package that exceeds its allowlist or change budget pauses and returns for amendment.
- No package proceeds from non-production verification to `main` or Production automatically.

## 8. Roadmap result

```text
TOTAL PACKAGES: 14
READY FOR NEXT INSTRUCTION: 3
OWNER/REFERENCE CONDITIONAL: 8
DEFERRED/BLOCKED: 3
AUTOMATIC EXECUTION: NONE
```
