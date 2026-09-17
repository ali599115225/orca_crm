# ORCA — Operations Page Contract

**Status:** LOCKED / REQUIRED  
**Scope:** Every user-visible route under `/operations/*`  
**Canonical visual reference:** Dashboard  
**Reference implementation:** `features/dashboard/components/DashboardHeader.tsx` and `features/dashboard/visual.ts`

## 1. Core Rule

ORCA has one visual and interaction contract across all user-visible Operations pages.

A page may differ in data and business behavior, but it must not invent a different shell, title-card hierarchy, action hierarchy, KPI language, panel language, table language, tab language, empty-state language, or dialog language.

Dashboard is the reference. Other Operations pages conform to it.

## 2. No Per-Page Patching

Per-page visual patching is prohibited as the normal implementation method.

If a page needs a capability that the shared contract does not provide:

1. extend the shared contract first;
2. update the shared primitive/token/component;
3. consume it from the page;
4. verify no regression in already closed pages.

Do not create one-off visual rules just to make one page look correct.

## 3. Shared Operations Contract

Target shared primitives:

- `OperationsPageShell`
- `OperationsPageHeader`
- `OperationsPageActions`
- `OperationsKpiGrid`
- `OperationsPanel`
- `OperationsDataRow`
- `OperationsTabs`
- `OperationsEmptyState`
- `OperationsDialog`

Until extraction is complete, pages must still follow the Dashboard reference implementation and its visual tokens.

## 4. Main Title Card

The Dashboard title area is the canonical reference.

Required behavior:

- same density and spacing hierarchy;
- eyebrow or breadcrumb above H1;
- H1 uses the shared Dashboard title scale;
- subtitle uses the shared secondary text hierarchy;
- actions occupy the opposite action area;
- responsive stacking follows Dashboard behavior;
- no page-specific oversized or compressed hero geometry.

The exact CSS class name is not the contract. The rendered Dashboard title-card behavior is the contract.

## 5. Action Hierarchy

Use the shared Dashboard action hierarchy:

- primary action -> shared primary button contract;
- secondary action -> shared secondary/bordered contract;
- refresh/retry icon action -> shared header icon-button contract when icon-only is sufficient;
- ghost action -> shared ghost contract;
- destructive action -> explicit destructive contract.

Do not introduce arbitrary page-specific primary colors.

## 6. KPI / Metric Contract

KPI cards follow the Dashboard metric contract:

- same surface/border hierarchy;
- same title/value/note structure;
- same icon-tile geometry;
- same hover/focus behavior when interactive;
- deterministic readable numeric formatting;
- real zero values must display as real zeros, not bullets/placeholders.

## 7. Lists / Tables / Rows

Operational lists and tables share one contract:

- consistent panel surface;
- consistent row density;
- row-click when the row represents one entity;
- keyboard focus;
- no redundant per-row action button when row-click is the approved behavior;
- hidden visual scrollbars only where the shared contract requires it;
- no UUID or raw technical identifier leakage.

### Platform Table Typography — LOCKED

This typography applies to every user-visible table or table-like operational grid under `/operations/*`:

- column headers: **12px**, strong weight;
- primary row values: **14px**;
- secondary/supporting row values: **11px**;
- status badges: **12px**;
- row action text: **12px**.

Rules:

- a page must not introduce `9px` or `10px` column headers;
- primary row values must not be reduced to tiny helper-text sizing;
- secondary metadata is the only table text allowed at the 11px supporting level;
- native `<table>` and CSS-grid tables use the same hierarchy;
- table typography is a shared platform contract and must not be overridden per page.

## 8. Tabs / Details

Detail tabs use the shared tab contract:

- one active style;
- one idle style;
- touch-safe targets;
- content remains inside the shared panel language;
- responsive overflow must not break the page.


### Navigation / Back Action — LOCKED

Detail-page navigation uses `OperationsBackAction`.

Rules:

- a detail page must not choose `ArrowLeft` / `ArrowRight` locally;
- Arabic and English back-arrow direction is owned by the shared component;
- Back belongs in the page/detail header action area, not inside the tab row;
- the shared action may navigate by `href` or a local view-state callback;
- pagination arrows, carousel arrows, wizard-step arrows, and message-list arrows are not Back actions and are outside this rule.

### Scroll Ownership / Height — LOCKED

The Operations page shell owns vertical scrolling by default.

Rules:

- ordinary list, detail, KPI, table, tab and content panels grow to their natural content height;
- ordinary panels must not introduce arbitrary `h-[...]` / `max-h-[...]` geometry simply to equalize cards;
- ordinary panels must not use their own `overflow-y-auto`;
- horizontal table overflow is allowed where data genuinely exceeds the available width;
- internal vertical scroll is allowed only for a declared bounded role:
  `log`, `conversation`, `menu`, or `dialog`;
- declared bounded scroll regions use `OperationsScrollRegion`;
- bounded scroll uses `overscroll-behavior-y: auto` so the page can continue scrolling at region boundaries;
- hiding the scrollbar never changes scroll ownership.

### Conversation Workspace — LOCKED

Email, WhatsApp and Helpdesk use the same conversation anatomy:

- the master/list side grows naturally with the page and must not be trapped inside an arbitrary `460px` viewport;
- the message/reply history alone uses `OperationsScrollRegion scrollRole="conversation"`;
- composer / reply controls stay outside the conversation scroll region;
- headers, context bars and actions stay outside the conversation scroll region;
- conversation scroll must chain vertically to the page at boundaries;
- no page may reintroduce local `overflow-y-auto` for the conversation history.

### Conversation Typography — LOCKED

Conversation typography is a separate contract from Platform Table Typography.
Email, WhatsApp and Helpdesk must consume the shared `operationsConversationTypography` roles instead of inventing page-local sizes.

- conversation list title: **14px Bold**;
- list secondary line: **12px**;
- metadata / date / time: **11px**;
- detail / message title: **16px Bold**;
- message body: **15px** with comfortable line-height;
- field labels (`From`, `To`, customer/context labels): **11px**;
- field values: **14px**;
- status badges: **11–12px**; the shared implementation uses **11px**;
- composer / reply input: **14px**.

The conversation contract must not alter Platform Table Typography or the default typography of generic Operations forms/panels.

## 9. Forms / Dialogs

Create/edit/confirm workflows use the shared dialog/modal contract.

Do not insert an ad-hoc full-width inline form merely because a form is needed.

Dialogs must preserve:

- opaque surface;
- viewport-safe bounds;
- RTL/LTR;
- keyboard/focus behavior;
- clear primary and cancel actions;
- truthful submit/loading/error state.

## 10. Functional Integrity

Visual unification must never weaken behavior.

For every page:

- reads remain connected to real data sources;
- mutations remain connected to real server/API actions;
- RBAC remains server-enforced;
- tenant/company scope remains enforced;
- routing remains deterministic;
- loading/error/empty states remain truthful;
- every visible action performs a real supported action.

Prohibited:

- dead buttons;
- fake success;
- mock mutation behavior presented as production;
- silent no-op controls;
- hiding functional defects with visual changes.

## 11. Page Closure Gate

A page is CLOSED only when all are true:

### Visual
- whole-page contract matches Operations shared contract;
- title/actions/KPIs/panels/lists/tabs/dialogs/empty states are coherent;
- RTL/LTR verified where applicable;
- dark/light verified where applicable;
- no unintended overflow or scrollbar;
- no technical identifier leakage.

### Functional
- initial load works;
- refresh/retry works where present;
- search/filter/pagination works where present;
- navigation/detail opening works;
- every visible mutation/control is wired to a real supported action;
- permission behavior is correct;
- loading/error/empty states are truthful.

### Final
`VISUAL PASS + FUNCTIONAL PASS + NO DEAD UI`

A passing TypeScript build or static test alone is not page closure.

## 12. Change Discipline

For page-unification work:

1. inspect the complete page and its real actions first;
2. map it to this contract;
3. implement one coherent page pass;
4. run targeted technical gates;
5. perform one visual verification;
6. perform functional verification;
7. close only after the closure gate passes.

Do not use repeated speculative patch attempts.

## 13. Repository Safety

This contract does not authorize Commit, Push, Deploy, Migration, reset, clean, or stash.

Those require explicit owner authorization.