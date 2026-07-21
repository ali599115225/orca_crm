# ORCA G5 Discovery

## Stage

- **Stage:** G5 — Security & Quality
- **Status:** IN PROGRESS
- **Start SHA:** `b42c41a9e2c11e1ee8436c6a70425035e45d04aa`
- **Source branch:** `work/orca-foundation-plan-20260721`
- **Target branch:** `work/orca-central-baseline-execution-20260719`
- **Main baseline:** `f7af072c689178d397019648ab5c21336ab259b6`

## Scope

G5 owns repository security and quality evidence after the G4 contract registry. It must:

1. classify the 59 G4 contracts without direct current test references;
2. identify high-risk unproven API and Server Action surfaces;
3. inspect dependency and supply-chain posture;
4. inspect current static security signals and risky source patterns;
5. verify API authentication/authorization evidence without assuming public access is safe;
6. establish explicit type, dependency-audit, contract, regression, build, CodeQL, and preview gates;
7. retain unresolved risks explicitly rather than converting them into PASS.

## Existing controls observed

- CodeQL advanced setup covers Actions, JavaScript/TypeScript, and Python.
- Dependabot checks npm and GitHub Actions weekly.
- ORCA CI validates Prisma, Production safety, G3, G4, core regressions, Sentinel, P2 acceptance, and the production build.
- G4 records 359 contracts, with 300 carrying direct current test references and 59 classified as `NOT_PROVEN`.

## Discovery outputs

`scripts/g5-security-quality-inventory.mjs` will emit:

- `artifacts/g5-security-quality-inventory.json`;
- `artifacts/g5-security-quality-inventory.md`.

CI will also capture npm audit results separately before a blocking policy is selected from the actual findings.

## Status semantics

- `VERIFIED`: direct current evidence satisfies the stated control.
- `REVIEW_REQUIRED`: a signal exists but needs source-level review before severity is assigned.
- `NOT_PROVEN`: no direct current evidence was detected.
- `ACCEPTED_RISK`: a reviewed risk is retained with an owner and reason.
- `BLOCKING`: a confirmed risk prevents G5 closure.
- `OUT_OF_SCOPE`: owned by a later foundation stage.

## Production boundary

G5 does not include a Production deployment, migration, backfill, environment change, secret rotation, or Production data write. Security findings that require a Production action remain separately gated.
