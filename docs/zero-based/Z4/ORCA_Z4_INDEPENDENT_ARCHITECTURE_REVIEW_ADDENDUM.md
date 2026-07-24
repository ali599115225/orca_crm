# ORCA Z4 — Independent Architecture Review Addendum

- **Document ID:** ORCA-Z4-REVIEW-001
- **Date:** 2026-07-22
- **Status:** `INDEPENDENT REVIEW COMPLETE / UNPUBLISHED PLANNING ADDENDUM`
- **Parent Z4 candidate:** `5d543ced2f74412adc9eeb036b6614d9ddfb6e73`
- **Production action authorized:** `false`

## 1. Review conclusion

The Z4 candidate provides a strong target foundation for domain ownership, server authorization, data classification, transactions, events, jobs, provider adapters, privacy, retention, and vendor readiness. The review found no reason to discard those contracts.

Twelve areas require explicit addition before Z4 is considered a complete target architecture package. These are planning requirements only and do not authorize Runtime, schema, migration, provider, environment, data, `main`, or Production changes.

## 2. Required additions

### Z4R-001 — Online contract and schema evolution

Every material database/API/event change requires an expand-and-contract plan:

- backward and forward compatibility window;
- additive introduction before removal;
- old/new reader and writer inventory;
- backfill/checkpoint/restart behavior;
- validation and reconciliation before cutover;
- retirement evidence and rollback/forward-fix boundary;
- no destructive migration from application deploy approval alone.

### Z4R-002 — Multi-domain orchestration and compensation

Cross-domain journeys must identify:

- authoritative owner of each step;
- orchestration owner without stealing domain truth;
- durable state/checkpoint;
- timeout and unknown outcome;
- compensation versus manual reconciliation;
- duplicate/replay behavior;
- cancellation limits after irreversible evidence exists.

A distributed journey cannot claim atomic success merely because all calls returned once.

### Z4R-003 — Read consistency and stale-state contract

Every critical read model declares:

- authoritative source;
- synchronous or eventual consistency;
- maximum acceptable staleness;
- read-after-write expectation;
- refresh/reconciliation path;
- user-visible `as-of` or stale warning where relevant;
- behavior when projection rebuild or provider status lags.

### Z4R-004 — Authorization-safe caching

Caches must include trusted scope and policy context where required and define:

- key composition and company/resource isolation;
- permission/assignment invalidation;
- TTL and stale behavior;
- no caching of unrestricted sensitive responses;
- revocation and logout behavior;
- cache poisoning and key-collision tests;
- safe bypass for high-risk commands and evidence reads.

### Z4R-005 — Bulk import and batch mutation safety

Imports and bulk operations require:

- declared schema/version and file limits;
- preview/dry-run and validation summary;
- row-level identity, scope and error evidence;
- idempotency and restart checkpoints;
- partial-failure policy;
- duplicate and reference resolution;
- authorization and SoD for destructive/bulk actions;
- post-run reconciliation and reversible staging where possible.

### Z4R-006 — Search, index and projection security

Search engines, materialized views and projections must preserve:

- source lineage and rebuildability;
- company, role, row and field restrictions;
- deletion/retention/legal-hold propagation;
- stale and partial-index state;
- no unauthorized existence leakage through counts, suggestions or facets;
- deterministic rebuild and reconciliation evidence.

### Z4R-007 — Party deduplication, merge and survivorship

Customer/party merge requires:

- candidate evidence and confidence source;
- human authority for material merges;
- field-level survivorship rules;
- preservation of source, consent, communication, contract, finance and audit links;
- conflict/duplicate state visibility;
- reversible merge or explicit non-reversible approval;
- no silent deletion of losing records or evidence.

### Z4R-008 — Derived-data lifecycle

Analytics snapshots, exports, search indexes, caches, logs, AI context, embeddings and temporary files must each define:

- source and classification inheritance;
- purpose and owner;
- freshness and rebuild rules;
- retention/deletion/legal-hold propagation;
- export/provider transfer scope;
- prevention of derived data becoming unauthorized shadow truth.

### Z4R-009 — Outbound request and SSRF protection

Any server-side outbound URL or callback operation requires:

- provider/host allowlist or trusted configuration;
- scheme/port restrictions;
- DNS and redirect revalidation;
- private/link-local/metadata network denial;
- bounded response size/time;
- no client-controlled credential forwarding;
- safe logging and direct SSRF tests.

### Z4R-010 — Cryptographic and certificate lifecycle

Provider signing keys, webhook secrets, certificates and encryption keys require:

- owner and environment separation;
- version/key ID;
- activation and overlap window;
- rotation and revocation procedure;
- old-key verification limits;
- expiry alerts and recovery;
- no raw value in business data or audit payload.

### Z4R-011 — Time and ordering semantics

Critical contracts define:

- UTC event truth and Asia/Riyadh display;
- authoritative timestamp source;
- clock-skew tolerance for callbacks and signatures;
- occurred-at versus recorded-at meaning;
- sequence/version ordering rule;
- daylight-saving independence and locale formatting;
- deterministic test clocks.

### Z4R-012 — Large export and evidence-package safety

Large reports/evidence packages require:

- asynchronous authorized job;
- frozen query/filter/as-of manifest;
- row/field/volume limits;
- encrypted or bounded signed delivery;
- expiry/revocation and download audit;
- partial/failure state;
- cancellation and cleanup;
- no direct long-running request or public permanent URL.

## 3. Effect on existing Z4 contracts

These additions supplement rather than replace:

- module, command/query, API, event, outbox/inbox and job contracts;
- authorization/RBAC/SoD;
- conceptual/logical data ownership;
- privacy/RoPA/retention;
- vendor/integration readiness.

They must be reconciled into the Z4 RTM before central Z4 closure and then verified against current implementation only in Z7.

## 4. Decision

```text
PARENT Z4 CONTRACTS: RETAIN
INDEPENDENT GAPS: 12
CURRENT IMPLEMENTATION ASSESSED: NO
Z4 PASS / CLOSED: NO
RUNTIME OR SCHEMA CHANGE: NONE
MAIN/PRODUCTION ACTION: NONE
```
