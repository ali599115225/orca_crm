# ORCA Z1 — Release 1 Scope Register

- **Document ID:** ORCA-Z1-SCOPE-001
- **Version:** 1.0
- **Date:** 2026-07-21
- **Status:** `RECOMMENDED BASELINE / OWNER DECISION REQUIRED`
- **Operating model:** `SINGLE INDEPENDENT COMPANY`
- **Production action authorized:** `false`

## 1. Release objective

Release 1 should provide a minimum lovable internal operating spine for one real-estate company. It should allow authorized employees to manage the full customer-to-contract-to-financial-record lifecycle with traceable work, documents, audit, and safe provider states.

Release 1 is not a public SaaS launch, not a provider-account bundle, not an autonomous AI product, and not an authorization to deploy to Production.

## 2. Scope rules

1. Include only capabilities necessary for the internal operating spine or its safety.
2. Preserve verified existing work when it matches the zero-based target.
3. Do not activate regulated or provider-dependent functions without owner evidence and approval.
4. `NOT_CONFIGURED` is accepted for external channels and providers.
5. No card data or sensitive authentication data is stored.
6. No final legal template, license claim, or compliance status is invented.
7. Every included capability must have acceptance criteria, permissions, audit, and tests before execution authorization in Z8.

## 3. Recommended Release 1 outcomes

| Outcome ID | Outcome | Success condition proposal |
|---|---|---|
| R1-O01 | Controlled internal access | Active users can perform only authorized actions within company and organizational scope |
| R1-O02 | Trusted customer pipeline | Leads are deduplicated, assigned, progressed, audited, and closed with a reason |
| R1-O03 | Trusted property/project inventory | Properties, projects, and units have controlled status, availability, pricing source, and evidence state |
| R1-O04 | Traceable tours and follow-up | Appointments have owner, status, result, conflict rules, and follow-up |
| R1-O05 | Versioned offers and reservations | Offers are immutable by version, approved where required, and cannot double-book inventory |
| R1-O06 | Controlled contract lifecycle | Contracts use approved templates, parties, versions, approvals, and activation evidence |
| R1-O07 | Auditable financial obligations | Invoices, installments, payment evidence, reconciliation, settlements, and exceptions are traceable |
| R1-O08 | Accountable tasks and approvals | Work has owner, due date, state, evidence, escalation, and approval separation |
| R1-O09 | Secure documents and communication records | Files and conversations are access-controlled, retained, and linked to business context |
| R1-O10 | Management insight | Core operational KPIs have defined source, freshness, filters, and export controls |
| R1-O11 | Safe integrations | Adapters and webhooks are testable while remaining `NOT_CONFIGURED` until approved activation |
| R1-O12 | Recoverable operation | CI, health, monitoring, backup/restore evidence, incident, and rollback contracts are defined and verified |

## 4. In-scope capability register

| Scope ID | Capability | Release 1 disposition | Notes |
|---|---|---|---|
| R1-IN-01 | Authentication, active-user checks, session security | `IN` | Required for all internal operation |
| R1-IN-02 | Organization assignments, RBAC, scopes, delegation controls | `IN` | Final business mappings remain owner-approved |
| R1-IN-03 | Lead/customer capture, deduplication, assignment, lifecycle, archive | `IN` | Marketing consent and purpose controls included where applicable |
| R1-IN-04 | Property and inventory records | `IN` | Evidence/readiness states included; public publication not assumed |
| R1-IN-05 | Projects, phases, buildings, units, availability | `IN` | Regulated project activities remain conditional |
| R1-IN-06 | Tours and appointments | `IN` | Internal scheduling works without external calendar provider |
| R1-IN-07 | Offers, counters, approvals, expiry, reservation | `IN` | Approval thresholds owner decision |
| R1-IN-08 | Contracts, versions, approvals, activation, amendment, termination | `IN` | Official templates/signatory policy owner evidence required |
| R1-IN-09 | Invoices, installments, receipts, payment evidence, reconciliation | `IN` | Record system only; no card storage or implied payment gateway |
| R1-IN-10 | Settlement/refund request workflow | `IN — CONTROLLED` | Request and evidence path; actual refund remains provider/owner action |
| R1-IN-11 | Tasks, workflow, approvals, escalation | `IN` | System retries/dead-letter defined in later gates |
| R1-IN-12 | Documents, templates metadata, secure file access | `IN` | Legal forms and final retention owner decisions |
| R1-IN-13 | Email/WhatsApp/SMS conversation model and provider states | `IN — INTEGRATION READY` | Actual sending/provider activation excluded until approval |
| R1-IN-14 | Customer support/ticket workflow | `IN` | Internal record and assignment path |
| R1-IN-15 | Core operational reports and dashboards | `IN` | KPI definitions and access controls required |
| R1-IN-16 | AI summarization/recommendation support | `IN — LIMITED` | Human review, no autonomous legal/financial/contract decisions |
| R1-IN-17 | Audit logging, privacy inventory, access evidence | `IN` | Minimum Release 1 safety requirement |
| R1-IN-18 | CI, Preview, Staging readiness, health, backup/restore, rollback | `IN` | Production execution separately gated |
| R1-IN-19 | Arabic/RTL, Light/Dark, responsive, keyboard/focus, WCAG 2.2 AA | `IN` | Applies to every Release 1 page contract |
| R1-IN-20 | Training, UAT, operating manuals, handover evidence | `IN` | Required before owner release decision |

## 5. Explicitly out of scope for Release 1

| Scope ID | Capability | Disposition | Reason |
|---|---|---|---|
| R1-OUT-01 | Multi-company SaaS registration and tenant self-service | `OUT_OF_SCOPE` | Conflicts with fixed operating model |
| R1-OUT-02 | Subscription plans, add-ons, trials, tenant billing | `OUT_OF_SCOPE` | Legacy SaaS commercial model |
| R1-OUT-03 | Public marketplace or public customer portal | `OUT_OF_SCOPE` | Not required for internal operating spine |
| R1-OUT-04 | Developer-owned provider accounts or sender identities | `PROHIBITED` | Ownership and security boundary |
| R1-OUT-05 | Storage of PAN, CVV, or sensitive card authentication data | `PROHIBITED` | Payment-scope minimization |
| R1-OUT-06 | Autonomous contract, legal, financial, pricing, or refund decisions | `PROHIBITED` | Human authority and AI governance |
| R1-OUT-07 | Unsupported claims of REGA, ZATCA, NCA, PCI, or other compliance | `PROHIBITED` | Evidence and applicability required |
| R1-OUT-08 | Automatic Production deployment, migration, backfill, or provider activation | `PROHIBITED` | Separate owner approval required |
| R1-OUT-09 | Destructive removal of legacy tenant/SaaS structures | `OUT_OF_SCOPE FOR R1 EXECUTION` | Z7 classification and transition plan required |
| R1-OUT-10 | Unbounded custom BI/data warehouse program | `DEFER` | Core operational reporting first |

## 6. Conditional scope

| Conditional ID | Capability | Entry condition | Safe default |
|---|---|---|---|
| R1-C01 | Real-estate advertising activation | Activity, license, advertisement evidence, provider, and owner approval | Disabled / preparation only |
| R1-C02 | Electronic signature provider | Approved legal process, vendor, contract, identity/evidence design | Manual/offline evidence workflow |
| R1-C03 | ZATCA integration | Taxpayer status, wave applicability, official credentials, tested adapter | Internal invoice records; no compliance claim |
| R1-C04 | Online payment collection | Approved merchant/provider, hosted checkout/tokenization, PCI scope assessment | Record obligations and external evidence only |
| R1-C05 | WhatsApp/SMS/email actual sending | Company-owned account, template/consent rules, secrets, sandbox and activation approval | `NOT_CONFIGURED` |
| R1-C06 | External file storage | Vendor/subprocessor review, location, DPA, encryption, exit plan | Approved local/current storage path only |
| R1-C07 | External AI model use | Owner AI policy, vendor/data review, allowed fields, retention, kill switch | Local/no-external-data mode |
| R1-C08 | External calendar/maps | Provider approval, privacy assessment, idempotency, failure handling | Internal scheduling and text location |

## 7. Release 1 user groups

Recommended initial user groups:

1. Company owner/executive sponsor.
2. Operations manager.
3. Sales manager.
4. Sales agent.
5. Inventory/project operator.
6. Contract operator.
7. Finance operator.
8. Customer support operator.
9. Platform administrator.
10. Auditor/read-only reviewer.

The owner may combine groups for a small company, but the permission model must preserve segregation controls and auditable compensating approvals.

## 8. Release 1 acceptance framework

A capability cannot be marked Release 1 ready unless all applicable items are `VERIFIED`:

- business owner and responsible actor;
- requirement IDs and acceptance criteria;
- domain states and transitions;
- permission and negative-access tests;
- data ownership/classification/retention state;
- API/action/event contract where applicable;
- failure, empty, loading, success, retry, and audit states;
- direct functional tests;
- security and privacy controls;
- Arabic/RTL and accessibility contract for user interfaces;
- operational monitoring and rollback/recovery evidence;
- no unresolved P0/P1 issue;
- owner evidence for conditional regulated/provider capability;
- no Production action implied by readiness.

## 9. Minimum lovable release sequence proposal

```text
Wave A — Safety and access foundation
  Identity + active-user checks + RBAC + audit + organization scopes

Wave B — Operating spine
  Leads + inventory/projects + tours + tasks

Wave C — Commercial transaction spine
  Offers + reservation + contracts + invoices/installments/payment records

Wave D — Supporting operation
  Documents + support + communication records + reporting

Wave E — Controlled integrations and AI assistance
  Provider adapters + sandbox/mock + limited human-reviewed AI

Wave F — Staging, UAT, training, recovery, and owner release evidence
```

This sequence is a Z1 planning proposal only. Z8 will convert it into executable work packages after all gates and the current-system gap analysis.

## 10. Owner decisions required

| Decision ID | Decision | Recommended safe default |
|---|---|---|
| ODR-Z1-S01 | Confirm actual Release 1 business activities | Use internal customer-to-contract operating spine only |
| ODR-Z1-S02 | Confirm whether projects, rentals, sales, or property management are active | Keep domain models planned; disable unconfirmed regulated actions |
| ODR-Z1-S03 | Confirm user groups and initial rollout population | Minimum named internal users; no public access |
| ODR-Z1-S04 | Confirm financial and contract approval limits | Owner approval for high-risk actions |
| ODR-Z1-S05 | Confirm official templates and signatories | No invented legal form or signatory |
| ODR-Z1-S06 | Confirm paid providers and budget | Keep provider features `NOT_CONFIGURED` |
| ODR-Z1-S07 | Confirm hosting/data-location preferences | No new processor or cross-border transfer |
| ODR-Z1-S08 | Confirm Production launch authorization | Not authorized |

## 11. Z1 scope decision

```text
RECOMMENDED RELEASE 1: DEFINED
IN-SCOPE CAPABILITIES: 20
EXPLICIT OUT/PROHIBITED/DEFERRED ITEMS: 10
CONDITIONAL CAPABILITIES: 8
OWNER FINAL APPROVAL: REQUIRED
BUILD AUTHORIZED BY THIS DOCUMENT: NO
RUNTIME CHANGE: NONE
DATABASE CHANGE: NONE
PRODUCTION ACTION: NONE
```
