# ORCA CENTRAL BASELINE REPORT

## التقرير المركزي النهائي لخطة أساس ORCA CRM

- **Document ID:** ORCA-CBR-001
- **Version:** 3.1 — G0–G8 Foundation Closed
- **Repository:** `ali599115225/orca_crm`
- **Authority:** authoritative central foundation source of truth
- **Final foundation status:** `PASS / CLOSED`
- **Operating model:** `VERIFIED — SINGLE INDEPENDENT COMPANY`
- **Integration ownership:** `COMPANY OWNER`
- **Repository foundation verdict:** `GO`
- **Production launch verdict:** `CONDITIONAL_GO`
- **Production GO authorized:** no
- **Automatic Production action authorized:** no
- **Owner release instruction required:** yes
- **Next authorized state:** `CONTROLLED_ACTIVATION_PLANNING_ONLY`
- **Functional G8 merge SHA:** `edee394d4a68d759b2a1fff4376949056cda960d`
- **Observed main baseline:** `f7af072c689178d397019648ab5c21336ab259b6`
- **Production action performed by foundation program:** none

## 1. Final executive decision

The ORCA G0–G8 foundation plan is closed at repository level.

The repository is coherent, reproducible, and protected by executable governance, architecture, authorization, page/operational contracts, security, quality, operations, recovery, remediation, and final-decision gates.

No current repository condition requires `NO_GO`.

Production activation remains separate because the required activation evidence has not been produced. The final current decision is:

> **CONDITIONAL_GO — the foundation is closed; continue controlled activation planning only.**

This report does not authorize:

- merge into `main`;
- Production deployment or traffic switch;
- Production migration or backfill;
- constraints/index validation;
- RBAC enforcement enablement;
- Production backup or restore;
- external-provider activation;
- environment, secret, domain, or data changes.

A future Production `GO` still requires complete activation evidence and a separate explicit owner instruction.

## 2. Governing operating model

| Item | Controlling decision |
|---|---|
| Business model | `VERIFIED — SINGLE INDEPENDENT COMPANY` |
| Current platform model | Internal company operating platform |
| SaaS multi-company rental | `OUT OF SCOPE` |
| Tenant persistence | Retained temporarily as company/security partition |
| Internal organization and RBAC | Required |
| External integration ownership | `COMPANY OWNER` |
| Technical responsibility | Integration-ready paths, adapters, signature verification, and safe disconnected states |
| Production provider accounts | Company responsibility; not supplied by the foundation program |
| Developer-owned Production credentials | Prohibited |
| License assumptions | No license assumed without official evidence |

Historical SaaS structures remain only for compatibility, audit, and recovery. They are not current commercial capabilities.

`NOT_CONFIGURED` is an acceptable provider state only when the system fails safely and does not claim connectivity.

## 3. Evidence authority

Evidence is accepted in this order:

1. approved operating-model and integration-ownership decisions;
2. current executable source;
3. blocking CI, security, test, recovery, and build evidence;
4. current stage ledger, architecture records, and closure reports;
5. live provider inspection for provider-controlled facts;
6. archived reports as historical context only.

Historical reports, screenshots, filenames, or earlier agent statements cannot override current executable evidence.

## 4. Final stage ledger

The machine-readable authority is:

```text
ORCA_FOUNDATION_STAGE_LEDGER.json
```

| Stage | Scope | Result |
|---|---|---|
| G0 | Governance & Operating Model | PASS / CLOSED |
| G1 | Evidence Integrity | PASS / CLOSED |
| G2 | Repository & Branch Reconciliation | PASS / CLOSED |
| G3 | Architecture, Organization, RBAC & Data Safety | PASS / CLOSED |
| G4 | Page & Operational Contracts | PASS / CLOSED |
| G5 | Security & Quality | PASS / CLOSED |
| G6 | Operations, Recovery & Reliability | PASS / CLOSED |
| G7 | Remediation Reconciliation & Closure | PASS / CLOSED |
| G8 | Final Foundation Gate | PASS / CLOSED |

The formal sequence is:

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
- prohibition of Developer-owned Production credentials.

### G1 — Evidence integrity

Current implementation and executable evidence supersede contradictory historical claims. `PARTIAL`, `NOT_PROVEN`, and `CONFLICTING` cannot be converted to PASS without current evidence or an explicit terminal decision.

### G2 — Repository and branches

The accepted process uses:

- a central integration branch;
- scoped work branches;
- required PR checks;
- CodeQL;
- Vercel runtime/build evidence;
- non-force reconciliation;
- unchanged `main` during foundation closure.

The stale unmerged G8 draft on `work/orca-foundation-plan-20260721` is superseded historical work and is explicitly excluded from merge.

## 6. G3 result

G3 established:

- the single-company architecture contract;
- organization units and assignments;
- typed permission registry;
- role assignments and scoped access;
- central `AccessContext` resolution;
- database-backed default-deny authorization;
- audit-only legacy/new comparison;
- progressive dual-allow enforcement;
- trusted-job authorization;
- legacy SaaS disablement without destructive historical-data deletion;
- guarded migration, backfill, constraints/index, validation, and rollback tooling.

No Production migration, backfill, constraint validation, RBAC enablement, or data write was executed.

## 7. G4 result

G4 registered **359** current contracts:

- 43 pages;
- 129 APIs;
- 162 Server Actions;
- 8 tab sets;
- 6 overlays;
- route loading, error, and layout states.

Evidence classification remains explicit:

- 300 contracts with direct current test references;
- 59 without direct current test references;
- 19 retained visual closures;
- 37 open visual decisions;
- one disabled legacy visual surface.

A build or historical screenshot is not final visual proof.

## 8. G5 result

Permanent blocking controls include:

- deterministic Node.js 24 installation;
- Prisma validation and generation;
- Production safety gate;
- Production dependency audit;
- TypeScript typecheck;
- executable foundation, regression, and acceptance tests;
- production build;
- CodeQL Actions, Python, and JavaScript/TypeScript.

Current security result:

- dependency audit at configured threshold: zero findings;
- runtime Critical findings: 0;
- runtime High findings: 0;
- accepted Low static signal: 1;
- API classifications: 129/129;
- APIs with undetected security evidence: 0;
- focused/skipped/TODO tests in accepted tree: 0.

Direct-test gaps:

| Priority | Count |
|---|---:|
| P0 security-critical | 11 |
| P1 mutation | 8 |
| P1 sensitive read | 6 |
| P2 read | 16 |
| P3 UI | 16 |
| P4 source state | 2 |

The 25 P0/P1 gaps require direct evidence before unrestricted Production launch unless an approved narrower launch scope excludes them.

## 9. G6 result

G6 established:

- scheduled Cron readiness: 6/6;
- health contracts: 4/4;
- plan-only backup and restore by default;
- explicit execution and approval gates;
- dump integrity verification and SHA-256 manifests;
- no automatic archive deletion;
- structural refusal of Production restore;
- isolated PostgreSQL backup/restore drill using synthetic data.

The CI drill proves repository tooling, not Production RTO/RPO.

Provider recovery window, representative restore, Production RTO/RPO, storage lifecycle/KMS ownership, and scheduled logical backups remain activation work.

## 10. G7 result

G7 supplied the missing mandatory reconciliation gate between G6 and G8.

Final reconciliation:

- curated decisions: 21;
- item-level visual decisions: 37;
- total terminal decisions: 58;
- direct-test gaps: 59;
- P0/P1 Production blockers: 25;
- lower-priority deferred gaps: 34;
- Production blocker categories: 6;
- unowned High/Critical items: 0;
- reconciliation blockers: 0.

Allowed terminal states are:

- `CLOSED`;
- `DEFERRED_WITH_APPROVAL`;
- `OUT_OF_SCOPE`;
- `ACCEPTED_RESIDUAL_RISK`;
- `PRODUCTION_ACTIVATION_BLOCKER`.

## 11. G8 final machine decision

The executable authority is:

```text
scripts/g8-final-foundation-gate.mjs
```

The verified result from ORCA CI run `29853746496` was:

```text
g8RepositoryStageResult = PASS / CLOSED
repositoryFoundationVerdict = GO
productionLaunchVerdict = CONDITIONAL_GO
productionGoAuthorized = false
automaticProductionActionAuthorized = false
ownerReleaseInstructionRequired = true
nextAuthorizedState = CONTROLLED_ACTIVATION_PLANNING_ONLY
repositoryBlockers = 0
unverifiedReleaseConditions = 6
```

The retained evidence artifact digest is:

`sha256:5db785f8b1e33f5e76f19869460a2991c1d31a1ffcd5044bef93903c7702b02f`

Functional head `6c68c13b96c8c36dd924a43f5242c7b344d5fa4e` passed ORCA CI, the isolated recovery drill, production build, and CodeQL. PR #70 merged into central at `edee394d4a68d759b2a1fff4376949056cda960d`.

## 12. Production activation evidence

The only file that may promote Production from `CONDITIONAL_GO` to `GO` is:

```text
docs/reports/activation/ORCA_PRODUCTION_ACTIVATION_EVIDENCE.json
```

A valid package must:

- request GO;
- identify one approved central SHA and resulting `main` SHA;
- identify a Production deployment;
- carry approval evidence;
- verify all 14 required checks with durable references and timestamps;
- contain no database URLs, passwords, API keys, tokens, private keys, or private data.

Missing or invalid evidence produces `CONDITIONAL_GO`, never implicit `GO`.

## 13. Six activation-condition groups

1. owner approval and protected `main` merge;
2. G3 Production data-plane activation and staged RBAC;
3. provider recovery, representative restore, and Production RTO/RPO;
4. launch-critical direct tests and visual proof;
5. deterministic critical staging E2E journeys;
6. provider/secret decisions, Production health, and rollback.

## 14. Vercel evidence

The automatic Vercel request for G8 merge `edee394d4a68d759b2a1fff4376949056cda960d` was rejected by the provider's `build-rate-limit`, not by compilation or application failure.

The last successful Git Preview was `dpl_GMiz75v52XCgkUqt8vRuAK7NtJRL` at commit `20b9c59c4fdf8a388f08ceaa895ca98d2f0a6f5d`, state `READY`.

Changes after that Preview are limited to foundation governance, reports, ledgers, scripts, tests, CI configuration, package scripts, and the Vercel branch-suppression rule. There is no application Runtime source change, Prisma schema/migration change, dependency-version/lockfile change, or build-command change. The complete final tree independently passed TypeScript and the production build.

Repeated automatic Previews are suppressed for:

```text
work/orca-foundation-plan-*
work/orca-g*-*
```

Central and `main` deployments remain enabled. No manual Production deployment was used to bypass the quota.

## 15. Final Production conditions

Production remains conditional on:

1. explicit owner approval;
2. approved central SHA and protected `main` merge;
3. restorable recovery point;
4. representative migration rehearsal;
5. reviewed backfill dry-run;
6. zero-violation constraints/index preflight and controlled validation;
7. representative RBAC audit and staged enablement;
8. provider recovery window and measured Production RTO/RPO;
9. direct evidence for launch-critical P0/P1 contracts;
10. current launch visual proof;
11. deterministic critical staging E2E;
12. secrets rotation and company provider decisions;
13. Production deployment identity and health verification;
14. rollback target and verified rollback procedure.

## 16. Final verdict

### Foundation plan

**PASS / CLOSED**

### Repository foundation

**GO**

The repository is ready for controlled activation planning.

### Production launch

**CONDITIONAL_GO**

Production remains prohibited until activation evidence is verified for one approved release and the owner gives an explicit instruction.

### Next authorized state

**CONTROLLED_ACTIVATION_PLANNING_ONLY**

## 17. Supersession notice

This version supersedes intake-era statuses, old P0 findings, GitHub-App limitations, historical build failures, and pre-G3 judgments in earlier versions. Those records remain in Git history only as historical context. Current authority is the G0–G8 ledger, G3–G8 closure reports, current source, and executable CI evidence.
