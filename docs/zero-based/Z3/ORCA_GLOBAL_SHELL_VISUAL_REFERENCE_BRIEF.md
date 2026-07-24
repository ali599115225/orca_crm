# ORCA Z3 — Global Shell Visual Reference Brief

- **Document ID:** ORCA-Z3-SHELL-BRIEF-001
- **Version:** 1.0 — Unpublished reference brief
- **Date:** 2026-07-22
- **Status:** `BRIEF READY / VISUAL IMAGE NOT YET OWNER APPROVED`
- **Production action authorized:** `false`

## 1. Purpose

Define the visual-reference brief for the global ORCA shell only. This brief does not approve or implement any page, tab, modal, drawer, or responsive composition.

## 2. Approved baseline direction

The shell reference must preserve the owner-approved ORCA direction:

- Arabic-first RTL;
- Light and Dark modes;
- blue primary actions with restrained gold accent;
- compact professional operational density;
- stable layout without uncontrolled expansion;
- clear focus, hover, selected, disabled and loading states;
- hidden scrollbar appearance while scrolling remains usable;
- no raw UUID or fabricated fallback values;
- accessible keyboard navigation and readable contrast.

## 3. Shell regions

The visual reference must show and label:

1. primary navigation region;
2. page identity/breadcrumb region;
3. global search or command entry when applicable;
4. notifications and account controls;
5. page header/action region;
6. content workspace boundary;
7. global feedback surfaces such as toast/status;
8. mobile navigation replacement;
9. focus order and skip-to-content behavior;
10. provider/system degraded indicator when globally relevant.

## 4. Layout rules

- One primary page scroll root unless a named master/detail contract explicitly requires an internal scroll region.
- No nested or double vertical scrolling.
- Scrollbars may be visually hidden only when mouse, touch and keyboard scrolling remain available.
- Content height follows real content; the shell does not force cards or empty states to fill unused viewport space.
- `h-full`, fixed heights and large `min-height` are prohibited when used only to create empty visual mass.
- Master/detail direction in RTL remains list/master on the left and detail on the right when that pattern is selected.
- Sticky elements must not cover content or break mobile focus navigation.
- Page width and gutters adapt without horizontal clipping or inaccessible off-screen actions.

## 5. Density and hierarchy

- Page title, context and principal action are visually dominant without oversized hero treatment.
- Primary action is singular where possible; secondary actions remain bounded and grouped.
- Operational data prefers tables/lists over inflated card grids when comparison and scanning matter.
- Cards use content-driven height, predictable padding and stable alignment.
- Empty states are compact and actionable; they do not become full-screen decorative panels.
- Badges communicate state rather than becoming navigation or oversized decoration.

## 6. Required shell reference frames

1. Desktop Light — populated operational page.
2. Desktop Dark — same structure and density.
3. Desktop — long content showing one scroll root.
4. Desktop — notification/account menus and focus states.
5. Tablet — collapsed/adapted navigation.
6. Mobile — navigation, page header, actions and content entry.
7. Global loading/initialization state.
8. Session expired/access denied safe transition.
9. Provider/system degraded banner where applicable.
10. Keyboard focus path annotations.

## 7. Prohibited outcomes

- page-specific content being treated as globally approved;
- permanent large blank regions;
- two competing primary actions;
- gold primary hover replacing the blue action hierarchy;
- visible raw technical identifiers;
- inaccessible hidden overflow;
- fixed-height cards that clip or create empty mass;
- mobile desktop compression without structural adaptation.

## 8. Acceptance record required

The final visual board must receive:

- reference ID and version;
- image/board date;
- explicit owner approval or change list;
- Light/Dark and desktop/mobile coverage;
- note that approval applies only to the global shell and universal patterns shown.

## 9. Current state

```text
GLOBAL SHELL TEXT BRIEF: READY
GLOBAL SHELL IMAGE/BOARD: NOT CREATED IN THIS COMMIT
OWNER-APPROVED GLOBAL SHELL REFERENCE: NO
PAGE-LEVEL IMPLEMENTATION AUTHORIZED: NO
RUNTIME CHANGE: NONE
PRODUCTION ACTION: NONE
```
