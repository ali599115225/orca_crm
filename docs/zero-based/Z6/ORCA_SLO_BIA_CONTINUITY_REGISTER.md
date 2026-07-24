# ORCA Z6 — Business Impact, SLO, RTO, RPO, and Continuity Register

- **Document ID:** ORCA-Z6-CONT-001
- **Version:** 0.9 — Stacked Planning Candidate
- **Date:** 2026-07-22
- **Status:** `CONTINUITY MODEL DEFINED / OWNER TARGETS REQUIRED`
- **Production action authorized:** `false`

## 1. Purpose

Define continuity priorities and measurable service objectives without inventing achieved availability or recovery capability.

## 2. Business service tiers

| Tier | Service group | Business impact if unavailable | Safe continuity direction |
|---|---|---|---|
| T0 | identity, authorization, audit integrity | unauthorized access or inability to trust actions | fail closed; emergency governance |
| T1 | customer, inventory commitment, offers/contracts, finance evidence | lost transaction, double commitment, legal/financial uncertainty | restore first; manual freeze and reconciliation |
| T2 | tasks, tours, communications, support, documents | delayed operation and customer response | controlled manual queue and later synchronization |
| T3 | reports, analytics, AI assistance, non-critical administration | reduced insight/productivity | disable safely; no fabricated stale result |

Final tiering is owner-approved after the Business Impact Analysis.

## 3. Required BIA fields

For each service/process:

- business owner and technical owner;
- dependent users, data, providers and jobs;
- financial, contractual, privacy, regulatory and reputation impact;
- maximum tolerable period of disruption (MTPD);
- target recovery time (RTO);
- target recovery point (RPO);
- minimum acceptable service level;
- manual workaround and its capacity/expiry;
- communication and escalation requirements;
- recovery dependencies and evidence.

## 4. Owner-target register

| ID | Target | Status | Safe default |
|---|---|---|---|
| CONT-001 | MTPD per T0–T3 service | OWNER_DECISION_REQUIRED | no readiness claim; prioritize integrity |
| CONT-002 | RTO per service/data store | OWNER_DECISION_REQUIRED | documented proposal only |
| CONT-003 | RPO per data class | OWNER_DECISION_REQUIRED | preserve and avoid destructive changes |
| CONT-004 | availability SLO | OWNER_DECISION_REQUIRED | measure before commitment |
| CONT-005 | error budget and escalation threshold | OWNER_DECISION_REQUIRED | any integrity/security breach is zero-tolerance event |
| CONT-006 | support hours and response targets | OWNER_DECISION_REQUIRED | no 24/7 promise |
| CONT-007 | restore-drill frequency | OWNER_DECISION_REQUIRED | before release and periodically thereafter |
| CONT-008 | incident notification authority | OWNER_DECISION_REQUIRED | owner/security/privacy escalation |

## 5. Service-level indicators

Target SLI families:

- authenticated request success and latency;
- critical write completion and confirmed business outcome;
- job schedule adherence, completion, retry and dead-letter rate;
- provider invocation versus verified outcome;
- database availability, replication/backup freshness and restore evidence;
- object/document availability and access failures;
- webhook verification/replay rejection;
- queue age for tasks, approvals, reconciliation and support;
- error rate by safe taxonomy;
- data integrity exceptions and stale-state age.

## 6. Error budget rules

- security, unauthorized access, double commitment, false payment/contract status and unreconciled data corruption are not ordinary availability-budget consumption;
- repeated budget burn triggers release freeze, root-cause review and corrective work;
- planned maintenance is identified separately and communicated;
- provider-caused failures remain visible and do not become false ORCA success;
- no SLO can be claimed from CI pass rates alone.

## 7. Continuity strategies

| Failure | Strategy |
|---|---|
| application deployment failure | rollback immutable release or forward-fix under incident control |
| database unavailability/corruption | fail writes safely, restore verified backup, reconcile business state |
| object storage failure | preserve metadata/evidence references, retry safely, block false completion |
| provider outage | `NOT_CONFIGURED`/degraded/unknown state, queue or manual path, reconcile |
| identity provider/session issue | fail closed with controlled emergency access |
| job/cron failure | observable missed run, idempotent retry, dead letter and owner alert |
| region/platform outage | owner-approved portability and recovery strategy |
| privacy/security incident | containment, evidence preservation, decision and notification workflow |

## 8. Current result

```text
SERVICE TIERS: 4 PROPOSED
BIA FIELD CONTRACT: COMPLETE
MTPD/RTO/RPO/SLO NUMERIC TARGETS: OWNER DECISION REQUIRED
SLI FAMILIES: DEFINED
ERROR-BUDGET RULES: DEFINED
CURRENT ACHIEVEMENT: NOT CLAIMED
RUNTIME CHANGE: NONE
PRODUCTION ACTION: NONE
```
