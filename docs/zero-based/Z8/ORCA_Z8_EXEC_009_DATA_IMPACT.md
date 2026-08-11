# ORCA Z8 — EXEC-009 Data & Threat Impact

- **Package:** `EXEC-009 — Durable workflow and communication truth`
- **Date:** `2026-08-11`
- **Status:** `PRE-FREEZE / NO RUNTIME AUTHORITY`

## Intended durable truth

EXEC-009 may introduce provider-neutral persistence for:

1. immutable workflow-definition versions;
2. durable workflow runs pinned to one exact definition version;
3. bounded attempts, timeout, retry and dead-letter history;
4. approval requests and independent approval evidence;
5. communication participants/senders with verification state;
6. normalized thread identity independent from party/customer identity;
7. inbound/outbound communication evidence with provider/message identity and replay protection;
8. purpose-specific consent and opt-out history;
9. retention classification, expiry and legal-hold metadata;
10. escalation records and terminal-failure evidence.

## Data classification

- Workflow definitions/runs: operational metadata.
- Approval evidence: authorization/audit metadata.
- Communication addresses/identifiers: personal data where attributable to a person.
- Message content: potentially sensitive customer/business content.
- Consent/opt-out: privacy/compliance evidence.
- Provider payloads: untrusted external input and potentially sensitive metadata.

## Mandatory minimization

- Store normalized/hashable provider identities where raw identity is not operationally required.
- Do not duplicate customer identity truth already owned by EXEC-005.
- Do not treat phone/email/provider sender ID as verified party identity without an attributable match.
- Preserve thread identity separately from customer/party identity.
- Keep raw provider payload retention bounded and independently configurable.
- Separate message content retention from minimum audit metadata retention.

## Threat model

### T09-01 — Forged sender identity

A forged or ambiguous phone/email/provider sender ID could be attached to the wrong customer.

**Required control:** unknown/ambiguous sender remains unverified; no automatic customer merge; same-tenant evidence required.

### T09-02 — Duplicate/replayed provider event

A duplicate webhook/message could repeat a business action.

**Required control:** stable provider/message identity plus idempotency; duplicate evidence may be logged but business effect occurs once.

### T09-03 — Retry amplification

Automatic retry may duplicate unsafe side effects or create an infinite execution loop.

**Required control:** bounded retry budget, idempotency or explicit non-retriable classification, terminal dead-letter state.

### T09-04 — Timeout treated as success

A timed-out operation could be incorrectly considered completed.

**Required control:** timeout is an explicit failure/unknown state requiring retry/reconciliation, never success by assumption.

### T09-05 — Self-approval

Initiator may approve their own governed workflow action.

**Required control:** initiator evidence is mandatory and same-user approval fails closed.

### T09-06 — Stale workflow definition

An active run may silently pick up a later workflow edit.

**Required control:** each run pins an immutable definition version at creation.

### T09-07 — Consent bypass

Operational messaging could be mislabeled to bypass marketing opt-out.

**Required control:** communication purpose is explicit and auditable; marketing requires consent; opt-out blocks marketing only and cannot be reclassified silently.

### T09-08 — Retention overreach or premature deletion

Content may be retained indefinitely or audit evidence may be destroyed too early.

**Required control:** configurable retention class, expiry, legal hold and separation of content from minimum audit metadata.

### T09-09 — Cross-tenant thread/message linkage

A provider reference or normalized sender could bind records across tenants.

**Required control:** tenant is part of every uniqueness/lookup boundary; cross-tenant references fail closed at service and database levels.

### T09-10 — Provider activation leakage

Implementation may accidentally require or expose provider credentials.

**Required control:** EXEC-009 tests use provider-neutral synthetic adapters/evidence only; credentials and Production sending remain prohibited.

## Migration/data boundary

An additive schema migration may be prepared later only after Scope Freeze and Final Allowlist. No Production migration, customer-data transformation, backfill or provider-data import is authorized by this document.

## Upstream/downstream authority

- EXEC-004 remains authority source for scoped approval.
- EXEC-005 remains party/customer identity root.
- EXEC-006/007/008 business truths remain upstream and must not be rewritten by communication/workflow records.
- EXEC-012 remains the package for provider/AI/regulated activation.
