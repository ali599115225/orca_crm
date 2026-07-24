# ORCA Z4 — Independent Review Requirements Supplement

- **Document ID:** ORCA-Z4-RTM-SUP-001
- **Date:** 2026-07-22
- **Status:** `REQUIREMENTS PREPARED / CENTRAL RECONCILIATION PENDING`
- **Parent requirement register:** `ORCA_Z4_REQUIREMENTS_TRACEABILITY.md`
- **Production action authorized:** `false`

| ID | Requirement | Priority | Owner | Acceptance | Verification | Status |
|---|---|---:|---|---|---|---|
| Z4R-001 | Material schema/API/event changes use an expand-and-contract compatibility plan with validated backfill and retirement evidence | P0 | Architecture/data owners | no destructive cutover before old/new compatibility and reconciliation | migration rehearsal + contract compatibility tests | TEXT_CONTRACT_DEFINED |
| Z4R-002 | Multi-domain journeys use durable orchestration with explicit ownership, checkpoints, timeout, compensation and reconciliation | P0 | Domain/architecture owners | no false distributed atomic success; unknown outcomes remain explicit | orchestration fault/replay tests | TEXT_CONTRACT_DEFINED |
| Z4R-003 | Critical read models define source, consistency, staleness, read-after-write and visible as-of behavior | P0 | Domain/reporting owners | stale or delayed projection is bounded and visible | projection lag/rebuild tests | TEXT_CONTRACT_DEFINED |
| Z4R-004 | Caches preserve company/resource/permission isolation and revoke safely after access changes | P0 | Architecture/security owners | cached response cannot bypass current authority or leak another scope | cache isolation/invalidation tests | TEXT_CONTRACT_DEFINED |
| Z4R-005 | Imports and bulk mutations provide dry run, bounded schema, idempotency, checkpoints, partial-failure evidence and reconciliation | P0 | Domain/data/operations owners | restart or duplicate submission cannot create uncontrolled effects | import duplicate/restart/partial tests | TEXT_CONTRACT_DEFINED |
| Z4R-006 | Search indexes, projections and materialized views preserve authorization, lineage, rebuildability and lifecycle propagation | P0 | Data/search/security owners | counts, facets and suggestions do not leak unauthorized existence | search authorization + rebuild tests | TEXT_CONTRACT_DEFINED |
| Z4R-007 | Party/customer merge uses approved survivorship, conflict evidence, link preservation and reversible or explicitly authorized behavior | P0 | Customer/data owner | no silent loss of source, consent, communication, contract, finance or audit links | merge/unmerge/integrity tests | TEXT_CONTRACT_DEFINED |
| Z4R-008 | Derived data inherits classification, purpose, retention, deletion and legal-hold behavior from authoritative sources | P0 | Data/privacy owners | no unauthorized shadow copy or stale derived truth | lifecycle propagation review/tests | TEXT_CONTRACT_DEFINED |
| Z4R-009 | Server-side outbound requests enforce trusted destinations and block SSRF, redirect and metadata-network abuse | P0 | Integration/security owners | client-controlled URL cannot reach private or unapproved destination | direct SSRF/DNS/redirect tests | TEXT_CONTRACT_DEFINED |
| Z4R-010 | Keys, webhook secrets and certificates have environment-separated version, rotation, overlap, revocation and expiry controls | P0 | Security/integration owners | rotation succeeds without raw secret exposure or indefinite old-key trust | rotation/expiry tests and evidence | TEXT_CONTRACT_DEFINED |
| Z4R-011 | Critical timestamps define UTC truth, occurred/recorded semantics, ordering and clock-skew tolerance | P1 | Architecture/domain owners | deterministic ordering and callback verification across time conditions | deterministic clock/skew tests | TEXT_CONTRACT_DEFINED |
| Z4R-012 | Large exports and evidence packages are asynchronous, scoped, expiring, encrypted/bounded and fully audited | P0 | Reporting/data/security owners | no permanent public URL, unbounded request or excessive data package | export authorization/expiry/cancel tests | TEXT_CONTRACT_DEFINED |

## Reconciliation rule

These 12 rows must be added to the central RTM during Z4 publication, linked to Z2 domain contracts, Z3 surfaces, Z5 security tests, Z6 runbooks and Z7 implementation evidence. They do not change the original Z4 count until formally reconciled.

```text
SUPPLEMENTAL REQUIREMENTS: 12
P0: 11
P1: 1
CURRENT IMPLEMENTATION VERIFIED: NO
PRODUCTION ACTION: NONE
```
