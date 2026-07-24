# ORCA Z3 — Product Experience Requirements Traceability Supplement

- **Document ID:** ORCA-Z3-UX-RTM-001
- **Version:** 0.9
- **Date:** 2026-07-22
- **Status:** `ACTIVE SUPPLEMENT / MERGE INTO CENTRAL RTM AFTER Z3 APPROVAL`
- **Parent matrix:** `docs/zero-based/ORCA_REQUIREMENTS_TRACEABILITY_MATRIX.md` v1.1

## 1. UX requirements

| ID | Requirement | Priority | Acceptance evidence | Dependencies | Status |
|---|---|---|---|---|---|
| UX-001 | Provide one Arabic RTL authenticated shell without SaaS tenant/subscription navigation | P0 | shell reference + permission-aware nav test | BR-001/002 | REFERENCE_REQUIRED |
| UX-002 | Use semantic blue primary, bounded gold accent, secondary outline, ghost, and destructive hierarchy | P1 | Light/Dark token and action-state reference | BR-017 | REFERENCE_REQUIRED |
| UX-003 | Every interactive target is at least 44px and keyboard/focus accessible | P0 | manual keyboard/target-size check | BR-017 | PLANNED_LATER_GATE |
| UX-004 | Operational list pages use stable dense tables/lists rather than inflated card grids unless justified | P1 | page references + density review | NFR-010 | REFERENCE_REQUIRED |
| UX-005 | Cards have bounded dimensions and do not stretch or collapse unpredictably with content/state | P1 | responsive populated/empty/loading comparison | NFR-010 | REFERENCE_REQUIRED |
| UX-006 | Master/detail operational pages use RTL master-left/detail-right desktop layout and mobile list→detail | P1 | desktop/tablet/mobile reference | BR-017 | REFERENCE_REQUIRED |
| UX-007 | Scrolling remains functional with visually hidden scrollbars and no double nested body scroll | P1 | mouse/touch/keyboard scroll verification | NFR-010 | PLANNED_LATER_GATE |
| UX-008 | Every page has explicit loading, empty, filtered-empty, error, unauthorized, not-found, stale/conflict, success, and archived/read-only states as applicable | P0 | page state matrix + tests/reference | Z2 error taxonomy | REFERENCE_REQUIRED |
| UX-009 | Provider pages/actions distinguish not configured, needs setup, incomplete, connected, failed, and unknown without false success | P0 | provider state references + failure tests | BR-004/NFR-004 | REFERENCE_REQUIRED |
| UX-010 | Raw UUIDs are never primary user-visible references; missing values use `غير محدد` or explicit unknown | P1 | visual/source verification | NFR-009 | PLANNED_LATER_GATE |
| UX-011 | Forms use visible labels, server/field errors, bounded auto-grow, unsaved warning, and type-appropriate controls | P0 | form pattern reference + accessibility tests | FR requirements | REFERENCE_REQUIRED |
| UX-012 | Complex/high-risk workflows use full pages or appropriately sized overlays, not cramped nested modals | P1 | surface decision review | Z2 authority boundaries | REFERENCE_REQUIRED |
| UX-013 | Modals/drawers use portals, focus trap/restore, safe Escape/backdrop behavior, mobile viewport, and duplicate-submit prevention | P0 | overlay pattern tests/reference | BR-017 | REFERENCE_REQUIRED |
| UX-014 | Tabs are independent contracts with semantic keyboard behavior, clear selected/focus state, and deep-link state where useful | P0 | per-tab references + keyboard tests | page registry | REFERENCE_REQUIRED |
| UX-015 | Opening a notification remains on the source item and preserves meaningful navigation context | P1 | navigation integration test | global shell | PLANNED_LATER_GATE |
| UX-016 | Dates/times expose exact values and timezone where needed; money exposes currency and no silent financial rounding | P0 | format contract tests/reference | Z2 finance/tour | REFERENCE_REQUIRED |
| UX-017 | Data grids have semantic headers, readable responsive alternative, keyboard row/action access, and bounded bulk operations | P0 | table accessibility/responsive tests | page registry | REFERENCE_REQUIRED |
| UX-018 | User-visible status always combines text with shape/icon where useful and does not rely on color alone | P0 | contrast/color-blind state review | WCAG 2.2 AA | REFERENCE_REQUIRED |
| UX-019 | Critical flows pass automated plus manual keyboard, focus, screen-reader, contrast, zoom/reflow, mobile, and reduced-motion review | P0 | accessibility evidence package | BR-017 | PLANNED_LATER_GATE |
| UX-020 | Each page/tab/overlay implementation requires an owner-approved named visual reference and independent two-pass audit before visual closure | P0 | approval register + audit evidence | owner visual decision | OWNER_DECISION_REQUIRED |

## 2. Page mapping

| UX range | Primary target evidence |
|---|---|
| UX-001..003 | `ORCA_TARGET_INFORMATION_ARCHITECTURE.md`, `ORCA_UI_DESIGN_ACCESSIBILITY_CONTRACT.md` |
| UX-004..010 | `ORCA_TARGET_PAGE_SURFACE_REGISTRY.md`, design contract |
| UX-011..014 | design contract + SUR/TAB registry |
| UX-015..019 | IA + design contract + page contracts |
| UX-020 | `ORCA_VISUAL_REFERENCE_APPROVAL_REGISTER.md` |

## 3. Gate consequence

The textual UX requirements are defined, but `UX-020` prevents Z3 closure until the owner approves at least the global visual baseline and a formal reference/approval plan. Page-level implementation remains prohibited without its own approved reference.

```text
Z3 UX REQUIREMENTS: 20
TEXT ACCEPTANCE CONTRACTS: COMPLETE
VISUAL APPROVAL REQUIREMENT: OPEN
CENTRAL RTM MERGE: AFTER Z3 APPROVAL
```
