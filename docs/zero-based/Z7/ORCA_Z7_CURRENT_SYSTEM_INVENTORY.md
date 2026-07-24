# ORCA Z7 — Current-System Inventory

- **Document ID:** ORCA-Z7-INVENTORY-001
- **Version:** 1.1
- **Date:** 2026-07-25
- **Status:** `COMPLETE / READ-ONLY REPOSITORY INVENTORY WITH SECURITY DELTA`
- **Assessed SHA:** `75e0e25ed0247c7da2a4720c6e8aeb27f8bba959`
- **Final publication base after security delta:** `01cc24f5fd2d0cb0b3259fc922297942ee3fb90b`

## 1. Repository scale

| Measure | Observed |
|---|---|
| Tracked files | 1,325 |
| Tracked bytes | 29,361,276 |
| Source files | 532 |
| Source lines | 108,716 |
| Next page routes | 43 |
| API routes | 129 |
| Server Action files | 36 |
| Registered Server Action contracts | 162 |
| Test files | 201 |
| GitHub workflows | 5 |
| Prisma models | 84 |
| Prisma enums | 31 |
| Prisma migration files including lock | 8 |
| Environment variable names referenced | 96 |

## 2. Current contract and evidence inventory

| Measure | Observed | Interpretation |
|---|---|---|
| Current contracts | 359 | Pages, APIs, Server Actions, tabs, overlays, and route states registered. |
| Functional evidence referenced | 300 | A current test reference exists; semantic completeness remains separately assessed. |
| Functional `NOT_PROVEN` | 59 | Direct current test reference not detected. |
| API auth evidence | 124 | Direct or transitive authentication evidence detected. |
| Public/signed/cron boundaries requiring review | 5 | Must retain direct boundary verification. |
| P0/P1 direct-test gaps | 25 | Release-blocking until direct evidence or approved scope removal. |

## 3. Data and domain inventory

The schema contains 84 models and 31 enums. High-signal existing aggregates include:

- identity and partition: `User`, `Tenant`, `AuditLog`;
- customer journey: `Lead`, `Contact`, `Opportunity`, `LeadActivity`;
- inventory and sales: `Project`, `Unit`, `Tour`, `Offer`, `Contract`, `DealPassport`, `DealEvent`;
- finance: `PaymentPlan`, `Installment`, `Invoice`, `PaymentTransaction`, accounts, journals, receipts, commissions;
- workflow and communication: `Task`, `AutomationWorkflow`, `EmailMessage`, WhatsApp connection/message/webhook/consent/opt-out models;
- operations: Sentinel incidents/heartbeats/tasks, government and revenue outboxes;
- documents: one `Document` model with checksum and stored content fields;
- marketing and AI/revenue intelligence models.

Material target structures not observed as dedicated models include an explicit reservation/commitment aggregate, offer-version and approval aggregates, document version/quarantine/legal-hold aggregates, metric-definition/lineage aggregates, and durable workflow-run/approval-subject aggregates.

## 4. Security and quality evidence

- At the original evidence snapshot, Production dependency audit reported **0 vulnerabilities**.
- Full dependency audit reported **1 low-severity development/tooling vulnerability**, with no moderate/high/critical result.
- Direct dependencies: 19; development dependencies: 18; package-lock v3 present.
- CodeQL, Dependabot, TypeScript typecheck, npm audit, Vitest, Playwright configuration, and blocking Build are present.
- No standalone lint script is present.
- 24 dependency specifications use ranges; 13 are pinned/other; 17 packages were reported outdated at evidence time.
- Static runtime scan found one low-risk static inline HTML/style signal; no user input was detected by that scanner.
- Ten tooling review signals remain, primarily child-process and operational-script review items.

### 4.1 Post-assessment security delta

After the repository evidence snapshot was produced, advisory `GHSA-mh99-v99m-4gvg` classified `brace-expansion <=5.0.7` as a high-severity Production dependency finding. The verified Production path was:

```text
@sentry/nextjs 10.67.0
→ @sentry/bundler-plugin-core 5.3.0
→ glob 13.0.6
→ minimatch 10.2.5
→ brace-expansion 5.0.7
```

The delta was closed through PR #93:

- safe override and lockfile version: `brace-expansion 5.0.8`;
- G5 pinned dependency assertion reconciled to `5.0.8`;
- final security head: `bcc3de165395f81197c8dcaeaa9301a7bae3e500`;
- central merge SHA: `01cc24f5fd2d0cb0b3259fc922297942ee3fb90b`;
- ORCA CI #276: `SUCCESS`;
- Vercel deployment `dpl_CRTv2MXheKsgu3VxLnJ731eWHckB`: `READY`;
- no Runtime, UI, Prisma, migration, data, provider, account, secret, `main`, or Production action occurred.

This delta changes dependency evidence only. It does not change the 32 assessment units, component dispositions, or classified product gaps.

## 5. Operational evidence

- Six scheduled Cron contracts were `READY`; two routes were manual or disabled.
- Four health contracts were present; three had direct tests and one legacy compatibility route lacked a direct test reference.
- Current backup/restore tooling is plan-only by default and approval-gated.
- An isolated PostgreSQL backup/restore drill completed successfully in CI.
- Foundation G7 reconciled 58 items: 8 closed, 41 deferred with approval, 1 out of scope, 2 accepted residual risks, and 6 Production activation blockers.
- Foundation G8 judged repository foundation `GO`, but Production `CONDITIONAL_GO`; Production GO and automatic Production action are both false.

## 6. Visual evidence inventory

| Current G4 visual evidence class | Count |
|---|---|
| `NOT_APPLICABLE` | 291 |
| `SOURCE_STATE_PRESENT` | 7 |
| `SOURCE_PRESENT` | 4 |
| `CLOSED_RETAINED` | 19 |
| `PARTIAL` | 11 |
| `PARTIAL_DOCUMENTED_ISSUE` | 3 |
| `NOT_PROVEN` | 3 |
| `HISTORICAL_EVIDENCE_ONLY` | 20 |
| `LEGACY_DISABLED` | 1 |

These are historical/current-source evidence labels, not zero-based target approvals. Z3 records zero owner-approved item-level target references; therefore target visual conformance remains `NOT_PROVEN` until each surface completes its own visual cycle.

## 7. Repository hygiene observations

Tracked output and historical-material families include `.unlighthouse/`, `unlighthouse-report/`, `playwright-report/`, Lighthouse exports, `scratch/`, `ORCA_PAGE_CLOSURE_WORK/`, root-level investigation reports, backup configuration copies, and anomalous quoted-path entries. These are evidence or work products, not Runtime, and should be reviewed for archival/removal rather than silently retained in the product tree.

- One verified governance candidate is not present on central: commit `ed4ea9087b2fe9c6ba1335610080870eb38efd4a` adds only `.github/ISSUE_TEMPLATE/dependency_security.yml` (127 lines) over historical central `b3f1a3ab9c614ce65331ff71b770ff3774ea6489`. It is recorded as a clean-publication candidate, not as current implementation.

## 8. Scope limitations

No live database, Production runtime, provider account, secret value, external subscription, customer record, or environment configuration was inspected. Any claim that depends on those sources remains `DEFER` or `NOT_PROVEN`.
