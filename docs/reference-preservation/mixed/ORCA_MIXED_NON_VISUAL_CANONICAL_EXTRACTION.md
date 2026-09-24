# ORCA — Mixed Non-Visual Canonical Extraction

STATUS:
CANONICAL NON-VISUAL KNOWLEDGE PACKAGE

SOURCE CLASS:
61 MIXED DOCUMENTS

FULL SOURCE TRANSFER:
PROHIBITED

VISUAL AUTHORITY TRANSFER:
PROHIBITED

PURPOSE:
Preserve architectural, functional, operational, security, data, integration,
reliability, test and governance knowledge extracted from mixed SOURCE documents
without transferring historical visual authority.

This package does not supersede newer TARGET runtime implementations.

---

# 1. Canonical Extracted Rules

## CER-01 — Real Action Truth

Every exposed operation must perform a real supported action.

No fake success, dead mutation or mock Production behavior.

## CER-02 — Server Authority

Navigation visibility never replaces server authorization.

Tenant/company/resource scope must be checked at the actual operation boundary.

## CER-03 — Provider Truth

Configured provider, offer, request or callback does not imply provider approval
or completed business outcome.

NOT_CONFIGURED, NOT_PROVEN, UNKNOWN and equivalent fail-closed states
remain valid states where evidence is missing.

## CER-04 — Evidence Before Claim

Route, model, source file or test presence does not prove target semantics.

Prefer direct executable evidence.

Historical narrative never overrides current runtime truth.

## CER-05 — Exact Financial Truth

Currency and exact monetary amounts remain explicit.

No silent financial rounding.

Payment evidence must be persisted and reconcilable before financial completion.

## CER-06 — Immutable Issued Truth

Issued offers, contracts, locked schedules and signed outputs are immutable history.

Change requires a new version, replacement, amendment, correction or reversal.

## CER-07 — Safe Session Recovery

Authentication expiry or revocation must not silently execute a pending operation
after reauthentication.

## CER-08 — Navigation Context

Back navigation, deep links, filters, tabs and pagination should preserve meaningful
product context without reversing completed business actions or revealing unauthorized
resource existence.

## CER-09 — Concurrency / Replay / Idempotency

Material operations must define deterministic behavior for:

- concurrency
- duplicate requests
- replay
- stale state

## CER-10 — Migration Is Not Data Authority

A prepared migration, isolated rehearsal or migration-ready state never authorizes
Production migration or Production data mutation.

## CER-11 — Rollback Is Conditional

Do not roll back when rollback would:

- lose valid data
- break a newer schema
- destroy audit evidence
- reintroduce a security defect

Use compensation or forward-fix where required.

## CER-12 — Authority Does Not Inherit

These are independent permissions:

- package execution
- central merge
- main merge
- migration/data operation
- provider/credential activation
- external action
- Production action

Authorization for one does not authorize another.

## CER-13 — One Mutable Boundary Owner

Shared files, schemas, domain contracts, fixtures, providers and environments must not
be independently mutated by parallel packages without an explicit ordering dependency.

## CER-14 — Rent Flex Domain Truth

DIRECT_MONTHLY_EJAR creates ORCA-side rental obligations.

EXTERNAL_RNPL_12 repayments remain external.

Reuse:

- FinanceCase
- FinanceProviderOffer

A LOCKED selection is immutable.

Legacy settle-lease must fail closed once Rent Flex is attached.

## CER-15 — Long-Running Operation Truth

Long-running jobs, providers, exports, scans and AI operations must not fabricate progress.

They must expose truthful:

- timeout
- unknown
- retry
- completion/result
- stable reference semantics

---

# 2. Functional Capability Preservation

Preserve knowledge of these product capabilities independently of current TARGET page presence:

- Dashboard
- Properties
- Projects
- Units
- Leads
- Opportunities
- Tours
- Offers
- Contracts
- Contract signing
- Signature evidence
- Signed snapshots
- Invoices
- Payment Plans
- Installments
- Rental
- Rent Flex
- Customers / Identity
- Unit Commitment / Reservation
- Agents
- Tasks
- Sales
- Marketing
- Campaigns
- Documents
- Email
- WhatsApp
- Helpdesk
- Calculator
- Compliance
- Health
- Operational Map
- Notifications
- Language/account/profile
- Authentication/session
- tenant/company scope
- RBAC
- integrations
- payments
- ZATCA
- Ejar
- advertising providers
- AI providers
- realtime
- cron/jobs
- migrations
- CI/release
- backup/recovery

Backend presence does not automatically prove the page-level or end-user workflow equivalent.

---

# 3. Proven / Newer TARGET Authorities

Do not regress these newer TARGET implementations merely to reproduce historical SOURCE design:

- canonical organization / RBAC authority
- customer identity
- unit commitment
- offer authority
- contract signature evidence
- signed operational snapshots
- contract document delivery
- Rent Flex / rental lifecycle
- realtime core

Historical SOURCE implementation details remain reference evidence only.

---

# 4. Features Without Proven TARGET Equivalent

The following capability equivalents were not fully proven at extraction time:

- Operational Map /operations/map

Clean-room page/workspace equivalents for historical SOURCE operational surfaces:

- Dashboard
- Properties
- Rental workspace
- Campaigns
- Marketing
- Offers
- Projects
- Leads
- Tasks
- Settings
- Agents
- Sales
- Tours
- WhatsApp
- Helpdesk
- Documents
- Email
- Calculator
- Compliance
- Health

Also preserve the requirement to resolve whether historical capabilities remain required for:

- owner portal
- tenant portal
- maintenance portal
- legacy contract-detail surface
- authenticated login surface
- other historical operational portals still required by the product

Do not infer that these are absent merely because their historical page implementations are not present.

---

# 5. Global Shell Functional Knowledge

Preserve functional capability requirements for:

- authenticated navigation
- search / command capability
- notification-to-source context
- profile / account access
- language control
- safe session-expiry recovery

Do not preserve historical shell layout, spacing, typography, colors or component mapping.

---

# 6. Runtime Behaviors Requiring Closure

Preserve these requirements until a current TARGET equivalent is directly proven:

- universal no-dead-action / no-fake-success behavior
- page refresh / retry behavior
- search
- filtering
- pagination
- detail navigation
- URL recovery for filters/tabs/selection/pagination
- browser Back context restoration
- unsaved-navigation protection
- safe unauthorized/not-found deep-link handling
- no resource-existence leakage
- session expiry / revocation warnings
- safe reauthentication
- suppression of pending mutation after authentication recovery
- deduplicated asynchronous status announcements
- long-running progress/cancel/background/timeout/unknown/retry semantics
- stable operation/result references
- non-pointer equivalents for drag/reorder/map/timeline/swipe
- keyboard shortcut governance that cannot bypass authority
- complete secure-document lifecycle
- durable workflow run/version/retry/dead-letter semantics
- KPI lineage/freshness/restatement/export controls
- AI evaluation/kill-switch/approved-use enforcement
- provider Production activation truth
- backup/restore evidence
- Production RTO/RPO evidence

---

# 7. Document Domain Knowledge

Preserve requirements for:

- document upload
- entity association
- access control
- immutable evidence where required
- versioning
- quarantine
- malware/security handling
- retention
- legal hold
- disposition
- audit/change history
- search
- OCR capability where explicitly supported

Signed contract document delivery already has newer TARGET behavior and must not be regressed.

---

# 8. Workflow / Communications Knowledge

Preserve:

- workflow state truth
- workflow version identity
- retries
- dead-letter behavior
- idempotency
- sender identity
- thread identity
- consent
- opt-out
- retention
- legal hold
- delivery evidence
- provider outcome truth

Task APIs or communication adapters alone do not establish complete workflow architecture.

---

# 9. Provider and Integration Knowledge

Provider code presence does not prove Production activation.

Each enabled provider requires explicit evidence for:

- account ownership
- configuration
- credentials
- callback/webhook
- authentication/signature validation
- failure behavior
- retry behavior
- recovery
- exit strategy
- business outcome mapping

Provider categories remain independent boundaries, including:

- database / hosting
- Sentry / observability
- email
- WhatsApp
- AI
- payments
- ZATCA
- Ejar
- SMS
- object storage
- advertising
- custom event sinks

---

# 10. Financial and Transaction Knowledge

Preserve:

- exact currency
- exact amounts
- no silent rounding
- payment evidence
- reconciliation
- immutable issued financial truth
- transaction-boundary integrity
- replay/idempotency safety
- duplicate-payment protection
- separation of provider outcome from ORCA receivable truth
- correction/reversal rather than historical mutation where required

---

# 11. Security and Authorization Knowledge

Preserve:

- real server authorization
- tenant/company/resource scope
- RBAC
- SoD
- no UI-only authorization
- fail-closed behavior
- secret protection
- webhook verification
- provider credential boundaries
- negative authorization tests
- replay protection
- safe deep-link handling
- audit/evidence integrity

---

# 12. Data and Persistence Knowledge

Preserve:

- explicit source-of-truth
- immutable historical facts
- transaction ownership
- concurrency rules
- compatibility boundaries
- schema/data distinction
- migration authorization separation
- backfill authorization separation
- compensation/forward-fix when rollback is unsafe

Prepared schema or migration files never imply Production data authority.

---

# 13. Test and Evidence Contract

Evidence priority:

1. direct executable test
2. reproducible operational/recovery drill
3. supporting repository evidence
4. historical narrative

Historical narrative alone cannot close a current requirement.

Preserve testing for:

- authorization negatives
- tenant/company isolation
- replay
- idempotency
- concurrency
- stale state
- provider failures
- malformed/invalid input
- file/document security
- privacy
- payments
- AI controls
- recovery
- exact artifact identity

Test data must remain isolated from Production credentials and Production mutation.

---

# 14. Engineering Governance

Preserve:

- exact base/head identity
- explicit allowlists
- package scope
- shared-boundary ownership
- one write batch then verify
- no automatic next package
- main/Production separation
- release authorization separation
- rollback safety
- explicit owner authority for protected operations

Historical G3-G8 machinery itself must not be mechanically reintroduced.

Its non-visual rules may be preserved and reconciled against current TARGET architecture.

---

# 15. Architectural Gaps Requiring Explicit Future Closure

Do not silently treat these as closed:

- current canonical API/Server-Action/page contract registry
- current route matrix
- current page/operational contract registry
- current decision/owner register
- package/allowlist/authority ledger
- provider activation/recovery evidence model
- privacy/retention/legal-hold implementation
- secure document evidence storage boundary
- durable workflow-run/dead-letter architecture
- metric/KPI lineage and restatement authority
- centralized export authority
- backup/object-storage/KMS recovery architecture
- clean TARGET CI/release gate
- Production release/activation architecture

---

# 16. Operational Gaps Requiring Evidence

Preserve as unresolved until independently proven:

- clean TARGET CI workflow architecture
- repository governance pipeline integration
- Production migration-chain guard reconciliation
- backup/restore drill
- provider recovery
- RTO/RPO evidence
- staging E2E
- UAT / handover
- Production activation record
- provider account/credential/callback evidence
- long-running operation runtime contract
- session-expiry/reauthentication recovery
- health/cron direct-test coverage

---

# 17. Visual Knowledge Exclusion

The following MUST NOT become TARGET authority through this extraction:

- colors
- fonts
- typography
- sizes
- spacing
- card geometry
- layout composition
- hover appearance
- CSS classes
- visual tokens
- golden images
- responsive visual mappings
- historical Light/Dark appearance
- page visual composition
- visual approval status
- historical design-system authority
- historical screenshots
- historical visual baselines

Functional RTL/LTR, keyboard access, responsive operability and accessibility behavior
may be preserved only as functional requirements.

---

# 18. Original Mixed Source Inventory

The original mixed set contains 61 documents.

The following 60 text sources were already read and extracted before this package:

1. AGENTS.md
2. DESIGN_ARCHIVE.md
3. ORCA_G7_REMEDIATION_POLICY.json
4. docs/architecture/ORCA_G4_CONTRACT_REGISTRY.md
5. docs/architecture/ORCA_G4_PAGES_AND_SURFACES.md
6. docs/architecture/ORCA_G7_REMEDIATION_REGISTER.md
7. docs/architecture/ORCA_G8_FINAL_FOUNDATION_GATE.md
8. docs/product-extension/RENT_FLEX_12_PERSISTENCE_UI_ARCHITECTURE_GATE.md
9. docs/product-extension/RENT_FLEX_12_P3_UI_GATE.md
10. docs/knowledge-base/ORCA_PROJECT_KNOWLEDGE_MASTER_2026-06-26.md
11. docs/knowledge-base/ORCA_KNOWLEDGE_BASE_2026-06-26/P2_PRODUCT/11_MODULE_STATUS.md
12. docs/knowledge-base/ORCA_KNOWLEDGE_BASE_2026-06-26/P2_PRODUCT/13_LOGIN_LANGUAGE_THEME.md
13. docs/knowledge-base/ORCA_KNOWLEDGE_BASE_2026-06-26/P3_QUALITY/15_ACCESSIBILITY.md
14. docs/knowledge-base/ORCA_KNOWLEDGE_BASE_2026-06-26/P3_QUALITY/17_ROUTE_MATRIX_TEST_GATES.md
15. docs/knowledge-base/ORCA_KNOWLEDGE_BASE_2026-06-26/P4_OPERATIONS/21_DECISION_LOG.md
16. ORCA_PAGE_CLOSURE_WORK/00_MASTER_EXECUTION_RULES.md
17. ORCA_PAGE_CLOSURE_WORK/PAGE_SCOPE.md
18. docs/reports/foundation/ORCA_G4_DISCOVERY.md
19. docs/reports/foundation/ORCA_G4_FINAL_CLOSURE.md
20. docs/reports/foundation/ORCA_G7_DISCOVERY.md
21. docs/reports/foundation/ORCA_G7_FINAL_CLOSURE.md
22. docs/reports/foundation/ORCA_G8_DISCOVERY.md
23. docs/reports/foundation/ORCA_G8_FINAL_CLOSURE.md
24. docs/ui/ORCA_OPERATIONS_PAGE_CONTRACT.md
25. docs/ui/ORCA_UI_SOURCE_MAP.md
26. docs/ui/ORCA_VISUAL_RESET_MANIFEST.md
27. docs/zero-based/ORCA_OWNER_DECISION_PACKAGE.md
28. docs/zero-based/ORCA_OWNER_DECISION_REGISTER.json
29. docs/zero-based/ORCA_REQUIREMENTS_TRACEABILITY_MATRIX.md
30. docs/zero-based/ORCA_SUPPLEMENTAL_REQUIREMENTS_CROSS_STAGE_VERIFICATION_MATRIX.md
31. docs/zero-based/ORCA_ZERO_BASED_CROSS_STAGE_CONSISTENCY_AUDIT.md
32. docs/zero-based/ORCA_ZERO_BASED_STAGE_LEDGER.json
33. docs/zero-based/Z3/ORCA_GLOBAL_SHELL_VISUAL_REFERENCE_BRIEF.md
34. docs/zero-based/Z3/ORCA_GLOBAL_UI_TOKEN_AND_MEASUREMENT_CONTRACT.md
35. docs/zero-based/Z3/ORCA_STRICT_VISUAL_REFERENCE_ACCEPTANCE_CHECKLIST.md
36. docs/zero-based/Z3/ORCA_TARGET_INFORMATION_ARCHITECTURE.md
37. docs/zero-based/Z3/ORCA_TARGET_PAGE_SURFACE_REGISTRY.md
38. docs/zero-based/Z3/ORCA_UI_DESIGN_ACCESSIBILITY_CONTRACT.md
39. docs/zero-based/Z3/ORCA_VISUAL_REFERENCE_APPROVAL_REGISTER.md
40. docs/zero-based/Z3/ORCA_VISUAL_REFERENCE_PRODUCTION_QUEUE.md
41. docs/zero-based/Z3/ORCA_Z3_INDEPENDENT_INTERACTION_ACCESSIBILITY_REVIEW_ADDENDUM.md
42. docs/zero-based/Z3/ORCA_Z3_INTERACTION_ACCESSIBILITY_REQUIREMENTS_SUPPLEMENT.md
43. docs/zero-based/Z3/ORCA_Z3_UX_REQUIREMENTS_TRACEABILITY.md
44. docs/zero-based/Z5/ORCA_TEST_AND_EVIDENCE_MATRIX.md
45. docs/zero-based/Z7/ORCA_Z7_CLASSIFIED_GAP_REGISTER.md
46. docs/zero-based/Z7/ORCA_Z7_COMPONENT_DISPOSITION_REGISTER.md
47. docs/zero-based/Z7/ORCA_Z7_CURRENT_SYSTEM_INVENTORY.md
48. docs/zero-based/Z7/ORCA_Z7_DEPENDENCY_CRITICAL_PATH.md
49. docs/zero-based/Z7/ORCA_Z7_GATE_CLOSURE.md
50. docs/zero-based/Z7/ORCA_Z7_READINESS_AND_GAP_CLASSIFICATION_METHOD.md
51. docs/zero-based/Z7/ORCA_Z7_TARGET_TO_CURRENT_TRACEABILITY.md
52. docs/zero-based/Z7/ORCA_Z7_VISUAL_AND_PROVIDER_BLOCKERS.md
53. docs/zero-based/Z8/ORCA_Z8_ACCEPTANCE_RECOVERY_CONFLICT_CONTRACT.md
54. docs/zero-based/Z8/ORCA_Z8_EXECUTION_PACKAGE_REGISTRY.json
55. docs/zero-based/Z8/ORCA_Z8_EXECUTION_PACKAGE_SCHEMA.json
56. docs/zero-based/Z8/ORCA_Z8_GATE_CLOSURE.md
57. docs/zero-based/Z8/ORCA_Z8_INDEPENDENT_EXECUTION_AUTHORIZATION_REVIEW_ADDENDUM.md
58. docs/zero-based/Z8/ORCA_Z8_MAIN_PRODUCTION_ACTIVATION_SEPARATION.md
59. docs/zero-based/Z8/ORCA_Z8_OWNER_VISUAL_PROVIDER_DATA_BLOCKERS.md
60. docs/zero-based/Z8/ORCA_Z8_PRIORITIZED_EXECUTION_ROADMAP.md

The 61st mixed source is the binary DOCX:

docs/ORCA_CRM_التقنيات_المستخدمة.docx

Its non-visual extraction is stored separately at:

docs/reference-preservation/mixed/ORCA_CRM_TECHNOLOGIES_NON_VISUAL_EXTRACTION.md

The original DOCX MUST NOT be copied into TARGET.

---

# 19. Preservation Boundary

NON-VISUAL KNOWLEDGE:
PRESERVE

SOURCE VISUAL AUTHORITY:
DO NOT TRANSFER

NEWER TARGET CANONICAL IMPLEMENTATIONS:
PRESERVE

HISTORICAL SOURCE IMPLEMENTATION:
REFERENCE ONLY

PRODUCTION AUTHORITY:
NOT IMPLIED

MIGRATION AUTHORITY:
NOT IMPLIED

PROVIDER ACTIVATION:
NOT IMPLIED

END OF CANONICAL EXTRACTION