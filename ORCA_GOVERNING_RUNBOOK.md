# ORCA GOVERNING RUNBOOK

Protocol: ORCA-WORKFLOW-LOCK
Version: 1.0
Status: LOCKED
Jurisdiction snapshot: Saudi Arabia
Snapshot date: 2026-08-13
Owner amendment phrase: OWNER AMENDMENT APPROVED

## 1. Governing purpose
This file is the governing source of truth for ORCA execution. It prevents scope expansion, speculation, hidden phases, branch confusion, unauthorized Build/Migration/Commit/Push/Deploy/Delete, and automatic creation of new work because a new finding appears.

No assistant, agent, reviewer, or automation may add a governing step, reinterpret the business model, or expand scope without an explicit owner amendment.

## 2. Canonical business model
Provider:
- Technical web developer / software provider.
- Activity context: web development and graphic design.
- Not a real-estate company, broker, property manager, payment provider, or party to the customer's real-estate transactions.

Customer:
- Existing real-estate company.
- May have branches, staff, roles, customers, properties, projects, sales/rental operations, licenses, and external-provider accounts.

Commercial model:
- ORCA is a dedicated real-estate operations software product prepared for the customer.
- Relationship is governed by a separate agreement / sale contract.
- The provider/customer commercial contract is separate from real-estate contracts managed inside ORCA.
- ORCA is not governed as a public multi-company SaaS subscription platform.

Deployment:
- Customer-hosted or vendor-managed according to the commercial agreement.
- Hosting choice must not silently reactivate SaaS-subscription architecture.

## 3. Responsibility boundary
Customer owns/is responsible for:
- company/branch/staff/customer/property/project data,
- operational content/templates,
- real-estate licenses and regulatory credentials,
- provider accounts and credentials,
- payment accounts,
- Email/WhatsApp/SMS/ZATCA/Ejar configuration,
- legality/correctness of operational use.

ORCA/product must provide:
- working fields/forms/workflows,
- correct persistence and authorization,
- safe credential handling,
- working supported configuration/integration paths,
- fail-closed behavior when configuration is absent,
- technical correctness and auditability within declared scope.

Mandatory rule:
CLIENT_CONFIGURATION_REQUIRED != PRODUCT_DEFECT

## 4. Legacy SaaS policy
KEEP:
- legacy SaaS code,
- legacy database fields/tables where still present,
- historical migrations.

DISABLED:
- SaaS runtime,
- public registration,
- subscription billing,
- billing cron,
- package/plan logic,
- upgrade/downgrade,
- renewal,
- SaaS payment flow,
- SaaS UI entrypoints.

NO:
- SaaS cleanup deletion project,
- cleanup migration merely to remove legacy artifacts.

Classification:
LEGACY_DISABLED -> KEEP -> NO ACTION

tenantId meaning:
tenantId = technical data/scope partition
tenantId != SaaS subscription customer

## 5. Integration authority
External integrations are customer-configured.
No provider activation on behalf of the customer without authorization.
Missing credentials/configuration is not a defect by itself.
Broken setup/runtime/crypto/provider paths are product defects.

## 6. Real-estate regulatory boundary
ORCA is internal operational software for the customer's real-estate business.
The provider must not be represented as the customer's broker, advertiser, regulated operator, or holder of customer credentials/licenses.
Customer identity, authorization, licenses, and credentials govern regulated external actions.
A public real-estate marketplace is OUT_OF_SCOPE unless owner-amended.

## 7. Contract/external authority boundary
An internal ORCA record must not be represented as externally registered/authenticated merely because it exists internally.
Where external registration applies, the external authority response is the source of truth.
This is a governing invariant, not automatic authorization for schema changes.

## 8. Data/security boundary
- Customer operational data belongs to the customer.
- Support access is not assumed.
- Privileged support access, if contractually allowed, must be bounded/auditable.
- External processing and cross-border data boundaries must be identifiable where applicable.
- Personal-data incidents must be distinguishable from ordinary system incidents where applicable.
- Saudi regulatory applicability is rechecked at STEP 12; this creates no new step.

## 9. AI provider boundary
External AI provider activation is disabled by default unless configured/authorized.
Customer data must not be sent to an external AI provider merely because an adapter exists.

## 10. IP boundary
Default:
- ORCA software/source/IP = provider, subject to contract.
- Customer operational data = customer.
- Customer content/templates = customer.
- License/use/transfer rights = commercial-contract defined.

## 11. Canonical architecture authority
KEEP:
- Transaction Spine as canonical orchestration authority.
- No second authoritative write path.
- Contract issuance/signing lifecycle separation.
- Atomic/idempotent financial reconciliation.
- Journal/accounting integrity.
- Deal Passport/provenance where adopted.
- Provider-neutral integration boundaries.
- Fail-closed external configuration.
- Technical data isolation where required.
- EXEC-008 only as contract/financial integrity companion.
- EXEC-009 only as selectively reconciled workflow/communication integrity.
- EXEC-010 only as selectively reconciled document/privacy/reporting/export integrity.
- EXEC-011 as pinned current baseline/visual line, without independent domain authority.

Zero-based material = HISTORICAL EVIDENCE ONLY, not a current governing plan unless explicitly re-adopted.

## 12. Pinned baseline
Repository: ali599115225/orca_crm
Source branch: work/orca-exec-011-visual-closure-20260811
Baseline SHA: 2b9c0505c99c7074de1d213c720022cff4626727

## 13. Exactly 10 E2E cycles
1. E2E-01 Lead -> WON/LOST
2. E2E-02 Property/Project Inventory -> Transaction Readiness
3. E2E-03 Inquiry -> Tour Outcome
4. E2E-04 Offer -> Reservation
5. E2E-05 Contract -> Active Deal
6. E2E-06 Contract -> Cash / Settlement / Accounting
7. E2E-07 Task / Approval -> Verified Closure
8. E2E-08 Customer Communication / Support -> Resolution
9. E2E-09 Provider Setup -> Safe Operation
10. E2E-10 Incident -> Recovery

NO E2E-11 without owner amendment.

## 14. Exactly 20 Functional Contracts
FC-001 Authentication & Session
FC-002 Staff & User Management
FC-003 Organization Structure
FC-004 Leads & Contacts
FC-005 Projects & Properties
FC-006 Tours & Offers
FC-007 Contracts & Payment Plans
FC-008 Installments & Invoices
FC-009 Rental Operations
FC-010 Tasks & Maintenance
FC-011 Documents
FC-012 Email
FC-013 WhatsApp
FC-014 SMS
FC-015 Payment Gateway
FC-016 Advertising
FC-017 ZATCA / Ejar / Government
FC-018 Agents & Sentinel
FC-019 Tenant Registration & SaaS Billing
FC-020 Dashboard & Reporting

FC-019 governing state = INTENTIONALLY_DISABLED / LEGACY_DISABLED
NO FC-021 without owner amendment.

## 15. Kross raw audit baseline
HEAD: 2b9c0505c99c7074de1d213c720022cff4626727
Mode: READ-ONLY
Files changed: 0
Branch changes: 0

Raw E2E: PASS=1, PARTIAL=9, MISSING=0, BLOCKED=0
Raw FC: PASS=3, PARTIAL=14, MISSING=0, NOT_CONFIGURED=2, INTENTIONALLY_DISABLED=1, BLOCKED=0

This is evidence, not final implementation authority. STEP 1 reclassifies findings under the canonical business model.

## 16. Branch governance
One active authoritative write line during implementation.
Old EXEC branches = FROZEN / READ-ONLY until reconciled.
Full merge of EXEC-008/009/010 = FORBIDDEN.
Reconciliation classifications only:
ALREADY_PRESENT / ABSORB / DIRECT_FIX / SUPERSEDED / OBSOLETE / CONFLICT

Any required Prisma schema change, migration, backfill, or production-data mutation:
STOP -> MIGRATION_APPROVAL_REQUIRED

## 17. Locked execution sequence
STEP 0 — Knowledge / Business Model Lock
STEP 1 — Business Model Reclassification
STEP 2 — Branch Reconciliation Audit (READ-ONLY)
STEP 3 — Final Unification Ledger (UNKNOWN=0 required)
STEP 4 — Create Unified Branch (owner approval required)
STEP 5 — Selective EXEC-008 Absorption
STEP 6 — Selective EXEC-009 Absorption
STEP 7 — Selective EXEC-010 Absorption
STEP 8 — Direct Closure of Remaining Approved Gaps
STEP 9 — Full Technical Verification
STEP 10 — Reverify exactly 10 E2E + 20 FC
STEP 11 — Runtime / Page Verification
STEP 12 — Final Authoritative Reference Gate + regulatory re-check
STEP 13 — Freeze / Archive Old Branches
STEP 14 — Delete Old Branches (explicit owner approval required)
Then CLOSED.

NO STEP 15.

## 18. New Finding Rule
For every new finding:
1. Belongs to CURRENT STEP -> handle only inside current step.
2. Belongs to an existing future STEP -> record only for that step.
3. Customer configuration only -> CLIENT_CONFIGURATION_REQUIRED / NO PRODUCT FIX.
4. Disabled legacy SaaS with no runtime effect -> LEGACY_DISABLED / KEEP / NO ACTION.
5. Outside STEP 0-14/current product scope -> OUT_OF_SCOPE / NO ACTION.
6. Conflicts with governing business/architecture/security/regulatory authority -> STOP / OWNER DECISION REQUIRED.
7. Insufficient evidence -> STOP / MISSING_EVIDENCE.

Forbidden:
- creating a new step,
- creating a surprise audit,
- expanding product scope,
- unrelated refactor,
- provider activation,
- SaaS reactivation,
- guessing.

## 19. Scope-expansion rule
"While we are here", "it would be better", "we may also need", "let us improve", "perhaps", and similar suggestions have no execution authority.
Non-required enhancement = REJECTED AS SCOPE EXPANSION.

## 20. Owner-controlled actions
Explicit owner authorization required before:
- BUILD implementation start,
- unified write branch creation,
- Migration,
- Backfill,
- Commit,
- Push,
- Deploy,
- Production action,
- Provider activation,
- Old-branch deletion.

## 21. Forbidden Git actions without authorization
No reset / clean / stash / full merge / blind cherry-pick / automatic conflict resolution / history rewrite / branch deletion / production mutation.

## 22. Step closure gate
A step closes only with:

STEP CLOSURE GATE
CURRENT STEP = <n>
REQUIRED OUTPUT = COMPLETE
UNKNOWN = 0
SCOPE EXPANSION = 0
UNAUTHORIZED CHANGES = 0
STEP <n> = CLOSED
NEXT AUTHORIZED STEP = <n+1 or CLOSED>

Otherwise STOP.

## 23. Bootstrap rule
Bootstrap phrase: ORCA LOCK

Every new assistant/agent session must:
1. Read ORCA_GOVERNING_RUNBOOK.md
2. Read ORCA_EXECUTION_STATE.json
3. Verify the runbook SHA-256 stored in state
4. Identify CURRENT STEP
5. Work only on CURRENT STEP
6. Prefer these files over conversational memory
7. STOP if missing or hash mismatch

Required successful bootstrap:
ORCA WORKFLOW BOOTSTRAP
RUNBOOK = FOUND
STATE = FOUND
RUNBOOK HASH = PASS
PROTOCOL = ORCA-WORKFLOW-LOCK
BUSINESS MODEL = CONFIRMED
CURRENT STEP = <n>
SCOPE = LOCKED
EXPANSION = FORBIDDEN
BOOTSTRAP GATE = PASS

## 24. Amendment rule
Only the owner may amend this runbook.
Recognized only as:
OWNER AMENDMENT APPROVED: <change>

Any approved amendment must update this file and refresh the stored SHA-256 in ORCA_EXECUTION_STATE.json.

## 25. Saudi regulatory snapshot
Snapshot date: 2026-08-13
Re-check at STEP 12 where applicable:
SDAIA, NCA, CST, REGA, Ejar, ZATCA, Ministry of Commerce, SAIP, Bureau of Experts.

This is a governance reminder, not legal advice and not authority to expand scope.

## 26. Final lock
10 E2E ONLY
20 FUNCTIONAL CONTRACTS ONLY
STEP 0-14 ONLY
NO STEP 15
NO E2E-11
NO FC-021
NO SaaS reactivation
NO speculative cleanup
NO hidden phase
NO surprise audit
NO branch-wide merge
NO migration without approval
NO commit without approval
NO push without approval
NO deploy without approval
NO production action without approval
NO branch deletion without approval
