# ORCA Z3 — Strict Visual Reference Acceptance Checklist

- **Document ID:** ORCA-Z3-VIS-ACCEPT-001
- **Version:** 1.0 — Unpublished planning checklist
- **Date:** 2026-07-22
- **Status:** `CHECKLIST READY / NO REFERENCE APPROVED BY THIS DOCUMENT`
- **Production action authorized:** `false`

## 1. Use

Apply this checklist twice for every named page, tab, overlay or universal pattern:

- **Pass 1:** structure, layout and information hierarchy.
- **Pass 2:** detail, states, interaction, accessibility and visual consistency.

An item passes only when every applicable requirement is shown in the reference and later verified in implementation.

## 2. Pass 1 — structure and layout

- [ ] Contract ID, purpose, actor and primary action are explicit.
- [ ] Information hierarchy supports the operational decision or task.
- [ ] RTL direction is correct; master/list is left and detail is right when that pattern applies.
- [ ] Page has one primary scroll root unless an internal scroll region is explicitly justified.
- [ ] No double vertical scroll.
- [ ] No inaccessible hidden horizontal content.
- [ ] Cards, rows and panels use content-driven dimensions.
- [ ] No large fixed `min-height`, `h-full` or empty filler panel.
- [ ] Empty states are compact, proportional and actionable.
- [ ] Long content expands naturally without clipping or unstable jumps.
- [ ] Tables/lists are used when scan, compare or density matters.
- [ ] Primary action is clear; secondary actions do not compete.
- [ ] Desktop, tablet and mobile structure is shown where applicable.
- [ ] Sticky regions do not cover content or trap focus.
- [ ] Overlays use portal/stacking and do not render beneath shell elements.

## 3. Pass 2 — visual detail

- [ ] Arabic labels are clear and no raw UUID is visible.
- [ ] Unknown data uses `غير محدد` or a contract-specific honest fallback.
- [ ] Dates, times, timezone, currency and units are explicit and consistent.
- [ ] Light and Dark maintain hierarchy and contrast.
- [ ] Primary blue, restrained gold accent, secondary and ghost actions follow the approved hierarchy.
- [ ] Hover, selected, active, focus, disabled and destructive states are distinct.
- [ ] Focus indicators are visible and keyboard order is logical.
- [ ] Controls meet the applicable minimum interactive size target.
- [ ] Icons have labels/tooltips where meaning is not self-evident.
- [ ] Text does not truncate critical identifiers or amounts without an accessible reveal.
- [ ] Spacing is consistent and avoids inflated decorative emptiness.
- [ ] Card heights remain stable where comparison requires alignment, without forcing unrelated content into identical empty boxes.
- [ ] Scrollbars are visually hidden only when scrolling remains fully usable.

## 4. Required states

Show all applicable states:

- [ ] initial loading/skeleton;
- [ ] background refresh without layout jump;
- [ ] populated/default;
- [ ] empty;
- [ ] filtered empty;
- [ ] validation errors and field mapping;
- [ ] recoverable error;
- [ ] final failure;
- [ ] unauthorized/read-only;
- [ ] not found without existence leakage;
- [ ] archived/suspended;
- [ ] stale/concurrency conflict;
- [ ] provider `NOT_CONFIGURED`;
- [ ] provider retryable/unknown/final failure;
- [ ] success without unwanted navigation reset;
- [ ] offline/network interruption where applicable.

## 5. Form and overlay requirements

- [ ] Focus enters the overlay and returns to the trigger.
- [ ] Escape/close behavior is safe and unsaved changes are handled.
- [ ] Mobile viewport, on-screen keyboard and long validation content are shown.
- [ ] Loading cannot submit duplicate material actions.
- [ ] Destructive/high-risk actions state exact impact, authority and reason.
- [ ] Success/error feedback remains in context.
- [ ] No secret, card data or sensitive provider credential is echoed.

## 6. Accessibility

- [ ] Semantic headings and landmark order are represented.
- [ ] Keyboard-only completion is possible.
- [ ] Focus is not hidden by sticky regions or overlays.
- [ ] Color is not the only carrier of state.
- [ ] Error summary and field association are clear.
- [ ] Tables have accessible headers and actions.
- [ ] Dynamic loading/status feedback has an announcement strategy.
- [ ] Reduced-motion behavior is considered for material animation.

## 7. Approval record

A reference cannot become `OWNER_APPROVED` without:

- exact contract ID;
- reference version/date;
- image or board identifier;
- list of included states/viewports;
- explicit owner approval or change request;
- statement that approval does not extend to other contracts.

Implementation cannot become `VISUALLY_CLOSED` without:

- implementation commit;
- populated and state evidence;
- independent Pass 1 and Pass 2 verification;
- Light/Dark and responsive evidence where applicable;
- no unresolved material mismatch.

## 8. Current state

```text
STRICT TWO-PASS CHECKLIST: READY
REFERENCES APPROVED BY CHECKLIST: 0
IMPLEMENTATIONS VERIFIED: 0
IMPLICIT CROSS-PAGE APPROVAL: PROHIBITED
RUNTIME CHANGE: NONE
PRODUCTION ACTION: NONE
```
