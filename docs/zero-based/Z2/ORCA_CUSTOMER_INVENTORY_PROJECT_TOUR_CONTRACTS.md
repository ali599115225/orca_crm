# ORCA Z2 — Customer, Inventory, Project, and Tour Domain Contracts

- **Document ID:** ORCA-Z2-DOM-A-001
- **Version:** 1.0
- **Date:** 2026-07-22
- **Status:** `TARGET CONTRACT / NOT IMPLEMENTATION CLAIM`

## DOM-01 — Customer, Lead, and Opportunity

### Purpose

Manage an identifiable customer relationship from capture through qualification, active opportunity, won/lost outcome, archive, and permitted re-engagement without losing source, consent, assignment, or audit history.

### Core entities

- `Customer`: durable person/organization identity and contact points.
- `Lead`: an acquisition/intake record with source and initial status.
- `Opportunity`: a qualified commercial pursuit linked to customer and one or more inventory interests.
- `CustomerContactPoint`: normalized phone/email/channel with verification and purpose metadata.
- `ConsentRecord`: purpose/channel/status/source/time/evidence where required.
- `LeadAssignment`: responsible user/team, effective dates, reason, and transfer history.
- `CustomerActivity`: call, note, email, message, meeting, status event, or system activity.
- `LossReason`: controlled reason with optional detail.

### Lead lifecycle

```text
NEW
→ CONTACT_PENDING
→ CONTACTED
→ QUALIFICATION_PENDING
→ QUALIFIED
→ OPPORTUNITY_ACTIVE
→ WON | LOST
→ ARCHIVED
```

Permitted side transitions:

- `NEW|CONTACT_PENDING|CONTACTED|QUALIFICATION_PENDING → DUPLICATE_REVIEW`
- `DUPLICATE_REVIEW → MERGED | previous valid state`
- active states → `DISQUALIFIED`
- `LOST|DISQUALIFIED → REOPENED` only with reason, permission, and retention/consent check
- any non-final active state → `ARCHIVED` only with reason and no blocking active commitment

### Opportunity lifecycle

```text
DRAFT
→ QUALIFIED
→ MATCHING
→ TOUR_OR_OFFER
→ NEGOTIATION
→ RESERVED
→ CONTRACTING
→ WON | LOST | EXPIRED
```

### Required transitions and authority

| Command | From | To | Required authority/control |
|---|---|---|---|
| `CaptureLead` | none | NEW | authenticated operator, approved source, minimum purpose data |
| `AssignLead` | active | same state | scoped assignment permission; reason/history |
| `RecordContact` | active | CONTACTED | assigned/scoped actor; activity audit |
| `QualifyLead` | CONTACTED/QUALIFICATION_PENDING | QUALIFIED | qualification data complete |
| `CreateOpportunity` | QUALIFIED | OPPORTUNITY_ACTIVE | no incompatible duplicate active opportunity rule |
| `MarkWon` | valid transaction-complete state | WON | contract/approved outcome reference required |
| `MarkLost` | active | LOST | controlled loss reason required |
| `MergeDuplicate` | DUPLICATE_REVIEW | MERGED | privileged review; survivor and field-conflict plan |
| `ArchiveLead` | eligible | ARCHIVED | reason, retention state, reassignment/follow-up checks |

### Invariants

- Duplicate detection is scoped to the company partition and uses normalized contact identifiers; it does not expose raw identifiers to unauthorized actors.
- Merge preserves source history, activities, consent, assignments, and references; it never silently drops records.
- `WON` requires an authoritative transaction outcome, not merely a manually selected label.
- A lead marked `LOST` may retain scheduled tasks only if explicitly converted to permitted follow-up.
- Assignment changes do not transfer broader data access than the recipient's organizational/resource scope.
- Marketing contact is not inferred from having a phone/email; purpose and opt-out state are respected.

### Inputs/outputs

Inputs: source, name/identity minimum, contact points, city/interest, purpose/consent where applicable, assignment, qualification data, interests, outcome reason.

Outputs: lead/customer reference, current state/version, accountable owner, next action, opportunity context, audit/activity timeline, permitted contact state.

### Failure and recovery

- duplicate suspected → `DUPLICATE_REVIEW`, no destructive auto-merge;
- invalid contact → save only permitted partial intake or reject with field error;
- assignment target inactive/out of scope → deny and retain prior assignment;
- provider message failure → activity records failed attempt, not successful contact;
- stale state → concurrency conflict and reload;
- archive blocked by active reservation/contract → dependency error.

### Acceptance/tests

- deterministic normalized duplicate test;
- merge preservation and rollback test;
- unauthorized cross-scope read/write tests;
- valid/invalid lifecycle transition tests;
- consent opt-out enforcement tests;
- won requires authoritative transaction reference;
- lost/archive reason tests;
- assignment history/audit tests;
- provider failure cannot set `CONTACTED` unless actual contact evidence rule is met.

---

## DOM-02 — Property and Inventory

### Purpose

Maintain trusted real-estate asset and inventory records with evidence, availability, pricing, readiness, and commitment protection.

### Core entities

- `Property`: asset-level record and location/classification.
- `InventoryItem`: transact-able asset/unit/space.
- `OwnershipOrAuthorityEvidence`: source, type, validity, verification state.
- `AvailabilityWindow`: available/reserved/contracted/blocked periods.
- `PriceRecord`: amount, currency, purpose, effective dates, source, approval.
- `InventoryCommitment`: tour hold, reservation, contract, or administrative block.
- `PublicationReadiness`: data/evidence/license/provider readiness.
- `InventoryStatusHistory`.

### Asset lifecycle

```text
DRAFT
→ DATA_INCOMPLETE
→ EVIDENCE_PENDING
→ REVIEW_READY
→ ACTIVE
→ SUSPENDED | WITHDRAWN | ARCHIVED
```

### Inventory availability lifecycle

```text
UNAVAILABLE_SETUP
→ AVAILABLE
→ HELD
→ RESERVED
→ CONTRACTED
→ COMPLETED
```

Side states: `BLOCKED`, `DISPUTED`, `MAINTENANCE`, `WITHDRAWN`.

### Commands and authority

| Command | Preconditions | Result/control |
|---|---|---|
| `CreateProperty` | scoped inventory permission | DRAFT with source and owner |
| `SubmitEvidence` | approved file/evidence path | EVIDENCE_PENDING; no automatic truth claim |
| `ApproveReadiness` | data/evidence/applicability complete | ACTIVE; reviewer separated where required |
| `SetPrice` | approved price source and scope | new immutable effective price record |
| `ChangeAvailability` | no conflicting commitment | state/version update + audit |
| `PlaceHold` | AVAILABLE and policy permits | HELD with expiry/idempotency key |
| `ReserveInventory` | AVAILABLE/eligible HELD | RESERVED atomically |
| `ReleaseCommitment` | authorized and no active contract block | prior eligible state; reason required |
| `SuspendInventory` | authorized risk/quality action | SUSPENDED/BLOCKED; dependent workflows notified |
| `ArchiveProperty` | no active commitments/retention block | ARCHIVED, not deleted |

### Invariants

- One inventory item cannot hold conflicting active reservations/contracts for the same effective period.
- Pricing changes create history; accepted offers/contracts retain the price version they used.
- `ACTIVE` or publication readiness does not imply a license; applicable evidence is separate.
- Ownership/authority evidence is never represented as verified until approved by an authorized reviewer.
- Suspended/disputed inventory cannot enter a new offer/reservation path.
- Availability transitions are transactional and version-checked.
- Counts such as total/sold/reserved are derived/reconciled from authoritative unit/commitment states, not manually trusted counters.

### Failure and recovery

- competing reservation → one atomic winner, others receive `CONCURRENCY_CONFLICT`;
- expired hold → idempotent release job/event;
- evidence rejected → return to EVIDENCE_PENDING/DATA_INCOMPLETE with reason;
- project/unit mismatch → integrity violation;
- stale price/version → offer must reprice or explicitly retain valid approved version;
- provider publication failure → remain internally ready but externally not published.

### Acceptance/tests

- concurrent reserve test;
- hold expiry and retry idempotency;
- state/price history preservation;
- evidence reviewer authorization;
- suspended inventory blocks new commitments;
- derived count reconciliation;
- archive blocked by active commitment;
- provider not configured/failure does not claim publication.

---

## DOM-03 — Project Development and Unit Structure

### Purpose

Represent project hierarchy, milestones, buildings, units, progress, risk, and inventory linkage without assuming a regulated project activity is licensed or active.

### Core entities

- `DevelopmentProject`.
- `ProjectPhase`.
- `BuildingOrZone`.
- `Unit` linked one-to-one with transact-able inventory where appropriate.
- `Milestone` and `ProgressSnapshot`.
- `ProjectRisk`.
- `ProjectDocumentRequirement`.
- `ProjectApplicabilityRecord` for conditional regulatory activities.

### Project lifecycle

```text
DRAFT
→ PLANNING
→ APPROVALS_PENDING
→ ACTIVE
→ ON_HOLD | COMPLETED | CANCELLED
→ ARCHIVED
```

### Unit lifecycle

```text
PLANNED
→ DEFINED
→ READY_FOR_INVENTORY
→ ACTIVE_INVENTORY
→ RESERVED
→ CONTRACTED
→ DELIVERED | WITHDRAWN
```

### Commands and rules

- `CreateProject`: establishes project reference and owner; no regulatory claim.
- `DefineHierarchy`: phase/building/unit identifiers must be unique within project scope.
- `SubmitProjectForActivation`: required project fields, evidence, and applicability decisions complete.
- `ActivateProject`: authorized approval; creates/links inventory through idempotent controlled process.
- `RecordProgress`: append snapshot with source/date/author; corrections append rather than overwrite history.
- `ChangeUnitStructure`: prohibited when incompatible active commitment exists unless approved migration/compensation plan.
- `PlaceProjectOnHold`: blocks new dependent commitments where policy requires and emits review tasks.
- `CompleteProject`: milestones/evidence and unresolved risk policy satisfied.

### Invariants

- Project hierarchy has stable identifiers; unit identity is not reused after commitment.
- Project and inventory availability remain reconciled.
- Progress percentage has defined source and effective date; no unsupported calculated claim.
- A project on hold cannot silently remain marketed or accept new commitments.
- Regulated activities such as off-plan sale remain `CONDITIONAL` until owner evidence is approved.
- Unit count aggregates are derived from units, not free counters.

### Acceptance/tests

- hierarchy uniqueness and parent integrity;
- idempotent inventory creation/linking;
- unit mutation blocked after commitment;
- on-hold propagation tests;
- progress history/audit tests;
- applicability evidence missing blocks conditional action;
- aggregate reconciliation tests.

---

## DOM-04 — Tours and Appointments

### Purpose

Coordinate appointment demand, staff/inventory availability, confirmation, execution, outcome, and follow-up with internal operation independent of external calendar configuration.

### Core entities

- `Tour` or `Appointment`.
- `AppointmentParticipant`.
- `ResourceSlot` for staff/property/resource.
- `ReminderAttempt`.
- `TourOutcome`.
- `RescheduleHistory`.

### Lifecycle

```text
REQUESTED
→ PENDING_CONFIRMATION
→ CONFIRMED
→ IN_PROGRESS
→ COMPLETED
```

Terminal alternatives: `CANCELLED`, `NO_SHOW`, `REJECTED`, `EXPIRED`.

Follow-up is an outcome requirement, not a tour lifecycle status; it creates a task/opportunity action.

### Commands and authority

| Command | Preconditions | Control/result |
|---|---|---|
| `RequestTour` | valid customer/opportunity + eligible inventory | REQUESTED |
| `ConfirmTour` | staff/resource availability and authority | CONFIRMED; conflict rechecked transactionally |
| `RescheduleTour` | non-terminal and policy window | new schedule version/history |
| `CancelTour` | non-terminal | reason/actor; resources released idempotently |
| `StartTour` | CONFIRMED and actor assigned | IN_PROGRESS |
| `CompleteTour` | IN_PROGRESS/CONFIRMED per controlled exception | outcome required; follow-up task/event |
| `MarkNoShow` | confirmed time elapsed and evidence policy | NO_SHOW; reason/follow-up |
| `RecordReminderResult` | scheduled reminder | attempt status; provider truth preserved |

### Invariants

- Stored instants are UTC; business display/default zone is Saudi Arabia unless the appointment explicitly has another zone.
- Confirmation must prevent overlapping use of constrained staff/resource according to configured policy.
- External calendar sync is secondary; internal appointment truth remains available when provider is `NOT_CONFIGURED`.
- Reminder failure does not cancel or falsely confirm an appointment.
- Private notes and customer contact details are visible only to justified roles/scopes.
- Completion requires a result and next-action decision.

### Failure/recovery

- slot conflict → deny confirmation/reschedule without partial resource booking;
- calendar provider duplicate webhook → idempotent no-op/prior result;
- provider timeout → internal state preserved with sync pending/failed status;
- assigned user inactive → block confirmation or require reassignment;
- stale schedule version → concurrency conflict.

### Acceptance/tests

- staff/resource conflict tests;
- timezone/DST-safe instant tests;
- reschedule history preservation;
- terminal transition denial;
- completion outcome and follow-up creation;
- no-show timing/authority tests;
- provider not configured/failure/idempotent sync tests;
- scoped note/contact access tests.

## Contract result

```text
DOMAINS COVERED: DOM-01..DOM-04
ENTITY SETS: DEFINED
STATE MACHINES: DEFINED
PERMISSIONS/INVARIANTS: DEFINED
FAILURE AND RECOVERY: DEFINED
ACCEPTANCE TEST CLASSES: DEFINED
CURRENT CODE MATCH: NOT CLAIMED
```
