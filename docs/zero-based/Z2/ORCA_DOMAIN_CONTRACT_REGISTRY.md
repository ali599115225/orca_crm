# ORCA Z2 — Domain Contract Registry

- **Document ID:** ORCA-Z2-DOM-001
- **Version:** 1.0
- **Date:** 2026-07-22
- **Status:** `TARGET DOMAIN CONTRACT / CURRENT SYSTEM NOT YET CLASSIFIED`
- **Operating model:** `SINGLE INDEPENDENT COMPANY`
- **Production action authorized:** `false`

## 1. Purpose

This registry defines the target business-domain language, ownership, lifecycle rules, cross-domain invariants, and evidence requirements for ORCA before pages, data schemas, APIs, or implementation packages are approved.

The current repository may use different names, states, or structures. Those are implementation facts to be classified in Z7; they do not override these target contracts.

## 2. Domain boundaries

| Domain ID | Domain | Aggregate roots | Business owner reference | Primary upstream | Primary downstream |
|---|---|---|---|---|---|
| DOM-01 | Customer and Opportunity | Customer, Lead, Opportunity | Sales owner | Acquisition source | Tour, Offer, Contract |
| DOM-02 | Property and Inventory | Property, Inventory Item, Availability | Inventory owner | Evidence and project data | Tour, Offer, Reservation |
| DOM-03 | Project Development | Project, Phase, Building, Unit | Project owner | Project evidence | Inventory and transaction domains |
| DOM-04 | Tours and Appointments | Tour, Appointment Slot | Operations/sales owner | Customer + inventory | Follow-up, offer |
| DOM-05 | Offers, Negotiation, Reservation | Offer, Offer Version, Reservation | Sales/approval owner | Customer + inventory | Contract |
| DOM-06 | Contracts and Deal Lifecycle | Contract, Contract Version, Signature Evidence | Contract authority | Accepted offer/reservation | Finance, documents |
| DOM-07 | Finance and Settlement Records | Invoice, Installment, Payment Evidence, Reconciliation, Settlement/Refund Request | Finance authority | Active contract | Reporting and accounting evidence |
| DOM-08 | Tasks, Workflow, Approvals | Task, Approval Request, Workflow Run | Operations owner | Any domain event | Any domain state change |
| DOM-09 | Communications and Support | Conversation, Message Record, Ticket | Customer operations owner | Customer/context/provider | Task, outcome, audit |
| DOM-10 | Documents and Records | Document, Version, Template Metadata, Evidence Package | Record owner | All business domains | Contract, audit, compliance |
| DOM-11 | Reporting and AI Assistance | Metric Definition, Report Snapshot, AI Assistance Record | Executive/product owner | Trusted domain events/data | Human decision support |

## 3. Common entity contract

Every business aggregate must expose or derive:

- stable internal identifier;
- company/security partition (`tenantId` retained temporarily);
- human-readable reference where user-facing;
- lifecycle state and state version;
- responsible owner or queue;
- created/updated timestamps in UTC with Saudi-time presentation rules;
- creator/updater identity where applicable;
- source and purpose;
- audit correlation identifier;
- soft archive/retention state where deletion is not yet authorized;
- regulatory/provider readiness state where applicable;
- optimistic-concurrency or transaction protection for contested writes.

Raw UUIDs must not be the primary user-facing reference.

## 4. Common command contract

Every state-changing command must define:

1. authenticated actor or trusted-job identity;
2. required permission and organizational/resource scope;
3. input validation and normalization;
4. current-state precondition;
5. business invariants;
6. idempotency strategy where replay is possible;
7. transaction boundary;
8. audit record including reason for sensitive actions;
9. emitted event or follow-up task where required;
10. user-safe error class;
11. rollback/compensation behavior where direct rollback is impossible.

No browser-supplied `tenantId`, role, approval result, price authority, payment confirmation, or provider-success flag is trusted.

## 5. Standard error taxonomy

| Error class | Meaning | Expected behavior |
|---|---|---|
| `UNAUTHENTICATED` | No valid active session/trusted job | Deny; no mutation |
| `UNAUTHORIZED` | Actor lacks permission or scope | Deny; security audit where sensitive |
| `VALIDATION_FAILED` | Input violates format or required data | Return field-safe errors |
| `STATE_CONFLICT` | Command invalid for current lifecycle state | No mutation; return current state/version |
| `CONCURRENCY_CONFLICT` | Stale version or competing commitment | No partial write; permit safe retry/reload |
| `DUPLICATE_REQUEST` | Idempotency key already completed/in progress | Return prior result or deterministic pending response |
| `DEPENDENCY_NOT_READY` | Required upstream entity/evidence incomplete | Block transition and identify missing prerequisite |
| `PROVIDER_NOT_CONFIGURED` | External provider unavailable by design | Preserve internal workflow; no false external success |
| `PROVIDER_FAILURE` | Configured provider timed out/rejected/failed | Record attempt; retry or manual recovery without false success |
| `REGULATORY_EVIDENCE_REQUIRED` | License/applicability evidence absent | Keep regulated action disabled or pending |
| `INTEGRITY_VIOLATION` | Invariant, amount, inventory, or evidence mismatch | Stop; raise review/incident path |
| `RETENTION_HOLD` | Record cannot be disposed due policy/legal hold | Deny deletion; record reason |

## 6. Standard audit event contract

Audit events for sensitive actions must include:

- event type and schema version;
- aggregate type/id and human reference;
- actor/trusted job and effective role/permission;
- company and organization/resource scope;
- command/request correlation and idempotency key where applicable;
- before/after state or protected diff summary;
- reason/approval reference for high-risk actions;
- result (`SUCCESS`, `DENIED`, `FAILED`, `NO_OP`);
- timestamp;
- provider/evidence reference without exposing secrets or prohibited personal data.

Audit records are append-only to normal business users. Corrections create new records rather than altering prior evidence.

## 7. Cross-domain invariants

1. A customer record may exist without a transaction, but an offer, tour, reservation, or contract must resolve to an authorized customer/opportunity context.
2. An inventory item cannot have overlapping active commitments that violate availability rules.
3. An accepted offer cannot silently change; changes create a new version and may invalidate prior approvals.
4. A contract cannot become active without fixed parties, fixed version, authority, approvals, and required evidence.
5. An invoice/obligation cannot claim paid solely from an internal UI action; external payment evidence or approved manual evidence is required.
6. A refund or settlement cannot be both requested and finally approved/executed by the same actor when the configured threshold requires separation.
7. A provider-dependent result cannot be marked delivered, signed, paid, published, or synchronized when the provider is `NOT_CONFIGURED` or failed.
8. A regulated action remains disabled/pending when evidence is `OWNER_EVIDENCE_REQUIRED`.
9. A workflow task or approval may coordinate a domain transition but cannot bypass the domain's own invariants.
10. AI output is advisory content, never authoritative lifecycle evidence.
11. Documents referenced as final evidence must be immutable by version and access-controlled.
12. Archive is not deletion; irreversible disposal requires an approved retention schedule and later execution authorization.

## 8. Event naming convention

Events use past-tense names and versioned schemas, for example:

- `LeadQualified.v1`
- `InventoryAvailabilityChanged.v1`
- `TourCompleted.v1`
- `OfferAccepted.v1`
- `ReservationExpired.v1`
- `ContractActivated.v1`
- `PaymentEvidenceRecorded.v1`
- `InvoiceReconciled.v1`
- `ApprovalRejected.v1`
- `TicketResolved.v1`
- `DocumentVersionFinalized.v1`

Events describe completed facts. Commands such as `ActivateContract` or `ConfirmPaymentEvidence` remain separate from events.

## 9. Human authority boundaries

The following remain human-authorized and server-verified:

- discount or commercial exception approval;
- reservation override;
- contract approval, activation, amendment, cancellation, or termination;
- payment-evidence acceptance where automated proof is unavailable;
- reconciliation exception, settlement, refund, or write-off;
- privileged access and emergency override;
- regulated publication/advertisement activation;
- Production/provider activation.

Thresholds and named approvers remain `OWNER_DECISION_REQUIRED`.

## 10. Domain test classes

Every applicable domain must have:

- happy-path state-transition tests;
- invalid transition tests;
- inactive-user and unauthorized-scope tests;
- cross-company/security partition negative tests;
- stale-version/concurrency tests;
- duplicate/idempotency tests;
- transaction rollback tests;
- audit-event tests;
- provider not-configured/failure tests;
- regulatory-evidence missing tests;
- retention/archive tests;
- Arabic user-safe error mapping where surfaced in UI.

## 11. Z2 registry decision

```text
DOMAIN BOUNDARIES: 11
COMMON COMMAND CONTRACT: DEFINED
COMMON ERROR TAXONOMY: DEFINED
COMMON AUDIT CONTRACT: DEFINED
CROSS-DOMAIN INVARIANTS: DEFINED
CURRENT IMPLEMENTATION CONFORMANCE: NOT ASSESSED UNTIL Z7
RUNTIME CHANGE: NONE
DATABASE CHANGE: NONE
PRODUCTION ACTION: NONE
```
