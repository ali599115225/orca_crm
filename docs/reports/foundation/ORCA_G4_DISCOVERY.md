# ORCA G4 Discovery

## Stage

- **Stage:** G4 — Page & Operational Contracts
- **Status:** COMPLETE / SUPERSEDED BY FINAL CLOSURE
- **Start SHA:** `6068e4762798c8261ec0a56a2122fd61d8a49454`
- **Verified PR head SHA:** `92991de41fad76e0e1187587fbe2188466f6b52e`
- **G4 central merge SHA:** `a8fb332afc7cf26b60f154204dbab67c4b8589d8`
- **Source branch:** `work/orca-foundation-plan-20260721`
- **Target branch:** `work/orca-central-baseline-execution-20260719`
- **Main baseline:** `f7af072c689178d397019648ab5c21336ab259b6`

## Discovery result

The current repository checkout was scanned and reconciled into a durable central registry covering pages, routes, APIs, Server Actions, tabs, overlays, route states, Prisma dependencies, canonical permission references, current test references, and visual-closure decisions.

The discovery produced **359 recorded contracts**:

- 43 pages;
- 129 APIs;
- 162 Server Actions;
- 8 tab sets;
- 6 modals/dialogs/drawers;
- 7 route-level loading/error states;
- 4 layouts.

## Final outputs

- `docs/architecture/ORCA_G4_CONTRACT_REGISTRY.md`
- `docs/architecture/ORCA_G4_PAGES_AND_SURFACES.md`
- `docs/architecture/ORCA_G4_API_CONTRACTS.md`
- `docs/architecture/ORCA_G4_SERVER_ACTION_CONTRACTS.md`
- `docs/architecture/ORCA_G4_VISUAL_STATUS_OVERRIDES.json`
- `docs/reports/foundation/ORCA_G4_FINAL_CLOSURE.md`

The raw and reconciled JSON registries are reproducibly generated and uploaded by CI as the `g4-contract-registry` artifact.

## Decision rule retained

Previously closed pages were not reopened without a current documented defect. Missing functional or visual evidence remains classified as `NOT_PROVEN`, `PARTIAL`, or `HISTORICAL_EVIDENCE_ONLY`; it was not guessed closed.

## Production boundary

No Production deployment, migration, backfill, environment change, data write, or main-branch modification occurred in G4.
