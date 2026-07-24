# ORCA Z3 — Target Page and Surface Registry

- **Document ID:** ORCA-Z3-PAGE-001
- **Version:** 0.9 — Owner Visual Review Candidate
- **Date:** 2026-07-22
- **Status:** `TEXT CONTRACTS READY / VISUAL REFERENCES OPEN`
- **Production action authorized:** `false`

## 1. Registry rules

Each page, tab, drawer, modal, and critical state is an independent contract with:

- target capability/process/domain;
- primary actors and permissions;
- purpose and primary action;
- information hierarchy;
- fields/columns/actions;
- loading, empty, error, permission, stale, and success states;
- responsive and RTL behavior;
- accessibility acceptance;
- visual-reference status;
- current-system mapping deferred to Z7.

No page is visually closed from a filename, report, test name, or historical screenshot alone.

## 2. Top-level page contracts

| ID | Target page | Purpose | Primary actors | Principal surfaces | Visual status |
|---|---|---|---|---|---|
| PG-001 | Login | Secure authentication and recovery entry | All users | login form, error, session-expired, support link | Existing closed page is comparison evidence; target review required |
| PG-002 | Executive Dashboard | Management outcomes, risks, approvals, performance | Owner/executive | KPI cards, decision center, exceptions, trends | Reference required |
| PG-003 | Daily Operations | Today’s queues, tasks, appointments, messages, incidents | Managers/operators | operational scorecards, work queues, quick actions | Existing closed page comparison; target review required |
| PG-004 | Personal Work Queue | My tasks, approvals, tours, follow-ups | All operational users | prioritized list + detail | Reference required |
| PG-005 | Customers & Leads | Search, filter, assign, progress, create customers/leads | Sales/ops | master list + detail preview + create/edit dialog | Existing closed list comparison; target review required |
| PG-006 | Customer Detail | Complete customer/opportunity context | Scoped sales/ops/support | header summary + 9 independent tabs | Each tab requires independent reference |
| PG-007 | Opportunities | Qualified pipeline and next actions | Sales/manager | stage/list view, filters, detail | Reference required |
| PG-008 | Tours & Appointments | Schedule, conduct, record outcome | Sales/ops | calendar/list/master-detail, schedule/reschedule dialog | Existing closed comparison; target review required |
| PG-009 | Offers & Reservations | Versioned offers, approvals, negotiation, commitment | Sales/approver | list/detail, version timeline, approval panel, create dialog | Existing closed comparison; target review required |
| PG-010 | Properties & Inventory | Trusted assets, availability, readiness | Inventory/ops | master list + detail + unit modal | Existing closed comparison; target review required |
| PG-011 | Property/Unit Detail | Evidence, availability, pricing, commitments | Inventory/ops | header + 7 tabs | Independent references required |
| PG-012 | Projects | Project portfolio and operational status | Project/ops | list/table + filters + project summary | Existing partial comparison; redesign reference required |
| PG-013 | Project Detail | Phases, buildings, units, progress, risks | Project/ops | header + 10 tabs | Independent references required |
| PG-014 | Contracts | Contract pipeline and exceptions | Contract/approvers | queue/table + status filters + detail navigation | Reference required |
| PG-015 | Contract Detail | Version, parties, approval, signature, obligations | Contract/finance/auditor | header + 9 tabs + guarded actions | Historical comparison only; target reference required |
| PG-016 | Invoices & Installments | Obligations, due/overdue, status, issue flow | Finance | table/master-detail, invoice modal/detail | Existing rental comparison; unified target reference required |
| PG-017 | Payment Evidence | Record and verify external/manual evidence | Finance | evidence queue, upload/reference form, verification detail | Reference required |
| PG-018 | Reconciliation | Match evidence, allocations, exceptions | Finance/auditor | two-sided reconciliation workspace, exception drawer | Existing comparison; target reference required |
| PG-019 | Settlements & Refunds | Request, approve, execute evidence, reconcile | Finance/approvers | queue + detail + approval timeline | Existing settlement comparison; target reference required |
| PG-020 | Tasks & Approvals | Assign, execute, escalate, approve | All operators/managers | master/detail, filters, create/edit, approval drawer | Existing partial comparison; target reference required |
| PG-021 | Customer Support | Tickets, SLAs, assignments, resolution | Support/ops | ticket list + conversation/detail | Existing partial comparison; target reference required |
| PG-022 | Communications | Channel-aware conversations and delivery truth | Sales/support | conversation list + thread + customer context | Email/WhatsApp partial comparison; unified target references required |
| PG-023 | Documents | Secure records, versions, upload, evidence packages | Scoped users/auditor | library/table, filters, upload/version/detail | Historical comparison; target reference required |
| PG-024 | Reports & KPIs | Trusted metrics and controlled exports | Managers/owner | report catalog, filters, charts/tables, as-of/freshness | Reference required |
| PG-025 | Exceptions & Integrity | Revenue/data/workflow anomalies and action queue | Managers/finance/audit | radar/queue, detail, assignment, evidence | Current not-proven comparison; target reference required |
| PG-026 | AI Assistance | Human-reviewed summaries/recommendations | Allowed users | use-case selector, context disclosure, output/review | Reference required; hidden if not configured |
| PG-027 | Organization & Users | Units, assignments, user lifecycle | Owner/admin | hierarchy + user list/detail + joiner/mover/leaver flows | Reference required |
| PG-028 | Roles & Permissions | Roles, permissions, scopes, conflicts, review | Owner/admin/auditor | matrix, role detail, assignment review | Reference required |
| PG-029 | Integrations & Providers | Provider readiness, ownership, setup, health | Owner/admin/technical | provider cards/table, status, requirements, test results | Existing settings comparison; target reference required |
| PG-030 | Templates & Policies | Approved document/message/workflow templates | Authorized admins | catalog, version detail, approval state | Reference required |
| PG-031 | Privacy & Retention | Processing purposes, rights, retention, holds | Owner/privacy/admin | registers, request queue, retention matrix | Reference required |
| PG-032 | Compliance Evidence | Applicability, licenses, evidence, expiries | Owner/compliance | applicability matrix + evidence register | Historical comparison; target reference required |
| PG-033 | Audit | Search sensitive events and export evidence | Auditor/admin | filterable audit table + event detail | Reference required |
| PG-034 | Platform Health | Health, jobs, incidents, restore evidence | Admin/technical | service status, job history, alerts, runbook links | Historical comparison; target reference required |
| PG-035 | Settings | Company-safe configuration and preferences | Owner/admin/users by section | sectioned forms; no mixed unrestricted settings page | Existing partial comparison; target reference required |
| PG-036 | Access Denied / Not Found | Safe unauthorized/nonexistent handling | All users | neutral message, allowed recovery actions | Reference required |

## 3. Customer detail tab contracts

| ID | Tab | Primary content | Primary action | Required states |
|---|---|---|---|---|
| TAB-CUS-01 | Overview | identity, assignment, qualification, interests, next action | Edit permitted summary | loading, incomplete, duplicate warning, archived |
| TAB-CUS-02 | Activity & Communication | chronological verified activities/messages | Add activity / permitted message | provider not configured, failed attempt, empty |
| TAB-CUS-03 | Opportunities | active/closed pursuits, stages, values | Create opportunity | no qualified context, empty, lost/won |
| TAB-CUS-04 | Tours | upcoming/past appointments and outcomes | Schedule tour | conflict, provider sync failed, no-show |
| TAB-CUS-05 | Offers & Reservations | versions, expiry, approval, commitment | Create offer | approval pending, expired, inventory conflict |
| TAB-CUS-06 | Contracts & Finance | linked contracts, obligations, balances summary | Open contract/invoice | no contract, disputed, overdue |
| TAB-CUS-07 | Tasks | customer-related accountable work | Create task | overdue, blocked, no tasks |
| TAB-CUS-08 | Documents | scoped customer/transaction records | Upload permitted file | quarantine, scan failed, empty |
| TAB-CUS-09 | History/Audit | assignments, merges, state changes, sensitive actions | Export if permitted | restricted, empty, loading |

## 4. Project detail tab contracts

| ID | Tab | Core content |
|---|---|---|
| TAB-PRJ-01 | Overview | status, owner, progress source/date, key counts, risks |
| TAB-PRJ-02 | Phases & Milestones | ordered phases, milestones, delays, evidence |
| TAB-PRJ-03 | Buildings/Zones | hierarchy and operational state |
| TAB-PRJ-04 | Units & Availability | stable units, inventory linkage, commitments |
| TAB-PRJ-05 | Pricing | effective price versions and approvals |
| TAB-PRJ-06 | Reservations/Contracts | commitments and transaction progression |
| TAB-PRJ-07 | Documents | project evidence, plans, approved versions |
| TAB-PRJ-08 | Risks | risk owner, severity, response, residual status |
| TAB-PRJ-09 | Reports | project-specific trusted KPIs |
| TAB-PRJ-10 | History/Audit | structural/status/pricing/action history |

## 5. Critical dialogs, drawers, and overlays

| ID | Surface | Type | Trigger/precondition | Safety requirements | Visual status |
|---|---|---|---|---|---|
| SUR-001 | Create/Edit Lead | Modal | permission + source | portal, focus trap, duplicate feedback, unsaved warning | Existing comparison; target required |
| SUR-002 | Schedule/Reschedule Tour | Modal | eligible customer/inventory | conflict/timezone, accessible date/time, provider state | Existing partial comparison; target required |
| SUR-003 | Create Offer Version | Modal/full-screen form | opportunity + inventory | price/source, exception/approval preview, version clarity | Existing partial comparison; target required |
| SUR-004 | Approval Decision | Drawer/modal | eligible approver + exact version | subject summary, conflict warning, reason, no hidden mutation | Target required |
| SUR-005 | Reservation Conflict | Drawer/dialog | competing commitment | current commitments, safe alternatives, no blind override | Target required |
| SUR-006 | Contract Version Review | Full-screen/detail | draft/review state | diff, parties, evidence, approvals, immutable final version | Target required |
| SUR-007 | Signature Evidence | Modal/drawer | approved contract | provider/manual mode, evidence status, no false signed state | Target required |
| SUR-008 | Invoice Detail/Issue | Modal/detail | contract obligation | exact amounts, currency, issue state, delivery separate | Existing comparison; target required |
| SUR-009 | Record Payment Evidence | Modal | finance permission | no card data, source/ref/amount/time, verification pending | Target required |
| SUR-010 | Reconciliation Exception | Drawer | mismatch | side-by-side amounts, source, proposed controlled action | Target required |
| SUR-011 | Refund Request/Decision | Drawer/workflow | eligible payment | limits, SoD, reason, destination reference, evidence | Target required |
| SUR-012 | Create/Edit Task | Modal | scoped context | owner, due date, priority, dependencies, evidence | Existing partial comparison; target required |
| SUR-013 | Upload Document | Modal | context + permission | type/size, classification, quarantine/scan feedback | Target required |
| SUR-014 | Provider Setup/Test | Drawer/wizard | owner-approved provider | ownership checklist, secret path, sandbox, no raw secret echo | Target required |
| SUR-015 | Access Assignment | Drawer | admin authority | role/scope/dates/conflicts/approver | Target required |
| SUR-016 | Destructive/High-Risk Confirmation | Dialog | eligible command | exact impact, reason, authority, typed confirmation only when proportional | Target required |

## 6. Universal state contract

Every relevant page/surface must explicitly support:

- initial loading/skeleton;
- background refresh without layout jump;
- empty with meaningful next action;
- no filtered results;
- unauthorized/insufficient scope;
- not found without existence leakage;
- validation errors mapped to fields and summary;
- stale/concurrency conflict with reload/compare path;
- provider `NOT_CONFIGURED`;
- provider retryable/final/unknown failure;
- regulatory evidence required;
- offline/network interruption where relevant;
- success confirmation without losing context;
- archived/suspended/read-only state;
- partial data with `غير محدد` rather than raw IDs or fabricated values.

## 7. Data-grid and list contract

- clear Arabic column labels and units;
- meaningful reference, not UUID;
- row click for primary detail where accessible; redundant per-row button only when needed;
- keyboard row navigation/action;
- persistent filters/sort/pagination when appropriate;
- bulk actions only when domain and permission allow;
- dense but readable rows; no inflated cards replacing operational tables without reason;
- horizontal overflow handled deliberately; no hidden inaccessible content;
- empty and error states remain inside the page contract.

## 8. Visual-reference workflow

For each page or independent tab:

1. derive reference from this text contract and target design system;
2. include populated, empty, loading, error, permission, provider, Light/Dark, desktop/mobile states as applicable;
3. owner reviews/approves the reference;
4. implementation prompt is restricted to that contract;
5. independent visual verification compares UI to approved reference;
6. only then may status become `VISUALLY_CLOSED`.

The current registry deliberately keeps all target references open. Existing `CLOSED_RETAINED` evidence is comparison input for Z7, not automatic target closure.

## 9. Registry result

```text
TOP-LEVEL PAGE CONTRACTS: 36
CUSTOMER DETAIL TAB CONTRACTS: 9
PROJECT DETAIL TAB CONTRACTS: 10
CRITICAL OVERLAY CONTRACTS: 16
UNIVERSAL STATE CONTRACT: DEFINED
VISUAL REFERENCES APPROVED: 0 TARGET REFERENCES IN THIS GATE
Z3 TEXT REGISTRY: COMPLETE
Z3 VISUAL APPROVAL: OPEN
```
