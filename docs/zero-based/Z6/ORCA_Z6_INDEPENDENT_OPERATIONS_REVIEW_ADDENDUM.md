# ORCA Z6 — Independent Operations and Continuity Review Addendum

- **Document ID:** ORCA-Z6-REVIEW-ADD-001
- **Version:** 1.0 — Unpublished stacked preparation
- **Date:** 2026-07-22
- **Status:** `PRE-PUBLICATION REVIEW COMPLETE / OPERATIONAL EVIDENCE NOT ASSESSED`
- **Production action authorized:** `false`

## 1. Purpose

Record an independent review of the Z6 planning candidate and add operational controls needed for a single-owner project, external-platform dependency, business continuity, and eventual handover. This addendum does not select vendors or create environments.

## 2. Review result

The existing Z6 candidate correctly separates environments, release authority, configuration, SLO/BIA, backup/restore, incident response, rollback, observability, jobs, costs, UAT, training and handover.

The review identified material operational details that must be explicit before Z7 can compare the current system or Z8 can authorize execution.

## 3. Additional operations requirements

| ID | Requirement | Priority | Required acceptance evidence | Current state |
|---|---|---:|---|---|
| OPS-027 | The single-owner/key-person risk has a documented continuity, credential-recovery and emergency delegation plan | P0 | tested access-recovery and sealed ownership inventory | TEXT CONTRACT ADDED |
| OPS-028 | Domain registrar, DNS, certificates, source, deployment, database, storage and provider accounts have company ownership and recovery paths | P0 | ownership/recovery evidence without exposing secrets | TEXT CONTRACT ADDED |
| OPS-029 | Release/change calendar defines freeze windows, high-risk windows, emergency authority and post-change observation | P1 | approved calendar and change record | TEXT CONTRACT ADDED |
| OPS-030 | Incident communications define internal, customer, provider, legal/privacy and public-status channels without premature claims | P0 | communication templates and exercise | TEXT CONTRACT ADDED |
| OPS-031 | Monitoring data has retention, access, residency, cost, redaction and disposal rules | P0 | telemetry data inventory and retention evidence | TEXT CONTRACT ADDED |
| OPS-032 | Backup strategy covers database, object storage, configuration metadata, provider/export evidence and critical account recovery | P0 | complete protected-asset backup matrix | TEXT CONTRACT ADDED |
| OPS-033 | Recovery ordering includes identity, secrets, DNS/certificates, database, storage, application, jobs and providers | P0 | dependency-ordered restore drill | TEXT CONTRACT ADDED |
| OPS-034 | Manual continuity procedures define authority, capacity, expiry, reconciliation and secure evidence handling | P0 | timed manual-workaround exercise | TEXT CONTRACT ADDED |
| OPS-035 | Platform/provider exit includes export format, completeness verification, transition period and revocation/disposal | P0 | exit drill or provider-independent rehearsal | TEXT CONTRACT ADDED |
| OPS-036 | Deployment and migration rehearsals include partial failure, interrupted execution and recovery from unknown state | P0 | fault-injected rehearsal evidence | TEXT CONTRACT ADDED |
| OPS-037 | Capacity planning includes external hard limits, build quotas, storage/log growth, queue backlog and recovery surge | P1 | limit register and representative stress test | TEXT CONTRACT ADDED |
| OPS-038 | Time synchronization, clock drift and timezone handling are monitored for audit, expiry, jobs and provider signatures | P0 | UTC/Asia-Riyadh boundary and drift tests | TEXT CONTRACT ADDED |
| OPS-039 | Evidence retention covers CI artifacts, release packages, incident timelines, restore drills and owner approvals | P0 | retention/access/disposal register | TEXT CONTRACT ADDED |
| OPS-040 | Support transition includes unresolved incidents, expiring credentials, renewals, accepted risks and scheduled operational actions | P1 | signed transition checklist | TEXT CONTRACT ADDED |

## 4. Required operating registers before Z8

1. Company account and recovery inventory.
2. Environment and credential ownership matrix.
3. Change calendar and freeze policy.
4. Incident contact tree and communication templates.
5. Protected-asset backup matrix.
6. Recovery dependency order and reconciliation checklist.
7. Manual continuity procedure register.
8. Vendor/platform exit checklist.
9. Telemetry retention and cost register.
10. Operational evidence-retention schedule.

## 5. Single-owner safe default

Until a second authorized operator or documented emergency delegate exists:

- no claim of 24/7 support or continuous operational coverage;
- no Production credential may exist only in a developer-controlled personal account;
- recovery materials must be company-controlled and access-tested;
- automation must fail safely when human intervention is unavailable;
- irreversible changes require explicit owner authorization and recovery evidence.

## 6. Z7 verification mapping

Z7 must inspect repository workflows, configuration, runbooks, scheduled jobs, provider integrations, backup scripts/evidence, monitoring, ownership metadata and release history. Documentation names alone are not conformance.

## 7. Gate impact

```text
Z6 ORIGINAL REQUIREMENTS: 26
ADDITIONAL OPERATIONS REQUIREMENTS: 14
REVISED TARGET REQUIREMENTS: 40
CURRENT OPERATIONAL CONFORMANCE: NOT ASSESSED
OWNER/ACCOUNT RECOVERY EVIDENCE: REQUIRED
PUBLICATION AUTHORIZED: NO
PRODUCTION ACTION: NONE
```
