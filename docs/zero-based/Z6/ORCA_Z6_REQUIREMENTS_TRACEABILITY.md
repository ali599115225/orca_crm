# ORCA Z6 — Operations and Continuity Requirements Traceability

- **Document ID:** ORCA-Z6-RTM-001
- **Version:** 0.9 — Stacked Planning Candidate
- **Date:** 2026-07-22
- **Status:** `REQUIREMENTS REGISTERED / CENTRAL RECONCILIATION PENDING`
- **Production action authorized:** `false`

## 1. Environment and deployment requirements

| ID | Requirement | Priority | Acceptance | Verification | Status |
|---|---|---:|---|---|---|
| OPS-001 | Local, CI, Preview, Staging and Production are explicitly separated | P0 | no credential/data/endpoint leakage | config/environment review | TEXT_CONTRACT_DEFINED |
| OPS-002 | Production deployment requires separate explicit owner authorization | P0 | non-Production approval cannot deploy Production | release gate test/review | TEXT_CONTRACT_DEFINED |
| OPS-003 | Configuration is typed, validated, environment-scoped and safely provider-gated | P0 | invalid/missing config fails safely | startup/no-config tests | TEXT_CONTRACT_DEFINED |
| OPS-004 | Release candidate preserves source, artifact, SBOM, tests and deployment identity | P0 | evidence chain is complete | release package review | Z8_IMPLEMENTATION_REQUIRED |
| OPS-005 | Production, secret, migration and provider changes have independent approval/evidence | P0 | application release cannot imply them | change-control review | TEXT_CONTRACT_DEFINED |
| OPS-006 | Rollback/forward-fix and reconciliation are defined per material change | P0 | failure can recover without silent data loss | release rehearsal | TEXT_CONTRACT_DEFINED |

## 2. Continuity and recovery requirements

| ID | Requirement | Priority | Acceptance | Verification | Status |
|---|---|---:|---|---|---|
| OPS-007 | Every critical service has business owner, MTPD, RTO, RPO and workaround | P0 | BIA row approved | BIA review | OWNER_TARGET_REQUIRED |
| OPS-008 | Availability and reliability use measured SLO/SLI/error budget | P0 | no availability claim without evidence | monitoring report | OWNER_TARGET_REQUIRED |
| OPS-009 | Backups are encrypted, monitored, retained and restore-tested | P0 | successful isolated restore with integrity checks | restore drill | TEXT_CONTRACT_DEFINED |
| OPS-010 | Recovery includes domain and provider reconciliation | P0 | no unknown state converted to success | reconciliation drill | TEXT_CONTRACT_DEFINED |
| OPS-011 | Incident lifecycle preserves evidence, authority, communication and post-actions | P0 | complete incident record | exercise/audit | TEXT_CONTRACT_DEFINED |
| OPS-012 | Security/privacy/integrity events are not hidden inside ordinary error budgets | P0 | dedicated escalation/containment | incident scenario | TEXT_CONTRACT_DEFINED |

## 3. Observability and job requirements

| ID | Requirement | Priority | Acceptance | Verification | Status |
|---|---|---:|---|---|---|
| OPS-013 | Logs/metrics/traces correlate request, actor, scope, action, result and release safely | P0 | investigation possible without secret leakage | observability review | TEXT_CONTRACT_DEFINED |
| OPS-014 | Every alert has owner, threshold, runbook, escalation and recovery signal | P0 | no orphan alert | alert register review | TEXT_CONTRACT_DEFINED |
| OPS-015 | Jobs define scope, idempotency, retry, timeout, concurrency, dead letter and replay authority | P0 | duplicate/failure behavior proven | job contract tests | TEXT_CONTRACT_DEFINED |
| OPS-016 | Missed/failed jobs are visible and cannot create false business completion | P0 | safe state and owner alert | failure tests | TEXT_CONTRACT_DEFINED |
| OPS-017 | Logs prohibit secrets, PAN, tokens, private documents and unnecessary personal/AI content | P0 | zero prohibited content | log scan | TEXT_CONTRACT_DEFINED |
| OPS-018 | Runbooks are versioned and exercised | P1 | owner, date, evidence and actions recorded | drill review | Z8_IMPLEMENTATION_REQUIRED |

## 4. Cost, capacity, handover and support requirements

| ID | Requirement | Priority | Acceptance | Verification | Status |
|---|---|---:|---|---|---|
| OPS-019 | Every vendor/license has company owner, cost drivers, quotas, DPA/location and exit | P0 | readiness register complete before activation | vendor review | OWNER_DECISION_REQUIRED |
| OPS-020 | Capacity planning uses approved users/data/traffic/job/log assumptions | P1 | representative forecast and test | capacity review | OWNER_TARGET_REQUIRED |
| OPS-021 | Spend caps and quota alerts prevent silent overrun; paid upgrades require owner approval | P0 | no automatic financial commitment | billing/control review | TEXT_CONTRACT_DEFINED |
| OPS-022 | UAT covers Release 1 journeys, authority, failure and recovery | P0 | owner-signed evidence | UAT register | Z8_REQUIRED |
| OPS-023 | Training is role-based and includes operational/security/privacy scenarios | P1 | attendance plus scenario completion | training evidence | OWNER_SCHEDULE_REQUIRED |
| OPS-024 | Handover contains source, architecture, security, operations, evidence, limitations and exit | P0 | complete accepted package | handover checklist | Z8_REQUIRED |
| OPS-025 | Warranty/support scope, hours, severity, exclusions and transition are explicit | P1 | no implied unlimited/24x7 support | contract/register review | OWNER_DECISION_REQUIRED |
| OPS-026 | Production acceptance is distinct from UAT, owner acceptance and handover | P0 | only explicit release state authorizes deploy | gate review | TEXT_CONTRACT_DEFINED |

## 5. Totals

```text
ENVIRONMENT/DEPLOYMENT REQUIREMENTS: 6
CONTINUITY/RECOVERY REQUIREMENTS: 6
OBSERVABILITY/JOB REQUIREMENTS: 6
COST/CAPACITY/HANDOVER REQUIREMENTS: 8
TOTAL Z6 REQUIREMENTS: 26
CURRENT IMPLEMENTATION CONFORMANCE: NOT ASSESSED
CENTRAL RTM RECONCILIATION: PENDING
PRODUCTION ACTION: NONE
```
