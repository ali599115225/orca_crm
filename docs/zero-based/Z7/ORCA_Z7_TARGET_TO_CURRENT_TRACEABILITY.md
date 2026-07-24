# ORCA Z7 — Target-to-Current Traceability

- **Document ID:** ORCA-Z7-TRACE-001
- **Version:** 1.0
- **Date:** 2026-07-25
- **Status:** `COMPLETE AT CAPABILITY / CONTROL LEVEL`
- **Assessed SHA:** `75e0e25ed0247c7da2a4720c6e8aeb27f8bba959`

## 1. Traceability matrix

| Target | Assessment unit | Current evidence | Disposition | Required reconciliation |
|---|---|---|---|---|
| Z0 / BR-001, BR-003, BR-020 | Operating model and release boundary | Single-company policy and company-owned integrations are documented; tenant-based SaaS structures still exist. | ADAPT | Retain security partition; remove product SaaS semantics; preserve no-main/no-Production gate. |
| Z1 / BR-002 | Organization/personas/authority | User role, department, tenant, authorization layer, RBAC migrations/tests exist; branch/team/org scope is sparse. | ADAPT | Approve actual organization, then extend scoped authority and negative tests. |
| Z2 DOM-01 / FR-001..005 | Customer, lead, opportunity | Lead, Contact, Opportunity, activities, assignment/archive/actions/pages/tests exist. | ADAPT | Add identity/duplicate merge, consent/purpose, exact lifecycle and outcome evidence. |
| Z2 DOM-02 / FR-006..008 | Inventory and commitments | Project/Unit and status actions exist; no dedicated atomic commitment/reservation aggregate observed. | ADAPT + MISSING | Preserve catalog; create transactional commitment model and race tests. |
| Z2 DOM-03 / FR-009..010 | Project hierarchy | Project and Unit exist, but approved phase/building hierarchy and post-commit structural locks are not directly proven. | ADAPT | Extend hierarchy/evidence/versioning with constraint tests. |
| Z2 DOM-04 / FR-011..012 | Tours | Tour model, page, actions and tests exist. Conflict, timezone, outcome and follow-up completeness are not directly proven. | ADAPT | Add resource conflict and completion/no-show evidence tests. |
| Z2 DOM-05 / FR-013..015 | Offers and reservation | Offer exists; no dedicated immutable OfferVersion, approval, or reservation aggregate observed. | REBUILD / MISSING | Introduce exact-version approval and atomic reservation contracts. |
| Z2 DOM-06 / FR-016..018 | Contracts | Contract version, offer/unit/lead linkage, payment plan, issue/sign/cancel routes and tests exist. | ADAPT | Add approved template/signatory authority, immutable evidence, amendment and idempotent activation proof. |
| Z2 DOM-07 / FR-019..022 | Finance | Rich invoice/installment/payment/accounting models and transaction-spine tests exist. | ADAPT | Resolve precision/correction policy, SoD, verified evidence, refund lifecycle and reconciliation gaps. |
| Z2 DOM-08 / FR-023 | Workflow/tasks/approvals | Task and AutomationWorkflow exist; durable run/version/approval-subject/dead-letter semantics are incomplete. | ADAPT | Create workflow-run evidence and bounded retry/escalation contracts. |
| Z2 DOM-09 / FR-024..025 | Communications/support | Email, WhatsApp, webhook, consent/opt-out and helpdesk capabilities are substantial. | ADAPT | Prove provider truth states, identity/thread integrity, retention and escalation. |
| Z2 DOM-10 / FR-026 | Documents | Document model, routes, UI and file-policy tests exist; quarantine, malware scan, immutable versions, secure object storage, hold and disposition are not proven. | REBUILD | Move to evidence-safe document lifecycle and storage boundary. |
| Z2 DOM-11 / FR-027..030 | Reporting, export, AI | Analytics, revenue intelligence, AI endpoints/providers and dashboards exist. | ADAPT + DEFER | Add versioned KPI lineage/export controls; keep AI assistive and provider-gated. |
| Z3 UX-001..020 + review | Product experience | 43 page routes and historical visual evidence exist; target item references approved: zero. | NOT_PROVEN | One surface, one approved reference, one implementation, one verification. |
| Z4 architecture/data/RBAC | Architecture and integration | 84 models, 129 APIs, 162 action contracts, authorization and outbox evidence exist. | ADAPT | Close explicit permission, transaction, event, privacy, vendor and data-lifecycle gaps. |
| Z5 security/quality | Security and quality | CI controls and audit are strong; 59 direct-test gaps remain, 25 P0/P1. | ADAPT + MISSING | Implement direct negative/concurrency/provider/file tests; add lint/tooling hardening. |
| Z6 operations/continuity | Operations and release | Health/Cron/recovery foundation exists and isolated drill passes. Production targets/drills/UAT/handover are absent. | KEEP + DEFER | Retain controls; obtain representative non-Production and owner evidence before release. |

## 2. Interpretation

- A present model, route, action, or test is evidence of implementation surface, not proof of target semantics.
- `KEEP + DEFER` means the repository control is retained while Production-specific evidence remains outside current authorization.
- `ADAPT + MISSING` separates reusable structures from absent target aggregates or controls.
- No page receives visual `KEEP` from historical closure alone because the zero-based Z3 item-level target approval count is zero.

## 3. Foundation versus product conformance

Foundation G3–G8 proves a controlled repository, security partition, contract inventory, CI evidence, operational tooling, reconciliation, and guarded release posture. It does not prove that every Z2 domain invariant, Z3 visual contract, Z4 data/privacy contract, Z5 direct test, or Z6 Production condition is complete. Z7 therefore retains the Foundation evidence while registering product gaps separately.
