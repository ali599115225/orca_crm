# ORCA Z3 — Global UI Token and Measurement Contract

- **Document ID:** ORCA-Z3-TOKENS-001
- **Date:** 2026-07-22
- **Status:** `TARGET CONTRACT / FINAL VALUES REQUIRE APPROVED REFERENCE`
- **Applies to:** global shell and universal components only
- **Production action authorized:** `false`

## 1. Purpose

Define how ORCA visual values are selected, named, measured and verified without inventing final literals before the owner-approved global shell reference exists.

## 2. Value-source hierarchy

A token value may come only from, in order:

1. an owner-approved ORCA global reference;
2. a retained current ORCA token proven in Z7 to match that reference;
3. an explicitly reviewed proposal recorded against this contract;
4. an accessibility or platform minimum where no visual choice is implied.

Historical CSS values, framework defaults, screenshots, or agent preference are not approval by themselves.

## 3. Semantic token families

| Family | Required roles |
|---|---|
| Color | canvas, surface, elevated surface, border, text primary/secondary/muted, primary action, primary hover/pressed, restrained accent, success, warning, danger, info, focus ring, selection |
| Typography | display/page title, section title, card title, body, compact body, label, helper, badge, table header, numeric emphasis, mono/technical only where allowed |
| Spacing | inline gap, control gap, card padding, section gap, page gutter, master/detail gap, modal padding, mobile gutter |
| Size | control minimum, icon sizes, avatar sizes, sidebar widths, content maximum, modal widths, drawer widths, table row heights |
| Shape | control radius, card radius, modal radius, badge radius, border thickness |
| Elevation | base, menu/popover, modal/drawer, toast; subtle in Light and controlled in Dark |
| Motion | hover/focus transition, menu/modal entry, reduced-motion behavior, loading indication |
| Layer | shell, sticky header, dropdown, popover, drawer, modal, toast, tooltip |

## 4. Mandatory measurement rules

- Interactive controls use a minimum target size of 44px where applicable.
- Typography must remain readable at browser zoom and must not depend on fixed-height clipping.
- Table/list density is measured using real populated Arabic content, not Latin placeholders.
- Card heights are content-driven unless a named comparison contract requires aligned rows.
- Equal-height cards must use a bounded shared row contract; they must not force large empty regions.
- One page-level vertical scroll root is the default.
- Internal scrolling requires a named reason, bounded height and hidden-scrollbar usability verification.
- Horizontal overflow must preserve all actions and keyboard access.
- RTL is structural, not only text direction; master stays left and detail stays right when that ORCA pattern is used.
- Light and Dark tokens must be independently contrast-checked; Dark is not a simple color inversion.

## 5. Component density contracts

### Buttons

- primary remains blue across default, hover and pressed hierarchy;
- gold is accent, not a replacement primary hover;
- one principal action per region where practical;
- destructive actions are visually separate and require proportional confirmation;
- icon-only controls require accessible name and visible tooltip where useful.

### Cards

- no uncontrolled flex growth;
- no full-viewport empty-state card unless the reference explicitly requires it;
- padding and header/footer regions are stable;
- content truncation has an accessible expansion path;
- hover does not create sharp bottom bands or layout shift.

### Tables and lists

- compact readable row height;
- sticky headers only when they do not obscure focus/content;
- primary detail action is row navigation when accessible;
- raw UUIDs are prohibited;
- pagination/filter state remains stable where operationally required.

### Forms

- field, label, helper and error relationships are explicit;
- no scrollbar inside ordinary inputs;
- textarea uses bounded auto-grow or named internal scroll;
- required state is not communicated by color alone;
- validation preserves entered values and focus context.

### Modals, drawers and menus

- render in the correct portal/layer;
- trap and restore focus;
- prevent background interaction and accidental double scroll;
- remain usable on mobile and at zoom;
- include loading, error, success, unsaved and destructive states as applicable.

## 6. Token approval record

The global visual board must produce a token schedule containing:

- semantic token name;
- Light value;
- Dark value;
- component/state usage;
- contrast result where applicable;
- source reference/version;
- owner approval date;
- implementation variable mapping after Z7 classification.

Until that schedule is approved, this document defines constraints and names only; it does not authorize arbitrary numeric or color literals.

```text
SEMANTIC TOKEN FAMILIES: DEFINED
FINAL COLOR VALUES: OPEN
FINAL SPACING/SIZE VALUES: OPEN EXCEPT ACCESSIBILITY MINIMUMS
GLOBAL REFERENCE: REQUIRED
PAGE IMPLEMENTATION AUTHORIZED: NO
MAIN/PRODUCTION ACTION: NONE
```
