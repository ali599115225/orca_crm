# ORCA Z8 — Acceptance, Recovery, and Conflict Contract

- **Document ID:** ORCA-Z8-ACCEPT-001
- **Version:** 1.0
- **Date:** 2026-07-25
- **Status:** `FINAL CONTROL CONTRACT`
- **Main merge authorized:** `false`
- **Production action authorized:** `false`

## 1. Activation checklist for any package

Before a package changes a file, record:

1. package ID/version and target gaps;
2. exact central base SHA and dedicated branch;
3. exact allowed paths, modules, surfaces, schemas, fixtures and generated outputs;
4. exclusions and expected maximum files/PRs/migrations/dependencies;
5. owner decisions, visual references, environment/provider/account evidence and recovery prerequisites;
6. shared mutable boundaries and designated owner;
7. required checks, direct tests, drills, visual evidence and signers;
8. stop triggers, rollback limits and preserved-evidence safe state;
9. validity and revocation conditions;
10. confirmation that all sub-authorizations remain false unless separately recorded.

A package in `EVIDENCE_READY` has passed definition review but has not begun execution.

## 2. Universal acceptance gate

A package cannot close unless all applicable items pass on the exact final head:

- clean diff limited to the allowlist;
- installation, schema validation/generation, Production dependency audit, TypeScript and build;
- relevant Foundation, domain, negative, concurrency, replay, failure and reconciliation tests;
- no required check is red, pending, skipped or missing;
- no new unresolved P0/P1 defect or contract contradiction;
- required Preview/Staging evidence uses the approved environment and representative fixtures;
- visual work matches the exact approved reference in structural and detail passes, including RTL, Light/Dark, responsive states, forms, overlays, keyboard and accessibility;
- temporary workflows, flags, credentials, files and access are removed or explicitly retained;
- data, documents, jobs, providers and business truth are reconciled where affected;
- residual gaps and risks are registered with owners and triggers.

## 3. Domain-specific evidence

| Change class | Minimum evidence |
|---|---|
| Authorization/security | direct allow/deny, wrong-scope, stale-role, self-approval and audit tests |
| Concurrency/commitment | deterministic races, duplicate/replay, idempotency, expiry/release and reconciliation |
| Contract/finance | exact version, decimal precision, correction/reversal, evidence authority and balance reconciliation |
| Files/documents | type/size/spoof/malware/quarantine/version/hold/access/download evidence |
| Provider/webhook | signature, timestamp, account scope, replay, unknown outcome, retry and exit/reconciliation |
| Workflow/job | version pinning, retry/dead-letter, timeout, cancellation, removed assignee and replay |
| Reporting/export | definition/version/lineage/as-of/freshness/restatement, permission, purpose, masking and bounds |
| UI visual | approved item-level reference plus independent visual and accessibility verification |
| Operations/recovery | isolated backup/restore, measured targets, integrity reconciliation and runbook execution |

## 4. Recovery model

Every package distinguishes:

- **code rollback:** revert only when compatible with current data and security state;
- **feature disable/configuration:** safe kill switch without falsifying business truth;
- **schema compatibility:** backward-compatible window or forward-only plan;
- **data correction:** append-only correction, compensation or controlled forward fix;
- **provider reconciliation:** compare local requests with verified provider outcomes;
- **evidence preservation:** retain correlation IDs, logs, manifests and approval history.

Rollback is blocked when it would discard valid new data, break a newer schema, lose audit evidence or reintroduce a security defect. Such cases require a separate decision.

## 5. Stop triggers

Execution stops immediately when:

- the base/head or allowlist no longer matches the package;
- a new P0/P1 issue is discovered;
- a required owner decision or visual reference is absent or contradicted;
- a migration/data/provider/credential/purchase/Production action becomes necessary without its sub-authorization;
- a direct test demonstrates cross-scope access, duplicate material effect, false financial/contract/provider success or evidence loss;
- the change budget is exceeded;
- a parallel package edits the same mutable boundary;
- rollback/recovery assumptions are invalidated.

## 6. Parallel conflict matrix

| Boundary | Rule |
|---|---|
| `package.json` / lockfile / CI workflows | one supply-chain owner at a time |
| Prisma schema, migrations and seed/fixtures | one ordered data owner; no parallel migration chains |
| auth/session/permissions and contract registry | EXEC-003 or EXEC-004 designated owner; dependent packages consume stable contracts |
| customer/inventory/offer/contract/finance aggregates | follow roadmap ordering; shared transaction contracts cannot diverge |
| documents/privacy/export | EXEC-010 owns shared evidence and access policies |
| global tokens/shell and shared visual components | one approved visual contract owner; page packages cannot alter global rules implicitly |
| provider adapters, webhooks and environments | one provider-specific package after account evidence |
| release branch, staging fixtures and activation evidence | EXEC-013/014 only after prerequisites |

## 7. Closure record

The final package closure records:

```text
PACKAGE / VERSION
BASE SHA / FINAL HEAD / PR
FINAL DIFF MATCHES ALLOWLIST
CHECKS AND ARTIFACT IDS
CLOSED GAP IDS
RESIDUAL GAP IDS
TEMPORARY ARTIFACT DECISION
DATA / PROVIDER / BUSINESS RECONCILIATION
OWNER ACCEPTANCE OR EXPLICIT NON-PRODUCTION CLOSURE
CLOSED AT UTC
```

No closure record grants authority to the next package.
