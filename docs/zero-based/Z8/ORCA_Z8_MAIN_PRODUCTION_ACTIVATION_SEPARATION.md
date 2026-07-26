# ORCA Z8 — Main and Production Activation Separation

- **Document ID:** ORCA-Z8-ACTIVATION-001
- **Version:** 1.0
- **Date:** 2026-07-25
- **Status:** `FINAL SEPARATION CONTRACT`
- **Main merge authorized:** `false`
- **Production action authorized:** `false`

## 1. Boundary

Closing Z8 completes the zero-based planning and execution-package register on `work/orca-zero-based-execution-20260721`. It does not authorize merging that branch or any execution package into `main`, deploying an artifact, operating on Production data, activating providers or changing Production configuration.

## 2. Four separate decisions

| Decision | Meaning | Inherited from prior decision? |
|---|---|---|
| Package activation | begin one bounded non-production package on an exact base SHA | No |
| Central merge | merge one verified package PR into the zero-based central branch | No; exact PR/head required |
| `main` merge | integrate one accepted release candidate into `main` | Never; separate single-use owner decision |
| Production release/action | deploy or perform one exact Production/external action | Never; separate single-use owner decision |

Approval of an implementation, Preview, Staging test, UAT result or central merge cannot substitute for either `main` or Production authority.

## 3. Required `main` merge record

A future `main` authorization must name:

- exact source branch, PR and final head SHA;
- exact destination and current destination SHA;
- complete diff and included package closure records;
- all required CI, security, build, visual, operational and UAT evidence;
- accepted residual risks and expiry;
- migration/data/provider/credential implications;
- merge method, conflict/rebase decision and rollback/forward-fix implications;
- owner identity, recorded decision and single-use validity.

Any head/base movement invalidates the record until revalidated.

## 4. Required Production record

A future Production authorization must name:

- exact accepted artifact/SHA and environment;
- deployment or external action steps;
- configuration class without exposing secret values;
- database/schema/data/provider effects and separate approvals;
- health, integrity, security and business thresholds;
- observation window and decision owner;
- rollback, feature-disable or forward-fix plan and limitations;
- backup/restore and reconciliation evidence;
- incident authority, communications and stop triggers;
- post-release evidence and final closure responsibility.

## 5. Prohibited inference

The following do not mean Production readiness or authorization:

- ORCA CI or Vercel success;
- a green Preview deployment;
- Foundation G3–G8 success;
- Z0–Z8 closure;
- a completed Runtime package;
- a passed migration rehearsal or isolated recovery drill;
- owner approval of a visual reference;
- provider credentials existing somewhere;
- historic Production operation.

Each is evidence for a later decision, not the decision itself.

## 6. Activation package EXEC-014

EXEC-014 remains `BLOCKED`. It may become `EVIDENCE_READY` only after:

1. Release-1 scope is fixed;
2. all required P0/P1 packages are closed or formally accepted with expiry;
3. approved visual surfaces and critical journeys are verified;
4. provider, privacy, legal, financial and support decisions are complete for enabled scope;
5. representative recovery, E2E, UAT, training and handover evidence passes;
6. exact migration/data/provider/credential actions are separately decided;
7. one release candidate artifact is frozen;
8. the owner issues exact `main` and Production decisions.

## 7. Current result

```text
ZERO-BASED CENTRAL MERGE AUTHORITY: LIMITED TO Z8 DOCUMENTATION PR AFTER CHECKS
MAIN MERGE AUTHORIZED: NO
MIGRATION OR DATA ACTION AUTHORIZED: NO
PROVIDER OR CREDENTIAL ACTION AUTHORIZED: NO
PAID PURCHASE AUTHORIZED: NO
PRODUCTION RELEASE OR EXTERNAL ACTION AUTHORIZED: NO
```

## Final post-capacity closure reconciliation — 2026-07-26

- Final reconciliation base: `ff47997382d9032a6e1c27b9488884282867479f` after PR `#123` isolated administrative closure metadata from the sealed EXEC-003 digest.
- Superseded Z8 PR `#99` / `a82bcc937a8f69196b96f742801fe20f2eecaf99` remains closed without merge.
- Historical PR `#102` is not reused as final Vercel evidence.
- Registered execution packages: `14`; Z7 gaps covered: `32/32`; packages in execution: `0`.
- Z0–Z8 are closed as planning, assessment and execution-authorization gates; no package starts automatically.
- Fresh ORCA CI and Vercel success are required on this same non-empty final head before merge.
- `main`, Production, data, Prisma/Migrations, providers, secrets, accounts and purchases remain unauthorized.

