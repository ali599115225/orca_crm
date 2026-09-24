# ORCA Z5 — Supplemental Direct-Test Catalogue

- **Document ID:** ORCA-Z5-SUP-TEST-001
- **Date:** 2026-07-22
- **Status:** `TARGET TEST CATALOGUE / CURRENT COVERAGE NOT ASSESSED`
- **Sources:** Z2R-001..010, Z3R-001..012, Z4R-001..012
- **Production action authorized:** `false`

## 1. Purpose

Define direct executable and manual verification for the 34 supplemental requirements discovered through independent Z2, Z3 and Z4 reviews. These cases extend the original Z5 test matrix; they do not claim current implementation coverage.

## 2. Domain-contract tests — Z2R

| Test ID | Requirement | Mandatory test set | Required evidence |
|---|---|---|---|
| TST-SUP-001 | Z2R-001 lead/opportunity separation | create opportunity from qualified lead; multiple-opportunity policy; win/loss propagation; invalid aggregate-state reuse | assertions on both aggregate states, events and audit |
| TST-SUP-002 | Z2R-002 merge survivorship | conflicting names/contact verification/consent; linked task/message/contract/finance preservation; unauthorized merge; reversible path | pre/post relationship counts, provenance and audit manifest |
| TST-SUP-003 | Z2R-003 commitment priority | simultaneous holds; priority/fairness; extension authority; expiry boundary; duplicate expiry job | database constraint/result, deterministic loser errors and release evidence |
| TST-SUP-004 | Z2R-004 acceptance/reservation truth | failure between acceptance and reservation; inventory lost concurrently; retry; UI/API state labeling | no secured-inventory claim without commitment; explicit exception evidence |
| TST-SUP-005 | Z2R-005 amendment impact | future/retroactive amendment; obligation recalculation; payment in progress; duplicate apply; termination conflict | version/effective-date/adjustment and reconciliation evidence |
| TST-SUP-006 | Z2R-006 financial corrections | credit/debit/void/write-off; precision/rounding; overpayment/unapplied; chargeback/reversal; unauthorized correction | exact decimal ledger and immutable issued-record evidence |
| TST-SUP-007 | Z2R-007 workflow versioning | start on v1 then publish v2; removed assignee/step; migrate/cancel; timeout; replay | run pinned to definition, no lost or silently mutated work |
| TST-SUP-008 | Z2R-008 inbound identity/thread | verified/invalid source; recycled/shared contact; unknown sender; wrong thread; duplicate callback; malicious attachment | quarantine/triage, no auto-merge, scoped thread evidence |
| TST-SUP-009 | Z2R-009 evidence custody | content change after hash; manifest mismatch; scan/finalize order; supersession; expired download; unauthorized access | cryptographic/version/access trail and tamper state |
| TST-SUP-010 | Z2R-010 KPI/AI restatement | metric v1/v2; corrected snapshot; stale source; model/policy change; ungrounded output; reviewer reject | prior evidence preserved, current definition/model/as-of explicit |

## 3. Interaction and accessibility tests — Z3R

| Test ID | Requirement | Mandatory test set | Required evidence |
|---|---|---|---|
| TST-SUP-011 | Z3R-001 bidi isolation | Arabic names with phone/email/URL/reference/SAR/date and punctuation; copy/paste; screen-reader order | browser screenshots plus DOM direction and AT notes |
| TST-SUP-012 | Z3R-002 async announcements | validation, save, refresh, row selection, provider progress, error and completion; rapid repeated updates | live-region event log and screen-reader manual result |
| TST-SUP-013 | Z3R-003 session expiry | warning; active form; reauth success/failure; revoked role; pending action; context restore | no duplicate action, safe field retention and route/focus recovery |
| TST-SUP-014 | Z3R-004 zoom/reflow | 200% and 400%; text-spacing override; long Arabic labels; finance table; modal/drawer | viewport matrix with no clipped controls or inaccessible content |
| TST-SUP-015 | Z3R-005 forced colors | selected/hover/focus/disabled/success/warning/danger in Light/Dark and forced-colors | visual/manual result proving non-color-only state |
| TST-SUP-016 | Z3R-006 virtualization | keyboard through mounted boundaries; screen-reader row count; filter/selection retention; item removal | focus/position logs and fallback assessment |
| TST-SUP-017 | Z3R-007 charts | no-color view; keyboard legend; screen reader; data-table equivalence; stale/as-of | chart-to-table reconciliation and accessible summary review |
| TST-SUP-018 | Z3R-008 pointer alternatives | drag/reorder/resize/map/timeline/swipe with keyboard/buttons; cancel/undo | equivalent final state and focus/audit evidence |
| TST-SUP-019 | Z3R-009 shortcuts | Arabic input, browser/AT conflicts, single-key disable, context/focus, permission/confirmation | shortcut registry and manual compatibility result |
| TST-SUP-020 | Z3R-010 mobile keyboard/safe area | iOS/Android-sized viewports; virtual keyboard; orientation; sticky action; back/unsaved | focused field/error/action visible and no obscured content |
| TST-SUP-021 | Z3R-011 long-running work | indeterminate/determinate progress; timeout; background; cancel allowed/denied; later retrieval; notification | truthful state transitions and accessible announcements |
| TST-SUP-022 | Z3R-012 print/PDF | Arabic direction, page breaks, repeated headers, hidden UI, long tables, official template version, accessibility where required | visual/output comparison, metadata/template authority and text extraction review |

## 4. Architecture and data tests — Z4R

| Test ID | Requirement | Mandatory test set | Required evidence |
|---|---|---|---|
| TST-SUP-023 | Z4R-001 expand/contract | old app/new schema; new app/old schema where supported; backfill resume; dual-read/write validation; retirement | compatibility matrix and reconciliation totals |
| TST-SUP-024 | Z4R-002 orchestration/compensation | crash after each step; duplicate event; out-of-order event; timeout; compensation failure; manual resolution | durable checkpoint, idempotent recovery and final domain reconciliation |
| TST-SUP-025 | Z4R-003 consistency/staleness | read-after-write; projection delay; rebuild; provider lag; stale warning; max-age breach | source/projection versions and as-of behavior |
| TST-SUP-026 | Z4R-004 safe caching | two companies/scopes; role revocation; assignment transfer; logout; poisoned key; public-cache header | no cross-scope hit and bounded invalidation evidence |
| TST-SUP-027 | Z4R-005 import/batch | malformed schema; oversize; dry run; partial failure; restart; duplicate file; unauthorized rows; destructive approval | row manifest, checkpoints, no duplicate effects and reconciliation |
| TST-SUP-028 | Z4R-006 search/index | unauthorized records in counts/facets/suggestions; deletion/hold propagation; stale/rebuild; field masking | source-index reconciliation and access-negative evidence |
| TST-SUP-029 | Z4R-007 party architecture | merge with cross-domain links; alias lookup; derived stores; unmerge; concurrent update | referential/projection integrity and audit trail |
| TST-SUP-030 | Z4R-008 derived lifecycle | source deletion/restriction/hold; cache/export/log/AI copy; expiry/rebuild | derived-store inventory and lifecycle propagation evidence |
| TST-SUP-031 | Z4R-009 SSRF/egress | private/link-local/metadata IPv4/IPv6; DNS rebinding; redirects; alternate schemes/ports; oversized/slow response | blocked outbound attempt, safe log and allowlist behavior |
| TST-SUP-032 | Z4R-010 key/cert lifecycle | active/next/old key overlap; rotation; revoke; expired cert; unknown key ID; compromised secret | successful controlled rotation and bounded old-key acceptance |
| TST-SUP-033 | Z4R-011 time/order | clock skew; same timestamp; delayed/early callback; occurred vs recorded; out-of-order versions; Saudi display | deterministic ordering and tolerance assertions |
| TST-SUP-034 | Z4R-012 large exports | large authorized/unauthorized scope; cancellation; expiry; revoked user; public URL attempt; cleanup failure | job manifest, bounded delivery, download audit and disposal evidence |

## 5. Execution rules

- Every case records requirement, commit, environment, fixture volume, actor/scope, expected/observed result and evidence reference.
- Security-negative tests must attempt the bypass directly rather than infer protection from hidden UI.
- Accessibility cases combine automation with named manual technologies/viewports; automation alone cannot close them.
- Operational recovery evidence is exercised in a representative isolated environment and linked to Z6 runbooks.
- Tests using owner-policy values remain parameterized and cannot invent production limits.
- No case may use live Production data or credentials.

## 6. Gate impact

```text
SUPPLEMENTAL DIRECT TEST CASES: 34
DOMAIN CASES: 10
INTERACTION/A11Y CASES: 12
ARCHITECTURE/DATA CASES: 12
CURRENT EXECUTABLE COVERAGE: NOT ASSESSED UNTIL Z7
UAT/PRODUCTION EVIDENCE: NOT CLAIMED
MAIN/PRODUCTION ACTION: NONE
```
