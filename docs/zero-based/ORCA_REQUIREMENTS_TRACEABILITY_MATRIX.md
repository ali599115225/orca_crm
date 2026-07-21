# ORCA Requirements Traceability Matrix

- **Document ID:** ORCA-RTM-001
- **Version:** 1.0
- **Date:** 2026-07-21
- **Status:** `ACTIVE / EXPANDS AT EACH Z GATE`
- **Authority:** ORCA Zero-Based Product Planning Framework
- **Production action authorized:** `false`

## 1. Purpose

This register is the central traceability entry point from owner decisions and business outcomes to domain, data, architecture, experience, security, tests, current-system classification, and execution packages.

A requirement is not closed merely because a similarly named feature or test exists. Closure requires the stated acceptance and verification evidence.

## 2. Status values

- `APPROVED_BASELINE`
- `PROPOSED_OWNER_CONFIRMATION`
- `PLANNED_LATER_GATE`
- `IMPLEMENTED_NOT_VERIFIED`
- `VERIFIED`
- `DEFERRED_WITH_APPROVAL`
- `OUT_OF_SCOPE`
- `OWNER_DECISION_REQUIRED`

## 3. Initial business requirements

| ID | Requirement | Source | Priority | Owner | Acceptance criterion | Verification | Dependencies | Target gate | Status |
|---|---|---|---|---|---|---|---|---|---|
| BR-001 | ORCA shall operate as an internal platform for one independent company | Owner fixed decision / Z0 | P0 | Company owner | No target product capability depends on renting the platform to independent companies | Governance review + Z7 classification | None | Z0/Z7 | APPROVED_BASELINE |
| BR-002 | The system shall support internal users, roles, branches, departments, teams, and scoped assignments | Master plan / Z1 | P0 | Company owner + operations | Reference organization and personas approved; every sensitive action maps to explicit authority | Z1 model + Z4 RBAC matrix + negative tests | BR-001 | Z1/Z4/Z5 | PROPOSED_OWNER_CONFIRMATION |
| BR-003 | The company shall own provider accounts, subscriptions, credentials, sender identities, and licenses | Owner fixed decision / Z0 | P0 | Company owner | No developer-owned Production credential or provider account is used | Vendor/secret review + activation evidence | None | Z0/Z4/Z6 | APPROVED_BASELINE |
| BR-004 | Provider-dependent features shall fail safely as `NOT_CONFIGURED` until approved activation | Master plan / Z0 | P0 | Technical provider | No false success, unrelated functions remain usable, setup state is visible and audited | Adapter tests + UI states + staging evidence | BR-003 | Z2/Z3/Z4/Z5 | APPROVED_BASELINE |
| BR-005 | ORCA shall manage a traceable customer journey from capture to won/lost outcome | Master plan / Z1 | P0 | Sales owner | Lead source, duplicate state, assignment, activities, transitions, outcome, archive, and audit are complete | State-machine tests + permissions + UI contract | BR-002 | Z2/Z3/Z7 | PLANNED_LATER_GATE |
| BR-006 | ORCA shall maintain trusted property, project, and unit inventory | Master plan / Z1 | P0 | Inventory/project owner | Availability, pricing source, evidence, status, and transaction readiness are controlled | Domain tests + concurrency tests + evidence review | BR-002 | Z2/Z4/Z7 | PLANNED_LATER_GATE |
| BR-007 | ORCA shall prevent conflicting reservation or sale of the same inventory | Master plan / Z1 | P0 | Operations owner | Concurrent attempts cannot create incompatible active commitments | Transaction/concurrency test | BR-006 | Z2/Z4/Z5 | PLANNED_LATER_GATE |
| BR-008 | ORCA shall manage tours and appointments with owner, status, result, conflict, and follow-up | Master plan / Z1 | P1 | Operations/sales owner | Every appointment has responsible actor, timezone, lifecycle, outcome, and audit | State tests + integration-failure test + UI contract | BR-005/006 | Z2/Z3/Z4 | PLANNED_LATER_GATE |
| BR-009 | ORCA shall manage versioned offers, approval limits, negotiation, expiry, and reservation | Master plan / Z1 | P0 | Sales/approval owner | Final accepted offer is immutable and traceable to approvals and inventory state | State/approval/concurrency tests | BR-006/007 | Z2/Z4/Z5 | PLANNED_LATER_GATE |
| BR-010 | ORCA shall manage contracts through draft, review, approval, signature evidence, activation, and termination | Master plan / Z1 | P0 | Contract authority | No active contract lacks fixed version, parties, authority, approvals, and evidence | State tests + authorization tests + document evidence | BR-009 | Z2/Z4/Z5 | PLANNED_LATER_GATE |
| BR-011 | ORCA shall maintain auditable invoices, installments, payment evidence, reconciliation, settlement, and refund requests | Master plan / Z1 | P0 | Finance authority | Financial status is evidence-backed; no internal event alone confirms external payment | Domain tests + SoD tests + provider evidence tests | BR-010 | Z2/Z4/Z5 | PLANNED_LATER_GATE |
| BR-012 | ORCA shall not store PAN, CVV, or sensitive card authentication data | Master plan / PCI minimization | P0 | Company owner + technical provider | Data model, logs, files, and integrations contain no prohibited card data | Data inventory + code scan + integration review | BR-003 | Z4/Z5/Z7 | APPROVED_BASELINE |
| BR-013 | ORCA shall provide accountable tasks, workflow, approvals, escalation, and closure evidence | Master plan / Z1 | P0 | Operations owner | Every work item has owner, due date, state, result, and evidence; incompatible self-approval is controlled | Domain + authorization + retry tests | BR-002 | Z2/Z4/Z5 | PLANNED_LATER_GATE |
| BR-014 | ORCA shall protect and retain documents and communication records according to approved policy | Master plan / Z1 | P0 | Company owner + record owner | Access, version, malware/type/size controls, retention state, and audit are explicit | File-security tests + access tests + retention evidence | BR-002/003 | Z2/Z4/Z5/Z6 | PLANNED_LATER_GATE |
| BR-015 | ORCA shall provide trusted KPIs with definitions, sources, lineage, freshness, scope, and export controls | Master plan / Z1 | P1 | Executive/operations owner | Every Release 1 KPI has formula, source, freshness, owner, permission, and test | KPI contract tests + reconciliation | BR-005..014 | Z2/Z4/Z5 | PLANNED_LATER_GATE |
| BR-016 | AI shall remain assistive and under human review | Owner safe default / Z0 | P0 | Company owner | No autonomous financial, contractual, legal, refund, or irreversible decision | Threat model + policy tests + kill-switch evidence | BR-003/014 | Z2/Z4/Z5 | APPROVED_BASELINE |
| BR-017 | ORCA shall support Arabic, RTL, Light/Dark, responsive layouts, keyboard/focus, and WCAG 2.2 AA | Master plan / Z1 | P1 | Product owner | Every Release 1 page contract includes visual, responsive, keyboard, focus, and accessibility acceptance | Automated + manual visual/accessibility evidence | Page registry | Z3/Z5/Z7 | PLANNED_LATER_GATE |
| BR-018 | ORCA shall be observable, recoverable, and deployable through controlled non-Production and Production gates | Master plan / Z1 | P0 | Company owner + technical provider | Environment contracts, health, alerts, backup, restore, incident, rollback, and owner release evidence exist | CI/staging drills + runbooks + evidence package | BR-001..017 | Z6/Z8 | PLANNED_LATER_GATE |
| BR-019 | Existing components shall be retained only when currently compliant, safe, tested, and visually verified where applicable | Owner instruction / Z7 | P0 | Technical provider | Each component is classified KEEP/ADAPT/REBUILD/RETIRE/MISSING/DEFER/NOT_PROVEN with evidence | Repository comparison and evidence review | Z0-Z6 | Z7 | PLANNED_LATER_GATE |
| BR-020 | No merge to `main` or Production action shall occur without a separate owner approval | Owner high-risk boundary | P0 | Company owner | Central/stage work may progress, but main/Production remain unchanged absent explicit approval | Git/Production evidence | None | All | APPROVED_BASELINE |

## 4. Initial non-functional requirements

| ID | Requirement | Priority | Acceptance direction | Target gate | Status |
|---|---|---|---|---|---|
| NFR-001 | Authorization is server-enforced and deny-by-default | P0 | Direct negative-access tests for every P0/P1 action | Z4/Z5 | PLANNED_LATER_GATE |
| NFR-002 | Sensitive actions are auditable with actor, scope, reason, time, and outcome | P0 | Immutable/restricted audit evidence and tests | Z4/Z5 | PLANNED_LATER_GATE |
| NFR-003 | Critical writes are transactional and idempotent where retry/replay is possible | P0 | Duplicate/retry/concurrency tests | Z2/Z4/Z5 | PLANNED_LATER_GATE |
| NFR-004 | External provider failure does not create false business success | P0 | Timeout/error/retry/webhook/replay tests | Z4/Z5 | PLANNED_LATER_GATE |
| NFR-005 | Performance targets use measured p95/p99 and realistic data volumes | P1 | Numeric budgets approved and tested | Z5/Z6 | OWNER_DECISION_REQUIRED |
| NFR-006 | Availability, MTPD, RTO, and RPO targets are owner-approved and evidence-backed | P0 | BIA, targets, restore drills, and monitoring | Z6 | OWNER_DECISION_REQUIRED |
| NFR-007 | Release artifacts have pinned dependencies, lockfile, vulnerability audit, SBOM, and provenance target | P0 | Blocking CI evidence per release | Z5/Z6 | PLANNED_LATER_GATE |
| NFR-008 | Personal data is minimized, classified, retained, and processed for documented purposes | P0 | Data catalog, RoPA, rights, retention, transfer, and incident controls | Z4/Z5/Z6 | PLANNED_LATER_GATE |
| NFR-009 | User-visible identifiers are meaningful; raw UUIDs are not displayed | P2 | Page-contract and visual verification | Z3/Z7 | PLANNED_LATER_GATE |
| NFR-010 | UI layout is stable and avoids uncontrolled card growth, empty-space filling, and double scrolling | P2 | Visual contracts and responsive verification | Z3/Z7 | PLANNED_LATER_GATE |

## 5. Initial owner-decision register linkage

| Owner decision | Related requirements | Safe default |
|---|---|---|
| Exact real-estate activities and licenses | BR-006/008/009/010/011/014 | Disable unproven regulated actions |
| Actual organization and roles | BR-002/005..014 | Reference personas; least privilege |
| Release 1 final scope | BR-005..018 | Internal operating spine proposal |
| Financial/contract approval limits | BR-009/010/011/013 | Owner approval for high-risk actions |
| Official templates/signatories | BR-010/014 | No invented legal template or authority |
| Providers/budget/locations | BR-003/004/011/014/016 | `NOT_CONFIGURED`; no new processor |
| Retention periods | BR-014 + NFR-008 | Preserve; no irreversible disposal |
| RTO/RPO/MTPD/SLO | BR-018 + NFR-005/006 | Proposal only; no achieved claim |
| Production release | BR-020 | Not authorized |

## 6. Expansion rule

Each later gate must:

1. Add or refine requirements without silently changing prior owner decisions.
2. Link each new requirement to source, owner, acceptance, verification, dependencies, affected component, tests/evidence, and status.
3. Record superseded requirements explicitly.
4. Prevent Z7 `KEEP` and Z8 work-package authorization when traceability is incomplete.

## 7. Current matrix decision

```text
INITIAL BUSINESS REQUIREMENTS: 20
INITIAL NON-FUNCTIONAL REQUIREMENTS: 10
OWNER DECISION LINKS: REGISTERED
IMPLEMENTATION CONFORMANCE: NOT YET ASSESSED
NEXT EXPANSION: Z2 DOMAIN CONTRACTS
RUNTIME CHANGE: NONE
DATABASE CHANGE: NONE
PRODUCTION ACTION: NONE
```
