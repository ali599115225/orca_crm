# ORCA Z8 — Independent Execution Authorization Review Addendum

- **Document ID:** ORCA-Z8-AUTH-REVIEW-001
- **Version:** 1.1
- **Date:** 2026-07-25
- **Status:** `FINAL METHOD / VERCEL_HOBBY_POLICY_ACTIVE`
- **Base central SHA:** `ce0165d7a2ea6ff10acd9fe72e100555a2b3b325`
- **Main merge authorized:** `false`
- **Production action authorized:** `false`

## 1. Purpose

Harden the transition from the 32 Z7 gaps into bounded execution packages. Z8 closes the planning and authorization framework; it does not authorize `main`, Production, migrations, data operations, providers, credentials or paid actions.

## 2. Mandatory controls

### Z8M-001 — Single-use bounded authority

Authority is valid only for one named package/version, repository, base SHA, head branch, allowlist, exclusions, acceptance set and validity window. Completion, rejection, expiry, revocation, scope movement or head movement ends the authority.

### Z8M-002 — Exact source control identity

Each activated package records the exact base branch/SHA, execution branch, expected final head, merge destination and update strategy. Force Push and autonomous merge remain prohibited.

### Z8M-003 — File and surface allowlist

Paths, generated outputs, modules, pages, tabs, overlays, schemas, tables, migrations, fixtures and providers are explicitly listed. Adjacent refactors and new paths are outside scope until an amended package version is approved.

### Z8M-004 — Change budget

Each package limits workstreams, PR count, expected files, migrations and dependencies. Exceeding the budget pauses execution instead of normalizing scope expansion.

### Z8M-005 — Independent sub-authorizations

The following never inherit from a package: merge to `main`; schema migration or data operation; provider/account/credential action; paid commitment; external message/payment/signature/refund/publication; Production deployment or destructive rollback.

### Z8M-006 — Parallel conflict lock

Shared files, schemas, contracts, fixtures, visual surfaces, providers, environments and release branches receive one designated owner or an explicit ordering dependency.

### Z8M-007 — Agent operating contract

Every executing agent receives the package ID/version, exact allowlist, prohibited actions, checkpoints, evidence format, `vercelValidation` value and stop conditions. No autonomous scope expansion, merge, migration, data, provider, secret, purchase or Production action is allowed.

### Z8M-008 — Amendment and revocation

Material changes require pause, impact analysis, updated risks/dependencies/evidence, a new version and renewed approval. Revocation preserves the last safe state and evidence.

### Z8M-009 — Evidence identity

Evidence records package/version, commit/PR/workflow run, environment class, test/drill/visual artifact identifiers, Vercel validation state, reviewer decisions, accepted exceptions and expiry.

### Z8M-010 — Irreversibility rule

Code rollback, feature disable, schema compatibility, data compensation and provider reconciliation are separate. Rollback is not assumed safe when valid data could be lost or a security defect reintroduced.

### Z8M-011 — Progressive validation and Hobby quota discipline

Progressive validation uses the least expensive evidence capable of proving the package:

- Z0–Z8 planning and documentation: `NOT_REQUIRED`;
- execution packages while incremental: `SKIP_BY_DEFAULT`;
- completed Runtime/UI package: `REQUIRED_AT_PACKAGE_END` only after tests/build pass and the SHA is stable;
- definitive Release Candidate: `REQUIRED_AT_FINAL_RELEASE`;
- Production deployment: `SEPARATE_PRODUCTION_AUTHORIZATION`.

No Preview is created per file, commit, Push or PR. At most one Preview is used for a completed package when materially necessary, and one final Preview is used for the stable Release Candidate. Automatic non-required Preview failures or Hobby quota limits do not block CI-provable or documentation-only closure and must not trigger retry-only Pushes.

### Z8M-012 — Package closure

Closure requires an exact allowlisted diff, all required blocking evidence on the final head, direct closure evidence for target gaps, no new unresolved P0/P1 regression, cleanup of temporary artifacts, reconciliation of data/provider state and registration of residual gaps. Evidence marked `NOT_REQUIRED` or `SKIP_BY_DEFAULT` is not treated as missing.

## 3. Current review conclusion

```text
REGISTERED PACKAGES: 14
CLOSED PACKAGES: 1
EVIDENCE_READY PACKAGES: 2
OWNER_DECISION_PENDING PACKAGES: 8
DEFERRED/BLOCKED PACKAGES: 3
PACKAGES IN EXECUTION: 0
Z0-Z8 VERCEL: NOT_REQUIRED
PACKAGE DEFAULT VERCEL: SKIP_BY_DEFAULT
FINAL RELEASE PREVIEW: REQUIRED_AT_FINAL_RELEASE
MAIN MERGE AUTHORIZED: NO
PRODUCTION AUTHORIZED: NO
```

The method remains sufficient after the Hobby policy correction. This policy supersedes any earlier per-PR or per-commit Preview requirement.

## Final Vercel-capacity and execution-state reconciliation — 2026-07-25

- PR `#99` / `a82bcc937a8f69196b96f742801fe20f2eecaf99` is superseded and closed without merge after the historical Vercel build-rate-limit rejection.
- PR `#102` is historical only; its failed Vercel status is not reused as final evidence.
- Reconciliation base is current zero-based central `b0369b50eb2d49001e5322eea90b3b6dae22a882`.
- EXEC-003 v2 PR `#108` / `abc43ab5e1a76b5f2d99f5deb0f5d1e35451a618` is independently reviewed, merged at `b0369b50eb2d49001e5322eea90b3b6dae22a882`, and closed.
- Registered packages: `14`; Z7 gap coverage: `32/32`; packages in execution: `0`.
- The old quota blocker is recorded as elapsed; fresh ORCA CI and Vercel are required on this new non-empty final head.
- `main`, Production, data, Prisma/Migrations, providers, secrets, accounts and purchases remain unauthorized.

