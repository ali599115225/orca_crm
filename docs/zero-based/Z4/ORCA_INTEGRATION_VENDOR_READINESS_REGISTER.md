# ORCA Z4 — Integration, Vendor, and Subprocessor Readiness Register

- **Document ID:** ORCA-Z4-INT-001
- **Version:** 0.9 — Planning Candidate
- **Date:** 2026-07-22
- **Status:** `INTEGRATION-READY TARGET DEFINED / PROVIDERS NOT APPROVED`
- **Production action authorized:** `false`

## 1. Purpose

Define the target integration architecture, vendor/subprocessor evidence, adapter contracts, activation gates, webhook security, failure behavior, and exit requirements. ORCA prepares safe technical paths; the company owner selects, contracts, pays, licenses, and supplies Production credentials for every provider.

## 2. Governing ownership policy

- Provider accounts, subscriptions, merchant accounts, sender identities, phone numbers, domains, templates, licenses, and credentials belong to the operating company.
- Developer-owned personal or Production credentials are prohibited.
- Credentials are stored only in approved environment/secret-management controls and never in source, GitHub, reports, screenshots, logs, prompts, or database business records.
- No provider is considered connected or compliant without current evidence.
- `NOT_CONFIGURED` is an approved safe state when unrelated ORCA functions continue and no false success is generated.
- Provider technical success does not automatically equal business success; the owning Z2 domain performs the final transition.

## 3. Provider lifecycle

```text
UNASSESSED
→ OWNER_EVIDENCE_REQUIRED
→ SELECTED_PENDING_CONTRACT
→ SANDBOX_READY
→ TECHNICALLY_VERIFIED
→ PRODUCTION_CREDENTIALS_PENDING
→ ACTIVATION_APPROVED
→ ACTIVE
→ DEGRADED
→ SUSPENDED
→ EXIT_PLANNED
→ DISCONNECTED
```

Independent safe states:

- `NOT_CONFIGURED`
- `LICENSE_OR_APPROVAL_MISSING`
- `DATA_LOCATION_NOT_APPROVED`
- `CONTRACT_OR_DPA_MISSING`
- `CREDENTIAL_INVALID`
- `RATE_LIMITED`
- `PROVIDER_OUTAGE`
- `OUTCOME_UNKNOWN_RECONCILIATION_REQUIRED`

## 4. Required vendor/subprocessor record

Every provider record contains:

- vendor ID, legal name, contracting entity, service and category;
- company owner and technical owner;
- intended capability/process and Release 1 status;
- account/subscription owner;
- licensing/regulatory evidence needed;
- data fields/categories sent and returned;
- data subjects and purpose;
- storage/processing/support locations;
- subprocessors;
- transfer assessment status;
- DPA, SLA, security terms, incident notice, and audit rights;
- authentication/credential model;
- API/webhook documentation versions;
- quotas, rate limits, timeouts, availability, maintenance and support;
- retention/deletion/training policy;
- export/portability and exit/deletion process;
- cost owner, price model, budget/usage alerts;
- sandbox/test evidence;
- activation approval and review/expiry date;
- current status and unresolved blockers.

Unknown material evidence is represented as `OWNER_EVIDENCE_REQUIRED`, never guessed.

## 5. Provider category register

| Category | Target use | Default status | Data direction | Key activation blockers |
|---|---|---|---|---|
| Email | transactional/service and approved marketing email | NOT_CONFIGURED | contact, template variables, delivery events | sender/domain, DPA/location, consent/purpose, templates, webhook verification |
| WhatsApp/business messaging | approved customer conversations/templates | NOT_CONFIGURED | phone, message/attachment metadata, delivery events | company business account/number, policy/template approval, consent, webhook security |
| SMS | approved notifications/verification | NOT_CONFIGURED | phone, short content, delivery events | sender identity, consent/purpose, location/DPA, cost |
| Payment/hosted checkout | payment initiation/status only | NOT_CONFIGURED | amount/reference/customer minimum, provider token/status | merchant account, PCI scope, webhook/reconciliation, refund process |
| Electronic signature | signature request and evidence | NOT_CONFIGURED | contract/document/party minimum, signature evidence | legal applicability, company account, identity/evidence, location/DPA |
| Document/object storage | secure encrypted files | OWNER_EVIDENCE_REQUIRED | files/metadata/access logs | region/location, encryption, signed URLs, scanning, lifecycle, exit |
| Malware/file scanning | uploaded-content inspection | OWNER_EVIDENCE_REQUIRED | file/content hash/result | privacy/location, limits, failure mode, retention |
| Calendar | appointment synchronization/reminders | NOT_CONFIGURED | time, participants, location/notes minimum | company account, scopes, privacy, idempotent sync |
| Maps/geocoding | address/map assistance | NOT_CONFIGURED | address/location fields | purpose/minimization, terms, location/logging, quota |
| Advertising platforms | campaign/lead/ad-license workflow | LICENSE_OR_APPROVAL_MISSING | approved creative/lead metadata/events | business account, licensing, consent, attribution, deletion/exit |
| AI/model provider | assistive summaries/recommendations | NOT_CONFIGURED | approved minimized context/output | AI policy, data use/training, region/DPA, prompt injection, human review, kill switch |
| Error/observability service | technical diagnostics | OWNER_EVIDENCE_REQUIRED | minimized logs/traces/errors | masking, region/retention, support access, DPA |
| Identity provider/SSO | optional workforce authentication | NOT_CONFIGURED | user identity/auth events | company directory, MFA/policy, lifecycle, break glass |
| Tax/e-invoice integration | only if officially applicable | LICENSE_OR_APPROVAL_MISSING | invoice/tax/status evidence | taxpayer/wave status, certificate/credentials, schema/security, failure/reconciliation |

No named commercial vendor is approved by this planning register.

## 6. Adapter contract

Every provider adapter exposes provider-neutral operations and types. Minimum interface direction:

```text
getReadiness()
validateConfiguration()
testSandboxConnection()
submit(request, idempotencyKey)
getStatus(providerReference)
verifyWebhook(rawBody, headers)
parseWebhook(rawBody)
reconcile(providerReference)
cancelOrCompensate(request) when supported
exportData()
disconnect()
```

### Adapter result separates

- request accepted/rejected;
- provider reference;
- provider technical state;
- business outcome state;
- confirmation source and timestamp;
- retryability;
- unknown/reconciliation requirement;
- safe Arabic message and internal error class.

Provider-specific SDK objects do not escape the adapter boundary.

## 7. Configuration and credential contract

Configuration is split into:

- non-secret provider settings;
- secret credentials/keys/certificates;
- environment-specific endpoints/modes;
- owner approvals/licenses/evidence;
- feature activation state.

Rules:

- secret presence is checked without displaying the value;
- Production and non-Production credentials are separate;
- rotation/revocation procedure and owner are recorded;
- least provider scopes are used;
- callback/redirect/webhook URLs are environment-specific;
- no automatic fallback to a developer or shared account;
- missing configuration yields `NOT_CONFIGURED`, not application crash or false success.

## 8. Webhook/callback security contract

Every external callback must implement as applicable:

1. HTTPS and approved endpoint/environment.
2. Raw-body capture only for verification and bounded size.
3. Signature/MAC/certificate verification using current provider contract.
4. Timestamp/nonce/tolerance and replay protection.
5. Provider event ID or deterministic idempotency key.
6. Event schema/type/version validation.
7. Company/account mapping from trusted configuration, not arbitrary payload input.
8. Minimal synchronous acknowledgement.
9. Inbox receipt and asynchronous owned-domain processing.
10. Safe duplicate handling.
11. Unknown reference/outcome quarantine and reconciliation.
12. No secret or full sensitive payload in logs.
13. Metrics, alerts, dead-letter/manual recovery.
14. Direct invalid-signature, replay, duplicate, stale, malformed, and unauthorized-account tests.

An unverified webhook cannot alter business state.

## 9. Provider operation state machine

```text
CREATED
→ SUBMITTING
→ PROVIDER_ACCEPTED | PROVIDER_REJECTED | TIMEOUT_UNKNOWN
→ CONFIRMED | FAILED | RECONCILIATION_REQUIRED
→ RETRY_SCHEDULED | MANUAL_REVIEW | CLOSED
```

Business state changes occur only through the owning domain after validated evidence.

Examples:

- message request accepted ≠ delivered;
- payment session created ≠ paid;
- refund request accepted ≠ refunded;
- signature envelope created ≠ signed contract;
- file uploaded ≠ malware-safe and available;
- ad submitted ≠ licensed/published/approved.

## 10. Timeout, retry, quota, and circuit-breaker rules

- explicit connect/read/total timeout budgets;
- retry only safe or idempotent operations;
- exponential backoff with jitter and bounded attempts;
- honor provider `Retry-After` and quotas;
- prevent retry storms and duplicate external effects;
- circuit/degraded mode where repeated failure warrants it;
- queue backlog, oldest item, attempt rate, failure rate, quota consumption, and unknown outcomes are observable;
- manual retry requires authority, reason, and audit;
- exhausted operations enter dead-letter/manual reconciliation rather than silent loss.

## 11. Mock and sandbox evidence

Before Production activation, each provider integration requires:

- deterministic contract-level mock tests;
- sandbox or provider test-environment evidence when available;
- success, rejection, timeout, rate-limit, outage, malformed response, duplicate, and unknown-outcome tests;
- webhook valid/invalid/replay tests;
- idempotency and reconciliation tests;
- no-configuration and credential-invalid behavior;
- data minimization/log masking review;
- provider-version compatibility evidence;
- activation and rollback runbook.

Mock success proves ORCA contract behavior, not the existence of a real company account, license, subscription, or Production connectivity.

## 12. Activation gate

A provider cannot become `ACTIVE` until all applicable checks are `VERIFIED`:

1. owner selection and budget;
2. account/subscription ownership;
3. license/regulatory evidence;
4. purpose and data inventory;
5. DPA/SLA/security/incident terms;
6. locations/subprocessors/transfer assessment;
7. Production credentials and secret storage;
8. approved sender/domain/number/merchant/template identities;
9. sandbox/mock/webhook/reconciliation tests;
10. monitoring, alerts, runbook, support owner;
11. retention/deletion/export/exit path;
12. staging E2E using company-owned non-Production configuration;
13. explicit owner activation approval.

Provider activation remains independent from general technical execution authority.

## 13. Exit and portability contract

For each provider:

- inventory data/configuration to export;
- export format and completeness test;
- credential revocation;
- callback/domain/number/template reassignment;
- pending operation reconciliation;
- provider data deletion/retention evidence;
- replacement adapter/compatibility plan;
- user/business continuity path;
- cost termination and account ownership transfer;
- audit evidence and final status.

ORCA business identifiers and authoritative records must not become irreversibly dependent on opaque provider IDs.

## 14. Cost and capacity controls

Provider records define:

- billing model and currency;
- owner/budget center;
- free/committed/variable usage limits;
- usage metric and forecast;
- soft/hard alert thresholds;
- overage/degradation behavior;
- cost-per-transaction KPI where useful;
- capacity/throughput/attachment/token constraints;
- review and renewal date.

No paid plan, upgrade, usage commitment, or provider purchase is authorized here.

## 15. Owner decisions required

- provider selection and budget per category;
- account, sender, domain, number, merchant, and template ownership;
- hosting/processing/support regions and subprocessors;
- DPA/SLA/security/exit acceptance;
- marketing consent and communication-purpose rules;
- payment method and PCI/ZATCA applicability;
- signature/legal-evidence provider and applicability;
- approved AI use cases and data categories;
- Production activation order and accountable owner.

## 16. Decision

```text
PROVIDER OWNERSHIP: COMPANY OWNER
DEVELOPER-OWNED PRODUCTION CREDENTIALS: PROHIBITED
PROVIDER-NEUTRAL ADAPTER CONTRACT: DEFINED
WEBHOOK VERIFICATION / REPLAY / IDEMPOTENCY: DEFINED
MOCK / SANDBOX EVIDENCE: REQUIRED
NOT_CONFIGURED: VALID SAFE STATE
NAMED PROVIDERS APPROVED: 0
PRODUCTION PROVIDERS ACTIVE: 0
PAID PURCHASE OR ACTIVATION: NOT AUTHORIZED
PRODUCTION ACTION: NONE
```
