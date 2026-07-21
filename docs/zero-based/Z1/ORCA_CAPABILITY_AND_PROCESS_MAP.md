# ORCA Z1 — Capability and End-to-End Process Map

- **Document ID:** ORCA-Z1-CAP-001
- **Version:** 1.0
- **Date:** 2026-07-21
- **Status:** `PROPOSED REFERENCE MODEL / Z1 EVIDENCE`
- **Operating model:** `SINGLE INDEPENDENT COMPANY`
- **Production action authorized:** `false`

## 1. Purpose

This document defines the target business capabilities and end-to-end operating processes for ORCA before domain, data, page, or implementation decisions are made.

The model is intentionally organization-neutral. It does not claim that the company currently has every department or job title listed here. It provides an editable reference model that can be approved or reduced by the company owner without changing the product's core operating logic.

## 2. Capability principles

1. The business process is defined before the page.
2. Every capability has a business owner, operational actor, records, controls, and measurable outcome.
3. ORCA remains an internal platform for one company.
4. Historical SaaS or multi-company structures do not define the target capabilities.
5. Provider-dependent capabilities must operate safely as `NOT_CONFIGURED` until the company supplies approved accounts and credentials.
6. No regulated capability is treated as active without owner evidence and applicability confirmation.
7. Financial, contractual, legal, and high-risk decisions require human authority.

## 3. Target capability map

| ID | Capability | Purpose | Primary output | Initial priority |
|---|---|---|---|---|
| CAP-01 | Governance and operating control | Set policy, ownership, approval, risk, and release authority | Approved decisions and controls | P0 |
| CAP-02 | Identity, organization, and access | Manage users, roles, teams, branches, delegations, and lifecycle access | Authorized internal access | P0 |
| CAP-03 | Customer and lead management | Capture, deduplicate, qualify, assign, progress, win, lose, and archive leads | Qualified customer opportunity | P0 |
| CAP-04 | Property and inventory management | Maintain property/unit records, availability, evidence, status, pricing, and publication readiness | Trusted available inventory | P0 |
| CAP-05 | Project and development inventory | Manage projects, phases, buildings, units, progress, pricing, and availability | Structured project inventory | P0 |
| CAP-06 | Tours and appointments | Schedule, confirm, conduct, cancel, record outcome, and follow up | Completed visit with result | P1 |
| CAP-07 | Offers, negotiation, and reservation | Create versioned offers, negotiate, approve, accept, reject, expire, and reserve | Approved final commercial offer | P0 |
| CAP-08 | Contract and deal lifecycle | Draft, review, approve, sign, activate, amend, renew, cancel, and terminate | Controlled active contract | P0 |
| CAP-09 | Invoicing, installments, payment records, and settlement | Create financial obligations, confirm provider evidence, reconcile, settle, and request refunds | Auditable financial record | P0 |
| CAP-10 | Tasks, workflow, and approvals | Assign work, enforce deadlines, approvals, escalation, retry, and closure evidence | Completed accountable work | P0 |
| CAP-11 | Communication and customer support | Manage conversations, tickets, follow-ups, and channel status | Traceable customer interaction | P1 |
| CAP-12 | Documents, files, and templates | Store, version, secure, retain, retrieve, and generate documents | Controlled evidence package | P0 |
| CAP-13 | Reporting, analytics, and management insight | Define KPIs, lineage, freshness, filters, exports, and decision support | Trusted operational insight | P1 |
| CAP-14 | AI-assisted operations | Summarize, classify, recommend, and assist under human review | Human-approved assistance | P2 |
| CAP-15 | Integration and provider management | Configure adapters, webhooks, validation, failures, vendor records, and safe states | Integration-ready capability | P1 |
| CAP-16 | Security, privacy, audit, and compliance support | Apply access, minimization, logging, rights, retention, incidents, and evidence | Controlled and reviewable operation | P0 |
| CAP-17 | Platform operations and continuity | Operate environments, health, monitoring, backup, restore, incident, and rollback | Reliable recoverable service | P0 |
| CAP-18 | Training, support, and handover | Prepare users, manuals, acceptance, support, and operational ownership | Adopted maintainable platform | P1 |

## 4. Capability ownership reference model

| Capability group | Accountable owner reference | Responsible operating role reference |
|---|---|---|
| Governance, release, risk | Company owner / executive sponsor | Operations leadership + technical provider |
| Customer and sales | Sales leadership | Sales agents and coordinators |
| Inventory and projects | Property/project leadership | Inventory and project operators |
| Contracts and approvals | Authorized business approver | Contract operations |
| Finance and settlement | Finance authority | Accountant / finance operator |
| Communication and support | Customer operations owner | Support and channel operators |
| Security and privacy | Company owner for policy | System administrator, privacy coordinator, technical provider |
| Integrations and vendors | Company owner | Technical provider + designated business owner |
| Platform reliability | Company owner for business targets | Technical provider / operations engineer |

These titles are reference roles only. Final assignments remain `OWNER_DECISION_REQUIRED`.

## 5. End-to-end process map

### E2E-01 — Lead to won/lost outcome

```text
Lead captured
→ source recorded
→ duplicate check
→ consent/purpose check where applicable
→ assignment
→ qualification
→ activity and follow-up
→ property/project match
→ tour or direct offer
→ negotiation
→ reservation/contract path
→ WON or LOST
→ retention/archive rule
```

**Critical controls:** tenant/company scope, deduplication, assignment authority, status transition rules, audit trail, marketing opt-out, archive reason.

### E2E-02 — Property/project inventory to transaction readiness

```text
Asset/project created
→ ownership/authority evidence recorded
→ description and classification completed
→ unit structure and availability established
→ price source approved
→ documents verified
→ regulatory applicability checked
→ publication/offer readiness approved
→ availability continuously reconciled
```

**Critical controls:** no unsupported ownership claim, no unavailable unit sale, no advertisement claim without required evidence, pricing source history.

### E2E-03 — Inquiry to tour outcome

```text
Customer interest
→ suitable asset selected
→ staff/resource availability checked
→ appointment requested
→ confirmed
→ reminder state
→ completed / cancelled / no-show
→ result recorded
→ follow-up created
```

**Critical controls:** timezone, conflict prevention, privacy of notes, responsible agent, idempotent calendar integration, safe provider failure.

### E2E-04 — Offer to reservation

```text
Commercial terms drafted
→ version created
→ authority and price limits checked
→ internal approval if required
→ offer issued
→ accepted / rejected / countered / expired
→ inventory rechecked
→ reservation created
→ reservation expiry/release monitored
```

**Critical controls:** immutable version history, approval threshold, concurrency control, final offer identity, reservation expiry, double-booking prevention.

### E2E-05 — Contract to active deal

```text
Approved offer/reservation
→ contract draft
→ parties and identity verified
→ template and terms selected
→ internal review
→ approval
→ signature/evidence process
→ activation
→ amendment / renewal / termination as applicable
```

**Critical controls:** authorized template, fixed version, signatory authority, timestamp/evidence, no activation without complete parties and approvals.

### E2E-06 — Contract to cash and settlement record

```text
Contract obligation
→ invoice/installment schedule
→ payment request reference
→ provider or bank evidence received
→ payment status confirmed
→ receipt/reconciliation
→ exception handling
→ settlement or refund request
→ accounting close
```

**Critical controls:** no PAN storage, no internal event treated as final payment proof without provider evidence, segregation of duties, immutable reconciliation history.

### E2E-07 — Task/approval to verified closure

```text
Trigger or manual request
→ task created
→ owner assigned
→ due date and priority
→ work performed
→ approval/escalation if required
→ evidence attached
→ completed or rejected
→ audit and metrics updated
```

**Critical controls:** one accountable owner, deadline, approval separation, retry/dead-letter for system work, closure evidence.

### E2E-08 — Customer communication/support to resolution

```text
Inbound/outbound interaction
→ identity/context linked
→ channel/provider status checked
→ message/ticket recorded
→ assignment
→ response and follow-up
→ escalation if required
→ resolution
→ retention and quality review
```

**Critical controls:** consent and opt-out, provider-safe failure, webhook verification, attachment security, no false sent/delivered state.

### E2E-09 — Provider setup to safe operation

```text
Business need approved
→ company selects provider
→ vendor/subprocessor review
→ account and contract owned by company
→ credentials supplied through approved secret path
→ sandbox/mock validation
→ webhook/security validation
→ controlled activation approval
→ monitoring and failure state
→ exit/export process
```

**Critical controls:** no developer-owned credentials, `NOT_CONFIGURED` default, no Production activation without explicit approval, vendor exit plan.

### E2E-10 — Incident to recovery

```text
Alert or report
→ triage
→ severity and owner
→ containment
→ technical/business communication
→ recovery/rollback/forward-fix
→ validation
→ evidence and post-incident review
→ corrective actions
```

**Critical controls:** no secret leakage in logs, owner for every alert, recovery evidence, business-impact classification, tracked corrective actions.

## 6. Process measurement model

| Process | Initial measure proposal | Final value owner |
|---|---|---|
| Lead response | Time from capture to first accountable action | Sales owner |
| Qualification | Conversion from new to qualified | Sales owner |
| Tour execution | Completion, cancellation, and no-show rates | Operations owner |
| Offer progression | Offer acceptance and cycle time | Sales/approval owner |
| Reservation integrity | Double-booking incidents and expiry compliance | Operations owner |
| Contract activation | Draft-to-activation cycle and rejected activation causes | Contract authority |
| Collection record | Reconciled obligations and unresolved exceptions | Finance authority |
| Task execution | On-time closure and escalation rate | Department owner |
| Support | First response and resolution time | Support owner |
| Reliability | Availability, incident duration, restore evidence | Owner + technical provider |

Targets remain `OWNER_DECISION_REQUIRED` and will be finalized in Z6.

## 7. Dependencies on later gates

- Z2 converts these processes into domain state machines and business rules.
- Z3 maps processes to navigation, pages, tabs, forms, and user states.
- Z4 defines data ownership, contracts, events, transactions, and integrations.
- Z5 defines security, privacy, quality, and test controls.
- Z6 defines operational targets and continuity.
- Z7 compares the current system to this target map.

## 8. Z1 acceptance statement

```text
CAPABILITY MAP: COMPLETE AS REFERENCE MODEL
END-TO-END PROCESS MAP: COMPLETE
ACTUAL ORGANIZATION CLAIMED: NO
OWNER-SPECIFIC TARGETS FINALIZED: NO
SAFE DEFAULTS RECORDED: YES
RUNTIME CHANGE: NONE
DATABASE CHANGE: NONE
PRODUCTION ACTION: NONE
```
