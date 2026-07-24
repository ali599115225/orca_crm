# ORCA Z3 — UI Design System, Interaction, and Accessibility Contract

- **Document ID:** ORCA-Z3-UX-001
- **Version:** 0.9 — Owner Visual Review Candidate
- **Date:** 2026-07-22
- **Status:** `TEXT STANDARD COMPLETE / VISUAL TOKENS REQUIRE OWNER APPROVAL`
- **Production action authorized:** `false`

## 1. Design intent

ORCA is a high-density Arabic internal operating platform. Its interface must prioritize operational truth, next action, state, evidence, and safe recovery over decorative card volume.

The design language should feel professional, calm, and consistent across Light/Dark while preserving the existing ORCA identity only where Z7 confirms compliance.

## 2. Core principles

1. Clear hierarchy before decoration.
2. One obvious primary action per context.
3. Tables/lists for operational density; cards only for summaries, choices, or distinct objects.
4. Stable dimensions and layout across loading/content/state changes.
5. No uncontrolled card stretching or empty-space inflation.
6. RTL is native, not mirrored afterthought.
7. Every action exposes state, authority, consequence, and recovery.
8. No raw UUID, fabricated value, or false provider/financial status.
9. Accessibility and keyboard operation are part of the contract.
10. Page-level scroll is preferred; nested scroll exists only when workflow requires it, with hidden visual scrollbars and no double scroll.

## 3. Token model

Final numeric/color values require owner visual approval. The implementation must use semantic tokens rather than page-specific hard-coded colors.

### Color tokens

| Token family | Intended use |
|---|---|
| `background` / `surface` / `surface-raised` | shell, page, cards, overlays |
| `foreground` / `muted-foreground` | primary/secondary text |
| `border` / `divider` | structure without excessive boxes |
| `primary` | blue principal actions and selected emphasis |
| `accent` | gold exceptional emphasis, not competing default primary |
| `success` | verified completed/healthy states |
| `warning` | pending/attention/expiring states |
| `danger` | failed, blocked, destructive, critical exception |
| `info` | neutral system/provider/context information |
| `focus-ring` | visible keyboard focus in Light/Dark |

Rules:

- semantic meaning is preserved between Light/Dark;
- selected, hover, focus, disabled, and pressed states are distinct;
- gold hover must not replace blue primary semantics;
- status never relies on color alone;
- contrast targets WCAG 2.2 AA.

### Spacing and sizing

Use a bounded spacing scale. Recommended density:

- compact operational rows: 40–48px depending on content;
- controls/action targets: minimum 44px;
- page section spacing: consistent, not content-dependent stretching;
- card padding: compact/regular variants only;
- readable content max-width for forms/policies; purposeful full-width for grids/workspaces;
- border radius and elevation limited to a small semantic scale.

### Typography

- Arabic-first font stack approved for legibility and numerals;
- clear H1/H2/H3/body/label/meta hierarchy;
- no undersized metadata or low-contrast helper text;
- tabular numerals for finance/tables where supported;
- currency, percentage, date/time formats explicit and localized consistently;
- English technical identifiers only when necessary and secondary.

## 4. Page anatomy

Recommended order:

1. Breadcrumb/context where needed.
2. Page title and concise purpose/state.
3. Principal action and bounded secondary actions.
4. Key alerts, blockers, or provider/regulatory state.
5. Filters/search/view controls.
6. Main operational content.
7. Secondary context/audit/help.

Do not wrap every region in a card. Use spacing, dividers, grouped headers, and surface contrast deliberately.

## 5. Card contract

Cards are appropriate for:

- KPI summaries;
- discrete decision/action summaries;
- compact object previews;
- configuration/provider status;
- meaningful empty state.

Cards are not the default replacement for:

- long operational lists;
- relational data grids;
- dense history;
- every form section;
- full-height blank containers.

Rules:

- logical min/max height, no uncontrolled fill;
- equal-height rows only when content/action structure benefits;
- overflow solved at content/layout source;
- hover cannot create sharp clipped borders or layout movement;
- selected state differs from hover;
- click target/keyboard behavior is explicit.

## 6. Table/list contract

- sticky header only when it does not obscure focus/content;
- first meaningful column is the human reference/name;
- statuses use text + icon/badge;
- actions are limited and prioritized;
- row click and explicit actions remain accessible;
- sorting/filtering/pagination are visible and URL/state recoverable where useful;
- numbers align consistently;
- finance columns show currency and sign clearly;
- empty rows do not preserve huge blank card height;
- mobile uses a deliberate compact list/detail alternative rather than squeezed columns.

## 7. Form contract

- one logical question per field/group;
- visible label; placeholder is not a label;
- required/optional state communicated without excessive asterisks;
- helper and validation text placed consistently;
- errors summarized and linked to fields for long forms;
- data type/input mode/autocomplete appropriate;
- date/time shows timezone meaning;
- money uses currency, decimal, and source context;
- selects/autocomplete support keyboard and accessible names;
- text areas auto-grow within bounded limits; no input scrollbars;
- save/cancel hierarchy stable;
- unsaved changes warning;
- server validation and concurrency errors have recovery paths;
- sensitive fields never echo secrets and explain storage/ownership boundaries.

## 8. Tabs contract

- tabs represent sibling views of one context, not primary application navigation;
- each independent tab has its own content/state/visual contract;
- selected tab is obvious in Light/Dark and keyboard focus remains visible;
- tab list supports arrow-key navigation and proper semantics;
- tab labels remain short and Arabic-consistent;
- counts are meaningful and not stale/misleading;
- tab content does not change page header/action unpredictably without context;
- URL/deep-link state used when recovery/sharing matters.

## 9. Master/detail contract

- RTL rule retained: master list left, detail right on desktop;
- detail right panel receives visual priority without making list unusable;
- both panes have stable min/max widths;
- internal scroll only when necessary, scrollbars visually hidden while mouse/touch/keyboard scrolling remains;
- no nested double scrolling;
- list selection, focus, and route/deep link agree;
- mobile uses separate navigation to detail;
- detail header/actions remain stable across tabs.

## 10. Modal, drawer, and overlay contract

- rendered through a portal above shell stacking contexts;
- focus moves into the surface and returns to trigger;
- accessible title/description;
- Escape/backdrop behavior depends on risk and unsaved state;
- no nested uncontrolled modals;
- destructive/high-risk confirmation names exact effect and requires reason/authority;
- long complex workflows become full-page or full-screen rather than cramped modal;
- mobile layout has safe viewport height and keyboard handling;
- background scroll locked without losing previous position;
- loading does not close or duplicate submission;
- success returns user to meaningful context.

## 11. State and feedback contract

### Loading

- skeleton approximates final layout;
- no layout shift from tiny placeholder to oversized content;
- action-level loading is local and prevents duplicate request;
- background refresh preserves readable existing data and marks staleness.

### Empty

- explain what is empty and why;
- show one permitted next action or recovery;
- distinguish global empty from filtered-empty and unauthorized.

### Error

- Arabic user-safe summary;
- correlation/reference only when useful, no secrets;
- retry for retryable failures;
- retain user input when safe;
- distinguish validation, conflict, provider, permission, and system failure.

### Success

- confirm meaningful result and reference;
- do not overuse transient toasts for evidence-critical actions;
- keep user in source context;
- update list/detail consistently.

### Provider state

- `غير مربوط / يحتاج إعداد / بيانات ناقصة / متصل / فشل الاتصال / حالة غير معروفة`;
- provider request state separate from business outcome;
- no false sent/signed/paid/synced claim.

## 12. Status/badge contract

- one semantic dictionary across domains;
- Arabic label + optional icon;
- compact and readable;
- avoid badge overload for normal metadata;
- state definitions come from Z2, not page-specific copy;
- archived/suspended/blocked/pending/failed/verified are visually distinct;
- unknown is shown as `غير محدد` or explicit unknown state, never guessed.

## 13. Date, time, number, and money contract

- storage/event truth is UTC; user display defaults to Asia/Riyadh;
- operational English-numeric compact date may use `dd/mm/yy` where already approved; official documents follow owner-approved template;
- display timezone when ambiguity matters;
- relative time supplements, not replaces, exact timestamp for audit/finance;
- SAR formatting consistent; currency always explicit in mixed contexts;
- percentages show basis and freshness;
- Arabic/Latin numeral choice is globally consistent and owner-approved;
- no silent rounding for financial evidence.

## 14. Accessibility acceptance

Every critical page/surface must pass:

- semantic landmark/heading review;
- keyboard-only end-to-end path;
- visible, non-obscured focus;
- screen-reader names/states/errors;
- logical RTL reading and focus order;
- contrast review in Light/Dark;
- target-size review;
- zoom/reflow and mobile viewport review;
- reduced-motion support;
- table/form/modal/tab pattern review;
- accessible authentication and error recovery;
- automated checks plus manual verification.

## 15. Visual verification protocol

For every target page/tab:

### Pass 1 — structure

- shell, hierarchy, grid, widths/heights, main action, master/detail, responsive behavior, scroll architecture.

### Pass 2 — details

- spacing, typography, colors, badges, selected/hover/focus/disabled, missing fields/actions, Light/Dark, RTL, dates/money, empty/loading/error/provider states, forms/modals/mobile.

Implementation is visually closed only when independent verification matches the owner-approved reference. Agent reports alone are insufficient.

## 16. Open owner visual decisions

- exact color/token values and typography family;
- shell width/density and dashboard composition;
- numeric/date presentation preference where alternatives exist;
- page-by-page and tab-by-tab visual references;
- mobile priority/reference states.

## 17. Decision

```text
DESIGN PRINCIPLES: DEFINED
SEMANTIC TOKEN MODEL: DEFINED / VALUES OPEN
PAGE/CARD/TABLE/FORM/TAB/MASTER-DETAIL CONTRACTS: DEFINED
MODAL/STATE/PROVIDER CONTRACTS: DEFINED
WCAG 2.2 AA ACCEPTANCE: DEFINED
VISUAL VERIFICATION PROTOCOL: DEFINED
OWNER VISUAL APPROVAL: REQUIRED
RUNTIME CHANGE: NONE
PRODUCTION ACTION: NONE
```
