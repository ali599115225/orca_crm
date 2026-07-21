# ORCA G7 Discovery — Remediation Reconciliation & Closure

## Stage record

- **Stage:** G7 — Remediation Reconciliation & Closure
- **Start SHA:** `55bc7e09816186e4b96e27e35eee0958699eb8c9`
- **Working branch:** `work/orca-g7-remediation-reconciliation-20260721`
- **Target branch:** `work/orca-central-baseline-execution-20260719`
- **Status:** DISCOVERY CLOSED / VERIFICATION PENDING
- **Production action:** none

## Root cause

The original central baseline plan defined the review scope and only documented WBS-0 through WBS-2. Later execution established and closed G3, G4, G5, and G6 through separate contracts and reports, while the intake-era central report described G7 only as an established remediation roadmap.

The missing procedure was a formal reconciliation gate between G6 and G8. Without it, findings and deferred work could be distributed across stage reports without one terminal decision, owner, and target for every item.

## Corrective action

G7 adds:

- an authoritative G0–G8 execution addendum;
- a terminal remediation-status policy;
- a curated risk, dependency, conflict, quality, visual, operations, and release register;
- automatic item-level expansion of every open G4 visual surface;
- direct-test gap reconciliation by priority;
- explicit Production activation blockers;
- permanent CI and executable tests;
- a rule forbidding direct transition from G6 to G8.

## Reconciled sources

G7 uses current authorities:

- approved single-company and provider-ownership decisions;
- G3 final closure;
- G4 contract and visual registries;
- G5 security/quality register and direct-test classifications;
- G6 operations/recovery register and final closure;
- current CI and Vercel branch rules;
- intake and archived reports only as historical context.

## Terminal decisions

Only these states are accepted:

- `CLOSED`;
- `DEFERRED_WITH_APPROVAL`;
- `OUT_OF_SCOPE`;
- `ACCEPTED_RESIDUAL_RISK`;
- `PRODUCTION_ACTIVATION_BLOCKER`.

G7 rejects generic terminal use of `PARTIAL`, `MISSING`, `CONFLICTING`, `NOT_PROVEN`, `UNKNOWN`, or `OPEN`.

## Expected reconciliation

The curated policy contains **21** controlling items. The executable script expands **37** open visual rows from G4 into owned item-level records, producing **58** total remediation decisions.

Expected direct-test reconciliation:

- all gaps: 59;
- P0/P1: 25 → Production activation blocker;
- P2/P3/P4: 34 → deferred with approval.

Expected Production activation blockers:

1. G3 Production data-plane activation;
2. P0/P1 direct behavioral evidence;
3. provider recovery and Production RTO/RPO;
4. company-owned external provider activation;
5. deterministic staging E2E journeys;
6. protected main merge, Production deployment, health, and rollback.

## Closure principle

G7 may close while Production blockers remain, because G7's purpose is to make every item explicit, owned, and transferable to G8. G7 fails only when an item is hidden, ambiguous, unowned, unclassified, inconsistent with current evidence, or silently dropped.

## Required verification

- plan addendum contains G0 through G8 and the no-skip rule;
- G3–G6 remain `PASS / CLOSED`;
- item IDs, statuses, owners, evidence, and targets validate;
- 25 P0/P1 gaps remain Production blockers;
- 34 lower-priority gaps remain deferred;
- all 37 open visual rows are expanded;
- no High/Critical item is unowned;
- G7 artifacts and tests are retained by CI;
- audit, typecheck, regressions, acceptance, build, CodeQL, recovery drill, and Vercel Preview pass;
- no Production or `main` action occurs.
