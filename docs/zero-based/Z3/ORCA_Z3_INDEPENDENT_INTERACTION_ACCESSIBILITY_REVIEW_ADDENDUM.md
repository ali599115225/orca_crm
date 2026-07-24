# ORCA Z3 — Independent Interaction and Accessibility Review Addendum

- **Document ID:** ORCA-Z3-A11Y-REVIEW-001
- **Date:** 2026-07-22
- **Status:** `INDEPENDENT REVIEW COMPLETE / UNPUBLISHED`
- **Parent Z3 candidate:** `26359ea09396d84cde7e99225423908f9d77d9bd`
- **Production action authorized:** `false`

## 1. Review conclusion

The Z3 UI, interaction, information-architecture and accessibility contracts establish a strong Arabic-first, RTL, WCAG 2.2 AA target. Twelve explicit additions are required so complex operational surfaces remain accessible under real Arabic content, assistive technology, zoom, constrained devices and long-running sessions.

These additions do not approve a visual reference or authorize implementation.

## 2. Required additions

### Z3R-001 — Bidirectional content isolation

Arabic surfaces containing phone numbers, emails, URLs, references, currency, dates or English identifiers must:

- isolate directional runs correctly;
- preserve logical reading/copy order;
- prevent punctuation and signs from moving ambiguously;
- define direction per field/content rather than globally forcing all text;
- be tested with Arabic names and mixed Latin/numeric values.

### Z3R-002 — Live-region and async announcement policy

Async UI must define which changes are announced and how:

- validation summaries and field errors;
- save/submission result;
- background refresh or stale state;
- selected-row/detail change where not otherwise obvious;
- provider/job progress and completion;
- destructive or session-state warnings.

Announcements must be concise, deduplicated and must not continuously interrupt screen-reader users.

### Z3R-003 — Session expiry and reauthentication

Before a session expires during meaningful work:

- warn with sufficient time where technically possible;
- preserve safe unsaved input locally only according to classification policy;
- allow reauthentication without silently executing the pending action;
- restore the user to the same permitted context;
- announce revocation/expiry clearly and avoid existence leakage.

### Z3R-004 — Zoom, text spacing and reflow

Critical surfaces must remain usable at:

- 200% browser zoom without horizontal page scrolling for normal content where WCAG requires reflow;
- 400% zoom or equivalent narrow viewport with a deliberate single-column path;
- increased line, paragraph, letter and word spacing;
- long Arabic labels, names and values without clipping actions or status.

Data grids may use a deliberate horizontal data region only when headers, focus and all actions remain reachable.

### Z3R-005 — Forced-colors and high-contrast resilience

Selected, focused, disabled, warning, success and destructive states must survive forced-colors/high-contrast modes through native semantics, borders, text/icons and system colors. Box shadows, background fills or subtle color differences cannot be the sole state indicator.

### Z3R-006 — Virtualized grid/list accessibility

Any virtualized large list or grid must preserve:

- correct accessible row/item counts and positions;
- stable focus when items mount/unmount;
- keyboard navigation and row action access;
- selection persistence and announcement;
- find/filter/result counts;
- non-virtualized or paginated fallback when assistive technology support is insufficient.

### Z3R-007 — Charts and visual analytics alternatives

Every decision-relevant chart requires:

- title, purpose, as-of/freshness and metric definition;
- textual summary of the principal result;
- accessible data table or equivalent detail;
- non-color-only series/state distinction;
- keyboard-accessible legend/filter controls;
- no claim that a decorative chart alone is evidence.

### Z3R-008 — Drag, resize and pointer-action alternatives

Drag-and-drop, column resize/reorder, map manipulation, timeline movement or swipe actions require a keyboard/button alternative with the same outcome. Pointer precision, hover or gesture cannot be the only path.

### Z3R-009 — Keyboard shortcut governance

Shortcuts require:

- discoverability and help;
- no conflict with browser, assistive technology or Arabic input;
- disable/remap option for single-character shortcuts where applicable;
- no shortcut that bypasses confirmation, permission or state checks;
- visible focus and contextual scope.

### Z3R-010 — Touch, mobile keyboard and safe-area behavior

Mobile overlays and forms must account for:

- virtual keyboard resize and focused-field visibility;
- safe-area insets;
- minimum target size and spacing;
- no hover dependency;
- orientation/reflow where supported;
- sticky actions that do not obscure errors/content;
- back navigation and unsaved-state behavior.

### Z3R-011 — Accessible timeout, progress and long-running work

Long-running exports, imports, reports, scans, AI requests and provider operations must expose:

- current state and truthful business versus technical result;
- cancellation only when safe;
- background continuation and later retrieval where applicable;
- progress without fabricated percentage;
- timeout/unknown/retry state;
- accessible completion/failure notification and stable reference.

### Z3R-012 — Print, PDF and official-output separation

Printed/exported official records are independent output contracts:

- correct document direction, pagination, headers/footers and repeating table headers;
- no hidden interactive-only content or truncated evidence;
- semantic reading order where accessible PDF is required;
- official template/version/signatory authority from owner evidence;
- no ORCA branding or metadata where business policy prohibits it;
- screen UI approval does not implicitly approve printable output.

## 3. Acceptance protocol

Each applicable page/tab/overlay reference must mark which Z3R requirements apply. Verification combines automated checks with manual keyboard, screen reader, zoom/reflow, forced-colors, touch and print/output review. A single desktop screenshot cannot close these requirements.

## 4. Decision

```text
PARENT Z3 CONTRACTS: RETAIN
INDEPENDENT INTERACTION/A11Y ADDITIONS: 12
GLOBAL VISUAL REFERENCE APPROVED: NO
PAGE/TAB/OVERLAY IMPLEMENTATION: NOT AUTHORIZED
CURRENT IMPLEMENTATION ASSESSED: NO
MAIN/PRODUCTION ACTION: NONE
```
