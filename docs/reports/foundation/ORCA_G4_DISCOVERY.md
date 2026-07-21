# ORCA G4 Discovery

## Stage

- **Stage:** G4 — Page & Operational Contracts
- **Status:** IN PROGRESS
- **Start SHA:** `6068e4762798c8261ec0a56a2122fd61d8a49454`
- **Source branch:** `work/orca-foundation-plan-20260721`
- **Target branch:** `work/orca-central-baseline-execution-20260719`
- **Main baseline:** `f7af072c689178d397019648ab5c21336ab259b6`

## Discovery rule

The G4 registry is generated from the current repository checkout, then manually reconciled against tests, runtime evidence, and retained visual-closure records. Historical reports alone do not prove the current source state.

Closed pages are retained as closed unless a current repository finding or documented runtime/visual regression demonstrates a contract violation.

## Required inventory

G4 must account for:

- routes;
- pages;
- tabs;
- modals, drawers, and overlays;
- server actions;
- APIs;
- Prisma model dependencies;
- permissions;
- loading, empty, error, and not-found states;
- functional contracts;
- runtime evidence;
- visual closure status.

## Automated evidence

`scripts/g4-contract-inventory.mjs` scans the current checkout and emits:

- `artifacts/g4-contract-inventory.json`;
- `artifacts/g4-contract-inventory.md`.

The generated inventory contains paths, symbols, route metadata, model names, permission keys, test references, report references, and source hashes only. It does not emit source contents, environment values, credentials, or runtime data.

## Status semantics

- `VERIFIED`: current source and current evidence satisfy the contract.
- `PARTIAL`: the contract exists but one or more required states/evidence links remain incomplete.
- `MISSING`: a required contract or state is absent.
- `CONFLICTING`: current implementation and retained evidence disagree.
- `NOT_PROVEN`: no sufficient current evidence exists.
- `CLOSED_RETAINED`: previously closed and no current documented regression was found.
- `OUT_OF_SCOPE`: not part of the current page/operational contract surface.

## Remaining work

1. Run the generated inventory in CI.
2. Download and inspect the canonical JSON artifact.
3. Reconcile routes, pages, actions, APIs, models, permissions, and states.
4. Build the central contract registry.
5. Add executable drift/coverage checks.
6. Create the G4 final closure report.
7. Run CI, build, CodeQL, and Vercel checks.
8. Merge only after all G4 gates pass.

## Production boundary

No Production deployment, migration, backfill, environment change, or Production data action is part of G4.
