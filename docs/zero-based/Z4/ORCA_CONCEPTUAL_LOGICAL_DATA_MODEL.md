# ORCA Z4 — Conceptual and Logical Data Model

- **Document ID:** ORCA-Z4-DATA-001
- **Version:** 0.9 — Planning Candidate
- **Date:** 2026-07-22
- **Status:** `TEXT CONTRACT COMPLETE / IMPLEMENTATION NOT AUTHORIZED`
- **Operating model:** `SINGLE INDEPENDENT COMPANY`
- **Production action authorized:** `false`

## 1. Purpose

Define the target conceptual and logical data model from the approved Z1 capability model and Z2 domain contracts. This document defines ownership, identities, boundaries, invariants, master data, and transition principles. It does not modify Prisma, migrations, or Production data.

## 2. Governing data principles

1. Business meaning and purpose precede table design.
2. Every field has an owner, purpose, source, classification, retention state, and authoritative domain.
3. Internal UUIDs may be used for integrity but are never the primary user-visible reference.
4. Human references are unique, stable, non-secret, and suitable for support/audit.
5. Every mutable business object has explicit state, timestamps, actor, and audit evidence.
6. Accepted commercial/legal versions are immutable; amendments create new versions or explicit transitions.
7. Financial truth is evidence-backed and separates internal recording from provider/bank confirmation.
8. External-provider state is separate from business outcome.
9. Unknown, not configured, archived, suspended, disputed, stale, and deleted/anonymized states are explicit.
10. Critical writes are transactional and idempotent where retries or concurrency are possible.
11. Cross-domain mutation occurs through owned commands/contracts, not uncontrolled direct writes.
12. Data minimization and least privilege apply at field, record, export, and integration level.

## 3. Company security partition and `tenantId`

The target product serves one independent company, but `tenantId` remains temporarily as the company security partition because the current system and data rely on it.

### Mandatory rules

- `tenantId` is derived from the authenticated server-side context and verified against the active user/company record.
- Client input, query strings, headers, forms, route parameters, or browser state cannot select another `tenantId`.
- All company-scoped records retain `tenantId` until a separately approved transition package proves that simplification is safe.
- Unique constraints and indexes for company-scoped business references include the company boundary when required.
- Background jobs use an explicit trusted-job context and cannot silently operate without scope.
- Removing or repurposing `tenantId` requires Z7 classification, impact analysis, compatibility plan, migration rehearsal, no-loss tests, rollback/forward-fix, and Z8 authorization.

```text
CURRENT TARGET POLICY:
RETAIN tenantId AS SINGLE-COMPANY SECURITY PARTITION

AUTOMATIC REMOVAL OR MULTI-TENANCY REWRITE:
PROHIBITED
```

## 4. Conceptual domain ownership

| Domain | Authoritative concepts | May reference | Must not directly own |
|---|---|---|---|
| Identity & Organization | User, OrgUnit, Assignment, Role, Permission, Delegation, AccessReview | audit, tasks | customer/commercial/finance state |
| Customer & Opportunity | Party, Customer, Lead, Opportunity, Activity, Source, ConsentPreference | users, inventory, communications | property availability, contract or finance truth |
| Inventory & Project | Property, Project, Phase, Building, Unit, Availability, PriceRecord, OwnershipEvidence | documents, offers | customer or contract lifecycle |
| Tour & Appointment | Tour, AppointmentSlot, Participant, Reminder, Outcome | customer, inventory, provider calendar | customer master data or provider account |
| Offer & Reservation | Offer, OfferVersion, NegotiationEvent, Reservation, Commitment | customer, inventory, approval | contract or payment confirmation |
| Contract | Contract, ContractVersion, PartyRole, Approval, SignatureEvidence, Obligation, Amendment, Termination | offer, reservation, documents, finance | provider signature account or finance settlement |
| Finance | Invoice, Installment, PaymentEvidence, PaymentConfirmation, Allocation, Reconciliation, Settlement, RefundRequest | contract, customer, provider event | PAN/CVV or bank/provider master credentials |
| Work & Approval | Task, WorkflowCase, ApprovalRequest, Escalation, SLAClock | all domains by typed reference | source-domain business truth |
| Communication & Support | Conversation, Message, DeliveryAttempt, ProviderEvent, Ticket, ConsentEvent | customer, users, documents | customer master or provider credentials |
| Document & Record | Document, DocumentVersion, BlobReference, EvidencePackage, LegalHold, AccessEvent | all domains by typed owner reference | business-domain state transitions |
| Reporting & AI | MetricDefinition, MetricSnapshot, ExportJob, AIRequest, ContextManifest, AIOutput, HumanReview | authorized read models | authoritative transactional truth |
| Platform Reliability | AuditEvent, OutboxEvent, InboxReceipt, IdempotencyRecord, FeatureFlag, IntegrationConnection, WebhookReceipt | all owned contracts | business ownership |

## 5. Core logical entity groups

### 5.1 Identity and organization

- `CompanySecurityPartition`
- `User`
- `OrgUnit` (`BRANCH`, `DEPARTMENT`, `TEAM`)
- `OrgAssignment`
- `AccessRole`
- `AccessPermission`
- `RoleAssignment`
- `Delegation`
- `AccessReview`
- `BreakGlassSession`

### 5.2 Customer and commercial journey

- `Party`
- `CustomerProfile`
- `Lead`
- `Opportunity`
- `CustomerActivity`
- `LeadSource`
- `MarketingConsentEvent`
- `DuplicateCandidate`
- `ArchiveDecision`

A customer profile is not duplicated per opportunity. Opportunities, activities, communication, offers, contracts, and finance records reference the authoritative party/customer identity.

### 5.3 Property, project, and inventory

- `Property`
- `Project`
- `ProjectPhase`
- `BuildingOrZone`
- `Unit`
- `InventoryAvailability`
- `PriceRecord`
- `InventoryCommitment`
- `OwnershipOrRightEvidence`
- `RegulatoryEvidence`

Availability is derived from explicit commitments and validated transitions, not from a UI-only boolean.

### 5.4 Tour and appointment

- `Appointment`
- `AppointmentParticipant`
- `AvailabilitySlot`
- `ReminderAttempt`
- `AppointmentOutcome`
- `CalendarSyncState`

All stored timestamps use UTC truth with explicit display timezone; Saudi operational display defaults to `Asia/Riyadh`.

### 5.5 Offer, reservation, and contract

- `Offer`
- `OfferVersion`
- `NegotiationEvent`
- `ApprovalDecision`
- `Reservation`
- `ReservationHold`
- `Contract`
- `ContractVersion`
- `ContractParty`
- `SignatureEvidence`
- `ContractObligation`
- `ContractAmendment`
- `ContractTermination`

Accepted offer and active contract versions are immutable. Later change creates a new version/amendment with explicit authority and evidence.

### 5.6 Finance

- `Invoice`
- `Installment`
- `PaymentEvidence`
- `ExternalPaymentConfirmation`
- `PaymentAllocation`
- `ReconciliationCase`
- `Settlement`
- `RefundRequest`
- `RefundExecutionEvidence`
- `TaxClassification`

Money is stored as exact decimal plus ISO currency. ORCA must not store PAN, CVV, PIN, magnetic-stripe data, or sensitive authentication data.

### 5.7 Work, communication, documents, reporting, and AI

- `Task`, `WorkflowCase`, `ApprovalRequest`, `Escalation`
- `Conversation`, `Message`, `DeliveryAttempt`, `SupportTicket`
- `Document`, `DocumentVersion`, `BlobReference`, `LegalHold`
- `MetricDefinition`, `MetricSnapshot`, `ExportJob`
- `AIRequest`, `AIContextManifest`, `AIOutput`, `HumanReview`

AI output and KPI snapshots are derived evidence, never the authoritative source of transactional state.

## 6. Identity and reference contract

Every core record has:

- internal immutable ID;
- company security partition;
- human reference where user/support lookup is required;
- state/status;
- created/updated timestamp;
- creator/updater or trusted-job identity;
- optimistic-concurrency/version field where overwrite risk exists;
- archive/retention/legal-hold fields where applicable;
- correlation/causation reference for critical operations.

### Human-reference examples

- `CUS-...`
- `OPP-...`
- `PRP-...`
- `UNT-...`
- `TOUR-...`
- `OFR-...`
- `RSV-...`
- `CTR-...`
- `INV-...`
- `PAY-...`
- `REC-...`
- `TSK-...`
- `DOC-...`

Exact formats remain an implementation decision, but raw UUID display is prohibited.

## 7. Master and reference data

| Master/reference set | Owner | Change control |
|---|---|---|
| Organization units and job functions | Company owner/administration | approval + effective dates |
| Roles, permissions, and scopes | Company owner/security | versioned review and negative tests |
| Lead sources and loss reasons | Sales/marketing owner | controlled dictionary |
| Property/unit types and availability reasons | Inventory owner | controlled dictionary |
| Offer/contract/invoice types | Commercial/contract/finance owners | approved definition/version |
| Payment methods and evidence types | Finance owner | no provider success inference |
| Task priorities, SLA classes, escalation reasons | Operations owner | controlled dictionary |
| Communication channels/templates/categories | Communication owner | provider/purpose/consent controls |
| Document types and retention classes | Record/privacy owner | retention/legal review |
| Metric definitions | Executive/data owner | formula, lineage, freshness, version |
| Provider and feature states | Technical owner + company owner | readiness/activation evidence |

Reference values are not free-text when they control policy, reporting, permissions, retention, or state transitions.

## 8. Cross-domain invariants

1. One active incompatible commitment cannot exist for the same inventory/time window.
2. A contract cannot activate without an immutable version, parties, authority, approvals, and required evidence.
3. An external payment is not confirmed from an internal request or UI event alone.
4. A refund/settlement is not complete without approved execution evidence and reconciliation.
5. A provider delivery event cannot silently change business success without the owning domain contract.
6. Archive does not equal deletion; legal hold blocks disposal.
7. Every sensitive export is scoped, authorized, purpose-bound, and audited.
8. AI cannot write authoritative financial, legal, contractual, permission, or retention decisions autonomously.

## 9. Transaction and concurrency direction

Transactional boundaries are required for:

- inventory commitment/reservation acquisition;
- accepted offer and reservation transition;
- contract activation/version fixation;
- invoice issuance and installment creation;
- payment allocation and reconciliation;
- refund/settlement approval and execution evidence;
- permission/role assignment changes;
- outbox event creation with critical domain writes.

Use database constraints, row/version checks, idempotency records, and deterministic conflict errors. Long external calls are not held inside database transactions.

## 10. Index, constraint, and quality direction

Planning requirements include:

- company-scoped unique human references;
- foreign-key integrity and explicit delete behavior;
- checks for money, dates, ranges, version ordering, and state-required fields;
- partial/filtered uniqueness for active commitments where applicable;
- indexes driven by approved operational queries and volumes;
- no index or constraint migration before Production data preflight and rehearsal;
- data-quality rules for required purpose, source, ownership, classification, and stale/unknown states.

## 11. Implementation transition boundary

Z7 must compare this target model to current Prisma/database/runtime usage and classify every relevant model/field/relationship as `KEEP`, `ADAPT`, `REBUILD`, `RETIRE`, `MISSING`, `DEFER`, or `NOT_PROVEN`.

No schema deletion, rename, backfill, constraint validation, tenant simplification, or Production data action is authorized by this document.

## 12. Decision

```text
CONCEPTUAL DOMAIN MODEL: DEFINED
LOGICAL ENTITY GROUPS: DEFINED
DATA OWNERSHIP: DEFINED
MASTER DATA DIRECTION: DEFINED
IDENTITY / HUMAN REFERENCES: DEFINED
CROSS-DOMAIN INVARIANTS: DEFINED
TENANTID POLICY: RETAIN TEMPORARILY AS COMPANY SECURITY PARTITION
SCHEMA OR MIGRATION CHANGE: NONE
PRODUCTION DATA ACTION: NONE
```
