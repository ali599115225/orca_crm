# ORCA Z2 — Independent Review Requirements Supplement

- **Document ID:** ORCA-Z2-RTM-SUP-001
- **Date:** 2026-07-22
- **Status:** `REQUIREMENTS PREPARED / CLEAN PUBLICATION RECONCILIATION PENDING`
- **Production action authorized:** `false`

| ID | Requirement | Priority | Domain linkage | Acceptance | Verification | Status |
|---|---|---:|---|---|---|---|
| Z2R-001 | Lead and opportunity lifecycles remain separate and use explicit outcome propagation | P0 | DOM-01 | creating an opportunity does not place either aggregate in an undefined/shared state | lifecycle/propagation tests | TEXT_CONTRACT_DEFINED |
| Z2R-002 | Customer merge preserves field provenance, consent, links and reversible/authorized survivorship | P0 | DOM-01 | no silent loss or unauthorized merge from contact similarity | merge/unmerge/integrity tests | TEXT_CONTRACT_DEFINED |
| Z2R-003 | Inventory holds and commitments use explicit priority, expiry, extension, fairness and release policy | P0 | DOM-02/03/05 | one deterministic commitment result with complete evidence | concurrency/expiry/priority tests | OWNER_POLICY_REQUIRED |
| Z2R-004 | Offer acceptance cannot imply secured inventory without an atomic reservation or explicit pending-inventory exception | P0 | DOM-05 | accepted state truthfully distinguishes commercial acceptance from commitment | acceptance/reservation fault tests | OWNER_POLICY_REQUIRED |
| Z2R-005 | Contract amendments preserve effective-date semantics and controlled obligation/invoice/inventory impact | P0 | DOM-06/07 | no silent retroactive change or duplicate obligation | amendment/recalculation/compensation tests | TEXT_CONTRACT_DEFINED |
| Z2R-006 | Issued financial corrections use credit/debit/void/write-off/reversal instruments and exact precision policy | P0 | DOM-07 | issued records are never silently edited; balances reconcile | financial correction/rounding tests | OWNER_POLICY_REQUIRED |
| Z2R-007 | Workflow runs retain immutable definition versions and controlled in-flight migration/cancellation behavior | P0 | DOM-08 | policy change cannot mutate approval subject or lose in-flight work | workflow-version/migration tests | TEXT_CONTRACT_DEFINED |
| Z2R-008 | Inbound messages use verified source, safe identity matching, thread rules and unknown-sender triage | P0 | DOM-09 | no automatic customer merge or cross-thread disclosure | inbound identity/thread/attachment tests | TEXT_CONTRACT_DEFINED |
| Z2R-009 | Final documents and evidence packages preserve cryptographic chain of custody and tamper response | P0 | DOM-10 | exact version/source/hash/access history is independently verifiable | hash/manifest/tamper tests | TEXT_CONTRACT_DEFINED |
| Z2R-010 | KPI restatement and AI evaluation preserve definition/model versions, freshness and prior evidence | P1 | DOM-11 | corrected outputs do not silently overwrite prior published truth | restatement/freshness/model-version tests | TEXT_CONTRACT_DEFINED |

## Reconciliation rule

These ten requirements must be included in the clean Z2 publication package or formally linked from its closure record. Original Z2 requirements and counts remain unchanged until reconciliation. Owner-policy rows do not become approved through this document.

```text
SUPPLEMENTAL REQUIREMENTS: 10
P0: 9
P1: 1
OWNER POLICY REQUIRED: 3
CURRENT IMPLEMENTATION VERIFIED: NO
PRODUCTION ACTION: NONE
```
