# ORCA Z8 — EXEC-009 Owner Decision Record

- **Decision ID:** `ORCA-DR-EXEC-009-001`
- **Date:** `2026-08-11`
- **Package:** `EXEC-009 — Durable workflow and communication truth`
- **Governance branch:** `work/orca-exec-009-governance-20260811`
- **Status:** `OWNER DECISION GATE CLOSED / PRE-FREEZE AUTHORIZED`

## Context

EXEC-009 targets `GAP-Z7-011` and `GAP-Z7-012`. Its outcome is to establish durable workflow runs, version pinning, bounded retry/dead-letter handling and normalized communication identity, thread, consent, retention and escalation truth. Provider activation, credentials and Production sending remain separate later authorizations.

## Approved owner decisions

### D09-01 — Workflow approval and separation of duties

Any workflow that performs a sensitive action, financial action or final-state mutation requires an authorized approver on the exact persisted scope. Self-approval is prohibited: the initiator/requester must not approve the same governed action.

### D09-02 — Workflow version pinning

Every workflow run is pinned to the exact workflow-definition version that existed when the run started. Later edits do not mutate an active or historical run. New executions use the newly published version only.

### D09-03 — Retry and timeout

Retries are bounded and explicit. A timeout is not success. Operations that are unsafe to repeat must be idempotent or transition to a reviewable failure state rather than being retried blindly.

### D09-04 — Dead letter and escalation

After the retry budget is exhausted, the run enters an explicit terminal failure/dead-letter state with preserved reason and attempt history. Failure is never silently converted to success. Governed failures are escalated to an authorized user/team.

### D09-05 — Sender and thread identity

Phone number, email address or provider sender identifier alone is not final proof of customer identity. Unknown senders remain unverified until a reliable match is established. Ambiguous or conflicting identities must not be merged automatically. Thread identity is preserved independently from party/customer identity.

### D09-06 — Duplicate and replay handling

A replayed message, webhook or event with the same verified provider identity must not create a second business effect. Duplicate evidence may be retained for traceability, but the semantic operation is idempotent.

### D09-07 — Consent and opt-out

Marketing communication requires valid attributable consent. Opt-out blocks subsequent marketing communication. Necessary operational/service communication is a separate purpose and must not be used to bypass marketing opt-out.

### D09-08 — Retention policy boundary

No arbitrary numeric retention period is invented in EXEC-009. Retention is configurable by communication type and purpose, with explicit expiry and legal-hold capability. Final statutory/commercial durations are a pre-launch policy input.

### D09-09 — Deletion and audit traceability

Retention expiry must not destroy audit evidence that must remain for legal, security or operational traceability. Message content and minimum necessary audit metadata are separable so content can expire while required history remains attributable.

### D09-10 — Provider activation boundary

EXEC-009 may implement internal workflow/communication truth and provider-neutral contracts only. It does not authorize WhatsApp, email, SMS or other provider credentials, account activation, Production sending or external-provider transaction execution.

## Security invariants

- Deny by default for governed workflow approval and communication mutations.
- Same-tenant and exact persisted scope are required for approval.
- No self-approval for governed actions.
- Workflow definition/version and workflow run history are immutable historical truth after publication/start.
- Retry is bounded; timeout is not success.
- Dead-letter/failure history is preserved.
- Duplicate/replay must not duplicate business effects.
- Unknown sender identity fails closed and remains unverified.
- Consent and opt-out are attributable, purpose-specific truth.
- Provider credentials and Production communication remain outside this package.

## Explicitly not authorized

This record does **not** authorize:

- Runtime implementation before Scope Freeze and Final Allowlist;
- any provider credential or account activation;
- Production sending;
- Production migration or customer-data backfill;
- Vercel Production deployment;
- `main` merge;
- EXEC-010 or later package implementation.

## Governance transition

With D09-01 through D09-10 approved, EXEC-009 leaves `OWNER_DECISION_PENDING` for governance purposes and enters `PRE-FREEZE / EVIDENCE PREPARATION`. Runtime implementation remains unauthorized until Threat/Data Impact, Test Ledger, Scope Freeze and Final Allowlist are completed and explicitly activated.
