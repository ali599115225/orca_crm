# ORCA G8 Discovery — Final Foundation Gate

## Stage record

- **Stage:** G8 — Final Foundation Gate
- **Start SHA:** `6d63d21423692d404c2e428fa0e385d3c6be5ea5`
- **Working branch:** `work/orca-g8-final-foundation-gate-20260721`
- **Target branch:** `work/orca-central-baseline-execution-20260719`
- **Status:** DISCOVERY CLOSED / VERIFICATION PENDING
- **Production action:** none

## Preconditions

G8 begins only after G7 reached `PASS / CLOSED` and the central and G7 branches reconciled at `6d63d21423692d404c2e428fa0e385d3c6be5ea5`.

The authoritative stage ledger records:

- G0 through G7: `PASS / CLOSED`;
- G8: `IN PROGRESS`.

## Repository evidence

Current closed foundation evidence includes:

- single-company operating model and company-owned external integrations;
- current-source evidence hierarchy;
- central integration and non-force reconciliation process;
- G3 architecture, RBAC, guarded data transition, and legacy SaaS disablement;
- G4 inventory of 359 page and operational contracts;
- G5 zero current Critical/High runtime findings, 129/129 API classifications, audit, typecheck, tests, CodeQL, and build controls;
- G6 6/6 scheduled Cron contracts, 4/4 health contracts, safe backup/restore tooling, and isolated PostgreSQL recovery drill;
- G7 58 terminal remediation decisions, including 37 visual records, 59 direct-test gaps, six Production blocker categories, zero unowned High/Critical items, and zero reconciliation blockers.

No current repository condition requires `NO_GO`.

## Production evidence gap

The file below does not exist during foundation closure:

```text
docs/reports/activation/ORCA_PRODUCTION_ACTIVATION_EVIDENCE.json
```

Therefore the current evidence does not verify:

1. owner Production approval and protected merge to `main`;
2. Production migration, backfill, constraints/index validation, and staged RBAC enablement;
3. current provider recovery window, representative restore, and Production RTO/RPO;
4. direct evidence for all launch-critical P0/P1 contracts and current launch visual proof;
5. deterministic critical staging browser journeys;
6. provider/secret decisions, Production deployment health, and rollback evidence.

## Expected decision

Provided all repository gates pass:

```text
g8RepositoryStageResult = PASS / CLOSED
repositoryFoundationVerdict = GO
productionLaunchVerdict = CONDITIONAL_GO
productionGoAuthorized = false
automaticProductionActionAuthorized = false
nextAuthorizedState = CONTROLLED_ACTIVATION_PLANNING_ONLY
```

This result closes the foundation plan while keeping Production activation separate and prohibited without evidence and explicit instruction.

## NO_GO triggers

G8 returns `NO_GO` if:

- any G0–G7 stage loses closure;
- G7 reconciliation regresses;
- expected remediation counts drift without review;
- High/Critical runtime risk reappears;
- API security classification is incomplete;
- scheduled Cron or health readiness regresses;
- required CI, audit, typecheck, tests, build, CodeQL, recovery, merge, or reconciliation evidence fails.

## GO trigger

G8 returns `GO` only when the activation evidence file:

- is valid schema version 1;
- requests GO;
- identifies approved central and resulting main SHAs;
- identifies a Production deployment;
- contains approval evidence;
- marks all 14 required checks `VERIFIED` with durable references and timestamps;
- contains no credential, connection string, private key, or sensitive value.

Even then, an explicit owner release instruction remains mandatory.

## Required verification

- executable G8 result matches the expected current decision;
- stage ledger order and closure remain stable;
- G7 is executed and consumed by G8;
- central report carries the same decision;
- G8 artifacts and tests are permanent in CI;
- all earlier gates and the recovery drill continue to pass;
- CodeQL and production build pass;
- final PR merges into central;
- final central runtime/build evidence is reconciled;
- G8 branch and central compare identical;
- `main` remains unchanged;
- no Production action occurs.
