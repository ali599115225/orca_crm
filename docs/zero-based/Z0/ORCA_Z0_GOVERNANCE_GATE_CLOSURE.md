# ORCA Z0 — Governance & Applicability Gate Closure

- **Document ID:** ORCA-Z0-GOV-001
- **Version:** 1.0
- **Date:** 2026-07-21
- **Status:** `PASS / CLOSED`
- **Repository:** `ali599115225/orca_crm`
- **Branch:** `work/orca-z0-governance-20260721`
- **Parent foundation SHA:** `863768a1b0ea25ee46531921e1a69e852d928f95`
- **Production action authorized:** `false`

## 1. Gate objective

Z0 fixes the governing product model, responsibility boundaries, provider and licensing policy, evidence hierarchy, regulatory applicability method, decision process, and risk policy before business discovery or implementation.

Z0 does not authorize Runtime, schema, migration, provider, environment, Production, or user-data changes.

## 2. Project charter decision

ORCA is an internal real-estate operating platform for one independent company.

| Topic | Controlling decision |
|---|---|
| Operating organization | One independent company |
| Users | Internal employees, agents, managers, accountants, and operational users |
| Current commercial model | Internal company platform |
| Multi-company SaaS | `OUT_OF_SCOPE` |
| Technical provider | Developer and service provider; not the real-estate operator |
| Business operator | Company owner |
| Production authorization | Owner-only, separately granted |
| Data/security partition | Retain `tenantId` temporarily as the company boundary |

The current code may contain historical SaaS or multi-tenant structures. Those structures do not define the target product and must be classified in Z7 before adaptation, retirement, or removal.

## 3. Responsibility boundary

| Responsibility | Company owner | Technical provider |
|---|:---:|:---:|
| Real-estate activity and business operation | Accountable | Not accountable |
| Regulatory and commercial licenses | Accountable | Technical controls only |
| Provider selection and contracts | Accountable | Advises and implements adapter |
| Provider subscription fees | Accountable | Not accountable |
| Production credentials and secrets | Owns/provides | Stores and uses only under approved controls |
| Product architecture and code | Approves material owner choices | Responsible |
| RBAC and security design | Approves business authority model | Responsible |
| Data controller role | Presumptive controller, subject to contract | Processor only to the extent contractually instructed |
| Production release | Explicit approval required | Executes only after approval |
| Incident business communications | Accountable | Technical support and evidence |

A Data Processing Agreement, final Controller/Processor allocation, and support terms remain required owner/legal artifacts before Production activation.

## 4. Integration policy

1. Provider accounts, subscriptions, sender identities, payment merchant accounts, domains, numbers, and licenses belong to the company owner.
2. The technical provider supplies provider-agnostic interfaces, adapters, validation, webhook verification, idempotency, replay protection, audit records, error mapping, Mock/Sandbox tests, and activation runbooks.
3. `NOT_CONFIGURED` is valid when the feature fails safely, does not generate false success, and does not block unrelated platform functions.
4. No fallback may use a developer-owned account, phone number, email identity, API key, or paid subscription.
5. No actual email, WhatsApp, SMS, payment, refund, upload, signature, or advertisement activation may occur without separate explicit authorization.
6. Secrets must never be committed, reported, logged, or placed in screenshots.
7. Every provider requires a Vendor/Subprocessor record, data-flow description, processing location, DPA/SLA review, exit/export process, and named owner before Production activation.

## 5. Licensing policy

- No license or approval is assumed without official evidence.
- Every regulated capability is classified as `APPLICABLE`, `CONDITIONAL`, `NOT_APPLICABLE`, or `OWNER_EVIDENCE_REQUIRED`.
- A capability that requires a license remains disabled or safely limited until evidence is registered.
- ORCA may prepare technical fields, workflows, adapters, and validation for a regulated process without claiming the company is licensed.
- Legal applicability is decided by the company owner and qualified adviser; ORCA converts the approved decision into technical controls.

## 6. Initial regulatory applicability matrix

| Reference | Initial classification | Z0 control |
|---|---|---|
| Saudi Personal Data Protection Law and Implementing Regulations | `APPLICABLE / OWNER LEGAL CONFIRMATION` | Data inventory, purpose limitation, minimization, rights workflow, retention, breach response, security, controller/processor contract |
| Personal-data transfer outside the Kingdom | `CONDITIONAL` | Provider location and transfer assessment before activation |
| Real Estate Brokerage Law and Implementing Regulations | `OWNER_EVIDENCE_REQUIRED` | Confirm company activities and licenses; prevent unsupported license/advertisement claims |
| Real-estate advertisement licensing | `CONDITIONAL` | Require license evidence/identifier when advertising is in Release 1 |
| Electronic Transactions requirements | `CONDITIONAL` | Apply when electronic signatures or evidentiary electronic records are used |
| ZATCA e-invoicing requirements | `CONDITIONAL` | Determine taxpayer status and wave; no unsupported compliance claim |
| NCA private-sector cybersecurity controls | `APPLICABILITY_ASSESSMENT_REQUIRED` | Use as Saudi security baseline where applicable |
| PCI DSS | `CONDITIONAL` | Minimize scope through hosted checkout/tokenization; never store PAN or sensitive authentication data |

This matrix is a planning control, not a legal opinion.

## 7. Current official references recorded

- Saudi Data and AI Authority / Data Governance Platform: Personal Data Protection Law, Implementing Regulations, Controller/Processor guidance, and cross-border transfer regulation.
- Official Gazette (Umm Al-Qura): Personal Data Protection Law and Implementing Regulations.
- Real Estate General Authority: active Real Estate Brokerage Law and active Implementing Regulations.
- National Cybersecurity Authority: private-sector non-critical infrastructure controls published 28 December 2025 and Essential Cybersecurity Controls ECC 2-2024 page updated 19 July 2026.
- ZATCA: simplified e-invoicing technical guide updated 5 March 2026 and technical/security specifications.
- NIST: SP 800-218 SSDF 1.1 final.
- W3C: WCAG 2.2 Recommendation, current published Recommendation dated 12 December 2024.

## 8. Evidence hierarchy

When sources conflict, use this order:

1. Owner's fixed operating-model decisions and explicit high-risk approvals.
2. Approved zero-based plan and this Z0 closure.
3. Current executable source.
4. Current blocking CI, security, test, build, and provider evidence.
5. Current architecture records and stage ledgers.
6. Foundation closure evidence.
7. Historical reports and screenshots as supporting evidence only.

The code proves what exists; it does not override the target operating model.

## 9. Decision policy

Every material decision must record:

- ID and title;
- owner and approver;
- source and rationale;
- alternatives considered;
- security, data, operational, financial, and regulatory effects;
- status and effective date;
- dependencies;
- rollback or supersession path;
- evidence references.

Decisions that only the owner can make are labeled `OWNER_DECISION_REQUIRED`. Work that does not depend on the decision continues using the documented safe default.

## 10. Risk policy

Risks are assessed by likelihood and impact across confidentiality, integrity, availability, legal/regulatory exposure, financial impact, operational continuity, and user harm.

- Critical and High risks require an owner, treatment, evidence target, and review date.
- A risk cannot be closed by renaming or weakening a test.
- Accepted residual risk requires an explicit owner record.
- Unknown provider, license, Production, and legal facts remain `NOT_PROVEN` or `OWNER_EVIDENCE_REQUIRED`.
- Destructive and Production actions remain gated independently from general technical authority.

## 11. Owner decisions carried forward

| Decision | Safe default until decided |
|---|---|
| Exact real-estate activities and services | Disable regulated paths not proven necessary/licensed |
| Legal entity, size, branches, and organization | Use editable reference organization model in Z1 |
| Existing licenses and official evidence | Assume none |
| Release 1 commercial scope | Recommend minimum internal operational spine; finalize in Z1 |
| Hosting regions and permitted processors | No new provider activation or data transfer |
| Retention periods | Preserve data; prohibit irreversible disposal until schedule approved |
| RTO, RPO, MTPD, and availability targets | Produce conservative proposals in Z6; do not claim achieved targets |
| Financial and contract approval limits | Deny unapproved high-risk actions; propose SoD model in Z1/Z2 |
| Official contracts, invoices, and templates | Do not invent legal forms |
| Paid providers and budget | Keep integrations `NOT_CONFIGURED` |
| AI usage policy | No autonomous financial, contractual, or legal decisions; no external data sharing by default |
| Production release | Not authorized |

## 12. Z0 acceptance evidence

- GitHub repository access and admin permission verified.
- `main` SHA verified.
- Closed foundation branch and SHA verified.
- Zero-based central and Z0 branches created without force.
- Owner-supplied master plan, audit, and foundation achievement report reviewed.
- Repository project charter, integration policy, central report, and stage ledger reviewed.
- Single-company model and provider ownership agree across controlling sources.
- Current official regulatory and standards sources reviewed for planning applicability.
- No Runtime, database, Production, provider, secret, domain, or user-data change performed.

## 13. Gate decision

```text
Z0 GOVERNANCE & APPLICABILITY: PASS / CLOSED
SINGLE-COMPANY MODEL: APPROVED
RESPONSIBILITY BOUNDARY: APPROVED
INTEGRATION POLICY: APPROVED
LICENSE POLICY: APPROVED
EVIDENCE POLICY: APPROVED
DECISION AND RISK POLICY: APPROVED
OWNER DECISIONS: REGISTERED WITH SAFE DEFAULTS
RUNTIME CHANGE: NONE
DATABASE CHANGE: NONE
PRODUCTION ACTION: NONE
NEXT AUTHORIZED GATE: Z1 — BUSINESS DISCOVERY
```
