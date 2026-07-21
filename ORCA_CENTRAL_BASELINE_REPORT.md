# ORCA CENTRAL BASELINE REPORT

## التقرير المركزي النهائي لخطة أساس ORCA CRM

- **Document ID:** ORCA-CBR-001
- **Version:** 3.0 — G8 Final Foundation Gate
- **Repository:** `ali599115225/orca_crm`
- **Authority:** authoritative central foundation source of truth
- **Operating model:** `VERIFIED — SINGLE INDEPENDENT COMPANY`
- **Integration ownership:** `COMPANY OWNER`
- **Repository foundation verdict:** `GO`
- **Production launch verdict:** `CONDITIONAL_GO`
- **Production GO authorized:** no
- **Automatic Production action authorized:** no
- **Next authorized state:** `CONTROLLED_ACTIVATION_PLANNING_ONLY`
- **Central G8 start SHA:** `6d63d21423692d404c2e428fa0e385d3c6be5ea5`
- **Observed main baseline:** `f7af072c689178d397019648ab5c21336ab259b6`
- **Production action performed by foundation program:** none

## 1. Executive decision

The ORCA repository foundation is coherent, reproducible, and protected by executable governance, architecture, authorization, contract, security, quality, operations, recovery, and remediation gates.

No current repository condition requires `NO_GO`.

Production activation evidence is incomplete and deliberately separate from repository foundation closure. The current final decision is:

> **CONDITIONAL_GO — close the foundation plan and continue controlled activation planning only.**

This report does not authorize:

- merge of the foundation program into `main`;
- Production deployment or traffic switch;
- Production migration or backfill;
- constraint/index creation or validation;
- RBAC enforcement enablement;
- Production backup or restore;
- external provider activation;
- environment, secret, domain, or data change.

A future `GO` decision still requires a separate explicit owner release instruction.

## 2. Governing operating model

| Item | Controlling decision |
|---|---|
| Business model | `VERIFIED — SINGLE INDEPENDENT COMPANY` |
| Current platform model | Internal company operating platform |
| SaaS multi-company rental | `OUT OF SCOPE` |
| Tenant persistence | Retained temporarily as company/security partition |
| Internal organization and RBAC | Required |
| External integration ownership | `COMPANY OWNER` |
| Technical provider responsibility | Integration-ready paths, adapters, signature verification, and safe disconnected states |
| Production provider accounts | Not supplied or configured by the foundation program |
| Developer-owned Production credentials | Prohibited |
| License assumptions | No license assumed without official evidence |

Historical SaaS structures remain only for compatibility, audit, and recovery. They are not current commercial capabilities.

A provider-backed feature may remain `NOT_CONFIGURED` when it fails safely and does not claim connectivity.

## 3. Evidence authority

Evidence is accepted in this order:

1. approved operating-model and integration-ownership decisions;
2. current executable source;
3. current blocking CI, security, test, and build evidence;
4. current stage ledgers, architecture records, and closure reports;
5. live provider inspection for provider-controlled facts;
6. archived reports as historical context only.

A historical report, screenshot, filename, previous agent statement, or test-name count cannot override current executable evidence.

## 4. Foundation stage ledger

The machine-readable authority is:

```text
ORCA_FOUNDATION_STAGE_LEDGER.json
```

| Stage | Scope | Result | Primary authority |
|---|---|---|---|
| G0 | Governance & Operating Model | PASS / CLOSED | Central plan and execution addendum |
| G1 | Evidence Integrity | PASS / CLOSED | Central plan and execution addendum |
| G2 | Repository & Branch Reconciliation | PASS / CLOSED | Execution addendum and G7 closure |
| G3 | Architecture, Organization, RBAC & Data Safety | PASS / CLOSED | `docs/reports/foundation/ORCA_G3_FINAL_CLOSURE.md` |
| G4 | Page & Operational Contracts | PASS / CLOSED | `docs/reports/foundation/ORCA_G4_FINAL_CLOSURE.md` |
| G5 | Security & Quality | PASS / CLOSED | `docs/reports/foundation/ORCA_G5_FINAL_CLOSURE.md` |
| G6 | Operations, Recovery & Reliability | PASS / CLOSED | `docs/reports/foundation/ORCA_G6_FINAL_CLOSURE.md` |
| G7 | Remediation Reconciliation & Closure | PASS / CLOSED | `docs/reports/foundation/ORCA_G7_FINAL_CLOSURE.md` |
| G8 | Final Foundation Gate | PASS / CLOSED candidate | `docs/reports/foundation/ORCA_G8_FINAL_CLOSURE.md` |

The formal execution sequence is:

```text
G0 → G1 → G2 → G3 → G4 → G5 → G6 → G7 → G8
```

Direct transition from G6 to G8 is prohibited.

## 5. G0–G2 result

### G0 — Governance

Closed decisions include:

- one independent operating company;
- internal company platform rather than current multi-company SaaS;
- retained `tenantId` as a security partition;
- company ownership of provider accounts, credentials, subscriptions, licenses, and approvals;
- prohibition of developer-owned Production credentials.

### G1 — Evidence integrity

The foundation distinguishes:

- intended truth;
- current implementation truth;
- runtime/provider truth;
- historical evidence.

Current source and executable evidence supersede contradictory archived claims.

### G2 — Repository and branches

The accepted process uses:

- protected central integration branch;
- scoped work branches;
- required PR checks;
- CodeQL;
- Vercel Preview/runtime evidence;
- non-force fast-forward reconciliation;
- unchanged `main` during foundation closure.

Historical conflicts are terminally reconciled through G7 rather than left as ambiguous `CONFLICTING` entries.

## 6. G3 — Architecture, organization, RBAC, and data safety

G3 establishes:

- single-company operational mode with retained Tenant security partition;
- typed permission registry;
- organization units and assignments;
- role assignments and scoped permissions;
- central `AccessContext` resolution;
- database-backed default-deny authorization;
- Tenant-subordinate branch, department, team, self, and resource scopes;
- audit-only legacy/new policy comparison;
- progressive `legacy_allow AND rbac_allow` enforcement;
- trusted-job authorization;
- disablement of legacy SaaS entry points without destructive historical-data deletion;
- additive migration, guarded backfill, constraints/index proposals, preflight, validation, and rollback tooling.

Repository closure does not prove Production activation. No Production migration, backfill, constraint validation, RBAC enablement, or data write was performed by the foundation program.

## 7. G4 — Page and operational contracts

G4 registers **359** current contracts:

- 43 pages;
- 129 APIs;
- 162 Server Actions;
- 8 tab sets;
- 6 overlays;
- route loading, error, and layout states.

Evidence status:

- 300 contracts have direct current test references;
- 59 contracts do not have direct current test references;
- 19 visual contracts are retained closed;
- 37 visual contracts remain partial, documented-issue, not-proven, or historical-only;
- one legacy visual surface is disabled.

A page is not launch-closed merely because it builds or has a historical screenshot.

## 8. G5 — Security and quality

Permanent blocking controls include:

- deterministic Node.js 24 installation;
- Prisma validation and generation;
- Production safety gate;
- Production dependency audit;
- TypeScript typecheck;
- executable foundation and regression contracts;
- acceptance tests;
- production build;
- CodeQL for Actions, Python, and JavaScript/TypeScript;
- Vercel runtime/build evidence.

Current security result:

- Production dependency audit at configured threshold: zero findings;
- current runtime Critical findings: 0;
- current runtime High findings: 0;
- retained accepted Low static signal: 1;
- API security-boundary classifications: 129/129;
- APIs with undetected security evidence: 0;
- focused, skipped, or TODO tests in accepted tree: 0.

Direct-test gaps:

| Priority | Count |
|---|---:|
| P0 security-critical | 11 |
| P1 mutation | 8 |
| P1 sensitive read | 6 |
| P2 read | 16 |
| P3 UI | 16 |
| P4 source state | 2 |

The 25 P0/P1 gaps require direct evidence before unrestricted Production launch unless an approved narrower launch scope excludes the relevant capabilities.

## 9. G6 — Operations, recovery, and reliability

G6 establishes:

- scheduled Cron readiness: 6/6;
- health contracts present: 4/4;
- plan-only backup by default;
- explicit backup execution and Production approval gates;
- PostgreSQL custom-format dump integrity verification;
- SHA-256 manifests;
- no automatic archive deletion;
- plan-only restore by default;
- structural refusal of Production restore;
- refusal of source-target equality;
- isolated restore without destructive clean/drop operations;
- actual PostgreSQL backup/restore drill in CI using synthetic data.

The CI drill proves repository recovery tooling. It does not prove current Production recovery objectives.

Unverified Production recovery work includes:

- current Neon plan and recovery/history window;
- snapshot schedule and retention;
- representative restored Production-like branch/database;
- representative integrity counts;
- application readiness after restore;
- Production RTO and RPO;
- object-storage lifecycle, access policy, KMS ownership, and scheduled logical backups.

## 10. G7 — Remediation reconciliation

G7 corrected the missing governance step between G6 and G8.

Final reconciliation:

- curated controlling decisions: 21;
- generated item-level visual decisions: 37;
- total terminal decisions: 58;
- direct-test gaps carried: 59;
- P0/P1 Production blockers: 25;
- lower-priority deferred gaps: 34;
- Production activation blocker categories: 6;
- unowned High/Critical items: 0;
- blocking reconciliation findings: 0.

Allowed terminal statuses are:

- `CLOSED`;
- `DEFERRED_WITH_APPROVAL`;
- `OUT_OF_SCOPE`;
- `ACCEPTED_RESIDUAL_RISK`;
- `PRODUCTION_ACTIVATION_BLOCKER`.

No item remains terminally `PARTIAL`, `MISSING`, `CONFLICTING`, `NOT_PROVEN`, `UNKNOWN`, or `OPEN`.

## 11. G8 — Final foundation gate

The executable authority is:

```text
scripts/g8-final-foundation-gate.mjs
```

Current expected machine decision:

```text
g8RepositoryStageResult = PASS / CLOSED
repositoryFoundationVerdict = GO
productionLaunchVerdict = CONDITIONAL_GO
productionGoAuthorized = false
automaticProductionActionAuthorized = false
ownerReleaseInstructionRequired = true
nextAuthorizedState = CONTROLLED_ACTIVATION_PLANNING_ONLY
```

### Repository foundation: GO

`GO` at repository-foundation level means:

- G0–G7 are closed;
- G7 reconciliation is clean;
- no High/Critical current runtime risk is open;
- API, Cron, health, audit, typecheck, tests, recovery, CodeQL, and build controls are current;
- all known remediation items have owner, evidence, target, dependencies, and terminal decision;
- no repository blocker remains.

It does not mean Production has been activated.

### Production launch: CONDITIONAL_GO

Production remains conditional on six groups:

1. owner approval and protected `main` merge;
2. G3 Production data-plane activation and staged RBAC;
3. provider recovery, representative restore, and Production RTO/RPO;
4. launch-critical direct tests and visual proof;
5. deterministic critical staging browser journeys;
6. provider/secret decisions, Production health, and rollback.

## 12. Production activation evidence

The only file that may promote the Production verdict to `GO` is:

```text
docs/reports/activation/ORCA_PRODUCTION_ACTIVATION_EVIDENCE.json
```

It is intentionally absent during foundation repository closure.

A valid package must:

- request GO;
- identify one approved central SHA and resulting `main` SHA;
- identify a Production deployment;
- carry approval evidence;
- verify all 14 required activation checks with durable references and timestamps;
- contain no database URLs, connection strings, passwords, API keys, tokens, private keys, or private data.

Missing or invalid evidence produces `CONDITIONAL_GO`, never implicit `GO`.

Even a valid package does not execute Production. A separate explicit owner release instruction remains required.

## 13. External integrations

The technical deliverable includes adapters, routes, webhook boundaries, signature verification, mocks, and safe disconnected states.

Actual provider accounts and Production credentials belong to the operating company. Before enabling a provider, evidence must record:

- account owner;
- contract/license status;
- secure credential location;
- callback/webhook domain;
- signature/auth verification;
- test transaction/message evidence;
- failure and rollback behavior;
- data-retention responsibility.

`NOT_CONFIGURED` is acceptable only when the system fails safely and does not claim connectivity.

## 14. CI/CD and Vercel

Every foundation PR runs:

- ORCA CI;
- G3–G8 executable gates;
- dependency audit and TypeScript;
- regression and acceptance suites;
- production build;
- isolated PostgreSQL recovery drill;
- CodeQL.

Repeated automatic Previews are suppressed for:

```text
work/orca-foundation-plan-*
work/orca-g*-*
```

Central and `main` Git deployments remain enabled. This avoids quota exhaustion without bypassing release validation or creating a manual Production deployment.

## 15. Final conditions before Production GO

The current Production launch remains conditional on:

1. explicit owner Production approval;
2. approved central SHA and protected merge to `main`;
3. restorable recovery point;
4. representative migration rehearsal;
5. reviewed backfill dry-run;
6. zero-violation constraints/index preflight and controlled validation;
7. representative RBAC audit and staged enablement;
8. provider recovery window and measured Production RTO/RPO;
9. direct behavioral evidence for launch-critical P0/P1 contracts;
10. current visual proof for launch-critical pages and states;
11. deterministic critical staging E2E journeys;
12. secrets rotation and company provider decisions;
13. Production deployment identity and health verification;
14. rollback target and verified rollback procedure.

## 16. Final verdict

### Foundation plan

**PASS / CLOSED candidate**

G0 through G8 are structurally complete. Final authority is established after G8 PR checks, central merge, branch reconciliation, and unchanged-main evidence.

### Repository foundation

**GO**

The repository is ready for controlled activation planning.

### Production launch

**CONDITIONAL_GO**

Production remains prohibited until the activation conditions are verified for one approved release and the owner provides an explicit release instruction.

### Next authorized state

**CONTROLLED_ACTIVATION_PLANNING_ONLY**

## 17. Supersession notice

This version supersedes intake-era statuses, blockers, GitHub-App limitations, old build failures, and pre-G3 remediation judgments in earlier versions of this report. Those records remain available in Git history as historical context, but current decisions are governed by the G0–G8 ledger, G3–G8 closure records, current source, and executable CI evidence.
