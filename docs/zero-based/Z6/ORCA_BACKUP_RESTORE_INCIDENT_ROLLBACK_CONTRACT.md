# ORCA Z6 — Backup, Restore, Incident, and Rollback Contract

- **Document ID:** ORCA-Z6-REC-001
- **Version:** 0.9 — Stacked Planning Candidate
- **Date:** 2026-07-22
- **Status:** `TARGET CONTRACT COMPLETE / OPERATIONAL EVIDENCE PENDING`
- **Production action authorized:** `false`

## 1. Backup contract

Every protected data store has:

- owner, scope and classification;
- backup method and schedule;
- encryption and access control;
- retention and legal-hold interaction;
- location and cross-border assessment;
- integrity verification;
- failure alert and escalation;
- restore procedure and dependency order;
- disposal evidence at end of retention.

A backup job marked successful is not sufficient evidence until restore succeeds and business reconciliation is completed.

## 2. Restore drill

Each drill records:

1. source backup identifier and age;
2. target isolated environment;
3. start/end time and measured RTO/RPO;
4. database/schema/application compatibility;
5. object/document evidence where applicable;
6. record counts and domain integrity checks;
7. customer, inventory commitment, contract and finance reconciliation;
8. authorization and audit verification;
9. observed gaps and corrective owner;
10. signed closure or retest requirement.

No restore drill uses or overwrites Production without separate emergency authorization.

## 3. Incident severity

| Severity | Description | Examples |
|---|---|---|
| SEV-0 | active catastrophic security/integrity or major legal/financial exposure | cross-scope breach, widespread data corruption, false settlement |
| SEV-1 | critical service or material business process unavailable/unsafe | contract/finance spine blocked, identity control failure |
| SEV-2 | degraded process with bounded workaround | provider outage, delayed jobs, partial document access |
| SEV-3 | limited defect or low-impact operational issue | isolated UI/report issue without integrity risk |

Final response/notification targets require owner approval.

## 4. Incident lifecycle

`DETECTED → TRIAGED → CONTAINED → EVIDENCE_PRESERVED → RECOVERY_IN_PROGRESS → RECONCILED → MONITORED → CLOSED → POST_INCIDENT_ACTIONS`

Every incident has:

- incident commander/decision authority;
- technical, business, privacy/security and communication roles as applicable;
- timeline, impacted services/data/users and uncertainty;
- containment and safe-state decision;
- evidence and correlation identifiers;
- recovery/rollback/forward-fix decision;
- internal/external notification decision by authorized owner/adviser;
- post-incident causes, control failures and tracked actions.

## 5. Rollback and forward-fix

A change package specifies:

- exact source and artifact;
- data/schema/provider/config side effects;
- rollback feasibility and time limit;
- forward-fix alternative;
- feature-disable/kill switch where applicable;
- migration rollback or compensating migration plan;
- reconciliation required after rollback;
- acceptance checks and authority.

Rollback is not automatically safer when it would destroy new valid data or reintroduce a security defect. The decision is evidence-based.

## 6. Data integrity reconciliation

After recovery, verify at minimum:

- identities, active assignments and revoked access;
- customer and lead references;
- property/unit availability and active commitments;
- offer/reservation/contract version linkage;
- invoices, installments, payment evidence and settlement status;
- task/job retries and duplicate effects;
- documents and audit correlation;
- provider requests versus verified outcomes.

Unknown outcomes remain explicit; they are not converted to success for closure.

## 7. Current result

```text
BACKUP CONTRACT: DEFINED
RESTORE DRILL EVIDENCE FIELDS: 10
INCIDENT SEVERITIES: 4
INCIDENT LIFECYCLE: DEFINED
ROLLBACK/FORWARD-FIX CONTRACT: DEFINED
CURRENT PRODUCTION RESTORE READINESS: NOT CLAIMED
RUNTIME CHANGE: NONE
PRODUCTION ACTION: NONE
```
