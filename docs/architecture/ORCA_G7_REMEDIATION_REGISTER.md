# ORCA G7 Remediation Reconciliation Register

## Purpose

G7 is the mandatory reconciliation gate between G6 and G8. It converts every known finding, gap, conflict, deferred Production action, accepted residual risk, and out-of-scope capability into an explicit terminal remediation decision.

G7 closes **classification and ownership**. It does not claim that deferred visual work, direct-test gaps, Production migration, provider recovery, external integrations, or release activation have been executed.

## Terminal statuses

Only these states are valid in the final register:

| Status | Meaning |
|---|---|
| `CLOSED` | Implemented or resolved with current evidence |
| `DEFERRED_WITH_APPROVAL` | Deliberately postponed with owner, reason, and re-entry condition |
| `OUT_OF_SCOPE` | Excluded by an approved product or operating-model decision |
| `ACCEPTED_RESIDUAL_RISK` | Reviewed risk accepted at its current severity with a change trigger |
| `PRODUCTION_ACTIVATION_BLOCKER` | Repository work may close, but Production launch cannot proceed until verified |

`PARTIAL`, `MISSING`, `CONFLICTING`, `NOT_PROVEN`, `UNKNOWN`, and `OPEN` are not valid terminal G7 decisions.

## Sources of truth

G7 reconciles:

- `ORCA_CENTRAL_BASELINE_PLAN.md`;
- `ORCA_CENTRAL_BASELINE_PLAN_ADDENDUM.md`;
- G3–G6 final closure reports;
- G4 page/operational/visual registries;
- G5 security and direct-test classifications;
- G6 operations and recovery evidence;
- current CI, CodeQL, and Vercel evidence;
- historical reports only as historical context.

## Curated decisions

The canonical structured policy is:

```text
ORCA_G7_REMEDIATION_POLICY.json
```

It records the controlling decisions for:

- governance and operating model;
- branch/repository reconciliation;
- architecture, RBAC, and data-plane activation;
- page and operational contracts;
- direct behavioral evidence;
- visual evidence;
- security and quality controls;
- accepted Low risks and tooling debt;
- dependency overrides;
- Cron, health, backup, restore, and provider recovery;
- external provider ownership and activation;
- legacy SaaS scope;
- deterministic E2E release evidence;
- main merge, Production deploy, health, and rollback;
- historical evidence conflicts;
- Vercel Preview capacity protection.

## Automatically expanded items

`scripts/g7-remediation-reconciliation.mjs` expands every current G4 visual row whose source status is:

- `PARTIAL`;
- `PARTIAL_DOCUMENTED_ISSUE`;
- `NOT_PROVEN`;
- `HISTORICAL_EVIDENCE_ONLY`.

Each page, tab set, and overlay becomes an item-level G7 decision with:

- stable generated ID;
- source kind and key;
- current source status;
- Product/UI owner;
- `DEFERRED_WITH_APPROVAL` terminal decision;
- G8 launch-scope/visual-closeout target;
- evidence and re-entry dependencies.

The current expected count is **37** item-level visual decisions. Count drift is blocking until reviewed.

## Direct-test reconciliation

G5 classifies **59** contracts without direct current test references:

| Priority | Count | G7 decision |
|---|---:|---|
| P0 security-critical | 11 | `PRODUCTION_ACTIVATION_BLOCKER` |
| P1 mutation | 8 | `PRODUCTION_ACTIVATION_BLOCKER` |
| P1 sensitive read | 6 | `PRODUCTION_ACTIVATION_BLOCKER` |
| P2 read | 16 | `DEFERRED_WITH_APPROVAL` |
| P3 UI | 16 | `DEFERRED_WITH_APPROVAL` |
| P4 source state | 2 | `DEFERRED_WITH_APPROVAL` |

The **25 P0/P1** gaps require direct current evidence before unrestricted Production launch, unless an approved narrower launch scope excludes those capabilities. The remaining **34** gaps remain measurable and must be elevated if they become release-critical or change.

## Production activation blockers

G7 explicitly carries these categories into G8 and the later activation program:

1. G3 Production migration, guarded backfill, constraints/index validation, and staged RBAC enforcement.
2. Direct behavioral evidence for P0/P1 contracts.
3. Current provider recovery configuration, representative restore, and Production RTO/RPO.
4. Company-owned provider credentials, subscriptions, licenses, and callback configuration for enabled integrations.
5. Deterministic staging identities, fixtures, and critical browser journeys.
6. Protected merge to `main`, Production deployment, post-deploy health, and rollback evidence.

These blockers do not make G7 fail. An unowned, hidden, or ambiguously classified blocker does.

## Deferred and accepted items

Current approved deferred or accepted categories include:

- lower-priority P2/P3/P4 test gaps;
- all current open visual evidence until G8 assigns launch scope;
- narrow dependency overrides pending upstream releases;
- object-storage lifecycle/KMS/scheduled logical-backup infrastructure;
- one reviewed Low static HTML signal;
- absence of a standalone ESLint configuration while stronger executable gates remain active.

A change in severity, data flow, expression source, dependency resolution, launch scope, or provider activation reopens the relevant decision.

## Out of scope

Legacy multi-company SaaS capabilities remain `OUT_OF_SCOPE` under the approved operating model:

- public company registration;
- self-service trials;
- subscription checkout/change;
- add-on checkout;
- paid agent leasing;
- automatic subscription renewal;
- subscription billing Cron;
- package-limit enforcement;
- upgrade navigation.

Historical data structures remain preserved for compatibility, audit, and recovery.

## Executable output

Every CI run produces:

```text
artifacts/g7-remediation-reconciliation.json
artifacts/g7-remediation-reconciliation.md
```

The executable register includes curated items plus all generated visual child items, status/severity totals, stage evidence, blockers, and transition result.

## Blocking rules

G7 fails when:

- G3, G4, G5, or G6 is no longer `PASS / CLOSED`;
- the G0–G8 execution map or G7 transition rule disappears;
- an item has an invalid status, missing owner, missing evidence, duplicate ID, or missing required field;
- a High/Critical item is unowned;
- P0/P1 direct-test gaps are not carried as Production blockers;
- Production data-plane or recovery obligations are not carried as blockers;
- direct-test counts or the 37 visual decisions drift without review;
- any terminal item remains generically `PARTIAL`, `MISSING`, `CONFLICTING`, or `NOT_PROVEN`.

## Transition rule

G8 may begin only when the G7 executable result is:

```text
repositoryStatus = PASS
reconciliationStatus = RECONCILED
g8TransitionAllowed = true
blockingFindings = 0
```

This transition does not authorize Production. It authorizes only the final foundation decision stage.
