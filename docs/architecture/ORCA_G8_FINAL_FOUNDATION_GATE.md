# ORCA G8 Final Foundation Gate

## Purpose

G8 is the final repository gate for the ORCA foundation program. It consumes the closed G0–G7 ledger and the executable G7 reconciliation register, then issues one official decision:

- `NO_GO`;
- `CONDITIONAL_GO`;
- `GO`.

G8 separates three questions:

1. Is the repository foundation closed and reproducible?
2. Are Production activation conditions verified for one approved release SHA?
3. Has the owner explicitly instructed a Production action?

A positive answer to the first question does not imply a positive answer to the second or third.

## Decision meanings

### `NO_GO`

Returned when a repository-level foundation requirement fails, including:

- a prior stage is not `PASS / CLOSED`;
- G7 reconciliation is not `PASS / RECONCILED`;
- a High/Critical item is unowned;
- stage counts or remediation counts drift without review;
- current High/Critical runtime security risk reappears;
- API classification, scheduled Cron readiness, or health contracts regress;
- required foundation tests, audit, typecheck, build, CodeQL, or recovery evidence fail.

`NO_GO` blocks both foundation closure and Production activation planning.

### `CONDITIONAL_GO`

Returned when:

- G0–G7 are closed;
- G7 has zero reconciliation blockers;
- the repository security, quality, operations, and build gates pass;
- one or more Production activation conditions remain unverified.

This decision closes G8 at repository level and authorizes only:

```text
CONTROLLED_ACTIVATION_PLANNING_ONLY
```

It does not authorize a Production deployment, migration, backfill, RBAC enablement, provider connection, backup, restore, secret change, domain change, or data write.

### `GO`

Returned only when:

- all repository requirements pass;
- one approved central SHA is identified;
- the protected merge result on `main` is identified;
- all required Production activation checks are `VERIFIED` with durable evidence and timestamps;
- no credential, connection string, private key, or sensitive value is stored in the evidence package.

Even then, G8 sets:

```text
ownerReleaseInstructionRequired = true
automaticProductionActionAuthorized = false
```

A separate explicit owner instruction remains mandatory.

## Foundation ledger

The authoritative stage ledger is:

```text
ORCA_FOUNDATION_STAGE_LEDGER.json
```

Required order:

```text
G0 Governance & Operating Model
G1 Evidence Integrity
G2 Repository & Branch Reconciliation
G3 Architecture, Organization, RBAC & Data Safety
G4 Page & Operational Contracts
G5 Security & Quality
G6 Operations, Recovery & Reliability
G7 Remediation Reconciliation & Closure
G8 Final Foundation Gate
```

G0–G7 must be `PASS / CLOSED` before G8 can pass.

## G7 evidence required by G8

G8 executes the G7 reconciliation script and requires:

```text
repositoryStatus = PASS
reconciliationStatus = RECONCILED
g8TransitionAllowed = true
blockingFindings = 0
unownedHighPriorityItems = 0
```

Expected current counts:

- total G7 decisions: 58;
- generated visual decisions: 37;
- direct-test gaps: 59;
- P0/P1 direct-test gaps: 25;
- lower-priority gaps: 34;
- Production activation blocker categories: 6.

Count drift is a repository blocker until reviewed.

## Repository safety evidence

G8 also requires current evidence for:

- zero High and zero Critical runtime findings in G5;
- 129/129 API routes classified;
- 6/6 scheduled Cron contracts ready;
- 4/4 health contracts present;
- single-company operating model retained;
- company-owned external-integration policy retained;
- mandatory `G6 → G7 → G8` transition retained.

## Production activation evidence

The only file that may move the current decision from `CONDITIONAL_GO` to `GO` is:

```text
docs/reports/activation/ORCA_PRODUCTION_ACTIVATION_EVIDENCE.json
```

The file is intentionally absent during repository foundation closure.

Required top-level fields:

```json
{
  "schemaVersion": 1,
  "decisionRequest": "GO",
  "approvedCentralSha": "40-character SHA",
  "mainMergeSha": "40-character SHA",
  "productionDeploymentId": "provider deployment identifier",
  "approvedAt": "ISO-8601 timestamp",
  "approvalEvidenceRef": "durable approval reference",
  "checks": {}
}
```

Each required check must contain:

```json
{
  "status": "VERIFIED",
  "evidenceRef": "durable evidence location",
  "verifiedAt": "ISO-8601 timestamp"
}
```

Required checks:

1. `productionApproval`
2. `protectedMainMerge`
3. `productionMigration`
4. `productionBackfill`
5. `constraintsAndIndexes`
6. `rbacStagedEnforcement`
7. `providerRecoveryWindow`
8. `representativeRestore`
9. `productionRtoRpo`
10. `p0p1DirectTests`
11. `launchVisualProof`
12. `criticalStagingE2E`
13. `externalProviderDecisionsAndSecrets`
14. `productionHealthAndRollback`

## Six release-condition groups

### G8-ACT-01 — Owner approval and protected main merge

- explicit owner Production approval;
- approved central SHA;
- protected merge to `main`;
- recorded resulting `main` SHA.

### G8-ACT-02 — G3 Production data plane and staged RBAC

- restorable recovery point before data action;
- isolated migration rehearsal;
- migration deployment/status evidence;
- guarded backfill dry-run and reviewed result;
- zero-violation constraint/index preflight;
- controlled validation;
- representative RBAC audit;
- one-domain-at-a-time enablement and rollback.

### G8-ACT-03 — Provider recovery and Production RTO/RPO

- current Neon plan and recovery/history window;
- snapshot/retention configuration;
- separate representative restored branch/database;
- representative integrity checks;
- application readiness measurement;
- evidence-backed Production RTO/RPO inputs.

The synthetic CI recovery drill remains repository evidence only.

### G8-ACT-04 — Launch-critical direct tests and visual proof

- direct current behavioral evidence for all launch-critical P0/P1 contracts;
- explicit treatment of excluded capabilities in a narrowed launch scope;
- current visual evidence for launch-critical pages, states, forms, overlays, scrolling, RTL, responsive layouts, and supported themes.

### G8-ACT-05 — Deterministic critical staging E2E

- isolated staging database;
- deterministic identities and fixtures;
- approved critical journey list;
- executed browser evidence and failure diagnostics.

Spec discovery or configuration loading is not execution evidence.

### G8-ACT-06 — Providers, secrets, health, and rollback

- company-owned provider accounts and credentials for enabled integrations;
- license/subscription/callback decisions;
- rotation of temporary or exposed credentials;
- deliberate disabled-state evidence for providers not activated;
- Production deployment identity;
- post-deploy liveness/readiness and authenticated checks;
- rollback target, decision path, and verification.

## Sensitive-evidence prohibition

The activation evidence file must never contain:

- database connection strings;
- `DATABASE_URL` or `DIRECT_URL` values;
- passwords;
- API keys or tokens;
- private keys;
- customer or employee private data;
- database dumps or dump contents.

It stores references to secure evidence, not the secrets or data themselves.

## Executable outputs

Every G8 CI run produces:

```text
artifacts/g8-final-foundation-gate.json
artifacts/g8-final-foundation-gate.md
```

The JSON is the machine decision. The Markdown is the readable summary.

## Change rule

Any change to:

- stage order or closure status;
- decision semantics;
- G7 expected counts;
- release-condition groups;
- activation evidence fields or checks;
- sensitive-evidence policy;
- GO/CONDITIONAL_GO/NO_GO logic;

must update:

- this document;
- `ORCA_FOUNDATION_STAGE_LEDGER.json`;
- `scripts/g8-final-foundation-gate.mjs`;
- `tests/foundation/g8-final-foundation-gate.test.ts`;
- `ORCA_CENTRAL_BASELINE_REPORT.md`;
- `docs/reports/foundation/ORCA_G8_FINAL_CLOSURE.md`;
- ORCA CI.

No document-only edit may silently promote `CONDITIONAL_GO` to `GO`.
