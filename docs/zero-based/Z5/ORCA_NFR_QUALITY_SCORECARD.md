# ORCA Z5 — Non-Functional Requirements and Quality Scorecard

- **Document ID:** ORCA-Z5-NFR-001
- **Version:** 0.9 — Stacked Planning Candidate
- **Date:** 2026-07-22
- **Status:** `TARGET MEASURES DEFINED / NUMERIC OWNER TARGETS PARTIAL`
- **Production action authorized:** `false`

## 1. Purpose

Turn quality into measurable acceptance criteria. Values marked `OWNER_TARGET_REQUIRED` are not invented; the safe default is to preserve current proven behavior and block unsupported readiness claims.

## 2. Quality dimensions

| Dimension | Target contract | Evidence required |
|---|---|---|
| Functional suitability | business rules and state transitions match Z2 | contract, positive, negative, concurrency tests |
| Performance efficiency | critical operations have p95/p99 and capacity targets | repeatable load test in representative environment |
| Reliability | retryable failure recovers without duplicate business effect | fault injection and idempotency evidence |
| Availability | agreed SLO with error budget | monitored service-level indicators |
| Security | Z5 threat/control requirements verified | direct security tests and risk register |
| Privacy | minimization, purpose, rights, retention and transfer controls | catalog, RoPA, payload/log/export review |
| Maintainability | bounded modules, typed contracts, deterministic tests | architecture and quality-gate evidence |
| Compatibility | approved browsers, devices, providers and versions | compatibility matrix and tests |
| Portability | data/provider exit and environment reconstruction | export/import and recovery exercises |
| Accessibility | WCAG 2.2 AA target for critical flows | automated plus manual keyboard/screen-reader checks |
| Interaction capability | Arabic/RTL, clear recovery, safe states | owner-approved visual and usability evidence |
| Safety/integrity | no false financial, contractual, provider or audit success | failure-state and reconciliation tests |

## 3. Target scorecard

| ID | Measure | Target | Current evidence status |
|---|---|---|---|
| NFR-Z5-001 | critical read p95 | `OWNER_TARGET_REQUIRED` by page/API class | NOT ASSESSED UNTIL Z7 |
| NFR-Z5-002 | critical write p95/p99 | `OWNER_TARGET_REQUIRED`; include provider-independent and provider paths | NOT ASSESSED |
| NFR-Z5-003 | concurrent operational users | owner-approved Release 1 volume | NOT APPROVED |
| NFR-Z5-004 | customer/property/contract/finance record volumes | owner forecast plus growth margin | NOT APPROVED |
| NFR-Z5-005 | availability SLO | owner-approved in Z6 | NOT APPROVED |
| NFR-Z5-006 | retryable job success | measurable completion and dead-letter threshold | TEXT CONTRACT ONLY |
| NFR-Z5-007 | duplicate-effect tolerance | zero duplicate material business effects | TARGET DEFINED |
| NFR-Z5-008 | data-loss tolerance | RPO from Z6 | OWNER_TARGET_REQUIRED |
| NFR-Z5-009 | recovery-time tolerance | RTO from Z6 | OWNER_TARGET_REQUIRED |
| NFR-Z5-010 | page JavaScript and asset budgets | per route class after target UI reference | REFERENCE REQUIRED |
| NFR-Z5-011 | file upload size/type limits | per document class and provider capacity | OWNER/DOMAIN DECISION |
| NFR-Z5-012 | API payload and export limits | bounded, paginated, authorized | TARGET DEFINED; VALUES OPEN |
| NFR-Z5-013 | supported browsers | current stable Chrome/Edge plus owner-approved mobile set | FINAL MATRIX OPEN |
| NFR-Z5-014 | accessibility | critical flows meet WCAG 2.2 AA acceptance | TARGET DEFINED |
| NFR-Z5-015 | vulnerability remediation | Critical/High SLA approved by owner; no open P0/P1 at release without acceptance | SLA OPEN |
| NFR-Z5-016 | test determinism | blocking suites reproducible without hidden Production dependency | TARGET DEFINED |
| NFR-Z5-017 | audit completeness | material action has actor, scope, target, result, reason/correlation | TARGET DEFINED |
| NFR-Z5-018 | log privacy | zero secrets/PAN/sensitive documents in logs | TARGET DEFINED |
| NFR-Z5-019 | provider portability | exit/export/reconciliation drill for activated providers | ACTIVATION-GATED |
| NFR-Z5-020 | localization | Arabic-first labels, RTL, Asia/Riyadh time, explicit SAR and exact audit timestamps | TARGET DEFINED |

## 4. Measurement rules

- Development laptop timing is not Production capacity evidence.
- Preview timing is directional unless environment equivalence is documented.
- Averages cannot replace p95/p99 for critical paths.
- Cached and uncached scenarios are separated.
- Provider latency is reported separately from ORCA processing latency.
- Results include dataset size, concurrency, environment, commit, configuration, run count and variance.
- No achieved SLO is claimed before monitoring evidence exists.

## 5. Release quality thresholds

A release candidate cannot pass when any of the following is true:

1. A P0/P1 defect is open without formal acceptance.
2. A critical state transition lacks direct negative and concurrency evidence.
3. Production dependency audit fails at the approved threshold.
4. Required authorization is verified only through UI behavior.
5. Backup exists without a successful restore drill.
6. A provider-dependent flow shows false success on timeout or unknown state.
7. A critical visual contract lacks owner approval and independent verification.
8. A required NFR has neither a target nor an approved safe exception.

## 6. Current decision

```text
QUALITY MODEL: DEFINED
NFR ROWS: 20
NUMERIC CAPACITY/PERFORMANCE TARGETS: OWNER DECISION REQUIRED
CURRENT PERFORMANCE/AVAILABILITY CONFORMANCE: NOT ASSESSED
RELEASE QUALITY GATE: DEFINED / NOT PASSED
RUNTIME CHANGE: NONE
PRODUCTION ACTION: NONE
```
