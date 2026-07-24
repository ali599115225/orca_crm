# ORCA Z3 — Visual Reference Production Queue

- **Document ID:** ORCA-Z3-VIS-QUEUE-001
- **Version:** 1.0 — Unpublished planning queue
- **Date:** 2026-07-22
- **Status:** `QUEUE DEFINED / REFERENCES NOT YET APPROVED`
- **Production action authorized:** `false`

## 1. Queue rule

One item equals one named visual contract. A parent page may not grant approval to its tabs or overlays. Overlays are produced with the first parent journey that requires them, but retain their own approval IDs.

## 2. Priority criteria

Order is based on:

1. cross-page dependency;
2. business and integrity criticality;
3. frequency of use;
4. number of dependent pages/tabs/overlays;
5. current visual risk such as inflated cards, empty mass, unstable layout or conflicting patterns;
6. ability to reduce later rework.

## 3. Reference waves

### Wave V0 — shared foundation

| Order | Contract | Output |
|---:|---|---|
| 1 | Global shell | navigation, page header, workspace, Light/Dark, desktop/mobile |
| 2 | Universal list/table | density, filters, row selection, pagination, empty/error |
| 3 | Universal master/detail | RTL direction, list/detail widths, responsive transition |
| 4 | Universal form | labels, validation, help, disabled/read-only, submit states |
| 5 | Universal modal/drawer | portal, stacking, focus, mobile, unsaved/destructive states |
| 6 | Universal state board | loading, empty, filtered-empty, error, denied, not found, stale, provider states |

### Wave V1 — management and daily work

1. `PG-002` Executive Dashboard.
2. `PG-003` Daily Operations.
3. `PG-004` Personal Work Queue.

These establish KPI, exception, queue and action-density patterns.

### Wave V2 — customer spine

1. `PG-005` Customers & Leads.
2. `PG-006` Customer Detail shell/header and tab navigation only.
3. `TAB-CUS-01` Overview.
4. `TAB-CUS-02` Activity & Communication.
5. `TAB-CUS-07` Tasks.
6. `TAB-CUS-03` Opportunities.
7. `TAB-CUS-04` Tours.
8. `TAB-CUS-05` Offers & Reservations.
9. `TAB-CUS-06` Contracts & Finance.
10. `TAB-CUS-08` Documents.
11. `TAB-CUS-09` History/Audit.
12. `SUR-001` Create/Edit Lead.
13. Applicable `SUR-012`, `SUR-002`, `SUR-003`, `SUR-013` references remain independently approved.

Customer-detail mandatory constraint: cards and tab content use content-driven height. Empty states remain compact—approximately 160–220px when a numeric reference is helpful—and the page uses one root scroll. No fixed-height panel may fill the remaining screen merely to remove blank space.

### Wave V3 — inventory and projects

1. `PG-010` Properties & Inventory.
2. `PG-011` Property/Unit Detail and its independently split tab set.
3. `PG-012` Projects.
4. `PG-013` Project Detail shell.
5. `TAB-PRJ-01` through `TAB-PRJ-10`, one at a time.
6. `SUR-005` Reservation Conflict and applicable document/pricing actions.

### Wave V4 — tours, offers and commitments

1. `PG-008` Tours & Appointments.
2. `PG-009` Offers & Reservations.
3. `SUR-002` Schedule/Reschedule Tour.
4. `SUR-003` Create Offer Version.
5. `SUR-004` Approval Decision.
6. `SUR-005` Reservation Conflict.

### Wave V5 — contracts and finance

1. `PG-014` Contracts.
2. `PG-015` Contract Detail plus independently split tabs.
3. `PG-016` Invoices & Installments.
4. `PG-017` Payment Evidence.
5. `PG-018` Reconciliation.
6. `PG-019` Settlements & Refunds.
7. `SUR-006` through `SUR-011` independently.

### Wave V6 — operational collaboration

1. `PG-020` Tasks & Approvals.
2. `PG-021` Customer Support.
3. `PG-022` Communications.
4. `PG-023` Documents.
5. `SUR-012` Create/Edit Task.
6. `SUR-013` Upload Document.

### Wave V7 — insights and guarded assistance

1. `PG-024` Reports & KPIs.
2. `PG-025` Exceptions & Integrity.
3. `PG-026` AI Assistance.

### Wave V8 — administration and governance

1. `PG-027` Organization & Users.
2. `PG-028` Roles & Permissions.
3. `PG-029` Integrations & Providers.
4. `PG-030` Templates & Policies.
5. `PG-031` Privacy & Retention.
6. `PG-032` Compliance Evidence.
7. `PG-033` Audit.
8. `PG-034` Platform Health.
9. `PG-035` Settings.
10. `PG-036` Access Denied / Not Found.
11. `SUR-014` through `SUR-016` independently.

### Wave V9 — cross-system consistency

- responsive/mobile consistency;
- keyboard/focus order;
- Light/Dark token consistency;
- density and scroll-root audit;
- translation, date/time/currency and fallback audit;
- cross-page overlay stacking and navigation-context audit.

## 4. Work-in-progress limits

- Only one page or independent tab may be in implementation at a time unless file/surface boundaries are proven disjoint.
- Maximum three prompts per visual closure cycle: audit, implementation, final verification.
- No implementation prompt is created automatically before reference approval.
- A failed visual attempt is corrected within the same item; unrelated pages remain out of scope.

## 5. Current result

```text
REFERENCE WAVES: V0-V9
TOP-LEVEL PAGE CONTRACTS QUEUED: 36
CUSTOMER TABS QUEUED: 9
PROJECT TABS QUEUED: 10
CRITICAL OVERLAYS QUEUED: 16
OWNER-APPROVED TARGET REFERENCES: 0
IMPLEMENTATION AUTHORIZED ITEMS: 0
PRODUCTION ACTION: NONE
```
