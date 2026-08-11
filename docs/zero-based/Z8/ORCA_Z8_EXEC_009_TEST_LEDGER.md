# ORCA Z8 — EXEC-009 Frozen Test Ledger (Pre-Freeze Draft)

- **Package:** `EXEC-009 — Durable workflow and communication truth`
- **Date:** `2026-08-11`
- **Status:** `PRE-FREEZE DRAFT / RUNTIME NOT AUTHORIZED`

This ledger converts D09-01 through D09-10 into executable acceptance contracts. A later Scope Freeze may bind exact files and implementation surfaces, but must not weaken these behaviors.

## A. Workflow definition and run truth

| ID | Required behavior |
|---|---|
| E9-W01 | Publishing a workflow creates an immutable definition version. |
| E9-W02 | Editing a published workflow creates a new version and preserves the prior version. |
| E9-W03 | A workflow run pins exactly one definition version at run creation. |
| E9-W04 | A later workflow edit cannot alter an active or historical run's pinned version. |
| E9-W05 | Same idempotency key + same payload replays one semantic run result. |
| E9-W06 | Same idempotency key + conflicting payload fails closed. |
| E9-W07 | A duplicate trigger cannot create a second business effect. |
| E9-W08 | Timeout is never recorded as success. |
| E9-W09 | Retriable failure consumes a bounded retry budget. |
| E9-W10 | Non-retriable action is not blindly retried. |
| E9-W11 | Exhausted retries transition to explicit terminal failure/dead-letter truth. |
| E9-W12 | Attempt history, failure reason and terminal state remain attributable and non-destructive. |
| E9-W13 | Concurrent retry/replay cannot create duplicate terminal business effects. |

## B. Approval and escalation

| ID | Required behavior |
|---|---|
| E9-A01 | Governed sensitive/final-state workflow action requires explicit approval authority. |
| E9-A02 | Missing initiator evidence fails closed. |
| E9-A03 | Self-approval fails closed. |
| E9-A04 | Wrong-tenant approver fails closed. |
| E9-A05 | Wrong-scope/expired/missing assignment fails closed. |
| E9-A06 | Independent authorized approver succeeds. |
| E9-A07 | Approval replay is idempotent. |
| E9-A08 | Conflicting approval replay fails closed. |
| E9-A09 | Escalation after terminal failure preserves the failed run and creates separate escalation truth. |
| E9-A10 | Escalation does not silently mutate failure into success. |

## C. Communication identity and thread truth

| ID | Required behavior |
|---|---|
| E9-C01 | Inbound provider event requires stable tenant + provider + provider-message/reference identity. |
| E9-C02 | Duplicate provider message/reference does not create duplicate business effect. |
| E9-C03 | Conflicting reuse of provider identity fails closed and is auditable. |
| E9-C04 | Unknown sender remains unverified and is not auto-bound to a party/customer. |
| E9-C05 | Ambiguous sender match fails closed; no automatic merge occurs. |
| E9-C06 | Verified sender-to-party binding is attributable and tenant-scoped. |
| E9-C07 | Thread identity is preserved independently of customer/party identity. |
| E9-C08 | Cross-tenant thread/message linkage is rejected. |
| E9-C09 | Message direction, purpose and provider identity are explicit. |
| E9-C10 | Provider timeout/unknown delivery state is not converted to delivered/success without evidence. |

## D. Consent, opt-out, retention and legal hold

| ID | Required behavior |
|---|---|
| E9-P01 | Marketing send requires valid attributable consent for the marketing purpose. |
| E9-P02 | Opt-out blocks subsequent marketing sends. |
| E9-P03 | Operational/service purpose is stored separately and cannot silently reclassify marketing. |
| E9-P04 | Consent history is append-only or versioned; prior evidence is preserved. |
| E9-P05 | Opt-out replay is idempotent and cannot re-enable consent. |
| E9-P06 | Retention class and expiry are explicit/configurable rather than hard-coded to an invented universal duration. |
| E9-P07 | Legal hold prevents content expiry while the hold is active. |
| E9-P08 | Expiry can remove/expire message content while preserving minimum required audit metadata. |
| E9-P09 | Cross-tenant retention/legal-hold mutation is rejected. |

## E. Boundary and regression

| ID | Required behavior |
|---|---|
| E9-B01 | EXEC-004 exact-scope authority remains the approval authority source; no parallel RBAC is introduced. |
| E9-B02 | EXEC-005 party/customer identity remains upstream; communication identity does not overwrite it. |
| E9-B03 | EXEC-006 reservation/commitment truth is not rewritten by workflow/communication records. |
| E9-B04 | EXEC-007 immutable offer/version truth is not rewritten by workflow/communication records. |
| E9-B05 | EXEC-008 contract/payment truth is not rewritten by workflow/communication records. |
| E9-B06 | Provider credentials/account activation are not required by tests or runtime contracts in EXEC-009. |
| E9-B07 | No Production/customer-data migration or backfill occurs. |
| E9-B08 | No `main` merge or Production deployment is authorized by package implementation evidence alone. |

## Ledger count

Total frozen behavioral contracts in this pre-freeze draft: **50**.

- Workflow definition/run: 13
- Approval/escalation: 10
- Communication identity/thread: 10
- Consent/retention: 9
- Boundary/regression: 8

## Evidence policy

`PASS` requires direct behavioral or real disposable-database evidence matching the exact requirement. Structural/source assertions may supplement but do not replace behavior where the requirement is behavioral. Concurrency requirements require a real database or equivalent deterministic race proof. Human/independent review may be deferred to the pre-launch review gate, but executable evidence cannot be waived.
