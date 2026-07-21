# ORCA G4 Central Contract Registry

## Purpose

This registry is the durable human-readable index for the machine-generated G4 contract registry. The current repository is scanned in CI; the raw and reconciled JSON registries are published as the `g4-contract-registry` workflow artifact.

The registry records the contract surface without converting missing evidence into a pass. Previously closed visual surfaces retain closure unless a current documented regression exists.

## Baseline

- G4 start SHA: `6068e4762798c8261ec0a56a2122fd61d8a49454`
- Inventory schema: `3`
- Registry schema: `1`
- Total contracts: **359**
- Pages: **43**
- APIs: **129**
- Server actions: **162**
- Tab sets: **8**
- Modals/dialogs/drawers: **6**
- Route-level loading/error/not-found states: **7**
- Layout contracts: **4**

## Registry parts

1. `ORCA_G4_PAGES_AND_SURFACES.md` — pages, layouts, route states, tabs, modals, and drawers.
2. `ORCA_G4_API_CONTRACTS.md` — every current API route and detected method.
3. `ORCA_G4_SERVER_ACTION_CONTRACTS.md` — every exported Server Action grouped by source.
4. `ORCA_G4_VISUAL_STATUS_OVERRIDES.json` — retained and open visual-closure decisions.

## Status rules

### Functional evidence

- `EVIDENCE_REFERENCED`: a current test references the route, source, symbol, or component.
- `NOT_PROVEN`: no direct current test reference was detected. This is not treated as a pass.

### Visual evidence

- `CLOSED_RETAINED`: previously closed and not reopened because no current documented regression exists.
- `PARTIAL`: visual work remains incomplete.
- `PARTIAL_DOCUMENTED_ISSUE`: a current documented defect blocks closure.
- `LEGACY_DISABLED`: retained only as a disabled legacy entry point.
- `HISTORICAL_EVIDENCE_ONLY`: a retained report exists, but current visual matching is not proven.
- `NOT_PROVEN`: no sufficient current visual decision exists.
- `NOT_APPLICABLE`: the contract has no visual surface.

## Current evidence totals

- Functional evidence referenced: **300**
- Functional evidence not proven: **59**
- Visual closed retained: **19**
- Visual partial: **11**
- Visual partial with documented issue: **3**
- Visual not proven: **12**
- Historical visual evidence only: **11**
- Legacy disabled: **1**
- Non-visual or source-state contracts: **302**

These unresolved classifications remain explicit inputs to G5, G6, and G8. G4 closes the inventory and contract-governance layer; it does not claim that every page is visually closed or that every operation has a dedicated test.
