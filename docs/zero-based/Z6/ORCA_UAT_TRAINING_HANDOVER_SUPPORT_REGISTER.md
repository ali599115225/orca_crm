# ORCA Z6 — UAT, Training, Handover, Support, and Acceptance Register

- **Document ID:** ORCA-Z6-HANDOVER-001
- **Version:** 0.9 — Stacked Planning Candidate
- **Date:** 2026-07-22
- **Status:** `TARGET REGISTER COMPLETE / PEOPLE AND SCHEDULE OPEN`
- **Production action authorized:** `false`

## 1. Purpose

Define how ORCA is accepted and transferred to the company so the platform can be operated without hidden dependence on the developer.

## 2. UAT contract

Each UAT scenario records:

- requirement/process/page IDs;
- role and organizational/resource scope;
- preconditions and test data;
- steps and expected business outcome;
- permission, failure and recovery variants;
- owner-approved visual reference when UI is involved;
- observed result and evidence;
- severity of exception;
- acceptance, conditional acceptance or rejection;
- signer and date.

UAT does not replace security, automated, performance, recovery or accessibility verification.

## 3. Minimum UAT journeys

1. lead/customer intake to qualified/won/lost outcome;
2. inventory readiness and availability;
3. tour scheduling to outcome and follow-up;
4. offer negotiation to accepted version and reservation;
5. contract draft, approval, evidence and activation;
6. invoice/installment and payment-evidence reconciliation;
7. task/approval escalation and verified closure;
8. support/communication with provider-not-configured and failure states;
9. document upload/version/access;
10. reports/exceptions with freshness and authorization;
11. user lifecycle and access review;
12. incident/restore/rollback operational exercise.

## 4. Training register

| Audience | Training scope | Evidence |
|---|---|---|
| Company owner/executive | governance, approvals, risk, reports, release authority | attendance + scenario completion |
| Administrators | users, roles, providers, templates, retention, audit | role-based exercise |
| Sales/operations | customers, opportunities, tours, offers, tasks | workflow exercise |
| Inventory/project team | assets, units, commitments, project status | workflow exercise |
| Contract/finance | versions, approvals, invoices, evidence, reconciliation | controlled scenario |
| Support/communications | tickets, conversations, provider states | failure/recovery scenario |
| Technical/operations owner | deployment evidence, monitoring, jobs, backup, incident | runbook drill |
| Auditor/privacy role | audit, export controls, rights/retention evidence | evidence review |

## 5. Handover package

- product and scope statement;
- architecture and domain/data contracts;
- environment/configuration inventory without exposing secrets;
- source repository, branch and release policy;
- provider/vendor/cost register;
- security, privacy, regulatory and risk registers;
- API/event/job and data dictionaries;
- runbooks, backup/restore and incident procedures;
- SBOM/provenance/test/UAT evidence package;
- user/admin/operations manuals;
- open decisions, accepted risks, deferred items and known limitations;
- warranty/support terms, escalation and exit/transition procedure.

## 6. Acceptance states

- `NOT_READY`
- `READY_FOR_UAT`
- `UAT_IN_PROGRESS`
- `CHANGES_REQUIRED`
- `CONDITIONALLY_ACCEPTED`
- `OWNER_ACCEPTED`
- `PRODUCTION_AUTHORIZATION_PENDING`
- `HANDED_OVER`
- `WARRANTY_ACTIVE`
- `SUPPORT_TRANSITIONED`

Owner acceptance does not itself authorize Production deployment unless the explicit Production state is also approved.

## 7. Support and warranty boundaries

Must define:

- start/end and covered release;
- defect versus enhancement;
- response/target by severity and support hours;
- supported environments/providers;
- excluded third-party outages and company misconfiguration;
- evidence/access required for diagnosis;
- emergency-change authority;
- data/privacy/security handling;
- maintenance and renewal decision;
- transition/export on termination.

## 8. Current result

```text
MINIMUM UAT JOURNEYS: 12
TRAINING AUDIENCES: 8
HANDOVER PACKAGE: DEFINED
ACCEPTANCE STATES: DEFINED
NAMED TRAINEES/SIGNERS/SCHEDULE: OWNER DECISION REQUIRED
UAT EXECUTED: NO
HANDOVER COMPLETED: NO
PRODUCTION ACTION: NONE
```
