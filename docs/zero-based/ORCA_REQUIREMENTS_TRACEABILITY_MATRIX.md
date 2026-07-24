# ORCA Requirements Traceability Matrix

- **Document ID:** ORCA-RTM-001
- **Version:** 1.1 — Z2 Expanded
- **Date:** 2026-07-22
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

## 3. Business requirements

| ID | Requirement | Source | Priority | Owner | Acceptance criterion | Verification | Dependencies | Target gate | Status |
|---|---|---|---|---|---|---|---|---|---|
| BR-001 | ORCA shall operate as an internal platform for one independent company | Owner fixed decision / Z0 | P0 | Company owner | No target capability depends on renting the platform to independent companies | Governance review + Z7 classification | None | Z0/Z7 | APPROVED_BASELINE |
| BR-002 | The system shall support internal users, roles, branches, departments, teams, and scoped assignments | Master plan / Z1 | P0 | Owner + operations | Every sensitive action maps to explicit authority and scope | Z4 RBAC + Z5 negative tests | BR-001 | Z1/Z4/Z5 | PROPOSED_OWNER_CONFIRMATION |
| BR-003 | The company shall own provider accounts, subscriptions, credentials, sender identities, and licenses | Owner fixed decision / Z0 | P0 | Company owner | No developer-owned Production credential/account is used | Vendor/secret/activation evidence | None | Z0/Z4/Z6 | APPROVED_BASELINE |
| BR-004 | Provider-dependent features shall fail safely as `NOT_CONFIGURED` until approved activation | Master plan / Z0 | P0 | Technical provider | No false success; unrelated functions remain usable | Adapter/UI/staging tests | BR-003 | Z2/Z3/Z4/Z5 | APPROVED_BASELINE |
| BR-005 | ORCA shall manage a traceable customer journey from capture to won/lost outcome | Master plan / Z1 | P0 | Sales owner | Source, duplicate, assignment, activity, transition, outcome, archive, and audit complete | State/permission/UI tests | BR-002 | Z2/Z3/Z7 | PLANNED_LATER_GATE |
| BR-006 | ORCA shall maintain trusted property, project, and unit inventory | Master plan / Z1 | P0 | Inventory/project owner | Availability, pricing source, evidence, status, and readiness controlled | Domain/concurrency/evidence tests | BR-002 | Z2/Z4/Z7 | PLANNED_LATER_GATE |
| BR-007 | ORCA shall prevent conflicting reservation or sale of the same inventory | Master plan / Z1 | P0 | Operations owner | Concurrent attempts cannot create incompatible active commitments | Transaction/concurrency tests | BR-006 | Z2/Z4/Z5 | PLANNED_LATER_GATE |
| BR-008 | ORCA shall manage tours with owner, status, result, conflict, timezone, and follow-up | Master plan / Z1 | P1 | Operations/sales | Every appointment has responsible actor, lifecycle, outcome, and audit | State/integration/UI tests | BR-005/006 | Z2/Z3/Z4 | PLANNED_LATER_GATE |
| BR-009 | ORCA shall manage versioned offers, approval limits, negotiation, expiry, and reservation | Master plan / Z1 | P0 | Sales/approval owner | Accepted version is immutable and traceable to approvals/inventory | State/approval/concurrency tests | BR-006/007 | Z2/Z4/Z5 | PLANNED_LATER_GATE |
| BR-010 | ORCA shall manage contracts through version, review, approval, signature evidence, activation, amendment, and termination | Master plan / Z1 | P0 | Contract authority | No active contract lacks fixed version, parties, authority, approvals, evidence | State/auth/document tests | BR-009 | Z2/Z4/Z5 | PLANNED_LATER_GATE |
| BR-011 | ORCA shall maintain auditable invoices, installments, payment evidence, reconciliation, settlement, and refund requests | Master plan / Z1 | P0 | Finance authority | Financial outcome is evidence-backed; internal UI assertion is insufficient | Domain/SoD/provider tests | BR-010 | Z2/Z4/Z5 | PLANNED_LATER_GATE |
| BR-012 | ORCA shall not store PAN, CVV, or sensitive card authentication data | PCI minimization | P0 | Owner + technical provider | Data model, files, logs, prompts, audit contain no prohibited card data | Inventory + scans + integration review | BR-003 | Z4/Z5/Z7 | APPROVED_BASELINE |
| BR-013 | ORCA shall provide accountable tasks, workflow, approvals, escalation, and closure evidence | Master plan / Z1 | P0 | Operations owner | Every work item has owner, due date, result, evidence, and separation control | Domain/auth/retry tests | BR-002 | Z2/Z4/Z5 | PLANNED_LATER_GATE |
| BR-014 | ORCA shall protect and retain documents and communication records according to approved policy | Master plan / Z1 | P0 | Owner + record owner | Access, version, malware/type/size, retention, legal hold, audit explicit | File/access/retention tests | BR-002/003 | Z2/Z4/Z5/Z6 | PLANNED_LATER_GATE |
| BR-015 | ORCA shall provide trusted KPIs with definition, source, lineage, freshness, scope, and export controls | Master plan / Z1 | P1 | Executive/operations | Every Release 1 KPI has formula/source/as-of/owner/permission/test | KPI reconciliation tests | BR-005..014 | Z2/Z4/Z5 | PLANNED_LATER_GATE |
| BR-016 | AI shall remain assistive and under human review | Owner safe default / Z0 | P0 | Company owner | No autonomous legal, financial, contract, refund, pricing, or irreversible decision | Threat/policy/kill-switch tests | BR-003/014 | Z2/Z4/Z5 | APPROVED_BASELINE |
| BR-017 | ORCA shall support Arabic, RTL, Light/Dark, responsive layouts, keyboard/focus, and WCAG 2.2 AA | Master plan / Z1 | P1 | Product owner | Every Release 1 page has applicable acceptance evidence | Automated + manual evidence | Page registry | Z3/Z5/Z7 | PLANNED_LATER_GATE |
| BR-018 | ORCA shall be observable, recoverable, and deployable through controlled gates | Master plan / Z1 | P0 | Owner + technical provider | Environment, health, alert, backup, restore, incident, rollback evidence exists | CI/staging drills/runbooks | BR-001..017 | Z6/Z8 | PLANNED_LATER_GATE |
| BR-019 | Existing components shall be retained only when compliant, safe, tested, and visually verified where applicable | Owner instruction / Z7 | P0 | Technical provider | Every component classified with current evidence | Z7 repository comparison | Z0-Z6 | Z7 | PLANNED_LATER_GATE |
| BR-020 | No merge to `main` or Production action shall occur without separate owner approval | Owner boundary | P0 | Company owner | Central/stage work only absent approval | Git/Production evidence | None | All | APPROVED_BASELINE |

## 4. Non-functional requirements

| ID | Requirement | Priority | Acceptance direction | Target gate | Status |
|---|---|---|---|---|---|
| NFR-001 | Authorization is server-enforced and deny-by-default | P0 | Direct negative-access tests for every P0/P1 action | Z4/Z5 | PLANNED_LATER_GATE |
| NFR-002 | Sensitive actions are auditable with actor, scope, reason, time, and outcome | P0 | Append-only/restricted evidence and tests | Z4/Z5 | PLANNED_LATER_GATE |
| NFR-003 | Critical writes are transactional and idempotent where retry/replay is possible | P0 | Duplicate/retry/concurrency/rollback tests | Z2/Z4/Z5 | PLANNED_LATER_GATE |
| NFR-004 | Provider failure does not create false business success | P0 | Timeout/error/retry/webhook/replay tests | Z4/Z5 | PLANNED_LATER_GATE |
| NFR-005 | Performance targets use measured p95/p99 and realistic volumes | P1 | Numeric budgets approved/tested | Z5/Z6 | OWNER_DECISION_REQUIRED |
| NFR-006 | Availability, MTPD, RTO, and RPO are owner-approved and evidence-backed | P0 | BIA, targets, restore drills, monitoring | Z6 | OWNER_DECISION_REQUIRED |
| NFR-007 | Releases have pinned dependencies, lockfile, vulnerability audit, SBOM, and provenance target | P0 | Blocking CI evidence | Z5/Z6 | PLANNED_LATER_GATE |
| NFR-008 | Personal data is minimized, classified, retained, and processed for documented purposes | P0 | Catalog, RoPA, rights, retention, transfer, incident controls | Z4/Z5/Z6 | PLANNED_LATER_GATE |
| NFR-009 | User-visible identifiers are meaningful; raw UUIDs are not displayed | P2 | Page/visual verification | Z3/Z7 | PLANNED_LATER_GATE |
| NFR-010 | UI layout is stable and avoids uncontrolled card growth, empty-space filling, and double scrolling | P2 | Visual/responsive verification | Z3/Z7 | PLANNED_LATER_GATE |

## 5. Z2 functional requirements

| ID | Domain | Functional requirement | Priority | Acceptance / direct evidence target | Dependencies | Status |
|---|---|---|---|---|---|---|
| FR-001 | Customer | Capture lead with source, purpose-minimum data, normalized contact, and audit | P0 | valid/invalid intake + source/audit tests | BR-005 | PLANNED_LATER_GATE |
| FR-002 | Customer | Detect and review duplicates without destructive auto-merge | P0 | deterministic duplicate + merge preservation tests | FR-001 | PLANNED_LATER_GATE |
| FR-003 | Customer | Assign/transfer leads only to active scoped users with history | P0 | inactive/out-of-scope negative tests | BR-002/005 | PLANNED_LATER_GATE |
| FR-004 | Customer | Enforce lead/opportunity state machines and outcome evidence | P0 | valid/invalid transition + won/lost evidence tests | FR-001 | PLANNED_LATER_GATE |
| FR-005 | Customer | Enforce contact purpose, consent, and opt-out where applicable | P0 | suppression and purpose tests | NFR-008 | PLANNED_LATER_GATE |
| FR-006 | Inventory | Maintain evidence/readiness, availability, price versions, and history | P0 | evidence/price/state history tests | BR-006 | PLANNED_LATER_GATE |
| FR-007 | Inventory | Atomically prevent incompatible active commitments | P0 | concurrent hold/reservation/contract tests | BR-007/NFR-003 | PLANNED_LATER_GATE |
| FR-008 | Inventory | Derive/reconcile inventory counts from authoritative unit/commitment states | P0 | reconciliation tests | FR-006/007 | PLANNED_LATER_GATE |
| FR-009 | Project | Maintain stable project/phase/building/unit hierarchy | P1 | uniqueness/parent integrity tests | BR-006 | PLANNED_LATER_GATE |
| FR-010 | Project | Block structural unit mutation after incompatible commitment | P0 | commitment mutation negative tests | FR-007/009 | PLANNED_LATER_GATE |
| FR-011 | Tour | Prevent staff/resource conflicts and preserve timezone-correct scheduling | P1 | concurrency/timezone/reschedule tests | BR-008 | PLANNED_LATER_GATE |
| FR-012 | Tour | Require outcome and follow-up decision on completion/no-show | P1 | outcome/task creation tests | FR-011/BR-013 | PLANNED_LATER_GATE |
| FR-013 | Offer | Preserve immutable offer versions and exact-version approvals | P0 | version/approval invalidation tests | BR-009 | PLANNED_LATER_GATE |
| FR-014 | Offer | Record acceptance/counter/expiry/withdrawal with evidence and authority | P0 | boundary and audit tests | FR-013 | PLANNED_LATER_GATE |
| FR-015 | Reservation | Create/expire/release reservation idempotently and atomically | P0 | duplicate/concurrency/expiry tests | FR-007/014 | PLANNED_LATER_GATE |
| FR-016 | Contract | Require fixed parties, approved template/version, authority, and evidence before activation | P0 | incomplete/unauthorized activation tests | BR-010/FR-014 | PLANNED_LATER_GATE |
| FR-017 | Contract | Verify provider/manual signature evidence without false signed state | P0 | invalid/replay/not-configured tests | BR-003/004/016 | PLANNED_LATER_GATE |
| FR-018 | Contract | Make activation idempotent and prevent duplicate obligations/commitments | P0 | retry/rollback/outbox tests | FR-015/016/NFR-003 | PLANNED_LATER_GATE |
| FR-019 | Finance | Generate invoice/installment obligations deterministically from approved source | P0 | duplicate/source-version tests | BR-011/FR-018 | PLANNED_LATER_GATE |
| FR-020 | Finance | Require verified payment evidence before paid/allocation/reconciliation states | P0 | evidence/amount/currency tests | BR-011/012 | PLANNED_LATER_GATE |
| FR-021 | Finance | Prevent over-allocation and preserve reversals/adjustments as append-only evidence | P0 | concurrency/reversal/balance tests | FR-020 | PLANNED_LATER_GATE |
| FR-022 | Finance | Separate refund request, approval, execution evidence, and reconciliation | P0 | SoD/limit/idempotency tests | BR-011 | PLANNED_LATER_GATE |
| FR-023 | Workflow | Require owner, deadline, exact subject version, evidence, escalation, and bounded retry | P0 | assignment/approval/retry/dead-letter tests | BR-013 | PLANNED_LATER_GATE |
| FR-024 | Communications | Distinguish queued/submitted/delivered/read/unknown and verify webhooks | P0 | signature/replay/timeout/truth tests | BR-004/014 | PLANNED_LATER_GATE |
| FR-025 | Support | Manage ticket triage, assignment, waiting, escalation, resolution, and reopen | P1 | lifecycle/SLA/scope tests | BR-013/014 | PLANNED_LATER_GATE |
| FR-026 | Documents | Quarantine, scan, version, authorize, retain, hold, and securely download files | P0 | spoofing/malware/access/hash/hold tests | BR-014 | PLANNED_LATER_GATE |
| FR-027 | Reporting | Version metric definitions and expose source, as-of, freshness, and scope | P1 | formula/reconciliation/scope tests | BR-015 | PLANNED_LATER_GATE |
| FR-028 | Export | Require separate export permission, purpose, field/row limits, and audit | P0 | unauthorized/large/export audit tests | FR-027/NFR-008 | PLANNED_LATER_GATE |
| FR-029 | AI | Apply use-case policy, field allowlist/redaction, untrusted-content boundary, and human review | P0 | injection/redaction/review tests | BR-016/NFR-008 | PLANNED_LATER_GATE |
| FR-030 | AI | Kill switch and provider `NOT_CONFIGURED` must block new external processing safely | P0 | disabled/provider failure tests | BR-003/004/016 | PLANNED_LATER_GATE |

## 6. Z2 domain evidence mapping

| Requirement range | Target contract evidence |
|---|---|
| FR-001..005 | `Z2/ORCA_CUSTOMER_INVENTORY_PROJECT_TOUR_CONTRACTS.md` — DOM-01 |
| FR-006..010 | same — DOM-02/DOM-03 |
| FR-011..012 | same — DOM-04 |
| FR-013..015 | `Z2/ORCA_OFFER_CONTRACT_FINANCE_CONTRACTS.md` — DOM-05 |
| FR-016..018 | same — DOM-06 |
| FR-019..022 | same — DOM-07 |
| FR-023 | `Z2/ORCA_WORKFLOW_COMMUNICATION_DOCUMENT_AI_CONTRACTS.md` — DOM-08 |
| FR-024..025 | same — DOM-09 |
| FR-026 | same — DOM-10 |
| FR-027..030 | same — DOM-11 |
| NFR-001..004 | `Z2/ORCA_DOMAIN_CONTRACT_REGISTRY.md` common command/error/audit/invariant contract |

## 7. Owner-decision linkage

| Owner decision | Related requirements | Safe default |
|---|---|---|
| Exact activities/licenses | FR-006/009/013/016/019/024/026 | Disable unproven regulated/provider action |
| Actual organization/roles | FR-003/013/016/022/023/028 | Least privilege; high-risk owner approval |
| Financial/contract limits | FR-013/016/022/023 | No self-approval; owner approval |
| Official templates/signatories | FR-016/017/019 | No invented form/authority |
| Providers/budget/locations | FR-017/020/024/026/029/030 | `NOT_CONFIGURED`; no external data/action |
| Retention | FR-002/026 + NFR-008 | Preserve; no irreversible disposal |
| Production release | BR-020 | Not authorized |

## 8. Expansion rule

Each later gate must add/refine requirements without silently changing owner decisions and link them to affected page/API/action/data/test/evidence. Z7 `KEEP` and Z8 execution authorization require complete traceability.

## 9. Current matrix decision

```text
BUSINESS REQUIREMENTS: 20
NON-FUNCTIONAL REQUIREMENTS: 10
Z2 FUNCTIONAL REQUIREMENTS: 30
DOMAIN EVIDENCE MAPPING: COMPLETE
IMPLEMENTATION CONFORMANCE: NOT ASSESSED UNTIL Z7
NEXT EXPANSION: Z3 PRODUCT EXPERIENCE
RUNTIME CHANGE: NONE
DATABASE CHANGE: NONE
PRODUCTION ACTION: NONE
```
