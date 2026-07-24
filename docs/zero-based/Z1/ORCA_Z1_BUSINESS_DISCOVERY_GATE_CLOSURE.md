# ORCA Z1 — Business Discovery Gate Closure

- **Document ID:** ORCA-Z1-CLOSE-001
- **Version:** 1.2 — Security Base Reconciliation
- **Date:** 2026-07-22
- **Status:** `PASS / CLOSED WITH OWNER DECISIONS CARRIED FORWARD`
- **Repository:** `ali599115225/orca_crm`
- **Branch:** `work/orca-z1-business-discovery-20260721`
- **Parent central SHA:** `d3bd565fd1d1f5df484814556c056765d45b392a`
- **Security unblocker:** `PR #76 / merged as d3bd565fd1d1f5df484814556c056765d45b392a`
- **Production action authorized:** `false`

## 1. Gate objective

Z1 defines what the company needs the product to do before domain states, data models, pages, and implementation are designed.

The gate closes only when the following are documented:

- capability map;
- editable reference organization;
- personas and responsibility boundaries;
- end-to-end operating processes;
- proposed Release 1 scope and outcomes;
- owner decisions with safe defaults;
- initial requirements traceability.

Z1 does not claim that the proposed company structure, activities, licenses, approval limits, providers, or Production release have been approved by the owner.

## 2. Controlling model retained

- ORCA remains an internal operating platform for one independent company.
- Multi-company SaaS is out of scope.
- `tenantId` remains temporarily as the company/security partition.
- Organizational placement and business authority are separate.
- Company-owned provider accounts and `NOT_CONFIGURED` safe states remain mandatory.
- No regulated activity, provider activation, financial execution, main merge, or Production action is authorized.

## 3. Z1 deliverables

| Deliverable | Evidence | Result |
|---|---|---|
| Capability map | `ORCA_CAPABILITY_AND_PROCESS_MAP.md` | PASS |
| End-to-end processes | `ORCA_CAPABILITY_AND_PROCESS_MAP.md` | PASS |
| Organization reference model | `ORCA_ORGANIZATION_AND_PERSONA_MODEL.md` | PASS |
| Persona registry | `ORCA_ORGANIZATION_AND_PERSONA_MODEL.md` | PASS |
| Responsibility and SoD reference | `ORCA_ORGANIZATION_AND_PERSONA_MODEL.md` | PASS |
| Release 1 recommended scope | `ORCA_RELEASE_1_SCOPE_REGISTER.md` | PASS |
| In/out/conditional scope | `ORCA_RELEASE_1_SCOPE_REGISTER.md` | PASS |
| Initial requirements traceability | `docs/zero-based/ORCA_REQUIREMENTS_TRACEABILITY_MATRIX.md` | PASS |
| Owner decisions and safe defaults | All Z1 evidence documents | PASS |

## 4. Capability discovery result

Eighteen target capabilities were identified:

1. Governance and operating control.
2. Identity, organization, and access.
3. Customer and lead management.
4. Property and inventory management.
5. Project and development inventory.
6. Tours and appointments.
7. Offers, negotiation, and reservation.
8. Contract and deal lifecycle.
9. Invoicing, installments, payment records, and settlement.
10. Tasks, workflow, and approvals.
11. Communication and support.
12. Documents and templates.
13. Reporting and analytics.
14. Human-reviewed AI assistance.
15. Provider and integration management.
16. Security, privacy, audit, and compliance support.
17. Platform operations and continuity.
18. Training, support, and handover.

This is a target capability model, not a claim that all capabilities are complete in the current repository.

## 5. End-to-end process result

Ten end-to-end processes were defined:

- lead to won/lost outcome;
- inventory to transaction readiness;
- inquiry to tour outcome;
- offer to reservation;
- contract to active deal;
- contract to cash and settlement record;
- task/approval to verified closure;
- communication/support to resolution;
- provider setup to safe operation;
- incident to recovery.

Each process records critical controls and later-gate dependencies.

## 6. Organization and persona result

The gate established an editable company-root model with optional branches, departments, teams, and assignments.

Thirteen reference personas were defined, including owner, operations, sales, marketing, inventory/project, contract, finance, support, platform administration, audit, and technical provider roles.

The model explicitly prevents these invalid assumptions:

- title equals authority;
- hierarchy equals unrestricted access;
- administrator equals business approver;
- technical provider equals real-estate operator;
- one-person staffing removes audit and approval requirements.

When one person holds conflicting responsibilities in a small company, compensating approval and audit are required.

## 7. Release 1 recommendation

The recommended Release 1 is an internal customer-to-contract-to-financial-record operating spine with safety, audit, documents, tasks, reporting, integration-ready provider states, accessibility, and operational readiness.

The scope register contains:

- 20 in-scope capability groups;
- 10 explicit out/prohibited/deferred items;
- 8 conditional provider/regulatory capabilities;
- a six-wave minimum lovable release sequence.

The recommendation is ready for owner confirmation but is not an execution authorization.

## 8. Requirements result

The initial traceability matrix records:

- 20 business requirements;
- 10 non-functional requirements;
- source, priority, owner, acceptance, verification, dependency, target gate, and status;
- linkage to owner decisions and safe defaults.

Later gates must expand this matrix. Z7 cannot classify a component `KEEP`, and Z8 cannot authorize a work package, without traceability evidence.

## 9. Owner decisions carried forward

| Decision | Status | Safe default |
|---|---|---|
| Exact active real-estate services | `OWNER_DECISION_REQUIRED` | Internal spine only; disable unproven regulated actions |
| Actual legal entity, branches, departments, teams | `OWNER_DECISION_REQUIRED` | Editable single-company reference model |
| Final personas, job titles, and staffing | `OWNER_DECISION_REQUIRED` | Reference personas; no title-derived authority |
| Existing licenses and evidence | `OWNER_EVIDENCE_REQUIRED` | Assume none |
| Final Release 1 scope | `OWNER_DECISION_REQUIRED` | Recommended scope register |
| Financial and contract approval limits | `OWNER_DECISION_REQUIRED` | Owner approval for high-risk actions |
| Official templates and signatories | `OWNER_EVIDENCE_REQUIRED` | No invented template or authority |
| Providers, budget, and processing locations | `OWNER_DECISION_REQUIRED` | `NOT_CONFIGURED`; no new processor |
| Retention periods | `OWNER_DECISION_REQUIRED` | Preserve; no irreversible deletion |
| RTO/RPO/MTPD/SLO targets | `OWNER_DECISION_REQUIRED` | Proposal only; no achieved claim |
| Production release | `NOT_AUTHORIZED` | No main merge or Production action |

Work that does not depend on these choices may continue through Z2–Z6 using the recorded safe defaults.

## 10. Gate acceptance evidence

- Z0 is merged into the zero-based central branch.
- Security advisory unblocker PR #76 passed ORCA CI, dependency audit, recovery/build evidence, and final-head Vercel Preview.
- PR #76 is merged into the zero-based central branch as `d3bd565fd1d1f5df484814556c056765d45b392a`.
- No Runtime or database file is changed by Z1.
- No current code is treated as the target business definition.
- Actual organization and licenses are not invented.
- Capability, process, persona, scope, and traceability evidence are present.
- High-risk boundaries remain unchanged.

## 11. Final base and validation reconciliation

This revision aligns the Z1 closure record with the security-unblocked central base. It does not change the Z1 business contract. Central merge still requires ORCA CI and Vercel to be green on this exact final documentation head. No Runtime, database, provider, environment, `main`, or Production action is introduced.

## 12. Gate decision

```text
Z1 BUSINESS DISCOVERY: PASS / CLOSED IN STAGE
SECURITY-UNBLOCKED CENTRAL BASE: RECONCILED
CAPABILITY MAP: COMPLETE
REFERENCE ORGANIZATION MODEL: COMPLETE
PERSONA REGISTRY: COMPLETE
END-TO-END PROCESS MAP: COMPLETE
RECOMMENDED RELEASE 1 SCOPE: COMPLETE
INITIAL REQUIREMENTS TRACEABILITY: COMPLETE
OWNER DECISIONS: REGISTERED WITH SAFE DEFAULTS
CURRENT-SYSTEM CONFORMANCE: NOT ASSESSED UNTIL Z7
CENTRAL MERGE: REQUIRES FINAL-HEAD GREEN CHECKS
BUILD AUTHORIZATION: NO
RUNTIME CHANGE: NONE
DATABASE CHANGE: NONE
MAIN MERGE: NOT AUTHORIZED / NOT PERFORMED
PRODUCTION ACTION: NONE
NEXT AUTHORIZED GATE AFTER CENTRAL MERGE: Z2 — DOMAIN CONTRACTS
```
