# ORCA Z4 — Data, Privacy, Authorization, Integration, and Architecture Traceability

- **Document ID:** ORCA-Z4-RTM-001
- **Version:** 0.9 — Stacked Planning Candidate
- **Date:** 2026-07-22
- **Status:** `READY FOR CENTRAL RTM RECONCILIATION`
- **Parent matrix:** `docs/zero-based/ORCA_REQUIREMENTS_TRACEABILITY_MATRIX.md`
- **Production action authorized:** `false`

## 1. Purpose

Register Z4 requirements while Z1 central merge and Z2/Z3 stacked validation remain pending. These rows must be reconciled into the central requirements matrix before Z4 central closure.

Status values used here:

- `TEXT_CONTRACT_DEFINED`
- `OWNER_DECISION_REQUIRED`
- `Z7_CONFORMANCE_REQUIRED`
- `Z8_IMPLEMENTATION_REQUIRED`
- `PROHIBITED`

## 2. Data requirements

| ID | Requirement | Priority | Owner | Acceptance | Verification | Status |
|---|---|---:|---|---|---|---|
| DATA-001 | Every target data element has purpose, owner, source, classification, retention, scope, and evidence metadata | P0 | Domain/data owner | no uncatalogued target field | catalog reconciliation | TEXT_CONTRACT_DEFINED |
| DATA-002 | `tenantId` remains the trusted single-company security partition until a separately authorized transition | P0 | Owner + architecture/security | no client-selected company scope; no automatic removal | negative scope tests + Z7 mapping | TEXT_CONTRACT_DEFINED |
| DATA-003 | Core records use immutable internal IDs and meaningful human references | P1 | Domain owners | raw UUID is not primary user reference | UI/API/data tests | TEXT_CONTRACT_DEFINED |
| DATA-004 | Accepted offers, active contracts, financial evidence, and material approvals preserve immutable versions/evidence | P0 | Commercial/contract/finance | later changes create explicit versions/transitions | state/integrity tests | TEXT_CONTRACT_DEFINED |
| DATA-005 | Inventory commitments prevent incompatible concurrent reservation/sale | P0 | Inventory/operations | concurrent attempts cannot both succeed incompatibly | transaction/concurrency tests | TEXT_CONTRACT_DEFINED |
| DATA-006 | Financial values use exact decimal and currency; external payment truth requires evidence | P0 | Finance | no floating-point or UI-only confirmation | schema/domain/provider tests | TEXT_CONTRACT_DEFINED |
| DATA-007 | PAN, CVV, PIN, magnetic-stripe, and sensitive card-authentication data are never stored | P0 | Owner + security | no prohibited fields/files/logs/prompts | model/code/log/file scan | PROHIBITED |
| DATA-008 | Cross-domain writes use owned commands/events and preserve domain ownership | P0 | Architecture/domain owners | no uncontrolled direct mutation across domains | dependency and contract tests | TEXT_CONTRACT_DEFINED |

## 3. Privacy and records requirements

| ID | Requirement | Priority | Owner | Acceptance | Verification | Status |
|---|---|---:|---|---|---|---|
| PRIV-001 | Controller/processor/vendor roles are documented contractually | P0 | Company owner/legal | approved DPA and responsibility allocation | contract/evidence review | OWNER_DECISION_REQUIRED |
| PRIV-002 | ORCA maintains a Record of Processing Activities for approved processing | P0 | Privacy/data owner | every activity has purpose, data, subjects, recipients, locations, retention, controls | RoPA review | TEXT_CONTRACT_DEFINED |
| PRIV-003 | Personal data is purpose-limited and minimized at field, report, log, export, provider, and AI levels | P0 | Domain/privacy owners | unnecessary fields/context are absent | catalog/payload/log review | TEXT_CONTRACT_DEFINED |
| PRIV-004 | Data-subject rights use a tracked, verified, auditable workflow | P0 | Privacy/legal/operations | intake through evidence-backed completion | workflow and evidence tests | TEXT_CONTRACT_DEFINED |
| PRIV-005 | Retention uses approved classes, legal hold, disposal evidence, and backup-aware status | P0 | Owner/legal/record owner | no silent or premature deletion | schedule + disposal drill | OWNER_DECISION_REQUIRED |
| PRIV-006 | Cross-border/provider processing remains blocked until location, DPA, subprocessors, and safeguards are approved | P0 | Owner/legal/security | unknown transfer remains not configured | vendor/activation evidence | TEXT_CONTRACT_DEFINED |
| PRIV-007 | High-risk/new processing triggers a privacy/impact assessment before activation | P0 | Owner/privacy/security | assessment decision attached to activation | gate review | TEXT_CONTRACT_DEFINED |
| PRIV-008 | Privacy/security incidents record scope, impact, containment, decisions, notifications, and recovery without exposing excess data | P0 | Incident/privacy owners | complete incident evidence and safe logs | exercise/audit | TEXT_CONTRACT_DEFINED |

## 4. Authorization and access requirements

| ID | Requirement | Priority | Owner | Acceptance | Verification | Status |
|---|---|---:|---|---|---|---|
| AUTH-001 | All protected operations are deny-by-default and server-authorized | P0 | Security/domain owners | no UI-only authority | direct negative tests | TEXT_CONTRACT_DEFINED |
| AUTH-002 | Access context revalidates active user, company, role, permission, assignments, delegation, and scope | P0 | Security | trusted server context for each sensitive action | session/revalidation tests | TEXT_CONTRACT_DEFINED |
| AUTH-003 | Company, branch, department, team, self, resource, and trusted-job scopes are explicit | P0 | Owner + operations/security | every permission has applicable scope | matrix and negative tests | TEXT_CONTRACT_DEFINED |
| AUTH-004 | Sensitive fields, documents, searches, and exports have masking and additional authority controls | P0 | Data/security owners | record access does not imply full-field/export access | field/export tests | TEXT_CONTRACT_DEFINED |
| AUTH-005 | Offer, contract, finance, refund, settlement, role, provider, retention, and audit duties enforce segregation | P0 | Owner + process authorities | incompatible self-approval blocked or formally excepted | SoD tests | OWNER_DECISION_REQUIRED |
| AUTH-006 | Joiner/mover/leaver processes grant least privilege and promptly revoke/transfer access | P0 | Administration/security | effective-dated access lifecycle and ownership transfer | lifecycle tests/evidence | TEXT_CONTRACT_DEFINED |
| AUTH-007 | Delegation and temporary access are bounded, approved, conflict-checked, audited, and auto-expire | P0 | Owner/manager/security | no standing hidden elevation | delegation tests | TEXT_CONTRACT_DEFINED |
| AUTH-008 | Break-glass access is exceptional, strongly authenticated, short-lived, alerted, reviewed, and separately gated for Production | P0 | Owner/security | no normal use or unreviewed elevation | drill and audit | OWNER_DECISION_REQUIRED |

## 5. Architecture, API, event, and job requirements

| ID | Requirement | Priority | Owner | Acceptance | Verification | Status |
|---|---|---:|---|---|---|---|
| ARCH-001 | Domain modules own state and expose typed command/query contracts | P0 | Architecture/domain owners | dependency graph has no uncontrolled circular/direct mutation | architecture tests | TEXT_CONTRACT_DEFINED |
| ARCH-002 | APIs and Server Actions validate input, reauthorize, enforce scope/state/concurrency, and return safe typed results | P0 | API/domain owners | direct positive and negative contract tests | API/action tests | TEXT_CONTRACT_DEFINED |
| ARCH-003 | Approved external/integration HTTP interfaces have versioned OpenAPI and compatibility policy | P1 | Architecture/integration | schema, lifecycle, owner, tests, deprecation defined | OpenAPI diff/contract tests | Z8_IMPLEMENTATION_REQUIRED |
| ARCH-004 | Critical writes are transactional and create required audit/outbox evidence atomically | P0 | Domain/database owners | rollback and publication consistency proven | transaction tests | TEXT_CONTRACT_DEFINED |
| ARCH-005 | Retryable commands, callbacks, jobs, and imports are idempotent | P0 | Domain/integration/operations | duplicate/replay cannot create duplicate effect | replay/idempotency tests | TEXT_CONTRACT_DEFINED |
| ARCH-006 | Events use versioned minimal envelopes with company scope, aggregate version, correlation, causation, and classification | P0 | Architecture/domain owners | schema/consumer compatibility and privacy review | event tests | TEXT_CONTRACT_DEFINED |
| ARCH-007 | Jobs define owner, trusted scope, idempotency, timeout, retries, concurrency, dead letter, evidence, metrics, and disable switch | P0 | Operations/domain owner | invocation and business result are observable/recoverable | job tests/runbook | TEXT_CONTRACT_DEFINED |
| ARCH-008 | Errors use the approved taxonomy and never generate false business success or expose secrets | P0 | Architecture/domain owners | safe Arabic error + internal correlation | failure tests/log review | TEXT_CONTRACT_DEFINED |

## 6. Integration and vendor requirements

| ID | Requirement | Priority | Owner | Acceptance | Verification | Status |
|---|---|---:|---|---|---|---|
| INT-001 | Provider accounts, subscriptions, identities, licenses, and Production credentials belong to the company | P0 | Company owner | no developer-owned provider dependency | ownership/secret review | TEXT_CONTRACT_DEFINED |
| INT-002 | Every provider has vendor/subprocessor, purpose, data, location, DPA/SLA, cost, exit, and activation evidence | P0 | Owner + technical owner | no material unknown at activation | readiness register | OWNER_DECISION_REQUIRED |
| INT-003 | Providers are contained behind provider-neutral adapters | P0 | Integration architecture | provider types/SDKs do not leak into domains/UI | architecture/adapter tests | TEXT_CONTRACT_DEFINED |
| INT-004 | `NOT_CONFIGURED` is safe, visible, non-blocking for unrelated features, and never false success | P0 | Integration/product owners | no crash or fabricated connected state | no-config tests/UI states | TEXT_CONTRACT_DEFINED |
| INT-005 | Webhooks verify signature, timestamp/replay, account scope, schema, and idempotency before business processing | P0 | Integration/security | invalid/replayed/malformed events cannot alter state | security tests | TEXT_CONTRACT_DEFINED |
| INT-006 | Timeout/unknown provider outcomes enter reconciliation rather than success | P0 | Integration/domain owners | `PAID/SENT/SIGNED/REFUNDED` require verified evidence | timeout/reconciliation tests | TEXT_CONTRACT_DEFINED |
| INT-007 | Mock and sandbox evidence covers success, rejection, timeout, quota, outage, duplicate, replay, and recovery | P0 | Integration/QA | deterministic contract evidence before activation | test matrix | Z8_IMPLEMENTATION_REQUIRED |
| INT-008 | Provider exit supports export, pending-operation reconciliation, credential revocation, replacement, deletion/retention evidence, and cost closure | P1 | Owner + integration/operations | tested exit runbook | portability/exit drill | OWNER_DECISION_REQUIRED |

## 7. Reconciliation rule

Before Z4 central closure:

1. Merge/reconcile these requirements into `ORCA_REQUIREMENTS_TRACEABILITY_MATRIX.md`.
2. Link each requirement to Z2 domain contracts, Z3 surfaces, Z4 architecture records, owner decisions, and later Z5/Z6 verification.
3. Record current repository files/routes/APIs/tables/tests only during Z7 comparison.
4. Do not change a requirement to `VERIFIED` from a similarly named current test or report alone.

## 8. Current result

```text
Z4 REQUIREMENTS REGISTERED: 40
DATA: 8
PRIVACY / RECORDS: 8
AUTHORIZATION: 8
ARCHITECTURE / API / EVENTS / JOBS: 8
INTEGRATION / VENDOR: 8
FINAL CENTRAL RTM RECONCILIATION REQUIRED: YES
RUNTIME IMPLEMENTATION VERIFIED: NO
PRODUCTION ACTION: NONE
```
