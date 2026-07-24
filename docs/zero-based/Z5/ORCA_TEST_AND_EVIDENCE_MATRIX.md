# ORCA Z5 — Test and Evidence Matrix

- **Document ID:** ORCA-Z5-TEST-001
- **Version:** 0.9 — Stacked Planning Candidate
- **Date:** 2026-07-22
- **Status:** `TARGET TEST STRATEGY COMPLETE / CURRENT COVERAGE NOT ASSESSED`
- **Production action authorized:** `false`

## 1. Purpose

Define which evidence is required to prove ORCA requirements. A passing existing suite is useful current-system evidence but does not automatically verify the zero-based target.

## 2. Evidence hierarchy

1. Direct executable test of the named requirement.
2. Independently reproducible operational or recovery drill.
3. Owner-approved visual reference plus independent visual verification.
4. Reviewed configuration, contract, report, or trace with stable identifiers.
5. Agent narrative only as supporting context, never sole closure evidence.

## 3. Test layers

| Layer | Scope | Required characteristics |
|---|---|---|
| Unit/domain | pure rules, calculations, state guards | deterministic, fast, no hidden network |
| Contract | APIs, Server Actions, events, webhooks, adapters | typed schema, positive/negative, compatibility |
| Integration | database, transaction, queue, object storage | isolated data, rollback/cleanup, concurrency |
| Security | authn/authz, scope, validation, abuse cases | direct bypass attempts and safe errors |
| Privacy | minimization, masking, export, retention, rights | payload/log/file/evidence inspection |
| UI/component | interaction, states, accessibility | keyboard, focus, RTL, Light/Dark, no false state |
| End-to-end | critical business journeys | representative roles and failure/recovery |
| Performance | critical reads/writes/jobs | p95/p99, capacity, dataset and environment recorded |
| Resilience | retries, timeout, outage, duplicate, stale state | no duplicate effect or false success |
| Recovery | backup/restore, rollback, incident | timed drill with evidence and reconciliation |
| Supply chain | dependencies, secrets, SBOM, provenance | blocking policy and artifact identity |
| UAT | owner-approved business outcomes | signed scenario/result/exception record |

## 4. Critical scenario matrix

| ID | Scenario | Mandatory evidence |
|---|---|---|
| TST-001 | login, recovery, expiry and revoked session | security + E2E |
| TST-002 | cross-company/resource access attempt | negative authorization/integration |
| TST-003 | joiner/mover/leaver and delegated access expiry | lifecycle + audit |
| TST-004 | lead/customer duplicate, merge and archive | domain + integration + UI states |
| TST-005 | inventory readiness and conflicting commitment | concurrency + transaction |
| TST-006 | tour schedule/reschedule/cancel/no-show/outcome | domain + timezone + UI |
| TST-007 | offer versions, approval, expiry and counter-offer | domain + SoD + immutable version |
| TST-008 | reservation to contract preconditions | cross-domain contract test |
| TST-009 | contract approval/signature evidence/amendment/termination | authority + version + evidence |
| TST-010 | invoice/installment calculation and exact money | domain + decimal/integrity |
| TST-011 | payment timeout/duplicate/replay/reconciliation | provider mock + idempotency |
| TST-012 | refund/settlement request and approval boundaries | SoD + audit + failure recovery |
| TST-013 | task dependency, escalation, retry and closure evidence | workflow + job resilience |
| TST-014 | email/WhatsApp/SMS not configured and provider failure | adapter mock + UI safe state |
| TST-015 | webhook signature, replay and account mismatch | security contract tests |
| TST-016 | document upload malware/type/size/access/version | file security + authorization |
| TST-017 | export masking and excessive-data attempt | privacy + authorization |
| TST-018 | AI prompt injection, leakage and autonomous-action attempt | adversarial + human-control |
| TST-019 | notification navigation remains on source context | UI/E2E |
| TST-020 | backup restore, rollback and post-recovery reconciliation | operational drill |

## 5. Visual evidence protocol

For every approved page/tab/overlay contract:

- owner-approved reference ID and version;
- populated Light and Dark;
- mobile/responsive behavior;
- loading, empty, filtered-empty, error and recovery;
- unauthorized/read-only/provider-not-configured where applicable;
- form/modal/drawer validation and destructive states;
- pass 1 structure and pass 2 detail review;
- keyboard/focus/accessibility checks;
- implementation screenshot/record tied to commit.

No page inherits approval from another page or from historical closure.

## 6. Test data and isolation

- synthetic or approved masked data only;
- no Production credentials in tests;
- independent company/security scope per run where applicable;
- deterministic clocks/IDs/provider responses when needed;
- clean rollback or isolated disposable database;
- fixtures include empty, minimal, maximum, stale, conflict, unauthorized and corrupted states.

## 7. Failure triage

Each failure records:

- requirement/test ID;
- expected versus observed;
- commit/environment/data seed;
- reproducibility;
- severity and affected business state;
- whether pre-existing or introduced;
- owner and remediation/acceptance;
- evidence of final verification.

## 8. Current result

```text
TEST LAYERS: 12
CRITICAL TARGET SCENARIOS: 20
VISUAL EVIDENCE PROTOCOL: DEFINED
CURRENT TARGET COVERAGE: NOT ASSESSED UNTIL Z7
UAT SIGN-OFF: NOT STARTED
RUNTIME CHANGE: NONE
PRODUCTION ACTION: NONE
```
