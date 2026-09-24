# ORCA Z6 — Observability, Alerting, Jobs, and Runbook Contract

- **Document ID:** ORCA-Z6-OBS-001
- **Version:** 0.9 — Stacked Planning Candidate
- **Date:** 2026-07-22
- **Status:** `TARGET CONTRACT COMPLETE / TOOLING NOT SELECTED`
- **Production action authorized:** `false`

## 1. Observability model

ORCA requires correlated, privacy-safe evidence across:

- application requests and Server Actions;
- domain commands, state transitions and audit events;
- database transactions and slow/error conditions;
- background jobs, queues, retries and dead letters;
- provider calls, callbacks and verified outcomes;
- file processing and malware/quarantine states;
- authentication, authorization and emergency access;
- deployment, configuration and release identity;
- service-level indicators and business-integrity exceptions.

## 2. Structured event fields

Where applicable:

- timestamp in UTC plus display context;
- environment, release and commit/artifact identity;
- correlation and causation IDs;
- actor/service identity and trusted company scope;
- action/command/event and target human reference;
- result, safe error taxonomy and retryability;
- latency and dependency/provider segment;
- data classification and redaction marker;
- job attempt/idempotency key;
- evidence link or audit reference without embedding sensitive payload.

Secrets, PAN, CVV, passwords, tokens, private documents and unnecessary personal/AI content are prohibited in logs.

## 3. Alert contract

Every alert has:

- monitored condition and business meaning;
- severity and threshold/window;
- environment and service scope;
- owner/on-call destination;
- deduplication and suppression rule;
- runbook and first safe action;
- escalation and acknowledgement target;
- recovery/closure signal;
- privacy and access classification;
- review date and false-positive tracking.

An alert without an owner and runbook is not release-ready.

## 4. Initial alert families

| ID | Condition | Safe first response |
|---|---|---|
| ALT-001 | authentication/authorization anomaly | contain/revoke and preserve evidence |
| ALT-002 | cross-scope or denied-access spike | investigate abuse/configuration; do not widen access |
| ALT-003 | inventory commitment conflict/integrity exception | freeze affected commitment and reconcile |
| ALT-004 | contract/finance state inconsistency | block finalization and route to authorized review |
| ALT-005 | provider timeout/unknown/replay/signature failure | preserve unknown state, stop false success, reconcile |
| ALT-006 | missed/failed/retrying job beyond threshold | inspect idempotency/dead letter and controlled retry |
| ALT-007 | backup stale/failure or restore evidence overdue | block readiness claim and escalate |
| ALT-008 | elevated error/latency or SLO burn | classify dependency versus ORCA and apply release freeze if needed |
| ALT-009 | secret/dependency/security scan failure | block merge/release and isolate remediation |
| ALT-010 | log/privacy masking violation | contain logs, restrict access and start incident assessment |

## 5. Job and cron contract

Every job defines:

- business owner and technical owner;
- schedule/timezone or event trigger;
- trusted scope and authorization model;
- input schema and data classification;
- idempotency key and duplicate behavior;
- timeout, retry/backoff and maximum attempts;
- concurrency and overlap rule;
- dead-letter/quarantine behavior;
- business result versus invocation result;
- metrics, alert, runbook and manual replay authority;
- disable/kill switch and recovery reconciliation.

## 6. Runbook minimum structure

1. purpose and trigger;
2. prerequisites and access level;
3. safety warnings and prohibited actions;
4. diagnosis using approved evidence;
5. containment and decision points;
6. recovery/rollback/forward-fix steps;
7. verification and reconciliation;
8. escalation and communications;
9. evidence to retain;
10. owner, version and last exercise date.

## 7. Current result

```text
OBSERVABILITY DOMAINS: DEFINED
STRUCTURED EVENT CONTRACT: DEFINED
INITIAL ALERT FAMILIES: 10
JOB/CRON CONTRACT: DEFINED
RUNBOOK TEMPLATE: 10 FIELDS
MONITORING VENDOR/TOOLS: NOT SELECTED
CURRENT CONFORMANCE: Z7 REQUIRED
PRODUCTION ACTION: NONE
```
