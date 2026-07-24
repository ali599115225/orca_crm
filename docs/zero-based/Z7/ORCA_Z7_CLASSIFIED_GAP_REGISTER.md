# ORCA Z7 — Classified Gap Register

- **Document ID:** ORCA-Z7-GAPS-001
- **Version:** 1.0
- **Date:** 2026-07-25
- **Status:** `COMPLETE / 32 CLASSIFIED GAPS`
- **Assessed SHA:** `75e0e25ed0247c7da2a4720c6e8aeb27f8bba959`

## 1. Summary

| Dimension | Count |
|---|---|
| Total gaps | 32 |
| P0 | 18 |
| P1 | 12 |
| P2 | 2 |
| ADAPT | 12 |
| REBUILD | 2 |
| RETIRE | 2 |
| MISSING | 4 |
| DEFER | 9 |
| NOT_PROVEN | 3 |

## 2. Authoritative register

| Gap ID | Target IDs | Current component/evidence | Class | Severity | Gap statement | Dependencies | Recommended action | Acceptance | Owner |
|---|---|---|---|---|---|---|---|---|---|
| GAP-Z7-001 | BR-001; Z0 | Tenant/subscription/register/admin/payment/agent-leasing surfaces | RETIRE | P1 | Legacy multi-company SaaS product semantics remain in a single-company target. | Owner Release-1 scope | Retire behavior while retaining tenant security partition. | No subscription/upgrade/leasing path is reachable; data impact reconciled. | Owner + Architecture |
| GAP-Z7-002 | BR-002; Z4 RBAC | User/Tenant + authz layer; organization scope detected in only 3 files | ADAPT | P0 | Actual branches/departments/teams and scoped authority are not fully represented. | Owner organization decision | Extend organization model, assignments, permissions and negative tests. | Every sensitive command/read has approved scoped authority and denial tests. | Owner + Security |
| GAP-Z7-003 | Z4R; G3 activation | G3 RBAC migrations/backfill/tooling | DEFER | P0 | Repository controls exist but Production data-plane application is unverified. | Restorable recovery point; owner approval | Create non-Production rehearsal and separately authorized activation package. | Migration/backfill/constraints/staged enforcement evidenced on approved environment. | Owner + DB + Security |
| GAP-Z7-004 | FR-001..005 | Lead/Contact/Opportunity | ADAPT | P1 | Identity, duplicate merge, purpose/consent and outcome evidence are incomplete. | Organization and privacy policy | Implement deterministic identity/merge and lifecycle tests. | Positive/negative/merge/history/consent tests pass. | Sales + Privacy |
| GAP-Z7-005 | FR-007; FR-015; Z2R-003/004 | Unit status and booking action | MISSING | P0 | No dedicated atomic commitment/reservation aggregate was observed. | Owner priority/atomicity policy | Create commitment aggregate, constraints and idempotent expiration/release. | Concurrent incompatible commitments cannot both succeed. | Operations + Architecture |
| GAP-Z7-006 | FR-006..010 | Project/Unit | ADAPT | P1 | Target hierarchy, evidence/pricing history and post-commit mutation locks are not directly proven. | Inventory policy | Extend hierarchy/version/evidence model and tests. | Parent integrity, immutable evidence and structural-lock tests pass. | Inventory Owner |
| GAP-Z7-007 | FR-011..012 | Tour | ADAPT | P1 | Resource conflict, timezone, completion/no-show outcome and follow-up are not fully proven. | Scheduling policy | Add conflict transaction and outcome workflow. | Race/timezone/outcome/follow-up tests pass. | Sales Operations |
| GAP-Z7-008 | FR-013..015 | Offer | REBUILD | P0 | Single mutable Offer surface does not prove immutable versions and exact-version approvals. | Z2R-004; approval limits | Introduce OfferVersion/Approval and negotiation evidence. | Issued versions immutable; stale approvals invalidated; acceptance atomic. | Sales Approval Owner |
| GAP-Z7-009 | FR-016..018 | Contract/DealPassport | ADAPT | P0 | Template/signatory authority, signature evidence, amendment and idempotent activation remain incomplete. | Official templates/signatories | Add exact version/authority/evidence and activation tests. | Unauthorized/incomplete/replayed activation fails without duplicate obligations. | Contract Authority |
| GAP-Z7-010 | FR-019..022; Z2R-006 | Finance transaction spine | ADAPT | P0 | Precision, append-only correction, verified payment evidence, refund SoD and limits require closure. | Owner finance policy | Implement approved money/correction/SoD contracts and direct tests. | Balances reconcile under retry/concurrency/reversal/refund cases. | Finance Authority |
| GAP-Z7-011 | FR-023 | Task/AutomationWorkflow | ADAPT | P1 | Durable workflow-run, exact subject version, approval evidence and dead-letter semantics are incomplete. | Approval model | Create workflow-run aggregate and bounded retry/escalation. | Retry/replay/escalation/self-approval tests pass. | Operations |
| GAP-Z7-012 | FR-024..025 | Email/WhatsApp/helpdesk | ADAPT | P1 | Provider truth, identity/thread integrity, consent, retention and escalation require direct proof. | Provider and privacy decisions | Normalize message truth and support lifecycle. | Forged/replayed/timeout/unknown/opt-out/escalation tests pass. | Communications Owner |
| GAP-Z7-013 | FR-026 | Document model/routes/UI | REBUILD | P0 | Quarantine, malware scan, immutable versions, secure object storage, hold and disposition are not proven. | Storage/scanner/provider decisions | Build evidence-safe document boundary. | Spoofed/malicious/unauthorized/version/hold/download tests pass. | Records + Security |
| GAP-Z7-014 | FR-027..028 | Dashboards/accounting/analytics/export | MISSING | P1 | Versioned metric definitions, lineage, as-of/freshness, restatement and export purpose controls are not directly proven. | KPI owner definitions | Create metric/catalog/export policy contracts. | Every Release-1 KPI reconciles to source and authorized scope. | Executive + Data Owner |
| GAP-Z7-015 | FR-029..030 | AI endpoints/providers/revenue intelligence | DEFER | P1 | Approved use cases, field policy, evaluation and company provider activation are absent. | AI owner policy/provider | Keep disabled/provider-gated; add evaluation and redaction tests before activation. | Kill switch, injection/redaction/human-review and provider-failure tests pass. | Owner + Security |
| GAP-Z7-016 | Z5 direct tests | G4/G5 registry | MISSING | P0 | 59 current contracts lack direct test references; 25 are P0/P1. | Stable target contracts | Implement prioritized direct negative/concurrency/evidence tests. | G5 unproven P0/P1 count becomes zero or scope is owner-approved out. | Quality + Security |
| GAP-Z7-017 | Z3 visual contracts | 43 pages; 8 tabs; 6 overlays | NOT_PROVEN | P1 | Z3 has zero owner-approved item-level target references. | Owner visual approvals | Run one-surface visual cycles; do not batch unapproved tabs. | Approved reference + independent Light/Dark/RTL/responsive/a11y verification per surface. | Product Owner |
| GAP-Z7-018 | UXR accessibility | Current source and historical reports | NOT_PROVEN | P1 | Manual keyboard, focus, screen-reader and WCAG evidence is incomplete. | Approved critical journeys | Add automated and manual accessibility evidence per surface. | Critical flows meet approved WCAG 2.2 AA acceptance. | Product + Quality |
| GAP-Z7-019 | NFR-008; Z4 privacy | Masking/retention signals and schema | ADAPT | P0 | Approved catalog, RoPA, purpose, rights, notices, retention and legal hold are absent. | Owner/legal/privacy policy | Approve and implement privacy/retention lifecycle. | Data inventory and rights/retention/hold tests are complete. | Owner + Privacy |
| GAP-Z7-020 | BR-003/004; Z4 vendors | 96 env names; provider routes/dependencies | DEFER | P1 | Company ownership, contracts, processing locations, budgets and active configuration are unverified. | Owner provider decisions | Keep `NOT_CONFIGURED`; prepare provider-specific activation packages. | Company account/evidence, failure/replay/exit tests and secrets governance complete. | Owner + Integration |
| GAP-Z7-021 | Z6 continuity | Repository recovery tools | DEFER | P0 | Provider recovery, representative restore and Production RTO/RPO are unverified. | Provider backups and numeric targets | Perform representative isolated rehearsal before release. | Measured reconciliation satisfies approved RTO/RPO with no Production overwrite. | Operations + DB |
| GAP-Z7-022 | Z6 UAT/handover | No approved UAT/training/handover evidence | DEFER | P0 | Release journeys, sign-off, training, support and handover are not executed. | Stable staging + scope | Execute approved UAT and handover package. | Named signers accept journeys, defects, runbooks and support terms. | Owner + Operations |
| GAP-Z7-023 | Z5/Z6 release tests | Six E2E files; G8-ACT-05 unverified | MISSING | P1 | Deterministic launch-critical staging browser journeys are not proven. | Staging identities/fixtures | Create isolated deterministic E2E suite. | Critical customer-to-finance and failure journeys pass on approved staging SHA. | Quality + Release |
| GAP-Z7-024 | BR-020; Z8 | Activation evidence file absent | DEFER | P0 | Protected main merge, deployment, health and rollback evidence are absent by design. | All prior execution packages + owner instruction | Create separate activation evidence only after completion. | All six G8 activation conditions verified for one approved SHA. | Owner + Release |
| GAP-Z7-025 | NFR-007 | Package/tooling controls; unpublished candidate `ed4ea9087b2fe9c6ba1335610080870eb38efd4a` | ADAPT | P2 | No lint script; ranges/temporary overrides, 17 outdated packages and one low dev audit issue remain. The structured dependency-security issue form exists only in an orphan candidate and is missing from central. | Routine maintenance window | Publish the verified one-file issue-template candidate through a clean current-base PR, then add lint and reconcile dependencies without widening scope. | Issue form is present on central; lint blocks CI; audit threshold passes; overrides have expiry/owner. | Engineering |
| GAP-Z7-026 | Repository governance | Tracked reports/scratch/generated work products | RETIRE | P2 | Repository contains duplicated generated reports and anomalous work artifacts. | Evidence retention policy | Archive or remove through a dedicated hygiene package. | Runtime tree contains only required source/config/evidence references. | Release Engineering |
| GAP-Z7-027 | Z4 API/action authority | 129 APIs; 162 action contracts; permissions recorded on 27 contracts | ADAPT | P0 | Many sensitive surfaces rely on transitive guards without explicit target permission mapping. | Approved permission registry | Map and test exact permission/SoD on every P0/P1 surface. | All P0/P1 APIs/actions have direct authority and denial evidence. | Security |
| GAP-Z7-028 | NFR-004; webhooks/crons | Five public/signed/cron boundaries | NOT_PROVEN | P0 | Boundary-specific signature/timestamp/replay/scope evidence must remain direct. | Provider/cron contracts | Add direct boundary tests and monitoring. | Forged, replayed, stale and wrong-scope requests fail deterministically. | Security + Integration |
| GAP-Z7-029 | Owner legal decisions | Compliance/ZATCA/Ejar/contracts | DEFER | P0 | Exact licensed activities, official templates, signatories and filing authority are unapproved. | Owner/legal evidence | Disable unproven regulated action and register authoritative evidence. | Every enabled regulated action maps to current license/template/authority. | Owner + Legal |
| GAP-Z7-030 | Z2R-003/004/006 | Owner policy register | DEFER | P0 | Commitment priority, acceptance/reservation atomicity, and financial correction/precision policies remain open. | Owner decision | Resolve before implementing dependent aggregates. | Decision records are approved and linked to tests/migrations. | Owner |
| GAP-Z7-031 | FR-028; NFR-008 | Export/download surfaces | ADAPT | P0 | Separate export permission, purpose, field/row limits, masking and audit are not comprehensively proven. | Privacy/export policy | Create centralized export gateway and direct tests. | Unauthorized/oversized/excess-field exports fail and authorized exports are audited. | Data Owner + Security |
| GAP-Z7-032 | Z6 provider recovery | Object storage/S3 and provider backup references | DEFER | P0 | Object-storage lifecycle, KMS ownership, scheduled logical backups and provider recovery are unverified. | Vendor/location/budget decisions | Prepare provider-specific recovery design and drills. | Backup/restore/retention/access/KMS/exit evidence passes approved targets. | Owner + Operations |

## 3. P0/P1 current contracts lacking direct test references

The G5 current-system inventory reported 59 direct-test gaps, of which 25 are P0/P1. The list below is retained as executable-evidence backlog rather than being treated as proof of failure.

| Priority | Kind | Route/contract | Source | Methods |
|---|---|---|---|---|
| P0_SECURITY_CRITICAL_SURFACE | API | `/api/properties/[id]/request-finance` | `app/api/properties/[id]/request-finance/route.ts` | POST |
| P0_SECURITY_CRITICAL_SURFACE | API | `/api/revenue-integrity/webhook/[provider]` | `app/api/revenue-integrity/webhook/[provider]/route.ts` | POST |
| P0_SECURITY_CRITICAL_SURFACE | API | `/api/v1/contracts/[id]/cancel` | `app/api/v1/contracts/[id]/cancel/route.ts` | POST |
| P0_SECURITY_CRITICAL_SURFACE | API | `/api/v1/contracts/[id]/invoices` | `app/api/v1/contracts/[id]/invoices/route.ts` | GET, POST |
| P0_SECURITY_CRITICAL_SURFACE | API | `/api/v1/contracts/[id]/payment-plan` | `app/api/v1/contracts/[id]/payment-plan/route.ts` | GET, POST, PUT |
| P0_SECURITY_CRITICAL_SURFACE | API | `/api/v1/contracts/[id]/restructure` | `app/api/v1/contracts/[id]/restructure/route.ts` | POST |
| P0_SECURITY_CRITICAL_SURFACE | API | `/api/v1/contracts/[id]/sign` | `app/api/v1/contracts/[id]/sign/route.ts` | POST |
| P0_SECURITY_CRITICAL_SURFACE | API | `/api/v1/invoices/[id]/paylink/create` | `app/api/v1/invoices/[id]/paylink/create/route.ts` | POST |
| P0_SECURITY_CRITICAL_SURFACE | API | `/api/v1/leads/webhook` | `app/api/v1/leads/webhook/route.ts` | POST |
| P0_SECURITY_CRITICAL_SURFACE | API | `/api/v1/leases/[id]/invoices` | `app/api/v1/leases/[id]/invoices/route.ts` | POST |
| P0_SECURITY_CRITICAL_SURFACE | API | `/api/v1/settings/leads-webhook` | `app/api/v1/settings/leads-webhook/route.ts` | GET, POST |
| P1_MUTATION_SURFACE | API | `/api/v1/accounting/journal-entries/[id]` | `app/api/v1/accounting/journal-entries/[id]/route.ts` | GET, POST |
| P1_MUTATION_SURFACE | API | `/api/v1/accounting/seed` | `app/api/v1/accounting/seed/route.ts` | POST |
| P1_MUTATION_SURFACE | API | `/api/v1/automation/workflows` | `app/api/v1/automation/workflows/route.ts` | GET, POST |
| P1_MUTATION_SURFACE | API | `/api/v1/maintenance` | `app/api/v1/maintenance/route.ts` | GET, POST |
| P1_MUTATION_SURFACE | API | `/api/v1/maintenance/[id]` | `app/api/v1/maintenance/[id]/route.ts` | PATCH |
| P1_MUTATION_SURFACE | SERVER_ACTION | `SERVER_ACTION:app/actions/aiClient.ts:generateAIInsight` | `app/actions/aiClient.ts` | — |
| P1_MUTATION_SURFACE | SERVER_ACTION | `SERVER_ACTION:app/actions/logs.ts:clearSystemLogsAction` | `app/actions/logs.ts` | — |
| P1_MUTATION_SURFACE | SERVER_ACTION | `SERVER_ACTION:app/actions/logs.ts:triggerMockErrorAction` | `app/actions/logs.ts` | — |
| P1_SENSITIVE_READ_SURFACE | API | `/api/v1/accounting/payables` | `app/api/v1/accounting/payables/route.ts` | GET |
| P1_SENSITIVE_READ_SURFACE | API | `/api/v1/contracts/[id]/pdf` | `app/api/v1/contracts/[id]/pdf/route.ts` | GET |
| P1_SENSITIVE_READ_SURFACE | API | `/api/v1/invoices/[id]/paylink/status` | `app/api/v1/invoices/[id]/paylink/status/route.ts` | GET |
| P1_SENSITIVE_READ_SURFACE | API | `/api/v1/invoices/[id]/pdf` | `app/api/v1/invoices/[id]/pdf/route.ts` | GET |
| P1_SENSITIVE_READ_SURFACE | API | `/api/v1/invoices/[id]/qr` | `app/api/v1/invoices/[id]/qr/route.ts` | GET |
| P1_SENSITIVE_READ_SURFACE | SERVER_ACTION | `SERVER_ACTION:app/actions/rentals.ts:getRentalContractsAction` | `app/actions/rentals.ts` | — |

## 4. Decision rule

No gap in this register authorizes code, schema, provider, environment, `main`, or Production changes. Z8 must group gaps into bounded packages with exact acceptance, dependencies, rollback, and exclusions.
