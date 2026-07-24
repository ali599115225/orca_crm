# ORCA — Supplemental Requirements Cross-Stage Verification Matrix

- **Document ID:** ORCA-ZB-SUP-VERIFY-001
- **Date:** 2026-07-22
- **Status:** `TARGET VERIFICATION MAPPING / UNPUBLISHED`
- **Source requirements:** Z2R-001..010 and Z4R-001..012
- **Production action authorized:** `false`

## 1. Purpose

Map every independently discovered Z2 and Z4 requirement to the later evidence needed for visual design, security/quality verification, operations, owner decisions, current-system comparison, and eventual execution authorization.

A row is not verified because a similarly named file or test exists. Z7 must map current evidence directly, and Z8 must authorize any remediation package.

## 2. Z2 domain-review requirements

| ID | Primary target | Z3 surface linkage | Z5 verification | Z6 operational evidence | Owner decision | Z7 evidence direction |
|---|---|---|---|---|---|---|
| Z2R-001 | separate Lead and Opportunity lifecycles | PG-005, PG-006/TAB-CUS-03, PG-007 | state-transition, propagation, invalid shared-state tests | reconciliation alert for inconsistent outcomes | multiple-opportunity and outcome-propagation policy | map models/actions/tests and classify lifecycle coupling |
| Z2R-002 | customer merge survivorship/reversal | PG-005, PG-006 overview/history, merge overlay | merge/unmerge, consent, authorization, integrity tests | merge failure/recovery and audit runbook | irreversible-merge authority and survivorship policy | inspect duplicate/merge code, data links and evidence |
| Z2R-003 | hold/commitment priority and expiry | PG-009, PG-010/011, conflict overlay | concurrency, priority, expiry, extension, replay tests | expired-hold job, conflict alert and reconciliation | hold types, duration, priority, extension authority | map constraints/jobs/commitment states |
| Z2R-004 | offer acceptance versus reservation truth | PG-009, customer offers tab, conflict drawer | fault injection between acceptance and commitment; no false secured state | exception queue and recovery runbook | atomic policy or `ACCEPTED_PENDING_INVENTORY` policy | inspect transaction boundaries and UI labels |
| Z2R-005 | amendment impact on obligations | PG-015 contract detail, PG-016 finance | effective-date, recalculation, compensation, duplicate-obligation tests | amendment recovery and reconciliation runbook | retroactive-change and approval limits | map contract versions, obligations, invoice generation |
| Z2R-006 | financial correction instruments | PG-016..019 | decimal, credit/debit/void/write-off, allocation and reversal tests | finance exception, close and reconciliation runbooks | tax/rounding/write-off authority | inspect invoice mutability and adjustment models |
| Z2R-007 | workflow-version and in-flight-run behavior | PG-020 and approval overlays | version pinning, migration, timeout, cancellation, replay tests | stuck-run, removed-assignee and dead-letter runbooks | in-flight migration/cancellation policy | map workflow definitions/runs/jobs and version evidence |
| Z2R-008 | inbound identity and thread integrity | PG-021/022, customer activity tab | sender matching, unknown sender, cross-thread, attachment and scope tests | quarantine/triage and provider-reconciliation runbooks | unknown-sender handling and shared-contact policy | inspect webhook matching/conversation association |
| Z2R-009 | evidence chain of custody | PG-023, document tabs, upload/evidence overlays | hash, manifest, tamper, version and access tests | quarantine, scanner outage, evidence-package runbook | approved hash/evidence authority where applicable | map storage metadata, scan state, hashes and access audit |
| Z2R-010 | KPI restatement and AI evaluation | PG-024..026 | definition/model-version, freshness, restatement, grounding and human-review tests | stale metric/model incident and kill-switch runbooks | AI evaluation and approved-use policy | inspect snapshots, metric versions, AI records/providers |

## 3. Z4 architecture-review requirements

| ID | Primary target | Z3 surface linkage | Z5 verification | Z6 operational evidence | Owner decision | Z7 evidence direction |
|---|---|---|---|---|---|---|
| Z4R-001 | expand/contract evolution | admin health/release evidence surfaces | backward/forward schema and contract compatibility tests | migration rehearsal, checkpoint and cutover runbook | destructive-change and maintenance authority | map migrations, API/event versions and consumers |
| Z4R-002 | durable multi-domain orchestration | transaction progress, task/exception surfaces | timeout, replay, compensation and unknown-outcome tests | stuck orchestration and manual reconciliation runbook | compensation/manual authority for high-risk outcomes | inspect orchestration services, outbox, checkpoints |
| Z4R-003 | consistency and stale-state contract | all master/detail, reports and provider-status surfaces | projection-lag, read-after-write, refresh and stale-warning tests | projection rebuild and freshness alerts | maximum staleness per critical class | map caches/read models/projections and as-of fields |
| Z4R-004 | authorization-safe caching | global shell/session states and protected pages | cross-scope cache, revocation, key collision and poisoning tests | cache purge/revocation incident runbook | sensitive-cache policy/TTL where needed | inspect cache keys, tags, session and permission invalidation |
| Z4R-005 | safe import and batch mutation | import previews, result/error boards and bulk-action overlays | dry-run, partial, restart, duplicate, permission and SoD tests | failed batch recovery and reconciliation runbook | permitted import types, limits and destructive authority | inventory imports/scripts/jobs and staging behavior |
| Z4R-006 | secure search/index/projection | search, suggestions, reports and counts | unauthorized existence, field masking, rebuild and deletion propagation tests | index lag/rebuild and mismatch alert/runbook | search retention and sensitive facet policy | inspect search queries/indexes/materialized views |
| Z4R-007 | party merge/survivorship architecture | same surfaces as Z2R-002 | same core evidence plus cross-domain link tests | same merge recovery with wider reconciliation | same owner policies | inspect data-level aliases/FKs and derived stores |
| Z4R-008 | derived-data lifecycle | reports, exports, AI, audit/admin health | classification, retention, deletion, legal-hold and shadow-copy tests | derived-store inventory, purge/rebuild and restore runbooks | retention/AI/provider policies | map logs, caches, exports, snapshots, embeddings/temp files |
| Z4R-009 | SSRF and outbound egress | provider setup/test and URL-input surfaces | scheme, port, redirect, DNS rebinding, private/metadata IP tests | outbound abuse alert and containment runbook | approved hosts/providers | inspect fetch clients, callbacks, URL fields and network controls |
| Z4R-010 | key/certificate lifecycle | provider/admin readiness and expiry states | rotation, overlap, revocation, expiry and old-key trust tests | rotation/expiry alert and recovery runbooks | key owners and rotation intervals | map secret refs, key IDs, cert handling and webhook verification |
| Z4R-011 | time and ordering semantics | tours, contracts, finance, audit, jobs | clock-skew, occurred/recorded, version ordering and deterministic-clock tests | clock drift/order anomaly alert/runbook | timestamp authority/tolerances where business-specific | inspect date libraries, DB timestamps, callbacks and ordering |
| Z4R-012 | large export/evidence-package safety | reports, audit, documents and export progress | scope, row/field limits, expiry, cancellation, authorization and URL tests | export backlog, cleanup and leakage response runbook | export limits, encryption/watermark policy | inspect export routes/jobs/storage links and audit |

## 4. Evidence package schema per row

Every row eventually requires:

1. requirement ID and exact target contract version;
2. owner and applicable domain/page IDs;
3. implementation file/model/API/job identifiers from Z7;
4. direct positive, negative, permission, conflict/replay and recovery evidence as applicable;
5. visual reference and independent visual evidence when user-facing;
6. operational metric, alert and runbook for failure modes;
7. owner-decision record when a policy/limit remains open;
8. final classification: `KEEP`, `ADAPT`, `REBUILD`, `RETIRE`, `MISSING`, `DEFER`, or `NOT_PROVEN`;
9. Z8 work-package ID if remediation is authorized;
10. commit/environment/artifact identity and closure evidence.

## 5. Gate rules

- Supplemental requirements are additive; they do not silently rewrite original Z2/Z4 contracts.
- An owner-policy requirement stays blocked until an explicit decision record exists.
- A visual surface cannot close from test evidence alone.
- A test name cannot close a row without inspecting its assertion and target path.
- Operations evidence cannot be inferred from code presence; a drill or reproducible verification is required.
- No Z7 implementation classification or Z8 remediation is authorized by this matrix.

```text
SUPPLEMENTAL REQUIREMENTS MAPPED: 22
Z2 DOMAIN REVIEW ROWS: 10
Z4 ARCHITECTURE REVIEW ROWS: 12
VISUAL / TEST / OPERATIONS / OWNER / Z7 LINKAGE: DEFINED
CURRENT CONFORMANCE: NOT ASSESSED
MAIN/PRODUCTION ACTION: NONE
```
