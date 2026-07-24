# ORCA Z3 — Target Information Architecture and Navigation Contract

- **Document ID:** ORCA-Z3-IA-001
- **Version:** 0.9 — Owner Visual Review Candidate
- **Date:** 2026-07-22
- **Status:** `TEXT CONTRACT COMPLETE / VISUAL APPROVAL REQUIRED`
- **Operating model:** `SINGLE INDEPENDENT COMPANY`
- **Production action authorized:** `false`

## 1. Purpose

Define the target information architecture and navigation for ORCA from the approved capability/process model and Z2 domain contracts, without treating current routes as automatically correct.

Route names below are target proposals. Z7 will classify existing routes/components as `KEEP`, `ADAPT`, `REBUILD`, `RETIRE`, `MISSING`, `DEFER`, or `NOT_PROVEN`.

## 2. Global product shell

The authenticated product uses one stable internal shell:

- right-side primary navigation in Arabic/RTL;
- top utility bar for current context, search, notifications, help, and account;
- content title/summary/action region;
- page-local filters/tabs only when they represent the same business context;
- no duplicate global and page navigation;
- role/scope-aware entries, enforced again on the server;
- persistent light/dark preference;
- no public SaaS tenant switcher or subscription navigation.

### Global utility surfaces

| Surface | Purpose | Rules |
|---|---|---|
| Global search | Find customers, references, property/unit, contract, invoice, task | Scope-filtered; no unauthorized result metadata |
| Notifications | Actionable events and approvals | Opening an item stays on source context; no unwanted automatic return |
| Command/quick create | Create permitted lead/task/appointment etc. | Options derive from permissions; no universal super-menu |
| Context indicator | Company/branch/department/team/resource scope | Single company; no independent tenant selector |
| Account menu | Profile, theme, sign out | Security/session actions explicit |
| Help | Role-aware guidance/runbook links | No exposure of sensitive diagnostics |

## 3. Primary navigation groups

### NAV-01 — Overview

- Executive Dashboard
- Daily Operations Center
- Personal Work Queue

### NAV-02 — Customers and Sales

- Customers & Leads
- Opportunities
- Tours & Appointments
- Offers & Reservations

### NAV-03 — Inventory and Projects

- Properties & Inventory
- Projects
- Availability / Commitments

### NAV-04 — Contracts and Finance

- Contracts
- Invoices & Installments
- Payment Evidence & Reconciliation
- Settlements & Refund Requests

### NAV-05 — Work and Service

- Tasks & Approvals
- Customer Support
- Communications
- Documents

### NAV-06 — Insights

- Reports & KPIs
- Revenue/Integrity Exceptions
- AI Assistance (only when policy/configured)

### NAV-07 — Administration

- Users & Organization
- Roles & Permissions
- Integrations & Providers
- Templates & Policies
- Compliance Evidence
- Platform Health & Audit
- Settings

Navigation items are hidden or disabled only for usability; server authorization remains authoritative.

## 4. Target route hierarchy proposal

```text
/login
/app
  /dashboard
  /work
  /customers
    /[customerRef]
  /opportunities
    /[opportunityRef]
  /tours
    /[tourRef]
  /offers
    /[offerRef]
  /reservations
    /[reservationRef]
  /inventory
    /properties
      /[propertyRef]
    /units
      /[unitRef]
    /commitments
  /projects
    /[projectRef]
  /contracts
    /[contractRef]
  /finance
    /invoices
      /[invoiceRef]
    /installments
    /payments
    /reconciliation
    /settlements
    /refunds
  /tasks
    /[taskRef]
  /approvals
  /support
    /tickets/[ticketRef]
  /communications
    /conversations/[conversationRef]
  /documents
  /reports
  /exceptions
  /ai-assistance
  /admin
    /organization
    /users
    /access
    /integrations
    /templates
    /privacy-retention
    /compliance
    /audit
    /health
    /settings
```

The final implementation may preserve current `/operations/*` URLs through adaptation or redirects. This is decided in Z7; no route migration is authorized here.

## 5. Context and detail navigation

### Customer detail

Recommended tabs, each as an independent visual/functional contract:

1. Overview
2. Activity & Communication
3. Opportunities
4. Tours
5. Offers & Reservations
6. Contracts & Finance summary
7. Tasks
8. Documents
9. History/Audit (permission-gated)

### Property/unit detail

1. Overview
2. Availability & Commitments
3. Pricing History
4. Documents & Evidence
5. Tours/Offers
6. Contracts/Finance links
7. Events/Audit

### Project detail

1. Overview
2. Phases & Milestones
3. Buildings/Zones
4. Units & Availability
5. Pricing
6. Reservations/Contracts
7. Documents
8. Risks
9. Reports
10. History/Audit

### Contract detail

1. Overview
2. Parties
3. Versions & Terms
4. Approvals
5. Signature Evidence
6. Obligations/Invoices
7. Documents
8. Amendments/Termination
9. Audit

### Invoice/payment/reconciliation detail

Use related but distinct detail contracts; do not compress all financial states into one oversized card.

## 6. Master/detail interaction model

For operational queues:

- RTL master list on the left and detail panel on the right, matching the established ORCA rule;
- list and detail remain independently scrollable where needed, with visually hidden scrollbars and no double body scroll;
- selection is represented by row state, keyboard focus, and URL/deep-link where practical;
- detail panel has a stable header and action hierarchy;
- mobile collapses to list → full detail navigation, not cramped dual columns;
- empty selection, no results, permission denied, loading, stale data, and error are distinct states.

For analytical pages, full-width dashboards/tables may replace master/detail when detail is not the primary workflow.

## 7. Action hierarchy

- **Primary blue:** one principal page/flow action.
- **Accent gold:** exceptional owner-approved emphasis only; not a competing default primary.
- **Secondary outline:** supporting actions.
- **Ghost:** low-risk contextual actions.
- **Destructive:** explicit red treatment, reason, permission, and confirmation proportional to impact.

Every action has:

- Arabic verb-first label;
- minimum 44px target;
- loading/disabled/success/error behavior;
- keyboard/focus state;
- permission/precondition explanation where blocked;
- no action based solely on hover.

## 8. Navigation state and safety

- Filters, tabs, selection, and pagination should be URL-addressable when this improves recovery/shareability.
- Browser back restores meaningful product state without undoing completed business actions.
- Opening a notification navigates to and remains on the source item.
- Unsaved form state warns before destructive navigation.
- Sensitive URLs use human references where possible and never expose data outside authorization.
- Deep links return a safe not-found/unauthorized state without revealing existence.

## 9. Responsive contract

| Viewport | Navigation | Content behavior |
|---|---|---|
| Mobile | Drawer/sheet, closed by default | Single-column; list then detail; sticky primary action only when safe |
| Tablet | Collapsible side navigation | One or two columns based on workflow; no squeezed desktop tables |
| Desktop | Stable RTL side navigation | Master/detail or full-width operational layout |
| Wide desktop | Constrained readable content or purposeful expanded data grid | No uncontrolled empty-space card stretching |

## 10. Accessibility contract

- semantic landmarks: header/nav/main/aside where appropriate;
- skip link to main content;
- visible focus not obscured by sticky bars;
- logical RTL tab/keyboard order;
- native elements before ARIA;
- accessible names for icons/actions;
- status announcements for async changes;
- no color-only state indication;
- contrast and target size aligned with WCAG 2.2 AA;
- tables have headers/captions and responsive alternative when necessary;
- modals trap focus, restore focus, support Escape when safe, and never nest uncontrolled dialogs.

## 11. Owner visual decisions required

1. Confirm global shell density and navigation width.
2. Confirm target route naming/Arabic labels.
3. Approve the independent visual reference for each page/tab/surface before implementation.
4. Confirm whether executive dashboard and daily operations remain separate or combined.
5. Confirm mobile priorities for the first release.

Until approval, the safe default is the existing closed ORCA visual language as a comparison baseline only, not automatic target approval.

## 12. Decision

```text
TARGET IA: COMPLETE AS TEXT CONTRACT
PRIMARY NAVIGATION GROUPS: 7
TARGET ROUTE HIERARCHY: PROPOSED
DETAIL TAB CONTRACTS: PROPOSED
MASTER/DETAIL AND RESPONSIVE RULES: DEFINED
VISUAL REFERENCES: REQUIRED / NOT APPROVED
RUNTIME CHANGE: NONE
PRODUCTION ACTION: NONE
```
