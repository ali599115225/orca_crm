# ORCA — Prioritized Owner Decision Package

- **Document ID:** ORCA-OWNER-DECISIONS-001
- **Version:** 1.0 — Unpublished stacked preparation
- **Date:** 2026-07-22
- **Status:** `DECISIONS ORGANIZED / NO IMPLIED APPROVAL`
- **Production action authorized:** `false`

## 1. Purpose

Consolidate decisions that must ultimately come from the company owner, while allowing planning to continue with safe defaults. No blank or proposed value is treated as approved.

## 2. Decision timing groups

### Group A — required before closing target planning

| ID | Decision | Why it matters | Safe default until approved |
|---|---|---|---|
| OWN-A01 | exact licensed real-estate activities and business model | determines scope, documents and compliance applicability | no unsupported activity claim |
| OWN-A02 | legal entity, company size and operating structure | fixes organization, ownership and accountability | single independent company baseline |
| OWN-A03 | actual branches, departments, teams and final personas | finalizes RBAC and operational workflows | proposed reference model only |
| OWN-A04 | Release 1 in/out/conditional scope | controls execution backlog | no expansion beyond approved baseline |
| OWN-A05 | global shell and individual page/tab/overlay visual references | authorizes UI implementation | no page-level implementation |
| OWN-A06 | financial, contract, refund, settlement, export and manual-evidence limits | enables SoD and approval rules | prohibit unsupported approval/finalization |
| OWN-A07 | official contract/invoice/document templates and signatories | fixes legal/document output | no official-template claim |
| OWN-A08 | AI permitted use, data classes and prohibited actions | bounds AI design and providers | assistive only; no irreversible action |

### Group B — required before provider/environment setup

| ID | Decision | Why it matters | Safe default until approved |
|---|---|---|---|
| OWN-B01 | hosting, database, storage and processing locations | privacy, continuity, cost and architecture | no new provider/location |
| OWN-B02 | controller/processor relationships, DPA and subprocessors | lawful and contractual processing | provider remains `NOT_CONFIGURED` |
| OWN-B03 | email/WhatsApp/SMS/payment/signature/AI providers and company accounts | integration ownership and failure behavior | `NOT_CONFIGURED` |
| OWN-B04 | operating budget, spend caps and paid subscription authority | prevents unintended commitment | no paid upgrade/purchase |
| OWN-B05 | monitoring/security/file-scanning tools | determines telemetry/data flow and controls | contract only; no achieved claim |
| OWN-B06 | Production account recovery, emergency delegate and ownership evidence | mitigates key-person risk | no Production readiness claim |

### Group C — required before security/operations closure

| ID | Decision | Why it matters | Safe default until approved |
|---|---|---|---|
| OWN-C01 | retention, legal hold, deletion and backup expiry schedule | controls records and privacy | preserve; avoid irreversible deletion |
| OWN-C02 | NCA applicability and final ASVS assurance target | fixes security verification depth | preliminary ASVS L2 planning target |
| OWN-C03 | vulnerability remediation and risk-acceptance SLA | controls release blocking and escalation | no implicit P0/P1 acceptance |
| OWN-C04 | performance, capacity, browsers and upload/export limits | makes NFRs testable | no numeric readiness claim |
| OWN-C05 | service tiers, MTPD, RTO, RPO, SLO and error budgets | continuity commitments | measure first; no promise |
| OWN-C06 | incident authority, notification path and support hours | enables incident/operating model | owner escalation; no 24/7 promise |
| OWN-C07 | access-review frequency and break-glass policy | closes privileged-access governance | no standing hidden elevation |

### Group D — required before UAT, handover and release

| ID | Decision | Why it matters | Safe default until approved |
|---|---|---|---|
| OWN-D01 | named UAT users, signers and acceptance authority | validates business outcome | no UAT acceptance |
| OWN-D02 | training audiences, schedule and completion evidence | enables company operation | handover incomplete |
| OWN-D03 | warranty, support, maintenance and transition terms | prevents implied unlimited responsibility | no implied support promise |
| OWN-D04 | accepted risks, deferred gaps and expiry dates | records residual exposure | remain blocking when P0/P1 |
| OWN-D05 | `main` merge authorization for exact PR/SHA | controls release integration | `false` |
| OWN-D06 | migration/data/provider/secret authorization | separates high-risk changes | `false` |
| OWN-D07 | Production release authorization for exact artifact/environment | final release authority | `false` |

## 3. Decision-record schema

Every approval must include:

- decision ID and exact selected value;
- scope and exclusions;
- effective date and review/expiry date;
- accountable owner and consulted specialist where applicable;
- evidence/contract/reference;
- affected requirements, pages, providers or execution packages;
- safe rollback or revocation behavior;
- explicit statement when `main` or Production authority remains false.

## 4. Rules

- Silence is not approval.
- A suggested default is not an owner decision.
- Approval for planning is not approval for purchase, provider activation, migration, `main` or Production.
- Decisions may be made progressively at the latest safe gate; they do not all need to block current documentation preparation.
- Legal/regulatory conclusions require qualified evidence or adviser input when applicable.

## 5. Current result

```text
OWNER DECISIONS ORGANIZED: 29
APPROVED BY THIS DOCUMENT: 0
SAFE DEFAULTS DEFINED: YES
MAIN MERGE AUTHORIZED: NO
PRODUCTION ACTION AUTHORIZED: NO
```
