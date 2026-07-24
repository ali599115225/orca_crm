# ORCA Z7 — Component Disposition Register

- **Document ID:** ORCA-Z7-DISPOSITION-001
- **Version:** 1.0
- **Date:** 2026-07-25
- **Status:** `COMPLETE / 32 ASSESSMENT UNITS`
- **Assessed SHA:** `75e0e25ed0247c7da2a4720c6e8aeb27f8bba959`

## 1. Summary

| Disposition | Count |
|---|---|
| `KEEP` | 4 |
| `ADAPT` | 15 |
| `REBUILD` | 2 |
| `RETIRE` | 2 |
| `MISSING` | 2 |
| `DEFER` | 6 |
| `NOT_PROVEN` | 1 |

## 2. Register

| ID | Current component | Evidence basis | Disposition | Execution implication |
|---|---|---|---|---|
| CMP-001 | Central branch / PR process | GitHub PR gates; Z0–Z6 sequential merges | KEEP | Protect central-only sequencing and same-head CI/Vercel rule. |
| CMP-002 | ORCA CI | `.github/workflows/orca-ci.yml`; CI #259 PASS | KEEP | Retain blocking install, schema, audit, typecheck, tests, Build and isolated recovery. |
| CMP-003 | Supply-chain controls | CodeQL, Dependabot, lockfile, audit; no lint; ranges/overrides; dependency-remediation form candidate `ed4ea9087b2fe9c6ba1335610080870eb38efd4a` absent from central | ADAPT | Publish the verified one-file form from the current central base, then add lint, review overrides/ranges, and track outdated/dev-only findings. |
| CMP-004 | Repository evidence outputs | `.unlighthouse/`, reports, scratch, archived work products | RETIRE | Archive outside Runtime tree after reference and provenance review. |
| CMP-005 | Session/authentication | Session/API guards and extensive direct tests | ADAPT | Retain core; map all sensitive surfaces to current target policy. |
| CMP-006 | Tenant security partition | `tenantId` in 365 files; schema/tests/context | ADAPT | Retain as single-company security partition; remove SaaS product semantics. |
| CMP-007 | Organization/RBAC | Authorization layer, permission registry, G3 migrations/tests | ADAPT | Approve branches/departments/teams and apply scoped enforcement through controlled data plane. |
| CMP-008 | Customer/lead/opportunity | Lead/Contact/Opportunity models, pages/actions/tests | ADAPT | Add identity merge, purpose/consent, state/outcome evidence. |
| CMP-009 | Project/property/unit catalog | Project/Unit models and workspaces/actions | ADAPT | Add target hierarchy, evidence/pricing history and structural locks. |
| CMP-010 | Inventory commitment/reservation | Unit status and booking action; no dedicated aggregate | MISSING | Create transactional commitment/reservation aggregate and concurrency constraints. |
| CMP-011 | Tours | Tour model/page/actions/tests | ADAPT | Prove timezone, resource conflict, outcome and follow-up. |
| CMP-012 | Offers/approvals | Single Offer model without version/approval aggregates | REBUILD | Implement immutable versions, exact-version approval and negotiation evidence. |
| CMP-013 | Contracts/deal passport | Contract version, DealPassport/Event, issue/sign/cancel flows | ADAPT | Add authority/template/signature/amendment and activation evidence. |
| CMP-014 | Finance/accounting | Invoices, installments, transactions, journals, reconciliation code/tests | ADAPT | Resolve Z2R-006, SoD, verified evidence, reversals/refunds and exact balances. |
| CMP-015 | Tasks/workflow | Task and AutomationWorkflow models/actions | ADAPT | Add durable workflow run, exact subject version, escalation and dead-letter evidence. |
| CMP-016 | Email/WhatsApp/helpdesk | Rich message/webhook/consent/support surfaces and tests | ADAPT | Prove provider truth, identity/thread integrity, retention and unknown states. |
| CMP-017 | Documents/files | Document model/content/checksum, routes/UI/file policy | REBUILD | Create quarantine, scan, version, object storage, signed download, hold/disposition. |
| CMP-018 | Reporting/KPIs/exports | Dashboard/accounting/analytics/export surfaces | ADAPT | Add metric definitions, lineage, as-of/freshness, scope and export purpose limits. |
| CMP-019 | AI/revenue intelligence | Google AI dependency, AI endpoints, provider settings and tests | DEFER | Retain assistive code; require use-case/data policy, evaluation and company provider activation. |
| CMP-020 | Marketing/advertising | Campaign and connector models/actions/UI | DEFER | Keep out of required Release 1 until owner scope and providers are approved. |
| CMP-021 | External provider integrations | WhatsApp, email, payments, ZATCA, Ejar, TikTok, Sentry, AI | DEFER | Company-owned accounts, contracts, locations, secrets, failure tests and exit plans required. |
| CMP-022 | API and Server Action surface | 129 APIs; 162 action contracts; 59 direct-test gaps | ADAPT | Add explicit authority and direct tests; retire obsolete routes. |
| CMP-023 | Audit/idempotency/outbox | AuditLog, DealEvent, Government/Revenue outboxes and tests | ADAPT | Normalize evidence schema, immutability, replay and retention across domains. |
| CMP-024 | Sentinel/observability | Incident, heartbeat, command-center code and dedicated regressions | KEEP | Retain repository capability; provider alerting and Production monitoring remain deferred. |
| CMP-025 | Backup/restore tooling | Approval-gated scripts and successful isolated CI drill | KEEP | Retain non-Production controls; representative/provider recovery remains separate. |
| CMP-026 | Visual surfaces | 43 pages, 8 tabs, 6 overlays; historical evidence only for target purposes | NOT_PROVEN | Produce and approve independent references before any visual implementation claim. |
| CMP-027 | Legacy multi-company SaaS | Registration, subscription plans/billing/limits/upgrades/agent leasing residues | RETIRE | Remove product behavior after dependency/data review; retain tenant partition only. |
| CMP-028 | Current migrations/data plane | Baseline + domain/G3 migrations; Production application not verified | DEFER | Design migration packages after target schema decisions; no Production application. |
| CMP-029 | Privacy/retention/rights | Masking and retention code signals exist; approved policy/records absent | ADAPT | Approve catalog/RoPA/notices/rights/retention/hold and implement direct tests. |
| CMP-030 | Legal/compliance templates | Compliance/ZATCA/Ejar surfaces exist; licenses/templates/signatories unapproved | DEFER | Owner/legal evidence required; no correctness or filing claim. |
| CMP-031 | Critical staging browser journeys | Six E2E files; G8 condition remains unverified | MISSING | Create deterministic identities, fixtures and critical journey evidence. |
| CMP-032 | Production activation | G8 activation evidence file absent; six conditions unverified | DEFER | Separate owner-authorized activation package after all prerequisites. |

## 3. Rules

- `KEEP` is limited to directly evidenced repository/operational controls, not entire business domains.
- A domain can contain both reusable `ADAPT` structures and `MISSING` target aggregates.
- `RETIRE` requires reference, data, migration, and rollback review before deletion.
- `DEFER` does not authorize provider activation or Production work.
- `NOT_PROVEN` blocks closure claims but does not presume the implementation is defective.
