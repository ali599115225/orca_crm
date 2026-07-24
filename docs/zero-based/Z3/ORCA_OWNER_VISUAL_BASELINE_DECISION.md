# ORCA Z3 — Owner Visual Baseline Decision

- **Document ID:** ORCA-Z3-DEC-001
- **Version:** 1.0
- **Date:** 2026-07-22
- **Status:** `OWNER APPROVED`
- **Decision source:** Explicit owner approval in the ORCA zero-based execution conversation
- **Production action authorized:** `false`

## 1. Approved decision

The existing closed ORCA visual identity is approved as the general comparison baseline for the zero-based target experience.

The approved baseline includes the established direction for:

- Arabic-first RTL presentation;
- Light and Dark modes;
- blue primary actions and restrained gold accent use;
- professional typography hierarchy;
- compact operational density;
- stable cards, tables, lists, forms, tabs, master/detail workspaces, modals, and states;
- visually hidden scrollbars while preserving usable scrolling;
- accessibility, focus, selected, hover, disabled, loading, empty, error, and provider states.

## 2. What this approval does not mean

This decision does not automatically approve the current composition of every existing page, tab, drawer, modal, or state.

It does not classify any current component as `KEEP`, does not close any page visually, and does not authorize implementation merely because a similar current surface exists.

## 3. Mandatory independent approval rule

Every page, independent tab, critical overlay, and material responsive/state variant must follow this sequence:

1. prepare its named text contract;
2. create its independent visual reference using the approved ORCA baseline;
3. present the reference to the owner;
4. record owner approval or requested changes against the contract ID;
5. implement only the approved item;
6. perform independent visual verification against the approved reference.

Approval of one item does not implicitly approve another item.

## 4. Effect on the zero-based sequence

- creation of the global shell and design-system visual reference is authorized;
- Z4 planning-only stacked preparation may proceed without changing Runtime, schema, data, providers, or Production;
- Z3 remains `PARTIAL` until the required target visual references are drafted and approved;
- page-level design implementation remains prohibited until the named page/tab/overlay reference is approved;
- central merge and later execution gates remain subject to CI, Vercel, traceability, and owner boundaries.

## 5. Safety boundary

```text
GENERAL ORCA VISUAL BASELINE: OWNER APPROVED
GLOBAL VISUAL REFERENCE CREATION: AUTHORIZED
PAGE/TAB/OVERLAY IMPLICIT APPROVAL: PROHIBITED
PAGE-LEVEL IMPLEMENTATION WITHOUT NAMED REFERENCE: PROHIBITED
Z3 PASS / CLOSED: NOT YET
Z4 PLANNING-ONLY PREPARATION: AUTHORIZED
RUNTIME CHANGE: NONE
DATABASE CHANGE: NONE
MAIN MERGE: NOT AUTHORIZED
PRODUCTION ACTION: NOT AUTHORIZED
```
