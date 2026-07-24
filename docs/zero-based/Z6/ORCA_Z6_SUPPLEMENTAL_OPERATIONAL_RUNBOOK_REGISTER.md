# ORCA Z6 — Supplemental Operational Runbook Register

- **Document ID:** ORCA-Z6-SUP-RUNBOOK-001
- **Date:** 2026-07-22
- **Status:** `TARGET RUNBOOK REGISTER / DRILLS NOT EXECUTED`
- **Sources:** Z2R-001..010, Z3R-001..012, Z4R-001..012
- **Production action authorized:** `false`

## 1. Purpose

Define the operational response required when supplemental domain, UI/accessibility, data or architecture controls fail. A runbook row is a target contract only until its procedure, owners, tooling and drill evidence are approved and exercised.

## 2. Runbook families

| ID | Trigger | First safe action | Required reconciliation | Exercise evidence |
|---|---|---|---|---|
| RB-SUP-001 | inconsistent Lead/Opportunity outcome or merge damage | freeze affected merge/outcome actions and preserve versions/audit | customer, opportunities, consent, tasks, messages, documents, contracts, finance links | synthetic merge/outcome incident with restore or controlled correction |
| RB-SUP-002 | conflicting, stuck or expired inventory commitment | block new commitment on affected item and identify authoritative lock/state | holds, reservations, contracts, offer state, expiry jobs and audit | concurrent hold/reserve/expiry drill |
| RB-SUP-003 | accepted offer lacks valid reservation/commitment | show controlled exception; prevent contract progression that assumes inventory | offer version, acceptance evidence, inventory state and customer communication | failure injected between acceptance and reservation |
| RB-SUP-004 | amendment produces duplicate/wrong obligations | stop affected activation/billing and preserve old/new versions | contract effective version, obligations, invoices, allocations and customer-facing documents | amendment/recalculation/compensation drill |
| RB-SUP-005 | financial correction or allocation mismatch | block final reconciliation/settlement and preserve evidence | invoice, credit/debit/void/write-off, allocations, refunds/reversals and balances | exact-money correction and reversal drill |
| RB-SUP-006 | workflow version or in-flight run is stuck/incompatible | pause affected definition/new starts; do not mutate approved subject silently | workflow version, current step, approvals, tasks, timers, retries and owner | v1-to-v2 in-flight migration/cancel exercise |
| RB-SUP-007 | inbound message assigned to wrong identity/thread | quarantine new related messages and restrict thread access | provider account, sender/contact match, conversation, attachments, customer links and consent | shared/recycled contact and duplicate webhook exercise |
| RB-SUP-008 | document hash/manifest/chain-of-custody mismatch | revoke delivery, quarantine affected version/package and preserve access evidence | blob, version, hash, scan, approval, download/share and business references | tamper and evidence-package validation drill |
| RB-SUP-009 | stale/restated KPI or unsafe AI output is exposed | mark output stale/withdrawn; disable affected AI use case when necessary | definition/model version, source snapshots, exports, decisions and human reviews | KPI restatement plus AI kill-switch exercise |
| RB-SUP-010 | session expiry/revocation loses or risks pending work | deny pending mutation, preserve only permitted local form state and require reauth | actor/session, pending idempotency key, unsaved data classification and route context | expiry during long form and privileged action drill |
| RB-SUP-011 | accessibility regression blocks a critical role/task | stop release or provide approved equivalent path; record impacted flow | affected page/reference, assistive technology, role, action, evidence and correction | keyboard/screen-reader/zoom/forced-colors release drill |
| RB-SUP-012 | migration/backfill/cutover validation fails | halt cutover; keep compatible old path; do not run destructive contraction | old/new schema, readers/writers, checkpoint, counts, failed rows and rollback/forward state | expand/backfill/validate/cutover rehearsal |
| RB-SUP-013 | orchestration timeout/unknown or compensation failure | freeze irreversible next step and expose reconciliation-required state | every domain checkpoint, event, side effect, provider result and compensation | crash after each orchestrated step exercise |
| RB-SUP-014 | projection/cache/search shows unauthorized or inconsistent data | bypass/disable affected derived path; retain authoritative write path | source versus cache/index/projection, scope, invalidation, deletion/hold and as-of | cross-scope cache/search and rebuild drill |
| RB-SUP-015 | import/batch partially applies or replays | pause batch/retry; preserve manifest and checkpoints | accepted/rejected rows, duplicates, references, domain totals and audit | partial failure, restart and duplicate-file exercise |
| RB-SUP-016 | SSRF/egress abuse or suspicious outbound request | block destination/feature, rotate exposed credential if applicable, preserve request evidence | URL source, DNS/redirect chain, network target, credential use, provider and actor | private/metadata/DNS-rebinding containment drill |
| RB-SUP-017 | key/certificate expiry, compromise or failed rotation | revoke/disable affected key path, activate approved overlap/fallback without accepting unverified events | key IDs, environments, callbacks, rejected backlog, provider state and audit | planned rotation and emergency revocation exercise |
| RB-SUP-018 | timestamp/order anomaly affects business state | stop affected transition/reconciliation and compare versions/evidence rather than wall-clock guess | occurred/recorded times, versions, source clock, callbacks, events and resulting states | skew/out-of-order callback and event exercise |
| RB-SUP-019 | large export leaks, remains public or cleanup fails | revoke link/job access, restrict artifact and begin privacy/security assessment | request scope, fields/rows, artifact, downloads, expiry, user state and storage cleanup | expired/revoked export and failed-cleanup drill |
| RB-SUP-020 | print/PDF official output is truncated/wrong/unapproved | stop issuance/distribution of affected template/version | source record, template, rendered pages, signatory/version, recipients and corrected output | long Arabic contract/invoice pagination and template rollback drill |

## 3. Minimum runbook structure

Every runbook must contain:

1. trigger and alert source;
2. business/security/privacy severity direction;
3. exact first safe action and prohibited actions;
4. required access and decision authority;
5. diagnostic evidence that avoids secrets/excess personal data;
6. containment and feature-disable options;
7. recovery, compensation, rollback or forward-fix path;
8. domain and provider reconciliation checklist;
9. internal/external communication decision;
10. closure tests and heightened monitoring;
11. retained evidence, owner, version and last exercise date;
12. links to TST-SUP test cases and affected requirement IDs.

## 4. Alert and exercise rules

- No alert is release-ready without an owner and executable runbook.
- Manual retry is authorized, reasoned and idempotent; it is not a blind repeated button press.
- Unknown financial, contractual, commitment or provider outcomes remain unknown until reconciled.
- Accessibility-critical failures can block a release even when business APIs pass.
- Drill data is synthetic or approved masked data; no live Production mutation is implied.
- Numeric response targets remain owner decisions until BIA/SLO approval.

```text
SUPPLEMENTAL RUNBOOK FAMILIES: 20
DRILLS EXECUTED: 0
OWNERS/TOOLS/SCHEDULE: OWNER DECISION REQUIRED
CURRENT OPERATIONAL CONFORMANCE: NOT ASSESSED
MAIN/PRODUCTION ACTION: NONE
```
