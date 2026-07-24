# ORCA Z4 — Architecture, API, Event, Job, and Transaction Contracts

- **Document ID:** ORCA-Z4-ARCH-001
- **Version:** 0.9 — Planning Candidate
- **Date:** 2026-07-22
- **Status:** `TEXT CONTRACT COMPLETE / CURRENT IMPLEMENTATION COMPARISON DEFERRED TO Z7`
- **Production action authorized:** `false`

## 1. Purpose

Define the target application architecture and executable-contract rules that connect Z2 domains, Z3 product surfaces, data ownership, integrations, and operations. This document does not claim that the current repository conforms and does not authorize code, schema, provider, environment, or Production changes.

## 2. Architecture objectives

The target architecture must:

- serve one independent operating company;
- enforce authentication, authorization, organizational scope, and company security partition on the server;
- preserve clear domain ownership and prevent uncontrolled cross-domain mutation;
- support safe retries, idempotency, transactions, audit, and concurrency control;
- isolate provider failure from business truth;
- expose versioned, testable APIs/actions/events/jobs;
- support Arabic/RTL product surfaces without coupling business rules to UI components;
- remain observable, recoverable, portable, and incrementally adaptable from the current system;
- retain safe `NOT_CONFIGURED` behavior for external providers.

## 3. Target system context

### Primary actors

- internal users and managers;
- company owner and authorized approvers;
- technical support/operations under approved access;
- background schedulers and trusted jobs;
- external providers owned and contracted by the company;
- auditors/compliance reviewers within approved scope.

### System boundaries

- ORCA web application and server-side application layer;
- PostgreSQL authoritative database;
- controlled object/document storage;
- job/queue/scheduler execution;
- observability and security tooling;
- optional provider adapters for messaging, email, payment, signature, storage, maps, advertising, AI, and other approved services.

External providers never become the implicit source of all business truth; their events are verified evidence consumed by the owning domain.

## 4. Target container model

| Container | Responsibility | Trust/data boundary |
|---|---|---|
| Web UI | Arabic/RTL presentation, input, state display, accessibility | untrusted client; no authority from hidden fields |
| Server application | authentication, authorization, domain commands/queries, orchestration | trusted application boundary |
| Domain modules | business states, invariants, approvals, owned persistence contracts | no UI/provider coupling |
| PostgreSQL | authoritative transactional records, constraints, outbox/inbox/idempotency | restricted network and credentials |
| Document/object storage | encrypted blobs and versioned evidence | metadata/authorization remain server controlled |
| Job/queue/scheduler | retryable background work and timed processes | trusted-job identity and explicit scope |
| Integration adapters | provider translation, signatures, retries, webhooks | external/untrusted boundary |
| Observability/audit | logs, metrics, traces, alerts, evidence | privacy-minimized restricted access |
| Analytics/AI read models | derived insights and assistive output | never authoritative transactional write source |

Exact vendor and deployment choices remain Z6/owner decisions.

## 5. Module-boundary rules

1. Each Z2 domain owns its state transitions and authoritative write interfaces.
2. A module may read another domain only through an approved query/read model or typed contract.
3. A module may request another domain change only through an approved command or event consumer.
4. Shared code is limited to primitives such as identity, money, time, references, validation, errors, audit envelopes, and infrastructure ports.
5. Shared folders cannot become an unowned business-logic domain.
6. UI components cannot directly contain authoritative transaction, permission, provider, or state-transition rules.
7. Provider SDKs are contained behind adapters and do not leak provider types across domain contracts.
8. Database models do not automatically define public API contracts.
9. Circular domain dependencies are prohibited; orchestration uses application services/events with named ownership.
10. Cross-domain reporting uses approved read models and lineage, not uncontrolled transactional joins in page code.

## 6. Command and query contract

Every command records:

- stable command name/version;
- authenticated actor or trusted-job identity;
- company and organizational/resource scope;
- permission and policy decision;
- input schema and normalized values;
- expected current version/state where concurrency matters;
- idempotency key when repeat/retry is possible;
- reason/comment/evidence for sensitive actions;
- correlation and causation IDs;
- transactional boundary;
- result reference and new state/version;
- domain/audit events;
- safe error classification.

Every query records:

- authenticated actor and scope;
- filter/search/sort/page schema;
- maximum bounds and export limits;
- selected fields/read model;
- masking/redaction rules;
- freshness/as-of value where relevant;
- permission/row/field checks;
- stable pagination behavior;
- error/not-found/unauthorized non-disclosure behavior.

## 7. HTTP API contract

HTTP APIs must define and verify:

- version and lifecycle status;
- authentication mechanism;
- permission and scope;
- request/response schemas;
- content type and size limits;
- validation and normalization;
- rate/quota behavior;
- idempotency and retry semantics;
- pagination/filter/sort semantics;
- timeout and cancellation behavior;
- error code and correlation reference;
- audit behavior;
- privacy classification and logging restrictions;
- deprecation and compatibility policy;
- direct positive and negative contract tests.

OpenAPI is required for approved externally callable or integration-facing HTTP interfaces. Internal framework routes remain documented in the API registry even when not published externally.

### Response direction

Successful mutation responses return a human reference, state/version, and only the fields required for the caller. They do not expose secrets, internal stack details, or unrelated personal data.

## 8. Server Action rules

Server Actions are server-side command/query entry points and must meet the same security and contract requirements as HTTP APIs.

- Never trust client-provided user, company, role, scope, price authority, status, or ownership.
- Revalidate active user/company/assignment/role/permission from trusted state.
- Parse input with a named schema.
- Use owned domain/application services rather than direct page-level database mutation.
- Enforce idempotency/concurrency for critical writes.
- Return typed safe results/errors.
- Revalidate/cache-refresh only after successful commit.
- Avoid broad exception swallowing and false success.
- Sensitive operations require reason/evidence and audit.
- Direct action tests prove negative authorization, invalid transition, duplicate/retry, and conflict behavior.

## 9. Error taxonomy

| Code family | Meaning | Retry direction |
|---|---|---|
| `AUTHENTICATION_REQUIRED` | no valid active session/user | re-authenticate |
| `ACCOUNT_DISABLED` | user/company inactive or suspended | owner/admin resolution |
| `PERMISSION_DENIED` | actor lacks authority/scope | do not retry unchanged |
| `NOT_FOUND_OR_UNAVAILABLE` | absent or intentionally non-disclosed | verify reference/scope |
| `VALIDATION_FAILED` | input schema/business validation failed | correct input |
| `INVALID_STATE_TRANSITION` | command not allowed from current state | refresh and follow allowed action |
| `PRECONDITION_REQUIRED` | required approval/evidence/config missing | satisfy precondition |
| `CONFLICT` | concurrency, duplicate, or incompatible commitment | refresh/re-evaluate |
| `IDEMPOTENT_REPLAY` | prior result already exists | return/locate prior result |
| `PROVIDER_NOT_CONFIGURED` | integration safely unavailable | setup/owner action; unrelated functions continue |
| `PROVIDER_REJECTED` | verified provider rejection | correct provider/business data |
| `PROVIDER_TIMEOUT_OR_UNKNOWN` | outcome not yet confirmed | reconciliation/status check, no false success |
| `RATE_LIMITED` | local/provider quota exceeded | retry after bounded delay |
| `DEPENDENCY_UNAVAILABLE` | database/storage/queue dependency unavailable | safe retry/circuit breaker |
| `INTERNAL_ERROR` | unclassified server failure | correlation-based investigation |

User messages are Arabic and safe; logs preserve technical detail without secrets or unnecessary personal content.

## 10. Transaction boundaries

A database transaction should contain only the atomic authoritative data changes and required outbox/audit records. It must not remain open while calling external providers or waiting for user interaction.

### Required atomic examples

- reservation/commitment acquisition and inventory state update;
- accepted offer fixation and reservation link;
- contract activation/version fixation and obligations;
- invoice issuance and installment schedule;
- payment allocation and reconciliation status;
- refund/settlement approval evidence transition;
- role/permission assignment plus audit;
- domain write plus outbox event.

External work follows commit through a job/outbox process; verified external responses are ingested idempotently and reconciled into the owning domain.

## 11. Idempotency contract

Idempotency is mandatory for:

- provider webhook ingestion;
- payment/refund/signature/delivery callbacks;
- retryable commands with financial, contract, reservation, communication, or document effects;
- scheduled jobs and workflow steps;
- import/export and background generation;
- any UI action at risk of duplicate submission.

The record includes scope, operation, normalized request hash where appropriate, key, status, result reference, timestamps, expiry policy, and conflict behavior.

The same key with different material input returns a conflict; it cannot silently execute a second effect.

## 12. Domain event contract

### Event envelope

```text
eventId
schemaName
schemaVersion
occurredAtUtc
recordedAtUtc
companyPartition
producerDomain
aggregateType
aggregateId
aggregateHumanRef
aggregateVersion
actorType / actorId
correlationId
causationId
classification
payload
```

Rules:

- events use past-tense business facts;
- payload is minimal and classification-aware;
- schema changes follow compatibility/version policy;
- consumers are idempotent;
- ordering assumptions are explicit per aggregate/stream;
- event publication does not bypass the authoritative domain transaction;
- sensitive data is referenced or minimized rather than copied broadly.

## 13. Outbox and inbox direction

Use an outbox when business writes and reliable event/job publication must remain consistent. Use an inbox/receipt when external or internal events may repeat.

Minimum outbox fields:

- event ID/type/version;
- aggregate and company partition;
- payload/classification;
- correlation/causation;
- created/available/attempt/processed timestamps;
- attempt count, last error class, dead-letter state.

Publishing failures do not roll back completed external-free business truth; they create observable retry/backlog state.

## 14. Job and scheduled-work contract

Every job defines:

- stable name/version and owner;
- trigger/schedule/timezone;
- trusted identity and company/resource scope;
- input/reference schema;
- preconditions and feature/provider state;
- idempotency/deduplication key;
- timeout, retry count/backoff/jitter;
- concurrency and locking rules;
- checkpoint/resume behavior;
- dead-letter/manual recovery;
- result/evidence/audit;
- metrics, alerts, runbook, and disable switch.

Cron success is not inferred from invocation alone; the business result and backlog are observable.

## 15. Feature-flag and configuration contract

Feature flags/configuration must:

- have owner, purpose, environment, default, expiry/review date, and rollback behavior;
- default to safe off for unapproved provider, legal, financial, AI, migration, or destructive behavior;
- be evaluated server-side for authoritative actions;
- not replace authorization;
- be auditable for material changes;
- avoid permanent dual behavior without retirement plan;
- expose `NOT_CONFIGURED`, disabled, degraded, and unknown states honestly.

Secrets are not feature-flag values and remain in an approved secret store.

## 16. Provider resilience direction

Integration adapters define:

- bounded timeouts;
- retry policy limited to safe/idempotent operations;
- circuit breaker/degraded mode where useful;
- provider rate/quota handling;
- status/reconciliation operation for unknown outcomes;
- verified webhook/callback path;
- replay protection;
- provider error mapping;
- metrics and alerts;
- sandbox/mock conformance tests;
- exit/export behavior.

A timeout or missing callback never becomes a false `SENT`, `PAID`, `SIGNED`, `REFUNDED`, or `SYNCED` result.

## 17. Compatibility and deprecation

- Schemas and contracts have versions and owners.
- Additive compatible change is preferred.
- Breaking change requires consumer inventory, transition period, migration/adapter plan, tests, and rollback/forward-fix.
- Deprecated fields/routes/events have announced status, usage evidence, removal condition, and date.
- Current `/operations/*` and current API/action paths are classified in Z7; no automatic route or contract replacement is authorized here.

## 18. Architecture decision records required

At minimum, later ADRs must decide:

1. target module/package structure;
2. transaction and outbox/inbox implementation;
3. queue/job technology and delivery guarantees;
4. object-storage/provider strategy;
5. API versioning and OpenAPI publication scope;
6. cache and read-model strategy;
7. tenant/company-partition transition strategy;
8. event schema registry and compatibility tooling;
9. feature-flag/configuration system;
10. AI provider/isolation architecture if activated.

Each remains a planning decision until Z7 evidence and Z8 authorization.

## 19. Acceptance and later verification

Z7/Z8 implementation packages must prove:

- module dependency rules;
- permission/scope enforcement;
- schema and API contract tests;
- invalid-state, concurrency, duplicate/retry, timeout, replay, and provider-failure tests;
- transaction rollback and outbox/inbox behavior;
- compatibility/deprecation evidence;
- observability and recovery;
- no secrets or unnecessary personal data in errors/logs/events.

## 20. Decision

```text
TARGET CONTAINER AND MODULE MODEL: DEFINED
HTTP API CONTRACT: DEFINED
SERVER ACTION CONTRACT: DEFINED
ERROR TAXONOMY: DEFINED
TRANSACTION / IDEMPOTENCY: DEFINED
EVENT / OUTBOX / INBOX: DEFINED
JOB / CRON CONTRACT: DEFINED
FEATURE FLAG / CONFIG CONTRACT: DEFINED
PROVIDER RESILIENCE: DEFINED
CURRENT REPOSITORY CONFORMANCE: NOT YET ASSESSED
RUNTIME CHANGE: NONE
PRODUCTION ACTION: NONE
```
