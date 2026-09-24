# ORCA Z4 — Data Catalog, Privacy, RoPA, and Retention Contract

- **Document ID:** ORCA-Z4-PRIV-001
- **Version:** 0.9 — Planning Candidate
- **Date:** 2026-07-22
- **Status:** `TEXT CONTRACT COMPLETE / OWNER AND LEGAL EVIDENCE OPEN`
- **Production action authorized:** `false`

## 1. Purpose

Define the mandatory data-catalog, classification, privacy-inventory, Record of Processing Activities, retention, rights, incident, and transfer controls for ORCA. This is a technical planning control, not a legal opinion and not approval of any actual processing activity or retention period.

## 2. Controller and processor planning position

- The operating company is the presumptive controller for its internal real-estate operations.
- The technical provider acts as processor only to the extent documented in the final contract and instructions.
- External vendors are processors/subprocessors or independent parties according to the approved data flow and contract.
- Final allocation requires owner/legal confirmation, a Data Processing Agreement, support/security terms, and vendor records.

## 3. Data-classification model

| Class | Description | Examples | Minimum handling |
|---|---|---|---|
| PUBLIC | Approved public information | published property description after approval | integrity, publication approval, removal process |
| INTERNAL | Low-sensitivity internal operations | generic workflow status, non-sensitive reference data | authenticated access, normal audit |
| CONFIDENTIAL | Business or personal data with meaningful impact | customer contact data, offers, contracts, internal pricing | scoped access, encryption, audit, controlled export |
| RESTRICTED | High-impact personal, financial, legal, security, or regulated evidence | identity evidence, signatures, payment evidence, access decisions | strict least privilege, field masking, reasoned access/export, enhanced logging |
| SECRET_CREDENTIAL | Credentials and cryptographic material | API keys, passwords, signing secrets, private keys | secret manager only; never business tables, logs, reports, screenshots, prompts, or Git |

Classification is assigned at field and document type, not only at table level.

## 4. Catalog fields required for every data element

Every stored, derived, exported, logged, or externally transmitted data element must record:

- stable catalog ID;
- business name and technical field/location;
- authoritative domain and owner;
- purpose and process;
- source and collection method;
- data subject category;
- classification;
- required/optional/derived status;
- accuracy and freshness requirement;
- lawful/operational basis placeholder pending owner/legal confirmation;
- internal roles/scopes allowed;
- external recipients/processors;
- storage and processing location;
- retention class and disposal method;
- legal-hold eligibility;
- export/search/report use;
- AI use allowed/prohibited;
- masking/redaction rule;
- audit requirements;
- verification evidence and status.

A field without documented purpose or owner is not approved for target implementation.

## 5. Initial data-category inventory

| Category | Typical data | Default class | Owner | Planning rule |
|---|---|---|---|---|
| User identity/access | name, work email, phone, role, assignments, session/audit | CONFIDENTIAL/RESTRICTED | administration/security | collect only employment/operational need; access lifecycle required |
| Customer/contact | names, phone, email, city, preferences, source | CONFIDENTIAL | sales/customer owner | purpose/source/consent or other approved basis recorded |
| Marketing preference | opt-in/out, channel, source, timestamp, proof | RESTRICTED evidence | marketing/privacy owner | withdrawal honored; no inferred consent |
| Property/project | descriptions, ownership/right evidence, restrictions, pricing | INTERNAL to RESTRICTED | inventory/project owner | publication requires approval/evidence |
| Tour/appointment | time, participants, location, notes, outcome | CONFIDENTIAL | operations/sales | note minimization; timezone and provider state explicit |
| Offer/negotiation | versions, prices, terms, approvals | CONFIDENTIAL/RESTRICTED | sales/approval owner | immutable accepted version and approval evidence |
| Contract/signature | parties, versions, terms, identity/signature evidence | RESTRICTED | contract authority | no invented template/authority; strong access and integrity |
| Finance | invoices, installments, payment/refund evidence, reconciliation | RESTRICTED | finance authority | no PAN/CVV; evidence and SoD controls |
| Communication/support | message content, metadata, attachments, ticket history | CONFIDENTIAL/RESTRICTED | communication/support owner | purpose, channel, provider, retention, search scope |
| Documents/files | metadata, versions, content, access events | classification inherited from content | record owner | malware/type/size/access/retention controls |
| Audit/security | actor, action, scope, reason, outcome, IP/device as approved | RESTRICTED | security/audit owner | tamper resistance and restricted access |
| Analytics/KPI | definitions, aggregates, snapshots, exports | INTERNAL to RESTRICTED | metric owner | lineage/freshness; minimize personal detail |
| AI | prompts, context manifest, outputs, review, vendor metadata | inherits highest source class | AI/data owner | external sharing disabled by default; human review |

## 6. Record of Processing Activities structure

Each processing activity record includes:

- activity ID and name;
- business purpose and owner;
- data-subject categories;
- personal-data categories;
- source;
- recipients and processors;
- transfer/storage locations;
- applicable contract/notice;
- retention class;
- security controls;
- rights-handling path;
- DPIA/assessment trigger;
- incident owner;
- approval status and evidence.

### Initial activity set

1. Internal user and access administration.
2. Customer/lead capture and relationship management.
3. Property matching and inventory operations.
4. Tours and appointment coordination.
5. Offers, reservations, negotiation, and approvals.
6. Contract preparation, review, evidence, and lifecycle.
7. Invoice/installment/payment-evidence/reconciliation operations.
8. Tasks, workflows, approvals, and escalation.
9. Customer communication and support.
10. Document and evidence management.
11. Reporting, KPI, exception detection, and controlled export.
12. Security logging, fraud/abuse detection, and incident response.
13. Backup, restore, continuity, and support access.
14. AI assistance only when separately approved and configured.

All are `PLANNING RECORDS`; actual legal basis, notices, retention, recipients, and transfers remain owner/legal evidence items.

## 7. Purpose limitation and minimization

- Do not collect identity, demographic, financial, behavioral, location, device, or communication data merely because a field exists.
- Free-text notes must warn against unnecessary sensitive content and have bounded access/retention.
- Reports and exports use the least detailed data required.
- Test, preview, support, and analytics environments use synthetic, masked, or specifically approved data.
- Logs exclude secrets and minimize personal content.
- AI context contains only explicitly allowed fields and records a context manifest.
- Provider payloads contain only fields required by the approved provider contract.

## 8. Rights-request workflow

The target workflow supports:

1. request intake and identity verification proportional to risk;
2. classification of the requested right/action;
3. search across authoritative systems, documents, logs, backups, and vendors as applicable;
4. legal/operational review and exceptions;
5. approval and tracked task ownership;
6. export/correction/restriction/deletion/anonymization action as approved;
7. vendor notification when required;
8. evidence package and completion communication;
9. audit without exposing unrelated personal data.

Exact statutory periods and exceptions require current owner/legal confirmation.

## 9. Retention and disposal model

### Retention states

- `ACTIVE_USE`
- `INACTIVE_RETAINED`
- `LEGAL_HOLD`
- `DISPOSAL_ELIGIBLE`
- `DISPOSAL_APPROVED`
- `ANONYMIZED`
- `DELETED_FROM_PRIMARY`
- `BACKUP_EXPIRY_PENDING`
- `DISPOSAL_VERIFIED`

### Retention classes requiring owner approval

| Class | Candidate records | Period status | Safe default |
|---|---|---|---|
| RET-USER | user/access/personnel-adjacent operational records | OWNER/LEGAL DECISION REQUIRED | retain; disable access on exit |
| RET-CRM | lead/customer/activity/consent | OWNER/LEGAL DECISION REQUIRED | retain with restricted archive; no irreversible purge |
| RET-COMM | messages/tickets/delivery metadata | OWNER/LEGAL/VENDOR DECISION REQUIRED | retain securely; provider retention unknown |
| RET-COMMERCIAL | offers/reservations/contracts | OWNER/LEGAL DECISION REQUIRED | retain immutable evidence |
| RET-FINANCE | invoices/payment/reconciliation/refund evidence | OWNER/FINANCE/LEGAL DECISION REQUIRED | retain immutable evidence |
| RET-DOC | documents/templates/evidence | classification-specific | retain; legal hold available |
| RET-AUDIT | security/business audit events | SECURITY/LEGAL DECISION REQUIRED | restricted retention; no silent deletion |
| RET-OPS | logs, metrics, backups, incident records | Z6 decision required | privacy-minimized and bounded when approved |
| RET-AI | prompts/context/output/review | OWNER/PRIVACY/VENDOR DECISION REQUIRED | external persistence disabled/minimized by default |

No automatic irreversible disposal is authorized until the schedule, legal holds, backup behavior, and evidence process are approved and tested.

## 10. Disposal and anonymization contract

- Disposal requires an approved eligible population, owner, reason, query/evidence, preflight, and rollback/forward-fix strategy.
- Legal hold overrides normal disposal.
- Referential integrity and financial/legal evidence are assessed before deletion.
- Anonymization must resist practical re-identification and preserve only approved analytical value.
- Primary deletion, search-index deletion, cache expiry, provider deletion, replica deletion, and backup expiry are tracked separately.
- User-facing deletion success is not claimed until the defined scope is completed or transparently qualified.
- Destructive actions never run automatically from this planning document.

## 11. Cross-border and vendor-transfer control

Before any provider receives personal data, record:

- provider and contracting entity;
- processing purpose and fields;
- locations and subprocessors;
- transfer classification and owner/legal assessment;
- DPA/SLA/security terms;
- encryption and access controls;
- retention/deletion/export/exit process;
- breach notification and audit rights;
- activation approval and review date.

Unknown location or transfer status remains `OWNER_EVIDENCE_REQUIRED`; the provider stays `NOT_CONFIGURED`.

## 12. Privacy-impact assessment triggers

Assessment is required before activation or material change involving:

- large-scale or high-impact personal data;
- identity/signature/financial evidence;
- systematic monitoring, scoring, or profiling;
- AI using personal or confidential company data;
- new cross-border processor or hosting location;
- combining datasets for new purposes;
- public publication or advertising workflows;
- automated decisions with legal, financial, contractual, or significant effect;
- new biometrics or highly sensitive categories, if ever proposed.

The safe default is not to implement or activate the new processing until assessment and approval are recorded.

## 13. Incident and breach data contract

Privacy/security incidents record:

- detection source/time;
- affected systems, fields, subjects, and volume estimate;
- confidentiality/integrity/availability impact;
- containment and evidence preservation;
- processor/vendor notifications;
- risk and notification assessment owner;
- actions, decisions, communications, and timing;
- recovery and recurrence prevention.

No report or log may include unnecessary exposed personal data or secrets.

## 14. Owner decisions required

1. Final controller/processor allocation and DPA.
2. Actual processing purposes and notices.
3. Retention periods and legal-hold policy.
4. Rights-request owner and approved procedures.
5. Hosting, storage, support, and provider locations.
6. Cross-border transfer assessments and safeguards.
7. Approved vendors/subprocessors.
8. AI data categories and vendor use.
9. Incident notification roles and legal escalation.
10. Marketing communication basis and consent policy.

## 15. Decision

```text
DATA CLASSIFICATION: DEFINED
CATALOG REQUIRED FIELDS: DEFINED
INITIAL PERSONAL-DATA INVENTORY: DEFINED
ROPA STRUCTURE / INITIAL ACTIVITIES: DEFINED
RIGHTS WORKFLOW: DEFINED
RETENTION STATES / CLASSES: DEFINED
RETENTION PERIODS: OWNER / LEGAL DECISION REQUIRED
CROSS-BORDER / VENDOR ACTIVATION: BLOCKED UNTIL EVIDENCE
PAN / CVV STORAGE: PROHIBITED
AUTOMATIC DISPOSAL: NOT AUTHORIZED
PRODUCTION ACTION: NONE
```
