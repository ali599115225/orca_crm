# ORCA Z3 — Visual Reference and Approval Register

- **Document ID:** ORCA-Z3-VIS-001
- **Version:** 0.9
- **Date:** 2026-07-22
- **Status:** `OPEN / OWNER VISUAL APPROVAL REQUIRED`
- **Production action authorized:** `false`

## 1. Purpose

Track the target visual-reference lifecycle for every Release 1 page, independent tab, critical overlay, and required state.

Existing foundation statuses such as `CLOSED_RETAINED`, `PARTIAL`, or `HISTORICAL_EVIDENCE_ONLY` are comparison evidence for Z7. They do not automatically approve the zero-based target design.

## 2. Approval states

- `TEXT_CONTRACT_READY`
- `REFERENCE_REQUIRED`
- `REFERENCE_DRAFTED`
- `OWNER_CHANGES_REQUESTED`
- `OWNER_APPROVED`
- `IMPLEMENTED`
- `INDEPENDENTLY_VERIFIED`
- `VISUALLY_CLOSED`
- `DEFERRED_WITH_APPROVAL`

No item may jump from historical/current evidence directly to `VISUALLY_CLOSED`.

## 3. Required reference set per item

Each applicable reference must show:

- populated desktop Light;
- populated desktop Dark;
- mobile/responsive behavior;
- loading and background refresh;
- empty and filtered-empty;
- validation/error and recovery;
- unauthorized/read-only;
- provider `NOT_CONFIGURED`/failure/unknown where applicable;
- archived/suspended/stale/concurrency state where applicable;
- critical form/modal/drawer action states;
- hover, selected, focus, disabled, and destructive treatment.

References may combine states in one annotated board when legibility is preserved.

## 4. Page visual register

| Page IDs | Area | Items | Current target status | Current-system evidence use |
|---|---|---:|---|---|
| PG-001 | Authentication | 1 | REFERENCE_REQUIRED | Login closed evidence is comparison only |
| PG-002..004 | Overview/work | 3 | REFERENCE_REQUIRED | Dashboard/operations evidence comparison only |
| PG-005..007 | Customers/opportunities | 3 | REFERENCE_REQUIRED | Leads list evidence; customer tabs partial |
| PG-008..009 | Tours/offers/reservations | 2 | REFERENCE_REQUIRED | Current closed evidence comparison only |
| PG-010..013 | Inventory/projects | 4 | REFERENCE_REQUIRED | Properties closed; projects partial comparison |
| PG-014..019 | Contracts/finance | 6 | REFERENCE_REQUIRED | Rental/sales historical/closed surfaces comparison only |
| PG-020..023 | Tasks/support/comms/documents | 4 | REFERENCE_REQUIRED | Existing partial/historical evidence comparison only |
| PG-024..026 | Reports/exceptions/AI | 3 | REFERENCE_REQUIRED | Dashboard/revenue current evidence comparison only |
| PG-027..035 | Administration | 9 | REFERENCE_REQUIRED | Settings/compliance/health current evidence comparison only |
| PG-036 | Safe denied/not-found | 1 | REFERENCE_REQUIRED | Existing generic states comparison only |

```text
TARGET TOP-LEVEL REFERENCES REQUIRED: 36
TARGET TOP-LEVEL OWNER APPROVED: 0
```

## 5. Independent tab visual register

### Customer detail — 9 contracts

| ID | Status |
|---|---|
| TAB-CUS-01 Overview | REFERENCE_REQUIRED |
| TAB-CUS-02 Activity & Communication | REFERENCE_REQUIRED |
| TAB-CUS-03 Opportunities | REFERENCE_REQUIRED |
| TAB-CUS-04 Tours | REFERENCE_REQUIRED |
| TAB-CUS-05 Offers & Reservations | REFERENCE_REQUIRED |
| TAB-CUS-06 Contracts & Finance | REFERENCE_REQUIRED |
| TAB-CUS-07 Tasks | REFERENCE_REQUIRED |
| TAB-CUS-08 Documents | REFERENCE_REQUIRED |
| TAB-CUS-09 History/Audit | REFERENCE_REQUIRED |

### Project detail — 10 contracts

| ID | Status |
|---|---|
| TAB-PRJ-01 Overview | REFERENCE_REQUIRED |
| TAB-PRJ-02 Phases & Milestones | REFERENCE_REQUIRED |
| TAB-PRJ-03 Buildings/Zones | REFERENCE_REQUIRED |
| TAB-PRJ-04 Units & Availability | REFERENCE_REQUIRED |
| TAB-PRJ-05 Pricing | REFERENCE_REQUIRED |
| TAB-PRJ-06 Reservations/Contracts | REFERENCE_REQUIRED |
| TAB-PRJ-07 Documents | REFERENCE_REQUIRED |
| TAB-PRJ-08 Risks | REFERENCE_REQUIRED |
| TAB-PRJ-09 Reports | REFERENCE_REQUIRED |
| TAB-PRJ-10 History/Audit | REFERENCE_REQUIRED |

Additional detail tab sets for property/unit, contract, finance, administration, and reports must be split into independent contracts before their references are drafted.

## 6. Critical overlay register

| IDs | Count | Status |
|---|---:|---|
| SUR-001..SUR-016 | 16 | REFERENCE_REQUIRED |

Every overlay reference must include portal/stacking, focus, validation, loading, success/error, mobile viewport, and unsaved/destructive behavior as applicable.

## 7. Reference production order

To minimize rework, references should be produced and approved in this order:

1. Global shell, navigation, typography, tokens, Light/Dark.
2. Universal table/list, form, master/detail, modal/drawer, and state patterns.
3. PG-002/003 dashboard and daily operations.
4. PG-005 customer list and PG-006 customer detail tabs one at a time.
5. PG-010 property/inventory and detail.
6. PG-012/013 projects and each project tab.
7. PG-008/009 tours/offers/reservations.
8. PG-014..019 contracts and finance.
9. PG-020..023 tasks/support/communications/documents.
10. PG-024..026 insights/AI.
11. PG-027..035 administration.
12. responsive/mobile and cross-page consistency pass.

## 8. Owner approval protocol

For each reference:

- owner receives the image/board with contract ID;
- requested changes are recorded against that ID;
- approval records reference image version/date;
- approval covers only the named page/tab/states;
- later material design changes invalidate the affected approval;
- implementation cannot use another page's reference as implicit approval.

## 9. Z3 blocking decision

```text
TEXT PAGE CONTRACTS: READY
TARGET TOP-LEVEL REFERENCES REQUIRED: 36
CUSTOMER TAB REFERENCES REQUIRED: 9
PROJECT TAB REFERENCES REQUIRED: 10
CRITICAL OVERLAY REFERENCES REQUIRED: 16
OWNER-APPROVED TARGET REFERENCES: 0
Z3 VISUAL GATE: OPEN
Z4 SEQUENTIAL START AUTHORIZED: NO UNTIL OWNER VISUAL BASELINE DECISION OR FORMAL SAFE EXCEPTION
RUNTIME CHANGE: NONE
PRODUCTION ACTION: NONE
```
