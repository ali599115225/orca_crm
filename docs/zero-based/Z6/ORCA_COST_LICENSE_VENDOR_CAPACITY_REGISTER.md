# ORCA Z6 — Cost, License, Vendor, and Capacity Register

- **Document ID:** ORCA-Z6-COST-001
- **Version:** 0.9 — Stacked Planning Candidate
- **Date:** 2026-07-22
- **Status:** `REGISTER MODEL COMPLETE / OWNER BUDGET AND VENDORS REQUIRED`
- **Production action authorized:** `false`

## 1. Purpose

Ensure every external service, license, environment and capacity assumption has an owner, cost boundary and exit plan. No paid service or subscription is authorized by this document.

## 2. Register fields

For each item record:

- category and service/vendor;
- company account owner and billing owner;
- purpose and dependent capability;
- environment usage;
- data exchanged, classification and processing location;
- license/subscription model and renewal date;
- fixed, variable and threshold cost drivers;
- included limits, quotas and rate limits;
- expected Release 1 volume and growth assumption;
- alert and spend cap;
- SLA/support terms and DPA/subprocessors where applicable;
- portability/export and exit procedure;
- replacement/fallback and `NOT_CONFIGURED` behavior;
- approval/evidence status.

## 3. Cost categories

| Category | Examples | Default status |
|---|---|---|
| Hosting/build/runtime | preview, staging, Production compute | OWNER_SELECTION_REQUIRED |
| Database | managed PostgreSQL, backups, replicas | OWNER_SELECTION_REQUIRED |
| Object storage/scanning | documents, signed URLs, malware scan | OWNER_SELECTION_REQUIRED |
| Email/WhatsApp/SMS | provider accounts and usage | NOT_CONFIGURED |
| Payment/signature | hosted payment, signing provider | NOT_CONFIGURED / CONDITIONAL |
| Monitoring/security | logs, traces, alerts, scanning | OWNER_SELECTION_REQUIRED |
| AI models | inference, embeddings, moderation | NOT_CONFIGURED |
| Domain/DNS/certificates | company domain and identity | OWNER_EVIDENCE_REQUIRED |
| Compliance/legal | templates, adviser, assessment | OWNER_BUDGET_REQUIRED |
| Support/training | handover, warranty, maintenance | CONTRACT_DECISION_REQUIRED |

## 4. Capacity drivers

- active and concurrent users;
- customers/leads and activity history;
- properties, units, projects and commitments;
- offers, contracts, versions and audit events;
- invoices, installments, evidence and reconciliation records;
- document count, size, versions and download traffic;
- message volume, templates and provider callbacks;
- job frequency, queue depth and retention;
- logs/metrics/traces and evidence retention;
- AI request context size and output volume.

No capacity number is inferred from the current repository alone; owner forecast and representative measurement are required.

## 5. Spend controls

- company-owned billing account;
- monthly budget and per-provider cap;
- threshold alerts before hard limit;
- rate/quota behavior tested as a failure state;
- no automatic paid upgrade without owner approval;
- preview/CI build consumption controlled through batching and one meaningful commit per gate;
- unused environments/providers disabled;
- invoice and usage reconciliation;
- renewal and exit decision before auto-renewal.

## 6. Current external limitation evidence

The July 2026 Vercel free-plan daily deployment limit demonstrates why quota/capacity controls are operational requirements. It is treated as an external constraint, not as authority to bypass required checks or purchase an upgrade.

## 7. Owner decisions

| Decision | Status | Safe default |
|---|---|---|
| operating budget | OWNER_DECISION_REQUIRED | no new paid commitment |
| hosting/database/storage vendors | OWNER_DECISION_REQUIRED | retain current non-Production evidence only |
| provider accounts | OWNER_DECISION_REQUIRED | `NOT_CONFIGURED` |
| data/process locations | OWNER_DECISION_REQUIRED | no new transfer/processor |
| monitoring/security tools | OWNER_DECISION_REQUIRED | define contract; no achieved claim |
| support/warranty model | OWNER_DECISION_REQUIRED | no 24/7 or unlimited support promise |

## 8. Current result

```text
REGISTER FIELDS: DEFINED
COST CATEGORIES: 10
CAPACITY DRIVERS: DEFINED
SPEND CONTROLS: DEFINED
NAMED PAID VENDORS APPROVED: 0
BUDGET APPROVED: NO
PRODUCTION ACTION: NONE
```
