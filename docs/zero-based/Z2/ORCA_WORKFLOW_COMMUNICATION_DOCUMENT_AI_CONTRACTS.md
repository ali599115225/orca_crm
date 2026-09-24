# ORCA Z2 — Workflow, Communication, Document, Reporting, and AI Domain Contracts

- **Document ID:** ORCA-Z2-DOM-C-001
- **Version:** 1.0
- **Date:** 2026-07-22
- **Status:** `TARGET CONTRACT / NOT IMPLEMENTATION CLAIM`

## DOM-08 — Tasks, Workflow, and Approvals

### Purpose

Turn business triggers and human requests into accountable work with ownership, due dates, state, evidence, escalation, approvals, retries, and auditable closure.

### Core entities

- `Task`.
- `TaskAssignment` and transfer history.
- `WorkflowDefinition` and version.
- `WorkflowRun`.
- `ApprovalRequest` and `ApprovalDecision`.
- `Escalation`.
- `RetryAttempt` and `DeadLetterRecord` for system work.
- `ClosureEvidence`.

### Task lifecycle

```text
DRAFT
→ OPEN
→ ASSIGNED
→ IN_PROGRESS
→ REVIEW_PENDING
→ COMPLETED
→ CLOSED
```

Alternatives: `BLOCKED`, `OVERDUE`, `CANCELLED`, `REJECTED`, `FAILED`, `DEAD_LETTER`.

### Approval lifecycle

```text
DRAFT
→ REQUESTED
→ PENDING
→ APPROVED | REJECTED | EXPIRED | CANCELLED
```

Material changes after approval create a new request/version.

### Commands and rules

- `CreateTask`: source, purpose, owner/queue, priority, due date, scope, and business context required.
- `AssignTask` / `TransferTask`: assignee must be active and scoped; history/reason retained.
- `StartTask`: only assigned/scoped actor or authorized queue consumer.
- `BlockTask`: blocker and dependency required; may start escalation clock.
- `SubmitForReview`: required evidence attached.
- `CompleteTask`: completion result/evidence required; cannot bypass required review.
- `CloseTask`: verifies downstream state/evidence where closure has business effect.
- `RequestApproval`: exact subject version, requested authority, amount/risk/exception metadata.
- `DecideApproval`: actor eligibility, separation, delegation, and expiry verified server-side.
- `RetrySystemWork`: bounded policy, idempotency key, and attempt history.
- `MoveToDeadLetter`: terminal automated failure requiring human review/replay decision.

### Invariants

- One accountable owner or explicit queue exists for every open task.
- Overdue is derived from due date/state; it is not a substitute for workflow state.
- Approval never grants authority beyond the approver's delegated scope.
- The request subject/version cannot change under an existing approval.
- Workflow orchestration cannot bypass the target domain's state and permission checks.
- Replayed system work is idempotent and bounded; infinite retries are prohibited.
- A task is not complete merely because an API call was attempted; expected outcome/evidence is required.
- Cancellation preserves history and states whether dependent business work was compensated.

### Failure/recovery/tests

- inactive/out-of-scope assignee rejection;
- overdue/escalation clock tests;
- approval exact-version and self-approval negative tests;
- delegation expiry and scope tests;
- duplicate trigger/idempotent workflow tests;
- retry backoff/limit/dead-letter tests;
- transaction failure leaves no false completion;
- closure evidence access/audit tests.

---

## DOM-09 — Communications and Customer Support

### Purpose

Record customer-facing and internal service communication truthfully across channels, maintain consent/provider state, link context, assign responsibility, resolve tickets, and fail safely when external providers are unavailable.

### Core entities

- `Conversation`.
- `ConversationParticipant`.
- `MessageRecord`.
- `DeliveryAttempt` and provider receipt.
- `ChannelConnectionState`.
- `Ticket`.
- `TicketAssignment`.
- `TicketEvent`.
- `Consent/OptOutReference`.
- `AttachmentReference`.

### Message lifecycle

```text
DRAFT
→ QUEUED
→ SUBMISSION_PENDING
→ SUBMITTED
→ DELIVERED
→ READ
```

Alternatives: `NOT_CONFIGURED`, `BLOCKED_BY_POLICY`, `FAILED_RETRYABLE`, `FAILED_FINAL`, `CANCELLED`, `UNKNOWN_PROVIDER_STATE`.

### Ticket lifecycle

```text
NEW
→ TRIAGED
→ ASSIGNED
→ IN_PROGRESS
→ WAITING_CUSTOMER | WAITING_INTERNAL | ESCALATED
→ RESOLVED
→ CLOSED
```

Alternatives: `REOPENED`, `DUPLICATE`, `CANCELLED`.

### Commands and rules

- `StartConversation`: valid customer/context, permitted purpose, scoped actor.
- `QueueMessage`: template/content/recipient/channel/consent validated; sensitive data minimized.
- `SubmitMessage`: only configured approved provider; idempotency and audit required.
- `ProcessProviderReceipt`: signature, timestamp/replay, reference, and state-order validation.
- `RecordInboundMessage`: verified webhook/provider source or authorized manual record; deduplicate.
- `SetOptOut`: immediate applicable suppression and audit.
- `CreateTicket`: category, severity, customer/context, owner/queue, and response target.
- `ResolveTicket`: resolution summary and outcome evidence.
- `CloseTicket`: waiting/reopen policy and customer confirmation rule where applicable.

### Invariants

- `NOT_CONFIGURED` is valid and cannot be represented as a provider error caused by the user.
- A message is not delivered/read because it was queued or submitted.
- Invalid/unsigned/replayed webhooks cannot mutate delivery or business state.
- Marketing or non-essential outbound contact respects consent/opt-out and permitted purpose.
- Provider accounts, numbers, domains, templates, and credentials belong to the company.
- Message body, attachments, and customer context follow least-access and retention rules.
- Ticket resolution does not directly mutate financial/contract status without the target-domain command and authority.
- Unknown provider outcomes remain unknown until reconciled; blind retries that may duplicate effects are prohibited.

### Failure/recovery/tests

- provider not configured path preserves draft/internal record;
- timeout creates unknown/pending state, not false failure/success;
- signed webhook, invalid signature, old timestamp, and replay tests;
- duplicate inbound/outbound reference tests;
- opt-out suppression tests;
- attachment security/access tests;
- ticket SLA/escalation/reopen tests;
- cross-scope conversation/ticket authorization tests.

---

## DOM-10 — Documents, Files, Templates, and Evidence

### Purpose

Store and prove business records securely through metadata, immutable versions, access, malware/type/size controls, retention, legal hold, secure retrieval, and evidence packaging.

### Core entities

- `Document` logical record.
- `DocumentVersion` immutable binary/content metadata.
- `FileObjectReference`.
- `DocumentClassification`.
- `TemplateMetadata` and approved template version.
- `AccessGrant` where explicit sharing is required.
- `MalwareScanResult`.
- `RetentionDisposition`.
- `LegalHold`.
- `EvidencePackage` and manifest.

### Lifecycle

```text
UPLOAD_PENDING
→ QUARANTINED
→ SCAN_PENDING
→ APPROVED_FOR_USE
→ ACTIVE
→ SUPERSEDED
→ ARCHIVED
→ DISPOSAL_PENDING
→ DISPOSED
```

Alternatives: `REJECTED`, `INFECTED`, `ACCESS_BLOCKED`, `LEGAL_HOLD`.

### Commands and rules

- `InitiateUpload`: authorized context, classification, expected type/size, short-lived upload authorization.
- `FinalizeUpload`: object integrity/size/type checked; enters quarantine/scan.
- `RecordScanResult`: trusted scanner/manual approved process; infected files never become active.
- `ApproveDocumentVersion`: business reviewer where required; exact version finalization.
- `CreateNewVersion`: preserves prior version and references.
- `IssueSecureDownload`: short-lived authorization, scope, disposition headers, audit.
- `ApplyLegalHold`: authorized reason/scope; overrides disposal.
- `ScheduleDisposition`: approved retention rule and eligibility.
- `ExecuteDisposition`: later authorized non-Production/Production control; manifest/audit; no silent deletion.
- `CreateEvidencePackage`: manifest, hashes, references, access purpose, and export audit.

### Invariants

- No permanent public file URL.
- File extension alone is not trusted; type/signature/size controls apply.
- Executable or dangerous content is blocked according to policy.
- Final contract/invoice/evidence versions are immutable; correction creates a new version or controlled reversal.
- Access derives from business context and explicit permission, not possession of a predictable URL.
- Signed URLs are short-lived and cannot broaden authorization.
- Storage/provider location and subprocessor status are approved before activation.
- Retention schedule remains owner/legal decision; until approved, preserve and prohibit irreversible disposal except separately authorized security response.
- Legal hold blocks disposition.
- Secrets, prohibited card data, and unnecessary sensitive data are not accepted into generic evidence fields.

### Failure/recovery/tests

- type spoofing/oversize/malware tests;
- unauthorized and expired signed URL tests;
- version immutability/hash tests;
- storage provider not-configured/failure tests;
- interrupted upload cleanup/idempotency;
- legal hold/disposition blocking tests;
- evidence package manifest/hash/access audit tests;
- cross-company/resource access negative tests.

---

## DOM-11 — Reporting, Analytics, and AI Assistance

### Purpose

Provide trustworthy, scoped operational insight and human-reviewed assistance without turning derived metrics or model output into unverified business facts.

### Core entities

- `MetricDefinition`.
- `MetricDimension`.
- `DataLineageReference`.
- `ReportDefinition` and version.
- `ReportRun` / `Snapshot`.
- `ExportRecord`.
- `DataQualityIssue`.
- `AIUseCasePolicy`.
- `AIAssistanceRequest`.
- `AIAssistanceOutput`.
- `HumanReviewDecision`.
- `ModelVendorReference` and policy state.

### Metric/report lifecycle

```text
DRAFT
→ REVIEW_PENDING
→ APPROVED
→ ACTIVE
→ DEPRECATED
→ RETIRED
```

### AI assistance lifecycle

```text
REQUESTED
→ POLICY_CHECK
→ INPUT_PREPARED
→ PROCESSING
→ OUTPUT_PENDING_REVIEW
→ ACCEPTED | REJECTED | EXPIRED
```

Alternatives: `BLOCKED_BY_POLICY`, `PROVIDER_NOT_CONFIGURED`, `FAILED`, `CANCELLED`.

### Commands and rules

- `DefineMetric`: formula, source, grain, dimensions, owner, freshness, exclusions, and access class.
- `ApproveMetric`: independent review of semantics and reconciliation.
- `RunReport`: scoped query, definition version, as-of time, freshness, and result metadata.
- `ExportReport`: export permission, purpose, filters, row/field controls, watermark/manifest where required.
- `RecordDataQualityIssue`: source, impact, owner, and resolution state.
- `RequestAIAssistance`: approved use case, minimum allowed context, actor scope, provider state.
- `PrepareAIInput`: field-level allowlist/redaction; untrusted content boundaries.
- `RecordAIOutput`: model/provider/version, prompt policy reference, output, citations/grounding metadata where applicable.
- `ReviewAIOutput`: human accepts/rejects/edits; accepted output does not bypass target-domain command.
- `DisableAIUseCase`: kill switch immediately blocks new external processing.

### Invariants

- Every displayed KPI has definition, owner, source, as-of/freshness, and scope.
- Reports do not combine data beyond the actor's authorized scope.
- Export is a distinct sensitive permission and audit event.
- Cached/snapshotted results retain definition version and as-of time.
- AI never confirms payment, approves refund, activates contract, changes price, asserts legal compliance, or performs irreversible action autonomously.
- External AI remains disabled until owner policy, vendor/subprocessor/data-location review, allowed data fields, retention, and credentials are approved.
- Company data is not used for provider training unless explicitly approved contractually.
- Retrieved/customer content is untrusted and cannot alter system policy or tool authority.
- Model output is labeled as assistance and must be validated before business use.
- Raw secrets, prohibited payment data, and unnecessary sensitive personal data are excluded from prompts and outputs.

### Failure/recovery/tests

- KPI formula/source reconciliation tests;
- stale/freshness display tests;
- cross-scope report/export tests;
- large export limits and audit tests;
- provider not-configured/timeout tests;
- prompt injection and tool-authority boundary tests;
- field allowlist/redaction tests;
- output validation/human-review requirement tests;
- kill-switch tests;
- no-autonomous high-risk transition tests.

## Cross-domain support rules

1. Tasks and approvals coordinate, but target domains remain authoritative.
2. Communications record attempts and provider truth, but do not prove contract/payment outcomes by themselves.
3. Documents provide evidence versions, but business validity still requires domain approvals and applicability.
4. Reports are derived views and cannot be used as the only source for corrective mutation.
5. AI output may propose text/classification/summary; any state change requires normal authenticated domain commands.

## Contract result

```text
DOMAINS COVERED: DOM-08..DOM-11
TASK/APPROVAL AUTHORITY: DEFINED
PROVIDER MESSAGE TRUTH: DEFINED
DOCUMENT SECURITY/RETENTION CONTRACT: DEFINED
KPI LINEAGE/EXPORT CONTRACT: DEFINED
HUMAN-REVIEWED AI CONTRACT: DEFINED
CURRENT CODE MATCH: NOT CLAIMED
```
