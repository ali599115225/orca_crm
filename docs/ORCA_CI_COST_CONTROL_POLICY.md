# ORCA CI Cost-Control Policy

Status: **ACTIVE OWNER POLICY**

Effective date: **2026-08-27**

Scope: `ali599115225/orca_crm`

## Objective

Protect ORCA's GitHub Actions minutes and artifact storage without weakening the final merge gate.

This policy is an operating constraint for humans and agents working on ORCA. Raising the Actions budget is not a substitute for efficient CI.

## Locked operating rules

1. **Work-in-progress pull requests stay Draft.**
   - Development commits are made while the PR is Draft.
   - Every normal PR update is checked by `ORCA PR Fast CI`.

2. **Fast CI is the default per-update gate.**
   - It runs install, Prisma validation/client generation, the production gate, typecheck, smoke tests, changed test files, and a production dependency audit only when dependency manifests change.
   - `cancel-in-progress: true` cancels superseded fast runs for the same PR.

3. **Full ORCA CI is an exact-head closure gate, not a per-commit loop.**
   - The full `ORCA CI` workflow runs when a PR transitions from Draft to **Ready for review**.
   - The full gate retains the existing G3-G8, security/dependency, regression, acceptance, build, and isolated recovery checks.
   - A successful full gate is not rerun on the same exact SHA merely for reassurance.

4. **A head change invalidates final closure.**
   - If a Ready-for-review PR receives a new commit, the fast workflow fails the ready-head mutation guard.
   - The PR must return to Draft, finish remediation, obtain Fast CI, and then transition to Ready for review again so full ORCA CI runs on the new exact head.

5. **Retries are evidence-driven.**
   - Do not repeatedly rerun failed workflows before identifying the reason.
   - A retry on the same SHA is allowed only for a verified external/transient blocker (for example, a GitHub billing/account lock or runner outage) or after evidence shows the failed check itself was non-code/transient.

6. **Artifact storage is bounded.**
   - Routine G4-G7 and recovery evidence retention: **3 days**.
   - Final G8 closure evidence retention: **7 days**.
   - Do not upload duplicate artifacts from Fast CI.

7. **Budget is a hard safety boundary.**
   - Keep GitHub billing alerts enabled at 75%, 90%, and 100%.
   - Prefer a small Actions budget with **Stop usage when budget limit is reached**.
   - Do not raise the budget to hide inefficient CI. Any material budget increase is an owner decision.

8. **No gate weakening.**
   - Cost control must never remove the final typecheck, security/dependency audit, G3-G8 checks, required regressions, acceptance tests, build, or isolated recovery drill.
   - If a required final check is red, ORCA is not merge-ready.

## Expected workflow

`Draft PR -> Fast CI per update -> stable exact head -> Ready for review -> full ORCA CI once -> independent review -> merge decision`

If the final head changes:

`Ready PR + new commit -> fast guard fails -> Draft -> remediation/Fast CI -> Ready -> fresh full ORCA CI`

## Owner authorization

The owner explicitly adopted this policy for ORCA on 2026-08-27. Repository changes implementing this policy must remain isolated from product code, Prisma migrations, deployment, and Production actions.
