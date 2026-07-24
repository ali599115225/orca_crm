# ORCA Z2 — Domain Contract Gate Closure

- **Document ID:** ORCA-Z2-CLOSE-001
- **Version:** 1.1 — Clean Publication Reconciliation
- **Date:** 2026-07-24
- **Status:** `PASS / CLOSED IN STAGE — CENTRAL MERGE REQUIRES FINAL Z2 GREEN CHECKS`
- **Repository:** `ali599115225/orca_crm`
- **Branch:** `work/orca-z2-domain-contracts-clean-20260724`
- **Parent central SHA after Z1 closure:** `8bef279d2a32b8b054d43f3905a8860dbf0aba6e`
- **Z1 closure:** `PR #75 / merged as 8bef279d2a32b8b054d43f3905a8860dbf0aba6e`
- **Publication scope:** `8 approved source files + 1 fresh Ledger = 9 files`
- **Production action authorized:** `false`

## 1. Gate objective

Z2 converts the Z1 capability and process map into explicit target-domain contracts before product pages, data models, APIs, or implementation are authorized.

For each required business area, Z2 defines:

- entities and aggregate boundaries;
- lifecycle states;
- transitions and preconditions;
- authority and scope;
- inputs and outputs;
- business invariants;
- failure/recovery behavior;
- audit evidence;
- acceptance and direct test classes.

Z2 does not claim that the current repository implements these contracts. Current-system conformance remains a Z7 responsibility.

## 2. Evidence package

| Evidence | Scope | Result |
|---|---|---|
| `ORCA_DOMAIN_CONTRACT_REGISTRY.md` | 11 domain boundaries, common command/error/audit/event contracts, cross-domain invariants | PASS |
| `ORCA_CUSTOMER_INVENTORY_PROJECT_TOUR_CONTRACTS.md` | DOM-01 customer/opportunity, DOM-02 inventory, DOM-03 projects/units, DOM-04 tours | PASS |
| `ORCA_OFFER_CONTRACT_FINANCE_CONTRACTS.md` | DOM-05 offers/reservations, DOM-06 contracts, DOM-07 finance/settlement/refunds | PASS |
| `ORCA_WORKFLOW_COMMUNICATION_DOCUMENT_AI_CONTRACTS.md` | DOM-08 workflow, DOM-09 communication/support, DOM-10 documents, DOM-11 reporting/AI | PASS |
| `ORCA_REQUIREMENTS_TRACEABILITY_MATRIX.md` v1.1 | 30 Z2 functional requirements linked to domain evidence | PASS |
| `ORCA_Z2_INDEPENDENT_DOMAIN_CONTRACT_REVIEW_ADDENDUM.md` | 10 independent domain clarifications | PASS |
| `ORCA_Z2_REVIEW_REQUIREMENTS_SUPPLEMENT.md` | 10 supplemental requirements; 3 owner-policy items remain open | PASS |

## 3. Domain coverage

| Domain | State machine | Authority | Failure/recovery | Audit | Acceptance tests |
|---|:---:|:---:|:---:|:---:|:---:|
| Customer, lead, opportunity | Yes | Yes | Yes | Yes | Yes |
| Property and inventory | Yes | Yes | Yes | Yes | Yes |
| Projects, phases, buildings, units | Yes | Yes | Yes | Yes | Yes |
| Tours and appointments | Yes | Yes | Yes | Yes | Yes |
| Offers, negotiation, reservation | Yes | Yes | Yes | Yes | Yes |
| Contracts and deal lifecycle | Yes | Yes | Yes | Yes | Yes |
| Invoices, installments, payment evidence, reconciliation, settlement/refunds | Yes | Yes | Yes | Yes | Yes |
| Tasks, workflows, approvals | Yes | Yes | Yes | Yes | Yes |
| Communications and support | Yes | Yes | Yes | Yes | Yes |
| Documents, files, templates, evidence | Yes | Yes | Yes | Yes | Yes |
| Reporting, analytics, AI assistance | Yes | Yes | Yes | Yes | Yes |

## 4. Material contract decisions

1. Customer identity and lead acquisition are separated; duplicate merge preserves full history.
2. `WON`, `PAID`, `SIGNED`, `DELIVERED`, `PUBLISHED`, and similar states require authoritative evidence rather than a browser assertion.
3. Inventory commitments are transactionally protected against conflict.
4. Issued offers and final contract/document versions are immutable by version.
5. Approval is tied to exact subject version and delegated authority.
6. Contract activation is idempotent and cannot duplicate inventory or financial obligations.
7. Payment evidence must be verified before allocation, paid, reconciliation, or refund progression.
8. Financial corrections use append-only reversal/adjustment evidence rather than destructive edits.
9. Workflow orchestration cannot bypass target-domain rules.
10. Provider delivery/signature/payment/publication truth remains separate from internal request state.
11. `NOT_CONFIGURED` preserves safe internal workflows and prevents false external success.
12. Files are quarantined/scanned/versioned/access-controlled with legal hold and approved disposition.
13. KPIs expose definition/source/as-of/freshness/scope.
14. AI is advisory, input-minimized, human-reviewed, provider-gated, and kill-switch controlled.
15. Archive is not irreversible deletion; retention remains owner/legal decision.

## 5. Human authority retained

Owner decisions are still required for:

- exact active real-estate activities and licensing applicability;
- financial discount/refund/write-off/settlement thresholds;
- contract approvers, signatories, templates, and evidence process;
- manual payment-evidence verification authority;
- marketing consent/purpose policy details;
- providers, processing locations, budget, and activation;
- retention/disposition periods;
- AI allowed use cases and fields;
- Production release.

Safe defaults continue: deny unproven high-risk action, keep providers `NOT_CONFIGURED`, preserve records, and require owner approval for high-risk decisions.

## 6. Traceability result

The central matrix now contains:

- 20 business requirements;
- 10 non-functional requirements;
- 30 Z2 functional requirements;
- direct mapping from each Z2 functional range to its domain contract evidence.

Z3 must map these contracts to pages, routes, tabs, forms, states, and accessibility acceptance. Z4 must map them to data, transactions, APIs/actions/events/jobs, and integrations. Z5 must convert acceptance classes into blocking security/quality tests.

## 7. Safety and repository state

- No Runtime source changed.
- No Prisma/schema/migration changed.
- No Production data/provider/environment/secret/domain changed.
- No `main` merge or Production action occurred.
- Z1 is closed and merged into the zero-based central branch as `8bef279d2a32b8b054d43f3905a8860dbf0aba6e` with final-head ORCA CI and Vercel success.
- This clean publication contains exactly nine files and does not inherit the historical Ledger, the Vercel incident report, or any Z3–Z8 artifact.
- Supplemental requirements Z2R-003, Z2R-004, and Z2R-006 remain owner-policy decisions; publication does not approve them.
- Z2 central merge is prohibited until ORCA CI and Vercel are green on this exact final Z2 head.

## 8. Clean publication reconciliation

- Actual post-Z1 central parent: `8bef279d2a32b8b054d43f3905a8860dbf0aba6e`.
- Z1 status: closed and centrally merged.
- Z2 publication set: nine files exactly.
- Original Z2 functional requirements: 30.
- Independent review requirements: 10.
- Owner-policy requirements still unapproved: 3 (`Z2R-003`, `Z2R-004`, `Z2R-006`).
- Current-system implementation conformance remains unassessed until Z7.

## 9. Gate decision

```text
Z2 DOMAIN CONTRACTS: PASS / CLOSED IN STAGE
DOMAIN BOUNDARIES: 11 / COMPLETE
STATE MACHINES: COMPLETE
AUTHORITY AND INVARIANTS: COMPLETE
FAILURE/RECOVERY CONTRACTS: COMPLETE
AUDIT CONTRACTS: COMPLETE
Z2 FUNCTIONAL REQUIREMENTS: 30
INDEPENDENT REVIEW REQUIREMENTS: 10
OWNER-POLICY REQUIREMENTS OPEN: 3
CLEAN PUBLICATION FILES: 9
CURRENT-SYSTEM CONFORMANCE: NOT ASSESSED UNTIL Z7
BUILD AUTHORIZATION: NO
RUNTIME CHANGE: NONE
DATABASE CHANGE: NONE
MAIN MERGE: NOT AUTHORIZED / NOT PERFORMED
PRODUCTION ACTION: NONE
CENTRAL MERGE CONDITION: ORCA CI + VERCEL PASS ON THE SAME FINAL Z2 HEAD
NEXT AUTHORIZED GATE AFTER CENTRAL CLOSURE: Z3 — PRODUCT EXPERIENCE
```
