# ORCA Z2 — Independent Domain Contract Review Addendum

- **Document ID:** ORCA-Z2-REVIEW-001
- **Date:** 2026-07-22
- **Status:** `INDEPENDENT REVIEW COMPLETE / UNPUBLISHED PLANNING ADDENDUM`
- **Parent Z2 candidate:** `4df7ac7b02759c363ea9957fdc156119ccecf0e7`
- **Production action authorized:** `false`

## 1. Review conclusion

The Z2 domain contracts establish clear ownership, state machines, evidence rules, failure behavior, provider-safe states, audit, idempotency and human authority boundaries. They should be retained.

Ten clarifications are required to eliminate ambiguity before Z2 central publication. They supplement the existing contracts and do not authorize implementation.

## 2. Required domain clarifications

### Z2R-001 — Lead and opportunity lifecycle separation

`Lead` and `Opportunity` are separate aggregates. Creating an opportunity must:

- preserve the lead lifecycle state independently;
- create an opportunity beginning in its own valid initial state;
- link qualification evidence and source;
- define whether multiple active opportunities per customer/inventory interest are allowed;
- derive `WON/LOST` propagation through an explicit policy rather than reuse one aggregate's state as another's state.

### Z2R-002 — Customer merge survivorship and reversal

Duplicate merge must define:

- survivor selection and per-field source precedence;
- contact verification and consent conflict rules;
- assignment, activity, task, opportunity, message, document, contract and finance link preservation;
- duplicate reference aliases;
- reversible merge or explicit irreversible approval;
- audit and user-visible merged state.

### Z2R-003 — Commitment priority and hold policy

Inventory commitments require an approved policy for:

- hold types and relative priority;
- maximum duration and extension authority;
- concurrent request fairness;
- administrative blocks versus commercial holds;
- expiry clock and time source;
- conversion, release, cancellation and dispute behavior;
- linked offer/reservation/contract evidence.

### Z2R-004 — Offer acceptance and reservation atomicity

The target contract must select and test one explicit policy:

1. acceptance and reservation are one atomic authoritative operation; or
2. acceptance may be recorded before reservation, producing a controlled `ACCEPTED_PENDING_INVENTORY` exception state.

A plain `ACCEPTED` state must never imply secured inventory when no commitment exists.

### Z2R-005 — Contract amendments and obligation impact

Amendments must define:

- proposed, approved, signed and effective times;
- prospective versus retroactive effect;
- affected obligations, invoices, schedules, inventory and documents;
- recalculation versus compensating adjustment;
- in-flight payment/reconciliation behavior;
- dispute and rollback limits after legal/financial evidence exists.

### Z2R-006 — Financial correction instruments

Issued financial records require explicit controlled instruments:

- credit note, debit note, cancellation/void and write-off evidence;
- rounding, tax and currency precision policy;
- partial allocation and unapplied balance;
- overpayment and underpayment handling;
- reversal/chargeback linkage;
- prohibition on silent issued-invoice edits.

Exact tax/e-invoice applicability remains owner evidence.

### Z2R-007 — Workflow definition version and in-flight runs

Workflow changes must specify:

- immutable definition version per run;
- new-run versus in-flight migration policy;
- approval/task subject version preservation;
- removed step/role/assignee behavior;
- timeout and escalation after policy change;
- cancellation/compensation and replay safety.

### Z2R-008 — Inbound communication identity and thread integrity

Inbound messages require:

- verified provider/account/channel source;
- sender normalization and customer/contact matching;
- unknown-sender quarantine or triage;
- conversation/thread association rules;
- attachment quarantine and authorization;
- opt-out and blocked-contact behavior;
- no automatic customer merge from a shared/recycled contact point.

### Z2R-009 — Document chain of custody

Final evidence requires:

- content hash and approved algorithm/version;
- source/collector/uploader identity;
- received, scanned, approved and finalized timestamps;
- immutable version and supersession link;
- download/share/access evidence;
- provider/manual verification source;
- evidence-package manifest verification and tamper response.

### Z2R-010 — KPI restatement and AI evaluation

Derived insight contracts must support:

- corrected/restated KPI snapshots without silently replacing prior published evidence;
- definition-version comparison and reconciliation;
- report-result expiry where source freshness no longer satisfies policy;
- AI use-case evaluation criteria, grounded-source requirement where applicable, prohibited claims and reviewer outcome;
- model/provider/version and policy changes without treating prior output as current truth.

## 3. Publication effect

Before clean Z2 publication:

- add these clarifications as supplemental target requirements;
- link them to the existing DOM-01..DOM-11 contracts;
- retain all current owner/provider/Production boundaries;
- do not expand Release 1 automatically;
- defer current implementation comparison to Z7.

```text
PARENT Z2 CONTRACTS: RETAIN
INDEPENDENT CLARIFICATIONS: 10
CURRENT IMPLEMENTATION ASSESSED: NO
RUNTIME OR DATA CHANGE: NONE
MAIN/PRODUCTION ACTION: NONE
```
